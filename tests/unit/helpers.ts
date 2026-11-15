import { readFileSync } from 'node:fs';
import { join } from 'node:path';
export const ROOT = new URL('../..', import.meta.url).pathname;
export const readJ = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
/** fetch() backed by the built public/ directory, so the browser loader runs unchanged in Node. */
export function fsFetch(): typeof fetch {
  return (async (url: string) => {
    try { const body = readFileSync(join(ROOT, 'public', String(url))); return new Response(body, { status: 200 }); }
    catch { return new Response('not found', { status: 404 }); }
  }) as unknown as typeof fetch;
}
