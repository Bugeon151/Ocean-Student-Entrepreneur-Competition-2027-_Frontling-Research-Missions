export type Row = Record<string, string>;
/** Minimal RFC4180-subset parser: comma separated, no quoted commas (mission data is numeric). */
export function parseCSV(text: string): { header: string[]; rows: Row[] } {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  const header = lines[0].split(',').map((s) => s.trim());
  const rows = lines.slice(1).map((l) => {
    const c = l.split(',');
    const r: Row = {};
    header.forEach((h, i) => (r[h] = (c[i] ?? '').trim()));
    return r;
  });
  return { header, rows };
}
export function toCSV(header: string[], rows: (string | number)[][]): string {
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n';
}
