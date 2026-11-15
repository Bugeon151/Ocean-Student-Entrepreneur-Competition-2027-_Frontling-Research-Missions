/** Renders docs/strategy-canvas.svg from public/strategy.json (single source of truth for the app and the pitch). */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;
const S = JSON.parse(readFileSync(`${ROOT}public/strategy.json`, 'utf8'));
const W = 1240, H = 600, L = 70, R = 360, T = 50, B = 150;
const n = S.factors.length, X = (i: number) => L + (i * (W - L - R)) / (n - 1), Y = (v: number) => T + (1 - v / 5) * (H - T - B);
const colors = ['#be185d', '#2563eb', '#0d9488', '#ca8a04', '#64748b'];
const dash = ['', '6 4', '2 4', '10 3 2 3', '4 2'];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="system-ui,sans-serif" font-size="13"><rect width="100%" height="100%" fill="#fff"/>
<text x="${L}" y="28" font-size="18" font-weight="700">Strategy Canvas — Frontling Research Missions</text>`;
for (let v = 0; v <= 5; v++) svg += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e5e7eb"/><text x="${L - 10}" y="${Y(v) + 4}" text-anchor="end" fill="#555">${v}</text>`;
S.factors.forEach((f: { label: string }, i: number) => { svg += `<text transform="translate(${X(i)},${H - B + 18}) rotate(28)" fill="#222">${esc(f.label)}</text>`; });
S.offerings.forEach((o: { name: string; highlight?: boolean; scores: Record<string, number | null> }, k: number) => {
  const pts = S.factors.map((f: { id: string }, i: number) => [i, o.scores[f.id]] as const);
  let d = '', pen = false;
  for (const [i, v] of pts) { if (v === null) { pen = false; continue; } d += `${pen ? 'L' : 'M'}${X(i)},${Y(v)}`; pen = true; }
  svg += `<path d="${d}" fill="none" stroke="${colors[k]}" stroke-width="${o.highlight ? 4 : 2}" stroke-dasharray="${dash[k]}"/>`;
  for (const [i, v] of pts) if (v !== null) svg += `<circle cx="${X(i)}" cy="${Y(v)}" r="${o.highlight ? 5 : 3.5}" fill="${colors[k]}"/>`;
  svg += `<line x1="${W - R + 20}" x2="${W - R + 50}" y1="${T + 10 + k * 26}" y2="${T + 10 + k * 26}" stroke="${colors[k]}" stroke-width="${o.highlight ? 4 : 2}" stroke-dasharray="${dash[k]}"/><text x="${W - R + 58}" y="${T + 14 + k * 26}" font-weight="${o.highlight ? 700 : 400}">${esc(o.name)}</text>`;
});
svg += `<text x="${W - R + 20}" y="${T + 10 + S.offerings.length * 26 + 12}" font-size="11" fill="#555">Gaps = not verifiable (not scored)</text></svg>`;
writeFileSync(`${ROOT}docs/strategy-canvas.svg`, svg);
writeFileSync(`${ROOT}public/strategy-canvas.svg`, svg);
console.log('wrote docs/strategy-canvas.svg');
