import type { Progress } from './store';
import type { StageId } from './types';
import type { Mission } from './pack';

export function stageDone(m: Mission, p: Progress, s: StageId): boolean {
  const st = m.stages;
  switch (s) {
    case 'understand': return [...st.understand.quiz, st.understand.data_check].every((q) => p.quiz[q.id]?.correct);
    case 'reproduce': return st.reproduce.tasks.every((t) => p.tasks[t]?.valid);
    case 'investigate': { const last = p.submissions.at(-1); return !!last && st.investigate.required.every((k) => (last as unknown as Record<string, string>)[k]?.trim()); }
    case 'prove': return st.prove.tasks.every((t) => (p.tasks[t]?.attempts.length ?? 0) > 0) && p.reflection.trim().length > 0;
  }
}
const ORDER: StageId[] = ['understand', 'reproduce', 'investigate', 'prove'];
export function stageUnlocked(m: Mission, p: Progress, s: StageId): boolean {
  const i = ORDER.indexOf(s);
  return ORDER.slice(0, i).every((x) => stageDone(m, p, x));
}
export function percent(m: Mission, p: Progress): number { return Math.round((ORDER.filter((s) => stageDone(m, p, s)).length / 4) * 100); }
