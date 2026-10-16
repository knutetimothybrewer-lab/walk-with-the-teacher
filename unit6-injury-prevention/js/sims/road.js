// Mission 5 simulation: a phone buzzes while you drive, bike or walk, and an interactive ruler-drop reaction test.
// The student chooses what to do with the notification; reaction time and stopping distance respond. Nothing here uses the formal names of
// the kinds of distraction: the scene shows only "eyes", "hands" and "mind", so the scored vocabulary question is not answered on screen.
import { h, svg } from '../util.js';
import * as M from './road-model.js';

const W = 960, H = 420, GROUND = 330;
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const f0 = (x) => String(Math.round(x));

/* ====================================================================================== drawing */
function capsule(ctx, a, b, wd, fill, stroke) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-6, r = wd / 2;
  ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(dy, dx));
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(L, -r); ctx.arc(L, 0, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(0, r); ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = 1.5; ctx.strokeStyle = stroke; ctx.stroke(); } ctx.restore();
}
function wheel(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, '#4a4a4a'); g.addColorStop(1, '#121212'); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fillStyle = '#c9d0d6'; ctx.fill();
}
function sceneBackground(ctx, modeId, scroll) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, '#bfe0f5'); g.addColorStop(1, '#eef6fb'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND);
  // far buildings scroll slowly for a sense of speed
  const off = -((scroll * 0.25) % 220);
  for (let i = -1; i < 7; i++) { const x = off + i * 220, hgt = 90 + ((i * 53) % 70 + 70) % 70; ctx.fillStyle = i % 2 ? '#cfd9e2' : '#c2cfda'; ctx.fillRect(x, GROUND - 40 - hgt, 160, hgt + 40);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) ctx.fillRect(x + 18 + c * 44, GROUND - 40 - hgt + 14 + r * 24, 24, 14); }
  // sidewalk and road
  ctx.fillStyle = '#d9d4c7'; ctx.fillRect(0, GROUND - 40, W, 40);
  const rg = ctx.createLinearGradient(0, GROUND, 0, H); rg.addColorStop(0, '#5a636b'); rg.addColorStop(1, '#3d444a'); ctx.fillStyle = rg; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#e8edf0'; ctx.fillRect(0, GROUND, W, 3);
  ctx.fillStyle = '#e7e29a'; const dash = ((-scroll) % 120 + 120) % 120; for (let x = dash - 120; x < W; x += 120) ctx.fillRect(x, GROUND + 52, 64, 6);
  if (modeId === 'walk') { ctx.fillStyle = '#f5f5f0'; for (let x = 560 - ((scroll * 1.0) % 90); x < W + 90; x += 90) ctx.fillRect(x, GROUND + 6, 40, 70); }
}
function car(ctx, x, y, color, brake, flip) {
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  const p = ctx.createLinearGradient(0, -52, 0, 0); p.addColorStop(0, color[0]); p.addColorStop(1, color[1]);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(-70, 6, 90, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-150, 0); ctx.lineTo(-150, -30); ctx.quadraticCurveTo(-146, -42, -120, -43); ctx.lineTo(-98, -44); ctx.lineTo(-76, -68); ctx.lineTo(-30, -68); ctx.lineTo(-6, -44); ctx.lineTo(8, -40); ctx.lineTo(8, 0); ctx.closePath();
  ctx.fillStyle = p; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.stroke();
  ctx.fillStyle = 'rgba(190,225,245,0.85)'; ctx.beginPath(); ctx.moveTo(-92, -44); ctx.lineTo(-74, -64); ctx.lineTo(-48, -64); ctx.lineTo(-48, -44); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-40, -44); ctx.lineTo(-40, -64); ctx.lineTo(-30, -64); ctx.lineTo(-12, -44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = brake ? '#ff2d2d' : '#8a1c1c'; ctx.fillRect(-152, -30, 7, 12); if (brake) { ctx.fillStyle = 'rgba(255,45,45,0.35)'; ctx.beginPath(); ctx.arc(-148, -24, 22, 0, Math.PI * 2); ctx.fill(); }
  wheel(ctx, -110, 0, 17); wheel(ctx, -20, 0, 17);
  ctx.restore();
}
function person(ctx, x, y, phase, phone, headDown) {
  const sw = Math.sin(phase) * 14;
  const hip = [x, y - 58], neck = [x + (headDown ? 8 : 0), y - 108], head = [x + (headDown ? 16 : 2), y - (headDown ? 126 : 132)];
  capsule(ctx, hip, [x + sw, y - 28], 14, '#3a4a7a', 'rgba(0,0,0,0.3)'); capsule(ctx, [x + sw, y - 28], [x + sw * 1.3, y - 2], 12, '#3a4a7a', 'rgba(0,0,0,0.3)');
  capsule(ctx, hip, [x - sw, y - 28], 14, '#2f3d6a', 'rgba(0,0,0,0.3)'); capsule(ctx, [x - sw, y - 28], [x - sw * 1.3, y - 2], 12, '#2f3d6a', 'rgba(0,0,0,0.3)');
  capsule(ctx, hip, neck, 30, '#d9663a', 'rgba(0,0,0,0.3)');
  capsule(ctx, neck, [x + 26, y - 82], 11, '#d9663a', 'rgba(0,0,0,0.3)'); capsule(ctx, [x + 26, y - 82], phone ? [x + 40, y - 98] : [x + 38, y - 66], 9, '#c58a63', 'rgba(0,0,0,0.3)');
  ctx.beginPath(); ctx.arc(head[0], head[1], 17, 0, Math.PI * 2); ctx.fillStyle = '#c58a63'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#231b16'; ctx.beginPath(); ctx.arc(head[0] - 2, head[1] - 3, 18, Math.PI, Math.PI * 2); ctx.fill();
  if (phone) { ctx.save(); ctx.translate(x + 40, y - 98); ctx.rotate(-0.3); ctx.fillStyle = '#12202b'; ctx.beginPath(); ctx.roundRect(-6, -12, 12, 24, 3); ctx.fill(); ctx.fillStyle = '#7dd3fc'; ctx.fillRect(-4, -9, 8, 16); ctx.restore(); }
}
function bike(ctx, x, y, phase, phone) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x, y + 6, 70, 7, 0, 0, Math.PI * 2); ctx.fill();
  const rear = [x - 48, y - 28], front = [x + 48, y - 28], seat = [x - 22, y - 78], bar = [x + 34, y - 82], pedal = [x, y - 22];
  [rear, front].forEach(([cx, cy]) => { ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.lineWidth = 5; ctx.strokeStyle = '#1b1d1f'; ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = '#8d949a'; for (let a = 0; a < 6; a++) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a * 1.05 + phase) * 28, cy + Math.sin(a * 1.05 + phase) * 28); ctx.stroke(); } });
  ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = '#e07b1f'; ctx.beginPath(); ctx.moveTo(rear[0], rear[1]); ctx.lineTo(seat[0], seat[1]); ctx.lineTo(bar[0], bar[1]); ctx.lineTo(front[0], front[1]); ctx.moveTo(seat[0], seat[1]); ctx.lineTo(pedal[0], pedal[1]); ctx.lineTo(rear[0], rear[1]); ctx.stroke();
  const hip = [seat[0], seat[1] - 6], neck = [seat[0] + 26, seat[1] - 54];
  capsule(ctx, hip, [pedal[0] + Math.cos(phase) * 8, pedal[1] - 10 + Math.sin(phase) * 8], 13, '#3a4a7a', 'rgba(0,0,0,0.3)');
  capsule(ctx, hip, neck, 26, '#2f8f83', 'rgba(0,0,0,0.3)'); capsule(ctx, neck, phone ? [bar[0] - 8, bar[1] - 4] : bar, 10, '#2f8f83', 'rgba(0,0,0,0.3)');
  ctx.beginPath(); ctx.arc(neck[0] + 8, neck[1] - 16, 15, 0, Math.PI * 2); ctx.fillStyle = '#c58a63'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
  ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(neck[0] + 8, neck[1] - 18, 17, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
  if (phone) { ctx.fillStyle = '#12202b'; ctx.beginPath(); ctx.roundRect(bar[0] - 18, bar[1] - 14, 12, 22, 3); ctx.fill(); ctx.fillStyle = '#7dd3fc'; ctx.fillRect(bar[0] - 16, bar[1] - 11, 8, 15); }
}

