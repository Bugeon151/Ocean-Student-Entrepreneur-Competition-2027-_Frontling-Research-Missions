/** FR-011 Mission authoring: paper discovery (OpenAlex), eligibility screening, scaffold, AI draft (always DRAFT), approval.
 *  Pure functions are exported for tests; network access goes through an injectable fetch. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const CONTENT = new URL('../content/missions', import.meta.url).pathname;
type Fetch = typeof fetch;

export interface Candidate { doi: string; title: string; year: number; venue: string; authors: string; is_oa: boolean; oa_url: string | null; license: string | null; cited_by: number }

/** OpenAlex work -> Candidate (only fields we use). */
export function toCandidate(w: Record<string, any>): Candidate {
  return {
    doi: String(w.doi ?? '').replace('https://doi.org/', ''),
    title: w.display_name ?? w.title ?? '',
    year: w.publication_year ?? 0,
    venue: w.primary_location?.source?.display_name ?? '',
    authors: (w.authorships ?? []).slice(0, 6).map((a: any) => a.author?.display_name).filter(Boolean).join(', '),
    is_oa: !!w.open_access?.is_oa,
    oa_url: w.open_access?.oa_url ?? null,
    license: w.primary_location?.license ?? w.best_oa_location?.license ?? null,
    cited_by: w.cited_by_count ?? 0,
  };
}

export async function discover(query: string, f: Fetch = fetch, perPage = 10): Promise<Candidate[]> {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=has_doi:true,is_oa:true&per-page=${perPage}&sort=cited_by_count:desc`;
  const r = await f(url);
  if (!r.ok) throw new Error(`OpenAlex HTTP ${r.status}`);
  return ((await r.json()).results ?? []).map(toCandidate);
}
export async function lookupDOI(doi: string, f: Fetch = fetch): Promise<Candidate> {
  const r = await f(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`);
  if (!r.ok) throw new Error(`OpenAlex HTTP ${r.status} for DOI ${doi}`);
  return toCandidate(await r.json());
}

/** PRD §10.1 eligibility screen. Any failed item excludes the paper from automatic mission production. */
export interface ScreenInput {
  candidate: Candidate;
  data_url?: string; data_license?: string; data_bytes?: number;
  method_clear?: boolean; reference_computable?: boolean; minors_safe?: boolean;
}
export const OPEN_DATA_LICENSES = ['CC0', 'CC-BY', 'CC-BY-4.0', 'ODC-PDDL', 'ODC-PDDL-1.0', 'ODC-BY', 'PUBLIC-DOMAIN', 'US-GOV-PD'];
export function screen(s: ScreenInput): { eligible: boolean; reasons: string[] } {
  const r: string[] = [];
  if (!s.candidate.doi) r.push('paper has no DOI (existence not verifiable)');
  if (!s.candidate.is_oa) r.push('original paper is not open access');
  if (!s.data_url) r.push('required source data not accessible');
  if (!s.data_license || !OPEN_DATA_LICENSES.includes(s.data_license.toUpperCase())) r.push(`data licence not confirmed for redistribution (${s.data_license ?? 'unknown'})`);
  if (s.data_bytes !== undefined && s.data_bytes > 5_000_000) r.push('mission data exceeds 5 MB browser budget');
  if (s.method_clear === false) r.push('analysis method unclear');
  if (s.reference_computable === false) r.push('no deterministic reference result can be computed');
  if (s.minors_safe === false) r.push('legal/ethical risk for minors');
  return { eligible: r.length === 0, reasons: r };
}

const slug = (s: string) => /^[a-z0-9-]{3,48}$/.test(s);
const write = (p: string, v: unknown) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); };

/** Create a DRAFT mission skeleton. Never overwrites an existing mission. */
export function scaffold(id: string, c: Candidate, root = CONTENT): string {
  if (!slug(id)) throw new Error('mission id must be 3–48 chars of a-z, 0-9, -');
  const dir = join(root, id);
  if (existsSync(dir)) throw new Error(`mission ${id} already exists`);
  write(join(dir, 'mission.json'), {
    mission_id: id, version: '0.1.0', title: `TODO: student-facing title (${c.title})`, subject: 'TODO', difficulty: 'Beginner',
    summary: 'TODO', source_doi: c.doi, paper_url: `https://doi.org/${c.doi}`, dataset_source: 'TODO', dataset_version: 'TODO: pin a commit or version',
    license: 'TODO', estimated_duration: 'TODO', prerequisites: [], reproduction_scope: 'TODO: what IS and what is NOT reproduced', reproduction_level: 'R1',
    requirements: 'Any modern browser. A spreadsheet or Python.', review_status: 'DRAFT', review_scope: [], datasets: [],
  });
  write(join(dir, 'paper.json'), { primary: { title: c.title, authors: c.authors, year: c.year, venue: c.venue, doi: c.doi, url: `https://doi.org/${c.doi}` }, finding: { text: 'TODO: the published number this mission reproduces', url: `https://doi.org/${c.doi}` }, related: [] });
  write(join(dir, 'licenses.json'), { items: [{ asset: 'datasets/*.csv', license: '', redistribution: false, attribution: 'TODO', evidence_url: 'TODO' }] });
  write(join(dir, 'stages/understand.json'), { research_question: 'TODO', intro: [], concepts: [], data_structure: { dataset: 'reproduce', description: 'TODO' }, quiz: [], data_check: { id: 'dc1', q: 'TODO', options: ['', ''], answer: 0, feedback: {} } });
  write(join(dir, 'stages/reproduce.json'), { intro: [], steps: [], tasks: [], rounding: 'Do not round intermediate results. A result is VALID when |your value − reference| ≤ tolerance.' });
  write(join(dir, 'stages/investigate.json'), { intro: [], datasets: ['investigate'], suggested_questions: [], required: ['question', 'method', 'result', 'interpretation', 'limitations'] });
  write(join(dir, 'stages/prove.json'), { intro: [], tasks: [], reflection: 'TODO' });
  write(join(dir, 'hints/hints.json'), { hints: [] });
  write(join(dir, 'validation/rules.src.json'), { validation_version: '0.1.0', rounding: 'Compare unrounded values; VALID if |x - ref| <= tolerance.', tasks: [] });
  write(join(dir, 'review/checklist.json'), { items: [{ id: 'paper-exists', check: 'Cited paper resolves via DOI', result: 'pending' }, { id: 'license', check: 'Data licence permits redistribution', result: 'pending' }, { id: 'reference', check: 'Reference values recomputed independently', result: 'pending' }, { id: 'hints', check: 'No hint reveals a reference value', result: 'pending' }, { id: 'domain', check: 'Domain expert review', result: 'pending' }] });
  write(join(dir, 'review/approval.json'), { status: 'DRAFT', reviewers: [], domain_review: null, note: 'Created by scaffold. DRAFT missions are never published.' });
  return dir;
}

