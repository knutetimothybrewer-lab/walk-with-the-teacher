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
  { k: 'stroll', name: 'Easy stroll', rpe: 2, gait: 'walk', f: 0.75, A: 15, K: 26, arm: 12, elbow: 12, lean: 1, breath: 4.4, talk: '"I could sing this whole song!"', body: 'Breathing barely changes. Heart rate is only a little above resting.' },
  { k: 'brisk', name: 'Brisk walk', rpe: 5, gait: 'walk', f: 1.05, A: 25, K: 40, arm: 24, elbow: 28, lean: 5, breath: 3.0, talk: '"I can talk in sentences, but I couldn\'t sing."', body: 'Breathing is deeper and faster. You feel warm.' },
  { k: 'cycle', name: 'Steady cycling', rpe: 6, gait: 'bike', f: 1.15, breath: 2.5, talk: '"I can talk, but I pause for breath often."', body: 'Breathing is quick and noticeable. Legs feel the work.' },
  { k: 'jog', name: 'Fast jog', rpe: 7, gait: 'run', f: 1.45, A: 36, K: 88, arm: 40, elbow: 82, lean: 9, breath: 1.7, talk: '"I can say... only a few words... at a time."', body: 'Breathing is fast and deep. Sweating starts.' },
  { k: 'sprint', name: 'Sprint intervals', rpe: 9, gait: 'run', f: 2.0, A: 52, K: 108, arm: 58, elbow: 92, lean: 18, breath: 1.1, talk: '"I... can\'t... talk."', body: 'Breathing is very fast and hard. This level can only be kept up for a short time.' }
];
const BANDS = [[0, 4, 'Light 1–4', '#7ad7a0'], [5, 6, 'Moderate 5–6', '#f2c14e'], [7, 10, 'Vigorous 7–10', '#ff6b5b']];

