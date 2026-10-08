// Interactive simulations ("scenes"). Each scene renders into a host element and calls ctx.markReady() once the student has
// explored enough to unlock that scene's questions. Scenes never display or hint at answers to the scored questions.
import { h, reducedMotion } from './util.js';
import { labelFig, packageFig, postFig } from './figs.js';
import { pctDV, dvLevel } from './labeldata.js';

const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };
const progressChips = (items) => h('ul.explore', { 'aria-label': 'Exploration progress' }, items.map(([label, done]) => h('li' + (done ? '.done' : ''), h('span', { 'aria-hidden': 'true' }, done ? '✓' : '○'), ' ', label)));
function countUp(el, to, fmt = (x) => String(Math.round(x))) {
  if (reducedMotion()) { el.textContent = fmt(to); return; }
  const from = parseFloat(el.dataset.v ?? to) || 0, t0 = performance.now(); el.dataset.v = to;
  (function f(now) { const k = Math.min(1, (now - t0) / 380), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(f); })(t0);
}

// ================================================================================== Nutrition Label Simulator
const EXPLAIN = {
  spc: ['Servings per container', 'How many servings the whole package holds. Eating the whole package means multiplying every number by this amount.'],
  serving: ['Serving size', 'The standard amount all the numbers are based on. It is for comparing foods; it is not a recommendation of how much to eat.'],
  cal: ['Calories', 'Energy in ONE serving. Eat two servings and you get double.'],
  dv: ['% Daily Value (%DV)', 'How much a serving contributes to a day\'s worth of that nutrient. As a rule of thumb, 5% DV or less is low and 20% DV or more is high.'],
  fat: ['Total fat', 'The %DV shows how much of a day\'s fat this serving provides, based on a 2,000-calorie reference.'],
  sat: ['Saturated fat', 'A nutrient to limit; the %DV helps you see whether a serving is low or high.'],
  sod: ['Sodium', 'A nutrient to limit. The Daily Value is 2,300 mg. Compare the %DV to the 5% and 20% benchmarks.'],
  carb: ['Total carbohydrate', 'Includes fiber, total sugars and added sugars.'],
  fiber: ['Dietary fiber', 'A nutrient most people want enough of. Compare the %DV to the benchmarks.'],
  sugars: ['Total sugars', 'Includes sugars that occur naturally (for example in milk or fruit) and added sugars. It has no %DV.'],
  added: ['Added sugars', 'Sugars and syrups added during processing. The Daily Value is 50 g. A nutrient to limit.'],
  protein: ['Protein', 'Grams of protein per serving.']
};
export function labelsim(host, ctx) {
  const p = ctx.stage.cfg.product, sim = ctx.sim;
  sim.servings = sim.servings || [1]; sim.regions = sim.regions || []; sim.n = sim.n || 1;
  const lab = labelFig(p, { regions: true, servings: sim.n });
  let dual = false;
  const rows = [['sod', 'Sodium', 'Limit'], ['added', 'Added sugars', 'Limit'], ['sat', 'Saturated fat', 'Limit'], ['fiber', 'Dietary fiber', 'Get enough']];
  const bars = h('div.dvbars', { role: 'group', 'aria-label': 'Percent Daily Value bars' }, rows.map(([k, name, tag]) => h('div.dvrow', { 'data-k': k }, h('span.nm', name, h('small', ' ' + tag)), h('div.track', h('i.m5'), h('i.m20'), h('div.fill')), h('span.pv', '0%'))));
  const cals = h('b.bigcal', '0'), servLabel = h('output.servout', '1 serving');
  const slider = h('input.range', { type: 'range', min: 0.5, max: 6, step: 0.5, value: sim.n, 'aria-label': 'Number of servings eaten' });
  const info = h('div.explain', { 'aria-live': 'polite' }, h('b', 'Click any part of the label'), h('p', 'to see what it means.'));
  const chips = h('div');
  function refresh(animate = true) {
    const n = Number(slider.value); sim.n = n;
    if (!sim.servings.includes(n)) sim.servings.push(n);
    servLabel.textContent = `${n} serving${n === 1 ? '' : 's'}`;
    lab.update(n); if (dual) lab.el.classList.add('dual'); tagRegions();
    countUp(cals, p.cal * n);
    bars.querySelectorAll('.dvrow').forEach((r) => {
      const k = r.dataset.k, pct = pctDV(k, p[k] * n), lvl = dvLevel(pct);
      r.querySelector('.fill').style.width = Math.min(100, pct) + '%'; r.querySelector('.fill').dataset.lvl = lvl;
      r.querySelector('.pv').textContent = pct + '% ' + (lvl === 'in between' ? '' : lvl);
    });
    check();
  }
  function tagRegions() {
    lab.el.querySelectorAll('[data-region]').forEach((n) => {
      n.setAttribute('role', 'button'); n.setAttribute('tabindex', '0');
      const k = n.dataset.region, e = EXPLAIN[k]; if (!e) return;
      n.setAttribute('aria-label', e[0] + ': click for an explanation');
      const go = () => { info.replaceChildren(h('b', e[0]), h('p', e[1])); if (!sim.regions.includes(k)) sim.regions.push(k); lab.el.querySelectorAll('.nf-reg').forEach((x) => x.classList.toggle('picked', x === n)); check(); };
      n.onclick = go; n.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } };
    });
  }
  function check() {
    const a = sim.servings.length >= 3, b = sim.regions.length >= 2;
    chips.replaceChildren(progressChips([[`Try 3 different serving amounts (${Math.min(3, sim.servings.length)}/3)`, a], [`Click 2 parts of the label (${Math.min(2, sim.regions.length)}/2)`, b]]));
    if (a && b && !sim.ready) { sim.ready = true; ctx.save(); ctx.markReady(); }
  }
  slider.addEventListener('input', () => refresh());
  const wholeBtn = h('button.btn.small', { type: 'button', onclick: () => { slider.value = Math.min(6, p.spc); refresh(); } }, 'Whole package');
  const oneBtn = h('button.btn.small', { type: 'button', onclick: () => { slider.value = 1; refresh(); } }, '1 serving');
  const front = h('div.fronttag', packageFig({ name: p.name, claims: [p.front], color: ['#c7d2e8', '#8a9cc4'], shape: 'box' }));
  const root = h('div.sim.labelsim', h('h3', p.name), h('div.simgrid',
    h('div.labelcol', lab.el),
    h('div.ctlcol', h('div.panel.flat', h('label', { for: 'serv-range' }, h('b', 'Servings eaten')), servLabel, slider, h('div.row', oneBtn, wholeBtn), h('div.calbox', cals, h('span', ' calories'))), front, bars, info, chips)));
  slider.id = 'serv-range';
  host.append(root); refresh();
  return { destroy() {} };
}

