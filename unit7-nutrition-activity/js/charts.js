// Dependency-free, animated, accessible SVG bar charts with a data-table alternative.
import { h, reducedMotion } from './util.js';
import { sourceById } from './sources.js';

const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };

// ---- datasets (published figures; see docs/SOURCES.md) ----
export const CHARTS = {
  produce: {
    title: 'High school students meeting federal fruit and vegetable recommendations, 2017', unit: '%', yMax: 100, decimals: 1,
    desc: 'Bar chart. 7.1 percent of U.S. high school students met the federal recommendation for fruit and 2.0 percent met the recommendation for vegetables.',
    groups: [{ label: 'Fruit', bars: [{ label: 'Met recommendation', value: 7.1, color: '#ff7a6b' }] }, { label: 'Vegetables', bars: [{ label: 'Met recommendation', value: 2.0, color: '#67d27a' }] }],
    yLabel: 'Percent of students', src: ['mmwr-fv'], note: 'Self-reported intake from a national survey (YRBS 2017).'
  },
  activity: {
    title: 'High school students active for 60 minutes on all 7 days', unit: '%', yMax: 50, decimals: 0,
    desc: 'Bar chart. About 27 percent of students in 2013 and about 25 percent in 2023 were active 60 minutes on all 7 days. In 2023, 17 percent of females and 32 percent of males met the guideline.',
    groups: [{ label: '2013 (all students)', bars: [{ label: 'All', value: 27, color: '#7aa8ff' }] }, { label: '2023 (all students)', bars: [{ label: 'All', value: 25, color: '#ffb347' }] }, { label: '2023 females', bars: [{ label: 'Females', value: 17, color: '#ff7aa8' }] }, { label: '2023 males', bars: [{ label: 'Males', value: 32, color: '#5bd1c7' }] }],
    yLabel: 'Percent of students', src: ['yrbs-pa'], note: 'Rounded to the nearest whole percent. Self-reported survey data.'
  },
  insecurity: {
    title: 'U.S. households that were food insecure', unit: '%', yMax: 20, decimals: 1,
    desc: 'Bar chart. The share of U.S. households that were food insecure was 10.2 percent in 2021, 12.8 percent in 2022 and 13.5 percent in 2023.',
    groups: [{ label: '2021', bars: [{ label: 'Households', value: 10.2, color: '#c7a24a' }] }, { label: '2022', bars: [{ label: 'Households', value: 12.8, color: '#d88a3a' }] }, { label: '2023', bars: [{ label: 'Households', value: 13.5, color: '#e0662b' }] }],
    yLabel: 'Percent of households', src: ['ers-fs'], note: 'Food insecurity means limited or uncertain access to enough food because of a lack of money or other resources.'
  },
  upf: {
    title: 'Share of U.S. youth calories (ages 2 to 19) by level of food processing', unit: '%', yMax: 100, decimals: 1,
    desc: 'Grouped bar chart. Ultra-processed foods supplied about 61 percent of youth calories in 1999 and about 67 percent in 2018. Unprocessed or minimally processed foods fell from 28.8 percent to 23.5 percent.',
    groups: [{ label: 'Ultra-processed foods', bars: [{ label: '1999', value: 61, color: '#8aa0c8' }, { label: '2018', value: 67, color: '#e0662b' }] }, { label: 'Unprocessed or minimally processed', bars: [{ label: '1999', value: 28.8, color: '#8aa0c8' }, { label: '2018', value: 23.5, color: '#e0662b' }] }],
    yLabel: 'Percent of calories', src: ['jama-upf', 'nih-upf'], note: 'NHANES 24-hour dietary recalls. Ultra-processed is a broad category based on the NOVA system; it includes some foods with better nutrition than others.'
  }
};

const fmtV = (def, v) => Number(v).toFixed(def.decimals ?? 0) + (def.unit === '%' ? '%' : '');

