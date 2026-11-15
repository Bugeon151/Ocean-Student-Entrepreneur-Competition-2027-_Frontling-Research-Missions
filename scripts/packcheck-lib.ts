import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../src/core/validator';
import type { Hint, Manifest, Rules } from '../src/core/types';

export const MISSIONS_DIR = new URL('../public/missions', import.meta.url).pathname;
const REQUIRED: (keyof Manifest)[] = ['mission_id', 'version', 'title', 'subject', 'difficulty', 'source_doi', 'paper_url', 'dataset_source', 'dataset_version', 'license', 'estimated_duration', 'prerequisites', 'reproduction_scope', 'validation_version', 'review_status', 'review_scope', 'content_hash'];
const PACK_FILES = ['manifest.json', 'paper.json', 'licenses.json', 'stages/understand.json', 'stages/reproduce.json', 'stages/investigate.json', 'stages/prove.json', 'hints/hints.json', 'validation/rules.json', 'validation/test-cases.json', 'review/checklist.json', 'review/approval.json'];

export interface Pack { id: string; dir: string; manifest: Manifest; rules: Rules; hints: Hint[]; approval: { status: string; domain_review: unknown }; licenses: { items: { asset: string; redistribution: boolean; license: string }[] }; cases: { task: string; name: string; input: { value: string; method: Record<string, string> }; expect: { code: string; diagnosis?: string } }[] }
const j = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
export function loadPacks(): Pack[] {
  return j(join(MISSIONS_DIR, 'index.json')).missions.map((m: { mission_id: string }) => {
    const dir = join(MISSIONS_DIR, m.mission_id);
    return { id: m.mission_id, dir, manifest: j(join(dir, 'manifest.json')), rules: j(join(dir, 'validation/rules.json')), hints: j(join(dir, 'hints/hints.json')).hints, approval: j(join(dir, 'review/approval.json')), licenses: j(join(dir, 'licenses.json')), cases: j(join(dir, 'validation/test-cases.json')).cases };
  });
}
/** Number renderings a leaking hint might contain. */
export function leakForms(x: number): string[] {
  const f = new Set<string>();
  for (let d = 1; d <= 4; d++) { const s = x.toFixed(d); if (Math.abs(Number(s)) >= 0.01) f.add(s); }
  return [...f];
}
export function checkPack(p: Pack): string[] {
  const e: string[] = [];
  const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
  for (const f of PACK_FILES) if (!existsSync(join(p.dir, f))) e.push(`missing file ${f}`);
  for (const k of REQUIRED) { const v = p.manifest[k]; if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) e.push(`manifest.${k} missing`); }
  for (const d of p.manifest.datasets) {
    if (sha(readFileSync(join(p.dir, d.file))) !== d.sha256) e.push(`dataset hash mismatch ${d.file}`);
    if (d.bytes > 5_000_000) e.push(`dataset too large ${d.file}`);
  }
  for (const [f, h] of Object.entries(p.manifest.files)) if (sha(readFileSync(join(p.dir, f))) !== h) e.push(`file hash mismatch ${f}`);
  const dataLic = p.licenses.items.find((i) => i.asset.startsWith('datasets'));
  if (!dataLic || !dataLic.redistribution || !dataLic.license) e.push('dataset licence not confirmed for redistribution (FR-013)');
  if (p.manifest.review_status === 'DOMAIN_REVIEWED' && !p.approval.domain_review) e.push('DOMAIN_REVIEWED without domain reviewer');
  if (p.manifest.review_status === 'DRAFT') e.push('DRAFT mission in release build');
  for (const t of p.rules.tasks) {
    if (t.tolerance < 0.5 * 10 ** -t.min_decimals - 1e-12) e.push(`${t.id}: tolerance smaller than rounding at min_decimals`);
    for (const s of t.signatures) {
      if (Math.abs(s.value - t.expected) <= t.tolerance + 0.5 * 10 ** -t.min_decimals) e.push(`${t.id}: signature ${s.code} overlaps reference`);
      for (const o of t.signatures) if (o !== s && Math.abs(o.value - s.value) <= t.tolerance) e.push(`${t.id}: signatures ${s.code}/${o.code} ambiguous`);
    }
    const hs = p.hints.filter((h) => h.task === t.id && h.status === 'approved');
    if (t.stage === 'prove' && hs.length) e.push(`${t.id}: prove task has hints`);
    if (t.stage === 'reproduce') {
      const lv = hs.filter((h) => h.branch === 'generic').map((h) => h.level).sort().join('');
      if (lv !== '123') e.push(`${t.id}: generic hint path must have levels 1,2,3 (got ${lv})`);
      for (const h of hs) {
        const forms = [...leakForms(t.expected), ...(t.published ? leakForms(t.published.value) : [])];
        const tokens = new Set(h.text.match(/-?\d+(?:\.\d+)?/g) ?? []);
        for (const f of forms) if (tokens.has(f)) e.push(`hint ${h.id} leaks value ${f}`);
      }
    }
  }
  for (const h of p.hints) if (!p.rules.tasks.some((t) => t.id === h.task)) e.push(`hint ${h.id} references unknown task`);
  for (const c of p.cases) {
    const rule = p.rules.tasks.find((t) => t.id === c.task)!;
    const r = validate(rule, c.input);
    if (r.code !== c.expect.code || (c.expect.diagnosis && r.diagnosis !== c.expect.diagnosis)) e.push(`case "${c.name}" (${c.task}): got ${r.code}/${r.diagnosis}, want ${c.expect.code}/${c.expect.diagnosis ?? '*'}`);
  }
  return e;
}
