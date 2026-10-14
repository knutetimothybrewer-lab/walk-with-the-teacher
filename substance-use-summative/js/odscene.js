// Simulation C: a fictional opioid-overdose model. The student adds doses and watches breathing, heart rate, oxygen
// and alertness change; the figure, pulse and traces are all driven by those same numbers. Once the person stops
// responding, the student examines them and the questions unlock.
import { h, clamp, rng, reducedMotion } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };

const MAX_DOSES = 5;
const DOSE_E = [0, .18, .4, .62, .85, 1]; // how strongly the drug is acting for each dose count (model, not a real dose chart)
const FLOOR = 330, CX = 260, MID = 187;

// Base positions are for the standing figure; they are moved with the body when it collapses.
const HOTSPOTS = [
  { k: 'wake', x: 220, y: 122, label: 'Try to wake them', fx: 'shout', needs: true },
  { k: 'breath', x: 260, y: 160, label: 'Check breathing', fx: 'count', needs: true },
  { k: 'lips', x: 260, y: 84, label: 'Look at lips and skin', fx: 'color', needs: true },
  { k: 'phone', x: 522, y: 276, label: 'Look at the phone', fx: 'phone', text: 'A phone on the table is playing music.' },
  { k: 'drink', x: 478, y: 292, label: 'Look at the table', fx: 'drink', text: 'A drink is spilled on the table.' }
];
const OD_TEXT = {
  wake: 'You shout their name and shake their shoulder. There is no response.',
  breath: 'You watch their chest and listen. Breathing is very slow, with long pauses and a gurgling, snoring-like sound.',
  lips: 'Their lips and skin look pale, with a bluish-gray color.'
};

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, f) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * f).toString(16).padStart(2, '0')).join(''); };
const SKIN = ['#e0b08f', '#a3a8bd'], LIP = ['#c9807d', '#5f6f9a'], NAIL = ['#e8aca0', '#5a6a96'];
const fmt = (secs) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
const gauss = (x, m, w) => Math.exp(-(((x - m) / w) ** 2));
const ecg = (p) => .12 * gauss(p, .18, .05) - .16 * gauss(p, .355, .013) + gauss(p, .385, .014) - .26 * gauss(p, .42, .016) + .3 * gauss(p, .62, .07);

// ---------- the model: everything the figure shows comes from here
function vitals(e, hyp) {
  const rr = Math.max(1.5, 16 - 14.5 * Math.pow(e, 1.15));
  const spo2 = Math.round(98 - 10 * Math.pow(e, 1.5) - 24 * hyp);
  const hr = Math.round(Math.max(30, 72 - 30 * e - (spo2 < 80 ? (80 - spo2) * .6 : 0)));
  const alert = clamp(1 - e * 1.12, 0, 1);
  return { rr, spo2, hr, alert };
}
const STATES = [[.8, 'Alert'], [.55, 'Drowsy'], [.3, 'Nodding off'], [.1, 'Hard to wake'], [-1, 'Unresponsive']];
const stateName = (a) => STATES.find(([t]) => a >= t)[1];

const ARM = `<path d="M216 116 C204 122 198 146 198 172 C198 196 195 214 194 230 L212 230 C213 214 216 196 216 172 C216 150 222 132 226 120 Z" class="skin"/>
  <path d="M194 228 L213 228 C218 244 216 262 212 270 C208 277 196 277 192 270 C188 262 190 244 194 228 Z" class="skin"/>
  <ellipse cx="189" cy="246" rx="4" ry="11" transform="rotate(8 189 246)" class="skin"/>
  <path d="M197 240 q4 6 0 12 M203 238 q4 8 0 16 M209 238 q3 8 0 16" stroke="#5a3328" stroke-opacity=".3" stroke-width="1.2" fill="none"/>
  <g class="nails"><rect x="193" y="268" width="4" height="3" rx="1.2"/><rect x="198" y="271" width="4" height="3" rx="1.2"/><rect x="204" y="271" width="4" height="3" rx="1.2"/><rect x="209" y="268" width="4" height="3" rx="1.2"/></g>
  <path d="M212 112 C200 118 194 134 194 154 L221 158 C220 142 224 126 229 114 Z" fill="url(#odshirt)" stroke="#2f5aa8" stroke-width="1.2"/>`;

