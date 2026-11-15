type Child = Node | string | number | false | null | undefined | Child[];
type Attrs = Record<string, string | number | boolean | EventListener | undefined | null>;
/** Tiny hyperscript. Strings are always inserted as text nodes (never HTML) — pack content cannot inject markup. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'value' && 'value' in el) (el as HTMLInputElement).value = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, kids);
  return el;
}
function append(el: Node, kids: Child[]) {
  for (const k of kids.flat(Infinity as 1) as Child[]) {
    if (k === null || k === undefined || k === false) continue;
    el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
export const svgNS = 'http://www.w3.org/2000/svg';
export function s(tag: string, attrs: Record<string, string | number> = {}, ...kids: (Node | string)[]): SVGElement {
  const el = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  kids.forEach((k) => el.appendChild(typeof k === 'string' ? document.createTextNode(k) : k));
  return el;
}
export const fmt = (x: number, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : '—');
