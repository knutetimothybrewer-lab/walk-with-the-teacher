// Interactive scenes: each is an educational model that produces evidence students must interpret.
import { h, rng, shuffled, seedFrom, reducedMotion, sleep } from './util.js';
import { createChart, CHARTS } from './charts.js';
import { simulate, band, BODY, WINDOWS } from './bacmodel.js';
import { runChat, METERS, METER_LABEL, TAG_LABEL } from './chatmodel.js';
import { icon } from './visuals.js';
import { sfx } from './sound.js';

const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };

// =====================================================================================================
// Scene 'synapse': two panels, animated particle model of dopamine signaling
// =====================================================================================================
function synapsePanel(blocked) {
  const svg = S('svg', { viewBox: '0 0 320 270', role: 'img', 'aria-label': blocked ? 'Panel B: dopamine lingers in the synapse because its clearing is slowed.' : 'Panel A: typical signaling. Dopamine crosses the synapse, binds receptors, and is cleared.' });
  svg.innerHTML = `
    <defs><linearGradient id="g${blocked ? 'b' : 'a'}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2a2370"/><stop offset="1" stop-color="#191452"/></linearGradient></defs>
    <path d="M30 0 H290 V62 C290 96 262 104 240 104 H80 C58 104 30 96 30 62 Z" fill="#3b2f8f" stroke="#a58bff" stroke-width="2"/>
    <text x="42" y="22" font-size="11" fill="#cfc6ff">Sending neuron</text>
    <path d="M30 270 V196 C30 176 52 168 74 168 H246 C268 168 290 176 290 196 V270 Z" fill="#1d4a78" stroke="#59c4ff" stroke-width="2"/>
    <text x="42" y="258" font-size="11" fill="#bfe3ff">Receiving neuron</text>
    ${[0, 1, 2].map((i) => `<circle cx="${70 + i * 90}" cy="46" r="13" fill="#6b57c9" stroke="#bda9ff"/><circle cx="${66 + i * 90}" cy="44" r="2.6" fill="#ffd36e"/><circle cx="${74 + i * 90}" cy="48" r="2.6" fill="#ffd36e"/>`).join('')}`;
  const tpos = [90, 160, 230], rpos = [60, 120, 180, 240];
  tpos.forEach((x) => { S('rect', { x: x - 9, y: 98, width: 18, height: 10, rx: 3, fill: blocked ? '#7a2c3b' : '#59c4ff' }, svg); if (blocked) { S('path', { d: `M${x - 7} 96 l14 14 M${x + 7} 96 l-14 14`, stroke: '#ff8a7a', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg); } });
  const rec = rpos.map((x) => S('path', { d: `M${x - 13} 168 C${x - 13} 182 ${x + 13} 182 ${x + 13} 168`, fill: 'none', stroke: '#9bd6ff', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg));
  S('text', { x: 160, y: 138, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#aab5d6' }, svg).textContent = blocked ? 'Clearing slowed (transporters blocked)' : 'Transporters clear dopamine';
  const g = S('g', {}, svg);
  return { svg, g, rec, tpos, rpos };
}
function makeSynapseSim(blocked, rand) {
  const panel = synapsePanel(blocked), P = [], dots = [];
  let acts = [], t = 0, burstT = 2.0;
  const spawn = () => { for (let i = 0; i < 9; i++) { if (P.length > 70) break; const x = 60 + rand() * 200; P.push({ x, y: 96 + rand() * 6, vx: (rand() - .5) * 30, vy: 20 + rand() * 20, st: 'free', timer: 0, rec: -1 }); } };
  const recBusy = panel.rpos.map(() => 0);
  function step(dt) {
    t += dt; burstT += dt; if (burstT > 2.3) { burstT = 0; spawn(); }
    for (const p of P) {
      if (p.st === 'free') {
        p.vx += (rand() - .5) * 220 * dt; p.vy += (rand() - .5) * 220 * dt; p.vx *= .96; p.vy *= .96;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 24) { p.x = 24; p.vx = Math.abs(p.vx); } if (p.x > 296) { p.x = 296; p.vx = -Math.abs(p.vx); }
        if (p.y < 110) { p.y = 110; p.vy = Math.abs(p.vy); } if (p.y > 163) { p.y = 163; p.vy = -Math.abs(p.vy); }
        if (p.y > 150) panel.rpos.forEach((rx, i) => { if (p.st === 'free' && recBusy[i] <= 0 && Math.abs(p.x - rx) < 16) { p.st = 'bound'; p.timer = .7; p.x = rx; p.y = 166; recBusy[i] = .7; p.rec = i; acts.push(t); } });
      } else if (p.st === 'bound') {
        p.timer -= dt; if (p.timer <= 0) { recBusy[p.rec] = 0; if (blocked) { p.st = 'free'; p.vy = -40; } else { p.st = 'clear'; } }
      } else if (p.st === 'clear') {
        const tx = panel.tpos.reduce((b, x) => (Math.abs(x - p.x) < Math.abs(b - p.x) ? x : b)); p.x += Math.sign(tx - p.x) * Math.min(Math.abs(tx - p.x), 90 * dt); p.y -= 90 * dt; if (p.y < 106) p.dead = true;
      }
    }
    for (let i = P.length - 1; i >= 0; i--) if (P[i].dead) P.splice(i, 1);
    recBusy.forEach((v, i) => { if (v > 0) recBusy[i] = v - dt; });
    acts = acts.filter((a) => t - a < 10);
  }
  function paint() {
    while (dots.length < P.length) { const c = S('circle', { r: 4.2, fill: '#ffd36e', stroke: '#fff4c9', 'stroke-width': .8 }, panel.g); dots.push(c); }
    while (dots.length > P.length) dots.pop().remove();
    P.forEach((p, i) => { dots[i].setAttribute('cx', p.x.toFixed(1)); dots[i].setAttribute('cy', p.y.toFixed(1)); });
    panel.rec.forEach((r, i) => { const on = recBusy[i] > 0; r.setAttribute('stroke', on ? '#ffe27a' : '#9bd6ff'); r.setAttribute('stroke-width', on ? 6 : 4); });
  }
  return { panel, step, paint, count: () => acts.length, total: () => acts.length, reset() { P.length = 0; acts = []; t = 0; burstT = 2.0; } };
}
export function sceneSynapse(host, ctx) {
  const rand = rng(seedFrom('syn|' + ctx.session.state.seed));
  const A = makeSynapseSim(false, rand), B = makeSynapseSim(true, rand);
  const cA = h('span.count', '0'), cB = h('span.count', '0');
  const figA = h('figure', A.panel.svg, h('figcaption', h('span', 'A: Typical signaling'), h('span', 'Activations (10 s): ', cA)));
  const figB = h('figure', B.panel.svg, h('figcaption', h('span', 'B: Substance X present'), h('span', 'Activations (10 s): ', cB)));
  let raf = null, last = 0, playing = true;
  const pbtn = h('button.btn.small.ghost', { type: 'button', onclick: () => toggle() }, icon('pause', 16), ' Pause');
  const rbtn = h('button.btn.small.ghost', { type: 'button', onclick: () => { A.reset(); B.reset(); if (reducedMotion()) fast(); } }, icon('reload', 16), ' Restart');
  function toggle(v) { playing = v ?? !playing; pbtn.replaceChildren(icon(playing ? 'pause' : 'play', 16), playing ? ' Pause' : ' Play'); if (playing) loop(); }
  function frame(now) { if (!playing) return; const dt = Math.min(.05, (now - last) / 1000 || .016); last = now; A.step(dt); B.step(dt); A.paint(); B.paint(); cA.textContent = A.count(); cB.textContent = B.count(); raf = requestAnimationFrame(frame); }
  function loop() { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); }
  function fast() { A.reset(); B.reset(); for (let i = 0; i < 1500; i++) { A.step(.02); B.step(.02); } A.paint(); B.paint(); cA.textContent = A.count(); cB.textContent = B.count(); }
  host.append(h('div.sim', h('h3', ctx.stage.title), h('p.lead', ctx.stage.lead), h('div.syn-panels', figA, figB),
    h('div.row', { style: { marginTop: '.6rem' } }, pbtn, rbtn, h('span.small.muted', 'Yellow dots are dopamine. Receptors glow when dopamine binds. A simplified, illustrative model.'))));
  if (reducedMotion()) { toggle(false); fast(); } else loop();
  return { destroy() { cancelAnimationFrame(raf); } };
}

// =====================================================================================================
// Scene 'chart'
// =====================================================================================================
export function sceneChart(host, ctx) {
  const def = JSON.parse(JSON.stringify(CHARTS[ctx.stage.cfg.chart]));
  const cfg = ctx.stage.cfg;
  const gate = cfg.hideUntil;
  const box = h('div.sim', h('h3', ctx.stage.title), h('p.lead', ctx.stage.lead));
  const cwrap = h('div'); box.append(cwrap); host.append(box);
  const hidden = gate && !ctx.isDone(gate);
  const ch = createChart(cwrap, def, { hideAfter: hidden ? cfg.hideAfter : null });
  return { onPartDone(qid) { if (gate && qid === gate) { ch.setHideAfter(null, true); } }, destroy() {} };
}

// =====================================================================================================
// Scene 'reaction': Simulation A
// =====================================================================================================
const MODEL_DELAY_MS = 300, TRIALS = 5;
export function sceneReaction(host, ctx) {
  const sim = ctx.sim; sim.phase = sim.phase || 'intro'; sim.base = sim.base || []; sim.model = sim.model || [];
  const box = h('div.sim', h('h3', ctx.stage.title), h('p.lead', ctx.stage.lead));
  const body = h('div'); box.append(body); host.append(box);
  let timers = [], anim = null;
  const clear = () => { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(anim); };
  const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);

  function road(modelMode) {
    const svg = S('svg', { viewBox: '0 0 600 250', role: 'img', 'aria-label': 'A car on a road. When a ball rolls into the road, press the brake button.' });
    svg.innerHTML = `<rect width="600" height="250" fill="#0a0f1a"/><rect y="150" width="600" height="100" fill="#1b2335"/><path d="M0 200 H600" stroke="#cdd6ea" stroke-width="3" stroke-dasharray="26 22" opacity=".6"/>
      <g id="car" transform="translate(70 118)"><rect x="0" y="22" width="108" height="34" rx="9" fill="#5aa0ff"/><path d="M22 22 L40 3 H78 L92 22Z" fill="#7fb8ff"/><circle cx="26" cy="58" r="11" fill="#111"/><circle cx="82" cy="58" r="11" fill="#111"/><rect id="brake" x="-3" y="30" width="7" height="14" rx="2" fill="#5a1d1d"/></g>
      <g id="ball" opacity="0" transform="translate(440 150)"><circle r="16" fill="#ffb347" stroke="#fff3cf" stroke-width="2"/><path d="M-16 0 H16 M0 -16 V16" stroke="#8a4b00" stroke-width="2"/></g>
      <g id="warn" opacity="0"><circle cx="440" cy="132" r="34" fill="none" stroke="#ff5d6e" stroke-width="4"/><text x="440" y="60" text-anchor="middle" fill="#ff8a7a" font-size="22" font-weight="800">BRAKE!</text></g>`;
    return svg;
  }
  function trials(phase) {
    const arr = sim[phase];
    body.replaceChildren();
    const isModel = phase === 'model';
    const stage = h('div.react-stage'); const svg = road(isModel); const msg = h('div.react-msg', 'Press Start. Wait for the ball to roll into the road, then brake as fast as you can.');
    const go = h('button.btn.primary.react-go', { type: 'button' }, arr.length ? 'Start next trial' : 'Start trial');
    stage.append(svg, msg, go);
    const tr = h('div.trials', { 'aria-label': 'Trial results' });
    const paintTr = () => tr.replaceChildren(...Array.from({ length: TRIALS }, (_, i) => h('span' + (arr[i] != null ? '.done' : ''), arr[i] != null ? `${i + 1}: ${arr[i]} ms` : `Trial ${i + 1}`)));
    const next = h('button.btn.primary', { type: 'button', hidden: true }, isModel ? 'See the comparison' : 'Next: modeled slower processing');
    next.onclick = () => { sim.phase = isModel ? 'compare' : 'model'; ctx.save(); render(); };
    paintTr();
    body.append(h('p.small.muted', isModel ? `Part 2 of 2: the same task with a modeled ${MODEL_DELAY_MS} ms processing delay added to your response. The delay is a model, not a measurement of anyone's body.` : 'Part 1 of 2: your baseline. Use the button, or press the space bar.'), stage, tr, next);
    if (arr.length >= TRIALS) { go.hidden = true; next.hidden = false; msg.textContent = `Average: ${avg(arr)} ms.`; }
    let state = 'idle', t0 = 0;
    const brake = svg.querySelector('#brake'), ball = svg.querySelector('#ball'), warn = svg.querySelector('#warn');
    function startTrial() {
      state = 'wait'; go.textContent = 'Brake!'; go.classList.remove('primary'); msg.textContent = 'Wait… keep your eyes on the road.';
      ball.setAttribute('opacity', 0); warn.setAttribute('opacity', 0); brake.setAttribute('fill', '#5a1d1d');
      timers.push(setTimeout(() => { state = 'go'; ball.setAttribute('opacity', 1); warn.setAttribute('opacity', 1); msg.textContent = ''; t0 = performance.now(); }, 1400 + Math.random() * 2200));
    }
    function press() {
      if (state === 'idle') { startTrial(); return; }
      if (state === 'wait') { clear(); state = 'idle'; msg.textContent = 'Too early. That trial does not count. Press Start to try again.'; go.textContent = 'Start trial'; go.classList.add('primary'); return; }
      if (state === 'go') {
        const raw = performance.now() - t0; state = 'done'; const rt = Math.round(raw + (isModel ? MODEL_DELAY_MS : 0));
        const show = () => { brake.setAttribute('fill', '#ff3b4d'); };
        if (isModel) timers.push(setTimeout(show, MODEL_DELAY_MS)); else show();
        arr.push(rt); ctx.save(); paintTr();
        msg.textContent = isModel ? `Your response time: ${Math.round(raw)} ms + ${MODEL_DELAY_MS} ms modeled delay = ${rt} ms.` : `Your response time: ${rt} ms.`;
        if (arr.length >= TRIALS) { go.hidden = true; next.hidden = false; next.focus(); } else { go.textContent = 'Start next trial'; go.classList.add('primary'); state = 'idle'; }
      }
    }
    go.onclick = press;
    stage.addEventListener('pointerdown', (e) => { if (e.target === go || go.contains(e.target)) return; if (state === 'go' || state === 'wait') press(); });
    const key = (e) => { if (e.code === 'Space' && body.isConnected && (state === 'go' || state === 'wait' || state === 'idle') && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); press(); } };
    window.addEventListener('keydown', key);
    cleanKeys.push(() => window.removeEventListener('keydown', key));
  }
  let cleanKeys = [];
  const flush = () => { cleanKeys.forEach((f) => f()); cleanKeys = []; };

  function compare() {
    const b = avg(sim.base), m = avg(sim.model);
    body.replaceChildren();
    const speeds = [25, 45, 65], fps = (mph) => mph * 1.46667, mu = 0.7, g = 32.17;
    const rows = speeds.map((mph) => { const v = fps(mph); return [mph, Math.round(v * b / 1000), Math.round(v * m / 1000), Math.round(v * (m - b) / 1000)]; });
    const bars = h('div.compare-bars', h('div.brow', h('span', 'Your baseline'), h('div.btrack', h('div.bfill')), h('span', b + ' ms')), h('div.brow', h('span', 'Modeled slower processing'), h('div.btrack', h('div.bfill.alt')), h('span', m + ' ms')));
    const fills = bars.querySelectorAll('.bfill'); const mx = Math.max(b, m);
    setTimeout(() => { fills[0].style.width = (b / mx * 100) + '%'; fills[1].style.width = (m / mx * 100) + '%'; }, 60);
    const tbl = h('table.data', h('caption', 'Feet traveled before braking begins (speed × response time)'), h('thead', h('tr', h('th', 'Speed'), h('th', 'Baseline'), h('th', 'Modeled'), h('th', 'Extra distance'))), h('tbody', rows.map((r) => h('tr', h('td', r[0] + ' mph'), h('td', r[1] + ' ft'), h('td', r[2] + ' ft'), h('td', '+' + r[3] + ' ft')))));
    // stopping animation at 45 mph
    const v = fps(45), a = mu * g, brk = (v * v) / (2 * a);
    const D = (v * b / 1000) + brk + 12;
    const lane = (label, rt) => {
      const svg = S('svg', { viewBox: '0 0 600 86', role: 'img', 'aria-label': label });
      const sc = 3.6, x0 = 20;
      svg.innerHTML = `<rect y="40" width="600" height="46" fill="#1b2335"/><path d="M0 63 H600" stroke="#cdd6ea" stroke-dasharray="14 12" opacity=".4"/><g id="car" transform="translate(${x0} 14)"><rect width="46" height="18" rx="5" y="12" fill="#5aa0ff"/><path d="M9 12 L16 2 H32 L38 12Z" fill="#7fb8ff"/><circle cx="11" cy="31" r="5" fill="#111"/><circle cx="35" cy="31" r="5" fill="#111"/></g><g transform="translate(${x0 + 46 + D * sc} 44)"><circle r="9" fill="#ffb347"/></g>`;
      const car = svg.querySelector('#car'), res = h('div.cap');
      return { svg, car, res, rt, sc, x0 };
    };
    const lanes = [lane('Lane 1: your baseline response', b), lane('Lane 2: modeled slower processing', m)];
    const wrapLanes = h('div.lanes', lanes.map((l, i) => h('div.lane', h('div.cap', i ? 'Modeled slower processing (+' + MODEL_DELAY_MS + ' ms)' : 'Your baseline'), l.svg, l.res)));
    function play() {
      clear(); const start = performance.now();
      const info = lanes.map((l) => { const dr = v * l.rt / 1000, tr = l.rt / 1000, tb = v / a, total = dr + brk, hit = total > D; return { l, dr, tr, tb, total, hit, stop: Math.min(total, D) }; });
      const pos = (inf, t) => { if (t < inf.tr) return v * t; const tt = t - inf.tr; const d = inf.dr + v * Math.min(tt, inf.tb) - 0.5 * a * Math.min(tt, inf.tb) ** 2; return Math.min(d, inf.stop); };
      function f(now) { const t = (now - start) / 1000 * (reducedMotion() ? 50 : 1); info.forEach((inf) => { inf.l.car.setAttribute('transform', `translate(${inf.l.x0 + pos(inf, t) * inf.l.sc} 14)`); }); if (t < 4.2) anim = requestAnimationFrame(f); else info.forEach((inf) => { inf.l.res.textContent = inf.hit ? `In this model, the car reaches the obstacle while still moving at about ${Math.round(Math.sqrt(Math.max(0, v * v - 2 * a * (D - inf.dr))) / 1.46667)} mph.` : `In this model, the car stops about ${Math.round(D - inf.total)} ft before the obstacle.`; }); }
      anim = requestAnimationFrame(f);
    }
    body.append(h('p.small.muted', 'Part 3: compare. Average response time in each part (5 trials):'), bars,
      h('p.small.muted', { style: { marginTop: '.7rem' } }, 'Distance traveled before the brakes even start:'), tbl,
      h('p.small.muted', { style: { marginTop: '.7rem' } }, 'Stopping model at 45 mph on dry pavement (obstacle placed 12 ft beyond your baseline stopping point):'), wrapLanes,
      h('div.row', { style: { marginTop: '.5rem' } }, h('button.btn.small.ghost', { type: 'button', onclick: play }, icon('reload', 16), ' Replay animation')),
      h('div.disclaim', h('b', 'Educational model. '), 'This is not a measurement of intoxication and cannot show whether anyone is safe to drive. Real stopping distance also depends on vision, judgment, road conditions and more.'));
    play(); if (!sim.ready) { sim.ready = true; ctx.save(); ctx.markReady(); }
  }
  function render() { clear(); flush(); if (sim.phase === 'compare') compare(); else if (sim.phase === 'base' || sim.phase === 'model') trials(sim.phase); else intro(); }
  function intro() {
    body.replaceChildren(h('p', 'You will complete two short rounds. In each round, a ball rolls into the road. Press the brake as soon as you see it.'),
      h('ul', h('li', 'Round 1 sets your own baseline.'), h('li', `Round 2 adds a modeled ${MODEL_DELAY_MS} ms delay to represent slower processing.`), h('li', 'Then you will compare the two and answer a question.')),
      h('div.disclaim', h('b', 'Educational model. '), 'It does not measure intoxication and says nothing about what is safe.'),
      h('button.btn.primary', { type: 'button', onclick: () => { sim.phase = 'base'; ctx.save(); render(); } }, 'Begin round 1'));
  }
  render();
  return { destroy() { clear(); flush(); } };
}

