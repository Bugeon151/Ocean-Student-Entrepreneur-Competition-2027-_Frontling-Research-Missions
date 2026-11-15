/** Benchmark C — Hint integrity. */
import { beforeAll, describe, expect, it } from 'vitest';
import { canUnlock, hintPath, MIN_ATTEMPT_CHARS } from '../../src/core/hints';
import { loadMission } from '../../src/core/pack';
import { checkPack, loadPacks } from '../../scripts/packcheck-lib';
import type { Hint, ValidationResult } from '../../src/core/types';
import { fsFetch, readJ } from './helpers';

const fail = (diagnosis: string, code: ValidationResult['code'] = 'OUT_OF_RANGE'): ValidationResult => ({ code, diagnosis, task: 'x', message: '' });

describe('Benchmark C — hint integrity', () => {
  beforeAll(() => { globalThis.fetch = fsFetch(); });
  it('every pack passes the release gate (licence, hashes, leak scan, separation, hint paths)', () => {
    for (const p of loadPacks()) expect(checkPack(p)).toEqual([]);
  });
  it('the browser loader never exposes unapproved hints (0 exposures)', async () => {
    for (const id of ['gistemp-2024', 'keeling-co2']) {
      const raw: Hint[] = readJ(`public/missions/${id}/hints/hints.json`).hints;
      const m = await loadMission(id, 'missions');
      expect(m.hints.every((h) => h.status === 'approved')).toBe(true);
      expect(m.hints.length).toBe(raw.filter((h) => h.status === 'approved').length);
      expect(Object.values(m.data).every((d) => d.verified)).toBe(true);
    }
  });
  it('hintPath filters drafts even if passed directly', () => {
    const hs: Hint[] = [{ id: 'a', task: 't', branch: 'generic', level: 1, text: '', status: 'draft' }, { id: 'b', task: 't', branch: 'generic', level: 2, text: '', status: 'approved' }];
    expect(hintPath(hs, 't', 'generic').map((h) => h.id)).toEqual(['b']);
  });
  it('branch routing: specific branch first, generic fallback, ordered by level', () => {
    const hs: Hint[] = readJ('public/missions/gistemp-2024/hints/hints.json').hints;
    expect(hintPath(hs, 'r1-annual-2024', 'FAHRENHEIT').map((h) => h.level)).toEqual([1, 2]);
    expect(hintPath(hs, 'r1-annual-2024', 'UNKNOWN').every((h) => h.branch === 'generic')).toBe(true);
    expect(hintPath(hs, 'r1-annual-2024', 'generic').map((h) => h.level)).toEqual([1, 2, 3]);
  });
  it('every diagnosable error in Reproduce has its own approved hint branch', () => {
    for (const id of ['gistemp-2024', 'keeling-co2']) {
      const rules = readJ(`public/missions/${id}/validation/rules.json`).tasks;
      const hs: Hint[] = readJ(`public/missions/${id}/hints/hints.json`).hints;
      for (const t of rules.filter((r: { stage: string }) => r.stage === 'reproduce'))
        for (const b of [...t.signatures.map((s: { code: string }) => s.code), 'METHOD_MISMATCH'])
          expect(hs.some((h) => h.task === t.id && h.branch === b && h.status === 'approved'), `${t.id}/${b}`).toBe(true);
    }
  });
  it('gating: needs a failed check and a written attempt; never in Prove; never after VALID', () => {
    const note = 'x'.repeat(MIN_ATTEMPT_CHARS);
    expect(canUnlock('reproduce', note).allowed).toBe(false);
    expect(canUnlock('reproduce', 'short', fail('generic')).allowed).toBe(false);
    expect(canUnlock('reproduce', note, fail('generic')).allowed).toBe(true);
    expect(canUnlock('reproduce', note, fail('none', 'VALID')).allowed).toBe(false);
    expect(canUnlock('prove', note, fail('generic')).allowed).toBe(false);
  });
});