// ================================================================================== Grocery Comparison
export function grocery(host, ctx) {
  const { need, products } = ctx.stage.cfg, sim = ctx.sim; sim.flipped = sim.flipped || [];
  const cards = products.map((pr, i) => {
    let flipped = false;
    const front = h('div.face.front', packageFig({ name: pr.name, claims: pr.claims, color: pr.color, shape: i % 2 ? 'box' : 'bag' }));
    const row = (a, b, c) => h('tr', h('th', { scope: 'row' }, a), h('td', b), h('td.r', c || ''));
    const back = h('div.face.back', h('div.mini-nf', h('h4', 'Nutrition Facts'), h('p.small', `Serving size ${pr.serving}`),
      h('table', h('tbody', row('Calories', String(pr.cal)), row('Protein', pr.protein + ' g'), row('Carbohydrate', pr.carb + ' g'), row('Dietary fiber', pr.fiber + ' g', pctDV('fiber', pr.fiber) + '%'), row('Total sugars', pr.sugars + ' g'), row('Added sugars', pr.added + ' g', pctDV('added', pr.added) + '%'), row('Sodium', pr.sod + ' mg', pctDV('sod', pr.sod) + '%'), row('Calcium', '', pr.ca + '% DV'))),
      h('p.ingr', h('b', 'Ingredients: '), pr.ingredients)));
    const btn = h('button.btn.small', { type: 'button', 'aria-pressed': 'false' }, 'Flip to back');
    const card = h('div.gcard', h('div.flipper', front, back), h('div.gname', h('b', pr.name)), btn);
    back.setAttribute('aria-hidden', 'true');
    const flip = () => { flipped = !flipped; card.classList.toggle('flipped', flipped); btn.textContent = flipped ? 'Flip to front' : 'Flip to back'; btn.setAttribute('aria-pressed', flipped); front.setAttribute('aria-hidden', flipped); back.setAttribute('aria-hidden', !flipped);
      if (flipped && !sim.flipped.includes(pr.k)) { sim.flipped.push(pr.k); check(); } };
    btn.onclick = flip;
    if (sim.flipped.includes(pr.k)) card.dataset.seen = '1';
    return card;
  });
  const chips = h('div');
  function check() {
    const all = products.every((x) => sim.flipped.includes(x.k));
    chips.replaceChildren(progressChips([[`Inspect the back of every product (${sim.flipped.length}/${products.length})`, all]]));
    cards.forEach((c, i) => c.classList.toggle('seen', sim.flipped.includes(products[i].k)));
    if (all && !sim.ready) { sim.ready = true; ctx.save(); ctx.markReady(); }
  }
  host.append(h('div.sim.grocery', h('div.needbox', h('b', 'The need: '), need), h('div.gcards', cards), chips));
  check();
  return { destroy() {} };
}

