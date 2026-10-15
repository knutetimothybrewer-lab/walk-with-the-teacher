// Mission 2 simulation: a bystander emergency scene (adult collapse, drowning victim, infant) and a trainer AED.
// Everything here is practice: the student chooses actions, presses and holds the chest pad in rhythm, and watches the live meters.
// The action tiles are listed alphabetically on purpose, so the layout does not suggest an order. The scene itself reacts to the order.
import { h, svg } from '../util.js';
import * as M from './rescue-model.js';

const W = 960, H = 420, FLOOR = 340;
const fmt1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const clock = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/* ====================================================================================== drawing */
function capsule(ctx, a, b, wd, fill, stroke) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-6, r = wd / 2;
  ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(dy, dx));
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(L, -r); ctx.arc(L, 0, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(0, r); ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = 1.5; ctx.strokeStyle = stroke; ctx.stroke(); } ctx.restore();
}
const gauss = (x) => Math.exp(-x * x);

function background(ctx, mode) {
  if (mode === 'drowning') {
    const g = ctx.createLinearGradient(0, 0, 0, FLOOR); g.addColorStop(0, '#d9eef7'); g.addColorStop(1, '#f2fafd'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR);
    // pool water at the back with light ripples
    const w = ctx.createLinearGradient(0, 150, 0, 260); w.addColorStop(0, '#5ec4e6'); w.addColorStop(1, '#2d94c4'); ctx.fillStyle = w; ctx.fillRect(0, 150, W, 110);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; for (let y = 170; y < 250; y += 22) { ctx.beginPath(); for (let x = 0; x <= W; x += 24) ctx.lineTo(x, y + Math.sin(x / 38 + y) * 3); ctx.stroke(); }
    ctx.fillStyle = '#cfd8dc'; ctx.fillRect(0, 258, W, 8);
    // lifeguard chair silhouette and ring buoy
    ctx.fillStyle = '#e8edf0'; ctx.fillRect(800, 120, 8, 140); ctx.fillRect(860, 120, 8, 140); ctx.fillRect(792, 118, 84, 10);
    ctx.strokeStyle = '#d2332b'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(120, 215, 24, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(120, 215, 24, 0.4, 1.2); ctx.stroke();
    const d = ctx.createLinearGradient(0, 266, 0, H); d.addColorStop(0, '#e4dccb'); d.addColorStop(1, '#cdc3ad'); ctx.fillStyle = d; ctx.fillRect(0, 266, W, H - 266);
    ctx.strokeStyle = 'rgba(120,110,90,0.35)'; ctx.lineWidth = 1; for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 266); ctx.lineTo(x - 30, H); ctx.stroke(); }
  } else if (mode === 'infant') {
    const g = ctx.createLinearGradient(0, 0, 0, FLOOR); g.addColorStop(0, '#f7ecd9'); g.addColorStop(1, '#fbf5ea'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR);
    ctx.fillStyle = '#e3d3bd'; ctx.fillRect(0, 236, W, 6);                       // wall base
    ctx.fillStyle = '#cfe0d4'; ctx.beginPath(); ctx.roundRect(70, 60, 130, 100, 8); ctx.fill(); ctx.strokeStyle = '#a8c0b0'; ctx.lineWidth = 5; ctx.stroke();  // picture frame
    ctx.fillStyle = '#e8b9a0'; ctx.beginPath(); ctx.arc(135, 110, 22, 0, Math.PI * 2); ctx.fill();
    const r = ctx.createLinearGradient(0, 242, 0, H); r.addColorStop(0, '#9fb7c9'); r.addColorStop(1, '#7f99ad'); ctx.fillStyle = r; ctx.fillRect(0, 242, W, H - 242);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3; for (let x = 20; x < W; x += 46) { ctx.beginPath(); ctx.moveTo(x, 250); ctx.lineTo(x, H); ctx.stroke(); }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, FLOOR); g.addColorStop(0, '#e6ecf1'); g.addColorStop(1, '#f6f8fa'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR);
    // gym wall, bleachers and a basketball hoop
    ctx.fillStyle = '#c9d3dc'; ctx.fillRect(0, 210, W, 56);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#b7c3ce' : '#a9b7c4'; ctx.fillRect(560, 120 + i * 36, 400, 36); }
    ctx.fillStyle = '#fff'; ctx.fillRect(90, 60, 110, 74); ctx.strokeStyle = '#d2332b'; ctx.lineWidth = 4; ctx.strokeRect(90, 60, 110, 74); ctx.strokeRect(122, 92, 46, 34);
    ctx.strokeStyle = '#e07b1f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(145, 138, 22, 6, 0, 0, Math.PI * 2); ctx.stroke();
    const f = ctx.createLinearGradient(0, 266, 0, H); f.addColorStop(0, '#d9a867'); f.addColorStop(1, '#b98544'); ctx.fillStyle = f; ctx.fillRect(0, 266, W, H - 266);
    ctx.strokeStyle = 'rgba(120,80,30,0.28)'; ctx.lineWidth = 1; for (let y = 286; y < H; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 300); ctx.lineTo(W, 300); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, FLOOR - 2, W, 3);
}