// ---- animated figure --------------------------------------------------------------------------------------------
// A real skeleton (hip, knee, ankle, shoulder, elbow, wrist) driven by a gait phase and redrawn every display frame with
// requestAnimationFrame, so motion is smooth at any refresh rate. Walking and running use a simple gait model; cycling uses
// two-bone inverse kinematics so the feet really follow the pedals around the crank.
const RAD = Math.PI / 180, GROUND = 172, L1 = 40, L2 = 40, U1 = 24, U2 = 22, BL = 44;
const pt = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
/** Two-bone inverse kinematics: joint position between origin A and target B. dir = -1 bends toward +x/up, +1 toward -x/down. */
function ik(A, B, l1, l2, dir) {
  const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01), base = Math.atan2(dy, dx);
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  return [A[0] + l1 * Math.cos(base + dir * a), A[1] + l1 * Math.sin(base + dir * a)];
}
function runner(profile) {
  const svg = S('svg', { viewBox: '0 0 260 200', class: 'runner', role: 'img', 'aria-label': `Animated figure doing: ${profile.name}` });
  const ground = S('g', {}, svg); S('line', { x1: 0, y1: GROUND + 2, x2: 260, y2: GROUND + 2, stroke: 'var(--line-strong)', 'stroke-width': 2 }, ground);
  const dashes = []; for (let i = 0; i < 9; i++) dashes.push(S('line', { y1: GROUND + 11, y2: GROUND + 11, stroke: 'var(--line)', 'stroke-width': 2, 'stroke-linecap': 'round' }, ground));
  const bikeG = S('g', {}, svg), far = S('g', { opacity: 0.5 }, svg), body = S('g', {}, svg);
  const line = (parent, w, color) => S('polyline', { fill: 'none', stroke: color || 'var(--accent)', 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
  const farLeg = line(far, 8), farArm = line(far, 6.5), torso = line(body, 10), nearLeg = line(body, 8), nearArm = line(body, 6.5), head = S('circle', { r: 12, fill: 'var(--accent-2)' }, body);
  const isBike = profile.gait === 'bike';
  // bicycle (drawn once; wheels and crank are redrawn each frame)
  const R = [60, GROUND - 36], F = [188, GROUND - 36], BB = [112, GROUND - 32], SEAT = [100, GROUND - 76], HT = [170, GROUND - 70], GRIP = [182, GROUND - 82], CR = 17, WR = 36;
  let wheels = [], crank = null, pedals = [];
  if (isBike) {
    const ink = 'var(--ink-dim)';
    const frame = S('g', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, bikeG);
    S('polyline', { points: [R, BB, HT, SEAT, BB].map((q) => pt(...q)).join(' ') }, frame); S('polyline', { points: [R, SEAT].map((q) => pt(...q)).join(' ') }, frame);
    S('polyline', { points: [HT, F].map((q) => pt(...q)).join(' ') }, frame); S('polyline', { points: [HT, [HT[0] + 5, HT[1] - 14], GRIP].map((q) => pt(...q)).join(' ') }, frame);
    S('line', { x1: SEAT[0] - 9, y1: SEAT[1] - 3, x2: SEAT[0] + 9, y2: SEAT[1] - 3, stroke: 'var(--ink)', 'stroke-width': 6, 'stroke-linecap': 'round' }, bikeG);
    wheels = [R, F].map((c) => { const g = S('g', {}, bikeG); S('circle', { cx: c[0], cy: c[1], r: WR, fill: 'none', stroke: ink, 'stroke-width': 4 }, g); const sp = []; for (let i = 0; i < 6; i++) sp.push(S('line', { stroke: ink, 'stroke-width': 1.6 }, g)); S('circle', { cx: c[0], cy: c[1], r: 4, fill: ink }, g); return { c, sp }; });
    crank = S('line', { stroke: 'var(--ink)', 'stroke-width': 4, 'stroke-linecap': 'round' }, bikeG);
    pedals = [S('line', { stroke: 'var(--ink)', 'stroke-width': 5, 'stroke-linecap': 'round' }, bikeG), S('line', { stroke: 'var(--ink)', 'stroke-width': 5, 'stroke-linecap': 'round' }, bikeG)];
  }
  const foot = (ank, ang, dir = 1) => [ank[0] + dir * 11 * Math.cos(ang), ank[1] + 11 * Math.sin(ang)];

  function pose(t) {
    const phi = 2 * Math.PI * profile.f * t;
    if (isBike) {
      const HIP = [SEAT[0] - 6, SEAT[1] - 8], SH = [HIP[0] + 56 * Math.sin(40 * RAD), HIP[1] - 56 * Math.cos(40 * RAD) + 2];
      const al = phi, P = [[BB[0] + CR * Math.cos(al), BB[1] + CR * Math.sin(al)], [BB[0] - CR * Math.cos(al), BB[1] - CR * Math.sin(al)]];
      crank.setAttribute('x1', P[0][0]); crank.setAttribute('y1', P[0][1]); crank.setAttribute('x2', P[1][0]); crank.setAttribute('y2', P[1][1]);
      P.forEach((q, i) => { pedals[i].setAttribute('x1', q[0] - 7); pedals[i].setAttribute('x2', q[0] + 7); pedals[i].setAttribute('y1', q[1]); pedals[i].setAttribute('y2', q[1]); });
      const ang = phi * 2.3; // wheels turn faster than the crank (gearing)
      wheels.forEach((w) => w.sp.forEach((l, i) => { const a = ang + i * Math.PI / 3; l.setAttribute('x1', w.c[0] - WR * 0.93 * Math.cos(a)); l.setAttribute('y1', w.c[1] - WR * 0.93 * Math.sin(a)); l.setAttribute('x2', w.c[0] + WR * 0.93 * Math.cos(a)); l.setAttribute('y2', w.c[1] + WR * 0.93 * Math.sin(a)); }));
      const legPts = (pd) => { const ank = [pd[0] - 1, pd[1] - 3], knee = ik(HIP, ank, BL, BL, -1); return `${pt(...HIP)} ${pt(...knee)} ${pt(...ank)} ${pt(ank[0] + 11, ank[1] + 2)}`; };
      farLeg.setAttribute('points', legPts(P[1])); nearLeg.setAttribute('points', legPts(P[0]));
      const el = ik(SH, GRIP, 31, 31, 1), elbowFar = ik([SH[0] - 2, SH[1]], [GRIP[0] - 3, GRIP[1] + 1], 31, 31, 1);
      nearArm.setAttribute('points', `${pt(...SH)} ${pt(...el)} ${pt(...GRIP)}`); farArm.setAttribute('points', `${pt(SH[0] - 2, SH[1])} ${pt(...elbowFar)} ${pt(GRIP[0] - 3, GRIP[1] + 1)}`);
      torso.setAttribute('points', `${pt(...HIP)} ${pt(...SH)}`); head.setAttribute('cx', SH[0] + 8); head.setAttribute('cy', SH[1] - 14 + Math.sin(phi * 2) * 0.6);
      const v = 2 * Math.PI * profile.f * 2.3 * WR * 0.9, spacing = 36; const off = (t * v) % spacing; dashes.forEach((d, i) => { const x = 260 - ((i * spacing + off) % (9 * spacing)); d.setAttribute('x1', x); d.setAttribute('x2', x + 18); });
      return;
    }
    const { A, K, arm, elbow, lean } = profile, Ar = A * RAD, Kmin = 5 * RAD, Kamp = (K - 5) * RAD;
    const leg = (ph) => { const th = Ar * Math.sin(ph), kn = Kmin + Kamp * Math.pow(0.5 + 0.5 * Math.cos(ph - 0.35), 2); return { th, kn, ankY: L1 * Math.cos(th) + L2 * Math.cos(th - kn) }; };
    const a = leg(phi), b = leg(phi + Math.PI);
    const hipY = GROUND - 4 - Math.max(a.ankY, b.ankY), hip = [130, hipY];
    const drawLeg = (l, el) => { const knee = [hip[0] + L1 * Math.sin(l.th), hip[1] + L1 * Math.cos(l.th)], ank = [knee[0] + L2 * Math.sin(l.th - l.kn), knee[1] + L2 * Math.cos(l.th - l.kn)], ft = foot(ank, -0.3 * (l.th - l.kn)); el.setAttribute('points', `${pt(...hip)} ${pt(...knee)} ${pt(...ank)} ${pt(...ft)}`); };
    drawLeg(a, nearLeg); drawLeg(b, farLeg);
    const lr = lean * RAD, TL = 48, SH = [hip[0] + TL * Math.sin(lr), hip[1] - TL * Math.cos(lr)];
    const drawArm = (ph, el) => { const th = -(arm * RAD) * Math.sin(ph), fl = elbow * RAD + (th > 0 ? th * 0.3 : 0), e = [SH[0] + U1 * Math.sin(th), SH[1] + U1 * Math.cos(th)], w = [e[0] + U2 * Math.sin(th + fl), e[1] + U2 * Math.cos(th + fl)]; el.setAttribute('points', `${pt(...SH)} ${pt(...e)} ${pt(...w)}`); };
    drawArm(phi + Math.PI, nearArm); drawArm(phi, farArm);
    torso.setAttribute('points', `${pt(...hip)} ${pt(...SH)}`); head.setAttribute('cx', SH[0] + 11 * Math.sin(lr + 0.25)); head.setAttribute('cy', SH[1] - 14 * Math.cos(lr) - 2);
    const v = 2 * Math.PI * profile.f * (L1 + L2) * Ar * 0.95, spacing = 34, off = (t * v) % spacing; dashes.forEach((d, i) => { const x = 260 - ((i * spacing + off) % (9 * spacing)); d.setAttribute('x1', x); d.setAttribute('x2', x + 16); });
  }
  let raf = 0, t0 = 0, frames = 0, alive = true;
  const calm = reducedMotion();
  const tick = (now) => {
    if (!alive) return; frames++;
    if (frames > 3 && !svg.isConnected) { alive = false; return; }
    if (!t0) t0 = now; pose((now - t0) / 1000); raf = requestAnimationFrame(tick);
  };
  pose(0.18); // a sensible still pose first (also used when motion is reduced)
  if (!calm) raf = requestAnimationFrame(tick);
  svg._stop = () => { alive = false; cancelAnimationFrame(raf); };
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
    if (figBox.firstChild && figBox.firstChild._stop) figBox.firstChild._stop();
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
  return { destroy() { if (figBox.firstChild && figBox.firstChild._stop) figBox.firstChild._stop(); } };
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
