/** Builds Research Mission Packs: content/missions/* + data-src/* -> public/missions/*. Deterministic. */
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseCSV, toCSV, type Row } from '../src/core/csv';
import { annualize, annualSeries, compute, type Series } from '../src/core/stats';
import type { ComputeSpec, Manifest, Rules, TaskRule } from '../src/core/types';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'content/missions'), OUT = join(ROOT, 'public/missions'), RAW = join(ROOT, 'data-src');
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const readJ = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const r6 = (x: number) => Math.round(x * 1e6) / 1e6;

/** Dataset builders: raw mirror files -> clean, documented mission CSVs. */
function globalTemp(source: string, from: string, to: string) {
  const rows = parseCSV(readFileSync(join(RAW, 'monthly.csv'), 'utf8')).rows.filter((r) => r.Source === source && r.Year >= from && r.Year <= to);
  rows.sort((a, b) => (a.Year < b.Year ? -1 : 1));
  return toCSV(['Year', 'Month', 'Anomaly_C'], rows.map((r) => [r.Year.slice(0, 4), Number(r.Year.slice(5)), r.Mean]));
}
function co2Monthly() {
  // Mirror header is mislabelled (shifted columns); by position: 0=YYYY-MM, 1=decimal date, 2=monthly mean ppm.
  const lines = readFileSync(join(RAW, 'co2-mm-mlo.csv'), 'utf8').trim().split('\n').slice(1);
  return toCSV(['Year', 'Month', 'CO2_ppm'], lines.map((l) => l.split(',')).filter((c) => Number(c[2]) > 0).map((c) => [c[0].slice(0, 4), Number(c[0].slice(5)), c[2]]));
}
function co2Annual() {
  const rows = parseCSV(readFileSync(join(RAW, 'co2-annmean-mlo.csv'), 'utf8')).rows;
  return toCSV(['Year', 'CO2_ppm', 'Uncertainty_ppm'], rows.map((r) => [r.Year, r.Mean, r.Uncertainty]));
}
function annualFromMonthlyCSV(csv: string, col: string) {
  const s = annualize(parseCSV(csv).rows, col);
  return toCSV(['Year', col], [...s].sort((a, b) => a[0] - b[0]).map(([y, v]) => [y, r6(v).toFixed(6)]));
}
const BUILDERS: Record<string, () => Record<string, string>> = {
  'gistemp-2024': () => {
    const rep = globalTemp('GISTEMP', '1880-01', '2025-12');
    return { reproduce: rep, investigate: annualFromMonthlyCSV(rep, 'Anomaly_C'), transfer: globalTemp('GCAG', '1850-01', '2025-12') };
  },
  'keeling-co2': () => ({ reproduce: co2Annual(), investigate: co2Annual(), transfer: co2Monthly() }),
};

type SigSrc = { code: string; scale?: number; offset?: number; value?: number; transform?: 'ratio' | 'diff'; from_dataset?: string; compute?: ComputeSpec | { op: 'pct_change_base_to'; from: number; to: number } | { op: 'span_over'; from: number; to: number; div: number } };
type TaskSrc = Omit<TaskRule, 'expected' | 'signatures'> & { signatures: SigSrc[] };

