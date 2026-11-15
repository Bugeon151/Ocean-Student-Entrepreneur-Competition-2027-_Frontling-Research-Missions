import type { ComputeSpec } from './types';
import type { Row } from './csv';

export interface Point { x: number; y: number }
export type Series = Map<number, number>;

export const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;

/** Ordinary least squares slope of y on x. */
export function olsSlope(p: Point[]): number {
  if (p.length < 2) throw new Error('need >=2 points');
  const mx = mean(p.map((q) => q.x)), my = mean(p.map((q) => q.y));
  let sxy = 0, sxx = 0;
  for (const q of p) { sxy += (q.x - mx) * (q.y - my); sxx += (q.x - mx) ** 2; }
  return sxy / sxx;
}
export function olsLine(p: Point[]): { slope: number; intercept: number } {
  const slope = olsSlope(p);
  return { slope, intercept: mean(p.map((q) => q.y)) - slope * mean(p.map((q) => q.x)) };
}

/** Monthly rows (Year,Month,value) -> annual means; only complete years (12 months). */
export function annualize(rows: Row[], col: string): Series {
  const acc = new Map<number, number[]>();
  for (const r of rows) {
    const y = Number(r.Year), v = Number(r[col]);
    if (!Number.isFinite(y) || !Number.isFinite(v)) continue;
    (acc.get(y) ?? acc.set(y, []).get(y)!).push(v);
  }
  const out: Series = new Map();
  for (const [y, vs] of acc) if (vs.length === 12) out.set(y, mean(vs));
  return out;
}
export function annualSeries(rows: Row[], col: string): Series {
  const out: Series = new Map();
  for (const r of rows) { const y = Number(r.Year), v = Number(r[col]); if (Number.isFinite(y) && Number.isFinite(v)) out.set(y, v); }
  return out;
}
export function monthlyPoints(rows: Row[], col: string): Point[] {
  return rows.map((r) => ({ x: Number(r.Year) + (Number(r.Month) - 0.5) / 12, y: Number(r[col]) })).filter((p) => Number.isFinite(p.x + p.y));
}

function get(s: Series, y: number): number {
  const v = s.get(y);
  if (v === undefined) throw new Error(`year ${y} not in series`);
  return v;
}
export function range(s: Series, a: number, b: number): Point[] {
  const out: Point[] = [];
  for (let y = a; y <= b; y++) out.push({ x: y, y: get(s, y) });
  return out;
}

export function compute(spec: ComputeSpec, annual: Series, monthly?: Point[]): number {
  switch (spec.op) {
    case 'annual_mean': return get(annual, spec.year);
    case 'trend_per_decade': return olsSlope(range(annual, spec.start, spec.end)) * 10;
    case 'pct_change': return ((get(annual, spec.to) - get(annual, spec.from)) / get(annual, spec.from)) * 100;
    case 'mean_growth': return (get(annual, spec.end) - get(annual, spec.start - 1)) / (spec.end - spec.start + 1);
    case 'monthly_trend_per_decade': {
      if (!monthly) throw new Error('monthly points required');
      return olsSlope(monthly.filter((p) => p.x >= spec.start && p.x < spec.end + 1)) * 10;
    }
  }
}
