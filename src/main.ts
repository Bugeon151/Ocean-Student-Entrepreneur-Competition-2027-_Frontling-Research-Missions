import './styles.css';
import { h, fmt } from './ui/dom';
import { lineChart } from './ui/chart';
import { loadIndex, loadMission, type Mission, type IndexEntry } from './core/pack';
import { validate } from './core/validator';
import { branchOf, canUnlock, hintPath } from './core/hints';
import { fresh, load, save, reset, task, log, now, type Progress } from './core/store';
import { stageDone, stageUnlocked, percent } from './core/progress';
import { buildPassport, passportHTML } from './core/evidence';
import { mean, olsLine, range, type Point } from './core/stats';
import type { QuizItem, StageId, TaskRule } from './core/types';
import { whyPage, devicePage } from './ui/pages';

const main = document.getElementById('main')!;
const live = document.getElementById('live')!;
const cache = new Map<string, Mission>();
let state: { m: Mission; p: Progress } | null = null;
let pane = 'center';

const announce = (msg: string) => { live.textContent = ''; setTimeout(() => (live.textContent = msg), 30); };
function persist() {
  if (!state) return;
  const ok = save(state.p);
  const el = document.getElementById('saved');
  if (el) el.textContent = ok ? `Saved on this device · ${new Date().toLocaleTimeString()}` : 'Storage unavailable — export your evidence before closing.';
}
const STAGE_LABEL: Record<StageId, string> = { understand: '1 · Understand', reproduce: '2 · Reproduce', investigate: '3 · Investigate', prove: '4 · Prove' };
const download = (name: string, body: string, type: string) => {
  const a = h('a', { href: URL.createObjectURL(new Blob([body], { type })), download: name });
  document.body.appendChild(a); a.click(); a.remove();
};

/* ---------------- Library ---------------- */
async function library() {
  const { missions } = await loadIndex();
  const subjects = [...new Set(missions.map((m) => m.subject))];
  const levels = ['Beginner', 'Intermediate', 'Advanced'];
  const f = { subject: '', difficulty: '' };
  const list = h('div', { class: 'cards', id: 'cards' });
  const draw = () => {
    list.replaceChildren(...missions.filter((m) => (!f.subject || m.subject === f.subject) && (!f.difficulty || m.difficulty === f.difficulty)).map(card));
    if (!list.children.length) list.append(h('p', {}, 'No missions match these filters.'));
  };
  const sel = (label: string, key: 'subject' | 'difficulty', opts: string[]) => h('label', {}, label, ' ',
    h('select', { onchange: (e: Event) => { f[key] = (e.target as HTMLSelectElement).value; draw(); } }, h('option', { value: '' }, 'All'), ...opts.map((o) => h('option', { value: o }, o))));
  main.replaceChildren(
    h('section', { class: 'hero' },
      h('h1', {}, 'Do real science. Reproduce published results yourself.'),
      h('p', {}, 'Each mission is built from a real paper and real public data. You understand the question, reproduce part of the published result, investigate your own question, and prove you can apply the method to data you have never seen. No account. No live AI writing your answers.')),
    h('div', { class: 'filters', role: 'search' }, sel('Field', 'subject', subjects), sel('Difficulty', 'difficulty', levels)),
    list);
  draw();
}
function card(m: IndexEntry) {
  const p = load(m.mission_id);
  return h('article', { class: 'card' },
    h('div', { class: 'badges' }, h('span', { class: 'b' }, m.subject), h('span', { class: 'b' }, m.difficulty), h('span', { class: 'b' }, `Reproduction ${m.reproduction_level}`), h('span', { class: 'b rs' }, m.review_status.replace('_', ' '))),
    h('h2', {}, m.title), h('p', {}, m.summary),
    h('dl', { class: 'meta' },
      h('dt', {}, 'Original paper'), h('dd', {}, h('a', { href: m.paper_url, target: '_blank', rel: 'noopener' }, m.paper_url.replace('https://', ''))),
      h('dt', {}, 'Time'), h('dd', {}, m.estimated_duration),
      h('dt', {}, 'You need'), h('dd', {}, m.prerequisites.join(' · ')),
      h('dt', {}, 'Data size'), h('dd', {}, `${(m.data_bytes / 1024).toFixed(0)} KB`),
      h('dt', {}, 'Environment'), h('dd', {}, m.requirements),
      h('dt', {}, 'Reproduces'), h('dd', {}, m.reproduction_scope)),
    h('a', { class: 'btn', href: `#/m/${m.mission_id}/overview` }, p ? 'Continue mission' : 'Start mission'));
}