// =====================================================================================================
// Scene 'bac': Simulation B
// =====================================================================================================
export function sceneBac(host, ctx) {
  const sim = ctx.sim; Object.assign(sim, { drinks: 4, body: 'medium', window: 'h1', food: 'fasted', cursor: 3, changes: 0 }, sim);
  const need = ctx.stage.cfg.minChanges || 3;
  const box = h('div.sim', h('h3', ctx.stage.title), h('p.lead', ctx.stage.lead));
  const chartHost = h('div'); const readout = h('div.readout'); const note = h('p.progress-note');
  const def = { title: 'Estimated BAC over time (educational model)', desc: 'Line chart of estimated blood alcohol concentration over twelve hours with a shaded band showing how much real people can differ.',
    xLabel: 'Hours since the first drink', yLabel: 'Estimated BAC (g/dL)', unit: '', xDomain: [0, 12], yDomain: [0, 0.3], yStep: 0.05, yFmt: (y) => y.toFixed(2), xTicks: [0, 2, 4, 6, 8, 10, 12], decimals: 3, series: [],
    refLines: [{ y: 0.08, label: '0.08: legal driving limit for adults 21+ (impairment starts well below this)' }] };
  const ch = createChart(chartHost, def, { noLegend: true, noTools: true });
  const ctrls = h('div.ctrls');
  const mk = (key) => {
    const set = (v) => { sim[key] = v; sim.changes++; ctx.save(); update(); };
    return set;
  };
  const drinkOut = h('output', { 'aria-live': 'polite' }, sim.drinks);
  const dec = h('button', { type: 'button', 'aria-label': 'One fewer standard drink', onclick: () => sim.drinks > 1 && mk('drinks')(sim.drinks - 1) }, '−');
  const inc = h('button', { type: 'button', 'aria-label': 'One more standard drink', onclick: () => sim.drinks < 12 && mk('drinks')(sim.drinks + 1) }, '+');
  const segs = {};
  const seg = (key, label, opts) => { const wrap = h('div.seg', { role: 'group', 'aria-label': label }); segs[key] = []; Object.entries(opts).forEach(([k, v]) => { const b = h('button', { type: 'button', onclick: () => k !== sim[key] && mk(key)(k) }, v); b.dataset.k = k; segs[key].push(b); wrap.append(b); }); return h('div.ctrl', h('div.lab', label), wrap); };
  const time = h('input', { type: 'range', min: 0, max: 12, step: 0.25, value: sim.cursor, 'aria-label': 'Elapsed hours since the first drink' });
  const timeOut = h('output', sim.cursor + ' h');
  time.oninput = () => { sim.cursor = +time.value; sim.changes++; ctx.save(); update(); };
  ctrls.append(
    h('div.ctrl', h('div.lab', 'Number of standard drinks (14 g alcohol each)'), h('div.stepper', dec, drinkOut, inc)),
    seg('body', 'Body-size category', Object.fromEntries(Object.entries(BODY).map(([k, v]) => [k, v.label.replace(' body size', '')]))),
    seg('window', 'Rate of consumption', Object.fromEntries(Object.entries(WINDOWS).map(([k, v]) => [k, v.label]))),
    seg('food', 'Food context', { fasted: 'Little or no food', fed: 'Ate a full meal first' }),
    h('div.ctrl', h('label', 'Elapsed time: ', timeOut), time)
  );
  box.append(chartHost, readout, ctrls, note,
    h('div.disclaim', { role: 'note' }, h('b', 'BAC varies substantially among individuals. This simulation cannot determine whether someone is safe or legal to drive. '), 'It is an educational approximation. No amount of drinking is safe for driving, and in the U.S. any detectable alcohol is illegal for drivers under 21.'));
  host.append(box);
  function update() {
    const opts = { drinks: sim.drinks, body: sim.body, window: sim.window, food: sim.food };
    const m = simulate(opts), bd = band(opts);
    const sample = (arr, step = 0.25) => arr.times.map((t, i) => [t, arr.bac[i]]).filter(([t]) => Math.abs(t / step - Math.round(t / step)) < 1e-6 && t <= 12);
    const mid = sample(m), lo = sample(bd.lo), hi = sample(bd.hi);
    ch.setSeries([{ id: 'band', label: 'Plausible individual range', color: '#ffb347', band: mid.map(([t], i) => [t, lo[i][1], hi[i][1]]), points: [], noMarkers: true }, { id: 'bac', label: 'Estimated BAC (model)', color: '#ff7f5a', points: mid.map(([t, v]) => [t, Math.round(v * 10000) / 10000]), noMarkers: true, area: true }]);
    ch.setCursor(Math.round(sim.cursor * 4) / 4);
    const at = (arr, t) => arr.bac[Math.min(arr.bac.length - 1, Math.round(t / 0.0333333))];
    const idx = (arr, t) => { let k = 0; for (let i = 0; i < arr.times.length; i++) if (arr.times[i] <= t) k = i; return arr.bac[k]; };
    const f3 = (x) => x.toFixed(2), z = (r) => (r.zeroT == null ? 'over 16' : r.zeroT.toFixed(1));
    readout.replaceChildren(
      h('div', h('div.k', 'Peak (model)'), h('div.v', f3(m.peak)), h('div.k', `at ${m.peakT.toFixed(1)} h; range ${f3(Math.max(0, band(opts).lo.peak))}–${f3(band(opts).hi.peak)}`)),
      h('div', h('div.k', `At ${sim.cursor} h`), h('div.v', f3(idx(m, sim.cursor))), h('div.k', `range ${f3(idx(bd.lo, sim.cursor))}–${f3(idx(bd.hi, sim.cursor))}`)),
      h('div', h('div.k', 'Back to about 0'), h('div.v', z(m) + ' h'), h('div.k', `range ${z(bd.lo)}–${z(bd.hi)} h. Only time lowers BAC.`)));
    drinkOut.textContent = sim.drinks; timeOut.textContent = sim.cursor + ' h'; time.value = sim.cursor;
    for (const [k, list] of Object.entries(segs)) list.forEach((b) => b.setAttribute('aria-pressed', b.dataset.k === sim[k] ? 'true' : 'false'));
    if (!sim.ready) { if (sim.changes >= need) { sim.ready = true; ctx.save(); ctx.markReady(); note.textContent = 'Question unlocked. Keep exploring as you answer.'; } else note.textContent = `Explore the controls to unlock the question: ${Math.min(sim.changes, need)} of ${need} changes made.`; } else note.textContent = 'Question unlocked. Keep exploring as you answer.';
  }
  update();
  return { destroy() {} };
}