/** Victim lying on the back, seen from the side, head to the left. dep = chest compression in px, rise = chest lift in px. */
function victim(ctx, mode, cx, dep, rise, st) {
  const infant = mode === 'infant';
  const top = infant ? FLOOR - 52 : FLOOR - 64, thick = infant ? 52 : 64;
  const x0 = infant ? cx - 130 : cx - 120, x1 = infant ? cx + 90 : cx + 130;
  const skin = infant ? '#f1c7a6' : mode === 'drowning' ? '#d9a47c' : '#b9805a';
  const shirt = infant ? '#ffe28a' : mode === 'drowning' ? '#2b6fb0' : '#2f8f83';
  const pants = infant ? '#ffe28a' : mode === 'drowning' ? '#e0524a' : '#39424d';
  if (infant) { ctx.fillStyle = '#d7e4f0'; ctx.beginPath(); ctx.roundRect(cx - 280, FLOOR - 16, 560, 22, 10); ctx.fill(); ctx.strokeStyle = '#a9bdd0'; ctx.lineWidth = 2; ctx.stroke(); }
  // legs
  const legEnd = infant ? cx + 230 : cx + 470, legH = infant ? 30 : 52;
  capsule(ctx, [x1 - 10, FLOOR - legH / 2 - 2], [legEnd, FLOOR - legH / 2 - 2], legH, pants, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = infant ? '#fff' : '#f4f4f4'; ctx.beginPath(); ctx.roundRect(legEnd - 6, FLOOR - (infant ? 26 : 34), infant ? 34 : 60, infant ? 22 : 30, 8); ctx.fill(); ctx.strokeStyle = '#999'; ctx.lineWidth = 1.5; ctx.stroke();
  // head (face up) and neck
  const hr = infant ? 46 : 31, hx = x0 - (infant ? 36 : 28), hy = FLOOR - hr + 2;
  ctx.fillStyle = skin; ctx.fillRect(x0 - 10, FLOOR - 28, 30, 26);
  ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fillStyle = skin; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke();
  ctx.fillStyle = mode === 'drowning' ? '#3b2a20' : infant ? '#7a5a3c' : '#231b16';
  ctx.beginPath(); ctx.arc(hx, hy, hr + 1, Math.PI * 0.85, Math.PI * 1.55); ctx.lineTo(hx, hy); ctx.closePath(); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(hx + 4, hy - hr + 4); ctx.lineTo(hx + 12, hy - hr - 8); ctx.lineTo(hx + 20, hy - hr + 8); ctx.closePath(); ctx.fill(); // nose points up
  ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hx + 10, hy - hr * 0.4, hr * 0.14, 0.1, Math.PI - 0.1); ctx.stroke();                 // closed eye
  ctx.beginPath(); ctx.moveTo(hx + hr * 0.45, hy + hr * 0.2); ctx.lineTo(hx + hr * 0.7, hy + hr * 0.22); ctx.stroke();                                          // mouth
  if (mode === 'drowning') { ctx.fillStyle = 'rgba(70,170,220,0.7)'; [[hx - 8, hy + 14], [hx + 6, hy + 24], [hx + 18, hy + 8]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }); }
  if (st.mask) { ctx.fillStyle = 'rgba(190,230,245,0.85)'; ctx.strokeStyle = '#4b8fb0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx + hr * 0.2, hy + hr * 0.1); ctx.lineTo(hx + hr * 0.95, hy + hr * 0.1); ctx.lineTo(hx + hr * 0.78, hy + hr * 0.62); ctx.lineTo(hx + hr * 0.3, hy + hr * 0.62); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // torso with a chest that dips under the hands and lifts with each breath
  const pts = [];
  for (let x = x0; x <= x1; x += 6) {
    const bulge = 6 * gauss((x - (cx - 30)) / 90);
    const y = top - bulge - rise * gauss((x - cx + 15) / 80) + dep * gauss((x - cx) / (infant ? 34 : 42));
    pts.push([x, y]);
  }
  ctx.beginPath(); ctx.moveTo(x0, FLOOR); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(x1, FLOOR); ctx.closePath();
  const sg = ctx.createLinearGradient(0, top - 10, 0, FLOOR); sg.addColorStop(0, shade(shirt, 24)); sg.addColorStop(1, shade(shirt, -28));
  ctx.fillStyle = sg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
  if (st.bare) { // clothing pulled aside: skin on the chest
    ctx.beginPath(); ctx.moveTo(cx - 50, FLOOR); pts.filter(([x]) => x >= cx - 50 && x <= cx + 50).forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(cx + 50, FLOOR); ctx.closePath(); ctx.fillStyle = skin; ctx.fill();
  }
  // near arm resting along the side
  if (!infant) capsule(ctx, [cx + 40, FLOOR - 24], [cx + 150, FLOOR - 18], 24, shade(shirt, 6), 'rgba(0,0,0,0.25)');
  else capsule(ctx, [cx + 10, FLOOR - 20], [cx + 70, FLOOR - 16], 16, shade(shirt, 6), 'rgba(0,0,0,0.25)');
  return { chestTop: top, hx, hy };
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); const c = (v) => Math.max(0, Math.min(255, v + amt));
  return '#' + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Rescuer in front view, kneeling beside the victim on the far side, arms straight to the hands on the chest. */
