// Simulation C: an interactive, time-based emergency scene. The person's breathing, skin colour and oxygen reading
// all come from one small model so the picture, the monitor and the numbers always agree.
import { h, clamp } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };

const HOTSPOTS = [
  { k: 'wake', x: 222, y: 168, label: 'Try to wake them', text: 'You shout their name and shake their shoulder. There is no response.', fx: 'shout' },
  { k: 'breath', x: 285, y: 205, label: 'Check breathing', text: 'You watch their chest and listen. Breathing is very slow, with long pauses and a gurgling, snoring-like sound.', fx: 'count' },
  { k: 'lips', x: 160, y: 178, label: 'Look at lips and skin', text: 'Their lips and skin look pale, with a bluish-gray color.', fx: 'color' },
  { k: 'phone', x: 520, y: 255, label: 'Look at the phone', text: 'A phone on the table is playing music.', fx: 'phone' },
  { k: 'drink', x: 462, y: 276, label: 'Look at the table', text: 'A drink is spilled on the table.', fx: 'drink' }
];

// Breathing pattern while affected: [breath length s, pause s]. About 5 to 6 breaths a minute, uneven.
const SLOW = [[2.4, 6.5], [2.0, 9.5], [2.6, 5.5], [2.2, 10.5]];
const SLOW_LEN = SLOW.reduce((a, [b, p]) => a + b + p, 0);
function slowLevel(t) { // 0..1 chest height
  let u = t % SLOW_LEN;
  for (const [b, p] of SLOW) { if (u < b) return Math.sin(Math.PI * u / b) ** 2; u -= b + p; if (u < 0) return 0; }
  return 0;
}
const normalLevel = (t) => (1 - Math.cos(2 * Math.PI * t / 3.6)) / 2;
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, f) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * f).toString(16).padStart(2, '0')).join(''); };
const SKIN = ['#d9a98c', '#a3a3b4'], LIP = ['#c98a85', '#5f6f9a'], NAIL = ['#e3a79a', '#5a6a96'];
const fmt = (secs) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