/* ---------------- Mission shell ---------------- */
async function mission(id: string, view: string) {
  let m = cache.get(id);
  if (!m) { m = await loadMission(id); cache.set(id, m); }
  let p = load(id);
  if (!p) { p = fresh(id, m.manifest.version, m.manifest.content_hash); log(p, 'start', `mission ${id} v${m.manifest.version}`); save(p); }
  p.memo ??= '';
  state = { m, p };
  const stage = view as StageId;
  if ((['reproduce', 'investigate', 'prove'] as StageId[]).includes(stage) && !stageUnlocked(m, p, stage)) { location.hash = `#/m/${id}/${firstOpen(m, p)}`; return; }
  const nav = h('nav', { class: 'stepper', 'aria-label': 'Mission stages' },
    h('a', { href: `#/m/${id}/overview`, 'aria-current': view === 'overview' ? 'page' : undefined }, 'Overview'),
    ...(['understand', 'reproduce', 'investigate', 'prove'] as StageId[]).map((s) => {
      const open = stageUnlocked(m!, p!, s), done = stageDone(m!, p!, s);
      return open ? h('a', { href: `#/m/${id}/${s}`, 'aria-current': view === s ? 'page' : undefined, class: done ? 'done' : '' }, `${STAGE_LABEL[s]}${done ? ' ✓' : ''}`)
        : h('span', { class: 'locked', 'aria-disabled': 'true', title: 'Complete the previous stage first' }, `${STAGE_LABEL[s]} 🔒`);
    }),
    h('a', { href: `#/m/${id}/evidence`, 'aria-current': view === 'evidence' ? 'page' : undefined }, 'Evidence'));
  const integrity = Object.values(m.data).every((d) => d.verified);
  const head = h('div', { class: 'mhead' },
    h('h1', {}, m.manifest.title),
    h('p', { class: 'small' }, `${percent(m, p)}% complete · `, h('span', { class: integrity ? 'ok' : 'warn' }, integrity ? '✓ Data integrity verified (SHA-256)' : '⚠ Data hash mismatch — results may not be comparable'),
      p.content_hash !== m.manifest.content_hash ? h('span', { class: 'warn' }, ' · Mission content was updated since you started') : '',
      ' · ', h('span', { id: 'saved' }, 'Saved on this device')),
    nav);
  const body = view === 'overview' ? overview(m) : view === 'evidence' ? await evidence(m, p) : workspace(m, p, stage);
  main.replaceChildren(head, body);
}
function firstOpen(m: Mission, p: Progress): StageId {
  return (['understand', 'reproduce', 'investigate', 'prove'] as StageId[]).find((s) => !stageDone(m, p, s) && stageUnlocked(m, p, s)) ?? 'prove';
}
const rerender = () => { if (state) route(); };

function overview(m: Mission) {
  const mf = m.manifest;
  return h('section', { class: 'overview' },
    h('h2', {}, 'Research question'), h('p', { class: 'rq' }, m.stages.understand.research_question),
    h('h2', {}, 'What you will produce'),
    h('ol', {}, h('li', {}, 'Understand: pass the concept and data checks.'), h('li', {}, `Reproduce: ${m.stages.reproduce.tasks.map((t) => m.rules.tasks.find((r) => r.id === t)!.label).join('; ')}.`),
      h('li', {}, 'Investigate: your own question, method, result, interpretation and limitations.'), h('li', {}, `Prove: ${m.stages.prove.tasks.map((t) => m.rules.tasks.find((r) => r.id === t)!.label).join('; ')} — without hints.`)),
    h('div', { class: 'scope' }, h('strong', {}, `Reproduction scope (${mf.reproduction_level}) — partial, not full: `), mf.reproduction_scope),
    h('h2', {}, 'Source'),
    h('p', {}, `${m.paper.primary.authors} (${m.paper.primary.year}). ${m.paper.primary.title}. ${m.paper.primary.venue}. `, h('a', { href: m.paper.primary.url, target: '_blank', rel: 'noopener' }, `doi:${m.paper.primary.doi}`)),
    h('p', {}, 'Published finding: ', h('a', { href: m.paper.finding.url, target: '_blank', rel: 'noopener' }, m.paper.finding.text)),
    h('h2', {}, 'Download mission data'),
    h('ul', {}, ...mf.datasets.map((d) => h('li', {}, h('a', { href: `${m.base}/${d.file}`, download: `${mf.mission_id}-${d.id}.csv` }, d.file), ` — ${d.title} (${d.rows} rows, ${(d.bytes / 1024).toFixed(0)} KB, ${d.source})`))),
    h('p', { class: 'small' }, `Dataset version: ${mf.dataset_version}. Licence: ${mf.license}`),
    h('p', { class: 'small' }, `Review: ${mf.review_status} — ${mf.review_scope.join('; ')}. Domain-expert review has not been performed for this version.`),
    h('a', { class: 'btn', href: `#/m/${mf.mission_id}/${firstOpen(m, state!.p)}` }, 'Go to workspace'));
}

