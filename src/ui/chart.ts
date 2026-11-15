import { s } from './dom';
import type { Point } from '../core/stats';

export interface ChartOpts { title: string; yLabel: string; highlight?: [number, number]; line?: { slope: number; intercept: number; from: number; to: number } }
/** Dependency-free accessible SVG line chart. */
export function lineChart(pts: Point[], o: ChartOpts): SVGElement {
  const W = 720, H = 300, L = 56, R = 16, T = 24, B = 40;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.08 || 1; y0 -= pad; y1 += pad;
  const X = (x: number) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const Y = (y: number) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${o.title}. ${pts.length} points from ${x0} to ${Math.round(x1)}.`, class: 'chart' });
  svg.appendChild(s('title', {}, o.title));
  if (o.highlight) svg.appendChild(s('rect', { x: X(o.highlight[0]), y: T, width: Math.max(2, X(o.highlight[1]) - X(o.highlight[0])), height: H - T - B, class: 'hl' }));
  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const yv = y0 + ((y1 - y0) * i) / ticks;
    svg.appendChild(s('line', { x1: L, x2: W - R, y1: Y(yv), y2: Y(yv), class: 'grid' }));
    svg.appendChild(s('text', { x: L - 6, y: Y(yv) + 4, 'text-anchor': 'end', class: 'tick' }, yv.toFixed(Math.abs(y1 - y0) < 5 ? 2 : 0)));
  }
  const step = Math.ceil((x1 - x0) / 8 / 10) * 10 || 1;
  for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) svg.appendChild(s('text', { x: X(x), y: H - B + 18, 'text-anchor': 'middle', class: 'tick' }, String(x)));
  svg.appendChild(s('path', { d: pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(''), class: 'series' }));
  if (o.line) {
    const { slope, intercept, from, to } = o.line;
    svg.appendChild(s('line', { x1: X(from), y1: Y(slope * from + intercept), x2: X(to), y2: Y(slope * to + intercept), class: 'trend' }));
  }
  svg.appendChild(s('text', { x: 14, y: T + (H - T - B) / 2, transform: `rotate(-90 14 ${T + (H - T - B) / 2})`, 'text-anchor': 'middle', class: 'axis' }, o.yLabel));
  return svg;
}