/** Renders a chart into a new element. Returns the element. */
export function chartEl(def, { onSources } = {}) {
  const totalBars = def.groups.reduce((a, g) => a + g.bars.length, 0), many = totalBars > 10;
  const W = many ? 860 : 640, H = 330, M = { l: 62, r: 16, t: 20, b: def.groups.some((g) => g.label.length > 18) ? 74 : 54 };
  const root = h('figure.chartbox', { 'aria-label': def.title });
  const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': def.desc });
  const Y = (v) => H - M.b - (v / def.yMax) * (H - M.t - M.b);
  const grid = S('g', { class: 'grid' }, svg), axis = S('g', { class: 'axis' }, svg);
  const step = def.yMax <= 20 ? 5 : def.yMax <= 50 ? 10 : 25;
  for (let y = 0; y <= def.yMax; y += step) {
    S('line', { x1: M.l, x2: W - M.r, y1: Y(y), y2: Y(y) }, grid);
    S('text', { x: M.l - 8, y: Y(y) + 4, 'text-anchor': 'end' }, axis).textContent = y + (def.unit === '%' ? '%' : '');
  }
  S('text', { transform: `translate(15 ${(M.t + H - M.b) / 2}) rotate(-90)`, 'text-anchor': 'middle', style: 'fill:var(--ink-dim);font-size:13px' }, axis).textContent = def.yLabel;
  const nG = def.groups.length, gw = (W - M.l - M.r) / nG, bars = [];
  const live = h('div.sr-only', { 'aria-live': 'polite' });
  def.groups.forEach((g, gi) => {
    const nb = g.bars.length, bw = Math.min(70, (gw * 0.72) / nb), x0 = M.l + gi * gw + (gw - bw * nb - (nb - 1) * 6) / 2;
    const tx = S('text', { x: M.l + gi * gw + gw / 2, y: H - M.b + 22, 'text-anchor': 'middle' }, axis);
    const words = g.label.split(' '); let line = '', lines = [];
    words.forEach((w) => { if ((line + ' ' + w).length > 18 && line) { lines.push(line); line = w; } else line = (line + ' ' + w).trim(); }); lines.push(line);
    lines.forEach((ln, i) => { const t = S('tspan', { x: M.l + gi * gw + gw / 2, dy: i ? 16 : 0 }, tx); t.textContent = ln; });
    g.bars.forEach((b, bi) => {
      const x = x0 + bi * (bw + 6), bar = S('rect', { x, y: Y(0), width: bw, height: 0, rx: 5, fill: b.color, class: 'bar', tabindex: 0, role: 'img', 'aria-label': `${g.label}${nb > 1 ? ', ' + b.label : ''}: ${fmtV(def, b.value)}` }, svg);
      const val = S('text', { x: x + bw / 2, y: Y(0) - 6, 'text-anchor': 'middle', class: 'barval', style: 'opacity:0' + (many ? ';font-size:10.5px' : '') }, svg); val.textContent = many ? Math.round(b.value) + (def.unit === '%' ? '%' : '') : fmtV(def, b.value);
      if (nb > 1 && !many) { const lg = S('text', { x: x + bw / 2, y: Y(0) - 8, 'text-anchor': 'middle', style: 'fill:#fff;font-size:12px;font-weight:700;pointer-events:none;paint-order:stroke;stroke:rgba(0,0,0,.45);stroke-width:3px' }, svg); lg.textContent = b.label; lg.setAttribute('opacity', '0'); bars.push({ lg }); }
      bars.push({ bar, val, b });
      const say = () => { live.textContent = bar.getAttribute('aria-label'); bar.classList.add('hl'); };
      bar.addEventListener('focus', say); bar.addEventListener('blur', () => bar.classList.remove('hl'));
      bar.addEventListener('pointerenter', () => bar.classList.add('hl')); bar.addEventListener('pointerleave', () => bar.classList.remove('hl'));
    });
  });
  let animated = false;
  const animate = () => {
    if (animated) return; animated = true;
    const quick = reducedMotion();
    bars.forEach((o) => {
      if (o.lg) { o.lg.setAttribute('opacity', '1'); return; }
      const hh = (H - M.b) - Y(o.b.value), y = Y(o.b.value);
      if (quick) { o.bar.setAttribute('y', y); o.bar.setAttribute('height', hh); o.val.setAttribute('y', y - 6); o.val.style.opacity = 1; return; }
      o.bar.style.transition = 'y 1s cubic-bezier(.2,.8,.2,1), height 1s cubic-bezier(.2,.8,.2,1)';
      requestAnimationFrame(() => { o.bar.setAttribute('y', y); o.bar.setAttribute('height', hh); o.val.setAttribute('y', y - 6); o.val.style.transition = 'opacity .6s .6s'; o.val.style.opacity = 1; });
    });
  };
  const legend = def.groups.some((g) => g.bars.length > 1) ? h('div.legend', def.groups[0].bars.map((b) => h('span', h('i', { style: { background: b.color } }), b.label))) : '';
  const table = h('details.datatable', h('summary', 'View the data as a table'), h('table.data', h('caption', def.title), h('thead', h('tr', h('th', 'Group'), h('th', 'Category'), h('th', 'Value'))),
    h('tbody', def.groups.flatMap((g) => g.bars.map((b) => h('tr', h('td', g.label), h('td', b.label), h('td', fmtV(def, b.value))))))));
  const srcs = (def.src || []).map((id) => sourceById[id]).filter(Boolean);
  root.append(h('figcaption', def.title), legend, svg, live, table,
    h('p.small.muted.chart-note', def.note || '', srcs.length ? ' Source: ' : '', srcs.map((s, i) => [i ? '; ' : '', h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.org)])));
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); animate(); } }, { threshold: 0.3 }) : null;
  if (io) { io.observe(root); setTimeout(animate, 2500); } else animate();
  return root;
}
