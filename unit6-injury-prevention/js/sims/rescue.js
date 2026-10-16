// Mission 2 simulation: a bystander emergency scene (adult collapse, drowning victim, infant) and a trainer AED.
// Everything here is practice: the student chooses actions, presses and holds the chest pad in rhythm, and watches the live meters.
// The action tiles are listed alphabetically on purpose, so the layout does not suggest an order. The scene itself reacts to the order.
import { h, svg } from '../util.js';
import * as M from './rescue-model.js';
import { drawScene } from './rescue-art.js';

const W = 960, H = 420;
const fmt1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const clock = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/* ====================================================================================== placement inset (front of the torso) */
function torsoInset(onPlace) {
  const w = 220, hh = 300;
  const root = svg('svg', { class: 'torso', viewBox: '0 0 ' + w + ' ' + hh, role: 'application', tabindex: '0', 'aria-label': 'Chest diagram. Drag the hand marker, or focus here and use the arrow keys to move it.', focusable: 'true' });
  const defs = svg('defs', svg('linearGradient', { id: 'tskin', x1: 0, y1: 0, x2: 0, y2: 1 }, svg('stop', { offset: 0, 'stop-color': '#e9c3a4' }), svg('stop', { offset: 1, 'stop-color': '#cf9f7b' })));
  root.append(defs,
    svg('path', { d: 'M82 6h56v34c0 8 6 12 18 15l36 12c10 4 15 12 15 24v215H13V91c0-12 5-20 15-24l36-12c12-3 18-7 18-15z', fill: 'url(#tskin)', stroke: '#9d7254', 'stroke-width': 2 }),
    svg('path', { class: 'sternum', d: 'M110 62v118', stroke: '#b78e6e', 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0.55, fill: 'none' }),
    svg('line', { x1: 110, y1: 62, x2: 110, y2: 200, stroke: '#9d7254', 'stroke-width': 1.5, 'stroke-dasharray': '3 4' }),
    svg('circle', { cx: 70, cy: 120, r: 6, fill: '#a77a5c' }), svg('circle', { cx: 150, cy: 120, r: 6, fill: '#a77a5c' }),
    svg('path', { d: 'M55 215q55 14 110 0', stroke: '#b78e6e', 'stroke-width': 2, fill: 'none' }));
  let pos = [0.22, 0.20];                                     // starts off the breastbone on purpose
  const token = svg('g', { class: 'hand-token' }, svg('rect', { x: -22, y: -12, width: 44, height: 24, rx: 10, fill: '#0b57d0', stroke: '#fff', 'stroke-width': 3 }), svg('text', { x: 0, y: 5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#fff' }, 'HAND'));
  root.appendChild(token);
  const place = () => { token.setAttribute('transform', 'translate(' + (pos[0] * w) + ',' + (60 + pos[1] * (hh - 60 - 20)) + ')'); };
  // y fraction runs from the notch at the top of the breastbone (0) to the bottom of the ribs (1)
  place();
  const fromEvent = (e) => { const r = root.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = ((e.clientY - r.top) / r.height * hh - 60) / (hh - 80); pos = [Math.max(0.05, Math.min(0.95, x)), Math.max(0, Math.min(1, y))]; place(); };
  let drag = false;
  root.addEventListener('pointerdown', (e) => { drag = true; root.setPointerCapture(e.pointerId); fromEvent(e); });
  root.addEventListener('pointermove', (e) => { if (drag) fromEvent(e); });
  root.addEventListener('pointerup', () => { if (drag) { drag = false; onPlace(pos[0], pos[1]); } });
  root.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-0.03, 0], ArrowRight: [0.03, 0], ArrowUp: [0, -0.04], ArrowDown: [0, 0.04] }[e.key];
    if (!k) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlace(pos[0], pos[1]); } return; }
    e.preventDefault(); pos = [Math.max(0.05, Math.min(0.95, pos[0] + k[0])), Math.max(0, Math.min(1, pos[1] + k[1]))]; place(); onPlace(pos[0], pos[1]);
  });
  return { el: root, get pos() { return pos.slice(); } };
}

