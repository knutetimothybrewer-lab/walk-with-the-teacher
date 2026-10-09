// Tiny dependency-free SVG charts.  Each chart has a text alternative and can also be shown as a table.
import { h } from './util.js';
const NS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs, ...kids) {
  const el = document.createElementNS(NS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  kids.flat().forEach((k) => { if (k != null) el.append(k instanceof Node ? k : document.createTextNode(String(k))); });
  return el;
}
const niceMax = (v) => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
const W = 560, H = 260, M = { l: 48, r: 16, t: 16, b: 40 };

/** bars: [{label, value, color?}], opts {max, unit, title, ref:{value,label}, alt} */
export function barChart(bars, opts = {}) {
  const max = opts.max || niceMax(Math.max(...bars.map((b) => b.value), opts.ref ? opts.ref.value : 0));
  const pw = W - M.l - M.r, ph = H - M.t - M.b, bw = Math.min(56, pw / bars.length * 0.62);
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': opts.alt || opts.title || 'Bar chart' });
  for (let i = 0; i <= 4; i++) {
    const y = M.t + ph - (ph * i) / 4, v = (max * i) / 4;
    root.append(svg('line', { x1: M.l, x2: W - M.r, y1: y, y2: y, class: 'grid' }), svg('text', { x: M.l - 6, y: y + 4, class: 'ax', 'text-anchor': 'end' }, fmtTick(v) + (opts.unit || '')));
  }
  bars.forEach((b, i) => {
    const x = M.l + (pw / bars.length) * (i + 0.5) - bw / 2, hh = Math.max(0, (ph * b.value) / max), y = M.t + ph - hh;
    const rect = svg('rect', { x, y: M.t + ph, width: bw, height: 0, rx: 4, class: 'bar-r', fill: b.color || 'var(--accent)' });
    root.append(rect, svg('text', { x: x + bw / 2, y: H - 14, class: 'ax', 'text-anchor': 'middle' }, b.label), svg('text', { x: x + bw / 2, y: y - 5, class: 'val', 'text-anchor': 'middle' }, fmtTick(b.value) + (opts.unit || '')));
    requestAnimationFrame(() => { rect.style.transition = 'y .7s cubic-bezier(.2,.8,.2,1), height .7s cubic-bezier(.2,.8,.2,1)'; rect.setAttribute('y', y); rect.setAttribute('height', hh); });
  });
  if (opts.ref) { const y = M.t + ph - (ph * opts.ref.value) / max; root.append(svg('line', { x1: M.l, x2: W - M.r, y1: y, y2: y, class: 'ref' }), svg('text', { x: W - M.r - 2, y: y - 5, class: 'ax', 'text-anchor': 'end' }, opts.ref.label)); }
  return wrapChart(root, opts, bars.map((b) => [b.label, b.value]));
}

/** lines: [{name, color, points:[[x,y],...], dash?}], opts {xmax, ymin, ymax, xlabel, ylabel, ref} */
export function lineChart(lines, opts = {}) {
  const all = lines.flatMap((l) => l.points);
  const xmax = opts.xmax || Math.max(...all.map((p) => p[0]), 1);
  const ymin = opts.ymin != null ? opts.ymin : Math.min(0, ...all.map((p) => p[1]));
  const ymax = opts.ymax != null ? opts.ymax : Math.max(...all.map((p) => p[1]), ymin + 1);
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const X = (x) => M.l + (pw * x) / xmax, Y = (y) => M.t + ph - (ph * (y - ymin)) / (ymax - ymin || 1);
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': opts.alt || opts.title || 'Line chart' });
  for (let i = 0; i <= 4; i++) { const v = ymin + ((ymax - ymin) * i) / 4, y = Y(v); root.append(svg('line', { x1: M.l, x2: W - M.r, y1: y, y2: y, class: 'grid' }), svg('text', { x: M.l - 6, y: y + 4, class: 'ax', 'text-anchor': 'end' }, fmtTick(v) + (opts.yunit || ''))); }
  for (let i = 0; i <= 4; i++) { const v = (xmax * i) / 4; root.append(svg('text', { x: X(v), y: H - 18, class: 'ax', 'text-anchor': 'middle' }, fmtTick(v))); }
  if (opts.xlabel) root.append(svg('text', { x: M.l + pw / 2, y: H - 2, class: 'ax', 'text-anchor': 'middle' }, opts.xlabel));
  if (opts.refY != null) root.append(svg('line', { x1: M.l, x2: W - M.r, y1: Y(opts.refY), y2: Y(opts.refY), class: 'ref' }), svg('text', { x: W - M.r - 2, y: Y(opts.refY) - 5, class: 'ax', 'text-anchor': 'end' }, opts.refLabel || ''));
  lines.forEach((l) => {
    const d = l.points.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
    const path = svg('path', { d, class: 'line', fill: 'none', stroke: l.color || 'var(--accent)', 'stroke-width': 2.5, 'stroke-dasharray': l.dash || null, 'stroke-linejoin': 'round' });
    root.append(path);
    try { const len = path.getTotalLength(); if (!l.dash && !opts.noAnim) { path.style.strokeDasharray = len; path.style.strokeDashoffset = len; path.getBoundingClientRect(); path.style.transition = 'stroke-dashoffset .9s ease'; requestAnimationFrame(() => { path.style.strokeDashoffset = 0; }); } } catch { /* getTotalLength unsupported */ }
  });
  const legend = h('div', { class: 'legend' }, lines.filter((l) => l.name).map((l) => h('span', null, h('i', { style: `background:${l.color || 'var(--accent)'}` }), l.name)));
  const box = wrapChart(root, opts, null, legend);
  return box;
}

function wrapChart(root, opts, rows, legend) {
  const box = h('figure', { class: 'chartbox' }, opts.title ? h('figcaption', null, opts.title) : null, root, legend || null);
  if (rows) {
    const t = h('details', { class: 'chart-data' }, h('summary', null, 'View as a table'), h('table', { class: 'b-table' }, h('tbody', null, rows.map((r) => h('tr', null, h('th', { scope: 'row' }, String(r[0])), h('td', { class: 'num' }, String(r[1])))))));
    box.append(t);
  }
  return box;
}
function fmtTick(v) { return Math.abs(v) >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : (Math.round(v * 100) / 100).toString(); }
