// Stimulus blocks: everything that is shown to the student around a question (text, notes, legends, chat threads,
// figures, charts, evidence documents, source cards, the STOP model). Pure DOM building, no innerHTML.
import { h, svg, rich } from './util.js';

const person = (people, id) => (people || []).find((p) => p.id === id) || { name: id, side: 'left' };

export function bubble(msg, people, extra) {
  const p = person(people, msg.who);
  return h('div.msg.' + (p.side === 'right' ? 'right' : 'left'), extra && extra.attrs || null,
    h('div.who', p.name),
    h('div.bubble', msg.text),
    extra && extra.after
  );
}

export function threadBlock(b) {
  return h('div.thread', { role: 'group', 'aria-label': 'Text thread: ' + (b.title || '') },
    b.title ? h('div.thread-title', b.title) : null,
    (b.messages || []).map((m) => bubble(m, b.people)));
}

export function figureBlock(figId, content, caption) {
  const f = (content.figures || {})[figId];
  if (!f) return h('p.muted', 'Figure unavailable.');
  return h('figure.figure',
    h('div.figure-stage', h('img', { src: f.src, alt: f.alt, width: f.w, height: f.h })),
    h('details', h('summary', 'Text description of this diagram'), h('p', f.desc)),
    caption ? h('figcaption', caption) : null);
}

