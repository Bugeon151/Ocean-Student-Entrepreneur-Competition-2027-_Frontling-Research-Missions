export type ResultCode = 'VALID' | 'OUT_OF_RANGE' | 'FORMAT_ERROR' | 'METHOD_MISMATCH' | 'INCOMPLETE';
export type ReviewStatus = 'DRAFT' | 'INTERNAL_REVIEWED' | 'DOMAIN_REVIEWED' | 'RELEASED' | 'DEPRECATED';
export type StageId = 'understand' | 'reproduce' | 'investigate' | 'prove';
export const STAGES: StageId[] = ['understand', 'reproduce', 'investigate', 'prove'];

export type ComputeSpec =
  | { op: 'annual_mean'; year: number }
  | { op: 'trend_per_decade'; start: number; end: number }
  | { op: 'pct_change'; from: number; to: number }
  | { op: 'mean_growth'; start: number; end: number }
  | { op: 'monthly_trend_per_decade'; start: number; end: number };

export interface DatasetMeta {
  id: string; file: string; title: string; frequency: 'monthly' | 'annual';
  columns: string[]; value_col: string; unit: string; source: string; sha256: string; rows: number; bytes: number;
}
export interface MethodField { key: string; label: string; type: 'select' | 'number'; options?: string[]; expected: string }
export interface Signature { code: string; value: number; tolerance?: number }
export interface TaskRule {
  id: string; stage: 'reproduce' | 'prove'; label: string; prompt: string; unit: string; dataset: string;
  compute: ComputeSpec; expected: number; tolerance: number; min_decimals: number;
  method: MethodField[]; signatures: Signature[]; published?: { value: number; text: string; url: string };
}
export interface Rules { validation_version: string; rounding: string; tasks: TaskRule[] }
export interface ValidationInput { value: string; method: Record<string, string> }
export interface ValidationResult {
  code: ResultCode; diagnosis: string; task: string; message: string; fields?: string[]; value?: number;
}
export interface Hint { id: string; task: string; branch: string; level: 1 | 2 | 3; text: string; status: 'approved' | 'draft'; reviewed_by?: string }
export interface QuizItem { id: string; q: string; options: string[]; answer: number; feedback: Record<string, string> }
export interface Manifest {
  mission_id: string; version: string; title: string; subject: string; difficulty: string; summary: string;
  source_doi: string; paper_url: string; dataset_source: string; dataset_version: string; license: string;
  estimated_duration: string; prerequisites: string[]; reproduction_scope: string; reproduction_level: 'R0' | 'R1' | 'R2';
  validation_version: string; review_status: ReviewStatus; review_scope: string[]; content_hash: string;
  requirements: string; datasets: DatasetMeta[]; files: Record<string, string>;
}
