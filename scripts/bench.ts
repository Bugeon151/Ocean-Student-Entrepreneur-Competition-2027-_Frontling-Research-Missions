/** Benchmark E — performance & distribution cost. Also collects A–D pass counts. Writes docs/BENCHMARK.md + docs/benchmark.json.
 *  Requires `npm run build` first. Chrome path: CHROME_PATH or /usr/bin/google-chrome. */
import { execSync, spawn } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import os from 'node:os';
import { chromium } from '@playwright/test';
import { validate } from '../src/core/validator';
import type { TaskRule } from '../src/core/types';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const size = (files: string[]) => files.reduce((a, f) => { const b = readFileSync(f); return { raw: a.raw + b.length, gz: a.gz + gzipSync(b, { level: 6 }).length }; }, { raw: 0, gz: 0 });
const r = (x: number, d = 1) => Number(x.toFixed(d));

// ---- A–D: unit test results
const vt = JSON.parse(execSync('npx vitest run --reporter=json', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 }).toString());
const byFile: Record<string, { passed: number; total: number }> = {};
for (const f of vt.testResults) { const k = f.name.split('/').pop(); byFile[k] = { passed: f.assertionResults.filter((a: { status: string }) => a.status === 'passed').length, total: f.assertionResults.length }; }

// ---- sizes
const app = size(walk(DIST).filter((f) => !f.includes('/missions/')));
const missions = readdirSync(join(DIST, 'missions')).filter((d) => statSync(join(DIST, 'missions', d)).isDirectory());
const packSizes = Object.fromEntries(missions.map((id) => [id, size(walk(join(DIST, 'missions', id)).filter((f) => !f.includes('test-cases') && !f.includes('/review/')))]));

// ---- validator latency (Node)
const rules: TaskRule[] = missions.flatMap((id) => JSON.parse(readFileSync(join(DIST, 'missions', id, 'validation/rules.json'), 'utf8')).tasks);
const lat: number[] = [];
for (let i = 0; i < 20000; i++) { const t = rules[i % rules.length]; const s = performance.now(); validate(t, { value: (t.expected + (i % 7) * 0.01).toFixed(4), method: Object.fromEntries(t.method.map((f) => [f.key, f.expected])) }); lat.push(performance.now() - s); }
lat.sort((a, b) => a - b);

