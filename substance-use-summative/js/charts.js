// Dependency-free interactive SVG charts: hover/keyboard readout, series toggles, year comparison,
// predict-then-reveal, shaded bands and reference lines. Used for tobacco trends, the BAC model and more.
import { h, reducedMotion } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };

// ---------- chart data (all values are published public-health figures; see docs/SOURCES.md) ----------
export const CHARTS = {
  adult: {
    title: 'Adult cigarette smoking in the United States, 1965 to 2022',
    desc: 'Line chart. The percent of U.S. adults who currently smoke cigarettes falls from about 42 percent in 1965 to about 12 percent in 2022.',
    xLabel: 'Year', yLabel: 'Percent of adults', unit: '%', yDomain: [0, 50], xTicks: [1965, 1975, 1985, 1995, 2005, 2015, 2022],
    decimals: 0, approx: true,
    series: [{ id: 'adult', label: 'Adults (18+) who currently smoke cigarettes', color: '#6fe0d2', area: true,
      points: [[1965, 42], [1974, 37], [1985, 30], [1990, 25], [2000, 23], [2005, 21], [2010, 19], [2015, 15], [2019, 14], [2022, 12]] }],
    annotations: [{ x: 1997, text: 'NHIS survey redesigned (1997)' }],
    note: 'Selected years, rounded to the nearest whole percent. Source: CDC National Center for Health Statistics, National Health Interview Survey. Comparisons across the 1997 redesign should be made with caution.'
  },
  youth: {
    title: 'High school students: current cigarette and e-cigarette use, 2011 to 2024',
    desc: 'Line chart with two lines. Cigarette use falls from 15.8 percent in 2011 to 1.7 percent in 2024. E-cigarette use rises from 1.5 percent in 2011 to a peak of 27.5 percent in 2019, then falls to 7.8 percent in 2024.',
    xLabel: 'Survey year', yLabel: 'Percent of high school students (past 30 days)', unit: '%', yDomain: [0, 30], xTicks: [2011, 2014, 2017, 2019, 2021, 2024], decimals: 1,
    series: [
      { id: 'ecig', label: 'E-cigarettes', color: '#ff9d57', dash: '', points: [[2011, 1.5], [2014, 13.4], [2015, 16.0], [2017, 11.7], [2018, 20.8], [2019, 27.5], [2020, 19.6], [2021, 11.3], [2022, 14.1], [2023, 10.0], [2024, 7.8]] },
      { id: 'cig', label: 'Cigarettes', color: '#7cc4ff', dash: '8 5', points: [[2011, 15.8], [2014, 9.2], [2017, 7.6], [2018, 8.1], [2019, 5.8], [2020, 4.6], [2021, 1.9], [2022, 2.0], [2023, 1.9], [2024, 1.7]] }
    ],
    annotations: [{ x: 2020.5, text: 'Survey methods changed (COVID-19)' }],
    note: 'Selected survey years. Source: CDC and FDA, National Youth Tobacco Survey. Data collection in 2020 and 2021 was affected by COVID-19, so comparisons across those years need caution.'
  },
  youthMini: {
    title: 'High school e-cigarette use, selected years', compact: true,
    desc: 'Line chart. High school e-cigarette use rises to 27.5 percent in 2019 and falls to 7.8 percent in 2024.',
    xLabel: 'Survey year', yLabel: 'Percent of students', unit: '%', yDomain: [0, 30], xTicks: [2014, 2019, 2024], decimals: 1,
    series: [{ id: 'ecig', label: 'E-cigarettes (HS)', color: '#c75a00', points: [[2014, 13.4], [2017, 11.7], [2018, 20.8], [2019, 27.5], [2021, 11.3], [2022, 14.1], [2023, 10.0], [2024, 7.8]] }]
  },
  route: {
    title: 'Illustration: strength of effects over time, by how cannabis is taken',
    desc: 'Illustration, not measured data. The inhaled line rises within minutes and fades within a few hours. The eaten line rises slowly after 30 to 120 minutes and stays high for much longer.',
    xLabel: 'Time after use (minutes)', yLabel: 'Relative strength of effects (illustration)', unit: '', yDomain: [0, 100], xTicks: [0, 60, 120, 180, 240, 300, 360], decimals: 0, hideY: true, schematic: true,
    series: [
      { id: 'inh', label: 'Inhaled', color: '#8ad896', points: [[0, 0], [5, 55], [15, 80], [30, 70], [60, 45], [90, 28], [120, 15], [180, 6], [240, 2], [360, 0]], smooth: true },
      { id: 'eat', label: 'Eaten (edible)', color: '#f0a37a', dash: '8 5', points: [[0, 0], [30, 2], [60, 12], [90, 40], [120, 70], [150, 82], [180, 78], [240, 60], [300, 38], [360, 22]], smooth: true }
    ],
    annotations: [{ x: 40, text: 'Edible: nothing felt yet' }],
    note: 'A simplified illustration. Timing and strength vary a lot from person to person and product to product.'
  }
};