// ================================================================================== Exercise Intensity Simulator
const PROFILES = [
  { k: 'stroll', name: 'Easy stroll', rpe: 2, per: 2.0, amp: 14, lean: 0, breath: 4.4, talk: '"I could sing this whole song!"', body: 'Breathing barely changes. Heart rate is only a little above resting.' },
  { k: 'brisk', name: 'Brisk walk uphill', rpe: 5, per: 1.1, amp: 24, lean: 3, breath: 3.0, talk: '"I can talk in sentences, but I couldn\'t sing."', body: 'Breathing is deeper and faster. You feel warm.' },
  { k: 'cycle', name: 'Steady cycling', rpe: 6, per: 0.9, amp: 18, lean: 8, breath: 2.5, talk: '"I can talk, but I pause for breath often."', body: 'Breathing is quick and noticeable. Legs feel the work.', bike: true },
  { k: 'jog', name: 'Fast jog', rpe: 7, per: 0.62, amp: 38, lean: 7, breath: 1.7, talk: '"I can say... only a few words... at a time."', body: 'Breathing is fast and deep. Sweating starts.' },
  { k: 'sprint', name: 'Sprint intervals', rpe: 9, per: 0.42, amp: 52, lean: 14, breath: 1.1, talk: '"I... can\'t... talk."', body: 'Breathing is very fast and hard. This level can only be kept up for a short time.' }
];
const BANDS = [[0, 4, 'Light 1–4', '#7ad7a0'], [5, 6, 'Moderate 5–6', '#f2c14e'], [7, 10, 'Vigorous 7–10', '#ff6b5b']];
function runner(profile) {
  const svg = S('svg', { viewBox: '0 0 260 200', class: 'runner', role: 'img', 'aria-label': `Animated figure doing: ${profile.name}` });
  const ground = S('g', {}, svg); S('line', { x1: 0, y1: 176, x2: 260, y2: 176, stroke: 'var(--line-strong)', 'stroke-width': 2 }, ground);
  for (let i = 0; i < 8; i++) S('line', { x1: 14 + i * 34, y1: 184, x2: 34 + i * 34, y2: 184, stroke: 'var(--line)', 'stroke-width': 2, class: 'dash', style: `animation-duration:${profile.per * 1.6}s` }, ground);
  const g = S('g', { transform: `translate(120 40) rotate(${profile.lean})`, style: `--amp:${profile.amp}deg;--per:${profile.per}s` }, svg);
  const limb = (cls, x, y, len, len2, delay) => { const outer = S('g', { transform: `translate(${x} ${y})` }, g), a = S('g', { class: cls, style: `animation-delay:${delay}s` }, outer); S('line', { x1: 0, y1: 0, x2: 0, y2: len, stroke: 'var(--accent)', 'stroke-width': 7, 'stroke-linecap': 'round' }, a); S('line', { x1: 0, y1: len, x2: 6, y2: len + len2, stroke: 'var(--accent)', 'stroke-width': 6, 'stroke-linecap': 'round' }, a); return a; };
  S('circle', { cx: 0, cy: -8, r: 14, fill: 'var(--accent-2)' }, g);
  S('line', { x1: 0, y1: 8, x2: 0, y2: 66, stroke: 'var(--accent)', 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
  if (profile.bike) {
    const w = S('g', { transform: 'translate(0 100)' }, svg); const bk = S('g', { transform: 'translate(120 40)' }, svg);
    [-52, 52].forEach((x) => { const wh = S('g', { transform: `translate(${x} 74)` }, bk); const spin = S('g', { class: 'spin', style: `animation-duration:${profile.per}s` }, wh); S('circle', { r: 30, fill: 'none', stroke: 'var(--ink-dim)', 'stroke-width': 4 }, spin); S('line', { x1: -30, x2: 30, y1: 0, y2: 0, stroke: 'var(--ink-dim)', 'stroke-width': 2 }, spin); S('line', { x1: 0, x2: 0, y1: -30, y2: 30, stroke: 'var(--ink-dim)', 'stroke-width': 2 }, spin); });
    S('path', { d: 'M-52 74 L-8 66 L52 74 M-8 66 L-14 40 L-34 44 M-8 66 L20 36 L30 36', stroke: 'var(--ink)', 'stroke-width': 4, fill: 'none', 'stroke-linejoin': 'round' }, bk);
  }
  limb('arm a1', 0, 14, 28, 22, 0); limb('arm a2', 0, 14, 28, 22, profile.per / -2);
  limb('leg l1', 0, 64, 40, 30, 0); limb('leg l2', 0, 64, 40, 30, profile.per / -2);
  return svg;
}
export function intensity(host, ctx) {
  const sim = ctx.sim; sim.tried = sim.tried || [];
  let cur = PROFILES[0];
  const figBox = h('div.figbox'), lung = h('div.lungs'), talk = h('div.talk'), body = h('p.bodytxt'), name = h('h3');
  const meter = h('div.rpe', { role: 'img', 'aria-label': 'Effort scale from 0 to 10' }, h('div.bands', BANDS.map(([a, b, l, c]) => h('div.band', { style: { flex: b - a + 1, background: c } }, h('span', l)))), h('div.needle'), h('div.rpeval'));
  const lungSvg = S('svg', { viewBox: '0 0 80 70', class: 'lungsvg', 'aria-hidden': 'true' });
  S('path', { d: 'M40 6 V34 M40 22 C26 18 12 26 8 48 C6 62 20 66 30 56 C38 48 38 36 40 30 M40 22 C54 18 68 26 72 48 C74 62 60 66 50 56 C42 48 42 36 40 30', fill: 'rgba(255,120,120,.28)', stroke: 'var(--accent-2)', 'stroke-width': 3 }, lungSvg);
  lung.append(lungSvg, h('div.lbl', h('small', 'Breathing')));
  const heart = h('div.heart', { 'aria-hidden': 'true' }, '♥');
  const chips = h('div');
  function show(p) {
    cur = p; if (!sim.tried.includes(p.k)) sim.tried.push(p.k);
    figBox.replaceChildren(runner(p)); name.textContent = p.name; talk.replaceChildren(h('b', 'Talk test'), h('div.bubble.big', p.talk)); body.textContent = p.body;
    lungSvg.style.animationDuration = p.breath + 's'; heart.style.animationDuration = Math.max(.35, p.breath / 3.2) + 's';
    meter.querySelector('.needle').style.left = (p.rpe / 10) * 100 + '%'; meter.querySelector('.rpeval').textContent = `Effort: ${p.rpe} / 10`;
    tabs.querySelectorAll('button').forEach((b) => { const on = b.dataset.k === p.k; b.setAttribute('aria-pressed', on); b.classList.toggle('on', on); b.classList.toggle('tried', sim.tried.includes(b.dataset.k)); });
    const ok = sim.tried.length >= 4;
    chips.replaceChildren(progressChips([[`Try 4 different activities (${Math.min(4, sim.tried.length)}/4)`, ok]]));
    if (ok && !sim.ready) { sim.ready = true; ctx.save(); ctx.markReady(); }
  }
  const tabs = h('div.ptabs', { role: 'group', 'aria-label': 'Choose an activity' }, PROFILES.map((p) => h('button.btn.small', { type: 'button', 'data-k': p.k, 'aria-pressed': 'false', onclick: () => show(p) }, p.name)));
  host.append(h('div.sim.intensity', h('div.legend2', h('b', 'Effort scale (0 to 10):'), ' 0 = sitting, 10 = maximum effort. Light about 1 to 4, moderate about 5 to 6, vigorous about 7 to 8 and above.'), tabs,
    h('div.simgrid', h('div.panel.flat.figpanel', name, figBox, h('div.vitals', lung, h('div.heartbox', heart, h('small', 'Heart'))), body), h('div.panel.flat', talk, meter, chips))));
  show(PROFILES[0]);
  return { destroy() {} };
}

// ================================================================================== Marketing Investigation (explore)
export function market(host, ctx) {
  const { explore } = ctx.stage.cfg, sim = ctx.sim; sim.seen = sim.seen || [];
  const names = { handle: 'Account', product: 'Product photo', photo: 'Before and after photos', claim: 'Headline claim', testimonial: 'Testimonial', badge: 'Seal or badge', code: 'Discount code', disclosure: 'Hashtags', missing: 'Product details' };
  const post = postFig(explore.post, { regions: true });
  const detail = h('div.detail', { 'aria-live': 'polite' }, h('b', 'Click any part of the post.'), h('p', 'Each part shows what is there and a question to ask yourself.'));
  const board = h('ul.board'), chips = h('div');
  function paintBoard() {
    board.replaceChildren(...sim.seen.map((k) => h('li', h('b', names[k] + ': '), explore.notes[k][1])));
    const ok = sim.seen.length >= 6;
    chips.replaceChildren(progressChips([[`Uncover 6 of the 9 parts (${Math.min(6, sim.seen.length)}/6)`, ok]]));
    if (ok && !sim.ready) { sim.ready = true; ctx.save(); ctx.markReady(); }
  }
  setTimeout(() => {
    post.querySelectorAll('[data-region]').forEach((n) => {
      const k = n.dataset.region; n.setAttribute('role', 'button'); n.setAttribute('tabindex', '0'); n.setAttribute('aria-label', names[k] + ': click to uncover');
      const go = () => { const [see, ask] = explore.notes[k]; detail.replaceChildren(h('b', names[k]), h('p', h('i', 'What is here: '), see), h('p.ask', h('i', 'Ask yourself: '), ask)); if (!sim.seen.includes(k)) { sim.seen.push(k); paintBoard(); } post.querySelectorAll('.post-reg').forEach((x) => x.classList.toggle('picked', x === n)); };
      n.onclick = go; n.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      if (sim.seen.includes(k)) n.classList.add('seen');
    });
  }, 0);
  const pq = h('ol.pqvd', ['PAUSE', 'QUESTION', 'VERIFY', 'DECIDE'].map((w) => h('li', w)));
  host.append(h('div.sim.market', h('div.simgrid', h('div.phone', post), h('div.ctlcol', detail, h('div.panel.flat', h('b', 'Your questions to ask'), board), chips, h('div.small.muted', 'Remember the process: ', pq)))));
  paintBoard();
  return { destroy() {} };
}

// ================================================================================== Food-system Resilience vs Efficiency
export function foodsys(host, ctx) {
  const sim = ctx.sim; sim.levels = sim.levels || [4]; sim.closed = sim.closed || 0; sim.level = sim.level || 4;
  const slider = h('input.range', { type: 'range', min: 1, max: 10, step: 1, value: sim.level, 'aria-label': 'Consolidation level from 1 (many small plants) to 10 (a few large plants)' });
  const out = { level: h('output.big'), n: h('b'), cost: h('b'), loss: h('b') };
  const svg = S('svg', { viewBox: '0 0 560 150', class: 'plants', role: 'img', 'aria-label': 'Processing plants in the region' });
  const supply = h('div.supply', h('div.supplyfill'));
  const chips = h('div'), note = h('p.simnote', { 'aria-live': 'polite' });
  let closedIdx = -1;
  const model = (lvl) => { const n = 13 - lvl; return { n, cost: Math.round(100 - (lvl - 1) * 3.5), loss: Math.round(1000 / n) / 10 }; };
  function draw() {
    const lvl = Number(slider.value), m = model(lvl); sim.level = lvl; if (!sim.levels.includes(lvl)) sim.levels.push(lvl);
    svg.replaceChildren(); closedIdx = -1;
    const w = 520 / m.n;
    for (let i = 0; i < m.n; i++) {
      const g = S('g', { class: 'plant', 'data-i': i }, svg), bw = Math.min(70, w - 8), x = 20 + i * w + (w - bw) / 2, hh = 40 + Math.min(70, 520 / m.n / 4);
      S('rect', { x, y: 130 - hh, width: bw, height: hh, rx: 5, fill: 'var(--accent)', 'fill-opacity': .85 }, g);
      S('rect', { x: x + bw * .15, y: 130 - hh - 14, width: bw * .18, height: 14, fill: 'var(--accent-2)' }, g);
      S('rect', { x: x + bw * .6, y: 130 - hh * .7, width: bw * .22, height: hh * .3, fill: 'rgba(255,255,255,.5)' }, g);
    }
    S('line', { x1: 10, y1: 130, x2: 550, y2: 130, stroke: 'var(--line-strong)', 'stroke-width': 2 }, svg);
    countUp(out.n, m.n); countUp(out.cost, m.cost, (x) => String(Math.round(x))); out.level.textContent = `Level ${lvl}`; out.loss.textContent = '—';
    supply.querySelector('.supplyfill').style.width = '100%'; note.textContent = '';
    check();
  }
  function closeLargest() {
    const lvl = Number(slider.value), m = model(lvl);
    const first = svg.querySelector('.plant'); if (!first) return;
    first.classList.add('closed'); first.querySelectorAll('rect').forEach((r) => r.setAttribute('fill', '#555'));
    out.loss.textContent = m.loss + '% of supply lost'; supply.querySelector('.supplyfill').style.width = (100 - m.loss) + '%';
    note.textContent = `The largest of ${m.n} plants closed. The region lost ${m.loss}% of its processing capacity.`;
    sim.closed = (sim.closed || 0) + 1; check();
  }
  function check() {
    const a = sim.levels.length >= 3, b = sim.closed >= 1;
    chips.replaceChildren(progressChips([[`Try 3 consolidation levels (${Math.min(3, sim.levels.length)}/3)`, a], ['Close the largest plant at least once', b]]));
    if (a && b && !sim.ready) { sim.ready = true; ctx.save(); ctx.markReady(); }
  }
  slider.addEventListener('input', draw);
  host.append(h('div.sim.foodsys', h('p.simnote', 'A region\'s food is processed in a number of equal-size plants. "Consolidation" means fewer, larger companies and plants.'),
    h('div.simgrid', h('div.panel.flat', h('label', { for: 'cons' }, h('b', 'Consolidation')), h('div.sliderrow', h('span', 'Many small'), slider, h('span', 'Few large')), out.level, svg, h('div.row', h('button.btn.warn', { type: 'button', onclick: closeLargest }, 'Close the largest plant'), h('button.btn.small', { type: 'button', onclick: draw }, 'Reset plants'))),
      h('div.panel.flat', h('dl.metrics', h('div', h('dt', 'Number of plants'), h('dd', out.n)), h('div', h('dt', 'Cost per unit of processed food (index, 100 = start)'), h('dd', out.cost)), h('div', h('dt', 'After the closure'), h('dd', out.loss))), h('div.supplywrap', h('small', 'Regional supply available'), supply), note, chips))));
  slider.id = 'cons'; draw();
  return { destroy() {} };
}

export const SCENES = { labelsim, grocery, intensity, market, foodsys };
