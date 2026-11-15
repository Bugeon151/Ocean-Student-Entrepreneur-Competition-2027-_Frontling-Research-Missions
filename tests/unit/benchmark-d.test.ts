/** Benchmark D — Reproducibility: recorded conditions re-run to the same results; builds are deterministic. */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseCSV } from '../../src/core/csv';
import { annualize, annualSeries, compute } from '../../src/core/stats';
import { validate } from '../../src/core/validator';
import { loadMission } from '../../src/core/pack';
import { buildPassport } from '../../src/core/evidence';
import { fresh, task } from '../../src/core/store';
import { sha256Hex, stableStringify } from '../../src/core/hash';
import type { Manifest, TaskRule } from '../../src/core/types';
import { ROOT, fsFetch, readJ } from './helpers';

const ids = ['gistemp-2024', 'keeling-co2'];
describe('Benchmark D — reproducibility', () => {
  beforeAll(() => { globalThis.fetch = fsFetch(); });
  it('rebuilding packs is byte-for-byte deterministic (content hashes unchanged)', () => {
    const before = ids.map((id) => readJ(`public/missions/${id}/manifest.json`).content_hash);
    execSync('npx tsx scripts/build-packs.ts', { cwd: ROOT, stdio: 'pipe' });
    expect(ids.map((id) => readJ(`public/missions/${id}/manifest.json`).content_hash)).toEqual(before);
  });
  it('reference values re-run from the shipped datasets + recorded compute specs', () => {
    for (const id of ids) {
      const mf: Manifest = readJ(`public/missions/${id}/manifest.json`);
      for (const t of readJ(`public/missions/${id}/validation/rules.json`).tasks as TaskRule[]) {
        const d = mf.datasets.find((x) => x.id === t.dataset)!;
        const csv = readFileSync(join(ROOT, 'public/missions', id, d.file), 'utf8');
        expect(createHash('sha256').update(csv).digest('hex')).toBe(d.sha256);
        const rows = parseCSV(csv).rows;
        const s = d.frequency === 'monthly' ? annualize(rows, d.value_col) : annualSeries(rows, d.value_col);
        expect(Math.abs(compute(t.compute, s) - t.expected)).toBeLessThan(1e-6);
      }
    }
  });
  it('an exported Evidence Passport can be re-verified: recorded attempts re-validate to the same codes and the hash checks out', async () => {
    const m = await loadMission('gistemp-2024', 'missions');
    const p = fresh('gistemp-2024', m.manifest.version, m.manifest.content_hash);
    const r1 = m.rules.tasks[0];
    for (const value of ['2.31', '1.28']) {
      const method = Object.fromEntries(r1.method.map((f) => [f.key, f.expected]));
      const r = validate(r1, { value, method });
      task(p, r1.id).attempts.push({ t: 'x', value, method, code: r.code, diagnosis: r.diagnosis, note: '' });
    }
    const e = await buildPassport(m, p, 'test');
    for (const a of e.stages.reproduce.tasks[0].attempts) expect(validate(r1, a).code).toBe(a.code);
    const { integrity, ...body } = e;
    expect(await sha256Hex(stableStringify(body))).toBe(integrity.evidence_sha256);
    const tampered = { ...body, stages: { ...body.stages, prove: { ...body.stages.prove, reflection: 'edited' } } };
    expect(await sha256Hex(stableStringify(tampered))).not.toBe(integrity.evidence_sha256);
  });
});
