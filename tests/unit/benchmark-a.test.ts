/** Benchmark A — Scientific accuracy: an independent implementation, reading the RAW mirror files
 *  (not the built mission CSVs), must reproduce every reference value. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT, readJ } from './helpers';

// Independent code path: Kahan-compensated sums and OLS via 2x2 normal equations.
const ksum = (a: number[]) => { let s = 0, c = 0; for (const v of a) { const y = v - c, t = s + y; c = t - s - y; s = t; } return s; };
function slopeNormal(x: number[], y: number[]) {
  const n = x.length, sx = ksum(x), sy = ksum(y), sxx = ksum(x.map((v) => v * v)), sxy = ksum(x.map((v, i) => v * y[i]));
  return (n * sxy - sx * sy) / (n * sxx - sx * sx);
}
function rawMonthly(source: string) {
  const by = new Map<number, number[]>();
  for (const l of readFileSync(join(ROOT, 'data-src/monthly.csv'), 'utf8').trim().split('\n').slice(1)) {
    const [s, ym, v] = l.split(',');
    if (s !== source) continue;
    const y = +ym.slice(0, 4); if (!by.has(y)) by.set(y, []); by.get(y)!.push(+v);
  }
  return new Map([...by].filter(([, v]) => v.length === 12).map(([y, v]) => [y, ksum(v) / 12]));
}
const co2Annual = new Map(readFileSync(join(ROOT, 'data-src/co2-annmean-mlo.csv'), 'utf8').trim().split('\n').slice(1).map((l) => { const c = l.split(','); return [+c[0], +c[1]] as [number, number]; }));
const co2FromMonthly = (() => {
  const by = new Map<number, number[]>();
  for (const l of readFileSync(join(ROOT, 'data-src/co2-mm-mlo.csv'), 'utf8').trim().split('\n').slice(1)) { const c = l.split(','); const y = +c[0].slice(0, 4); if (+c[2] > 0) { if (!by.has(y)) by.set(y, []); by.get(y)!.push(+c[2]); } }
  return new Map([...by].filter(([, v]) => v.length === 12).map(([y, v]) => [y, ksum(v) / 12]));
})();
const trend = (s: Map<number, number>, a: number, b: number) => { const x: number[] = [], y: number[] = []; for (let i = a; i <= b; i++) { x.push(i); y.push(s.get(i)!); } return slopeNormal(x, y) * 10; };
const pct = (s: Map<number, number>, a: number, b: number) => ((s.get(b)! - s.get(a)!) / s.get(a)!) * 100;
const exp = (m: string, id: string) => readJ(`public/missions/${m}/validation/rules.json`).tasks.find((t: { id: string }) => t.id === id).expected as number;

describe('Benchmark A — independent reference recomputation', () => {
  const G = rawMonthly('GISTEMP'), H = rawMonthly('GCAG');
  const cases: [string, string, number][] = [
    ['gistemp-2024', 'r1-annual-2024', G.get(2024)!],
    ['gistemp-2024', 'r2-trend-1975-2024', trend(G, 1975, 2024)],
    ['gistemp-2024', 'p1-hadcrut-2024', H.get(2024)!],
    ['gistemp-2024', 'p2-hadcrut-trend', trend(H, 1975, 2024)],
    ['keeling-co2', 'r1-pct-1959-1971', pct(co2Annual, 1959, 1971)],
    ['keeling-co2', 'r2-growth-2015-2024', (co2Annual.get(2024)! - co2Annual.get(2014)!) / 10],
    ['keeling-co2', 'p1-annual-2025-from-monthly', co2FromMonthly.get(2025)!],
    ['keeling-co2', 'p2-pct-1990-2020', pct(co2FromMonthly, 1990, 2020)],
  ];
  it.each(cases)('%s / %s matches independent value', (m, id, v) => expect(Math.abs(exp(m, id) - v)).toBeLessThan(1e-6));

  it('reproduces NASA\'s published 2024 anomaly (1.28 °C) after rounding', () => {
    expect(G.get(2024)!.toFixed(2)).toBe('1.28');
  });
  it('documents the deviation from Keeling et al. 1976 (3.4%) and keeps it bounded', () => {
    const d = Math.abs(pct(co2Annual, 1959, 1971) - 3.4);
    expect(d).toBeGreaterThan(0); // honest: not identical
    expect(d).toBeLessThan(0.2);
  });
  it('NOAA annual file agrees with annual means rebuilt from monthly data (cross-source check)', () => {
    for (const y of [1990, 2000, 2010, 2020, 2025]) expect(Math.abs(co2Annual.get(y)! - co2FromMonthly.get(y)!)).toBeLessThan(0.02);
  });
});
