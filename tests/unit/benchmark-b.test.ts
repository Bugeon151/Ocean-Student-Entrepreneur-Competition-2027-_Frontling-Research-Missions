/** Benchmark B — Error detection: every generated case + PRD §15.3 error categories. */
import { describe, expect, it } from 'vitest';
import { validate } from '../../src/core/validator';
import type { TaskRule } from '../../src/core/types';
import { readJ } from './helpers';

const missions = ['gistemp-2024', 'keeling-co2'];
type Case = { task: string; name: string; input: { value: string; method: Record<string, string> }; expect: { code: string; diagnosis?: string } };
const all = missions.flatMap((m) => {
  const rules: TaskRule[] = readJ(`public/missions/${m}/validation/rules.json`).tasks;
  return (readJ(`public/missions/${m}/validation/test-cases.json`).cases as Case[]).map((c) => ({ m, c, rule: rules.find((r) => r.id === c.task)! }));
});

describe('Benchmark B — generated cases', () => {
  it.each(all.map((x) => [`${x.m}/${x.c.task}: ${x.c.name}`, x] as const))('%s', (_n, { c, rule }) => {
    const r = validate(rule, c.input);
    expect(r.code).toBe(c.expect.code);
    if (c.expect.diagnosis) expect(r.diagnosis).toBe(c.expect.diagnosis);
  });
});

describe('Benchmark B — PRD error categories are all covered', () => {
  const diag = new Set(all.map((x) => x.c.expect.diagnosis).filter(Boolean));
  const codes = new Set(all.map((x) => x.c.expect.code));
  const need: Record<string, string[]> = {
    'decimal-point error': ['precision', 'decimal_comma', 'DECIMAL_SHIFT'],
    'wrong unit': ['FAHRENHEIT', 'PER_YEAR', 'PPM_DIFFERENCE', 'RATIO_NOT_PERCENT'],
    'missing data': ['missing_value', 'missing_method'],
    'reversed calculation': ['SIGN_FLIP', 'WRONG_BASE'],
    'wrong analysis period': ['FULL_PERIOD', 'FENCEPOST', 'WRONG_START', 'WRONG_YEAR'],
    'wrong reference value': ['WRONG_DATASET', 'PUBLISHED_VALUE', 'WRONG_BASE'],
    'data order error': ['SIGN_FLIP'],
    'input format error': ['not_a_number', 'decimal_comma'],
  };
  it.each(Object.entries(need))('%s', (_k, ds) => expect(ds.every((d) => diag.has(d))).toBe(true));
  it('all five result classes occur', () => expect([...codes].sort()).toEqual(['FORMAT_ERROR', 'INCOMPLETE', 'METHOD_MISMATCH', 'OUT_OF_RANGE', 'VALID']));
});

describe('validator edge cases', () => {
  const rule: TaskRule = { id: 't', stage: 'reproduce', label: 'l', prompt: 'p', unit: 'u', dataset: 'd', compute: { op: 'annual_mean', year: 1 }, expected: 1.2817, tolerance: 0.006, min_decimals: 2, method: [], signatures: [] };
  const v = (value: string) => validate(rule, { value, method: {} });
  it('accepts leading +, whitespace and boundary', () => { expect(v(' +1.28 ').code).toBe('VALID'); expect(v('1.2877').code).toBe('VALID'); expect(v('1.2878').code).toBe('OUT_OF_RANGE'); });
  it('rejects exponent, units, empty, NaN', () => { for (const s of ['1e0', '1.28°C', 'NaN', '--1.28', '1.2.8']) expect(v(s).code).toBe('FORMAT_ERROR'); expect(v('').code).toBe('INCOMPLETE'); });
  it('is deterministic', () => { const a = v('1.30'), b = v('1.30'); expect(a).toEqual(b); });
});
