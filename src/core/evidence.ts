import { sha256Hex, stableStringify } from './hash';
import type { Mission } from './pack';
import { stageDone } from './progress';
import type { Progress } from './store';

export const APP_VERSION = '1.0.0';
export const TRUST_NOTICE = 'This record is self-reported and stored on the student\'s device. Hashes detect changes to files; they do not prove identity or that the work was done without outside help. Not an official credential.';

export async function buildPassport(m: Mission, p: Progress, env = typeof navigator !== 'undefined' ? navigator.userAgent : 'node') {
  const mf = m.manifest;
  const taskOut = (id: string, prove: boolean) => {
    const rule = m.rules.tasks.find((t) => t.id === id)!;
    const st = p.tasks[id];
    const attempts = st?.attempts ?? [];
    return {
      id, label: rule.label, unit: rule.unit, dataset: rule.dataset, tolerance: rule.tolerance,
      final: attempts.at(-1) ?? null, valid: !!st?.valid, attempt_count: attempts.length, attempts,
      ...(prove ? { independent_result: attempts[0] ?? null, hints_available: false } : { hints_used: st?.hints ?? [] }),
    };
  };
  const body = {
    schema: 'frontling.evidence/1.0',
    generated_at: new Date().toISOString(),
    app_version: APP_VERSION,
    mission: { id: mf.mission_id, version: mf.version, title: mf.title, source_doi: mf.source_doi, paper_url: mf.paper_url, review_status: mf.review_status, review_scope: mf.review_scope, reproduction_level: mf.reproduction_level, reproduction_scope: mf.reproduction_scope, content_hash: mf.content_hash, validation_version: mf.validation_version },
    data: mf.datasets.map((d) => ({ id: d.id, file: d.file, sha256: d.sha256, verified_in_browser: m.data[d.id]?.verified ?? false, dataset_version: mf.dataset_version, source: d.source })),
    progress: { started_at: p.started_at, completed: { understand: stageDone(m, p, 'understand'), reproduce: stageDone(m, p, 'reproduce'), investigate: stageDone(m, p, 'investigate'), prove: stageDone(m, p, 'prove') } },
    stages: {
      understand: { quiz: p.quiz },
      reproduce: { tasks: m.stages.reproduce.tasks.map((t) => taskOut(t, false)) },
      investigate: { analysis_runs: p.runs, submission: p.submissions.at(-1) ?? null, revisions: p.submissions.slice(0, -1) },
      prove: { tasks: m.stages.prove.tasks.map((t) => taskOut(t, true)), reflection: p.reflection },
    },
    environment: { user_agent: env, validator: 'deterministic TypeScript classifier (browser)', validation_version: m.rules.validation_version },
    events: p.events,
    trust_notice: TRUST_NOTICE,
  };
  return { ...body, integrity: { algorithm: 'SHA-256 over stable JSON of all fields except integrity', evidence_sha256: await sha256Hex(stableStringify(body)) } };
}
export type Passport = Awaited<ReturnType<typeof buildPassport>>;

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function passportHTML(e: Passport): string {
  const row = (k: string, v: unknown) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`;
  const tasks = (ts: Passport['stages']['reproduce']['tasks']) => ts.map((t) => `<tr><td>${esc(t.label)}</td><td>${esc(t.final?.value ?? '—')} ${esc(t.unit)}</td><td>${esc(t.final?.code ?? 'NOT SUBMITTED')}</td><td>${t.attempt_count}</td><td>${esc('hints_used' in t ? (t.hints_used as string[]).length : 'disabled')}</td></tr>`).join('');
  const sub = e.stages.investigate.submission;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Research Evidence Passport — ${esc(e.mission.title)}</title>
<style>body{font:15px/1.55 system-ui,sans-serif;max-width:820px;margin:2rem auto;padding:0 1rem;color:#111}h1{font-size:1.5rem}h2{font-size:1.1rem;margin-top:1.6rem;border-bottom:1px solid #ccc}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:.35rem .5rem;text-align:left;vertical-align:top}th{background:#f3f3f3;width:32%}code{word-break:break-all}.n{background:#fff8e1;border:1px solid #e0c060;padding:.6rem}</style></head><body>
<h1>Research Evidence Passport</h1><p><strong>${esc(e.mission.title)}</strong></p>
<table>${row('Mission', `${e.mission.id} v${e.mission.version}`)}${row('Paper DOI', e.mission.source_doi)}${row('Review status', `${e.mission.review_status} — ${e.mission.review_scope.join('; ')}`)}${row('Reproduction level', e.mission.reproduction_level)}${row('Scope', e.mission.reproduction_scope)}${row('Generated', e.generated_at)}</table>
<h2>Data</h2><table>${e.data.map((d) => row(d.file, `sha256 ${d.sha256} · verified in browser: ${d.verified_in_browser ? 'yes' : 'no'}`)).join('')}</table>
<h2>Reproduce</h2><table><tr><th>Task</th><th>Final value</th><th>Result</th><th>Attempts</th><th>Hints used</th></tr>${tasks(e.stages.reproduce.tasks)}</table>
<h2>Investigate</h2>${sub ? `<table>${row('Question', sub.question)}${row('Hypothesis', sub.hypothesis)}${row('Method', sub.method)}${row('Result', sub.result)}${row('Interpretation', sub.interpretation)}${row('Limitations', sub.limitations)}${row('Analysis runs', e.stages.investigate.analysis_runs.length)}${row('Revisions', e.stages.investigate.revisions.length)}</table>` : '<p>Not submitted.</p>'}
<h2>Prove (independent, no hints)</h2><table><tr><th>Task</th><th>Final value</th><th>Result</th><th>Attempts</th><th>Hints</th></tr>${tasks(e.stages.prove.tasks)}</table>
<table>${e.stages.prove.tasks.map((t) => { const f = (t as { independent_result?: { value: string; code: string } | null }).independent_result; return row(`First submission: ${t.label}`, f ? `${f.value} → ${f.code}` : '—'); }).join('')}${row('Reflection', e.stages.prove.reflection)}</table>
<h2>Integrity</h2><table>${row('Content hash', e.mission.content_hash)}${row('Evidence SHA-256', e.integrity.evidence_sha256)}${row('Validator', `${e.environment.validator} v${e.environment.validation_version}`)}</table>
<p class="n">${esc(e.trust_notice)}</p></body></html>`;
}
