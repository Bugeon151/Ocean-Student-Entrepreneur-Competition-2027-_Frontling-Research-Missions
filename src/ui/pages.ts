import { h } from './dom';
import { loadMission } from '../core/pack';
import { validate } from '../core/validator';
import { sha256Hex } from '../core/hash';
import { lineChart } from './chart';
import { olsLine, range } from '../core/stats';

interface Strategy {
  scale: string; factors: { id: string; label: string }[];
  offerings: { name: string; highlight?: boolean; scores: Record<string, number | null>; evidence: Record<string, string>; sources?: string[] }[];
  errc: Record<'eliminate' | 'reduce' | 'raise' | 'create', string[]>; noncustomers: { tier: string; who: string; value: string }[];
}

/** "Why Frontling" — the Blue Ocean tools, rendered from public/strategy.json (same file that draws the canvas). */
export async function whyPage(): Promise<HTMLElement> {
  const S: Strategy = await fetch('strategy.json').then((r) => r.json());
  const box = (t: string, items: string[]) => h('div', { class: `errc ${t.toLowerCase()}` }, h('h3', {}, t), h('ul', {}, ...items.map((i) => h('li', {}, i))));
  return h('section', { class: 'overview why' },
    h('h1', {}, 'Why Frontling: a blue ocean in research education'),
    h('p', {}, 'Mentored research programs offer deep human guidance at a high price per student. Free project libraries are cheap but do not check results. Frontling moves expert effort into reusable, verified missions, so it is free to deliver and still checks every result.'),
    h('h2', {}, 'Strategy Canvas'),
    h('img', { src: 'strategy-canvas.svg', alt: 'Strategy canvas comparing Frontling with mentored research programs, an AI tutor and a free project library across eight factors', class: 'canvas' }),
    h('p', { class: 'small' }, S.scale),
    h('div', { class: 'tablewrap' }, h('table', { class: 'data' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Factor'), ...S.offerings.map((o) => h('th', {}, o.name)))),
      h('tbody', {}, ...S.factors.map((f) => h('tr', {}, h('th', { scope: 'row' }, f.label), ...S.offerings.map((o) => h('td', {}, o.scores[f.id] === null ? '—' : String(o.scores[f.id]), o.evidence[f.id] ? h('div', { class: 'small' }, o.evidence[f.id]) : ''))))))),
    h('p', { class: 'small' }, 'Sources: ', ...S.offerings.flatMap((o) => (o.sources ?? []).map((u) => h('a', { href: u, target: '_blank', rel: 'noopener', class: 'src' }, new URL(u).hostname)))),
    h('h2', {}, 'Eliminate · Reduce · Raise · Create'),
    h('div', { class: 'errcgrid' }, box('Eliminate', S.errc.eliminate), box('Reduce', S.errc.reduce), box('Raise', S.errc.raise), box('Create', S.errc.create)),
    h('h2', {}, 'Three tiers of noncustomers'),
    h('table', { class: 'data' }, h('tbody', {}, ...S.noncustomers.map((n) => h('tr', {}, h('th', { scope: 'row' }, n.tier), h('td', {}, n.who), h('td', {}, n.value))))),
    h('h2', {}, 'What we measured (not what we hope)'),
    h('ul', {}, h('li', {}, '0 live AI calls per student — missions are static, pre-reviewed data.'), h('li', {}, '≈41 KB transferred per mission start (gzip).'), h('li', {}, 'Every reference value recomputed by an independent implementation; 0 unapproved hints shipped.'), h('li', {}, 'Not claimed: learning gains, purchase intent, user numbers, domain-expert review.')),
    h('a', { class: 'btn', href: '#/' }, 'Try a mission'));
}

/** Device check — measures this device against the PRD §12.1 targets and exports the result (Benchmark E on real hardware). */
export function devicePage(): HTMLElement {
  const out = h('div', { role: 'status', 'aria-live': 'polite' });
  const run = async () => {
    out.replaceChildren(h('p', {}, 'Measuring… (about 5 seconds)'));
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const t0 = performance.now();
    const m = await loadMission('gistemp-2024');
    const loadMs = performance.now() - t0;
    const big = m.data.reproduce.text;
    let t = performance.now(); for (let i = 0; i < 10; i++) await sha256Hex(big); const hashMs = (performance.now() - t) / 10;
    const rule = m.rules.tasks[0]; const method = Object.fromEntries(rule.method.map((f) => [f.key, f.expected]));
    t = performance.now(); for (let i = 0; i < 2000; i++) validate(rule, { value: (rule.expected + (i % 5) * 0.003).toFixed(4), method }); const valMs = (performance.now() - t) / 2000;
    const payload = JSON.stringify({ x: 'y'.repeat(20000) });
    let saveMs = NaN; try { t = performance.now(); for (let i = 0; i < 20; i++) localStorage.setItem('frontling:device-check', payload); saveMs = (performance.now() - t) / 20; localStorage.removeItem('frontling:device-check'); } catch { /* storage blocked */ }
    const s = m.data.investigate.annual; const pts = range(s, 1880, 2025);
    t = performance.now(); const holder = h('div', {}); holder.append(lineChart(pts, { title: 't', yLabel: 'y', line: { ...olsLine(pts), from: 1880, to: 2025 } })); document.body.append(holder); holder.getBoundingClientRect(); holder.remove(); const chartMs = performance.now() - t;
    const res = {
      measured_at: new Date().toISOString(), user_agent: navigator.userAgent,
      cpu_threads: navigator.hardwareConcurrency ?? null, device_memory_gb: (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null,
      page_load_ms: nav ? Math.round(nav.loadEventEnd || nav.domContentLoadedEventEnd) : null,
      mission_data_ready_ms: Math.round(loadMs), sha256_reproduce_csv_ms: +hashMs.toFixed(2), validation_ms: +valMs.toFixed(4), save_ms: +saveMs.toFixed(3), chart_render_ms: Math.round(chartMs),
      data_verified: Object.values(m.data).every((d) => d.verified),
    };
    const targets: [string, number | null, number][] = [['Initial page load', res.page_load_ms, 5000], ['Mission data ready', res.mission_data_ready_ms, 10000], ['Single validation', res.validation_ms, 500], ['Progress save', res.save_ms, 1000], ['Chart / stage render', res.chart_render_ms, 1000]];
    out.replaceChildren(
      h('table', { class: 'data' }, h('thead', {}, h('tr', {}, h('th', {}, 'Metric'), h('th', {}, 'This device'), h('th', {}, 'Target'), h('th', {}, 'Result'))),
        h('tbody', {}, ...targets.map(([n, v, tg]) => h('tr', {}, h('td', {}, n), h('td', {}, v === null || Number.isNaN(v) ? 'n/a' : `${v} ms`), h('td', {}, `≤ ${tg} ms`), h('td', {}, v === null || Number.isNaN(v) ? '—' : v <= tg ? '✓ PASS' : '✗ FAIL'))))),
      h('p', { class: 'small' }, `CPU threads: ${res.cpu_threads ?? 'n/a'} · Memory: ${res.device_memory_gb ?? 'n/a'} GB (browser-reported, rounded) · Data verified: ${res.data_verified ? 'yes' : 'no'}`),
      h('button', { type: 'button', class: 'btn', onclick: () => { const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' })), download: `frontling-device-check-${Date.now()}.json` }); document.body.append(a); a.click(); a.remove(); } }, 'Export result (JSON)'));
  };
  return h('section', { class: 'overview' }, h('h1', {}, 'Device check'),
    h('p', {}, 'Measures this computer against Frontling\'s performance targets. Nothing is sent anywhere. Export the JSON and add it to the benchmark report to document real low-spec hardware.'),
    h('button', { type: 'button', class: 'btn', onclick: run }, 'Run device check'), out);
}