/** Prompt for the AI drafting step. The model drafts text; it never decides reference values (those are computed by build-packs). */
export function draftPrompt(paper: Candidate, scope: string): string {
  return `You are drafting a high-school research mission from a real paper. Output ONLY JSON with keys:
"understand": {"research_question": string, "intro": string[3], "concepts": [{"term","def"}] (5-7), "quiz": [{"id":"q1..q4","q","options":[4],"answer":index,"feedback":{"<wrong index>":"nudge that does not reveal the answer"}}]},
"reproduce": {"intro": string[], "steps": string[]},
"hints": [{"task":"<task id>","branch":"generic","level":1|2|3,"text": string}] (levels 1-3 per task: direction, concept, partial example with toy numbers).
Rules: never state a numeric result of the analysis; partial examples must use made-up toy numbers; plain language for ages 14-18; no medical or diagnostic advice.
Paper: ${paper.title} (${paper.year}), ${paper.venue}, doi:${paper.doi}.
Reproduction scope: ${scope}`;
}

/** Normalise model output: everything becomes status "draft"; malformed items are dropped. */
export function sanitizeDraft(raw: string): { understand: unknown; reproduce: unknown; hints: { id: string; task: string; branch: string; level: number; text: string; status: 'draft' }[] } {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('model output contains no JSON object');
  const j = JSON.parse(m[0]);
  const hints = (Array.isArray(j.hints) ? j.hints : [])
    .filter((h: any) => typeof h?.task === 'string' && typeof h?.text === 'string' && [1, 2, 3].includes(h?.level))
    .map((h: any, i: number) => ({ id: `ai-${i + 1}`, task: h.task, branch: typeof h.branch === 'string' ? h.branch : 'generic', level: h.level, text: h.text, status: 'draft' as const }));
  return { understand: j.understand ?? null, reproduce: j.reproduce ?? null, hints };
}

export async function aiDraft(paper: Candidate, scope: string, key: string, f: Fetch = fetch, model = process.env.FRONTLING_MODEL ?? 'claude-sonnet-5-5') {
  const r = await f('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 4000, messages: [{ role: 'user', content: draftPrompt(paper, scope) }] }),
  });
  if (!r.ok) throw new Error(`Anthropic API HTTP ${r.status}`);
  const body = await r.json();
  return sanitizeDraft((body.content ?? []).map((c: any) => c.text ?? '').join(''));
}

/** Human approval: records the reviewer and flips approved hints. Domain review only with an explicit domain reviewer. */
export function approve(id: string, reviewer: string, opts: { hintIds?: string[] | 'all'; domain?: boolean; date?: string } = {}, root = CONTENT) {
  if (!reviewer.trim()) throw new Error('reviewer name required');
  const dir = join(root, id);
  const hp = join(dir, 'hints/hints.json'), ap = join(dir, 'review/approval.json');
  const hints = JSON.parse(readFileSync(hp, 'utf8'));
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  for (const h of hints.hints) if (opts.hintIds === 'all' || opts.hintIds?.includes(h.id)) { h.status = 'approved'; h.reviewed_by = reviewer; }
  writeFileSync(hp, JSON.stringify(hints, null, 2) + '\n');
  const a = JSON.parse(readFileSync(ap, 'utf8'));
  a.reviewers = [...(a.reviewers ?? []), { name: reviewer, role: opts.domain ? 'domain' : 'internal', date }];
  if (opts.domain) { a.domain_review = { name: reviewer, date }; a.status = 'DOMAIN_REVIEWED'; }
  else if (a.status === 'DRAFT') a.status = 'INTERNAL_REVIEWED';
  writeFileSync(ap, JSON.stringify(a, null, 2) + '\n');
  return a.status as string;
}
