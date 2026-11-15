/** FR-011 authoring tool. Network is mocked; real OpenAlex/Anthropic calls are not made in tests. */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aiDraft, approve, discover, sanitizeDraft, scaffold, screen, toCandidate, type Candidate } from '../../scripts/authoring-lib';

const work = { doi: 'https://doi.org/10.1/x', display_name: 'A paper', publication_year: 2020, primary_location: { source: { display_name: 'J' }, license: 'cc-by' }, authorships: [{ author: { display_name: 'A. B' } }], open_access: { is_oa: true, oa_url: 'u' }, cited_by_count: 5 };
const cand: Candidate = toCandidate(work);
const mock = (body: unknown, ok = true) => (async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 })) as unknown as typeof fetch;

describe('authoring (FR-011)', () => {
  it('maps OpenAlex works and discovers with OA+DOI filter', async () => {
    expect(cand).toMatchObject({ doi: '10.1/x', title: 'A paper', is_oa: true, license: 'cc-by', authors: 'A. B' });
    let url = '';
    const f = (async (u: string) => { url = u; return new Response(JSON.stringify({ results: [work] })); }) as unknown as typeof fetch;
    expect((await discover('co2', f))[0].doi).toBe('10.1/x');
    expect(url).toContain('is_oa:true');
    await expect(discover('x', mock({}, false))).rejects.toThrow('OpenAlex HTTP 500');
  });
  it('eligibility screen implements PRD §10.1 exclusions', () => {
    const ok = screen({ candidate: cand, data_url: 'u', data_license: 'CC-BY-4.0', data_bytes: 1000, method_clear: true, reference_computable: true, minors_safe: true });
    expect(ok).toEqual({ eligible: true, reasons: [] });
    const bad = screen({ candidate: { ...cand, is_oa: false, doi: '' }, data_license: 'proprietary', data_bytes: 9e6, method_clear: false, reference_computable: false, minors_safe: false });
    expect(bad.eligible).toBe(false);
    expect(bad.reasons).toHaveLength(8);
  });
  it('scaffold creates a complete DRAFT skeleton and refuses to overwrite', () => {
    const root = mkdtempSync(join(tmpdir(), 'fr-'));
    const dir = scaffold('new-mission', cand, root);
    for (const f of ['mission.json', 'paper.json', 'licenses.json', 'stages/understand.json', 'stages/reproduce.json', 'stages/investigate.json', 'stages/prove.json', 'hints/hints.json', 'validation/rules.src.json', 'review/checklist.json', 'review/approval.json'])
      expect(() => readFileSync(join(dir, f))).not.toThrow();
    expect(JSON.parse(readFileSync(join(dir, 'review/approval.json'), 'utf8')).status).toBe('DRAFT');
    expect(() => scaffold('new-mission', cand, root)).toThrow('already exists');
    expect(() => scaffold('Bad ID', cand, root)).toThrow();
  });
  it('AI output is always forced to draft and malformed hints are dropped', async () => {
    const raw = 'Sure!\n{"understand":{"research_question":"q"},"reproduce":{"steps":[]},"hints":[{"task":"t","level":1,"text":"x","status":"approved"},{"task":"t","level":7,"text":"bad"},{"oops":1}]}';
    const d = sanitizeDraft(raw);
    expect(d.hints).toHaveLength(1);
    expect(d.hints[0].status).toBe('draft');
    expect(() => sanitizeDraft('no json')).toThrow();
    const f = mock({ content: [{ type: 'text', text: raw }] });
    expect((await aiDraft(cand, 'scope', 'k', f)).hints.every((h) => h.status === 'draft')).toBe(true);
  });
  it('approval requires a named reviewer; domain review only when explicit', () => {
    const root = mkdtempSync(join(tmpdir(), 'fr-'));
    const dir = scaffold('m-two', cand, root);
    const hp = join(dir, 'hints/hints.json');
    writeFileSync(hp, JSON.stringify({ hints: [{ id: 'h1', task: 't', branch: 'generic', level: 1, text: 'x', status: 'draft' }] }));
    expect(() => approve('m-two', ' ', {}, root)).toThrow();
    expect(approve('m-two', 'Teacher A', { hintIds: 'all', date: '2026-11-15' }, root)).toBe('INTERNAL_REVIEWED');
    expect(JSON.parse(readFileSync(hp, 'utf8')).hints[0]).toMatchObject({ status: 'approved', reviewed_by: 'Teacher A' });
    expect(approve('m-two', 'Dr. C', { domain: true, date: '2026-11-15' }, root)).toBe('DOMAIN_REVIEWED');
  });
});