// =====================================================================================================
// Scene 'overdose': Simulation C
// =====================================================================================================
const OD_HOTSPOTS = [
  { k: 'wake', x: 300, y: 118, label: 'Try to wake them', text: 'You shout their name and shake their shoulder. There is no response.' },
  { k: 'breath', x: 330, y: 215, label: 'Check breathing', text: 'You watch their chest and listen. Breathing is very slow, with long pauses and a gurgling, snoring-like sound.' },
  { k: 'lips', x: 275, y: 150, label: 'Look at lips and skin', text: 'Their lips and skin look pale, with a bluish-gray color.' },
  { k: 'phone', x: 520, y: 238, label: 'Look at the phone', text: 'A phone on the table is playing music.' },
  { k: 'drink', x: 455, y: 262, label: 'Look at the table', text: 'A drink is spilled on the table.' }
];
export function sceneOverdose(host, ctx) {
  const sim = ctx.sim; sim.seen = sim.seen || {}; sim.t0 = sim.t0 || Date.now();
  const box = h('div.sim', h('h3', ctx.stage.title), h('p.lead', ctx.stage.lead));
  const svg = S('svg', { viewBox: '0 0 640 360', role: 'img', 'aria-label': 'A living room. A person is slumped on a couch. A phone and a spilled drink are on a table.' });
  svg.innerHTML = `<rect width="640" height="360" fill="#0b1226"/><rect y="270" width="640" height="90" fill="#0a0f1d"/>
    <rect x="460" y="40" width="130" height="110" rx="6" fill="#16213f" stroke="#2c3b6b"/><path d="M525 40 V150 M460 95 H590" stroke="#2c3b6b" stroke-width="3"/>
    <rect x="130" y="170" width="300" height="110" rx="22" fill="#2b3a6d"/><rect x="110" y="140" width="60" height="140" rx="18" fill="#34457f"/><rect x="390" y="140" width="60" height="140" rx="18" fill="#34457f"/><rect x="130" y="130" width="300" height="60" rx="20" fill="#3a4c8c"/>
    <g class="breath"><path d="M250 190 C250 150 300 140 345 160 L388 205 L370 245 L262 250 Z" fill="#7a5a8a"/></g>
    <circle cx="258" cy="136" r="30" fill="#d9a98c"/><path d="M230 126 C236 100 282 100 288 124 C270 114 248 116 230 126 Z" fill="#2a1d1a"/><path class="lips" d="M246 152 Q258 158 270 152" stroke="#c98a85" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M246 130 q4 3 8 0 M264 130 q4 3 8 0" stroke="#3a2a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M366 214 C400 238 410 262 404 282" stroke="#d9a98c" stroke-width="14" fill="none" stroke-linecap="round"/>
    <rect x="430" y="270" width="150" height="14" rx="4" fill="#3a2e22"/><rect x="450" y="284" width="8" height="46" fill="#3a2e22"/><rect x="552" y="284" width="8" height="46" fill="#3a2e22"/>
    <rect x="500" y="248" width="34" height="22" rx="4" fill="#111a33" stroke="#69b0ff"/><path d="M510 242 q8 -10 16 0 M506 236 q12 -16 24 0" stroke="#69b0ff" fill="none" stroke-width="2" opacity=".7"/>
    <path d="M440 270 q14 -22 24 0 z" fill="#9bd6ff" opacity=".6"/><ellipse cx="478" cy="272" rx="22" ry="4" fill="#9bd6ff" opacity=".35"/>`;
  const scene = h('div.od-scene'); scene.append(svg);
  const hsGroup = S('g', {}, svg);
  OD_HOTSPOTS.forEach((hs) => {
    const g = S('g', { class: 'hs2' + (sim.seen[hs.k] ? ' seen' : ''), tabindex: 0, role: 'button', 'aria-label': hs.label }, hsGroup);
    S('circle', { cx: hs.x, cy: hs.y, r: 24 }, g);
    const ex = () => { sim.seen[hs.k] = true; g.classList.add('seen'); ctx.save(); log.append(h('p', h('b', hs.label + ': '), hs.text)); log.lastChild.scrollIntoView({ block: 'nearest' }); check(); };
    g.addEventListener('click', ex); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ex(); } });
  });
  const clock = h('div.od-clock', 'Time since you found them', h('b', '0:00'));
  scene.append(clock);
  const log = h('div.od-log', { 'aria-live': 'polite' });
  const note = h('p.progress-note');
  const mon = S('svg', { viewBox: '0 0 400 60', role: 'img', 'aria-label': 'Breathing monitor: breaths are slow with long pauses.', style: 'width:100%;height:56px;background:#050914;border-radius:8px;border:1px solid #20305a;margin-top:.5rem' });
  mon.innerHTML = '<path class="ekg" d="M0 40 H60 q10 -26 20 0 H220 q10 -26 20 0 H400" stroke-dasharray="0"><animate attributeName="d" dur="6s" repeatCount="indefinite" values="M0 40 H60 q10 -26 20 0 H220 q10 -26 20 0 H400;M-120 40 H-60 q10 -26 20 0 H100 q10 -26 20 0 H280;M0 40 H60 q10 -26 20 0 H220 q10 -26 20 0 H400"/></path>';
  box.append(scene, h('p.small.muted', { style: { marginTop: '.5rem' } }, 'Select the parts of the scene (or use Tab and Enter) to examine what you can see and hear. Examine at least the first three.'), log, mon, note);
  host.append(box);
  const need = ['wake', 'breath', 'lips'];
  function check() {
    const have = need.filter((k) => sim.seen[k]).length;
    if (!sim.ready) { if (have >= need.length) { sim.ready = true; ctx.save(); ctx.markReady(); note.textContent = 'Observation complete. The questions are unlocked.'; } else note.textContent = `Examine the scene: ${have} of ${need.length} key checks done.`; } else note.textContent = 'Observation complete. The questions are unlocked.';
  }
  check();
  OD_HOTSPOTS.filter((x) => sim.seen[x.k]).forEach((hs) => log.append(h('p', h('b', hs.label + ': '), hs.text)));
  let iv = null;
  function tick() {
    const stopAt = sim.helpedAt || null; const secs = Math.floor(((stopAt || Date.now()) - sim.t0) / 1000);
    clock.querySelector('b').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    clock.firstChild.textContent = stopAt ? 'Time until help was called' : 'Time since you found them';
    if (stopAt) { scene.classList.add('helped'); clearInterval(iv); }
  }
  tick(); iv = setInterval(tick, 1000);
  const ws = (Date.now() - sim.t0) / 1000; svg.querySelector('.lips').style.animationDelay = '-' + Math.min(ws, 60) + 's';
  return {
    onPartDone(qid) {
      if (qid === 'ov2') { sim.helpedAt = Date.now(); ctx.save(); tick(); log.append(h('p', h('b', 'Help is on the way. '), 'The dispatcher stays on the line with you.')); }
      if (qid === 'ov3') log.append(h('p', h('b', 'Help arrives. '), 'Paramedics take over. Staying and giving clear information made it easier for them.'));
    },
    destroy() { clearInterval(iv); }
  };
}