/* ====================================================================================== the sim */
export function mountSim(host, api) {
  const speed = () => Number(window.__W6_SIM_SPEED) || 1;    // test hook only: speeds up the hands-free demo compressions
  const S = { tab: 'scene', mode: 'adult', destroyed: false, raf: 0 };
  const done = { adult: false, drowning: false, infant: false, aed: false };

  const cv = (() => { const dpr = Math.min(2, window.devicePixelRatio || 1); const c = h('canvas', { role: 'img', 'aria-label': 'Side view of an emergency scene', width: Math.round(W * dpr), height: Math.round(H * dpr) }); const ctx = c.getContext('2d'); ctx.scale(dpr, dpr); return { c, ctx }; })();

  /* ---------- scene state ---------- */
  let sc, events, down, auto, autoTimer, cueOn = false, visual = { depth: 0, rise: 0, target: 0 }, t0, breathAnim = 0, lastRelease = 0;
  function fresh(mode) {
    stopAuto();
    S.mode = mode;
    sc = { responseChecked: false, breathingChecked: false, called: false, airwayOpened: false, placed: false, compressions: 0, breaths: 0, cycleCompressions: 0, cycleBreaths: 0, bare: false, mask: false, log: [], awaitingBreaths: false, finished: false };
    events = []; down = null; visual = { depth: 0, rise: 0, target: 0 }; t0 = performance.now(); breathAnim = 0;
    t_log.replaceChildren(); phone.hidden = true; phoneLines.replaceChildren(); coach.textContent = 'Choose actions below. The scene reacts to what you do.';
    ems.hidden = true;
    renderAll();
  }
  const mm = () => M.MODES[S.mode];
  const since = () => performance.now() - t0;
  function logEvent(text) { sc.log.push({ at: since(), text }); t_log.append(h('li', h('span.t', clock(since())), ' ' + text)); }
  function say(text) { coach.textContent = text; }

  /* ---------- DOM: header, mode switch ---------- */
  const modeBar = h('div.mode-bar', { role: 'radiogroup', 'aria-label': 'Choose a scene' }, Object.values(M.MODES).map((m) => {
    const b = h('button.mode-btn', { type: 'button', role: 'radio', 'aria-checked': String(m.id === S.mode), id: 'mode-' + m.id, onclick: () => { if (S.mode !== m.id) { fresh(m.id); modeBar.querySelectorAll('.mode-btn').forEach((x) => x.setAttribute('aria-checked', String(x.id === 'mode-' + m.id))); } } }, m.label);
    return b;
  }));
  const coach = h('p.coach', { role: 'status', 'aria-live': 'polite' }, '');
  const prog = h('p.sim-note', { id: 'scene-prog', role: 'status', 'aria-live': 'polite' }, '');

  /* ---------- actions (alphabetical on purpose) ---------- */
  const tile = (id, label, fn, extra) => h('button.act', { type: 'button', id: 'act-' + id, onclick: () => { fn(); renderAll(); }, 'data-done': 'false' }, h('span.ck', { 'aria-hidden': 'true' }, '○'), label, extra || null);
  const acts = {};
  const actList = [
    ['airway', 'Open the airway (tilt head, lift chin)', () => {
      sc.airwayOpened = true; logEvent('Opened the airway'); say('Head tilted back and chin lifted. The airway is open.'); }],
    ['bare', 'Bare the chest (open or cut clothing)', () => { sc.bare = true; logEvent('Cleared clothing from the chest'); say('The chest is bare. Anything that touches skin, like AED pads, will stick.'); }],
    ['breaths', 'Give 2 rescue breaths', () => giveBreaths()],
    ['call', 'Call 911 (speaker on)', () => callEms()],
    ['breathing', 'Look for breathing (up to 10 seconds)', () => checkBreathing()],
    ['response', 'Tap shoulders and shout', () => checkResponse()]
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const actRow = h('div.acts', { role: 'group', 'aria-label': 'Actions (listed alphabetically)' });
  actList.forEach(([id, label, fn]) => { const t = tile(id, label, fn); acts[id] = t; actRow.appendChild(t); });

  function checkResponse() {
    sc.responseChecked = true; logEvent('Tapped shoulders and shouted');
    say(S.mode === 'infant' ? 'You tap the sole of the foot and call the baby’s name. No response. The baby is limp.' : 'You tap both shoulders and shout, “Are you okay?” No response. The person does not move or answer.');
  }
  function checkBreathing() {
    sc.breathingChecked = true; logEvent('Looked for breathing');
    if (S.mode === 'drowning') say('You watch the chest for up to 10 seconds. It is not rising. The lips look blue and there is water at the mouth.');
    else if (S.mode === 'infant') say('You watch the tummy and chest for up to 10 seconds. There is no normal breathing.');
    else say('You watch the chest for up to 10 seconds. There are only a few slow, noisy gasps. Gasping is not normal breathing.');
  }
  function callEms() {
    if (sc.called) { say('911 is already on speaker. The dispatcher is still on the line.'); return; }
    sc.called = true; logEvent('Called 911 and put the phone on speaker');
    phone.hidden = false;
    const lines = [['911', '911, what is the address of your emergency?'], ['You', 'We are at the ' + (S.mode === 'drowning' ? 'community pool' : S.mode === 'infant' ? 'Alvarez home, 14 Maple Court' : 'school gym') + '. ' + (S.mode === 'infant' ? 'A baby is not responding.' : 'Someone collapsed and will not respond.')], ['911', 'Is the ' + (S.mode === 'infant' ? 'baby' : 'person') + ' breathing normally?'], ['You', 'No.'], ['911', 'Help is on the way. Stay on the line. ' + (S.mode === 'infant' ? 'Keep following my instructions.' : 'Is there an AED nearby? Send someone to get it.')]];
    phoneLines.replaceChildren(...lines.map(([who, text]) => h('li', { class: who === 'You' ? 'me' : 'them' }, h('b', who + ': '), text)));
    say(sc.compressions > 0 ? 'Good: help is now on the way while you keep going.' : 'The dispatcher is on speaker and will coach you.');
  }
  function giveBreaths() {
    if (!sc.airwayOpened) { say('You blow in, but the chest does not rise. The airway is not open. Tilt the head back and lift the chin first.'); return; }
    sc.breaths += 2; sc.cycleBreaths = 2; breathAnim = 1; sc.mask = true; logEvent('Gave 2 rescue breaths (chest rose)');
    say('Two breaths, each about one second. You watch the chest rise.');
    setTimeout(() => { sc.mask = false; renderAll(); }, 2200 / speed());
    if (sc.awaitingBreaths) { sc.awaitingBreaths = false; sc.cycleCompressions = 0; say('Breaths given. Go back to compressions.'); }
  }

  /* ---------- phone panel + timeline ---------- */
  const phoneLines = h('ul.phone-lines');
  const phone = h('div.phone', { hidden: true }, h('div.phone-head', h('span', { 'aria-hidden': 'true' }, '📞'), h('b', ' 911 call'), h('span.muted', ' on speaker')), phoneLines);
  const t_log = h('ol.timeline', { 'aria-label': 'What you did, in the order you did it' });
  const ems = h('div.banner.ok', { hidden: true }, h('div', h('strong', 'EMS arrives. '), 'Keep going until they take over. Tell them what you saw, how long it has been, what you did, and whether an AED shocked.'));

  /* ---------- chest pad (press and hold) ---------- */
  const pad = h('button.chest-pad', { type: 'button', id: 'chest-pad', 'aria-describedby': 'pad-help' }, h('span.pad-top', 'Chest pad'), h('span.pad-sub', 'Press and hold to push down, release to let the chest come back up'));
  const padHelp = h('p.help', { id: 'pad-help' }, 'Mouse or touch: press and hold, then release. Keyboard: hold Space or Enter. Or turn on hands-free practice.');
  function canCompress() {
    if (sc.awaitingBreaths) { say('Thirty compressions done. In this scene the rescuer now gives 2 breaths before the next set.'); return false; }
    return true;
  }
  function pressStart(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (down != null || !canCompress()) return;
    down = performance.now(); visual.target = 1; pad.classList.add('down'); startLoop();
  }
  function pressEnd() {
    if (down == null) return;
    const t1 = performance.now(); const ev = { t0: down, t1 }; events.push(ev); down = null; visual.target = 0; pad.classList.remove('down');
    const lastGap = events.length >= 2 ? ev.t0 - events[events.length - 2].t1 : 999;
    if (lastGap < M.RECOIL_MIN_GAP_MS) visual.residual = 0.35 * M.depthFromHold(ev.t1 - ev.t0, S.mode); else visual.residual = 0;
    onCompression(ev);
  }
  function onCompression() {
    sc.compressions++; sc.cycleCompressions++;
    if (sc.compressions === 1) logEvent('Started chest compressions' + (sc.called ? '' : ' (911 has not been called yet)'));
    if (sc.compressions === 1 && !sc.called) say('Compressions are going, but help is not on the way yet. Call 911 on speaker and keep going.');
    if (!sc.placed && sc.compressions === 1) say('The hands are not in the right place yet. Use the chest diagram to move them.');
    if (mm().breaths && sc.cycleCompressions >= 30) { sc.awaitingBreaths = true; say('30 compressions done. Give 2 rescue breaths, then continue.'); logEvent('Finished a set of 30 compressions'); }
    renderMeters(); renderAll();
  }
  pad.addEventListener('pointerdown', pressStart); pad.addEventListener('pointerup', pressEnd); pad.addEventListener('pointerleave', pressEnd); pad.addEventListener('pointercancel', pressEnd);
  pad.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) pressStart(e); });
  pad.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pressEnd(); } });

  // hands-free practice: the page presses for you at a steady 110 per minute
  const autoBox = h('input', { type: 'checkbox', id: 'auto-comp' });
  autoBox.addEventListener('change', () => { if (autoBox.checked) startAuto(); else stopAuto(); });
  function startAuto() {
    stopAuto(); auto = true;
    const cycle = 60000 / 110 / speed(), holdMs = (mm().depthBand[0] + mm().depthBand[1]) / 2 / mm().depthPerMs / speed();
    const tick = () => {
      if (!auto || S.destroyed) return;
      if (!sc.awaitingBreaths) {
        const now = performance.now(); down = now; visual.target = 1;
        setTimeout(() => { if (down != null && auto) { const t1 = performance.now(); const ev = { t0: now, t1: now + holdMs * speed() }; void t1; events.push(ev); down = null; visual.target = 0; visual.residual = 0; onCompression(ev); } }, holdMs);
      }
      autoTimer = setTimeout(tick, cycle);
    };
    tick(); startLoop();
  }
  function stopAuto() { auto = false; clearTimeout(autoTimer); if (typeof down !== 'undefined' && down != null) { down = null; if (visual) visual.target = 0; } }

  /* ---------- meters ---------- */
  const gaugeSvg = (() => {
    const s = svg('svg', { class: 'gauge', viewBox: '-10 0 220 112', role: 'img', 'aria-label': 'Compression rate gauge' });
    const arc = (a0, a1, r, color, wd) => { const p = (a) => [100 + r * Math.cos(Math.PI - a), 100 - r * Math.sin(Math.PI - a)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return svg('path', { d: 'M' + x0 + ' ' + y0 + ' A' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + y1, fill: 'none', stroke: color, 'stroke-width': wd, 'stroke-linecap': 'butt' }); };
    const ang = (bpm) => Math.min(1, bpm / 200) * Math.PI;
    s.append(arc(0, Math.PI, 80, '#d3dce3', 14), arc(ang(100), ang(120), 80, '#0a7458', 14));
    [0, 50, 100, 150, 200].forEach((v) => { const a = ang(v), x = 100 + 96 * Math.cos(Math.PI - a), y = 100 - 96 * Math.sin(Math.PI - a); s.appendChild(svg('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 10, fill: '#33444f' }, String(v))); });
    const needle = svg('line', { x1: 100, y1: 100, x2: 100 - 70, y2: 100, stroke: '#12202b', 'stroke-width': 4, 'stroke-linecap': 'round' });
    s.append(needle, svg('circle', { cx: 100, cy: 100, r: 7, fill: '#12202b' }));
    s._needle = (bpm) => { const a = ang(bpm || 0); needle.setAttribute('x2', String(100 + 72 * Math.cos(Math.PI - a))); needle.setAttribute('y2', String(100 - 72 * Math.sin(Math.PI - a))); };
    return s;
  })();
  const mRate = h('div.rm-val', '—'), mRateState = h('div.rm-state', 'Press the chest pad to start');
  const depthFill = h('i'), depthTrack = h('div.mv-track.dep', { role: 'meter', 'aria-label': 'Compression depth', 'aria-valuemin': '0', 'aria-valuemax': '3.6', 'aria-valuenow': '0' }, h('b.band'), depthFill);
  const mDepth = h('span.mv-num', '—'), mDepthState = h('span.rm-state', '');
  const mRecoil = h('span.light', 'No data yet'), mCount = h('span.mv-num', '0'), mPause = h('span.light.ok', 'No pause');
  const meterPanel = h('div.rescue-meters',
    h('div.rm-rate', gaugeSvg, h('div.rm-readout', h('span.rm-lab', 'Rate (per minute)'), mRate, mRateState)),
    h('div.rm-depth', h('div.mv-top', h('span.mv-lab', 'Depth (inches)'), h('span', mDepth)), depthTrack, mDepthState),
    h('div.rm-misc', h('div.rm-cell', h('span.mv-lab', 'Recoil'), mRecoil), h('div.rm-cell', h('span.mv-lab', 'Compressions'), mCount), h('div.rm-cell', h('span.mv-lab', 'Pauses'), mPause)));
  function renderMeters() {
    const a = M.analyze(events, S.mode), m = mm();
    mCount.textContent = String(sc.compressions);
    if (a.rate != null) { mRate.textContent = String(Math.round(a.rate)); gaugeSvg._needle(a.rate); mRateState.textContent = a.rateState === 'good' ? 'In the target zone' : a.rateState === 'slow' ? 'Too slow' : 'Too fast'; mRateState.dataset.s = a.rateState; } else { mRate.textContent = '—'; gaugeSvg._needle(0); mRateState.textContent = events.length ? 'Keep going to measure the rate' : 'Press the chest pad to start'; mRateState.dataset.s = ''; }
    if (a.depth != null) { mDepth.textContent = fmt1(a.depth); depthFill.style.width = Math.min(100, a.depth / M.MAX_DEPTH_IN * 100) + '%'; mDepthState.textContent = a.depthState === 'good' ? 'Good depth' : a.depthState === 'shallow' ? 'Too shallow' : 'Too deep'; mDepthState.dataset.s = a.depthState; depthTrack.setAttribute('aria-valuenow', fmt1(a.depth)); }
    const b = depthTrack.querySelector('.band'); b.style.left = (m.depthBand[0] / M.MAX_DEPTH_IN * 100) + '%'; b.style.width = ((m.depthBand[1] - m.depthBand[0]) / M.MAX_DEPTH_IN * 100) + '%';
    if (a.recoil) { mRecoil.textContent = a.recoil === 'full' ? 'Full recoil' : 'Leaning (let the chest come all the way up)'; mRecoil.dataset.s = a.recoil; }
    mPause.textContent = a.pauses ? a.pauses + (a.pauses === 1 ? ' long pause' : ' long pauses') : 'No long pauses'; mPause.className = 'light ' + (a.pauses ? 'warn' : 'ok');
  }

  /* ---------- hand placement ---------- */
  const placeNote = h('p.sim-note.small', { role: 'status', 'aria-live': 'polite' }, 'Move the hand marker onto the chest. The note here says what the position means.');
  const inset = torsoInset((x, y) => {
    const f = M.placementFeedback(x, y, S.mode); placeNote.textContent = f.text; placeNote.dataset.ok = f.ok ? 'true' : 'false';
    if (f.ok && !sc.placed) { sc.placed = true; logEvent('Found the right hand position'); }
    renderAll();
  });

  /* ---------- progress / completion ---------- */
  function renderAll() {
    Object.entries(acts).forEach(([id, t]) => {
      const isDone = { airway: sc.airwayOpened, bare: sc.bare, breaths: sc.breaths > 0, call: sc.called, breathing: sc.breathingChecked, response: sc.responseChecked }[id];
      t.dataset.done = isDone ? 'true' : 'false'; t.querySelector('.ck').textContent = isDone ? '✓' : '○';
      const needsBreathsTile = id === 'breaths' || id === 'airway';
      t.hidden = needsBreathsTile && !mm().breaths && id !== 'bare' ? true : false;
    });
    pad.disabled = false; pad.dataset.wait = sc.awaitingBreaths ? 'true' : 'false';
    pad.querySelector('.pad-sub').textContent = sc.awaitingBreaths ? 'Give 2 rescue breaths before the next set' : 'Press and hold to push down, release to let the chest come back up';
    const need = M.sceneNeeds(S.mode, sc).sort((a, b) => a.localeCompare(b));
    prog.textContent = need.length ? 'Still to try in this scene: ' + need.join('; ') + '.' : 'Scene complete. Nice work: that is one scene checked off.';
    if (!need.length && !sc.finished) { sc.finished = true; ems.hidden = false; logEvent('EMS arrived'); done[S.mode] = true; api.report(S.mode); }
    if (!need.length) prog.dataset.ok = 'true'; else prog.dataset.ok = 'false';
    startLoop();
    cv.c.setAttribute('aria-label', 'Side view of ' + mm().who + ', with a rescuer kneeling beside them. ' + sc.compressions + ' compressions so far.');
  }

  /* ---------- animation loop ---------- */
  function startLoop() { if (!S.raf) S.raf = requestAnimationFrame(frame); }
  let lastFrame = 0;
  function frame(now) {
    S.raf = 0; if (S.destroyed) return;
    const dt = Math.min(0.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
    const reduced = api.reduced();
    const m = mm();
    let targetDepth = 0;
    if (down != null) targetDepth = M.depthFromHold(performance.now() - down, S.mode);
    else targetDepth = visual.residual || 0;
    const k = reduced ? 1 : Math.min(1, dt * 22);
    visual.depthVisual = (visual.depthVisual || 0) + (targetDepth - (visual.depthVisual || 0)) * k;
    if (down == null && !visual.residual && visual.depthVisual < 0.01) visual.depthVisual = 0;
    breathAnim = Math.max(0, breathAnim - dt * 0.5 / (1 / speed()));
    const rise = breathAnim > 0 ? Math.sin(Math.min(1, (1 - breathAnim) * 2) * Math.PI) * 1.1 : 0;
    drawScene(cv.ctx, { mode: S.mode, depthVisual: visual.depthVisual || 0, rise, bare: sc.bare, mask: sc.mask, airway: sc.airwayOpened, called: sc.called, breathing: breathAnim, cueOn, now, clock: clock(since()), m });
    if (down != null) { const live = M.depthFromHold(performance.now() - down, S.mode); mDepth.textContent = fmt1(live); depthFill.style.width = Math.min(100, live / M.MAX_DEPTH_IN * 100) + '%'; }
    if (events.length) { const idle = M.pausedFor(events, performance.now()); if (idle > M.PAUSE_MS && down == null) { mPause.textContent = 'Paused for ' + Math.floor(idle / 1000) + ' s: keep going'; mPause.className = 'light warn'; } }
    const moving = down != null || (visual.depthVisual || 0) > 0.01 || breathAnim > 0 || cueOn || auto || sc.mask;
    if (moving || !S.idleDrawn) { S.idleDrawn = !moving; S.raf = requestAnimationFrame(frame); }
    // keep the clock moving about once a second even when nothing else is
    if (!moving) setTimeout(() => { if (!S.destroyed && S.tab === 'scene') { S.idleDrawn = false; startLoop(); } }, 1000);
  }
  const cueBox = h('input', { type: 'checkbox', id: 'cue-box' });
  cueBox.addEventListener('change', () => { cueOn = cueBox.checked; startLoop(); });
  const resetBtn = h('button.btn.secondary.small', { type: 'button', onclick: () => fresh(S.mode) }, 'Start this scene over');

  /* ================= AED PANEL ================= */
  const A = { on: false, bare: false, pads: { right: false, left: false }, stage: 'idle', shocked: false, resumed: 0, finished: false, selected: null, hands: false };
  const aedLog = h('ul.aed-log', { role: 'log', 'aria-live': 'polite', 'aria-label': 'Trainer AED messages (text only, no sound)' });
  const aedLed = h('span.aed-led', { 'data-state': 'off', 'aria-hidden': 'true' });
  const aedScreen = h('div.aed-screen', { 'aria-hidden': 'false' }, h('div.aed-state', 'OFF'));
  const aedMsg = (t, kind) => { aedLog.prepend(h('li', { class: kind || '' }, h('span', { 'aria-hidden': 'true' }, '🔊 '), t)); aedScreen.firstChild.textContent = t.toUpperCase().slice(0, 60); };
  const aedOn = h('button.btn.secondary', { type: 'button', id: 'aed-on', onclick: () => { if (A.on) return; A.on = true; aedMsg('Attach pads to the patient’s bare chest.'); aedRender(); } }, 'ON');
  const aedBare = h('button.btn.secondary', { type: 'button', id: 'aed-bare', onclick: () => { A.bare = true; aedMsg('(You cut away the shirt. The chest is bare. It is dry.)', 'you'); aedRender(); } }, 'Cut or open the shirt');
  const aedShock = h('button.btn.shock', { type: 'button', id: 'aed-shock', disabled: true, onclick: () => { if (A.stage !== 'advised') return; A.shocked = true; A.stage = 'cpr'; A.resumed = 0; A.hands = false; aedMsg('Shock delivered. Start CPR now.'); aedTorso.dataset.flash = '1'; setTimeout(() => { delete aedTorso.dataset.flash; }, 800); aedRender(); } }, 'SHOCK');
  const padChips = ['right', 'left'].map((id) => h('button.pad-chip', { type: 'button', 'data-pad': id, onclick: () => { A.selected = A.selected === id ? null : id; aedRender(); }, 'aria-pressed': 'false' }, id === 'right' ? 'Pad A (picture: upper right chest)' : 'Pad B (picture: lower left side)'));
  const BODY = 'M82 6h56v34c0 8 6 12 18 15l36 12c10 4 15 12 15 24v215H13V91c0-12 5-20 15-24l36-12c12-3 18-7 18-15z';
  const stop = (o, c, op) => svg('stop', { offset: o, 'stop-color': c, 'stop-opacity': op == null ? 1 : op });
  const aedDefs = svg('defs',
    svg('linearGradient', { id: 'aSkin', x1: 0, y1: 0, x2: 0, y2: 1 }, stop(0, '#e6bd9a'), stop(1, '#c58f69')),
    svg('radialGradient', { id: 'aPec', cx: 0.5, cy: 0.4, r: 0.6 }, stop(0, '#f1cfb2', 0.9), stop(1, '#c58f69', 0)),
    svg('linearGradient', { id: 'aShirt', x1: 0, y1: 0, x2: 0, y2: 1 }, stop(0, '#3aa397'), stop(1, '#256f66')),
    svg('linearGradient', { id: 'aPad', x1: 0, y1: 0, x2: 0, y2: 1 }, stop(0, '#ffffff'), stop(1, '#d9dee2')));
  const anatomy = svg('g', { class: 'anat', fill: 'none' },
    svg('ellipse', { cx: 72, cy: 126, rx: 52, ry: 40, fill: 'url(#aPec)' }), svg('ellipse', { cx: 148, cy: 126, rx: 52, ry: 40, fill: 'url(#aPec)' }),
    svg('path', { d: 'M110 58 Q88 54 62 66 M110 58 Q132 54 158 66', stroke: '#a97652', 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M104 54 Q110 66 116 54', stroke: '#a97652', 'stroke-width': 2 }),
    svg('path', { d: 'M110 70v112', stroke: '#b98d6b', 'stroke-width': 11, 'stroke-linecap': 'round', opacity: 0.4 }),
    svg('path', { d: 'M110 70v112', stroke: '#a97652', 'stroke-width': 1.4, 'stroke-dasharray': '3 4' }),
    ...[0, 1, 2, 3].map((i) => svg('path', { d: 'M104 ' + (150 + i * 16) + ' Q70 ' + (156 + i * 16) + ' 30 ' + (146 + i * 16) + ' M116 ' + (150 + i * 16) + ' Q150 ' + (156 + i * 16) + ' 190 ' + (146 + i * 16), stroke: '#a97652', 'stroke-width': 1.3, opacity: 0.45 })),
    svg('circle', { cx: 62, cy: 134, r: 4.5, fill: '#a77a5c' }), svg('circle', { cx: 158, cy: 134, r: 4.5, fill: '#a77a5c' }),
    svg('ellipse', { cx: 110, cy: 266, rx: 4, ry: 5, fill: '#a97652', opacity: 0.7 }));
  const shirtG = svg('g', { class: 'shirt' },
    svg('path', { d: BODY, fill: 'url(#aShirt)', stroke: '#1b5851', 'stroke-width': 2 }),
    svg('path', { d: 'M84 8 Q110 40 136 8', fill: '#d9ac8a', stroke: '#1b5851', 'stroke-width': 2 }),
    svg('path', { d: 'M60 100 Q90 130 76 180 M160 100 Q130 130 144 180 M40 210 Q110 232 180 210 M30 250 Q110 270 190 250', fill: 'none', stroke: 'rgba(0,0,0,0.22)', 'stroke-width': 2, 'stroke-linecap': 'round' }),
    svg('text', { x: 110, y: 160, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 800, fill: 'rgba(255,255,255,0.7)' }, 'RAMS'));
  const targets = { right: svg('ellipse', { class: 'tgt', cx: 66, cy: 92, rx: 30, ry: 22, fill: 'none', stroke: '#0b57d0', 'stroke-width': 3, 'stroke-dasharray': '6 5' }), left: svg('ellipse', { class: 'tgt', cx: 152, cy: 176, rx: 30, ry: 22, fill: 'none', stroke: '#0b57d0', 'stroke-width': 3, 'stroke-dasharray': '6 5' }) };
  const makePad = (cx, cy, rot, wire) => svg('g', { class: 'padimg', visibility: 'hidden' },
    svg('path', { d: wire, fill: 'none', stroke: '#e0b40e', 'stroke-width': 3.2, 'stroke-linecap': 'round' }),
    svg('g', { transform: 'translate(' + cx + ',' + cy + ') rotate(' + rot + ')' },
      svg('rect', { x: -28, y: -19, width: 56, height: 38, rx: 10, fill: 'url(#aPad)', stroke: '#69737b', 'stroke-width': 2 }),
      svg('rect', { x: -22, y: -13, width: 44, height: 26, rx: 6, fill: '#eaf6ee', stroke: '#2f9e6e', 'stroke-width': 1.6 }),
      svg('path', { d: 'M-9 6 L0 -7 L9 6', stroke: '#d2332b', 'stroke-width': 2.6, fill: 'none', 'stroke-linecap': 'round' }),
      svg('rect', { x: -6, y: -26, width: 12, height: 9, rx: 2, fill: '#3b82c4' })));
  const padImgs = { right: makePad(66, 92, -24, 'M64 66 C50 40 30 24 20 -4'), left: makePad(152, 176, 28, 'M160 154 C186 120 200 60 196 -4') };
  const handsG = svg('g', { class: 'hands', visibility: 'hidden' },
    svg('rect', { x: 84, y: 100, width: 52, height: 24, rx: 10, fill: '#8f5b3c', stroke: '#3b2415', 'stroke-width': 2 }),
    ...[0, 1, 2, 3].map((i) => svg('path', { d: 'M' + (94 + i * 11) + ' 104v14', stroke: '#5c3a24', 'stroke-width': 1.4 })),
    svg('rect', { x: 100, y: 62, width: 20, height: 42, rx: 9, fill: '#8f5b3c', stroke: '#3b2415', 'stroke-width': 2 }));
  const aedTorso = svg('svg', { class: 'torso aed-torso', viewBox: '0 0 220 300', role: 'group', 'aria-label': 'Patient’s chest with two dashed outlines where the pads go. The shirt covers the chest until you open it.' },
    aedDefs, svg('path', { d: BODY, fill: 'url(#aSkin)', stroke: '#9d7254', 'stroke-width': 2 }), anatomy, targets.right, targets.left);
  aedTorso.append(padImgs.right, padImgs.left, shirtG, handsG);
  Object.entries(targets).forEach(([id, el]) => { el.style.cursor = 'pointer'; el.addEventListener('click', () => attach(id, A.selected)); });
  const targetBtns = ['right', 'left'].map((id) => h('button.btn.secondary.small', { type: 'button', 'data-target': id, onclick: () => attach(id, A.selected) }, id === 'right' ? 'Place on the upper right chest' : 'Place on the lower left side'));
  function attach(where, padId) {
    if (!padId) { aedMsg('Pick a pad first, then choose where it goes.', 'you'); return; }
    if (!A.on) { aedMsg('(The AED is off. Press ON first.)', 'you'); return; }
    if (!A.bare) { aedMsg('Pads must touch bare skin. Remove the clothing first.'); return; }
    if (padId !== where) { aedMsg('Check pad placement. Follow the picture on the pad.'); A.selected = null; aedRender(); return; }
    A.pads[where] = true; A.selected = null; aedMsg('Pad ' + (where === 'right' ? 'A' : 'B') + ' attached.', 'you');
    if (A.pads.right && A.pads.left && A.stage === 'idle') startAnalysis();
    aedRender();
  }
  let analysisTimer = null;
  function startAnalysis() {
    A.stage = 'analyzing'; A.hands = false; aedMsg('Analyzing heart rhythm. Do not touch the patient.');
    clearTimeout(analysisTimer);
    analysisTimer = setTimeout(() => { if (A.stage !== 'analyzing') return; if (A.resumed >= 10 && A.shocked) { A.stage = 'done'; aedMsg('No shock advised. Continue CPR until EMS arrives.'); if (!A.finished) { A.finished = true; done.aed = true; api.report('aed'); } } else { A.stage = 'advised'; aedMsg('Shock advised. Stand clear. Press the flashing button.'); } aedRender(); }, 3200 / speed());
  }
  const aedPad = h('button.chest-pad.small', { type: 'button', id: 'aed-pad', onclick: () => aedCompress() }, h('span.pad-top', 'Press chest'), h('span.pad-sub', 'one compression per press'));
  let handsT = 0;
  function pressHands() { A.hands = true; handsG.style.transform = 'translateY(9px)'; clearTimeout(handsT); handsT = setTimeout(() => { handsG.style.transform = 'translateY(0)'; }, 150); }
  function aedCompress() {
    if (A.stage === 'analyzing') { aedMsg('Motion detected. Stop moving the patient.'); startAnalysis(); return; }
    if (A.stage === 'advised') { aedMsg('(You touched the patient while a shock was ready. The AED warns everyone to stand clear.)', 'you'); return; }
    if (A.stage === 'cpr' || A.stage === 'idle2' || A.stage === 'idle' || A.stage === 'done') pressHands();
    if (A.stage === 'cpr') { A.resumed++; if (A.resumed === 1) aedMsg('(You resume compressions right away.)', 'you'); if (A.resumed >= 10) { A.stage = 'idle2'; aedMsg('Continue CPR. Analyzing again soon.'); setTimeout(() => { if (!A.finished) { A.stage = 'analyzing'; aedMsg('Analyzing heart rhythm. Do not touch the patient.'); setTimeout(() => { A.stage = 'done'; aedMsg('No shock advised. Continue CPR until EMS arrives.'); A.finished = true; done.aed = true; api.report('aed'); aedRender(); }, 2400 / speed()); aedRender(); } }, 500 / speed()); } aedRender(); return; }
    if (A.stage === 'idle' || A.stage === 'done') aedMsg('(You press the chest. Compressions can continue while the pads are being attached.)', 'you');
  }
  function aedRender() {
    aedOn.disabled = A.on; aedBare.disabled = A.bare;
    padChips.forEach((b) => { const id = b.dataset.pad; b.disabled = A.pads[id]; b.setAttribute('aria-pressed', String(A.selected === id)); b.dataset.on = A.pads[id] ? 'true' : 'false'; });
    shirtG.setAttribute('visibility', A.bare ? 'hidden' : 'visible'); handsG.setAttribute('visibility', A.hands ? 'visible' : 'hidden'); aedLed.dataset.state = !A.on ? 'off' : A.stage;
    padImgs.right.setAttribute('visibility', A.pads.right ? 'visible' : 'hidden'); padImgs.left.setAttribute('visibility', A.pads.left ? 'visible' : 'hidden');
    aedShock.disabled = A.stage !== 'advised'; aedShock.dataset.ready = A.stage === 'advised' ? 'true' : 'false';
    aedStatus.textContent = A.finished ? 'AED practice complete: one shock cycle finished.' : 'AED practice: ' + ({ idle: 'work through the device.', analyzing: 'the AED is analyzing, so keep your hands off.', advised: 'a shock is advised.', cpr: 'resume CPR.', idle2: 'keep compressing.', done: 'finishing up.' }[A.stage] || '');
    aedScreen.firstChild.dataset.live = A.on ? 'true' : 'false';
  }
  const aedStatus = h('p.sim-note', { role: 'status', 'aria-live': 'polite' }, '');
  const aedReset = h('button.btn.secondary.small', { type: 'button', onclick: () => { clearTimeout(analysisTimer); Object.assign(A, { on: false, bare: false, pads: { right: false, left: false }, stage: 'idle', shocked: false, resumed: 0, finished: false, selected: null, hands: false }); aedLog.replaceChildren(); aedScreen.firstChild.textContent = 'OFF'; aedRender(); } }, 'Reset the AED');

  /* ================= LAYOUT ================= */
  const tablist = h('div.sim-tabs', { role: 'tablist', 'aria-label': 'Rescue practice sections' });
  const panels = {};
  [['scene', 'Rescue scene'], ['aed', 'AED trainer']].forEach(([id, label]) => {
    const b = h('button.sim-tab', { type: 'button', role: 'tab', id: 'rtab-' + id, 'aria-controls': 'rpanel-' + id, 'aria-selected': String(id === 'scene'), tabindex: id === 'scene' ? '0' : '-1', onclick: () => select(id) }, label);
    b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select(id === 'scene' ? 'aed' : 'scene'); document.getElementById('rtab-' + S.tab).focus(); } });
    tablist.appendChild(b);
  });
  function select(id) { S.tab = id; ['scene', 'aed'].forEach((t) => { const b = document.getElementById('rtab-' + t); b.setAttribute('aria-selected', String(t === id)); b.tabIndex = t === id ? 0 : -1; panels[t].hidden = t !== id; }); if (id === 'scene') startLoop(); }

  panels.scene = h('div.sim-panel', { role: 'tabpanel', id: 'rpanel-scene', 'aria-labelledby': 'rtab-scene' },
    h('p.sim-intro', 'Pick a scene, then act. You decide what to do and in what order. The tiles are listed alphabetically, not in a suggested order.'),
    modeBar,
    h('div.sim-stage', cv.c),
    coach,
    actRow,
    h('div.rescue-grid',
      h('div.rg-left', h('h4', 'Compress'), pad, padHelp,
        h('div.opts-line', h('label.chk', autoBox, h('span', 'Hands-free practice (the page presses for you)')), h('label.chk', cueBox, h('span', 'Show a beat cue (visual, no sound)')), resetBtn),
        meterPanel),
      h('div.rg-right', h('h4', 'Hand position'), inset.el, placeNote)),
    prog,
    phone, ems,
    h('h4', 'What you did, in order'), t_log);
  panels.aed = h('div.sim-panel', { role: 'tabpanel', id: 'rpanel-aed', 'aria-labelledby': 'rtab-aed', hidden: true },
    h('p.sim-intro', 'Someone is doing CPR on an adult when the AED arrives. This trainer behaves like the real thing and gives text prompts only. Use it however you think is right; it will tell you if something is wrong.'),
    h('div.aed-grid',
      h('div.aed-device', h('div.aed-body', h('div.aed-head', aedLed, h('div.aed-title', 'TRAINER AED'), h('span.aed-heart', { 'aria-hidden': 'true' }, '♥')), aedScreen, h('div.aed-grille', { 'aria-hidden': 'true' }), h('div.aed-btns', aedOn, aedShock), h('div.aed-port', { 'aria-hidden': 'true' }, h('span', 'PADS'))), aedLog),
      h('div.aed-patient', h('h4', 'Patient'), aedBare, aedTorso, h('div.pad-pick', h('p.small.muted', 'Pick a pad, then choose where it goes (or click the outline).'), h('div.row', padChips), h('div.row', targetBtns)), aedPad)),
    aedStatus, h('div.row', aedReset));

  host.replaceChildren(h('div.rescue-lab', tablist, panels.scene, panels.aed));
  fresh('adult'); aedRender(); renderMeters(); startLoop();
  return { destroy() { S.destroyed = true; stopAuto(); clearTimeout(analysisTimer); cancelAnimationFrame(S.raf); } };
}
