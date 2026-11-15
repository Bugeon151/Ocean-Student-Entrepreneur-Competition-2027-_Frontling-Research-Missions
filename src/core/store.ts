import type { ValidationResult } from './types';

export interface Attempt { t: string; value: string; method: Record<string, string>; code: string; diagnosis: string; note: string }
export interface TaskState { value: string; method: Record<string, string>; note: string; attempts: Attempt[]; hints: string[]; last?: ValidationResult; valid: boolean }
export interface Run { t: string; dataset: string; op: string; params: Record<string, number>; result: number; label: string }
export interface Submission { t: string; question: string; hypothesis: string; method: string; result: string; interpretation: string; limitations: string }
export interface Progress {
  schema: 1; mission_id: string; mission_version: string; content_hash: string; started_at: string;
  quiz: Record<string, { attempts: number; correct: boolean; last?: number }>;
  tasks: Record<string, TaskState>;
  runs: Run[]; draft: Submission; submissions: Submission[];
  reflection: string; memo: string; events: { t: string; type: string; detail: string }[];
}
const KEY = (id: string) => `frontling:progress:v1:${id}`;
export const now = () => new Date().toISOString();
export const emptySubmission = (): Submission => ({ t: '', question: '', hypothesis: '', method: '', result: '', interpretation: '', limitations: '' });

export function fresh(id: string, version: string, hash: string): Progress {
  return { schema: 1, mission_id: id, mission_version: version, content_hash: hash, started_at: now(), quiz: {}, tasks: {}, runs: [], draft: emptySubmission(), submissions: [], reflection: '', memo: '', events: [] };
}
/** localStorage, wrapped: storage can be unavailable (private mode, sandboxed iframes). */
export function load(id: string): Progress | null {
  try { const s = localStorage.getItem(KEY(id)); return s ? (JSON.parse(s) as Progress) : null; } catch { return null; }
}
export function save(p: Progress): boolean {
  try { localStorage.setItem(KEY(p.mission_id), JSON.stringify(p)); return true; } catch { return false; }
}
export function reset(id: string) { try { localStorage.removeItem(KEY(id)); } catch { /* ignore */ } }
export function task(p: Progress, id: string): TaskState {
  return (p.tasks[id] ??= { value: '', method: {}, note: '', attempts: [], hints: [], valid: false });
}
export function log(p: Progress, type: string, detail: string) { p.events.push({ t: now(), type, detail }); }