/* ---------------- Workspace (3 panes, tabs on mobile) ---------------- */
function workspace(m: Mission, p: Progress, s: StageId) {
  const v = { understand, reproduce, investigate, prove }[s](m, p);
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, ...([['left', 'Guide'], ['center', 'Work'], ['right', s === 'investigate' ? 'Report' : 'Notes & feedback']] as const).map(([k, l]) =>
    h('button', { role: 'tab', 'aria-selected': String(pane === k), onclick: () => { pane = k; document.querySelectorAll('.ws').forEach((e) => e.setAttribute('data-pane', pane)); document.querySelectorAll('.tabs button').forEach((b, i) => b.setAttribute('aria-selected', String(['left', 'center', 'right'][i] === pane))); } }, l)));
  const next = stageDone(m, p, s) && s !== 'prove' ? h('a', { class: 'btn next', href: `#/m/${m.manifest.mission_id}/${['understand', 'reproduce', 'investigate', 'prove'][['understand', 'reproduce', 'investigate', 'prove'].indexOf(s) + 1]}` }, 'Continue to next stage →')
    : stageDone(m, p, 'prove') ? h('a', { class: 'btn next', href: `#/m/${m.manifest.mission_id}/evidence` }, 'View your Research Evidence →') : '';
  return h('div', {}, tabs, h('div', { class: 'ws', 'data-pane': pane },
    h('section', { class: 'pane left', 'aria-label': 'Guide' }, ...v.left),
    h('section', { class: 'pane center', 'aria-label': 'Work area' }, ...v.center, next),
    h('section', { class: 'pane right', 'aria-label': 'Notes and feedback' }, ...v.right, memo(p))));
}
function memo(p: Progress) {
  return h('details', { class: 'memo' }, h('summary', {}, 'Research memo'),
    h('textarea', { 'aria-label': 'Research memo', rows: 5, value: p.memo, oninput: (e: Event) => { p.memo = (e.target as HTMLTextAreaElement).value; persist(); } }));
}
const paras = (a: string[]) => a.map((t) => h('p', {}, t));