const W = 640, H = 340, M = { l: 58, r: 18, t: 16, b: 56 };
const niceStep = (max) => (max <= 12 ? 2 : max <= 30 ? 5 : max <= 60 ? 10 : 20);

export function createChart(host, def, opts = {}) {
  let hideAfter = opts.hideAfter ?? null;
  const visible = new Set(def.series.map((s) => s.id));
  let cursorX = null, compare = { on: false, a: null, b: null };
  const root = h('div.chartbox');
  const live = h('div.sr-only', { 'aria-live': 'polite' });
  const tip = h('div.chart-tip');
  const legend = h('div.legend', { role: 'group', 'aria-label': 'Show or hide data lines' });
  const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': def.desc, tabindex: opts.noKeys ? '-1' : '0' });
  const cmpBox = h('div.cmp', { hidden: true, 'aria-live': 'polite' });
  const tableWrap = h('div', { hidden: true });
  root.append(svg, tip, live);
  host.append(def.series.length > 1 && !opts.noLegend ? legend : '', root, cmpBox);

  const allX = () => [...new Set(def.series.filter((s) => visible.has(s.id)).flatMap((s) => s.points.map((p) => p[0])))].filter((x) => hideAfter == null || x <= hideAfter).sort((a, b) => a - b);
  const xs = def.series.flatMap((s) => s.points.map((p) => p[0]));
  const xmin = def.xDomain ? def.xDomain[0] : Math.min(...xs), xmax = def.xDomain ? def.xDomain[1] : Math.max(...xs);
  const [ymin, ymax] = def.yDomain;
  const X = (x) => M.l + ((x - xmin) / (xmax - xmin)) * (W - M.l - M.r);
  const Y = (y) => H - M.b - ((y - ymin) / (ymax - ymin)) * (H - M.t - M.b);
  const fmt = (v, s) => (def.unit === '%' ? Number(v).toFixed(def.decimals ?? 0) + '%' : def.hideY ? '' : String(Math.round(v * 1000) / 1000));
  const valAt = (s, x) => { const p = s.points.find((q) => q[0] === x); return p ? p[1] : null; };

  function pathFor(s, pts) {
    if (!pts.length) return '';
    if (!s.smooth) return pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
    let d = `M${X(pts[0][0]).toFixed(1)} ${Y(pts[0][1]).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) { const p0 = pts[i - 1], p1 = pts[i], cx = (X(p0[0]) + X(p1[0])) / 2; d += ` C${cx.toFixed(1)} ${Y(p0[1]).toFixed(1)} ${cx.toFixed(1)} ${Y(p1[1]).toFixed(1)} ${X(p1[0]).toFixed(1)} ${Y(p1[1]).toFixed(1)}`; }
    return d;
  }

  function draw(animate = false) {
    svg.innerHTML = '';
    const grid = S('g', { class: 'grid' }, svg), axis = S('g', { class: 'axis' }, svg);
    const step = def.yStep || niceStep(ymax - ymin);
    for (let y = ymin; y <= ymax + 1e-9; y = Math.round((y + step) * 1e6) / 1e6) {
      S('line', { x1: M.l, x2: W - M.r, y1: Y(y), y2: Y(y) }, grid);
      if (!def.hideY) S('text', { x: M.l - 8, y: Y(y) + 4, 'text-anchor': 'end' }, axis).textContent = def.yFmt ? def.yFmt(y) : y + (def.unit === '%' ? '%' : '');
    }
    S('line', { x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b }, axis); S('line', { x1: M.l, x2: M.l, y1: M.t, y2: H - M.b }, axis);
    (def.xTicks || []).forEach((x) => { S('line', { x1: X(x), x2: X(x), y1: H - M.b, y2: H - M.b + 5 }, axis); S('text', { x: X(x), y: H - M.b + 20, 'text-anchor': 'middle' }, axis).textContent = x; });
    S('text', { x: (M.l + W - M.r) / 2, y: H - 8, 'text-anchor': 'middle', style: 'fill:var(--ink-dim);font-size:14px' }, axis).textContent = def.xLabel;
    const yl = S('text', { transform: `translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`, 'text-anchor': 'middle', style: 'fill:var(--ink-dim);font-size:14px' }, axis); yl.textContent = def.yLabel;
    (def.refLines || []).forEach((r) => { const g = S('g', { class: 'annot' }, svg); S('line', { x1: M.l, x2: W - M.r, y1: Y(r.y), y2: Y(r.y), style: 'stroke:' + (r.color || 'var(--warn)') }, g); const t = S('text', { x: M.l + 8, y: Y(r.y) - 6, 'text-anchor': 'start', style: 'fill:' + (r.color || 'var(--warn)') }, g); t.textContent = r.label; });
    (def.annotations || []).forEach((a) => { if (hideAfter != null && a.x > hideAfter) return; const g = S('g', { class: 'annot' }, svg); S('line', { x1: X(a.x), x2: X(a.x), y1: M.t + 6, y2: H - M.b }, g); const t = S('text', { x: X(a.x) + 6, y: M.t + 16 }, g); t.textContent = a.text; });
    if (hideAfter != null) {
      const g = S('g', {}, svg);
      S('rect', { x: X(hideAfter) + 8, y: M.t, width: W - M.r - X(hideAfter) - 8, height: H - M.t - M.b, fill: 'rgba(255,255,255,.04)', stroke: 'var(--line-strong)', 'stroke-dasharray': '5 5' }, g);
      const t = S('text', { x: (X(hideAfter) + 8 + W - M.r) / 2, y: (M.t + H - M.b) / 2, 'text-anchor': 'middle', style: 'fill:var(--ink-dim);font-size:15px;font-weight:700' }, g); t.textContent = 'What comes next?';
    }
    def.series.forEach((s) => {
      if (!visible.has(s.id)) return;
      const pts = s.points.filter((p) => hideAfter == null || p[0] <= hideAfter);
      if (s.band) { const bp = s.band.filter((b) => hideAfter == null || b[0] <= hideAfter); const up = bp.map((b, i) => (i ? 'L' : 'M') + X(b[0]).toFixed(1) + ' ' + Y(b[2]).toFixed(1)).join(' '), dn = bp.slice().reverse().map((b) => 'L' + X(b[0]).toFixed(1) + ' ' + Y(b[1]).toFixed(1)).join(' '); S('path', { d: up + ' ' + dn + 'Z', fill: s.color, class: 'band' }, svg); }
      if (s.area) { const d = pathFor(s, pts); S('path', { d: d + ` L${X(pts.at(-1)[0])} ${Y(ymin)} L${X(pts[0][0])} ${Y(ymin)} Z`, fill: s.color, class: 'area' }, svg); }
      const path = S('path', { d: pathFor(s, pts), class: 'line', stroke: s.color, 'stroke-dasharray': s.dash || '' }, svg);
      if (animate && !reducedMotion()) { const len = path.getTotalLength ? path.getTotalLength() : 0; if (len) { const dash = s.dash; path.style.strokeDasharray = len; path.style.strokeDashoffset = len; path.getBoundingClientRect(); path.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1)'; requestAnimationFrame(() => { path.style.strokeDashoffset = 0; }); setTimeout(() => { path.style.transition = ''; path.style.strokeDasharray = dash || ''; }, 1500); } }
      if (!s.noMarkers) pts.forEach((p) => { const c = S('circle', { cx: X(p[0]), cy: Y(p[1]), r: 4.5, fill: s.color, class: 'pt' + (cursorX === p[0] ? ' active' : ''), 'data-x': p[0] }, svg); });
    });
    if (cursorX != null) S('line', { x1: X(cursorX), x2: X(cursorX), y1: M.t, y2: H - M.b, class: 'cursor' }, svg);
    if (compare.a != null) S('line', { x1: X(compare.a), x2: X(compare.a), y1: M.t, y2: H - M.b, style: 'stroke:var(--accent);stroke-width:2' }, svg);
    if (compare.b != null) S('line', { x1: X(compare.b), x2: X(compare.b), y1: M.t, y2: H - M.b, style: 'stroke:var(--accent-2);stroke-width:2' }, svg);
  }

  function readout(x) {
    const rows = def.series.filter((s) => visible.has(s.id)).map((s) => ({ s, v: valAt(s, x) })).filter((r) => r.v != null);
    return { rows, text: `${def.xLabel.replace(/ \(.*/, '')} ${x}: ` + rows.map((r) => `${r.s.label} ${fmt(r.v, r.s)}`).join('; ') };
  }
  function showTip(x, clientX) {
    const r = readout(x); if (!r.rows.length) { tip.classList.remove('on'); return; }
    tip.innerHTML = `<b>${x}</b>` + r.rows.map((q) => `<div><span style="color:${q.s.color}">●</span> ${q.s.label}: <b style="display:inline">${fmt(q.v, q.s)}</b></div>`).join('');
    const box = root.getBoundingClientRect(); const px = ((X(x)) / W) * box.width;
    tip.style.left = Math.min(Math.max(px + 10, 4), box.width - 150) + 'px'; tip.style.top = '8px'; tip.classList.add('on');
  }
  function setCursor(x, announce) {
    cursorX = x; draw(); if (x == null) { tip.classList.remove('on'); return; }
    showTip(x); if (announce) live.textContent = readout(x).text;
  }
  const nearest = (clientX) => { const box = svg.getBoundingClientRect(); const vx = ((clientX - box.left) / box.width) * W; const list = allX(); if (!list.length) return null; return list.reduce((b, x) => (Math.abs(X(x) - vx) < Math.abs(X(b) - vx) ? x : b), list[0]); };
  function pickCompare(x) {
    if (compare.a == null || (compare.a != null && compare.b != null)) { compare.a = x; compare.b = null; } else compare.b = x;
    draw();
    if (compare.a != null && compare.b != null) {
      const [a, b] = [compare.a, compare.b].sort((m, n) => m - n);
      const parts = def.series.filter((s) => visible.has(s.id)).map((s) => { const va = valAt(s, a), vb = valAt(s, b); if (va == null || vb == null) return `${s.label}: no data for both years`; const d = Math.round((vb - va) * 100) / 100; return `${s.label}: ${fmt(va)} in ${a} to ${fmt(vb)} in ${b} (${d >= 0 ? '+' : '−'}${Math.abs(d)} percentage points)`; });
      cmpBox.hidden = false; cmpBox.innerHTML = '<b>Compare years:</b> ' + parts.join('<br>');
    } else { cmpBox.hidden = false; cmpBox.textContent = `Year ${x} selected. Select a second year to compare.`; }
  }
  svg.addEventListener('pointermove', (e) => { const x = nearest(e.clientX); if (x != null) { cursorX = x; draw(); showTip(x); } });
  svg.addEventListener('pointerleave', () => { if (!svg.matches(':focus-visible')) { cursorX = null; draw(); tip.classList.remove('on'); } });
  svg.addEventListener('click', (e) => { const x = nearest(e.clientX); if (x == null) return; if (compare.on) pickCompare(x); else setCursor(x, true); });
  svg.addEventListener('keydown', (e) => {
    const list = allX(); if (!list.length) return;
    let i = cursorX == null ? -1 : list.indexOf(cursorX);
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') i = Math.min(list.length - 1, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') i = Math.max(0, i < 0 ? 0 : i - 1);
    else if (e.key === 'Home') i = 0; else if (e.key === 'End') i = list.length - 1;
    else if ((e.key === 'Enter' || e.key === ' ') && compare.on && cursorX != null) { e.preventDefault(); pickCompare(cursorX); return; }
    else return;
    e.preventDefault(); setCursor(list[i], true);
  });

  if (def.series.length > 1 && !opts.noLegend) def.series.forEach((s) => {
    const b = h('button', { type: 'button', 'aria-pressed': 'true', onclick: () => { if (visible.has(s.id) && visible.size === 1) return; visible.has(s.id) ? visible.delete(s.id) : visible.add(s.id); b.setAttribute('aria-pressed', visible.has(s.id) ? 'true' : 'false'); cursorX = null; tip.classList.remove('on'); draw(); } },
      h('span.sw' + (s.dash ? '.dash' : ''), { style: { borderTopColor: s.color } }), s.label);
    legend.appendChild(b);
  });
  if (!opts.noTools) {
    const actions = h('div.chart-actions');
    const cbtn = h('button.btn.small.ghost', { type: 'button', 'aria-pressed': 'false', onclick: () => { compare.on = !compare.on; compare.a = compare.b = null; cbtn.setAttribute('aria-pressed', compare.on); cbtn.textContent = compare.on ? 'Compare years: ON (select two points)' : 'Compare two years'; cmpBox.hidden = !compare.on; cmpBox.textContent = 'Select two years on the graph to see the change.'; draw(); } }, 'Compare two years');
    const tbtn = h('button.btn.small.ghost', { type: 'button', 'aria-expanded': 'false', onclick: () => { tableWrap.hidden = !tableWrap.hidden; tbtn.setAttribute('aria-expanded', !tableWrap.hidden); tbtn.textContent = tableWrap.hidden ? 'View data table' : 'Hide data table'; if (!tableWrap.hidden) buildTable(); } }, 'View data table');
    if (!def.schematic) actions.append(cbtn);
    actions.append(tbtn); host.append(actions, tableWrap);
  }
  function buildTable() {
    const list = [...new Set(def.series.flatMap((s) => s.points.map((p) => p[0])))].filter((x) => hideAfter == null || x <= hideAfter).sort((a, b) => a - b);
    tableWrap.innerHTML = '';
    tableWrap.appendChild(h('table.data', h('caption', def.title), h('thead', h('tr', h('th', def.xLabel), def.series.map((s) => h('th', s.label)))),
      h('tbody', list.map((x) => h('tr', h('td', x), def.series.map((s) => { const v = valAt(s, x); return h('td', v == null ? '—' : (def.hideY ? '—' : fmt(v))); }))))));
  }
  if (def.note) host.append(h('p.chart-note', def.note));
  draw(true);
  return {
    destroy() { root.remove(); },
    setHideAfter(v, animate = true) { hideAfter = v; draw(animate); if (!tableWrap.hidden) buildTable(); },
    setSeries(newSeries) { def.series = newSeries; for (const s of newSeries) visible.add(s.id); draw(); },
    setDef(patch) { Object.assign(def, patch); draw(); },
    setCursor(x) { cursorX = x; draw(); }
  };
}
