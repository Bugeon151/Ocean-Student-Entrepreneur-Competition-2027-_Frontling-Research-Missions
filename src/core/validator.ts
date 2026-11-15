import type { TaskRule, ValidationInput, ValidationResult } from './types';

const NUM = /^[-+]?\d+(\.\d+)?$/;
const EPS = 1e-9;

export const MESSAGES: Record<string, string> = {
  VALID: 'Within the documented tolerance. Your value matches the reference calculation.',
  missing_value: 'Enter a numeric result before checking.',
  missing_method: 'Record every analysis condition before checking.',
  decimal_comma: 'Use a dot as the decimal separator (e.g. 1.25, not 1,25).',
  not_a_number: 'The result must be a plain number without units or symbols.',
  precision: 'Report more decimal places — rounding too early hides real differences.',
  method: 'One or more recorded analysis conditions differ from the mission protocol.',
  generic: 'Outside the tolerance. Re-check your steps; the hint panel can help after you describe your attempt.',
};

export function decimals(s: string): number { const i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; }

/** Deterministic classifier. Order: INCOMPLETE > FORMAT_ERROR > METHOD_MISMATCH > VALID > diagnosed OUT_OF_RANGE > OUT_OF_RANGE. */
export function validate(rule: TaskRule, input: ValidationInput): ValidationResult {
  const base = { task: rule.id };
  const raw = (input.value ?? '').trim();
  const missing = rule.method.filter((m) => !(input.method?.[m.key] ?? '').toString().trim()).map((m) => m.key);
  if (!raw) return { ...base, code: 'INCOMPLETE', diagnosis: 'missing_value', message: MESSAGES.missing_value };
  if (missing.length) return { ...base, code: 'INCOMPLETE', diagnosis: 'missing_method', message: MESSAGES.missing_method, fields: missing };
  if (/^[-+]?\d+,\d+$/.test(raw)) return { ...base, code: 'FORMAT_ERROR', diagnosis: 'decimal_comma', message: MESSAGES.decimal_comma };
  if (!NUM.test(raw)) return { ...base, code: 'FORMAT_ERROR', diagnosis: 'not_a_number', message: MESSAGES.not_a_number };
  if (decimals(raw) < rule.min_decimals)
    return { ...base, code: 'FORMAT_ERROR', diagnosis: 'precision', message: `${MESSAGES.precision} (at least ${rule.min_decimals}).` };
  const wrong = rule.method.filter((m) => String(input.method[m.key]).trim() !== String(m.expected)).map((m) => m.key);
  if (wrong.length) return { ...base, code: 'METHOD_MISMATCH', diagnosis: 'method', message: MESSAGES.method, fields: wrong };
  const x = Number(raw);
  if (Math.abs(x - rule.expected) <= rule.tolerance + EPS) return { ...base, code: 'VALID', diagnosis: 'none', message: MESSAGES.VALID, value: x };
  for (const s of rule.signatures)
    if (Math.abs(x - s.value) <= (s.tolerance ?? rule.tolerance) + EPS)
      return { ...base, code: 'OUT_OF_RANGE', diagnosis: s.code, message: MESSAGES.generic, value: x };
  return { ...base, code: 'OUT_OF_RANGE', diagnosis: 'generic', message: MESSAGES.generic, value: x };
}
