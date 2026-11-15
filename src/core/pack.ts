import { parseCSV, type Row } from './csv';
import { sha256Hex } from './hash';
import { annualize, annualSeries, type Series } from './stats';
import type { DatasetMeta, Hint, Manifest, QuizItem, Rules } from './types';

export interface Stages {
  understand: { research_question: string; intro: string[]; concepts: { term: string; def: string }[]; data_structure: { dataset: string; description: string }; quiz: QuizItem[]; data_check: QuizItem };
  reproduce: { intro: string[]; steps: string[]; tasks: string[]; rounding: string };
  investigate: { intro: string[]; datasets: string[]; suggested_questions: string[]; required: string[] };
  prove: { intro: string[]; tasks: string[]; reflection: string };
}
export interface Paper { primary: { title: string; authors: string; year: number; venue: string; doi: string; url: string }; finding: { text: string; url: string }; related: { title: string; url: string }[] }
export interface LoadedDataset { meta: DatasetMeta; text: string; rows: Row[]; annual: Series; verified: boolean }
export interface Mission { base: string; manifest: Manifest; paper: Paper; stages: Stages; rules: Rules; hints: Hint[]; licenses: { items: { asset: string; license: string; attribution: string }[] }; data: Record<string, LoadedDataset> }
export interface IndexEntry { mission_id: string; title: string; subject: string; difficulty: string; summary: string; version: string; review_status: string; reproduction_level: string; estimated_duration: string; prerequisites: string[]; paper_url: string; data_bytes: number; requirements: string; reproduction_scope: string }

const MAX_BYTES = 5_000_000;
async function text(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const t = await r.text();
  if (t.length > MAX_BYTES) throw new Error(`${url}: exceeds size limit`);
  return t;
}
const json = async <T>(url: string): Promise<T> => JSON.parse(await text(url)) as T;

export const loadIndex = (root = 'missions') => json<{ missions: IndexEntry[] }>(`${root}/index.json`);

export async function loadMission(id: string, root = 'missions'): Promise<Mission> {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error('invalid mission id');
  const base = `${root}/${id}`;
  const manifest = await json<Manifest>(`${base}/manifest.json`);
  const [paper, understand, reproduce, investigate, prove, rules, hints, licenses] = await Promise.all([
    json<Paper>(`${base}/paper.json`), json<Stages['understand']>(`${base}/stages/understand.json`), json<Stages['reproduce']>(`${base}/stages/reproduce.json`),
    json<Stages['investigate']>(`${base}/stages/investigate.json`), json<Stages['prove']>(`${base}/stages/prove.json`), json<Rules>(`${base}/validation/rules.json`),
    json<{ hints: Hint[] }>(`${base}/hints/hints.json`), json<Mission['licenses']>(`${base}/licenses.json`),
  ]);
  const data: Record<string, LoadedDataset> = {};
  await Promise.all(manifest.datasets.map(async (meta) => {
    const t = await text(`${base}/${meta.file}`);
    const rows = parseCSV(t).rows;
    data[meta.id] = { meta, text: t, rows, annual: meta.frequency === 'monthly' ? annualize(rows, meta.value_col) : annualSeries(rows, meta.value_col), verified: (await sha256Hex(t)) === meta.sha256 };
  }));
  // Defence in depth: unapproved hints never leave the loader (FR-006).
  return { base, manifest, paper, stages: { understand, reproduce, investigate, prove }, rules, hints: hints.hints.filter((x) => x.status === 'approved'), licenses, data };
}