const ART = `
<defs>
  <linearGradient id="odwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#18264a"/><stop offset="1" stop-color="#0f1832"/></linearGradient>
  <linearGradient id="odfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2236"/><stop offset="1" stop-color="#14101c"/></linearGradient>
  <linearGradient id="odshirt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b9bff"/><stop offset="1" stop-color="#3f6fd6"/></linearGradient>
  <linearGradient id="odjeans" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34456f"/><stop offset="1" stop-color="#202d52"/></linearGradient>
  <radialGradient id="odlamp" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".5"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
</defs>
<rect width="640" height="360" fill="url(#odwall)"/>
<rect x="470" y="26" width="132" height="116" rx="6" fill="#0a1a3a" stroke="#3a4c88" stroke-width="3"/><path d="M536 26 V142 M470 84 H602" stroke="#3a4c88" stroke-width="3"/><circle cx="566" cy="60" r="13" fill="#e9eefc" opacity=".85"/><circle cx="571" cy="56" r="12" fill="#0a1a3a"/>
<rect y="296" width="640" height="64" fill="url(#odfloor)"/><ellipse cx="260" cy="338" rx="230" ry="18" fill="#33284a" opacity=".6"/>
<g><rect x="60" y="214" width="6" height="86" fill="#2c2a3a"/><ellipse cx="63" cy="210" rx="26" ry="14" fill="#f2c36b" opacity=".9"/><ellipse cx="63" cy="220" rx="110" ry="100" fill="url(#odlamp)"/></g>
<g id="odtable"><rect x="440" y="298" width="170" height="13" rx="4" fill="#5a4630"/><rect x="458" y="311" width="9" height="40" fill="#43331f"/><rect x="584" y="311" width="9" height="40" fill="#43331f"/>
  <g id="odphone"><rect x="500" y="278" width="46" height="20" rx="4" fill="#0e1630" stroke="#69b0ff" stroke-width="1.6"/><g class="eq" fill="#69b0ff"><rect x="508" y="284" width="4" height="10"/><rect x="516" y="284" width="4" height="10"/><rect x="524" y="284" width="4" height="10"/><rect x="532" y="284" width="4" height="10"/></g></g>
  <g id="oddrink"><path class="puddle" d="M470 301 q16 -6 38 -1 q8 3 -2 5 q-20 4 -40 0 q-6 -2 4 -4 z" fill="#9bd6ff" opacity=".42"/><path d="M456 292 l26 -10 l6 14 l-26 8 z" fill="#bfe6ff" opacity=".35" stroke="#cfeaff" stroke-width="1.4"/><path class="drip" d="M508 304 v12" stroke="#9bd6ff" stroke-width="2.4" stroke-linecap="round"/></g></g>
<ellipse id="odshadow" cx="260" cy="334" rx="70" ry="7" fill="#000" opacity=".4"/>
<g id="fwrap"><g id="fbody">
  <g id="fkneel">
    <path d="M236 212 C231 250 229 290 229 320 L253 320 C253 290 255 250 257 214 Z" fill="url(#odjeans)" stroke="#141d3a" stroke-width="1.4"/>
    <path d="M264 214 C266 250 268 290 268 320 L292 320 C292 290 289 250 284 212 Z" fill="url(#odjeans)" stroke="#141d3a" stroke-width="1.4"/>
    <path d="M225 320 h30 q5 0 5 8 v6 h-40 v-6 q0 -8 5 -8z" fill="#e9eaf2" stroke="#8a90a8" stroke-width="1.2"/><path d="M265 320 h30 q5 0 5 8 v6 h-40 v-6 q0 -8 5 -8z" fill="#e9eaf2" stroke="#8a90a8" stroke-width="1.2"/>
    <path d="M254 214 L266 214 L266 322" stroke="#141d3a" stroke-opacity=".5" fill="none"/>
  </g>
  <g id="ftorso"><path d="M214 114 C228 106 292 106 306 114 C313 150 309 192 301 220 L219 220 C211 192 207 150 214 114 Z" fill="url(#odshirt)" stroke="#2f5aa8" stroke-width="1.4"/><path d="M236 112 q24 14 48 0" stroke="#2f5aa8" stroke-width="2" fill="none"/><path d="M250 150 q10 6 20 0" stroke="#fff" stroke-opacity=".18" stroke-width="2" fill="none"/></g>
  <g id="farmL">${ARM}</g><g id="farmR" transform="translate(520 0) scale(-1 1)">${ARM}</g>
  <rect x="249" y="92" width="22" height="24" rx="6" class="skin"/><path d="M249 108 q11 8 22 0 v-6 h-22 z" fill="#000" opacity=".12"/>
  <circle id="fpulse" cx="268" cy="106" r="3.2" fill="none" stroke="#ff6b7a" stroke-width="2" opacity=".0"/>
  <g id="fhead">
    <ellipse cx="236" cy="70" rx="5" ry="8" class="skin"/><ellipse cx="284" cy="70" rx="5" ry="8" class="skin"/>
    <ellipse cx="260" cy="68" rx="24" ry="29" class="skin"/>
    <path d="M235 64 C233 38 287 36 285 64 C277 52 243 52 235 64 Z" fill="#2a1d1a"/><path d="M236 62 C232 72 236 80 238 82 M284 62 C288 72 284 80 282 82" stroke="#2a1d1a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M241 57 q8 -4 15 -1 M264 56 q8 -3 15 1" stroke="#3a2a22" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <g id="feyes"><ellipse cx="249" cy="66" rx="6" ry="4" fill="#f6f6f6"/><ellipse cx="271" cy="66" rx="6" ry="4" fill="#f6f6f6"/><circle cx="249" cy="66" r="2.7" fill="#3a2a1a"/><circle cx="271" cy="66" r="2.7" fill="#3a2a1a"/><circle id="fpupL" cx="249" cy="66" r="1.2" fill="#000"/><circle id="fpupR" cx="271" cy="66" r="1.2" fill="#000"/></g>
    <g id="flids"><rect id="flidL" x="242.5" y="61.5" width="13" height="9" rx="4" class="skin"/><rect id="flidR" x="264.5" y="61.5" width="13" height="9" rx="4" class="skin"/><path id="flashL" d="M243 66 q6 4 12 0 M265 66 q6 4 12 0" stroke="#3a2a22" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0"/></g>
    <path d="M260 68 q-4 9 1 11" stroke="#5a3328" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse id="fmouth" cx="260" cy="86" rx="7" ry="1" fill="#2d1215"/><path id="flip" class="lip" d="M251 86 Q260 80 269 86 Q260 93 251 86 Z"/>
  </g>
</g></g>
<g id="odfx"></g>`;

