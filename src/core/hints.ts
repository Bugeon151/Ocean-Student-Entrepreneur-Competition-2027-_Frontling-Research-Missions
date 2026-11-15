import type { Hint, ValidationResult } from './types';

export const MIN_ATTEMPT_CHARS = 20;
export const branchOf = (r: ValidationResult) => (r.code === 'OUT_OF_RANGE' ? r.diagnosis : r.code);

/** Only approved hints for this task/branch, falling back to the task's generic branch. Sorted by level. */
export function hintPath(hints: Hint[], task: string, branch: string): Hint[] {
  const ok = hints.filter((h) => h.status === 'approved' && h.task === task);
  const pick = ok.filter((h) => h.branch === branch);
  return (pick.length ? pick : ok.filter((h) => h.branch === 'generic')).sort((a, b) => a.level - b.level);
}

export interface HintGate { allowed: boolean; reason: string }
export function canUnlock(stage: string, attemptNote: string, last?: ValidationResult): HintGate {
  if (stage === 'prove') return { allowed: false, reason: 'Hints are disabled in Prove (independent assessment).' };
  if (!last) return { allowed: false, reason: 'Check a result first.' };
  if (last.code === 'VALID') return { allowed: false, reason: 'Your result is already valid.' };
  if (attemptNote.trim().length < MIN_ATTEMPT_CHARS) return { allowed: false, reason: `Describe what you tried (at least ${MIN_ATTEMPT_CHARS} characters) to unlock the next hint.` };
  return { allowed: true, reason: '' };
}