// =====================================================================================================
// Scene 'chat': Simulation D, branching conversation
// =====================================================================================================
export function sceneChat(host, ctx) {
  const chat = ctx.content.chat, sim = ctx.sim; sim.path = sim.path || []; sim.runs = sim.runs || [];
  const q = ctx.stage.qs[0], item = () => ctx.items[q.id];
  const box = h('div.sim', h('h3', ctx.stage.title), h('p.lead', ctx.stage.lead));
  const thread = h('div.thread', { role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversation' });
  const replies = h('div.replies');
  const meters = h('div.meters');
  const phone = h('div.phone', h('div.phone-head', h('span', 'Group chat'), h('span', chat.title)), thread);
  const after = h('div');
  box.append(phone, replies, meters, after, h('div.disclaim', h('b', 'Fictional scenario. '), 'The conversation shows how different responses change safety, pressure, options and support. It does not show or encourage substance use.'));
  host.append(box);
  const rand = rng(seedFrom('chat|' + ctx.session.state.seed));
  const meterEls = {};
  METERS.forEach((m) => { const f = h('div.mf'), v = h('span', '0'), dl = h('span.delta'); meterEls[m] = { f, v, dl }; meters.append(h('div.meter', { 'data-m': m }, h('div.mh', h('span', METER_LABEL[m]), h('span', v, dl)), h('div.mt', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': METER_LABEL[m] }, f))); });
  const setMeters = (vals, prev) => METERS.forEach((m) => { const e = meterEls[m]; e.f.style.width = vals[m] + '%'; e.v.textContent = vals[m]; e.f.parentElement.setAttribute('aria-valuenow', vals[m]); const d = prev ? vals[m] - prev[m] : 0; e.dl.textContent = d ? (d > 0 ? '+' : '−') + Math.abs(d) : ''; e.dl.className = 'delta ' + (d > 0 ? 'up' : d < 0 ? 'down' : ''); });
  const quick = reducedMotion();
  let busy = false;
  async function showMsgs(node, prevTag, instant) {
    for (const m of node.msgs) {
      if (m.ifTag && !m.ifTag.includes(prevTag)) continue;
      if (!instant && !quick) { const t = h('div.bubble', h('span.typing', h('i'), h('i'), h('i'))); thread.append(t); thread.scrollTop = 1e6; await sleep(550); t.remove(); }
      thread.append(m.system ? h('div.sys', m.text) : h('div.bubble', h('span.who', m.who), m.text)); thread.scrollTop = 1e6;
    }
  }
  function placeFor(node) { thread.append(h('div.sys', node.place)); }
  async function render(instant) {
    thread.replaceChildren(); replies.replaceChildren(); after.replaceChildren();
    const st = runChat(chat, sim.path);
    let node = chat.start, prevTag = null;
    for (let i = 0; i <= sim.path.length; i++) {
      const n = chat.nodes[node]; placeFor(n); await showMsgs(n, prevTag, true);
      if (i < sim.path.length) {
        const c = n.choices.find((x) => x.id === sim.path[i]);
        thread.append(h('div.bubble.me', h('span.who', 'You'), h('span.tagchip', TAG_LABEL[c.tag] || c.tag), c.text)); prevTag = c.tag;
        if (c.end) break; node = c.next;
      }
    }
    setMeters(st.meters, st.log.length ? st.log.at(-1).before : null);
    thread.scrollTop = 1e6;
    if (st.ended) return finish(st);
    // offer choices
    const n = chat.nodes[node];
    const order = shuffled(n.choices, rng(seedFrom(ctx.session.state.seed + '|' + node)));
    replies.append(h('p.small.muted', 'How do you respond?'));
    order.forEach((c) => replies.append(h('button.reply', { type: 'button', onclick: () => choose(node, c) }, c.text)));
  }
  async function choose(nodeId, c) {
    if (busy) return; busy = true;
    const before = runChat(chat, sim.path).meters;
    sim.path.push(c.id); ctx.save();
    replies.replaceChildren();
    thread.append(h('div.bubble.me', h('span.who', 'You'), h('span.tagchip', TAG_LABEL[c.tag] || c.tag), c.text)); thread.scrollTop = 1e6;
    const st = runChat(chat, sim.path); setMeters(st.meters, before); sfx.tick();
    if (!c.end) { const nn = chat.nodes[c.next]; await sleep(quick ? 0 : 500); placeFor(nn); await showMsgs(nn, c.tag, false); }
    busy = false; await render(true);
  }
  async function finish(st) {
    const done = ctx.session.isDone(q.id);
    const rec = ctx.session.rec(q.id);
    const submittedThis = rec && rec.attempts.some((a) => a.c === sim.path.join('>'));
    if (!submittedThis && !done) { await item().attempt(sim.path); }
    const nowDone = ctx.session.isDone(q.id), r2 = ctx.session.rec(q.id);
    const passed = r2 && r2.status === 'correct';
    const recap = h('div.panel', { style: { marginTop: '.8rem' } }, h('h3', 'What happened'),
      h('p', st.pass ? 'You finished the conversation in a way that kept you safe, lowered the pressure and kept support available.' : 'This ending did not keep you safe, or left the pressure high or support low.'),
      h('ol', st.log.map((e) => { const nd = chat.nodes[e.node], c = nd.choices.find((x) => x.id === e.choice); const dd = METERS.map((m) => { const d = e.after[m] - e.before[m]; return d ? `${METER_LABEL[m].toLowerCase()} ${d > 0 ? '+' : '−'}${Math.abs(d)}` : null; }).filter(Boolean).join(', '); return h('li', h('span.tagchip', TAG_LABEL[c.tag]), c.text.slice(0, 80), h('div.small.muted', dd || 'no change')); })));
    after.append(recap);
    if (nowDone) {
      const ex = h('details', { style: { marginTop: '.8rem' } }, h('summary', 'Branch explorer: how each type of response changes the scenario'));
      const tb = h('table.data', h('thead', h('tr', h('th', 'Moment'), h('th', 'Response type'), METERS.map((m) => h('th', METER_LABEL[m])))), h('tbody'));
      Object.entries(chat.nodes).forEach(([nid, nd]) => nd.choices.forEach((c) => tb.querySelector('tbody').append(h('tr', h('td', nd.place), h('td', h('span.tagchip', TAG_LABEL[c.tag]), c.flag ? ' (unsafe)' : ''), METERS.map((m) => h('td', c.fx[m] ? (c.fx[m] > 0 ? '+' : '−') + Math.abs(c.fx[m]) : '0'))))));
      ex.append(tb); after.append(ex);
    } else {
      after.append(h('div.row', { style: { marginTop: '.8rem' } }, h('button.btn.primary', { type: 'button', onclick: () => { sim.runs.push(sim.path.slice()); sim.path = []; ctx.save(); render(true); } }, icon('reload', 16), ' Try the conversation again')));
    }
  }
  render(false);
  return { destroy() {} };
}

// =====================================================================================================
// Scene 'board': evidence cards (claim lab + Evidence Lab)
// =====================================================================================================
export function sceneBoard(host, ctx) {
  const cfg = ctx.stage.cfg, r = rng(seedFrom('board|' + ctx.stage.id));
  const box = h('div.sim', h('h3', ctx.stage.title), ctx.stage.lead ? h('p.lead', ctx.stage.lead) : '');
  if (cfg.claim) box.append(h('div.claimbar', h('span', 'The viral claim'), '“' + cfg.claim + '”'));
  const board = h('div.board');
  cfg.cards.forEach((c, i) => {
    const el = h('div.ecard.' + c.type, { style: { '--rot': ((r() - .5) * 3).toFixed(1) + 'deg', '--d': (i * 0.15).toFixed(2) + 's' } });
    if (c.type === 'post') el.append(h('div.src', c.who), h('div', c.text), h('div.note', c.note || ''));
    else if (c.type === 'headline') el.append(h('div.src', c.src), h('div', c.text));
    else if (c.type === 'excerpt') el.append(h('div.src', 'Source excerpt: ' + c.src), h('div', c.text));
    else if (c.type === 'graph') { el.append(h('div.src', 'Graph'), h('div')); createChart(el.lastChild, JSON.parse(JSON.stringify(CHARTS[c.chart])), { noLegend: true, noTools: false }); el.append(h('div.note', c.caption || '')); }
    board.append(el);
  });
  box.append(board); host.append(box);
  return { destroy() {} };
}

// =====================================================================================================
// Scene 'case': final synthesis scenario
// =====================================================================================================
export function sceneCase(host, ctx) {
  const box = h('div.sim', h('h3', ctx.stage.title), h('p.lead', ctx.stage.lead));
  const c = h('div.casebox', { role: 'list' });
  ctx.stage.cfg.cards.forEach((x, i) => c.append(h('div.cstep', { role: 'listitem', style: { '--d': (i * 0.12).toFixed(2) + 's' } }, h('div.tm', x.time), x.text)));
  box.append(c, h('div.disclaim', h('b', 'Fictional scene. '), 'Every character and event is invented for this assessment.'));
  host.append(box);
  return { destroy() {} };
}

export const SCENES = { synapse: sceneSynapse, chart: sceneChart, reaction: sceneReaction, bac: sceneBac, overdose: sceneOverdose, chat: sceneChat, board: sceneBoard, case: sceneCase };