/* ---------- grouped bar chart (SVG, with a data table for screen readers and anyone who wants the numbers) ---------- */
function wrapLabel(text, max) {
  const words = String(text).split(' '), lines = []; let cur = '';
  words.forEach((w) => { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) lines.push(cur);
  return lines.slice(0, 5);
}
export function chartBlock(spec) {
  const W = 640, H = 400, ml = 50, mr = 14, mt = 18, mb = 140;
  const pw = W - ml - mr, ph = H - mt - mb, n = spec.categories.length, m = spec.series.length;
  const gw = pw / n, bw = Math.min(36, (gw * 0.72) / m), max = spec.max;
  const tick = max <= 12 ? 2 : max <= 50 ? 10 : 20;
  const y = (v) => mt + ph - (v / max) * ph;
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': spec.alt, focusable: 'false' });
  for (let v = 0; v <= max; v += tick) {
    root.appendChild(svg('line', { x1: ml, x2: W - mr, y1: y(v), y2: y(v), stroke: '#d3dce3', 'stroke-width': 1 }));
    root.appendChild(svg('text', { x: ml - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 12, fill: '#526370' }, String(v)));
  }
  root.appendChild(svg('text', { x: 14, y: mt + ph / 2, 'text-anchor': 'middle', 'font-size': 12, fill: '#526370', transform: `rotate(-90 14 ${mt + ph / 2})` }, spec.yLabel || ''));
  spec.categories.forEach((cat, i) => {
    const cx = ml + gw * i + gw / 2, x0 = cx - (bw * m) / 2;
    spec.series.forEach((s, j) => {
      const v = s.values[i], bh = (v / max) * ph;
      const r = svg('rect', { class: 'bar s' + j, x: x0 + j * bw, y: y(v), width: bw - 2, height: bh, rx: 3 });
      r.style.animationDelay = (i * 60 + j * 120) + 'ms';
      root.appendChild(r);
      root.appendChild(svg('text', { x: x0 + j * bw + (bw - 2) / 2, y: y(v) - 5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#12202b' }, String(v)));
    });
    const lines = wrapLabel(cat, 17);
    const t = svg('text', { x: cx, y: mt + ph + 20, 'text-anchor': 'middle', 'font-size': 12, fill: '#33444f' });
    lines.forEach((ln, k) => t.appendChild(svg('tspan', { x: cx, dy: k ? 14 : 0 }, ln)));
    root.appendChild(t);
  });
  root.appendChild(svg('line', { x1: ml, x2: W - mr, y1: y(0), y2: y(0), stroke: '#12202b', 'stroke-width': 1.5 }));
  const legend = h('div.legend-row', spec.series.map((s, j) => { const sp = h('span', s.name); sp.style.setProperty('--c', j === 0 ? '#6c86a3' : 'var(--accent)'); return sp; }));
  const table = h('table', h('caption', spec.title),
    h('thead', h('tr', h('th', { scope: 'col' }, 'Statement'), spec.series.map((s) => h('th', { scope: 'col' }, s.name)))),
    h('tbody', spec.categories.map((c, i) => h('tr', h('th', { scope: 'row' }, c), spec.series.map((s) => h('td', String(s.values[i])))))));
  return h('div.chart', h('h4', spec.title), spec.note ? h('div.chart-note', spec.note) : null, root, legend,
    h('details', h('summary', 'View the data as a table'), table));
}

/* ---------- source cards ---------- */
export function sourcesBlock(b) {
  return h('div.sources', b.cards.map((c) => h('article.src-card',
    h('div.name', c.name), h('div.url', c.url), c.byline ? h('div.muted.small', c.byline) : null,
    h('div.chips', (c.chips || []).map((x) => h('span', x))))));
}

/* ---------- STOP model: stepper + the decision tree that unfolds as stages are completed ---------- */
export function stopBlock(model, progress) {
  const steps = model.steps;
  let currentSet = false;
  const items = steps.map((s) => {
    let state = null;
    if (progress) { state = progress[s.letter] ? 'done' : (!currentSet ? (currentSet = true, 'current') : 'todo'); }
    return h('li.stop-step', state ? { 'data-state': state } : null,
      h('span.L', { 'aria-hidden': 'true' }, s.letter), h('span.nm', s.letter + ' · ' + s.name), h('span.tx', s.text),
      state === 'done' ? h('span.sr-only', ' (done)') : null);
  });
  const out = h('div.stop', h('ol.stop-steps', { 'aria-label': model.name + ' decision model' }, items));
  if (progress) out.appendChild(treeBlock(progress));
  return out;
}
function treeBlock(p) {
  const W = 640, H = 240;
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Decision tree that grows as each STOP step is finished. State: ' + (p.S ? 'decision stated' : 'not started') + (p.T ? ', options listed' : '') + (p.O ? ', consequences observed' : '') + (p.P ? ', choice picked' : '') + '.', focusable: 'false' });
  const edge = (d, delay) => { const e = svg('path', { class: 'edge', d }); e.style.setProperty('--len', '260'); e.style.animationDelay = delay + 'ms'; return e; };
  const node = (cx, cy, done, delay, label, r) => {
    const g = svg('g');
    const c = svg('circle', { class: 'node' + (done ? ' done' : ''), cx, cy, r: r || 15 }); c.style.animationDelay = delay + 'ms'; g.appendChild(c);
    if (label) g.appendChild(svg('text', { x: cx, y: cy + 36, 'text-anchor': 'middle' }, label));
    return g;
  };
  const ys = [50, 120, 190];
  if (p.T) ys.forEach((y, i) => root.appendChild(edge(`M70 120 C150 120 150 ${y} 230 ${y}`, i * 120)));
  if (p.O) ys.forEach((y, i) => root.appendChild(edge(`M245 ${y} C310 ${y} 330 ${y} 380 ${y}`, 360 + i * 120)));
  if (p.P) ys.forEach((y, i) => root.appendChild(edge(`M395 ${y} C470 ${y} 470 120 545 120`, 720 + i * 120)));
  root.appendChild(node(55, 120, p.S, 0, 'Decision', 16));
  if (p.T) ys.forEach((y, i) => root.appendChild(node(236, y, p.O, 200 + i * 120, 'Option ' + 'ABC'[i], 14)));
  if (p.O) ys.forEach((y, i) => root.appendChild(node(388, y, p.P, 560 + i * 120, 'Results', 11)));
  if (p.P) root.appendChild(node(560, 120, true, 1000, 'Pick + explain', 16));
  return h('div.tree', root);
}

/* ---------- evidence documents (Chapter 6): must be opened before the questions unlock ---------- */
export function evidenceBlock(b, ctx) {
  const gate = ctx.gate || [];
  const seen = ctx.seen;
  const docs = b.docs;
  const meter = h('i');
  const count = h('span');
  const progress = gate.length ? h('div.gate-progress', { role: 'status' }, count, h('div.meter', meter)) : null;
  function refresh() {
    const n = gate.filter((g) => seen.has(g)).length;
    count.textContent = n + ' of ' + gate.length + ' documents opened';
    meter.style.width = (gate.length ? n / gate.length * 100 : 100) + '%';
  }
  const wrap = h('div.evidence', progress, h('div.docs', docs.map((d, i) => {
    const body = h('div.doc-body', { id: 'doc-' + d.id, hidden: true }, renderBlocks(d.blocks, ctx));
    const head = h('button.doc-head', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'doc-' + d.id },
      h('span.ico', { 'aria-hidden': 'true' }, 'E' + (i + 1)),
      h('span', h('span.t', d.title), h('span.s', d.tag || '')),
      h('span.st', seen.has(d.id) ? 'Read' : 'Open'));
    const card = h('article.doc', { 'data-seen': seen.has(d.id) ? 'true' : 'false', 'data-open': 'false' }, head, body);
    head.addEventListener('click', () => {
      const open = card.dataset.open !== 'true';
      card.dataset.open = open ? 'true' : 'false'; body.hidden = !open; head.setAttribute('aria-expanded', String(open));
      if (open && !seen.has(d.id)) { seen.add(d.id); card.dataset.seen = 'true'; head.querySelector('.st').textContent = 'Read'; if (ctx.onEvidence) ctx.onEvidence(d.id); refresh(); }
      else if (!open) head.querySelector('.st').textContent = 'Read';
    });
    return card;
  })));
  refresh();
  return wrap;
}

/* ---------- dispatcher ---------- */
export function renderBlocks(blocks, ctx) {
  return (blocks || []).map((b) => renderBlock(b, ctx)).filter(Boolean);
}
export function renderBlock(b, ctx) {
  switch (b.t) {
    case 'p': return h('p', rich(b.text));
    case 'note': return h('div.note.' + (b.tone || 'info'), h('div', rich(b.text)));
    case 'legend': return h('div.legend', h('h4', b.title), h('dl', b.rows.map((r) => [h('dt', r.term), h('dd', r.def)])));
    case 'list': return h(b.ordered ? 'ol.plain-list' : 'ul.plain-list', b.items.map((i) => h('li', rich(i))));
    case 'thread': return threadBlock(b);
    case 'figure': return figureBlock(b.id, ctx.content, b.caption);
    case 'chart': return chartBlock(b);
    case 'sources': return sourcesBlock(b);
    case 'steps': return stopBlock(ctx.content.decisionModel, ctx.stopProgress || null);
    case 'evidence': return evidenceBlock(b, ctx);
    default: return null;
  }
}