const ART = `
<defs>
  <linearGradient id="odwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16213f"/><stop offset="1" stop-color="#0d1530"/></linearGradient>
  <linearGradient id="odfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241d2b"/><stop offset="1" stop-color="#120f18"/></linearGradient>
  <radialGradient id="odlamp" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
  <linearGradient id="odcouch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b5fa3"/><stop offset="1" stop-color="#33427c"/></linearGradient>
  <linearGradient id="odhood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9d4e6"/><stop offset="1" stop-color="#8c9cb8"/></linearGradient>
  <linearGradient id="odjeans" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4d7a"/><stop offset="1" stop-color="#27365b"/></linearGradient>
  <filter id="odblur"><feGaussianBlur stdDeviation="6"/></filter>
</defs>
<rect width="640" height="360" fill="url(#odwall)"/>
<g><rect x="470" y="28" width="132" height="116" rx="6" fill="#0a1a3a" stroke="#34457f" stroke-width="3"/><path d="M536 28 V144 M470 86 H602" stroke="#34457f" stroke-width="3"/><circle cx="566" cy="62" r="13" fill="#e9eefc" opacity=".85"/><circle cx="571" cy="58" r="12" fill="#0a1a3a"/><g fill="#cfe0ff" opacity=".8"><circle cx="492" cy="52" r="1.4"/><circle cx="512" cy="110" r="1.2"/><circle cx="586" cy="120" r="1.4"/></g></g>
<rect y="292" width="640" height="68" fill="url(#odfloor)"/>
<ellipse cx="300" cy="332" rx="250" ry="22" fill="#2b2140" opacity=".7"/>
<g><rect x="40" y="206" width="6" height="86" fill="#2c2a3a"/><ellipse cx="43" cy="202" rx="26" ry="14" fill="#f2c36b" opacity=".9"/><ellipse cx="43" cy="210" rx="120" ry="110" fill="url(#odlamp)"/></g>
<g id="odcouchback"><rect x="104" y="132" width="350" height="104" rx="26" fill="url(#odcouch)"/><path d="M110 150 C200 140 360 140 448 150" stroke="#2a376c" stroke-width="2" fill="none" opacity=".6"/></g>
<g id="odperson">
  <g id="odlegs"><path d="M318 238 C360 232 396 226 420 228 C436 230 440 246 432 252 C412 262 372 264 322 268 Z" fill="url(#odjeans)"/><path d="M416 232 C428 250 432 280 430 308 L452 310 C456 280 450 252 440 232 Z" fill="url(#odjeans)"/><path d="M426 306 h34 c8 0 10 10 2 12 h-38 z" fill="#e9eaf2"/></g>
  <g id="odtorso"><path d="M190 190 C214 168 262 170 302 196 C326 212 336 238 332 268 L214 270 C196 246 186 216 190 190 Z" fill="url(#odhood)"/><path d="M214 206 C240 196 270 204 292 224" stroke="#7d8ca8" stroke-width="2.4" fill="none" opacity=".7"/><path d="M236 230 C256 238 282 238 306 230" stroke="#7d8ca8" stroke-width="2" fill="none" opacity=".5"/></g>
  <g id="odarm"><path d="M214 200 C232 232 240 262 244 300" stroke="#a9b6cf" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M244 300 c-4 8 -3 20 4 24 c8 3 14 -3 14 -12 l-1 -16 z" class="skin"/><g class="nails"><rect x="246" y="320" width="4" height="3" rx="1"/><rect x="252" y="321" width="4" height="3" rx="1"/><rect x="258" y="318" width="4" height="3" rx="1"/></g></g>
  <g id="odhead"><path d="M178 190 C170 182 168 170 172 160 L196 158 L204 188 Z" class="skin"/>
    <ellipse cx="170" cy="146" rx="32" ry="36" class="skin" transform="rotate(-18 170 146)"/>
    <path d="M140 134 C142 110 176 100 198 116 C206 124 206 134 202 140 C192 128 164 124 140 134 Z" fill="#2a1d1a"/>
    <path d="M144 130 C140 150 150 162 160 164" stroke="#2a1d1a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M150 146 q5 3 10 0 M174 146 q5 3 10 0" stroke="#3a2a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M166 150 q-4 10 2 12" stroke="#00000033" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse id="odmouth" cx="166" cy="172" rx="9" ry="4.2" fill="#2d1215"/><path class="lip" d="M156 171 Q166 165 176 171 Q166 178 156 171 Z" opacity=".92"/><path d="M158 172 Q166 175 174 172" stroke="#2d1215" stroke-width="1.4" fill="none"/>
    <ellipse cx="196" cy="150" rx="5" ry="8" class="skin" stroke="#00000022"/></g>
</g>
<g id="odcouchfront"><rect x="100" y="228" width="360" height="62" rx="14" fill="#3b4c8e"/><rect x="100" y="228" width="360" height="12" rx="6" fill="#4b5fa3"/><path d="M280 240 V288" stroke="#2a376c" stroke-width="2" opacity=".55"/><rect x="86" y="170" width="36" height="120" rx="16" fill="#3b4c8e"/><rect x="438" y="170" width="36" height="120" rx="16" fill="#3b4c8e"/><rect x="108" y="290" width="8" height="12" fill="#1e2440"/><rect x="444" y="290" width="8" height="12" fill="#1e2440"/></g>
<g id="odtable"><rect x="430" y="276" width="170" height="14" rx="4" fill="#4a3a2a"/><rect x="448" y="290" width="9" height="46" fill="#3a2d20"/><rect x="574" y="290" width="9" height="46" fill="#3a2d20"/>
  <g id="odphone"><rect x="494" y="256" width="46" height="20" rx="4" fill="#0e1630" stroke="#69b0ff" stroke-width="1.6"/><g class="eq" fill="#69b0ff"><rect x="502" y="262" width="4" height="10"/><rect x="510" y="262" width="4" height="10"/><rect x="518" y="262" width="4" height="10"/><rect x="526" y="262" width="4" height="10"/></g></g>
  <g id="oddrink"><path class="puddle" d="M468 282 q16 -6 38 -1 q8 3 -2 5 q-20 4 -40 0 q-6 -2 4 -4 z" fill="#9bd6ff" opacity=".42"/><path d="M452 272 l26 -10 l6 14 l-26 8 z" fill="#bfe6ff" opacity=".35" stroke="#cfeaff" stroke-width="1.4"/><path class="drip" d="M506 284 v12" stroke="#9bd6ff" stroke-width="2.4" stroke-linecap="round"/></g></g>
<g id="odfx"></g>`;

