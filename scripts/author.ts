/** Mission authoring CLI (FR-011).
 *  npm run author -- discover "global temperature anomaly"
 *  npm run author -- scaffold <mission-id> <doi>
 *  npm run author -- draft <mission-id> "<reproduction scope>"     (needs ANTHROPIC_API_KEY; output is always DRAFT)
 *  npm run author -- approve <mission-id> "<Reviewer Name>" [--all-hints] [--domain]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT, aiDraft, approve, discover, draftPrompt, lookupDOI, scaffold } from './authoring-lib';

const [cmd, a, b, ...rest] = process.argv.slice(2);
const out = (x: unknown) => console.log(typeof x === 'string' ? x : JSON.stringify(x, null, 2));
try {
  if (cmd === 'discover' && a) {
    const cs = await discover(a);
    out(cs.map((c) => `${c.cited_by.toString().padStart(6)}  ${c.year}  ${c.is_oa ? 'OA' : '--'}  ${c.license ?? '?'}  doi:${c.doi}  ${c.title}`).join('\n'));
  } else if (cmd === 'scaffold' && a && b) {
    out(`created ${scaffold(a, await lookupDOI(b))} (status DRAFT — not published until approved)`);
  } else if (cmd === 'draft' && a) {
    const paper = JSON.parse(readFileSync(join(CONTENT, a, 'paper.json'), 'utf8')).primary;
    const cand = { doi: paper.doi, title: paper.title, year: paper.year, venue: paper.venue, authors: paper.authors, is_oa: true, oa_url: null, license: null, cited_by: 0 };
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) { const p = join(CONTENT, a, 'review/draft-prompt.txt'); writeFileSync(p, draftPrompt(cand, b ?? '')); out(`ANTHROPIC_API_KEY not set — prompt written to ${p}`); }
    else { const d = await aiDraft(cand, b ?? '', key); const p = join(CONTENT, a, 'review/ai-draft.json'); writeFileSync(p, JSON.stringify(d, null, 2)); out(`AI draft written to ${p} (${d.hints.length} hints, all status "draft"). Review, move into stages/ and hints/, then approve.`); }
  } else if (cmd === 'approve' && a && b) {
    out(`status → ${approve(a, b, { hintIds: rest.includes('--all-hints') ? 'all' : [], domain: rest.includes('--domain') })}. Run "npm run build" to publish through the release gate.`);
  } else {
    out('usage: author discover <query> | scaffold <id> <doi> | draft <id> "<scope>" | approve <id> "<reviewer>" [--all-hints] [--domain]');
    process.exit(cmd ? 1 : 0);
  }
} catch (e) { console.error(`error: ${(e as Error).message}`); process.exit(1); }