// ---- browser timings
async function browserRun(cpuSlowdown: number) {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown });
  const out: Record<string, number> = {};
  let t = Date.now(); await page.goto('http://127.0.0.1:4174/'); await page.locator('.card').first().waitFor(); out.app_initial_load_ms = Date.now() - t;
  t = Date.now(); await page.goto('http://127.0.0.1:4174/#/m/gistemp-2024/understand'); await page.locator('.quiz').first().waitFor(); out.gistemp_data_ready_ms = Date.now() - t;
  t = Date.now(); await page.getByRole('link', { name: 'Overview' }).click(); await page.locator('.overview').waitFor(); out.stage_switch_ms = Date.now() - t;
  out.save_ms = await page.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.startsWith('frontling:'))!; const v = localStorage.getItem(k)!; const s = performance.now(); for (let i = 0; i < 50; i++) localStorage.setItem(k, v); return (performance.now() - s) / 50; });
  out.js_heap_mb = await page.evaluate(() => ((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0) / 1048576);
  await b.close();
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, r(v, 3)]));
}
const server = spawn('npx', ['vite', 'preview', '--port', '4174', '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((res) => setTimeout(res, 2500));
let normal: Record<string, number>, slow: Record<string, number>;
try { normal = await browserRun(1); slow = await browserRun(4); } finally { server.kill(); }

// ---- distribution cost (static hosting; no LLM calls at student time)
const perStudent = Object.fromEntries(missions.map((id) => [id, app.gz + packSizes[id].gz]));
const worst = Math.max(...Object.values(perStudent));
const GH_PAGES_SOFT_GB = 100; // docs.github.com/pages/getting-started-with-github-pages/github-pages-limits
const studentsPerMonthGH = Math.floor((GH_PAGES_SOFT_GB * 1e9) / worst);

const result = {
  generated_at: new Date().toISOString(),
  machine: { cpus: os.cpus().length, cpu_model: os.cpus()[0]?.model, mem_gb: r(os.totalmem() / 2 ** 30), node: process.version },
  tests: byFile,
  sizes_bytes: { app, packs: packSizes, per_student_transfer_gzip: perStudent },
  validator_node_ms: { p50: r(lat[lat.length >> 1], 5), p99: r(lat[Math.floor(lat.length * 0.99)], 5), max: r(lat.at(-1)!, 4) },
  browser_ms: { normal_cpu: normal, cpu_4x_slowdown: slow },
  distribution: { llm_calls_per_student: 0, github_pages_students_per_month_within_soft_limit: studentsPerMonthGH, cloudflare_pages_static_bandwidth: 'unlimited on free plan (pages.cloudflare.com)' },
};
writeFileSync(join(ROOT, 'docs/benchmark.json'), JSON.stringify(result, null, 2));

const targets: [string, number, number, string][] = [
  ['App initial load (local server, 4× CPU slowdown)', slow.app_initial_load_ms, 5000, 'ms'],
  ['GISTEMP data ready incl. SHA-256 verify (4× CPU slowdown)', slow.gistemp_data_ready_ms, 10000, 'ms'],
  ['Single validation (Node p99)', result.validator_node_ms.p99, 500, 'ms'],
  ['Progress save (4× CPU slowdown)', slow.save_ms, 1000, 'ms'],
  ['Stage switch (4× CPU slowdown)', slow.stage_switch_ms, 1000, 'ms'],
];
const md = `# Benchmark Report (auto-generated)

Generated ${result.generated_at} by \`npm run bench\` on ${result.machine.cpus} vCPU / ${result.machine.mem_gb} GB (${result.machine.cpu_model}), Node ${result.machine.node}, Chrome.
Raw data: [benchmark.json](benchmark.json). Re-run any time: \`npm run build && npm run bench\`.

## A–D · Correctness benchmarks (Vitest)

| Suite | Passed / Total |
|---|---|
${Object.entries(byFile).map(([k, v]) => `| ${k} | ${v.passed} / ${v.total} |`).join('\n')}

## E · Performance vs PRD §12.1 targets

| Metric | Measured | Target | Status |
|---|---:|---:|---|
${targets.map(([n, v, t, u]) => `| ${n} | ${v} ${u} | ≤ ${t} ${u} | ${v <= t ? 'PASS' : 'FAIL'} |`).join('\n')}

Note: load times are measured against a local preview server, so they exclude real-world network latency. The 4× CPU slowdown approximates a low-end laptop; it is an emulation, not a measurement on real low-spec hardware.

| Browser metric | Normal CPU | 4× CPU slowdown |
|---|---:|---:|
${Object.keys(normal).map((k) => `| ${k} | ${normal[k]} | ${slow[k]} |`).join('\n')}

## E · Size & distribution cost

| Item | Raw | Gzip |
|---|---:|---:|
| App shell (HTML+JS+CSS) | ${(app.raw / 1024).toFixed(1)} KB | ${(app.gz / 1024).toFixed(1)} KB |
${missions.map((id) => `| Mission pack \`${id}\` | ${(packSizes[id].raw / 1024).toFixed(1)} KB | ${(packSizes[id].gz / 1024).toFixed(1)} KB |`).join('\n')}

- LLM/API calls per student: **0** (all content is pre-built static data).
- Transfer per student per mission (gzip, worst case): **${(worst / 1024).toFixed(1)} KB**.
- GitHub Pages soft bandwidth limit (100 GB/month) ≈ **${studentsPerMonthGH.toLocaleString('en-US')} mission starts per month** at $0 hosting.
- Cloudflare Pages lists unlimited static bandwidth on its free plan, so marginal hosting cost per student can be treated as ≈ $0 there; support, content production and review remain real costs.

Unit economics formula (PRD §16.3): C = AI drafting + human review + reference validation + maintenance. Record actual hours in [COST_LOG.md](COST_LOG.md).
`;
writeFileSync(join(ROOT, 'docs/BENCHMARK.md'), md);
console.log(md);
const failed = targets.filter(([, v, t]) => v > t).length + Object.values(byFile).filter((v) => v.passed !== v.total).length;
process.exit(failed ? 1 : 0);