function drawTrip(ctx, st) {
  ctx.clearRect(0, 0, W, H);
  const m = M.MODES[st.mode], px = st.px;                   // pixels per foot in the hazard phase
  sceneBackground(ctx, st.mode, st.scroll);
  const meX = 200, y = GROUND + 36;
  const hazardX = meX + (st.hazardOn ? (m.hazardFt - st.x) * px : 560 + (m.hazardFt) * px * 0);
  // hazard object
  if (st.hazardOn) {
    if (st.mode === 'drive') car(ctx, hazardX + 150, y, ['#2563eb', '#173a8a'], true, false);
    else if (st.mode === 'bike') { car(ctx, hazardX + 150, y - 4, ['#a3a3a3', '#5d5d5d'], false, false); ctx.save(); ctx.translate(hazardX + 10, y - 40); ctx.fillStyle = 'rgba(190,225,245,0.9)'; ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-48 + Math.min(1, st.hazardAge * 2) * 6, -4); ctx.lineTo(-52, -44); ctx.lineTo(0, -40); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    else { ctx.fillStyle = '#c63a34'; ctx.beginPath(); ctx.roundRect(hazardX + 4, y - 34, 40, 6, 3); ctx.fill(); wheel(ctx, hazardX + 8, y - 8, 9); wheel(ctx, hazardX + 40, y - 8, 9); capsule(ctx, [hazardX + 24, y - 34], [hazardX + 28, y - 76], 7, '#444'); ctx.fillStyle = '#e5b800'; ctx.beginPath(); ctx.arc(hazardX + 28, y - 90, 12, 0, Math.PI * 2); ctx.fill(); }
    // warning marker
    ctx.fillStyle = '#b3261e'; const tx = Math.min(W - 50, Math.max(60, hazardX + 70)), ty = 70; ctx.beginPath(); ctx.moveTo(tx, ty - 28); ctx.lineTo(tx + 28, ty + 22); ctx.lineTo(tx - 28, ty + 22); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '800 30px system-ui'; ctx.textAlign = 'center'; ctx.fillText('!', tx, ty + 17); ctx.textAlign = 'left';
  }
  // me
  const phoneUp = st.phoneUp;
  if (st.mode === 'drive') { car(ctx, meX + 8, y, ['#d93a35', '#8e1f1c'], st.braking, false);
    // driver head and phone in the window
    ctx.fillStyle = '#c58a63'; ctx.beginPath(); ctx.arc(meX - 56, y - 56, 12, 0, Math.PI * 2); ctx.fill(); if (phoneUp) { ctx.fillStyle = '#12202b'; ctx.beginPath(); ctx.roundRect(meX - 52, y - 54, 10, 18, 3); ctx.fill(); ctx.fillStyle = '#7dd3fc'; ctx.fillRect(meX - 50, y - 51, 6, 12); } }
  else if (st.mode === 'bike') bike(ctx, meX, y, st.phase, phoneUp);
  else person(ctx, meX, y, st.phase, phoneUp, phoneUp);
  // collision flash
  if (st.hit) { ctx.save(); ctx.translate(meX + (st.mode === 'drive' ? 40 : 60), y - 50); ctx.fillStyle = 'rgba(255,214,102,0.9)'; ctx.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 24 : 58; ctx.lineTo(Math.cos(i * Math.PI / 8) * r, Math.sin(i * Math.PI / 8) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); ctx.fillStyle = '#b3261e'; ctx.font = '800 34px system-ui'; ctx.fillText('Collision', meX + 80, 150); }
  if (st.stopped) { ctx.fillStyle = '#0a5c33'; ctx.font = '800 34px system-ui'; ctx.fillText('Stopped in time', meX + 80, 150); }
  // phone buzz
  if (st.buzz) { ctx.fillStyle = '#12202b'; ctx.font = '700 30px system-ui'; ctx.fillText('📱 Buzz!', 24, 54); }
  ctx.fillStyle = 'rgba(18,32,43,0.85)'; ctx.font = '700 28px system-ui'; ctx.fillText(m.label + ' at ' + st.mph + ' mph', 24, st.buzz ? 100 : 54);
  // stopping bar
  if (st.showBar) {
    const bx = 24, by = 206, bw = W - 48, scale = bw / Math.max(m.hazardFt * 1.15, (st.tr.totalFt || 0) * 1.05);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(bx - 6, by - 52, bw + 12, 68);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx, by - 28, Math.min(bw, st.tr.reactFt * scale), 22); ctx.fillStyle = '#2563eb'; ctx.fillRect(bx + st.tr.reactFt * scale, by - 28, Math.min(bw, st.tr.brakeFt * scale), 22);
    const hx = bx + m.hazardFt * scale; ctx.fillStyle = '#b3261e'; ctx.fillRect(hx - 3, by - 40, 6, 46);
    ctx.fillStyle = '#12202b'; ctx.font = '700 20px system-ui'; ctx.fillText('Reaction ' + f0(st.tr.reactFt) + ' ft', bx + 6, by - 8); ctx.fillStyle = '#fff'; if (st.tr.reactFt * scale + 140 < bw) ctx.fillText('Braking ' + f0(st.tr.brakeFt) + ' ft', bx + st.tr.reactFt * scale + 8, by - 8);
    ctx.fillStyle = '#b3261e'; ctx.textAlign = 'right'; ctx.fillText('Hazard ' + m.hazardFt + ' ft', Math.min(W - 26, hx - 8), by - 44); ctx.textAlign = 'left';
  }
}

