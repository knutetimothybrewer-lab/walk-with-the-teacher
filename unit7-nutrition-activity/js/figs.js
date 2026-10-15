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
const ICON = {
  heart: 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.8 6.4 4.8c2 0 3.7 1.1 5.6 3.2 1.9-2.1 3.6-3.2 5.6-3.2 3.5 0 5.5 3.6 4 7C19.5 16.4 12 21 12 21z',
  comment: 'M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20.5l1.5-5.4A8.5 8.5 0 1 1 21 11.5z',
  share: 'M22 3 2 10.5l7 3 3 7.5L22 3zM9 13.5 22 3',
  save: 'M6 3h12v18l-6-4.5L6 21V3z'
};
const icon = (k, fill) => { const svg = S('svg', { viewBox: '0 0 24 24', width: 24, height: 24, fill: fill || 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'aria-hidden': 'true' }); S('path', { d: ICON[k] }, svg); return svg; };
/** One gym photo: a lit background, shaded person, vignette and film grain. tired = dull/slouched, otherwise bright/flexing. */
function gymPhoto(parent, x, tired, id) {
  const g = S('g', { transform: `translate(${x} 0)`, 'clip-path': `url(#${id}c${tired ? 0 : 1})` }, parent);
  const defs = S('defs', {}, parent), cp = S('clipPath', { id: `${id}c${tired ? 0 : 1}` }, defs); S('rect', { x: 0, y: 0, width: 100, height: 120 }, cp);
  const grad = (n, stops, dir = [0, 0, 0, 1]) => { const lg = S('linearGradient', { id: `${id}${n}`, x1: dir[0], y1: dir[1], x2: dir[2], y2: dir[3] }, defs); stops.forEach(([o, c]) => S('stop', { offset: o, 'stop-color': c }, lg)); return `url(#${id}${n})`; };
  const wall = grad(`w${+tired}`, tired ? [[0, '#6b7079'], [1, '#3d4048']] : [[0, '#ffd9a8'], [1, '#f08a4b']]);
  const floor = grad(`f${+tired}`, tired ? [[0, '#34363c'], [1, '#202227']] : [[0, '#a8643a'], [1, '#6e3c20']]);
  const skin = tired ? '#b08a74' : '#d9a073', skinD = tired ? '#8c6a58' : '#b57a4f', shirt = tired ? '#6b7385' : '#ff5a36', shirtD = tired ? '#4f566a' : '#c23b1c', hair = '#2a1d17';
  S('rect', { width: 100, height: 120, fill: wall }, g); S('rect', { y: 88, width: 100, height: 32, fill: floor }, g);
  // gym backdrop: windows / rack and a blurred barbell
  for (let i = 0; i < 3; i++) S('rect', { x: 8 + i * 32, y: 10, width: 24, height: 38, rx: 2, fill: tired ? '#8a93a2' : '#fff2cf', opacity: tired ? 0.35 : 0.7 }, g);
  S('rect', { x: 4, y: 62, width: 92, height: 3, fill: '#20232b', opacity: 0.5 }, g); S('circle', { cx: 10, cy: 63, r: 9, fill: '#20232b', opacity: 0.45 }, g); S('circle', { cx: 90, cy: 63, r: 9, fill: '#20232b', opacity: 0.45 }, g);
  const p = S('g', { class: tired ? 'ph-tired' : 'ph-strong' }, g);
  // legs + shorts
  S('path', { d: 'M38 84 L36 116 L45 116 L50 94 L55 116 L64 116 L62 84 Z', fill: skin }, p); S('path', { d: 'M37 78 L63 78 L66 98 L52 98 L50 90 L48 98 L34 98 Z', fill: tired ? '#303541' : '#232a3c' }, p);
  // torso
  if (tired) { S('path', { d: 'M50 44 C33 46 31 66 35 80 L65 80 C69 66 67 46 50 44 Z', fill: shirt }, p); S('path', { d: 'M50 44 C41 47 38 62 40 80 L36 80 C32 66 34 47 50 44Z', fill: shirtD, opacity: 0.6 }, p); S('path', { d: 'M38 54 C33 66 34 80 37 92 M62 54 C67 66 66 80 63 92', stroke: skin, 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }, p); }
  else { S('path', { d: 'M50 38 C28 40 24 58 34 80 L66 80 C76 58 72 40 50 38 Z', fill: shirt }, p); S('path', { d: 'M50 38 C38 40 32 56 38 80 L34 80 C24 58 28 40 50 38Z', fill: shirtD, opacity: 0.55 }, p); S('path', { d: 'M33 50 L18 30 M67 50 L82 30', stroke: skin, 'stroke-width': 8, 'stroke-linecap': 'round' }, p); S('circle', { cx: 18, cy: 28, r: 5.5, fill: skinD }, p); S('circle', { cx: 82, cy: 28, r: 5.5, fill: skinD }, p); }
  // neck + head
  const hy = tired ? 36 : 29; S('rect', { x: 46, y: hy + 8, width: 8, height: 9, fill: skinD }, p); S('ellipse', { cx: 50, cy: hy, rx: 10.5, ry: 12, fill: skin }, p);
  S('path', { d: `M39 ${hy - 2} C38 ${hy - 14} 62 ${hy - 14} 61 ${hy - 2} C58 ${hy - 8} 42 ${hy - 8} 39 ${hy - 2} Z`, fill: hair }, p);
  S('path', { d: `M45 ${hy + 3} q5 ${tired ? -3 : 4} 10 0`, stroke: tired ? '#6b4a3c' : '#7a2e22', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' }, p);
  S('circle', { cx: 46, cy: hy - 1, r: 1.1, fill: '#1b1b1b' }, p); S('circle', { cx: 54, cy: hy - 1, r: 1.1, fill: '#1b1b1b' }, p);
  if (tired) S('path', { d: `M43 ${hy + 9} q-4 5 0 8`, stroke: '#7fc6ff', 'stroke-width': 1.6, fill: 'none', opacity: 0.8 }, p);
  // light, vignette
  S('rect', { width: 100, height: 120, fill: `url(#${id}v${+tired})` }, g);
  const rg = S('radialGradient', { id: `${id}v${+tired}`, cx: 0.5, cy: 0.45, r: 0.75 }, defs); S('stop', { offset: 0.55, 'stop-color': '#000', 'stop-opacity': 0 }, rg); S('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': tired ? 0.55 : 0.3 }, rg);
  if (!tired) S('ellipse', { cx: 50, cy: 40, rx: 46, ry: 50, fill: '#fff3c4', opacity: 0.16, class: 'ph-glow' }, g);
}
const tubFig = (post) => {
  const id = uid(), svg = S('svg', { viewBox: '0 0 90 120', preserveAspectRatio: 'xMidYMax meet', class: 'tub', role: 'img', 'aria-label': `Photo of ${post.tub} ${post.sub}` });
  const defs = S('defs', {}, svg);
  const bg = S('radialGradient', { id: id + 'b', cx: 0.5, cy: 0.35, r: 0.9 }, defs); S('stop', { offset: 0, 'stop-color': '#fff7ec' }, bg); S('stop', { offset: 1, 'stop-color': '#d9c9ee' }, bg);
  const body = S('linearGradient', { id: id + 'u', x1: 0, y1: 0, x2: 1, y2: 0 }, defs); [[0, '#1b2766'], [0.35, '#3a4dc2'], [0.6, '#2b3a9a'], [1, '#141c4d']].forEach(([o, c]) => S('stop', { offset: o, 'stop-color': c }, body));
  const lid = S('linearGradient', { id: id + 'l', x1: 0, y1: 0, x2: 1, y2: 0 }, defs); [[0, '#c93a68'], [0.4, '#ff7aa3'], [1, '#a82c55']].forEach(([o, c]) => S('stop', { offset: o, 'stop-color': c }, lid));
  S('rect', { width: 90, height: 120, fill: `url(#${id}b)` }, svg); S('rect', { y: 98, width: 90, height: 22, fill: '#b9a7d6', opacity: 0.5 }, svg);
  S('ellipse', { cx: 45, cy: 110, rx: 32, ry: 5, fill: '#000', opacity: 0.25 }, svg);
  S('rect', { x: 14, y: 20, width: 62, height: 88, rx: 9, fill: `url(#${id}u)` }, svg); S('rect', { x: 16, y: 6, width: 58, height: 18, rx: 6, fill: `url(#${id}l)` }, svg);
  for (let i = 0; i < 9; i++) S('line', { x1: 21 + i * 6, y1: 8, x2: 21 + i * 6, y2: 22, stroke: '#000', 'stroke-opacity': 0.12, 'stroke-width': 1 }, svg);
  S('rect', { x: 20, y: 42, width: 50, height: 46, rx: 5, fill: '#fff' }, svg); S('rect', { x: 20, y: 42, width: 50, height: 9, rx: 4, fill: '#ff5e8a' }, svg);
  const t1 = S('text', { x: 45, y: 67, 'text-anchor': 'middle', style: 'font:800 9px system-ui;fill:#2d3a8c' }, svg); t1.textContent = post.tub;
  const t2 = S('text', { x: 45, y: 78, 'text-anchor': 'middle', style: 'font:600 6.5px system-ui;fill:#444' }, svg); t2.textContent = post.sub;
  S('rect', { x: 20, y: 82, width: 50, height: 3, fill: '#ffd23f' }, svg);
  S('path', { d: 'M20 22 C18 50 18 80 22 104', stroke: '#fff', 'stroke-opacity': 0.35, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, svg);
  S('rect', { x: -30, y: 0, width: 18, height: 120, fill: '#fff', opacity: 0.28, transform: 'skewX(-18)', class: 'sheen' }, svg);
  return svg;
};
/** post: {handle, followers, tub, sub, ba:[l,r], caption, testimonial, badge, code, tags, missing, likes}.  opts: {regions:true, onRegion(key), explore:true} */
export function postFig(post, opts = {}) {
  const el = h('div.post', { role: 'group', 'aria-label': 'Fictional social media post' });
  const reg = (key, node) => { if (opts.regions) { node.dataset.region = key; node.classList.add('post-reg'); } return node; };
  const photo = (() => {
    const id = uid(), svg = S('svg', { viewBox: '0 0 200 120', class: 'baphoto', role: 'img', 'aria-label': `Two photos side by side labeled ${post.ba[0]} and ${post.ba[1]}` });
    const f = S('filter', { id: id + 'n' }, S('defs', {}, svg)); S('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.9, numOctaves: 2, seed: 3 }, f); S('feColorMatrix', { values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .09 0' }, f);
    const inner = S('g', { class: 'kenburns' }, svg); gymPhoto(inner, 0, true, id); gymPhoto(inner, 100, false, id);
    S('rect', { width: 200, height: 120, filter: `url(#${id}n)` }, svg);
    S('line', { x1: 100, y1: 0, x2: 100, y2: 120, stroke: '#fff', 'stroke-width': 2 }, svg);
    [[post.ba[0], 5], [post.ba[1], 105]].forEach(([t, x]) => { S('rect', { x, y: 5, width: 8 + t.length * 5.2, height: 14, rx: 7, fill: 'rgba(0,0,0,.6)' }, svg); const tx = S('text', { x: x + 6, y: 15, style: 'font:700 8.5px system-ui;fill:#fff' }, svg); tx.textContent = t; });
    return svg;
  })();
  const tub = tubFig(post);
  let liked = false; const burst = h('span.burst', { 'aria-hidden': 'true' });
  const likeBtn = h('button.heart', { type: 'button', 'aria-pressed': 'false', 'aria-label': 'Like this post (simulated)', onclick: () => { liked = !liked; likeBtn.setAttribute('aria-pressed', liked); likeBtn.classList.toggle('on', liked); likeBtn.classList.add('pop'); setTimeout(() => likeBtn.classList.remove('pop'), 350); } }, icon('heart'));
  const [handle0, ...rest] = [post.handle]; void rest;
  el.append(
    reg('handle', h('div.post-head', h('span.ring', h('span.avatar', { 'aria-hidden': 'true' }, handle0.replace('@', '')[0].toUpperCase())), h('div', h('b', post.handle), h('div.small.muted', post.followers)), h('span.follow', 'Follow'), h('span.dots', { 'aria-hidden': 'true' }, '•••'))),
    h('div.post-media', reg('photo', h('div.mediaA', photo)), reg('product', h('div.mediaB', tub)), post.badge ? reg('badge', h('div.seal', post.badge)) : '', burst),
    h('div.post-actions', likeBtn, h('span.ico', icon('comment')), h('span.ico', icon('share')), h('span.ico.save', icon('save')), h('span.small.muted.likes', post.likes)),
    h('div.post-body',
      reg('claim', h('p.claim', post.caption)),
      reg('testimonial', h('p.quote', post.testimonial)),
      reg('code', h('p.codepill', post.code)),
      reg('disclosure', h('p.tags', post.tags)),
      reg('missing', h('p.missing', 'Ingredients: not shown  •  Serving size: not shown  •  Research: no link')),
      h('p.meta', h('span', 'View all 2,341 comments'), h('span', '2 HOURS AGO')))
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