export function sceneOverdose(host, ctx) {
  const sim = ctx.sim; sim.seen = sim.seen || {}; sim.t0 = sim.t0 || Date.now();
  const box = h('div.sim', h('h3', ctx.stage.title), h('p.lead', ctx.stage.lead));
  const svg = S('svg', { viewBox: '50 60 590 300', role: 'img', 'aria-label': 'A living room at night. A person lies on a couch, not moving. A phone and a spilled drink are on a table.' });
  svg.innerHTML = ART;
  const scene = h('div.od-scene'); scene.append(svg);
  const $ = (id) => svg.querySelector('#' + id);
  const fx = $('odfx'), person = $('odperson');
  const chest = [$('odtorso'), $('odarm')], head = $('odhead');
  const skinEls = svg.querySelectorAll('.skin'), lipEls = svg.querySelectorAll('.lip'), nailEls = svg.querySelectorAll('.nails rect');

  // ---------- hotspots
  const pulseGroup = S('g', { class: 'od-pulses', 'pointer-events': 'none' }, svg), tipGroup = S('g', { class: 'od-tips', 'pointer-events': 'none' }, svg), hsGroup = S('g', { class: 'od-hotspots' }, svg);
  const log = h('div.od-log', { 'aria-live': 'polite' });
  const note = h('p.progress-note');
  const need = ['wake', 'breath', 'lips'];
  function check() {
    const have = need.filter((k) => sim.seen[k]).length;
    if (!sim.ready) { if (have >= need.length) { sim.ready = true; ctx.save(); ctx.markReady(); note.textContent = 'Observation complete. The questions are unlocked.'; } else note.textContent = `Examine the scene: ${have} of ${need.length} key checks done.`; } else note.textContent = 'Observation complete. The questions are unlocked.';
  }
  let shoutTimer = 0;
  const effects = {
    shout() {
      fx.replaceChildren();
      for (let i = 0; i < 3; i++) S('path', { class: 'shout-ring', d: 'M120 150 q-18 -14 0 -30', style: `animation-delay:${i * .22}s;transform-origin:120px 135px` }, fx);
      person.classList.remove('shake'); void person.getBoundingClientRect(); person.classList.add('shake');
      clearTimeout(shoutTimer); shoutTimer = setTimeout(() => { person.classList.remove('shake'); fx.replaceChildren(); }, 1500);
      showCard('"Hey! Can you hear me?"', 'No eye opening, no sound, no movement.');
    },
    count() { counting = performance.now(); countN = 0; showCard('Counting breaths…', 'Watch the chest and the line below for 15 seconds.'); },
    color() { showColor = true; showCard('Compare the colours', ''); renderColorCard(); },
    phone() { phoneLit = performance.now(); },
    drink() { drips = performance.now(); }
  };
  HOTSPOTS.forEach((hs) => {
    const g = S('g', { class: 'hs2' + (sim.seen[hs.k] ? ' seen' : ''), tabindex: 0, role: 'button', 'aria-label': hs.label }, hsGroup);
    const pulse = S('circle', { class: 'pulse' + (sim.seen[hs.k] ? ' off' : ''), cx: hs.x, cy: hs.y, r: 22 }, pulseGroup);
    S('circle', { class: 'ring', cx: hs.x, cy: hs.y, r: 22 }, g);
    const tx = hs.x > 400 ? hs.x - 124 : hs.x + 28, ty = hs.y - 40;
    const tip = S('g', { class: 'tip', transform: `translate(${tx} ${Math.max(6, ty)})` }, tipGroup);
    S('rect', { width: 130, height: 24, rx: 8 }, tip); S('text', { x: 10, y: 16 }, tip).textContent = hs.label;
    const on = () => tip.classList.add('on'), off = () => tip.classList.remove('on');
    g.addEventListener('mouseenter', on); g.addEventListener('mouseleave', off); g.addEventListener('focus', on); g.addEventListener('blur', off);
    S('path', { class: 'tick', d: `M${hs.x - 8} ${hs.y} l5 6 l11 -12` }, g);
    const ex = () => {
      const first = !sim.seen[hs.k]; sim.seen[hs.k] = true; g.classList.add('seen'); pulse.classList.add('off'); effects[hs.fx] && effects[hs.fx]();
      if (first) { ctx.save(); log.append(h('p', h('b', hs.label + ': '), hs.text)); log.lastChild.scrollIntoView({ block: 'nearest' }); }
      else { const hit = [...log.children].find((p) => p.firstChild.textContent.startsWith(hs.label)); if (hit) { hit.classList.remove('flash'); void hit.offsetWidth; hit.classList.add('flash'); } }
      check();
    };
    g.addEventListener('click', ex); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ex(); } });
  });

  // ---------- overlays
  const clock = h('div.od-clock', h('span', 'Time since you found them'), h('b', '0:00'));
  const status = h('div.od-status', { hidden: true });
  const card = h('div.od-card', { hidden: true });
  scene.append(clock, status, card);
  let cardT = 0;
  function showCard(title, body) { card.hidden = false; card.replaceChildren(h('b', title), body ? h('span', body) : ''); clearTimeout(cardT); cardT = setTimeout(() => { if (!showColor) card.hidden = true; }, 4200); }
  let showColor = false, counting = 0, countN = 0, phoneLit = 0, drips = 0;
  const swatch = (c, label) => h('div.sw', h('i', { style: { background: c } }), h('span', label));
  const colorCard = h('div.od-colors');
  function renderColorCard(p = curTint) {
    card.hidden = false; clearTimeout(cardT);
    colorCard.replaceChildren(h('b', 'Lips and nail beds'), h('div.swrow', swatch(LIP[0], 'typical'), swatch(mix(LIP[0], LIP[1], p), 'this person'), swatch(mix(NAIL[0], NAIL[1], p), 'fingertips')),
      h('button.btn.ghost.sm', { type: 'button', onclick: () => { showColor = false; card.hidden = true; } }, 'Close'));
    card.replaceChildren(colorCard);
  }

  // ---------- monitor
  const rate = h('b.v', '--'), spo = h('b.v', '--');
  const trace = S('svg', { viewBox: '0 0 300 60', class: 'od-trace', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  S('path', { d: 'M0 30 H300', class: 'base' }, trace);
  const line = S('path', { class: 'line', d: '' }, trace);
  const mon = h('div.od-monitor', { role: 'group', 'aria-label': 'Breathing monitor' },
    h('div.cell', h('span', 'Breaths per minute'), rate), h('div.cell', h('span', 'Oxygen level (SpO₂)'), spo), h('div.cell.wide', h('span', 'Chest movement, last 30 seconds'), trace));
  box.append(scene, h('p.small.muted', { style: { marginTop: '.5rem' } }, 'Select the parts of the scene (or use Tab and Enter) to examine what you can see and hear. Examine at least the first three.'), log, mon, note);
  host.append(box);
  OD_restore();
  function OD_restore() { HOTSPOTS.filter((x) => sim.seen[x.k]).forEach((hs) => log.append(h('p', h('b', hs.label + ': '), hs.text))); check(); }

  // ---------- model loop
  const hist = []; // [t, level]
  let curTint = 0, lastT = performance.now(), simT = 0, last = 0;
  function tintAt(now) { // 0 healthy .. 1 most affected, from elapsed time; frozen when help is called, eases back after recovery
    const upTo = sim.helpedAt || now, p = clamp((upTo - sim.t0) / 150000, 0, 1) * .92 + .08;
    if (sim.recoveredAt) return p * clamp(1 - (now - sim.recoveredAt) / 9000, 0, 1);
    return p;
  }
  function loop() {
    const now = Date.now(), pn = performance.now(); simT += (pn - lastT) / 1000; lastT = pn;
    curTint = tintAt(now);
    const recovering = !!sim.recoveredAt, blend = recovering ? clamp((now - sim.recoveredAt) / 9000, 0, 1) : 0;
    const lvl = slowLevel(simT) * (1 - blend) + normalLevel(simT) * blend;
    const sc = 1 + .05 * lvl;
    chest.forEach((n) => n.setAttribute('transform', `translate(260 215) scale(${sc.toFixed(3)} ${(1 + .06 * lvl).toFixed(3)}) translate(-260 -215)`));
    head.setAttribute('transform', `rotate(${(-1.2 * lvl).toFixed(2)} 190 190)`);
    const skin = mix(SKIN[0], SKIN[1], curTint), lip = mix(LIP[0], LIP[1], curTint), nail = mix(NAIL[0], NAIL[1], curTint);
    skinEls.forEach((e) => e.setAttribute('fill', skin)); lipEls.forEach((e) => e.setAttribute('fill', lip)); nailEls.forEach((e) => e.setAttribute('fill', nail));
    // monitor
    hist.push([simT, lvl]); while (hist.length && simT - hist[0][0] > 30) hist.shift();
    if (pn - last > 70) {
      last = pn;
      line.setAttribute('d', hist.map(([t, v], i) => `${i ? 'L' : 'M'}${((t - (simT - 30)) / 30 * 300).toFixed(1)} ${(50 - v * 40).toFixed(1)}`).join(' '));
      const bpm = Math.round(5.5 * (1 - blend) + 15 * blend);
      rate.textContent = String(bpm); rate.className = 'v ' + (bpm < 12 ? 'low' : 'ok');
      const o2 = Math.round(97 - 25 * curTint); spo.textContent = o2 + '%'; spo.className = 'v ' + (o2 < 90 ? 'low' : 'ok');
      if (showColor) { const sw = colorCard.querySelectorAll('.sw i'); if (sw.length) { sw[1].style.background = lip; sw[2].style.background = nail; } }
      // clock
      const secs = Math.floor(((sim.helpedAt || now) - sim.t0) / 1000);
      clock.querySelector('b').textContent = fmt(secs); clock.firstChild.textContent = sim.helpedAt ? 'Time until help was called' : 'Time since you found them';
      scene.classList.toggle('helped', !!sim.helpedAt);
      if (sim.recoveredAt) { status.hidden = false; status.className = 'od-status ok'; status.textContent = 'Paramedics are caring for them'; }
      else if (sim.helpedAt) { status.hidden = false; status.className = 'od-status call'; status.textContent = 'On the line with 911'; }
      if (counting) { const el = (pn - counting) / 1000; const n = hist.filter((p, i) => i && hist[i - 1][1] < .05 && p[1] >= .05 && p[0] > simT - el).length; countN = n; if (el >= 15) { counting = 0; showCard(`${countN} breath${countN === 1 ? '' : 'es'} in 15 seconds`, 'Long pauses between breaths. Compare with the line below.'); } else card.replaceChildren(h('b', `Counting… ${Math.ceil(15 - el)}s`), h('span', `${countN} breath${countN === 1 ? '' : 's'} so far`)); }
      svg.classList.toggle('phone-on', phoneLit && pn - phoneLit < 3500); svg.classList.toggle('drips-on', drips && pn - drips < 3500);
    }
  }
  loop();
  const iv = setInterval(loop, 40);
  return {
    onPartDone(qid) {
      if (qid === 'ov2' && !sim.helpedAt) { sim.helpedAt = Date.now(); ctx.save(); log.append(h('p', h('b', 'Help is on the way. '), 'The dispatcher stays on the line with you.')); }
      if (qid === 'ov3' && !sim.recoveredAt) { sim.recoveredAt = Date.now(); ctx.save(); log.append(h('p', h('b', 'Help arrives. '), 'Paramedics take over. Staying and giving clear information made it easier for them.')); log.lastChild.scrollIntoView({ block: 'nearest' }); }
    },
    destroy() { clearInterval(iv); clearTimeout(shoutTimer); clearTimeout(cardT); }
  };
}