function seriesOf(csv: string, freq: 'monthly' | 'annual', col: string): Series {
  const rows: Row[] = parseCSV(csv).rows;
  return freq === 'monthly' ? annualize(rows, col) : annualSeries(rows, col);
}
function extCompute(spec: NonNullable<SigSrc['compute']>, s: Series): number {
  const g = (y: number) => { const v = s.get(y); if (v === undefined) throw new Error(`year ${y}`); return v; };
  if (spec.op === 'pct_change_base_to') return ((g(spec.to) - g(spec.from)) / g(spec.to)) * 100;
  if (spec.op === 'span_over') return (g(spec.to) - g(spec.from)) / spec.div;
  return compute(spec, s);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const index: unknown[] = [];
for (const id of readdirSync(SRC).sort()) {
  const src = join(SRC, id), out = join(OUT, id);
  const m = readJ(join(src, 'mission.json'));
  const data = BUILDERS[id]();
  mkdirSync(join(out, 'datasets'), { recursive: true });
  const series: Record<string, Series> = {};
  for (const d of m.datasets) {
    const csv = data[d.id];
    writeFileSync(join(out, d.file), csv);
    const { header, rows } = parseCSV(csv);
    Object.assign(d, { columns: header, rows: rows.length, bytes: Buffer.byteLength(csv), sha256: sha(csv) });
    series[d.id] = seriesOf(csv, d.frequency, d.value_col);
  }
  const rs = readJ(join(src, 'validation/rules.src.json'));
  const tasks: TaskRule[] = rs.tasks.map((t: TaskSrc) => {
    const s = series[t.dataset];
    const expected = r6(compute(t.compute, s));
    const signatures = t.signatures.map((g) => {
      let v: number;
      if (g.value !== undefined) v = g.value;
      else if (g.compute) v = extCompute(g.compute, series[g.from_dataset ?? t.dataset]);
      else if (g.transform && t.compute.op === 'pct_change') {
        const a = s.get(t.compute.from)!, b = s.get(t.compute.to)!;
        v = g.transform === 'ratio' ? b / a : b - a;
      } else v = expected * (g.scale ?? 1) + (g.offset ?? 0);
      return { code: g.code, value: r6(v) };
    });
    return { ...t, expected, signatures };
  });
  const rules: Rules = { validation_version: rs.validation_version, rounding: rs.rounding, tasks };
  mkdirSync(join(out, 'validation'), { recursive: true });
  writeFileSync(join(out, 'validation/rules.json'), JSON.stringify(rules, null, 2));
  writeFileSync(join(out, 'validation/test-cases.json'), JSON.stringify({ cases: tasks.flatMap(testCases) }, null, 2));
  for (const dir of ['stages', 'hints', 'review']) cpSync(join(src, dir), join(out, dir), { recursive: true });
  for (const f of ['paper.json', 'licenses.json']) cpSync(join(src, f), join(out, f));
  // content hash over every pack file except manifest (sorted paths)
  const files: Record<string, string> = {};
  const walk = (d: string) => readdirSync(d).sort().forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : (files[relative(out, p)] = sha(readFileSync(p))); });
  walk(out);
  const content_hash = sha(Object.entries(files).sort().map(([k, v]) => `${k}:${v}`).join('\n'));
  const approval = readJ(join(src, 'review/approval.json'));
  const manifest: Manifest = { ...m, validation_version: rules.validation_version, review_status: approval.status, content_hash, files };
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  index.push({ mission_id: id, title: m.title, subject: m.subject, difficulty: m.difficulty, summary: m.summary, version: m.version, review_status: approval.status, reproduction_level: m.reproduction_level, estimated_duration: m.estimated_duration, prerequisites: m.prerequisites, paper_url: m.paper_url, data_bytes: m.datasets.reduce((s: number, d: { bytes: number }) => s + d.bytes, 0), requirements: m.requirements, reproduction_scope: m.reproduction_scope });
  console.log(`built ${id}: ${tasks.length} tasks, hash ${content_hash.slice(0, 12)}`);
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ missions: index }, null, 2));

/** Benchmark B cases, generated from each rule so every documented error type is exercised. */
function testCases(t: TaskRule) {
  const okMethod = Object.fromEntries(t.method.map((f) => [f.key, f.expected]));
  const fmt = (x: number) => x.toFixed(Math.max(t.min_decimals, 6));
  const c = (name: string, value: string, method: Record<string, string>, code: string, diagnosis?: string) => ({ task: t.id, name, input: { value, method }, expect: { code, ...(diagnosis ? { diagnosis } : {}) } });
  const wrong = t.method[0];
  const wrongVal = wrong.type === 'select' ? wrong.options!.find((o) => o !== wrong.expected)! : String(Number(wrong.expected) + 1);
  const out = [
    c('exact reference', fmt(t.expected), okMethod, 'VALID'),
    c('rounded to min decimals', t.expected.toFixed(t.min_decimals), okMethod, 'VALID'),
    c('inside tolerance edge', fmt(t.expected + t.tolerance * 0.95), okMethod, 'VALID'),
    c('empty value', '', okMethod, 'INCOMPLETE', 'missing_value'),
    c('missing method field', fmt(t.expected), { ...okMethod, [wrong.key]: '' }, 'INCOMPLETE', 'missing_method'),
    c('decimal comma', fmt(t.expected).replace('.', ','), okMethod, 'FORMAT_ERROR', 'decimal_comma'),
    c('unit text in value', `${fmt(t.expected)} ${t.unit}`, okMethod, 'FORMAT_ERROR', 'not_a_number'),
    c('too few decimals', t.expected.toFixed(t.min_decimals - 1 < 0 ? 0 : t.min_decimals - 1).replace(/\.$/, ''), okMethod, 'FORMAT_ERROR', 'precision'),
    c('wrong analysis condition', fmt(t.expected), { ...okMethod, [wrong.key]: wrongVal }, 'METHOD_MISMATCH', 'method'),
    ...t.signatures.map((s) => c(`signature ${s.code}`, fmt(s.value), okMethod, 'OUT_OF_RANGE', s.code)),
  ];
  const far = t.expected + Math.max(Math.abs(t.expected) * 0.37, 0.5) + 0.123;
  if (t.signatures.every((s) => Math.abs(far - s.value) > t.tolerance)) out.push(c('far off', fmt(far), okMethod, 'OUT_OF_RANGE', 'generic'));
  return out;
}
