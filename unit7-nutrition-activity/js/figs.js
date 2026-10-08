// Figures used inside question stimuli and simulations: Nutrition Facts label, product packages, social post, map,
// MyPlate-style plate and the food-system network. All art is inline SVG/HTML generated here (no external images).
import { h } from './util.js';
import { LABEL_ROWS, MICRO_ROWS, DV, pctDV, scaled } from './labeldata.js';
import { chartEl, CHARTS } from './charts.js';

const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };
let gid = 0;
const uid = () => 'g' + (++gid);

// ============================================================================ Nutrition Facts label
/** Returns {el, update(servings)}.  opts: {servings, regions:true (clickable), dual:true, onRegion} */
export function labelFig(p, opts = {}) {
  const el = h('div.nf', { role: 'group', 'aria-label': `Nutrition Facts label for ${p.name}` });
  const reg = (key, node) => { if (opts.regions) { node.dataset.region = key; node.classList.add('nf-reg'); } return node; };
  function paint(n = 1) {
    const v = scaled(p, n), dual = !!opts.dual;
    el.replaceChildren();
    el.append(h('div.nf-title', 'Nutrition Facts'));
    el.append(reg('spc', h('div.nf-line', h('span', `${typeof p.spc === 'number' ? p.spc : p.spc} servings per container`))));
    el.append(reg('serving', h('div.nf-line.big', h('b', 'Serving size'), h('b', p.serving))));
    el.append(h('div.nf-bar.fat'));
    if (dual) {
      el.append(h('div.nf-line.dualhead', h('span', ''), h('b', 'Per serving'), h('b', 'Per container')));
      el.append(reg('cal', h('div.nf-line.cal', h('b', 'Calories'), h('b', String(p.cal)), h('b', String(Math.round(p.cal * p.spc))))));
    } else el.append(reg('cal', h('div.nf-calrow', h('div', h('small', n === 1 ? 'Amount per serving' : `Amount for ${n} serving${n === 1 ? '' : 's'}`), h('b', 'Calories')), h('b.calnum', String(v.cal)))));
    el.append(h('div.nf-bar.med'));
    if (!dual) el.append(reg('dv', h('div.nf-line.right', h('b', '% Daily Value*'))));
    for (const [k, label, unit, indent, hasDV] of LABEL_ROWS) {
      const amt = v[k], row = h('div.nf-line.ind' + indent);
      if (dual) {
        const c = Math.round(p[k] * p.spc * 10) / 10;
        row.append(h('span', h(indent === 0 ? 'b' : 'span', label + ' '), `${p[k]}${unit}`), h('span.r', hasDV ? `${pctDV(k, p[k])}%` : ''), h('span.r', `${c}${unit}${hasDV ? ' (' + pctDV(k, c) + '%)' : ''}`));
      } else row.append(h('span', h(indent === 0 ? 'b' : 'span', label + ' '), `${amt}${unit}`), hasDV ? h('b.r.dvv', `${v['dv_' + k]}%`) : h('span.r', ''));
      el.append(['sod', 'added', 'fiber', 'sat', 'sugars', 'fat', 'carb', 'protein'].includes(k) ? reg(k, row) : row);
      if (k === 'protein') el.append(h('div.nf-bar.med'));
    }
    if (!dual) for (const [k, label, unit] of MICRO_ROWS) el.append(h('div.nf-line', h('span', `${label} ${v[k]}${unit}`), h('span.r', `${v['dv_' + k]}%`)));
    el.append(h('div.nf-bar.thin'), h('div.nf-foot', '* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.'));
  }
  paint(opts.servings || 1);
  return { el, update: paint };
}