export function sceneOverdose(host, ctx) {
  const sim = ctx.sim; sim.seen = sim.seen || {}; sim.logs = sim.logs || []; sim.doses = sim.doses || 0; sim.hyp = sim.hyp || 0;
  const rand = rng(77);
  const box = h('div.sim', h('h3', ctx.stage.title), h('p.lead', ctx.stage.lead));
  const svg = S('svg', { viewBox: '0 0 640 360', role: 'img', 'aria-label': 'A person standing in a room, facing forward with arms at their sides. A phone and a spilled drink are on a table. The person changes as doses are added.' });
  svg.innerHTML = ART;
  const scene = h('div.od-scene'); scene.append(svg);
  const $ = (id) => svg.querySelector('#' + id);
  const body = $('fbody'), wrap = $('fwrap'), torso = $('ftorso'), head = $('fhead'), shadow = $('odshadow'), fx = $('odfx'), fpulse = $('fpulse');
  const skinEls = svg.querySelectorAll('.skin'), lipEls = svg.querySelectorAll('.lip'), nailEls = svg.querySelectorAll('.nails rect');
  const lids = [$('flidL'), $('flidR')], mouth = $('fmouth'), pups = [$('fpupL'), $('fpupR')], armL = $('farmL'), armR = $('farmR'), kneel = $('fkneel');

  // ---------- model state (persisted bits live in sim)
  let target = DOSE_E[sim.doses] || 0, eff = sim.collapsed ? target : target, lie = sim.collapsed ? 1 : 0, simT = 0, lastT = performance.now();
  if (sim.recoveredAt) { target = 0; eff = 0; }
  const isOD = () => V.alert < .3;
  let V = vitals(eff, sim.hyp);

  // ---------- controls
  const doseBtn = h('button.btn.primary.od-dose', { type: 'button', onclick: () => addDose() }, 'Take another dose');
  const resetBtn = h('button.btn.ghost.sm', { type: 'button', onclick: () => resetModel() }, 'Reset the model');
  const pills = Array.from({ length: MAX_DOSES }, () => h('i'));
  const doseInfo = h('div.od-doses', h('span', 'Opioid in the body (fictional model): '), h('span.pills', pills), h('b', '0 of 5'));
  const hint = h('p.small.muted.od-hint');
  function refreshDoseUI() {
    pills.forEach((p, i) => p.classList.toggle('on', i < sim.doses)); doseInfo.querySelector('b').textContent = `${sim.doses} of ${MAX_DOSES}`;
    const locked = !!sim.helpedAt; doseBtn.disabled = locked || sim.doses >= MAX_DOSES; resetBtn.hidden = locked || !sim.doses;
    hint.textContent = sim.collapsed ? (sim.ready ? '' : 'They have stopped responding. Examine them: select the glowing circles on the person, or use Tab and Enter.')
      : sim.doses ? 'Watch the numbers and the person. Keep adding doses until they stop responding.' : 'Step 1: this person is healthy. Add doses and watch breathing, heart rate, oxygen and alertness change. Step 2: when they stop responding, examine them.';
  }
  function addDose() { if (sim.helpedAt || sim.doses >= MAX_DOSES) return; sim.doses++; target = DOSE_E[sim.doses]; ctx.save(); refreshDoseUI(); sfxTick(); }
  function resetModel() { sim.doses = 0; target = 0; sim.collapsed = false; sim.hyp = 0; sim.t0 = 0; sim.seen = {}; sim.logs = []; sim.ready = false; log.replaceChildren(); lie = 0; eff = 0; scene.classList.remove('collapsed'); hsGroup.querySelectorAll('.hs2').forEach((g) => g.classList.remove('seen')); pulseGroup.querySelectorAll('.pulse').forEach((c) => c.classList.add('off')); ctx.save(); refreshDoseUI(); check(); }
  function sfxTick() { fx.replaceChildren(); }

  // ---------- examining
  const log = h('div.od-log', { 'aria-live': 'polite' });
  const note = h('p.progress-note');
  const clock = h('div.od-clock', { hidden: true }, h('span', 'Time since you found them'), h('b', '0:00'));
  const status = h('div.od-status', { hidden: true });
  const card = h('div.od-card', { hidden: true });
  scene.append(clock, status, card);
  const need = HOTSPOTS.filter((x) => x.needs).map((x) => x.k);
  function check() {
    const have = need.filter((k) => sim.seen[k]).length;
    if (have >= need.length) { if (!sim.ready) { sim.ready = true; ctx.save(); ctx.markReady(); } note.textContent = 'Observation complete. The questions are unlocked.'; }
    else note.textContent = sim.collapsed ? `Examine the person: ${have} of ${need.length} key checks done.` : 'The checks count once the person has stopped responding.';
    refreshDoseUI();
  }
  const textFor = (k) => {
    if (OD_TEXT[k] && isOD()) return OD_TEXT[k];
    const a = V.alert;
    if (k === 'wake') return a >= .8 ? 'You say their name and they look at you and answer clearly.' : a >= .55 ? 'You say their name. They answer, but slowly, and seem very sleepy.' : 'You shout and shake their shoulder. They mumble, then nod off again.';
    if (k === 'breath') return `You watch their chest. Breathing is about ${Math.round(V.rr)} breaths a minute, ${V.rr >= 12 ? 'and steady' : 'and getting slower'}.`;
    if (k === 'lips') return (98 - V.spo2) / 34 < .12 ? 'Their lips and skin look a normal color.' : 'Their lips look a little dusky.';
    return '';
  };
  let shoutTimer = 0, cardT = 0, counting = 0, countN = 0, showColor = false, phoneLit = 0, drips = 0;
  const effects = {
    shout() {
      fx.replaceChildren(); const p = xf(lie, 238, 70);
      for (let i = 0; i < 3; i++) S('path', { class: 'shout-ring', d: `M${p[0] - 36} ${p[1] + 14} q-18 -14 0 -30`, style: `animation-delay:${i * .22}s;transform-origin:${p[0] - 36}px ${p[1]}px` }, fx);
      wrap.classList.remove('shake'); void wrap.getBoundingClientRect(); wrap.classList.add('shake');
      clearTimeout(shoutTimer); shoutTimer = setTimeout(() => { wrap.classList.remove('shake'); fx.replaceChildren(); }, 1500);
      showCard('"Hey! Can you hear me?"', isOD() ? 'No eye opening, no sound, no movement.' : '');
    },
    count() { counting = performance.now(); countN = 0; showCard('Counting breaths…', 'Watch the chest and the lines below for 15 seconds.'); },
    color() { showColor = true; renderColorCard(); },
    phone() { phoneLit = performance.now(); },
    drink() { drips = performance.now(); }
  };
  const pulseGroup = S('g', { class: 'od-pulses', 'pointer-events': 'none' }, svg), tipGroup = S('g', { class: 'od-tips', 'pointer-events': 'none' }, svg), hsGroup = S('g', { class: 'od-hotspots' }, svg);
  const hsEls = [];
  HOTSPOTS.forEach((hs) => {
    const g = S('g', { class: 'hs2' + (sim.seen[hs.k] ? ' seen' : ''), tabindex: 0, role: 'button', 'aria-label': hs.label }, hsGroup);
    const pulse = S('circle', { class: 'pulse' + (sim.seen[hs.k] ? ' off' : ''), cx: hs.x, cy: hs.y, r: 22 }, pulseGroup);
    S('circle', { class: 'ring', cx: hs.x, cy: hs.y, r: 22 }, g);
    S('path', { class: 'tick', d: `M${hs.x - 8} ${hs.y} l5 6 l11 -12` }, g);
    const tip = S('g', { class: 'tip' }, tipGroup); S('rect', { width: 140, height: 24, rx: 8 }, tip); S('text', { x: 10, y: 16 }, tip).textContent = hs.label;
    const on = () => tip.classList.add('on'), off = () => tip.classList.remove('on');
    g.addEventListener('mouseenter', on); g.addEventListener('mouseleave', off); g.addEventListener('focus', on); g.addEventListener('blur', off);
    hsEls.push({ hs, g, pulse, tip });
    const ex = () => {
      effects[hs.fx] && effects[hs.fx]();
      const text = hs.text || textFor(hs.k), counts = !hs.needs || isOD();
      const prev = sim.logs.find((l) => l[0] === hs.label);
      if (!prev || prev[1] !== text) { sim.logs.push([hs.label, text]); log.append(h('p', h('b', hs.label + ': '), text)); log.lastChild.scrollIntoView({ block: 'nearest' }); }
      else { const hit = [...log.children].find((p) => p.firstChild.textContent.startsWith(hs.label)); if (hit) { hit.classList.remove('flash'); void hit.offsetWidth; hit.classList.add('flash'); } }
      if (counts) { sim.seen[hs.k] = true; g.classList.add('seen'); pulse.classList.add('off'); }
      ctx.save(); check();
    };
    g.addEventListener('click', ex); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ex(); } });
  });
  function showCard(title, bodyText) { card.hidden = false; showColor = false; card.replaceChildren(h('b', title), bodyText ? h('span', bodyText) : ''); clearTimeout(cardT); cardT = setTimeout(() => { if (!showColor && !counting) card.hidden = true; }, 4200); }
  const swatch = (c, label) => h('div.sw', h('i', { style: { background: c } }), h('span', label));
  const colorCard = h('div.od-colors');
  function renderColorCard() { card.hidden = false; clearTimeout(cardT); const t = tint(); colorCard.replaceChildren(h('b', 'Lips and nail beds'), h('div.swrow', swatch(LIP[0], 'typical'), swatch(mix(LIP[0], LIP[1], t), 'this person'), swatch(mix(NAIL[0], NAIL[1], t), 'fingertips')), h('button.btn.ghost.sm', { type: 'button', onclick: () => { showColor = false; card.hidden = true; } }, 'Close')); card.replaceChildren(colorCard); }

  // ---------- monitor
  const mk = (cls) => { const v = h('b.v', '--'); return v; };
  const rrV = mk(), hrV = mk(), spV = mk(), alV = h('b.v.txt', '--');
  const heart = S('svg', { viewBox: '0 0 24 24', class: 'od-heart', 'aria-hidden': 'true' }); const hp = S('path', { d: 'M12 21 C5 15 2 11.5 2 8 C2 5 4.5 3 7 3 C9 3 11 4.2 12 6 C13 4.2 15 3 17 3 C19.5 3 22 5 22 8 C22 11.5 19 15 12 21Z', fill: '#ff6b7a' }, heart);
  const trace = (cls) => { const sv = S('svg', { viewBox: '0 0 300 50', class: 'od-trace', preserveAspectRatio: 'none', 'aria-hidden': 'true' }); S('path', { d: 'M0 25 H300', class: 'base' }, sv); const l = S('path', { class: 'line ' + cls, d: '' }, sv); return [sv, l]; };
  const [rSv, rLine] = trace('resp'), [eSv, eLine] = trace('ecg');
  const mon = h('div.od-monitor', { role: 'group', 'aria-label': 'Health monitor' },
    h('div.cell', h('span', 'Breaths per minute'), rrV), h('div.cell', h('span', 'Heart rate (beats per minute) '), h('div.hrw', heart, hrV)), h('div.cell', h('span', 'Oxygen level (SpO₂)'), spV), h('div.cell', h('span', 'Alertness'), alV),
    h('div.cell.wide', h('span', 'Breathing, last 30 seconds'), rSv), h('div.cell.wide', h('span', 'Heartbeat (ECG), last 6 seconds'), eSv));
  box.append(scene, h('div.od-ctrl', doseBtn, doseInfo, resetBtn), hint, log, mon, note);
  host.append(box);
  sim.logs.forEach(([l, t]) => log.append(h('p', h('b', l + ': '), t)));
  if (sim.collapsed) scene.classList.add('collapsed');

  // ---------- geometry
  function xf(l, x, y) { const a = -Math.PI / 2 * l, dy = 95 * l, dx = x - CX, dy0 = y - MID, c = Math.cos(a), s = Math.sin(a); return [CX + dx * c - dy0 * s, MID + dy + dx * s + dy0 * c]; }
  const tint = () => clamp((98 - V.spo2) / 34, 0, 1);

  // ---------- model loop
  const hist = [], ehist = []; let beat = 0, nextB = 0, bStart = -9, bDur = 1.6, bAmp = 1, rphase = 0, sway = 0, last = 0, uiT = 0;
  function loop() {
    const pn = performance.now(), dt = Math.min(.1, (pn - lastT) / 1000); lastT = pn; simT += dt; const now = Date.now();
    // drug effect builds and fades gradually; low oxygen builds while the effect is strong and nobody has helped
    if (!sim.helpedAt || sim.recoveredAt) eff += (target - eff) * Math.min(1, .5 * dt);
    if (sim.recoveredAt) { target = 0; sim.hyp = Math.max(0, sim.hyp - dt / 8); }
    else if (!sim.helpedAt && eff > .6) sim.hyp = Math.min(1, sim.hyp + dt / 110);
    V = vitals(eff, sim.hyp);
    if (!sim.collapsed && !sim.recoveredAt && V.alert < .3) { sim.collapsed = true; sim.t0 = sim.t0 || now; ctx.save(); scene.classList.add('collapsed'); check(); }
    // posture: sways and nods as alertness falls, then collapses
    const lieT = sim.collapsed ? 1 : 0; lie += (lieT - lie) * (reducedMotion() ? 1 : Math.min(1, 2.4 * dt));
    if (Math.abs(lieT - lie) < .002) lie = lieT;
    const drowsy = clamp((1 - V.alert) / .7, 0, 1);
    sway = lie < .5 ? Math.sin(simT * .9) * 4.5 * clamp((drowsy - .2) * 2, 0, 1) * (1 - lie) : 0;
    const a = -90 * lie, dyy = 95 * lie, bob = lie < 1 ? Math.sin(simT * .9 + 1) * 3 * drowsy * (1 - lie) : 0;
    body.setAttribute('transform', `translate(${CX} ${(MID + dyy + bob).toFixed(1)}) rotate(${(a + sway).toFixed(2)}) translate(${-CX} ${-MID})`);
    shadow.setAttribute('rx', (70 + 120 * lie).toFixed(1)); shadow.setAttribute('cy', (334 + 0 * lie).toFixed(1));
    const droop = drowsy * (lie < 1 ? 1 : .35);
    head.setAttribute('transform', `translate(0 ${(droop * 5).toFixed(1)}) rotate(${(droop * 16 * Math.sin(simT * .5 + .4) * .3 + droop * 13).toFixed(1)} 260 102) translate(260 100) scale(1 ${(1 - droop * .04).toFixed(3)}) translate(-260 -100)`);
    const close = clamp((1 - V.alert - .12) / .5, 0, 1); lids.forEach((l, i) => { const y0 = 61.5; l.setAttribute('transform', `translate(0 ${y0}) scale(1 ${(0.12 + .88 * close).toFixed(3)}) translate(0 ${-y0})`); });
    $('flashL').setAttribute('opacity', close > .85 ? .9 : 0);
    const pup = clamp(1.2 - .5 * clamp((1 - V.alert) * 1.3, 0, 1), .5, 1.2); pups.forEach((p) => p.setAttribute('r', pup.toFixed(2)));
    mouth.setAttribute('ry', (1 + clamp((eff - .5) / .5, 0, 1) * 3.2).toFixed(2));
    // breathing: steady at a normal rate, long uneven pauses when slow
    let lvl;
    if (V.rr >= 10) { rphase += dt * V.rr / 60; lvl = (1 - Math.cos(2 * Math.PI * rphase)) / 2; }
    else {
      if (simT >= nextB) { bStart = simT; bDur = clamp(3.2 - V.rr * .15, 1.2, 2.7) * (.9 + rand() * .2); bAmp = clamp(.35 + V.rr / 16, .35, 1); nextB = simT + Math.max(bDur + .5, 60 / V.rr * (.8 + rand() * .4)); }
      lvl = simT - bStart < bDur ? Math.sin(Math.PI * (simT - bStart) / bDur) ** 2 * bAmp : 0;
    }
    lvl *= clamp(.5 + V.rr / 16 * .5, .5, 1);
    torso.setAttribute('transform', `translate(260 160) scale(${(1 + .035 * lvl).toFixed(3)} ${(1 + .03 * lvl).toFixed(3)}) translate(-260 -160)`);
    kneel.setAttribute('transform', `translate(0 ${(bob * .5).toFixed(1)})`);
    // heartbeat
    beat += dt * V.hr / 60; const ph = beat % 1, pulse = Math.exp(-ph * 7);
    fpulse.setAttribute('opacity', (.9 * pulse).toFixed(2)); fpulse.setAttribute('r', (3 + 4 * (1 - pulse)).toFixed(1));
    hp.setAttribute('transform', `translate(12 12) scale(${(1 + .25 * pulse).toFixed(3)}) translate(-12 -12)`);
    // colour
    const t = tint(), skin = mix(SKIN[0], SKIN[1], t), lip = mix(LIP[0], LIP[1], t), nail = mix(NAIL[0], NAIL[1], t);
    skinEls.forEach((e) => e.setAttribute('fill', skin)); lipEls.forEach((e) => e.setAttribute('fill', lip)); nailEls.forEach((e) => e.setAttribute('fill', nail));
    // hotspots follow the body
    const tr = body.getAttribute('transform'); hsEls.forEach(({ hs, g, pulse: pu, tip }) => {
      const body_ = hs.needs; const p = body_ ? xf(lie, hs.x, hs.y) : [hs.x, hs.y];
      if (body_) { g.setAttribute('transform', `translate(${(p[0] - hs.x).toFixed(1)} ${(p[1] - hs.y).toFixed(1)})`); pu.setAttribute('cx', p[0].toFixed(1)); pu.setAttribute('cy', p[1].toFixed(1)); }
      const tx = p[0] > 400 ? p[0] - 150 : p[0] + 28; tip.setAttribute('transform', `translate(${tx.toFixed(0)} ${Math.max(6, p[1] - 40).toFixed(0)})`);
    });
    // traces + readouts
    hist.push([simT, lvl]); while (hist.length && simT - hist[0][0] > 30) hist.shift();
    ehist.push([simT, ecg(ph)]); while (ehist.length && simT - ehist[0][0] > 6) ehist.shift();
    if (pn - last > 60) {
      last = pn;
      rLine.setAttribute('d', hist.map(([tt, v], i) => `${i ? 'L' : 'M'}${((tt - (simT - 30)) / 30 * 300).toFixed(1)} ${(44 - v * 38).toFixed(1)}`).join(' '));
      eLine.setAttribute('d', ehist.map(([tt, v], i) => `${i ? 'L' : 'M'}${((tt - (simT - 6)) / 6 * 300).toFixed(1)} ${(36 - v * 30).toFixed(1)}`).join(' '));
      rrV.textContent = String(Math.round(V.rr)); rrV.className = 'v ' + (V.rr < 10 ? 'low' : 'ok');
      hrV.textContent = String(V.hr); hrV.className = 'v ' + (V.hr < 50 ? 'low' : 'ok');
      spV.textContent = V.spo2 + '%'; spV.className = 'v ' + (V.spo2 < 90 ? 'low' : 'ok');
      const sn = stateName(V.alert); alV.textContent = sn; alV.className = 'v txt ' + (V.alert < .55 ? 'low' : 'ok');
      if (sim.t0) { clock.hidden = false; clock.querySelector('b').textContent = fmt(((sim.helpedAt || now) - sim.t0) / 1000); clock.firstChild.textContent = sim.helpedAt ? 'Time until help was called' : 'Time since you found them'; }
      scene.classList.toggle('helped', !!sim.helpedAt);
      if (sim.recoveredAt) { status.hidden = false; status.className = 'od-status ok'; status.textContent = 'Paramedics are caring for them'; }
      else if (sim.helpedAt) { status.hidden = false; status.className = 'od-status call'; status.textContent = 'On the line with 911'; }
      else status.hidden = true;
      if (showColor) { const sw = colorCard.querySelectorAll('.sw i'); if (sw.length) { sw[1].style.background = lip; sw[2].style.background = nail; } }
      if (counting) { const el = (pn - counting) / 1000; countN = hist.filter(([tt], i) => i && hist[i - 1][1] < .05 && hist[i][1] >= .05 && tt > simT - el).length; if (el >= 15) { counting = 0; showCard(`${countN} breath${countN === 1 ? '' : 's'} in 15 seconds`, countN < 3 ? 'Long pauses between breaths. Compare with the line below.' : 'Compare with the line below.'); } else { card.hidden = false; card.replaceChildren(h('b', `Counting… ${Math.ceil(15 - el)}s`), h('span', `${countN} breath${countN === 1 ? '' : 's'} so far`)); } }
      svg.classList.toggle('phone-on', !!phoneLit && pn - phoneLit < 3500); svg.classList.toggle('drips-on', !!drips && pn - drips < 3500);
    }
  }
  refreshDoseUI(); check(); loop();
  const iv = setInterval(loop, 33);
  return {
    onPartDone(qid) {
      if (qid === 'ov2' && !sim.helpedAt) { sim.helpedAt = Date.now(); ctx.save(); refreshDoseUI(); log.append(h('p', h('b', 'Help is on the way. '), 'The dispatcher stays on the line with you.')); }
      if (qid === 'ov3' && !sim.recoveredAt) { sim.recoveredAt = Date.now(); target = 0; ctx.save(); log.append(h('p', h('b', 'Help arrives. '), 'Paramedics take over. Staying and giving clear information made it easier for them.')); log.lastChild.scrollIntoView({ block: 'nearest' }); }
    },
    destroy() { clearInterval(iv); clearTimeout(shoutTimer); clearTimeout(cardT); }
  };
}