/* ---------------- Stage 1: Understand ---------------- */
function understand(m: Mission, p: Progress) {
  const u = m.stages.understand;
  const ds = m.data[u.data_structure.dataset];
  const preview = [...ds.rows.slice(0, 8), null, ...ds.rows.slice(-3)];
  return {
    left: [h('h2', {}, 'Research question'), h('p', { class: 'rq' }, u.research_question), ...paras(u.intro),
      h('p', { class: 'small' }, 'Original paper: ', h('a', { href: m.manifest.paper_url, target: '_blank', rel: 'noopener' }, m.paper.primary.title))],
    center: [h('h2', {}, 'Key concepts'), h('dl', { class: 'gloss' }, ...u.concepts.flatMap((c) => [h('dt', {}, c.term), h('dd', {}, c.def)])),
      h('h2', {}, 'The data'), h('p', {}, u.data_structure.description),
      h('div', { class: 'tablewrap' }, h('table', { class: 'data' }, h('caption', {}, `${ds.meta.file} — ${ds.meta.rows} rows (first 8 and last 3 shown)`),
        h('thead', {}, h('tr', {}, ...ds.meta.columns.map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, ...preview.map((r) => (r ? h('tr', {}, ...ds.meta.columns.map((c) => h('td', {}, r[c]))) : h('tr', {}, h('td', { colspan: ds.meta.columns.length }, '…')))))) ),
      h('h2', {}, 'Check your understanding'), h('p', { class: 'small' }, 'Unlimited attempts. Wrong answers get a nudge, not the answer.'),
      ...[...u.quiz, u.data_check].map((q) => quiz(q, p))],
    right: [h('h2', {}, 'Progress'), h('ul', { class: 'checklist' }, ...[...u.quiz, u.data_check].map((q) => h('li', { class: p.quiz[q.id]?.correct ? 'ok' : '' }, `${p.quiz[q.id]?.correct ? '✓' : '○'} ${q.id === u.data_check.id ? 'Data structure check' : `Concept question ${q.id.slice(1)}`}`)))],
  };
}
function quiz(q: QuizItem, p: Progress) {
  const st = (p.quiz[q.id] ??= { attempts: 0, correct: false });
  const fb = h('p', { class: `fb ${st.correct ? 'ok' : st.last !== undefined ? 'no' : ''}`, role: 'status' }, st.correct ? '✓ Correct.' : st.last !== undefined ? `✗ ${q.feedback[String(st.last)] ?? 'Not quite — re-read the key concepts.'}` : '');
  const fs = h('fieldset', { class: 'quiz', id: `quiz-${q.id}` }, h('legend', {}, q.q),
    ...q.options.map((o, i) => h('label', { class: 'opt' }, h('input', { type: 'radio', name: q.id, value: i, checked: st.correct && i === q.answer, disabled: st.correct }), ` ${o}`)),
    h('button', { type: 'button', disabled: st.correct, onclick: () => {
      const v = fs.querySelector<HTMLInputElement>('input:checked');
      if (!v) { fb.textContent = 'Choose an option first.'; return; }
      const i = Number(v.value); st.attempts++; st.last = i; st.correct = i === q.answer;
      log(p, 'quiz', `${q.id} option ${i} → ${st.correct ? 'correct' : 'incorrect'}`); persist();
      announce(st.correct ? 'Correct' : 'Not quite'); rerender();
    } }, 'Check'), fb);
  return fs;
}

/* ---------------- Task card (Reproduce & Prove) ---------------- */
function taskCard(p: Progress, rule: TaskRule, prove: boolean) {
  const st = task(p, rule.id);
  const res = h('div', { class: 'result', role: 'status', 'aria-live': 'polite', id: `res-${rule.id}` });
  const showRes = () => {
    const r = st.last; if (!r) return res.replaceChildren();
    const cls = r.code === 'VALID' ? 'ok' : 'no';
    res.replaceChildren(h('p', { class: `code ${cls}` }, `${r.code === 'VALID' ? '✓' : '✗'} ${r.code}`), h('p', {}, prove && r.code !== 'VALID' && r.code !== 'FORMAT_ERROR' && r.code !== 'INCOMPLETE' ? 'Recorded. No diagnosis is shown in Prove.' : r.message),
      r.fields?.length ? h('p', { class: 'small' }, `Check: ${r.fields.map((k) => rule.method.find((f) => f.key === k)?.label).join(', ')}`) : '',
      !prove && r.code !== 'VALID' ? h('p', { class: 'small' }, 'A failed check is part of research, not a failure of your research.') : '');
  };
  showRes();
  const fields = rule.method.map((f) => {
    const id = `${rule.id}-${f.key}`;
    const onch = (e: Event) => { st.method[f.key] = (e.target as HTMLInputElement).value; persist(); };
    return h('label', { for: id }, f.label,
      f.type === 'select' ? h('select', { id, onchange: onch }, h('option', { value: '' }, '— select —'), ...f.options!.map((o) => h('option', { value: o, selected: st.method[f.key] === o }, o)))
        : h('input', { id, type: 'text', inputmode: 'numeric', value: st.method[f.key] ?? '', oninput: onch }));
  });
  const valId = `${rule.id}-value`, noteId = `${rule.id}-note`;
  return h('article', { class: 'task', id: `task-${rule.id}` },
    h('h3', {}, rule.label, st.valid ? h('span', { class: 'ok' }, ' ✓') : ''),
    h('p', {}, rule.prompt), h('p', { class: 'small' }, `Dataset: ${rule.dataset}.csv · Report ≥ ${rule.min_decimals} decimals · Tolerance ±${rule.tolerance} ${rule.unit}`),
    h('div', { class: 'grid2' }, ...fields,
      h('label', { for: valId }, `Your result (${rule.unit})`, h('input', { id: valId, type: 'text', inputmode: 'decimal', autocomplete: 'off', value: st.value, oninput: (e: Event) => { st.value = (e.target as HTMLInputElement).value; persist(); } }))),
    h('label', { for: noteId }, prove ? 'How did you compute it? (optional, recorded)' : 'What did you try? (needed to unlock hints)',
      h('textarea', { id: noteId, rows: 2, value: st.note, oninput: (e: Event) => { st.note = (e.target as HTMLTextAreaElement).value; persist(); } })),
    h('button', { type: 'button', class: 'btn', onclick: () => {
      const t0 = performance.now();
      const r = validate(rule, { value: st.value, method: st.method });
      const ms = performance.now() - t0;
      st.attempts.push({ t: now(), value: st.value, method: { ...st.method }, code: r.code, diagnosis: r.diagnosis, note: st.note });
      st.last = r; if (r.code === 'VALID') st.valid = true;
      log(p, prove ? 'prove_submit' : 'validate', `${rule.id}: ${st.value} → ${r.code}/${r.diagnosis} (${ms.toFixed(2)} ms)`);
      persist(); announce(`${rule.label}: ${r.code}`); rerender();
      requestAnimationFrame(() => document.getElementById(`res-${rule.id}`)?.scrollIntoView({ block: 'nearest' }));
    } }, prove ? 'Submit result' : 'Check result'),
    res,
    prove && st.attempts[0] ? h('p', { class: 'small' }, `Independent (first) submission recorded: ${st.attempts[0].value} → ${st.attempts[0].code}`) : '',
    rule.published && !prove ? h('p', { class: 'small pub' }, 'Published reference: ', h('a', { href: rule.published.url, target: '_blank', rel: 'noopener' }, rule.published.text)) : '');
}

function hintPanel(m: Mission, p: Progress, rule: TaskRule) {
  const st = task(p, rule.id);
  const shown = st.hints.map((id) => m.hints.find((x) => x.id === id)).filter(Boolean);
  const gate = canUnlock('reproduce', st.note, st.last);
  const path = st.last ? hintPath(m.hints, rule.id, branchOf(st.last)) : [];
  const nextHint = path.find((x) => !st.hints.includes(x.id));
  return h('div', { class: 'hints', id: `hints-${rule.id}` }, h('h3', {}, `Hints · ${rule.label}`),
    shown.length ? h('ol', {}, ...shown.map((x) => h('li', {}, h('strong', {}, ['Direction', 'Concept', 'Partial example'][x!.level - 1] + ': '), x!.text))) : h('p', { class: 'small' }, 'No hints used yet. You can finish without any.'),
    st.valid ? '' : !gate.allowed ? h('p', { class: 'small' }, gate.reason) : nextHint
      ? h('button', { type: 'button', onclick: () => { st.hints.push(nextHint.id); log(p, 'hint', `${rule.id}: ${nextHint.id} (branch ${nextHint.branch}, level ${nextHint.level})`); persist(); rerender(); } }, `Unlock hint (${['direction', 'concept', 'partial example'][nextHint.level - 1]})`)
      : h('p', { class: 'small' }, 'No further hints for this error type. Re-read the steps or try a different approach.'));
}

/* ---------------- Stage 2: Reproduce ---------------- */
function reproduce(m: Mission, p: Progress) {
  const r = m.stages.reproduce;
  const rules = r.tasks.map((t) => m.rules.tasks.find((x) => x.id === t)!);
  return {
    left: [h('h2', {}, 'Protocol'), ...paras(r.intro), h('ol', {}, ...r.steps.map((s) => h('li', {}, s))), h('p', { class: 'small' }, h('strong', {}, 'Rounding rule: '), r.rounding),
      h('p', { class: 'small' }, ...m.manifest.datasets.filter((d) => d.id === 'reproduce').map((d) => h('a', { href: `${m.base}/${d.file}`, download: `${m.manifest.mission_id}-reproduce.csv` }, `Download ${d.file}`)))],
    center: rules.map((x) => taskCard(p, x, false)),
    right: [h('h2', {}, 'Hints'), h('p', { class: 'small' }, 'Hints are pre-written and reviewed — never generated live. They open one at a time after you describe your attempt, and follow the type of error you made.'), ...rules.map((x) => hintPanel(m, p, x))],
  };
}

/* ---------------- Stage 3: Investigate ---------------- */
type Op = 'mean' | 'trend' | 'change' | 'max' | 'min';
function investigate(m: Mission, p: Progress) {
  const inv = m.stages.investigate;
  const dsIds = inv.datasets;
  const years = (id: string) => [...m.data[id].annual.keys()].sort((a, b) => a - b);
  const cfg = { ds: dsIds[0], op: 'trend' as Op, a: 0, b: 0, c: 0, d: 0 };
  const ys = years(cfg.ds); cfg.a = Math.max(ys[0], ys.at(-1)! - 24); cfg.b = ys.at(-1)!; cfg.c = ys[0]; cfg.d = ys[0] + 19;
  const out = h('div', { class: 'result', role: 'status', 'aria-live': 'polite' });
  const chartBox = h('div', { class: 'chartbox' });
  const unit = () => m.data[cfg.ds].meta.unit.split(' vs ')[0];
  const run = () => {
    const s = m.data[cfg.ds].annual, ys = years(cfg.ds);
    const ok = (y: number) => s.has(y);
    if (![cfg.a, cfg.b].every(ok) || cfg.a >= cfg.b || (cfg.op === 'change' && (![cfg.c, cfg.d].every(ok) || cfg.c >= cfg.d))) { out.textContent = `Choose valid years between ${ys[0]} and ${ys.at(-1)} (start < end).`; return; }
    const pts = range(s, cfg.a, cfg.b);
    let result: number, label: string, line;
    if (cfg.op === 'mean') { result = mean(pts.map((q) => q.y)); label = `Mean ${cfg.a}–${cfg.b}`; }
    else if (cfg.op === 'trend') { const l = olsLine(pts); result = l.slope * 10; label = `OLS trend ${cfg.a}–${cfg.b} per decade`; line = { ...l, from: cfg.a, to: cfg.b }; }
    else if (cfg.op === 'change') { result = mean(pts.map((q) => q.y)) - mean(range(s, cfg.c, cfg.d).map((q) => q.y)); label = `Mean ${cfg.a}–${cfg.b} minus mean ${cfg.c}–${cfg.d}`; }
    else { const best = pts.reduce((x, y) => ((cfg.op === 'max' ? y.y > x.y : y.y < x.y) ? y : x)); result = best.y; label = `${cfg.op === 'max' ? 'Highest' : 'Lowest'} year ${cfg.a}–${cfg.b}: ${best.x}`; }
    p.runs.push({ t: now(), dataset: cfg.ds, op: cfg.op, params: { a: cfg.a, b: cfg.b, ...(cfg.op === 'change' ? { c: cfg.c, d: cfg.d } : {}) }, result, label });
    log(p, 'analysis', `${label} = ${fmt(result, 4)}`); persist();
    out.replaceChildren(h('p', { class: 'code' }, `${label}: ${fmt(result, 4)} ${unit()}${cfg.op === 'trend' ? '/decade' : ''}`));
    const all: Point[] = ys.map((y) => ({ x: y, y: s.get(y)! }));
    chartBox.replaceChildren(lineChart(all, { title: m.data[cfg.ds].meta.title, yLabel: unit(), highlight: [cfg.a, cfg.b], line }));
    hist.replaceChildren(...runRows());
  };
  const num = (k: 'a' | 'b' | 'c' | 'd', l: string) => h('label', {}, l, h('input', { type: 'number', value: cfg[k], oninput: (e: Event) => (cfg[k] = Number((e.target as HTMLInputElement).value)) }));
  const extra = h('div', { class: 'grid2', hidden: true }, num('c', 'Compare with: start'), num('d', 'Compare with: end'));
  const runRows = () => p.runs.slice(-8).reverse().map((r) => h('tr', {}, h('td', {}, r.label), h('td', {}, fmt(r.result, 4))));
  const hist = h('tbody', {}, ...runRows());
  const all0: Point[] = years(cfg.ds).map((y) => ({ x: y, y: m.data[cfg.ds].annual.get(y)! }));
  chartBox.append(lineChart(all0, { title: m.data[cfg.ds].meta.title, yLabel: unit() }));
  const fieldsDef: [keyof Progress['draft'], string, number][] = [['question', 'Research question *', 2], ['hypothesis', 'Hypothesis (what you expect and why)', 2], ['method', 'Analysis method *', 3], ['result', 'Actual result *', 3], ['interpretation', 'Interpretation (including results that surprised you) *', 3], ['limitations', 'Limitations of the data and analysis *', 3]];
  const last = p.submissions.at(-1);
  const warnEl = h('p', { class: 'small warn', role: 'alert' });
  return {
    left: [h('h2', {}, 'Your own question'), ...paras(inv.intro), h('h3', {}, 'Ideas to start'), h('ul', {}, ...inv.suggested_questions.map((q) => h('li', {}, q))),
      h('p', { class: 'small' }, 'A null or unexpected result is a complete result. Statistical significance is not required.')],
    center: [h('h2', {}, 'Analysis tool'),
      h('div', { class: 'grid2' },
        h('label', {}, 'Dataset', h('select', { onchange: (e: Event) => (cfg.ds = (e.target as HTMLSelectElement).value) }, ...dsIds.map((d) => h('option', { value: d }, m.data[d].meta.title)))),
        h('label', {}, 'Analysis', h('select', { onchange: (e: Event) => { cfg.op = (e.target as HTMLSelectElement).value as Op; extra.hidden = cfg.op !== 'change'; } },
          ...([['trend', 'Linear trend (per decade)'], ['mean', 'Mean of period'], ['change', 'Difference between two period means'], ['max', 'Highest year'], ['min', 'Lowest year']] as const).map(([v, l]) => h('option', { value: v, selected: v === cfg.op }, l)))),
        num('a', 'Start year'), num('b', 'End year')), extra,
      h('button', { type: 'button', class: 'btn', onclick: run }, 'Run analysis'), out, chartBox,
      h('h3', {}, 'Analysis history (all runs are kept)'), h('table', { class: 'data' }, h('thead', {}, h('tr', {}, h('th', {}, 'Analysis'), h('th', {}, 'Result'))), hist)],
    right: [h('h2', {}, 'Research report'), last ? h('p', { class: 'small ok' }, `✓ Submitted ${new Date(last.t).toLocaleString()} · ${p.submissions.length} version(s) kept`) : h('p', { class: 'small' }, 'Fields marked * are required.'),
      ...fieldsDef.map(([k, l, rows]) => h('label', {}, l, h('textarea', { rows, value: p.draft[k], oninput: (e: Event) => { p.draft[k] = (e.target as HTMLTextAreaElement).value; persist(); } }))),
      h('button', { type: 'button', class: 'btn', onclick: () => {
        const miss = inv.required.filter((k) => !(p.draft as unknown as Record<string, string>)[k]?.trim());
        if (miss.length) { announce(`Missing: ${miss.join(', ')}`); warnEl.textContent = `Please complete: ${miss.join(', ')}.`; return; }
        p.submissions.push({ ...p.draft, t: now() }); log(p, 'investigate_submit', `version ${p.submissions.length}`); persist(); rerender();
      } }, last ? 'Submit revised version' : 'Submit report'), warnEl],
  };
}

/* ---------------- Stage 4: Prove ---------------- */
function prove(m: Mission, p: Progress) {
  const pr = m.stages.prove;
  const rules = pr.tasks.map((t) => m.rules.tasks.find((x) => x.id === t)!);
  const rep = m.stages.reproduce.tasks.map((t) => p.tasks[t]);
  return {
    left: [h('h2', {}, 'Independent assessment'), ...paras(pr.intro), h('p', { class: 'warn' }, 'Hints are disabled in this stage.'),
      h('p', { class: 'small' }, 'Frontling provides conditions without in-product help. It does not certify that no outside help (people or AI) was used.'),
      h('p', { class: 'small' }, h('a', { href: `${m.base}/datasets/transfer.csv`, download: `${m.manifest.mission_id}-transfer.csv` }, 'Download transfer.csv'))],
    center: rules.map((x) => taskCard(p, x, true)),
    right: [h('h2', {}, 'Reflection'), h('label', {}, pr.reflection, h('textarea', { rows: 5, value: p.reflection, oninput: (e: Event) => { p.reflection = (e.target as HTMLTextAreaElement).value; persist(); }, onchange: () => rerender() })),
      h('h3', {}, 'Compared with Reproduce'),
      h('table', { class: 'data' }, h('thead', {}, h('tr', {}, h('th', {}, 'Stage'), h('th', {}, 'Attempts'), h('th', {}, 'Hints'), h('th', {}, 'First try'))),
        h('tbody', {},
          h('tr', {}, h('td', {}, 'Reproduce'), h('td', {}, String(rep.reduce((s, t) => s + (t?.attempts.length ?? 0), 0))), h('td', {}, String(rep.reduce((s, t) => s + (t?.hints.length ?? 0), 0))), h('td', {}, `${rep.filter((t) => t?.attempts[0]?.code === 'VALID').length}/${rep.length} valid`)),
          h('tr', {}, h('td', {}, 'Prove'), h('td', {}, String(rules.reduce((s, r) => s + (p.tasks[r.id]?.attempts.length ?? 0), 0))), h('td', {}, '0 (disabled)'), h('td', {}, `${rules.filter((r) => p.tasks[r.id]?.attempts[0]?.code === 'VALID').length}/${rules.length} valid`))))],
  };
}

/* ---------------- Evidence ---------------- */
async function evidence(m: Mission, p: Progress) {
  const e = await buildPassport(m, p);
  const btn = (l: string, f: () => void) => h('button', { type: 'button', class: 'btn', onclick: f }, l);
  return h('section', { class: 'evidence' },
    h('h2', {}, 'Research Evidence Passport'),
    h('p', {}, 'A structured, portable record of what you did. Export it as JSON (machine-readable, re-checkable), HTML (readable report) or PDF (via your browser\'s print dialog).'),
    h('div', { class: 'row' },
      btn('Export JSON', () => download(`evidence-${m.manifest.mission_id}.json`, JSON.stringify(e, null, 2), 'application/json')),
      btn('Export HTML report', () => download(`evidence-${m.manifest.mission_id}.html`, passportHTML(e), 'text/html')),
      btn('Print / Save as PDF', () => { const w = window.open(URL.createObjectURL(new Blob([passportHTML(e)], { type: 'text/html' }))); w?.addEventListener('load', () => w.print()); })),
    h('table', { class: 'data' }, h('tbody', {}, ...Object.entries(e.progress.completed).map(([k, v]) => h('tr', {}, h('th', { scope: 'row' }, k), h('td', {}, v ? '✓ completed' : '○ not yet'))),
      h('tr', {}, h('th', { scope: 'row' }, 'Evidence SHA-256'), h('td', {}, h('code', {}, e.integrity.evidence_sha256))))),
    h('h3', {}, 'Timeline'),
    h('ol', { class: 'timeline' }, ...p.events.slice(-60).map((x) => h('li', {}, h('time', {}, new Date(x.t).toLocaleString()), ` ${x.type}: ${x.detail}`))),
    h('p', { class: 'small warn' }, e.trust_notice),
    h('button', { type: 'button', class: 'danger', onclick: () => { if (confirm('Delete all progress for this mission on this device?')) { reset(m.manifest.mission_id); state = null; location.hash = '#/'; } } }, 'Reset this mission on this device'));
}

/* ---------------- Router ---------------- */
async function route() {
  const [, kind, id, view] = location.hash.replace(/^#\/?/, '#/').split('/');
  try {
    if (kind === 'm' && id) await mission(id, view || 'overview');
    else if (kind === 'why') { state = null; main.replaceChildren(await whyPage()); }
    else if (kind === 'device-check') { state = null; main.replaceChildren(devicePage()); }
    else { state = null; await library(); }
  } catch (err) {
    main.replaceChildren(h('div', { class: 'error', role: 'alert' }, h('h1', {}, 'Something went wrong'), h('p', {}, String((err as Error).message)), h('p', {}, 'Your saved progress is not affected.'), h('a', { class: 'btn', href: '#/' }, 'Back to missions')));
  }
}
let lastHash = '';
window.addEventListener('hashchange', () => { if (location.hash.split('/').slice(0, 4).join('/') !== lastHash) { pane = 'center'; window.scrollTo(0, 0); } lastHash = location.hash.split('/').slice(0, 4).join('/'); route(); });
route();