function rescuer(ctx, mode, cx, dep, chestTop, st) {
  const skin = '#8d5a3b', hoodie = '#2b3a67', pants = '#2d3340';
  if (mode === 'infant') {
    // an adult's forearm comes in from the right; two fingertips rest just below the nipple line
    const tip = [cx, chestTop - 4 + dep];
    capsule(ctx, [cx + 190, 130 + dep * 0.6], [cx + 40, chestTop - 70 + dep * 0.8], 46, hoodie, 'rgba(0,0,0,0.3)');
    capsule(ctx, [cx + 40, chestTop - 70 + dep * 0.8], [cx + 8, tip[1] - 26], 28, skin, 'rgba(0,0,0,0.25)');
    capsule(ctx, [cx + 4, tip[1] - 26], [cx - 2, tip[1]], 10, skin, 'rgba(0,0,0,0.25)');
    capsule(ctx, [cx + 14, tip[1] - 26], [cx + 10, tip[1]], 10, skin, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(cx + 235, 80 + dep * 0.4, 36, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1d1815'; ctx.beginPath(); ctx.arc(cx + 235, 74 + dep * 0.4, 37, Math.PI, Math.PI * 2); ctx.fill();
    return;
  }
  const sy = 128 + dep, hy = chestTop - 6 + dep;
  // legs and hips (behind the victim)
  capsule(ctx, [cx - 38, 262], [cx - 78, FLOOR - 6], 58, pants, 'rgba(0,0,0,0.3)');
  capsule(ctx, [cx + 38, 262], [cx + 78, FLOOR - 6], 58, pants, 'rgba(0,0,0,0.3)');
  // torso
  const tg = ctx.createLinearGradient(cx - 70, 0, cx + 70, 0); tg.addColorStop(0, shade(hoodie, 20)); tg.addColorStop(0.5, hoodie); tg.addColorStop(1, shade(hoodie, -20));
  ctx.beginPath(); ctx.moveTo(cx - 62, sy); ctx.quadraticCurveTo(cx, sy - 16, cx + 62, sy); ctx.lineTo(cx + 46, 280); ctx.lineTo(cx - 46, 280); ctx.closePath(); ctx.fillStyle = tg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
  // arms locked straight, shoulders over hands
  capsule(ctx, [cx - 54, sy + 6], [cx - 6, hy], 30, shade(hoodie, 10), 'rgba(0,0,0,0.3)');
  capsule(ctx, [cx + 54, sy + 6], [cx + 6, hy], 30, shade(hoodie, 10), 'rgba(0,0,0,0.3)');
  // head
  ctx.fillStyle = skin; ctx.fillRect(cx - 9, sy - 28, 18, 22);
  ctx.beginPath(); ctx.arc(cx, sy - 52, 34, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#1d1815'; ctx.beginPath(); ctx.arc(cx, sy - 56, 35, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1d1815'; [[-12, -52], [12, -52]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(cx + dx, sy + dy, 3, 0, Math.PI * 2); ctx.fill(); });
  ctx.strokeStyle = '#4a2a1a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, sy - 40, 9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // hands: heel of one hand with the other on top
  ctx.fillStyle = skin; ctx.beginPath(); ctx.roundRect(cx - 18, hy - 7, 36, 16, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  void st;
}

function drawScene(ctx, st) {
  ctx.clearRect(0, 0, W, H);
  const mode = st.mode, infant = mode === 'infant';
  background(ctx, mode);
  const cx = 400;
  const depPx = st.depthVisual * (infant ? 15 : 9);          // pixels of chest travel for the current depth in inches
  const risePx = st.rise * (infant ? 12 : 9);
  // the rescuer's legs sit behind the victim, the upper body in front
  if (!infant) { const sy = 128 + depPx; void sy; }
  const info = victimBehind(ctx, mode, cx, depPx, risePx, st);
  rescuer(ctx, mode, cx, depPx, info.chestTop, st);
  // beat cue ring (optional): a soft pulse at 110 per minute
  if (st.cueOn) {
    const phase = (st.now % (60000 / 110)) / (60000 / 110), k = Math.max(0, 1 - phase * 2.2);
    ctx.strokeStyle = 'rgba(11,87,208,' + (0.15 + 0.6 * k) + ')'; ctx.lineWidth = 4 + 6 * k; ctx.beginPath(); ctx.arc(W - 70, 70, 26 + 8 * k, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(11,87,208,0.9)'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('beat', W - 70, 74); ctx.textAlign = 'left';
  }
  ctx.fillStyle = 'rgba(18,32,43,0.85)'; ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText(M.MODES[mode].who.charAt(0).toUpperCase() + M.MODES[mode].who.slice(1), 18, 28);
  ctx.font = '600 14px system-ui, sans-serif'; ctx.fillStyle = 'rgba(18,32,43,0.7)'; ctx.fillText('Time since collapse ' + clock(st.elapsed), 18, 50);
}
function victimBehind(ctx, mode, cx, dep, rise, st) {
  // rescuer legs first so the victim covers them, then the victim; the upper body is drawn after
  if (mode !== 'infant') {
    const pants = '#2d3340';
    capsule(ctx, [cx - 38, 262], [cx - 78, FLOOR - 6], 58, pants, 'rgba(0,0,0,0.3)'); capsule(ctx, [cx + 38, 262], [cx + 78, FLOOR - 6], 58, pants, 'rgba(0,0,0,0.3)');
  }
  return victim(ctx, mode, cx, dep, rise, st);
}

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
    drawScene(cv.ctx, { mode: S.mode, depthVisual: visual.depthVisual || 0, rise, bare: sc.bare, mask: sc.mask, cueOn, now, elapsed: since(), m });
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
  const A = { on: false, bare: false, pads: { right: false, left: false }, stage: 'idle', shocked: false, resumed: 0, finished: false, selected: null };
  const aedLog = h('ul.aed-log', { role: 'log', 'aria-live': 'polite', 'aria-label': 'Trainer AED messages (text only, no sound)' });
  const aedScreen = h('div.aed-screen', { 'aria-hidden': 'false' }, h('div.aed-state', 'OFF'));
  const aedMsg = (t, kind) => { aedLog.prepend(h('li', { class: kind || '' }, h('span', { 'aria-hidden': 'true' }, '🔊 '), t)); aedScreen.firstChild.textContent = t.toUpperCase().slice(0, 60); };
  const aedOn = h('button.btn.secondary', { type: 'button', id: 'aed-on', onclick: () => { if (A.on) return; A.on = true; aedMsg('Attach pads to the patient’s bare chest.'); aedRender(); } }, 'ON');
  const aedBare = h('button.btn.secondary', { type: 'button', id: 'aed-bare', onclick: () => { A.bare = true; aedMsg('(You cut away the shirt. The chest is bare. It is dry.)', 'you'); aedRender(); } }, 'Cut or open the shirt');
  const aedShock = h('button.btn.shock', { type: 'button', id: 'aed-shock', disabled: true, onclick: () => { if (A.stage !== 'advised') return; A.shocked = true; A.stage = 'cpr'; A.resumed = 0; aedMsg('Shock delivered. Start CPR now.'); aedRender(); } }, 'SHOCK');
  const padChips = ['right', 'left'].map((id) => h('button.pad-chip', { type: 'button', 'data-pad': id, onclick: () => { A.selected = A.selected === id ? null : id; aedRender(); }, 'aria-pressed': 'false' }, id === 'right' ? 'Pad A (picture: upper right chest)' : 'Pad B (picture: lower left side)'));
  const targets = { right: svg('ellipse', { class: 'tgt', cx: 66, cy: 92, rx: 30, ry: 22, fill: 'none', stroke: '#0b57d0', 'stroke-width': 3, 'stroke-dasharray': '6 5' }), left: svg('ellipse', { class: 'tgt', cx: 152, cy: 176, rx: 30, ry: 22, fill: 'none', stroke: '#0b57d0', 'stroke-width': 3, 'stroke-dasharray': '6 5' }) };
  const aedTorso = svg('svg', { class: 'torso aed-torso', viewBox: '0 0 220 300', role: 'group', 'aria-label': 'Bare chest with two dashed outlines where the pads go' },
    svg('path', { d: 'M82 6h56v34c0 8 6 12 18 15l36 12c10 4 15 12 15 24v215H13V91c0-12 5-20 15-24l36-12c12-3 18-7 18-15z', fill: '#d9ac8a', stroke: '#9d7254', 'stroke-width': 2 }), targets.right, targets.left);
  const padImgs = { right: svg('g', { class: 'padimg', visibility: 'hidden' }, svg('rect', { x: 38, y: 74, width: 56, height: 36, rx: 8, fill: '#f4f4f4', stroke: '#555', 'stroke-width': 2 }), svg('path', { d: 'M48 96l12-14 12 14', stroke: '#d2332b', 'stroke-width': 3, fill: 'none' })), left: svg('g', { class: 'padimg', visibility: 'hidden' }, svg('rect', { x: 124, y: 158, width: 56, height: 36, rx: 8, fill: '#f4f4f4', stroke: '#555', 'stroke-width': 2 }), svg('path', { d: 'M134 180l12-14 12 14', stroke: '#d2332b', 'stroke-width': 3, fill: 'none' })) };
  aedTorso.append(padImgs.right, padImgs.left);
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
    A.stage = 'analyzing'; aedMsg('Analyzing heart rhythm. Do not touch the patient.');
    clearTimeout(analysisTimer);
    analysisTimer = setTimeout(() => { if (A.stage !== 'analyzing') return; if (A.resumed >= 10 && A.shocked) { A.stage = 'done'; aedMsg('No shock advised. Continue CPR until EMS arrives.'); if (!A.finished) { A.finished = true; done.aed = true; api.report('aed'); } } else { A.stage = 'advised'; aedMsg('Shock advised. Stand clear. Press the flashing button.'); } aedRender(); }, 3200 / speed());
  }
  const aedPad = h('button.chest-pad.small', { type: 'button', id: 'aed-pad', onclick: () => aedCompress() }, h('span.pad-top', 'Press chest'), h('span.pad-sub', 'one compression per press'));
  function aedCompress() {
    if (A.stage === 'analyzing') { aedMsg('Motion detected. Stop moving the patient.'); startAnalysis(); return; }
    if (A.stage === 'advised') { aedMsg('(You touched the patient while a shock was ready. The AED warns everyone to stand clear.)', 'you'); return; }
    if (A.stage === 'cpr') { A.resumed++; if (A.resumed === 1) aedMsg('(You resume compressions right away.)', 'you'); if (A.resumed >= 10) { A.stage = 'idle2'; aedMsg('Continue CPR. Analyzing again soon.'); setTimeout(() => { if (!A.finished) { A.stage = 'analyzing'; aedMsg('Analyzing heart rhythm. Do not touch the patient.'); setTimeout(() => { A.stage = 'done'; aedMsg('No shock advised. Continue CPR until EMS arrives.'); A.finished = true; done.aed = true; api.report('aed'); aedRender(); }, 2400 / speed()); aedRender(); } }, 500 / speed()); } aedRender(); return; }
    if (A.stage === 'idle' || A.stage === 'done') aedMsg('(You press the chest. Compressions can continue while the pads are being attached.)', 'you');
  }
  function aedRender() {
    aedOn.disabled = A.on; aedBare.disabled = A.bare;
    padChips.forEach((b) => { const id = b.dataset.pad; b.disabled = A.pads[id]; b.setAttribute('aria-pressed', String(A.selected === id)); b.dataset.on = A.pads[id] ? 'true' : 'false'; });
    padImgs.right.setAttribute('visibility', A.pads.right ? 'visible' : 'hidden'); padImgs.left.setAttribute('visibility', A.pads.left ? 'visible' : 'hidden');
    aedShock.disabled = A.stage !== 'advised'; aedShock.dataset.ready = A.stage === 'advised' ? 'true' : 'false';
    aedStatus.textContent = A.finished ? 'AED practice complete: one shock cycle finished.' : 'AED practice: ' + ({ idle: 'work through the device.', analyzing: 'the AED is analyzing, so keep your hands off.', advised: 'a shock is advised.', cpr: 'resume CPR.', idle2: 'keep compressing.', done: 'finishing up.' }[A.stage] || '');
    aedScreen.firstChild.dataset.live = A.on ? 'true' : 'false';
  }
  const aedStatus = h('p.sim-note', { role: 'status', 'aria-live': 'polite' }, '');
  const aedReset = h('button.btn.secondary.small', { type: 'button', onclick: () => { clearTimeout(analysisTimer); Object.assign(A, { on: false, bare: false, pads: { right: false, left: false }, stage: 'idle', shocked: false, resumed: 0, finished: false, selected: null }); aedLog.replaceChildren(); aedScreen.firstChild.textContent = 'OFF'; aedRender(); } }, 'Reset the AED');

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
      h('div.aed-device', h('div.aed-body', h('div.aed-title', 'TRAINER AED'), aedScreen, h('div.aed-btns', aedOn, aedShock)), aedLog),
      h('div.aed-patient', h('h4', 'Patient'), aedBare, aedTorso, h('div.pad-pick', h('p.small.muted', 'Pick a pad, then choose where it goes (or click the outline).'), h('div.row', padChips), h('div.row', targetBtns)), aedPad)),
    aedStatus, h('div.row', aedReset));

  host.replaceChildren(h('div.rescue-lab', tablist, panels.scene, panels.aed));
  fresh('adult'); aedRender(); renderMeters(); startLoop();
  return { destroy() { S.destroyed = true; stopAuto(); clearTimeout(analysisTimer); cancelAnimationFrame(S.raf); } };
}
