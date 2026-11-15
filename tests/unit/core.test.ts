import { describe, expect, it, beforeAll } from 'vitest';
import { parseCSV, toCSV } from '../../src/core/csv';
import { annualize, compute, olsSlope } from '../../src/core/stats';
import { stableStringify } from '../../src/core/hash';
import { passportHTML, buildPassport } from '../../src/core/evidence';
import { loadMission } from '../../src/core/pack';
import { fresh, load, save, reset } from '../../src/core/store';
import { stageDone, stageUnlocked, percent } from '../../src/core/progress';
import { fsFetch } from './helpers';

describe('core', () => {
  beforeAll(() => {
    globalThis.fetch = fsFetch();
    const mem = new Map<string, string>();
    globalThis.localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as Storage;
  });
  it('csv round trip', () => { const t = toCSV(['a', 'b'], [[1, 2], [3, 4]]); expect(parseCSV(t).rows).toEqual([{ a: '1', b: '2' }, { a: '3', b: '4' }]); });
  it('annualize drops incomplete years', () => {
    const rows = [...Array(12)].map((_, i) => ({ Year: '2000', Month: String(i + 1), v: String(i) })).concat([{ Year: '2001', Month: '1', v: '5' }]);
    const s = annualize(rows, 'v'); expect(s.get(2000)).toBe(5.5); expect(s.has(2001)).toBe(false);
  });
  it('OLS slope on exact line', () => expect(olsSlope([1, 2, 3, 4].map((x) => ({ x, y: 2 * x + 1 })))).toBeCloseTo(2, 12));
  it('compute ops', () => {
    const s = new Map([[2000, 100], [2001, 102], [2002, 105]]);
    expect(compute({ op: 'pct_change', from: 2000, to: 2002 }, s)).toBeCloseTo(5);
    expect(compute({ op: 'mean_growth', start: 2001, end: 2002 }, s)).toBeCloseTo(2.5);
    expect(() => compute({ op: 'annual_mean', year: 1999 }, s)).toThrow();
  });
  it('stable stringify is key-order independent', () => expect(stableStringify({ b: 1, a: [{ d: 1, c: 2 }] })).toBe(stableStringify({ a: [{ c: 2, d: 1 }], b: 1 })));
  it('progress persists locally and stage gating works', async () => {
    const m = await loadMission('keeling-co2', 'missions');
    const p = fresh('keeling-co2', '1', 'h');
    expect(stageUnlocked(m, p, 'reproduce')).toBe(false);
    for (const q of [...m.stages.understand.quiz, m.stages.understand.data_check]) p.quiz[q.id] = { attempts: 1, correct: true };
    expect(stageDone(m, p, 'understand')).toBe(true); expect(stageUnlocked(m, p, 'reproduce')).toBe(true); expect(percent(m, p)).toBe(25);
    expect(save(p)).toBe(true); expect(load('keeling-co2')?.quiz).toEqual(p.quiz); reset('keeling-co2'); expect(load('keeling-co2')).toBeNull();
  });
  it('HTML export escapes student text (no script injection)', async () => {
    const m = await loadMission('keeling-co2', 'missions');
    const p = fresh('keeling-co2', '1', 'h');
    p.reflection = '<script>alert(1)</script>';
    const html = passportHTML(await buildPassport(m, p, 'test'));
    expect(html).not.toContain('<script>alert'); expect(html).toContain('&lt;script&gt;');
  });
  it('loader rejects path traversal ids', async () => { await expect(loadMission('../x', 'missions')).rejects.toThrow('invalid mission id'); });
});