// ============================================================================ product package art
export function packageFig({ name, claims = [], color = ['#f6b042', '#e0662b'], shape = 'box' }, opts = {}) {
  const id = uid();
  const svg = S('svg', { viewBox: '0 0 220 300', class: 'pkg', role: 'img', 'aria-label': `Front of package: ${name}. Claims: ${claims.join('; ')}` });
  const defs = S('defs', {}, svg), lg = S('linearGradient', { id: id + 'g', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  S('stop', { offset: '0', 'stop-color': color[0] }, lg); S('stop', { offset: '1', 'stop-color': color[1] }, lg);
  if (shape === 'bag') { S('path', { d: 'M20 18 L200 18 L210 40 L210 280 L10 280 L10 40 Z', fill: `url(#${id}g)`, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 3 }, svg); for (let x = 20; x < 200; x += 12) S('line', { x1: x, y1: 18, x2: x, y2: 30, stroke: 'rgba(0,0,0,.25)', 'stroke-width': 3 }, svg); }
  else S('rect', { x: 12, y: 12, width: 196, height: 276, rx: 14, fill: `url(#${id}g)`, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 3 }, svg);
  S('circle', { cx: 160, cy: 62, r: 40, fill: 'rgba(255,255,255,.18)' }, svg); S('circle', { cx: 50, cy: 250, r: 52, fill: 'rgba(255,255,255,.12)' }, svg);
  const t = S('text', { x: 110, y: 112, 'text-anchor': 'middle', style: 'font:800 22px Fraunces,Georgia,serif;fill:#fff;paint-order:stroke;stroke:rgba(0,0,0,.35);stroke-width:4px' }, svg);
  name.split(' ').reduce((acc, w) => { const last = acc[acc.length - 1]; if (last && (last + ' ' + w).length <= 14) acc[acc.length - 1] = last + ' ' + w; else acc.push(w); return acc; }, []).slice(0, 3).forEach((ln, i) => { const ts = S('tspan', { x: 110, dy: i ? 26 : 0 }, t); ts.textContent = ln; });
  claims.slice(0, 4).forEach((c, i) => {
    const y = 176 + i * 28, w = Math.min(190, 18 + c.length * 7);
    S('rect', { x: 110 - w / 2, y: y - 14, width: w, height: 22, rx: 11, fill: 'rgba(255,255,255,.92)' }, svg);
    const tt = S('text', { x: 110, y: y + 1, 'text-anchor': 'middle', style: 'font:700 11.5px system-ui,sans-serif;fill:#1b2233' }, svg); tt.textContent = c;
  });
  return svg;
}

// ============================================================================ social post (explore + scored)
const silhouette = (parent, x, tired, light) => {
  const g = S('g', { transform: `translate(${x} 0)` }, parent);
  S('rect', { x: 0, y: 0, width: 96, height: 120, fill: light ? '#ffeab8' : '#4c5160' }, g);
  S('circle', { cx: 48, cy: tired ? 44 : 38, r: 13, fill: light ? '#d89b6a' : '#7a6a60' }, g);
  S('path', { d: tired ? 'M48 57 C30 62 28 90 34 118 L62 118 C66 90 64 62 48 57 Z' : 'M48 52 C30 58 28 90 34 118 L62 118 C68 90 66 58 48 52 Z', fill: light ? '#ff7a3d' : '#5a6070' }, g);
  if (!tired) { S('path', { d: 'M36 66 L18 36 M60 66 L78 36', stroke: '#d89b6a', 'stroke-width': 6, 'stroke-linecap': 'round' }, g); }
  else S('path', { d: 'M38 70 L30 100 M58 70 L66 100', stroke: '#7a6a60', 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
};
/** post: {handle, followers, tub, sub, ba:[l,r], caption, testimonial, badge, code, tags, missing, likes}.  opts: {regions:true, onRegion(key), explore:true} */
export function postFig(post, opts = {}) {
  const el = h('div.post', { role: 'group', 'aria-label': 'Fictional social media post' });
  const reg = (key, node) => { if (opts.regions) { node.dataset.region = key; node.classList.add('post-reg'); } return node; };
  const photo = (() => {
    const svg = S('svg', { viewBox: '0 0 200 120', class: 'baphoto', role: 'img', 'aria-label': `Two photos side by side labeled ${post.ba[0]} and ${post.ba[1]}` });
    silhouette(svg, 2, true, false); silhouette(svg, 102, false, true);
    S('line', { x1: 100, y1: 0, x2: 100, y2: 120, stroke: '#fff', 'stroke-width': 2 }, svg);
    [[post.ba[0], 4], [post.ba[1], 104]].forEach(([t, x]) => { S('rect', { x, y: 4, width: 6 + t.length * 5.2, height: 14, rx: 7, fill: 'rgba(0,0,0,.65)' }, svg); const tx = S('text', { x: x + 6, y: 14, style: 'font:700 8.5px system-ui;fill:#fff' }, svg); tx.textContent = t; });
    return svg;
  })();
  const tub = (() => {
    const svg = S('svg', { viewBox: '0 0 90 120', class: 'tub', role: 'img', 'aria-label': `Photo of ${post.tub} ${post.sub}` });
    S('rect', { x: 14, y: 20, width: 62, height: 88, rx: 9, fill: '#2d3a8c' }, svg); S('rect', { x: 18, y: 8, width: 54, height: 16, rx: 6, fill: '#ff5e8a' }, svg);
    S('rect', { x: 20, y: 44, width: 50, height: 40, rx: 5, fill: '#fff' }, svg);
    const t1 = S('text', { x: 45, y: 62, 'text-anchor': 'middle', style: 'font:800 9px system-ui;fill:#2d3a8c' }, svg); t1.textContent = post.tub;
    const t2 = S('text', { x: 45, y: 74, 'text-anchor': 'middle', style: 'font:600 6.5px system-ui;fill:#444' }, svg); t2.textContent = post.sub;
    return svg;
  })();
  let liked = false;
  const likeBtn = h('button.heart', { type: 'button', 'aria-pressed': 'false', 'aria-label': 'Like this post (simulated)', onclick: () => { liked = !liked; likeBtn.setAttribute('aria-pressed', liked); likeBtn.classList.toggle('on', liked); likeBtn.classList.add('pop'); setTimeout(() => likeBtn.classList.remove('pop'), 350); } }, '♥');
  el.append(
    reg('handle', h('div.post-head', h('span.avatar', { 'aria-hidden': 'true' }, post.handle.replace('@', '')[0].toUpperCase()), h('div', h('b', post.handle), h('div.small.muted', post.followers)), h('span.follow', 'Follow'))),
    h('div.post-media', reg('photo', h('div.mediaA', photo)), reg('product', h('div.mediaB', tub)), post.badge ? reg('badge', h('div.seal', post.badge)) : ''),
    h('div.post-actions', likeBtn, h('span', '💬'), h('span', '↗'), h('span.small.muted.likes', post.likes)),
    h('div.post-body',
      reg('claim', h('p.claim', post.caption)),
      reg('testimonial', h('p.quote', post.testimonial)),
      reg('code', h('p.codepill', post.code)),
      reg('disclosure', h('p.tags', post.tags)),
      reg('missing', h('p.missing', 'Ingredients: not shown  •  Serving size: not shown  •  Research: no link')))
  );
  return el;
}

// ============================================================================ food-environment map
export function mapFig() {
  const svg = S('svg', { viewBox: '0 0 640 360', class: 'map', role: 'img', 'aria-label': 'Neighborhood map with five labeled areas A to E, a supermarket, bus lines and a highway.' });
  S('rect', { width: 640, height: 360, fill: '#e8efe0' }, svg);
  // streets
  for (let x = 40; x < 640; x += 80) S('line', { x1: x, y1: 0, x2: x, y2: 360, stroke: '#fff', 'stroke-width': 8 }, svg);
  for (let y = 40; y < 360; y += 80) S('line', { x1: 0, y1: y, x2: 640, y2: y, stroke: '#fff', 'stroke-width': 8 }, svg);
  // highway and bus line are drawn first so the area boxes sit on top of them
  S('path', { d: 'M0 140 L640 140', stroke: '#8a8f99', 'stroke-width': 14, opacity: 0.55 }, svg);
  S('path', { d: 'M325 360 L325 262', stroke: '#2d6be0', 'stroke-width': 6, fill: 'none', 'stroke-dasharray': '10 6' }, svg);
  S('circle', { cx: 325, cy: 264, r: 8, fill: '#2d6be0', stroke: '#fff', 'stroke-width': 3 }, svg);
  const bt = S('text', { x: 336, y: 330, style: 'font:700 12px system-ui;fill:#1a47a8' }, svg); bt.textContent = 'Bus line 4 (stop at Area B)';
  const area = (k, x, y, w, hh, fill, label, sub) => {
    const g = S('g', { 'data-region': k, class: 'maparea', role: 'button', tabindex: 0, 'aria-label': `Area ${k}: ${label}. ${sub}` }, svg);
    S('rect', { x, y, width: w, height: hh, rx: 10, fill, stroke: '#3a4a2e', 'stroke-width': 2.5, 'fill-opacity': 0.88 }, g);
    const t = S('text', { x: x + w / 2, y: y + 30, 'text-anchor': 'middle', style: 'font:800 22px Fraunces,Georgia,serif;fill:#10200d' }, g); t.textContent = k;
    const t2 = S('text', { x: x + w / 2, y: y + 50, 'text-anchor': 'middle', style: 'font:600 12px system-ui;fill:#10200d' }, g); t2.textContent = label;
    const t3 = S('text', { x: x + w / 2, y: y + 66, 'text-anchor': 'middle', style: 'font:500 11px system-ui;fill:#1c2e18' }, g); t3.textContent = sub;
  };
  area('A', 24, 24, 170, 112, '#d9e6c8', 'Beside the supermarket', 'No-car households: 8%');
  area('B', 230, 150, 190, 110, '#6f8f4a', 'Dense apartments, bus line', 'No-car households: 68%');
  area('C', 450, 24, 166, 96, '#d0d0c4', 'Highway interchange', 'Few homes');
  area('D', 24, 232, 170, 104, '#c9c0b0', 'Industrial park', 'Few homes');
  area('E', 450, 232, 166, 104, '#e3ecd0', 'Suburban cul-de-sacs', 'No-car households: 4%');
  // supermarket marker (inside Area A, below its text)
  S('rect', { x: 52, y: 102, width: 40, height: 22, rx: 4, fill: '#d6453d' }, svg);
  const st = S('text', { x: 72, y: 118, 'text-anchor': 'middle', style: 'font:800 12px system-ui;fill:#fff' }, svg); st.textContent = 'S';
  const sl = S('text', { x: 98, y: 118, style: 'font:700 11px system-ui;fill:#10200d' }, svg); sl.textContent = 'Supermarket';
  return svg;
}

// ============================================================================ MyPlate-style plate
const PLATE = { fruit: ['Fruit', '#e8566b'], veg: ['Vegetables', '#4fae5b'], grain: ['Grains', '#e3a13a'], prot: ['Protein', '#8b5cc4'], dairy: ['Dairy', '#4a8fe0'] };
export function plateFig() {
  const svg = S('svg', { viewBox: '0 0 300 220', class: 'plate', role: 'img', 'aria-label': 'Plate with five sections: fruit, vegetables, grains, protein and a dairy cup. Sections fill in as you choose foods.' });
  const cx = 120, cy = 112, R = 92;
  S('circle', { cx, cy, r: R + 8, fill: '#f4f1ea', stroke: '#cfc8b8', 'stroke-width': 3 }, svg);
  const sect = {};
  const wedge = (k, a0, a1) => {
    const r = (a) => [cx + R * Math.cos(a), cy + R * Math.sin(a)];
    const [x0, y0] = r(a0), [x1, y1] = r(a1);
    const g = S('g', {}, svg);
    const path = S('path', { d: `M${cx} ${cy} L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z`, fill: PLATE[k][1], 'fill-opacity': 0.14, stroke: '#fff', 'stroke-width': 3 }, g);
    const mid = (a0 + a1) / 2, tx = cx + R * 0.58 * Math.cos(mid), ty = cy + R * 0.58 * Math.sin(mid);
    const t = S('text', { x: tx, y: ty, 'text-anchor': 'middle', style: 'font:700 11px system-ui;fill:#2a2a2a' }, g); t.textContent = PLATE[k][0];
    const t2 = S('text', { x: tx, y: ty + 13, 'text-anchor': 'middle', style: 'font:600 9px system-ui;fill:#2a2a2a' }, g);
    sect[k] = { path, t2 };
  };
  const q = Math.PI / 2;
  wedge('veg', -q * 2, -q * 0.15); wedge('fruit', -q * 0.15, q * 0.55); wedge('grain', q * 0.55, q * 1.5); wedge('prot', q * 1.5, q * 2);
  // dairy cup
  const dg = S('g', {}, svg);
  S('path', { d: 'M240 80 L290 80 L282 150 L248 150 Z', fill: PLATE.dairy[1], 'fill-opacity': 0.14, stroke: '#cfc8b8', 'stroke-width': 3 }, dg);
  sect.dairy = { path: dg.firstChild, t2: S('text', { x: 265, y: 120, 'text-anchor': 'middle', style: 'font:600 9px system-ui;fill:#2a2a2a' }, dg) };
  const dt = S('text', { x: 265, y: 70, 'text-anchor': 'middle', style: 'font:700 12px system-ui;fill:var(--ink)' }, svg); dt.textContent = 'Dairy';
  function update(sel, labels) { for (const k of Object.keys(sect)) { const on = !!sel[k]; sect[k].path.setAttribute('fill-opacity', on ? 0.85 : 0.14); sect[k].path.style.transition = 'fill-opacity .5s'; sect[k].t2.textContent = on ? (labels[k] || '').slice(0, 22) : ''; sect[k].t2.style.fill = on ? '#fff' : '#2a2a2a'; } }
  return { el: svg, update };
}

// ============================================================================ food-system network
const NODES = { subs: [70, 40, 'Farm subsidies & insurance incentives'], crops: [230, 40, 'Large supply of corn & soy'], ingr: [390, 40, 'Cheap ingredients for processed foods'], price: [550, 40, 'Lower prices for many processed foods'],
  mkt: [70, 150, 'Heavy marketing of processed foods'], demand: [230, 150, 'Higher consumption of advertised foods'], plant: [390, 150, 'Few large processing plants'], disrupt: [550, 150, 'One closure disrupts supply'],
  store: [150, 250, 'Few full-service grocery stores nearby'], fresh: [390, 250, 'Less fresh produce available near home'] };
export const NET_EDGES = { e1: ['subs', 'crops'], e2: ['crops', 'ingr'], e3: ['ingr', 'price'], e4: ['mkt', 'demand'], e5: ['plant', 'disrupt'], e6: ['store', 'fresh'], e7: ['demand', 'subs'], e8: ['price', 'store'], e9: ['disrupt', 'mkt'] };
export function netFig() {
  const svg = S('svg', { viewBox: '0 0 640 300', class: 'net', role: 'img', 'aria-label': 'Food-system factors: subsidies, crop supply, ingredient cost, prices, marketing, consumption, processing plants, supply disruption, grocery access and fresh produce. Arrows appear for the links you select.' });
  const defs = S('defs', {}, svg), mk = S('marker', { id: 'arr', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
  S('path', { d: 'M0 0 L10 5 L0 10 Z', fill: '#5ee09a' }, mk);
  const edges = S('g', {}, svg);
  Object.entries(NODES).forEach(([k, [x, y, label]]) => {
    const g = S('g', { class: 'node' }, svg);
    S('rect', { x: x - 66, y: y - 24, width: 132, height: 48, rx: 10, fill: 'var(--panel-solid)', stroke: 'var(--line-strong)', 'stroke-width': 1.5 }, g);
    const words = label.split(' '), lines = []; let ln = '';
    words.forEach((w) => { if ((ln + ' ' + w).trim().length > 21) { lines.push(ln); ln = w; } else ln = (ln + ' ' + w).trim(); }); lines.push(ln);
    lines.slice(0, 3).forEach((l, i) => { const t = S('text', { x, y: y - 6 + i * 13 - (lines.length - 2) * 5, 'text-anchor': 'middle', style: 'font:600 10.5px system-ui;fill:var(--ink)' }, g); t.textContent = l; });
  });
  function update(selected = []) {
    edges.replaceChildren();
    for (const id of selected) {
      const e = NET_EDGES[id]; if (!e) continue;
      const [a, b] = [NODES[e[0]], NODES[e[1]]], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      const sx = a[0] + (Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) * 66 : 0), sy = a[1] + (Math.abs(dx) > Math.abs(dy) ? 0 : Math.sign(dy) * 24);
      const ex = b[0] - (Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) * 70 : 0), ey = b[1] - (Math.abs(dx) > Math.abs(dy) ? 0 : Math.sign(dy) * 28);
      S('path', { d: `M${sx} ${sy} L${ex} ${ey}`, stroke: '#5ee09a', 'stroke-width': 3, fill: 'none', 'marker-end': 'url(#arr)', class: 'edge' }, edges);
    }
  }
  return { el: svg, update, L: null };
}

// ============================================================================ dispatcher for question stimuli
export function figureFor(stim, st = {}) {
  switch (stim.fig) {
    case 'label': return { el: labelFig(stim.product, { regions: !!stim.regions }).el };
    case 'package': { const wrap = h('div.pkgwrap', packageFig(stim.pkg, {})); return { el: wrap }; }
    case 'post': return { el: postFig(stim.post, { regions: !!stim.regions }) };
    case 'map': return { el: h('div.mapwrap', mapFig(), h('ul.maplegend', [['A', 'Next to the existing supermarket; few households without a car (8%)'], ['B', 'Dense apartments on bus line 4; 68% of households have no car'], ['C', 'Highway interchange; few homes'], ['D', 'Industrial park; few homes'], ['E', 'Suburban cul-de-sacs; 4% of households have no car']].map(([k, t]) => h('li', h('b', 'Area ' + k + ': '), t)))) };
    case 'net': { const n = netFig(); return { el: h('div.netwrap', n.el), update: n.update }; }
    default: return null;
  }
}
export { chartEl, CHARTS };