/* ====================================================================================== the sim */
export function mountSim(host, api) {
  const speed = () => Number(window.__W6_SIM_SPEED) || 1;
  const S = { tab: 'trip', raf: 0, destroyed: false };
  const runs = { drive: [], bike: [], walk: [] }, reported = { drive: false, bike: false, walk: false, ruler: false };
  const tabs = [['trip', 'Phone and the road'], ['ruler', 'Ruler drop test']];
  const tablist = h('div.sim-tabs', { role: 'tablist', 'aria-label': 'Distraction practice' });
  const panels = {};
  tabs.forEach(([id, label]) => {
    const b = h('button.sim-tab', { type: 'button', role: 'tab', id: 'rdtab-' + id, 'aria-controls': 'rdpanel-' + id, 'aria-selected': String(id === 'trip'), tabindex: id === 'trip' ? '0' : '-1', onclick: () => select(id) }, label);
    b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = id === 'trip' ? 'ruler' : 'trip'; select(n); document.getElementById('rdtab-' + n).focus(); } });
    tablist.appendChild(b);
  });
  function select(id) { S.tab = id; tabs.forEach(([t]) => { const b = document.getElementById('rdtab-' + t); b.setAttribute('aria-selected', String(t === id)); b.tabIndex = t === id ? 0 : -1; panels[t].hidden = t !== id; }); if (id === 'trip') startLoop(); }

  /* ================= TRIP ================= */
  const cv = (() => { const dpr = Math.min(2, window.devicePixelRatio || 1); const c = h('canvas', { role: 'img', 'aria-label': 'Side view of a road with a vehicle or person travelling toward a hazard', width: Math.round(W * dpr), height: Math.round(H * dpr) }); const ctx = c.getContext('2d'); ctx.scale(dpr, dpr); return { c, ctx }; })();
  let T = { mode: 'drive', mph: 35, phone: 'on', phase: 'idle', tr: null, x: 0, hazardOn: false, hazardAge: 0, scroll: 0, walkPhase: 0, buzz: false, phoneUp: false, braking: false, hit: false, stopped: false, showBar: false, t0: 0, px: 3.7 };
  const modeBar = h('div.mode-bar', { role: 'radiogroup', 'aria-label': 'How are you travelling?' }, Object.values(M.MODES).map((m) => h('button.mode-btn', { type: 'button', role: 'radio', id: 'rmode-' + m.id, 'aria-checked': String(m.id === 'drive'), onclick: () => setMode(m.id) }, m.label)));
  const speedSel = h('select.input.sm', { id: 'rspeed', 'aria-label': 'Driving speed', onchange: () => { T.mph = Number(speedSel.value); readyScene(); } }, M.MODES.drive.speeds.map((v) => h('option', { value: String(v), selected: v === 35 }, v + ' mph')));
  const phoneBar = h('div.mode-bar', { role: 'radiogroup', 'aria-label': 'Phone setting before you set off' },
    [['on', 'Notifications on'], ['dnd', 'Do Not Disturb']].map(([id, label]) => h('button.mode-btn', { type: 'button', role: 'radio', id: 'rphone-' + id, 'aria-checked': String(id === 'on'), onclick: () => { T.phone = id; phoneBar.querySelectorAll('.mode-btn').forEach((b) => b.setAttribute('aria-checked', String(b.id === 'rphone-' + id))); } }, label)));
  const speedCtl = h('div.ctl', h('label', { for: 'rspeed' }, 'Speed'), speedSel);
  const startBtn = h('button.btn', { type: 'button', id: 'trip-go', onclick: startTrip }, 'Start the trip');
  const phonePanel = h('div.phone-note', { hidden: true, role: 'alertdialog', 'aria-label': 'A message arrives' });
  const say = h('p.sim-note', { role: 'status', 'aria-live': 'polite', id: 'trip-say' }, 'Choose how you are travelling and your phone setting, then start the trip.');
  const lights = ['eyes', 'hands', 'mind'].map((k) => h('span.light.type', { 'data-k': k, 'data-on': 'false' }, { eyes: 'Eyes off the way ahead', hands: 'Hands off the controls', mind: 'Mind off the task' }[k]));
  const mRT = h('span.mv-num', '—'), mReact = h('span.mv-num', '—'), mBrake = h('span.mv-num', '—'), mTotal = h('span.mv-num', '—'), mRes = h('span.mv-num', '—');
  const meters = h('div.road-meters', h('div.rm-cell', h('span.mv-lab', 'Reaction time'), mRT), h('div.rm-cell', h('span.mv-lab', 'Distance before you react'), mReact), h('div.rm-cell', h('span.mv-lab', 'Braking distance'), mBrake), h('div.rm-cell', h('span.mv-lab', 'Total stopping distance'), mTotal), h('div.rm-cell', h('span.mv-lab', 'Result'), mRes));
  const logBody = h('tbody');
  const logTable = h('table.run-log', h('caption', 'Your trips (newest first)'), h('thead', h('tr', ['Trip', 'Mode', 'Phone', 'Reaction', 'Stopping', 'Result'].map((x) => h('th', { scope: 'col' }, x)))), logBody);
  const logRows = [];
  const prog = h('p.sim-note', { role: 'status', 'aria-live': 'polite', id: 'trip-prog' }, '');

  function setMode(id) {
    if (T.phase !== 'idle' && T.phase !== 'result') return;
    T.mode = id; T.mph = M.MODES[id].speed;
    modeBar.querySelectorAll('.mode-btn').forEach((b) => b.setAttribute('aria-checked', String(b.id === 'rmode-' + id)));
    speedCtl.hidden = id !== 'drive'; speedSel.value = String(T.mph);
    readyScene();
  }
  function readyScene() {
    T = Object.assign(T, { phase: 'idle', tr: null, x: 0, hazardOn: false, buzz: false, phoneUp: false, braking: false, hit: false, stopped: false, showBar: false, px: 560 / M.MODES[T.mode].hazardFt });
    phonePanel.hidden = true; lights.forEach((l) => { l.dataset.on = 'false'; }); [mRT, mReact, mBrake, mTotal, mRes].forEach((e) => { e.textContent = '—'; });
    say.textContent = M.MODES[T.mode].label + ' at ' + T.mph + ' mph. ' + (T.phone === 'dnd' ? 'Do Not Disturb is on.' : 'Your phone is on.') + ' Start the trip when you are ready.';
    startBtn.disabled = false; startLoop();
  }
  function startTrip() {
    T = Object.assign(T, { phase: 'travel', x: 0, hazardOn: false, buzz: false, phoneUp: false, braking: false, hit: false, stopped: false, showBar: false, t0: performance.now(), tr: null });
    startBtn.disabled = true; phonePanel.hidden = true; lights.forEach((l) => { l.dataset.on = 'false'; });
    say.textContent = 'You are on your way. Keep watching the road.'; startLoop();
  }
  const sp = () => speed();
  function buzz() {
    T.phase = 'buzz'; T.buzz = true;
    const keys = ['glance', 'ignore', 'read', 'stop', 'type', 'voice'].sort((a, b) => M.CHOICES[a].label.localeCompare(M.CHOICES[b].label));
    phonePanel.hidden = false;
    phonePanel.replaceChildren(h('div.notif', h('span.app', 'Messages'), h('b', ' Sam'), h('div', 'where are you?? are you coming?')), h('p.help', 'The phone buzzes. What do you do? The road will not wait.'),
      h('div.choices', keys.map((k) => h('button.choice', { type: 'button', id: 'rc-' + k, onclick: () => decide(k) }, M.CHOICES[k].label))));
    say.textContent = 'Your phone buzzes with a message from Sam.';
    document.getElementById('rc-ignore') && document.getElementById('rc-ignore').focus({ preventScroll: true });
  }
  function decide(choice) {
    T.tr = M.trip(T.mode, T.mph, choice); T.buzz = false; phonePanel.hidden = true;
    T.phoneUp = ['glance', 'read', 'type', 'voice'].includes(choice); T.phase = 'distract'; T.t0 = performance.now();
    lights.forEach((l) => { l.dataset.on = String(T.tr.types.includes(l.dataset.k)); });
    say.textContent = M.CHOICES[choice].text; T.choiceNow = choice;
  }
  function hazard() {
    T.phase = 'hazard'; T.hazardOn = true; T.hazardAge = 0; T.t0 = performance.now(); T.x = 0; T.showBar = true;
    if (!T.tr) { T.tr = M.trip(T.mode, T.mph, 'dnd'); T.choiceNow = 'dnd'; }
    mRT.textContent = f1(T.tr.reactionTime) + ' s'; mReact.textContent = f0(T.tr.reactFt) + ' ft'; mBrake.textContent = f0(T.tr.brakeFt) + ' ft'; mTotal.textContent = f0(T.tr.totalFt) + ' ft (hazard at ' + T.tr.hazardFt + ' ft)';
    say.textContent = M.MODES[T.mode].hazard + '!';
  }
  function finish() {
    const tr = T.tr; T.phase = 'result'; T.braking = true; startBtn.disabled = false; T.phoneUp = false;
    mRes.textContent = tr.hit ? 'Hit at about ' + f0(tr.impactMph) + ' mph' : 'Stopped ' + f0(tr.margin) + ' ft short';
    say.textContent = (tr.hit ? 'Collision. ' : 'Stopped in time. ') + M.describe(tr) + '.';
    const row = { n: runs.drive.length + runs.bike.length + runs.walk.length + 1, tr };
    runs[T.mode].push(tr.choice);
    logRows.unshift(row); logRows.splice(8);
    logBody.replaceChildren(...logRows.map((r) => h('tr', h('td', '#' + r.n), h('td', M.MODES[r.tr.mode].label + ' ' + r.tr.mph + ' mph'), h('td', r.tr.choice === 'dnd' ? 'Do Not Disturb' : M.CHOICES[r.tr.choice].label), h('td.num', f1(r.tr.reactionTime) + ' s'), h('td.num', f0(r.tr.totalFt) + ' ft'), h('td', r.tr.hit ? 'Hit' : 'Stopped'))));
    ['drive', 'bike', 'walk'].forEach((m) => { if (!reported[m] && runs[m].length >= 3 && new Set(runs[m]).size >= 2) { reported[m] = true; api.report(m); } });
    const left = ['drive', 'bike', 'walk'].filter((m) => !reported[m]).map((m) => M.MODES[m].label.toLowerCase());
    prog.textContent = left.length ? 'Still to do: three trips while ' + left.join(', ') + ' (try at least two different phone choices in each).' : 'All three kinds of trip done.';
    cv.c.setAttribute('aria-label', 'Side view: ' + (tr.hit ? 'the ' + M.MODES[tr.mode].label.toLowerCase().replace('ing', 'er') + ' hit the hazard' : 'stopped in time') + '.');
    startLoop();
  }
  function frame(now) {
    S.raf = 0; if (S.destroyed) return;
    const reduced = api.reduced(), k = sp();
    const el = (now - T.t0) / 1000 * k;
    if (T.phase === 'travel') { T.scroll += 5 * k * (T.mph + 20) / 6; T.walkPhase += 0.2 * k; if (el > 2) { if (T.phone === 'dnd') hazard(); else buzz(); } }
    else if (T.phase === 'buzz') { T.walkPhase += 0.03; }
    else if (T.phase === 'distract') { T.scroll += 4 * k * (T.mph + 20) / 6; if (T.choiceNow === 'stop' || T.choiceNow === 'ignore') T.phoneUp = false; if (el > 1.2) hazard(); }
    else if (T.phase === 'hazard') {
      T.hazardAge = el; const tr = T.tr, total = tr.reactionTime + tr.brakeSeconds + 0.5;
      const t = reduced ? total : el; const pos = M.positionAt(tr, t);
      T.x = pos.x; T.braking = pos.braking; T.scroll += (pos.braking && !pos.stopped ? 3 : 5) * k * (T.mph + 20) / 6 * (pos.stopped || pos.hit ? 0 : 1); T.walkPhase += pos.stopped || pos.hit ? 0 : 0.2 * k;
      T.hit = pos.hit; T.stopped = pos.stopped;
      if (t >= total || pos.hit && el > tr.reactionTime + 0.6) finish();
    }
    drawTrip(cv.ctx, { mode: T.mode, mph: T.mph, px: T.px, x: T.x, hazardOn: T.hazardOn, hazardAge: T.hazardAge, scroll: T.scroll, phase: T.walkPhase, buzz: T.buzz, phoneUp: T.phoneUp, braking: T.braking, hit: T.hit, stopped: T.stopped, showBar: T.showBar, tr: T.tr });
    if (T.phase !== 'result' && T.phase !== 'idle' && S.tab === 'trip') S.raf = requestAnimationFrame(frame);
  }
  function startLoop() { if (!S.raf) S.raf = requestAnimationFrame(frame); }

  panels.trip = h('div.sim-panel', { role: 'tabpanel', id: 'rdpanel-trip', 'aria-labelledby': 'rdtab-trip' },
    h('p.sim-intro', 'Pick how you are travelling and what your phone is set to, then start the trip. If the phone buzzes, you decide what to do. A hazard is coming either way.'),
    modeBar,
    h('div.sim-controls', h('div.ctl', h('label', 'Phone before you set off'), phoneBar), speedCtl, h('div.ctl', startBtn)),
    h('div.sim-stage', cv.c),
    say, phonePanel,
    h('div.row.lights', lights), meters, prog, h('div.run-log-wrap', logTable));

  /* ================= RULER ================= */
  const RS = 11;  // pixels per centimetre
  let R = { state: 'idle', cond: 'focus', t0: 0, drops: [], timer: 0, raf: 0, fall: 0, caught: null };
  const rulerSvg = svg('svg', { class: 'ruler-svg', viewBox: '0 0 220 ' + (M.RULER_CM * RS + 120), role: 'img', 'aria-label': 'A 30-centimeter ruler held above an open hand', focusable: 'false' });
  const rulerG = svg('g'); const thumbY = M.RULER_CM * RS + 70;
  rulerG.appendChild(svg('rect', { x: 70, y: 40, width: 60, height: M.RULER_CM * RS + 30, rx: 4, fill: '#f6d36a', stroke: '#9a7b12', 'stroke-width': 2 }));
  for (let cm = 0; cm <= M.RULER_CM; cm++) { const y = thumbY - cm * RS; rulerG.appendChild(svg('line', { x1: 70, x2: cm % 5 === 0 ? 100 : 86, y1: y, y2: y, stroke: '#5b4709', 'stroke-width': cm % 5 === 0 ? 2 : 1 })); if (cm % 5 === 0) rulerG.appendChild(svg('text', { x: 106, y: y + 4, 'font-size': 12, 'font-weight': 700, fill: '#3b2f05' }, String(cm))); }
  rulerG.appendChild(svg('text', { x: 100, y: 34, 'text-anchor': 'middle', 'font-size': 11, fill: '#33444f' }, 'cm'));
  rulerSvg.append(rulerG,
    svg('rect', { x: 50, y: thumbY - 6, width: 100, height: 14, rx: 7, fill: '#d9a47c', stroke: '#9d6e4a', 'stroke-width': 2 }), svg('rect', { x: 50, y: thumbY + 6, width: 100, height: 40, rx: 12, fill: '#d9a47c', stroke: '#9d6e4a', 'stroke-width': 2 }),
    svg('text', { x: 100, y: thumbY + 70, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#33444f' }, 'Your fingers'));
  const rState = h('p.sim-note', { role: 'status', 'aria-live': 'polite', id: 'ruler-state', 'data-state': 'idle' }, 'Choose a condition, press Get ready, and catch the ruler when it drops.');
  const condBar = h('div.mode-bar', { role: 'radiogroup', 'aria-label': 'Condition' }, [['focus', 'Focused'], ['dist', 'Distracted']].map(([id, label]) => h('button.mode-btn', { type: 'button', role: 'radio', id: 'cond-' + id, 'aria-checked': String(id === 'focus'), onclick: () => { if (R.state === 'waiting' || R.state === 'falling') return; R.cond = id; condBar.querySelectorAll('.mode-btn').forEach((b) => b.setAttribute('aria-checked', String(b.id === 'cond-' + id))); distBox.hidden = id !== 'dist'; } }, label)));
  const distBox = h('div.dist-task', { hidden: true }, h('b', 'While you wait: '), 'in your head, count backward from 100 by 7s (100, 93, 86, …) and keep going until the ruler drops. Do not say it out loud.');
  const readyBtn = h('button.btn', { type: 'button', id: 'ruler-ready', onclick: getReady }, 'Get ready');
  const catchBtn = h('button.btn.secondary', { type: 'button', id: 'ruler-catch', disabled: true, onclick: doCatch }, 'Catch!');
  const rBody = h('tbody'), rAvg = h('p.sim-fine', { id: 'ruler-avg' }, '');
  const rTable = h('table.run-log', h('caption', 'Your drops'), h('thead', h('tr', ['Drop', 'Condition', 'Caught at', 'Reaction time'].map((x) => h('th', { scope: 'col' }, x)))), rBody);
  function getReady() {
    if (R.state === 'waiting' || R.state === 'falling') return;
    R.state = 'waiting'; rState.dataset.state = 'waiting'; readyBtn.disabled = true; catchBtn.disabled = false; R.fall = 0;
    rulerG.setAttribute('transform', 'translate(0,0)');
    rState.textContent = 'Wait for the drop. Keep your eyes on the ruler' + (R.cond === 'dist' ? ' and keep counting.' : '.') + ' Press Catch! (or Space) the instant it moves.';
    const delay = (1500 + Math.random() * 2500) / speed();
    R.timer = setTimeout(() => { if (R.state !== 'waiting') return; R.state = 'falling'; rState.dataset.state = 'falling'; R.t0 = performance.now(); rulerLoop(); }, delay);
    catchBtn.focus({ preventScroll: true });
  }
  function rulerLoop() {
    R.raf = 0; if (R.state !== 'falling' || S.destroyed) return;
    const t = (performance.now() - R.t0) / 1000;
    R.fall = M.fallCm(t); rulerG.setAttribute('transform', 'translate(0,' + (R.fall * RS).toFixed(1) + ')');
    if (R.fall >= M.RULER_CM) { missed(); return; }
    R.raf = requestAnimationFrame(rulerLoop);
  }
  function missed() {
    R.state = 'idle'; rState.dataset.state = 'idle'; readyBtn.disabled = false; catchBtn.disabled = true; rulerG.setAttribute('transform', 'translate(0,0)');
    rState.textContent = 'The ruler fell all the way. That counts as a miss, so try again.';
  }
  function doCatch() {
    if (R.state === 'waiting') { clearTimeout(R.timer); R.state = 'idle'; rState.dataset.state = 'idle'; readyBtn.disabled = false; catchBtn.disabled = true; rState.textContent = 'False start: you pressed before the ruler dropped. Press Get ready to try again.'; return; }
    if (R.state !== 'falling') return;
    const t = (performance.now() - R.t0) / 1000; const cm = M.fallCm(t);
    cancelAnimationFrame(R.raf); R.state = 'idle'; rState.dataset.state = 'done'; readyBtn.disabled = false; catchBtn.disabled = true;
    rulerG.setAttribute('transform', 'translate(0,' + (Math.min(cm, M.RULER_CM) * RS).toFixed(1) + ')');
    const rt = M.reactionFromCm(cm);
    R.drops.unshift({ n: R.drops.length + 1, cond: R.cond, cm, rt });
    rState.textContent = 'Caught at ' + f1(cm) + ' cm. The ruler fell for about ' + Math.round(rt * 1000) + ' milliseconds (' + f1(rt * 1000 / 1000) + ' s) before your fingers closed.';
    rBody.replaceChildren(...R.drops.slice(0, 10).map((d) => h('tr', h('td', '#' + d.n), h('td', d.cond === 'focus' ? 'Focused' : 'Distracted'), h('td.num', f1(d.cm) + ' cm'), h('td.num', Math.round(d.rt * 1000) + ' ms'))));
    const avg = (c) => { const a = R.drops.filter((d) => d.cond === c); return a.length ? Math.round(a.reduce((s, d) => s + d.rt, 0) / a.length * 1000) : null; };
    const af = avg('focus'), ad = avg('dist');
    rAvg.textContent = 'Average reaction time: focused ' + (af == null ? 'no drops yet' : af + ' ms') + ', distracted ' + (ad == null ? 'no drops yet' : ad + ' ms') + '.';
    rProg();
  }
  function rProg() {
    const n = R.drops.length, has = (c) => R.drops.some((d) => d.cond === c);
    rProgEl.textContent = n + ' of 3 drops done' + (n >= 3 && !(has('focus') && has('dist')) ? '. Include at least one focused and one distracted drop.' : n >= 3 ? '. That is enough.' : '.');
    if (!reported.ruler && n >= 3 && has('focus') && has('dist')) { reported.ruler = true; api.report('ruler'); }
  }
  const rProgEl = h('p.sim-note', { role: 'status', 'aria-live': 'polite' }, '0 of 3 drops done. Do at least one focused and one distracted drop.');
  const ruler = h('div.ruler-wrap', h('div.ruler-fig', rulerSvg), h('div.ruler-ctl', h('p', 'A partner holds a ruler above your open fingers and lets go without warning. You catch it as fast as you can. The number at the top of your fingers is how far it fell, and the farther it fell, the slower you were.'), condBar, distBox, h('div.row', readyBtn, catchBtn), rState, rProgEl));
  panels.ruler = h('div.sim-panel', { role: 'tabpanel', id: 'rdpanel-ruler', 'aria-labelledby': 'rdtab-ruler', hidden: true }, ruler, h('div.run-log-wrap', rTable), rAvg);
  document.addEventListener('keydown', onKey); function onKey(e) { if (S.destroyed) return; if (S.tab === 'ruler' && e.code === 'Space' && !/BUTTON|INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); doCatch(); } }

  host.replaceChildren(h('div.road-lab', tablist, panels.trip, panels.ruler));
  setMode('drive'); readyScene();
  return { destroy() { S.destroyed = true; clearTimeout(R.timer); cancelAnimationFrame(S.raf); cancelAnimationFrame(R.raf); document.removeEventListener('keydown', onKey); } };
}
