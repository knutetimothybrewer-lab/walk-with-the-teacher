// Mission 2 drawing code: the rescue scenes (adult collapse in a gym, drowning at a pool, infant at home).
// Pure canvas drawing, no DOM and no scoring. rescue.js passes in the live state (chest depth, breath rise, which actions were taken).
const W = 960, H = 420, FLOOR = 340;
const gauss = (x) => Math.exp(-x * x);
const smooth = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return '#' + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
function rng(seed) { let x = seed * 9301 + 49297; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }

/** A shaded capsule: lighter on top, darker underneath, with a soft outline. */
function limb(ctx, a, b, wd, base, opt) {
  const o = opt || {}, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-6, r = wd / 2;
  ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(dy, dx));
  const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, shade(base, o.hi == null ? 30 : o.hi)); g.addColorStop(0.5, base); g.addColorStop(1, shade(base, o.lo == null ? -38 : o.lo));
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(L, -r); ctx.arc(L, 0, r * (o.tipScale || 1), -Math.PI / 2, Math.PI / 2); ctx.lineTo(0, r); ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = o.line || 'rgba(0,0,0,0.28)'; ctx.stroke();
  ctx.restore();
}
function blob(ctx, x, y, rx, ry, a) { // soft contact shadow
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function curve(ctx, pts, close) { // smooth path through points
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
  const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]); if (close) ctx.closePath();
}

/* ====================================================================================== backgrounds */
function wall(ctx, y0, y1, top, bot) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0); }

function bgGym(ctx) {
  wall(ctx, 0, 262, '#dfe7ee', '#f3f6f9');
  // high windows with daylight
  for (let i = 0; i < 4; i++) { const x = 250 + i * 150; const g = ctx.createLinearGradient(0, 18, 0, 70); g.addColorStop(0, '#bfe0f5'); g.addColorStop(1, '#e8f5fc'); ctx.fillStyle = g; ctx.fillRect(x, 18, 110, 52); ctx.strokeStyle = '#aab6c0'; ctx.lineWidth = 3; ctx.strokeRect(x, 18, 110, 52); ctx.beginPath(); ctx.moveTo(x + 55, 18); ctx.lineTo(x + 55, 70); ctx.moveTo(x, 44); ctx.lineTo(x + 110, 44); ctx.stroke(); }
  // padded lower wall
  const pg = ctx.createLinearGradient(0, 196, 0, 266); pg.addColorStop(0, '#1f4e8c'); pg.addColorStop(1, '#173a68'); ctx.fillStyle = pg; ctx.fillRect(0, 196, W, 70);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; for (let x = 0; x < W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 196); ctx.lineTo(x, 266); ctx.stroke(); }
  ctx.fillStyle = '#f0b429'; ctx.fillRect(0, 196, W, 5);
  // bleachers (folded)
  for (let i = 0; i < 5; i++) { const y = 96 + i * 24; ctx.fillStyle = i % 2 ? '#9aa8b5' : '#8896a4'; ctx.fillRect(610, y, 350, 22); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(610, y + 20, 350, 3); }
  ctx.fillStyle = '#6b7885'; for (let x = 640; x < 960; x += 80) ctx.fillRect(x, 96, 5, 120);
  // backboard and hoop
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillRect(86, 52, 116, 76); ctx.strokeStyle = '#c93a2f'; ctx.lineWidth = 4; ctx.strokeRect(86, 52, 116, 76); ctx.strokeRect(120, 88, 48, 36);
  ctx.strokeStyle = '#e8801f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(144, 134, 24, 6, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; for (let k = -18; k <= 18; k += 9) { ctx.beginPath(); ctx.moveTo(144 + k, 136); ctx.lineTo(144 + k * 0.5, 168); ctx.stroke(); }
  // wall-mounted AED cabinet
  ctx.fillStyle = '#f4f4f4'; ctx.strokeStyle = '#8a949c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(520, 118, 46, 56, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d2332b'; ctx.beginPath(); ctx.moveTo(543, 160); ctx.bezierCurveTo(525, 146, 526, 132, 536, 132); ctx.bezierCurveTo(540, 132, 543, 136, 543, 137); ctx.bezierCurveTo(543, 136, 546, 132, 550, 132); ctx.bezierCurveTo(560, 132, 561, 146, 543, 160); ctx.fill();
  ctx.fillStyle = '#2f7f4f'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('AED', 543, 126); ctx.textAlign = 'left';
  // floor
  const f = ctx.createLinearGradient(0, 266, 0, H); f.addColorStop(0, '#dcae6d'); f.addColorStop(1, '#b58443'); ctx.fillStyle = f; ctx.fillRect(0, 266, W, H - 266);
  ctx.strokeStyle = 'rgba(110,70,25,0.22)'; ctx.lineWidth = 1; for (let y = 276; y < H; y += 14 + (y - 266) * 0.08) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(110,70,25,0.12)'; for (let x = 0; x < W; x += 118) for (let y = 266; y < H; y += 56) { ctx.beginPath(); ctx.moveTo(x + (y % 112 ? 59 : 0), y); ctx.lineTo(x + (y % 112 ? 59 : 0), y + 14); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 292); ctx.lineTo(W, 292); ctx.stroke();
  ctx.strokeStyle = 'rgba(200,60,50,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(130, 300, 150, 28, 0, Math.PI, Math.PI * 2); ctx.stroke();
  // a basketball and a backpack left in the commotion
  const bg = ctx.createRadialGradient(868, 378, 3, 872, 382, 26); bg.addColorStop(0, '#f09a45'); bg.addColorStop(1, '#b4561a'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(872, 382, 24, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6d2f0b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(848, 382); ctx.lineTo(896, 382); ctx.moveTo(872, 358); ctx.lineTo(872, 406); ctx.stroke();
  ctx.fillStyle = '#3d6fb5'; ctx.beginPath(); ctx.roundRect(40, 368, 58, 44, 12); ctx.fill(); ctx.fillStyle = '#2b5088'; ctx.fillRect(48, 384, 42, 6);
}

function bgPool(ctx, now) {
  wall(ctx, 0, 150, '#cfe7f3', '#eaf6fb');
  // building wall with windows
  ctx.fillStyle = '#e9eef1'; ctx.fillRect(0, 70, W, 90); ctx.fillStyle = 'rgba(160,205,230,0.7)'; for (let i = 0; i < 6; i++) ctx.fillRect(30 + i * 160, 86, 110, 50);
  ctx.strokeStyle = '#a7b6c0'; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) ctx.strokeRect(30 + i * 160, 86, 110, 50);
  // pool water with moving light bands
  const w = ctx.createLinearGradient(0, 160, 0, 262); w.addColorStop(0, '#6fd0ec'); w.addColorStop(0.55, '#3aa7d3'); w.addColorStop(1, '#2a86b8'); ctx.fillStyle = w; ctx.fillRect(0, 160, W, 102);
  const t = (now || 0) / 1400;
  for (let y = 170, k = 0; y < 256; y += 14, k++) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.18 + 0.12 * (k % 3)) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x / 41 + t + k) * 2.5); ctx.stroke(); }
  // lane rope floats
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 214); ctx.lineTo(W, 214); ctx.stroke();
  for (let x = 6; x < W; x += 22) { ctx.fillStyle = (x / 22) % 2 < 1 ? '#e2453a' : '#fff'; ctx.beginPath(); ctx.ellipse(x, 214 + Math.sin(x / 41 + t) * 1.5, 8, 4.5, 0, 0, Math.PI * 2); ctx.fill(); }
  // pool edge and tile band
  ctx.fillStyle = '#dfe6ea'; ctx.fillRect(0, 258, W, 10); ctx.fillStyle = '#bcc8cf'; ctx.fillRect(0, 266, W, 3);
  // lifeguard chair
  ctx.fillStyle = '#f2f4f5'; ctx.strokeStyle = '#a9b4bb'; ctx.lineWidth = 2; ctx.fillRect(780, 118, 8, 140); ctx.strokeRect(780, 118, 8, 140); ctx.fillRect(852, 118, 8, 140); ctx.strokeRect(852, 118, 8, 140);
  ctx.fillStyle = '#e2453a'; ctx.fillRect(772, 112, 96, 10); ctx.fillStyle = '#f2f4f5'; ctx.fillRect(776, 154, 88, 6); ctx.fillRect(776, 196, 88, 6);
  // ring buoy on a post
  ctx.fillStyle = '#8a9299'; ctx.fillRect(112, 190, 6, 76);
  ctx.strokeStyle = '#d6352c'; ctx.lineWidth = 11; ctx.beginPath(); ctx.arc(115, 202, 24, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; for (let a = 0; a < 4; a++) { ctx.beginPath(); ctx.arc(115, 202, 24, a * Math.PI / 2 + 0.3, a * Math.PI / 2 + 0.9); ctx.stroke(); }
  // deck
  const d = ctx.createLinearGradient(0, 269, 0, H); d.addColorStop(0, '#e7dfcf'); d.addColorStop(1, '#cbc0a8'); ctx.fillStyle = d; ctx.fillRect(0, 269, W, H - 269);
  ctx.strokeStyle = 'rgba(120,108,86,0.32)'; ctx.lineWidth = 1; for (let x = -40; x < W + 40; x += 62) { ctx.beginPath(); ctx.moveTo(x, 269); ctx.lineTo(x - 36, H); ctx.stroke(); }
  for (let y = 292; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // rescue tube and a towel on the deck
  ctx.fillStyle = '#d6352c'; ctx.beginPath(); ctx.roundRect(640, 384, 190, 22, 11); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(700, 384, 14, 22); ctx.fillRect(760, 384, 14, 22);
  ctx.strokeStyle = '#2a2d30'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(640, 395); ctx.quadraticCurveTo(580, 410, 560, 380); ctx.stroke();
  ctx.fillStyle = '#58b0c8'; ctx.beginPath(); ctx.roundRect(60, 372, 120, 34, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(60, 380, 120, 4); ctx.fillRect(60, 394, 120, 4);
}

function bgHome(ctx) {
  wall(ctx, 0, 246, '#f6ecdc', '#f9f2e6');
  // wainscot and baseboard
  ctx.fillStyle = '#efe3cf'; ctx.fillRect(0, 168, W, 78); ctx.strokeStyle = 'rgba(160,130,90,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(-2, 168, W + 4, 78); for (let x = 30; x < W; x += 110) ctx.strokeRect(x, 180, 80, 56);
  ctx.fillStyle = '#e3d2b6'; ctx.fillRect(0, 238, W, 10);
  // window with soft light and curtains
  const g = ctx.createLinearGradient(0, 40, 0, 160); g.addColorStop(0, '#d3ecfa'); g.addColorStop(1, '#f0f9fe'); ctx.fillStyle = g; ctx.fillRect(660, 40, 150, 120); ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.strokeRect(660, 40, 150, 120); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(735, 40); ctx.lineTo(735, 160); ctx.moveTo(660, 100); ctx.lineTo(810, 100); ctx.stroke();
  ctx.fillStyle = '#d8a79a'; ctx.beginPath(); ctx.moveTo(646, 32); ctx.lineTo(690, 32); ctx.quadraticCurveTo(676, 100, 692, 172); ctx.lineTo(646, 172); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(824, 32); ctx.lineTo(782, 32); ctx.quadraticCurveTo(796, 100, 780, 172); ctx.lineTo(824, 172); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,248,220,0.35)'; ctx.beginPath(); ctx.moveTo(660, 160); ctx.lineTo(810, 160); ctx.lineTo(900, 250); ctx.lineTo(590, 250); ctx.closePath(); ctx.fill();
  // framed picture and a lamp
  ctx.fillStyle = '#cfe0d4'; ctx.beginPath(); ctx.roundRect(70, 58, 132, 96, 6); ctx.fill(); ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = '#9ccbb0'; ctx.beginPath(); ctx.moveTo(78, 148); ctx.lineTo(120, 104); ctx.lineTo(150, 130); ctx.lineTo(176, 96); ctx.lineTo(196, 148); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f4d77b'; ctx.beginPath(); ctx.arc(170, 82, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a5a3a'; ctx.fillRect(884, 110, 6, 128); ctx.fillStyle = '#f2dcae'; ctx.beginPath(); ctx.moveTo(862, 112); ctx.lineTo(912, 112); ctx.lineTo(900, 76); ctx.lineTo(874, 76); ctx.closePath(); ctx.fill();
  // floor: warm wood, with a firm play mat under the baby
  const f = ctx.createLinearGradient(0, 248, 0, H); f.addColorStop(0, '#c9a06b'); f.addColorStop(1, '#a87f4b'); ctx.fillStyle = f; ctx.fillRect(0, 248, W, H - 248);
  ctx.strokeStyle = 'rgba(90,60,25,0.25)'; ctx.lineWidth = 1; for (let y = 262; y < H; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#9fc2d8'; ctx.beginPath(); ctx.roundRect(40, 302, 800, 96, 14); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.stroke();
  const mats = ['#f2b84b', '#e87d6a', '#7fc29b', '#fff']; for (let i = 0; i < 12; i++) { ctx.fillStyle = mats[i % 4]; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(70 + i * 68, 392, 9, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
  // toy blocks
  [[700, 366, '#e8574a'], [734, 372, '#f2c14e'], [716, 346, '#4aa3df']].forEach(([x, y, c]) => { ctx.fillStyle = c; ctx.fillRect(x, y, 30, 30); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, 30, 6); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, 30, 30); });
}

/* ====================================================================================== faces and hands */
/** A face in profile looking up (head to the left). `hr` is the head radius; call inside a translate to the head centre. */
function faceUp(ctx, hr, skin, o) {
  const dark = shade(skin, -70), lip = o.lip || shade(skin, -34);
  // ear
  ctx.fillStyle = shade(skin, -10); ctx.beginPath(); ctx.ellipse(-hr * 0.08, hr * 0.28, hr * 0.14, hr * 0.2, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = shade(skin, -48); ctx.lineWidth = 1.2; ctx.stroke();
  // nose (points up)
  ctx.fillStyle = shade(skin, 6); ctx.strokeStyle = shade(skin, -46); ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(hr * 0.18, -hr * 0.88); ctx.quadraticCurveTo(hr * 0.34, -hr * 1.18, hr * 0.52, -hr * 0.9); ctx.quadraticCurveTo(hr * 0.42, -hr * 0.8, hr * 0.18, -hr * 0.88); ctx.fill(); ctx.stroke();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(hr * 0.44, -hr * 0.9, 1.8, 1.2, 0.3, 0, Math.PI * 2); ctx.fill();
  // closed eye and brow
  ctx.strokeStyle = dark; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(-hr * 0.30, -hr * 0.62, hr * 0.16, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-hr * 0.30 + (i - 1) * 4, -hr * 0.52); ctx.lineTo(-hr * 0.30 + (i - 1) * 5, -hr * 0.44); ctx.stroke(); }
  ctx.lineWidth = 2.6; ctx.strokeStyle = o.brow || '#2a1d16'; ctx.beginPath(); ctx.moveTo(-hr * 0.52, -hr * 0.84); ctx.quadraticCurveTo(-hr * 0.28, -hr * 0.96, -hr * 0.06, -hr * 0.84); ctx.stroke();
  // mouth (slightly open) and chin
  ctx.fillStyle = lip; ctx.beginPath(); ctx.ellipse(hr * 0.62, -hr * 0.42, hr * 0.17, hr * 0.07, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = shade(skin, -70); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hr * 0.47, -hr * 0.46); ctx.lineTo(hr * 0.76, -hr * 0.38); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-hr * 0.1, -hr * 0.4, hr * 0.28, hr * 0.12, -0.5, 0, Math.PI * 2); ctx.fill();
  if (o.wet) { ctx.fillStyle = 'rgba(190,230,250,0.8)'; ctx.strokeStyle = 'rgba(60,150,200,0.7)'; ctx.lineWidth = 1; [[hr * 0.7, -hr * 0.2, 3.4], [hr * 0.82, -hr * 0.05, 2.6], [hr * 0.5, hr * 0.0, 2.2]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }); }
}
function hairCap(ctx, hr, color, wet, seed) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, hr + 1.5, Math.PI * 0.62, Math.PI * 1.55); ctx.lineTo(-hr * 0.18, -hr * 0.62); ctx.quadraticCurveTo(-hr * 0.5, -hr * 0.25, -hr * 0.18, hr * 0.5); ctx.closePath(); ctx.fill();
  const r = rng(seed); ctx.strokeStyle = shade(color, wet ? 30 : 22); ctx.lineWidth = 1.2; for (let i = 0; i < 9; i++) { const a = Math.PI * (0.7 + r() * 0.8); ctx.beginPath(); ctx.moveTo(Math.cos(a) * hr * 0.5, Math.sin(a) * hr * 0.5); ctx.lineTo(Math.cos(a) * (hr + 1), Math.sin(a) * (hr + 1)); ctx.stroke(); }
}
/** Clasped hands seen from above: back of the top hand with interlaced fingers. */
function clasped(ctx, x, y, skin, push) {
  ctx.save(); ctx.translate(x, y + push);
  const g = ctx.createLinearGradient(0, -9, 0, 12); g.addColorStop(0, shade(skin, 28)); g.addColorStop(1, shade(skin, -32));
  ctx.fillStyle = g; ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.roundRect(-21, -9, 42, 19, 8); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = shade(skin, -58); ctx.lineWidth = 1.1; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 5.2, -7); ctx.lineTo(i * 5.2 + 1, 8); ctx.stroke(); }
  ctx.fillStyle = shade(skin, 10); ctx.beginPath(); ctx.ellipse(-17, -2, 5, 7, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke(); // thumb
  ctx.restore();
}

/* ====================================================================================== victims (side view, lying on the back, head to the left) */
function victimAdult(ctx, st, cx, dep, rise) {
  const mode = st.mode, drowning = mode === 'drowning';
  const x0 = cx - 120, x1 = cx + 130;
  const skin = drowning ? '#d6a07a' : '#b47a54';
  const shirt = drowning ? '#2f78b8' : '#2f8f83', pants = drowning ? '#d94b43' : '#3a4452';
  blob(ctx, cx + 120, FLOOR + 4, 400, 16, 0.28);
  if (drowning) { // water pooled on the deck, with a shine
    ctx.save(); ctx.fillStyle = 'rgba(120,190,225,0.42)'; ctx.beginPath(); ctx.ellipse(cx + 40, FLOOR + 6, 330, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(cx - 60, FLOOR + 3, 120, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  // legs: thigh, calf and shoe, toes up
  const hip = [x1 - 20, FLOOR - 24], knee = [x1 + 190, FLOOR - 21], ank = [x1 + 335, FLOOR - 17];
  limb(ctx, hip, knee, 48, pants); limb(ctx, knee, ank, 36, pants, { tipScale: 0.9 });
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const x = hip[0] + 40 + i * 38; ctx.beginPath(); ctx.moveTo(x, FLOOR - 42); ctx.quadraticCurveTo(x + 8, FLOOR - 30, x + 2, FLOOR - 12); ctx.stroke(); }
  const shoe = ctx.createLinearGradient(0, FLOOR - 52, 0, FLOOR); shoe.addColorStop(0, '#fbfbfb'); shoe.addColorStop(1, '#c9ced2');
  ctx.fillStyle = shoe; ctx.strokeStyle = '#8c949a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ank[0] - 4, FLOOR - 36); ctx.quadraticCurveTo(ank[0] + 34, FLOOR - 62, ank[0] + 50, FLOOR - 28); ctx.lineTo(ank[0] + 50, FLOOR - 2); ctx.lineTo(ank[0] - 4, FLOOR - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = drowning ? '#e0524a' : '#2f6fb0'; ctx.fillRect(ank[0] + 8, FLOOR - 40, 22, 4); ctx.fillStyle = '#e2e6e9'; ctx.fillRect(ank[0] - 4, FLOOR - 7, 54, 5);
  // torso silhouette: shoulders, chest dipping under the hands and lifting with each breath, waist
  const top = (x) => FLOOR - 56 - 11 * gauss((x - cx + 40) / 85) + 8 * gauss((x - cx - 95) / 55) - rise * gauss((x - cx + 15) / 80) + dep * gauss((x - cx) / 44) + 5 * smooth((x - x0) / -40 + 1) * 0;
  const pts = []; for (let x = x0; x <= x1; x += 6) pts.push([x, top(x)]);
  ctx.beginPath(); ctx.moveTo(x0, FLOOR - 2); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(x1, FLOOR - 2); ctx.closePath();
  const sg = ctx.createLinearGradient(0, FLOOR - 74, 0, FLOOR); sg.addColorStop(0, shade(shirt, 30)); sg.addColorStop(0.55, shirt); sg.addColorStop(1, shade(shirt, -36));
  ctx.fillStyle = sg; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.stroke();
  // shirt folds pull toward the hands as the chest goes down
  ctx.strokeStyle = 'rgba(0,0,0,' + (0.14 + 0.1 * Math.min(1, dep / 20)) + ')'; ctx.lineWidth = 1.4;
  for (let i = -3; i <= 3; i++) { const x = cx + i * 20; ctx.beginPath(); ctx.moveTo(x, top(x) + 2); ctx.quadraticCurveTo(x + i * -3, top(x) + 18, x + i * -6, FLOOR - 10); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.beginPath(); pts.filter((_, i) => i % 1 === 0).forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 3) : ctx.moveTo(x, y + 3))); ctx.stroke();
  if (st.bare) { // clothing opened: bare chest with the breastbone showing
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx - 62, FLOOR - 2); pts.filter(([x]) => x >= cx - 62 && x <= cx + 62).forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(cx + 62, FLOOR - 2); ctx.closePath();
    const bg = ctx.createLinearGradient(0, FLOOR - 70, 0, FLOOR); bg.addColorStop(0, shade(skin, 28)); bg.addColorStop(1, shade(skin, -28)); ctx.fillStyle = bg; ctx.fill(); ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1.4; for (let i = 0; i < 4; i++) { const x = cx - 40 + i * 22; ctx.beginPath(); ctx.moveTo(x, top(x) + 2); ctx.lineTo(x + 6, top(x) + 22); ctx.stroke(); }
    ctx.restore(); ctx.fillStyle = shade(shirt, -10); [[cx - 74, -1], [cx + 74, 1]].forEach(([x, s]) => { ctx.beginPath(); ctx.moveTo(x, FLOOR - 2); ctx.lineTo(x - s * 6, top(x - s * 6) - 1); ctx.lineTo(x + s * 22, top(x + s * 22) + 6); ctx.lineTo(x + s * 22, FLOOR - 2); ctx.closePath(); ctx.fill(); });
  }
  // arm resting along the side: sleeve then forearm and hand
  limb(ctx, [x0 + 52, FLOOR - 30], [cx + 10, FLOOR - 22], 30, shirt);
  limb(ctx, [cx + 10, FLOOR - 22], [cx + 132, FLOOR - 17], 24, skin);
  ctx.fillStyle = shade(skin, -6); ctx.beginPath(); ctx.roundRect(cx + 126, FLOOR - 30, 36, 22, 9); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
  // neck, then head (tilted back when the airway is opened)
  const hr = 31, pivot = [x0 - 2, FLOOR - 22], tilt = st.airway ? -0.34 : 0.04;
  ctx.save(); ctx.translate(pivot[0], pivot[1]); ctx.rotate(tilt); ctx.translate(-pivot[0], -pivot[1]);
  limb(ctx, [x0 + 12, FLOOR - 24], [x0 - 22, FLOOR - 25], 28, skin);
  const hx = x0 - 30, hy = FLOOR - hr - 1;
  const hg = ctx.createRadialGradient(hx - 8, hy - 10, 4, hx, hy, hr + 4); hg.addColorStop(0, shade(skin, 24)); hg.addColorStop(1, shade(skin, -26));
  ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
  ctx.save(); ctx.translate(hx, hy); hairCap(ctx, hr, drowning ? '#2c2018' : '#1c1511', drowning, drowning ? 4 : 9); faceUp(ctx, hr, skin, { wet: drowning, lip: drowning ? '#7d86a8' : undefined, brow: '#241913' });
  if (st.mask) { // the rescuer's mouth is over the victim's, so show the breath path instead of a device
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.strokeStyle = 'rgba(80,150,190,0.7)'; ctx.lineWidth = 1.4; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(hr * 0.7 + i * 7, -hr * 0.7 - i * 9, 4 + i * 1.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
  ctx.restore(); ctx.restore();
  return { chestTop: top(cx), hx: x0 - 30, hy: FLOOR - hr - 1, headTop: FLOOR - 2 * hr };
}

function victimInfant(ctx, st, cx, dep, rise) {
  const skin = '#f2c9a8', suit = '#ffe08a', accent = '#f09a3e';
  blob(ctx, cx + 20, FLOOR + 3, 230, 10, 0.25);
  // folded blanket under the baby
  ctx.fillStyle = '#e7eef6'; ctx.strokeStyle = '#b4c4d4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(cx - 250, FLOOR - 14, 520, 20, 9); ctx.fill(); ctx.stroke();
  // legs with little feet (bent up slightly)
  limb(ctx, [cx + 70, FLOOR - 22], [cx + 138, FLOOR - 32], 26, suit);
  limb(ctx, [cx + 138, FLOOR - 32], [cx + 178, FLOOR - 22], 22, skin);
  ctx.fillStyle = shade(skin, -4); ctx.beginPath(); ctx.ellipse(cx + 186, FLOOR - 20, 12, 8, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const x0 = cx - 92, x1 = cx + 80;
  const top = (x) => FLOOR - 46 - 7 * gauss((x - cx + 20) / 60) - rise * gauss((x - cx + 10) / 50) + dep * gauss((x - cx) / 28);
  const pts = []; for (let x = x0; x <= x1; x += 4) pts.push([x, top(x)]);
  ctx.beginPath(); ctx.moveTo(x0, FLOOR - 14); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(x1, FLOOR - 14); ctx.closePath();
  const sg = ctx.createLinearGradient(0, FLOOR - 56, 0, FLOOR - 14); sg.addColorStop(0, shade(suit, 24)); sg.addColorStop(1, shade(suit, -26)); ctx.fillStyle = sg; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
  // star pattern on the onesie, snaps at the bottom
  ctx.fillStyle = accent; [[-40, 12], [-6, 6], [34, 12], [58, 18]].forEach(([dx, dy]) => { const x = cx + dx, y = top(x) + dy; ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.2 : 5.2, a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); });
  if (st.bare) { ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(cx - 34, FLOOR - 14); pts.filter(([x]) => x >= cx - 34 && x <= cx + 34).forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(cx + 34, FLOOR - 14); ctx.closePath(); ctx.fill(); }
  // curled hand by the side
  limb(ctx, [cx + 22, FLOOR - 24], [cx + 58, FLOOR - 24], 14, suit); ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(cx + 64, FLOOR - 24, 8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
  // big round head (tilted slightly when the airway is set to a neutral sniffing position)
  const hr = 42, hx = x0 - 34, hy = FLOOR - hr - 6, tilt = st.airway ? -0.18 : 0.02, pivot = [x0, FLOOR - 24];
  ctx.save(); ctx.translate(pivot[0], pivot[1]); ctx.rotate(tilt); ctx.translate(-pivot[0], -pivot[1]);
  limb(ctx, [x0 + 8, FLOOR - 26], [x0 - 18, FLOOR - 26], 22, skin);
  const hg = ctx.createRadialGradient(hx - 10, hy - 12, 4, hx, hy, hr + 4); hg.addColorStop(0, shade(skin, 18)); hg.addColorStop(1, shade(skin, -22)); ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.stroke();
  ctx.save(); ctx.translate(hx, hy);
  ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let i = 0; i < 6; i++) { const a = Math.PI * (0.9 + i * 0.12); ctx.beginPath(); ctx.moveTo(Math.cos(a) * hr * 0.55, Math.sin(a) * hr * 0.55); ctx.quadraticCurveTo(Math.cos(a) * hr * 0.9, Math.sin(a) * hr * 0.9 - 4, Math.cos(a + 0.2) * hr, Math.sin(a + 0.2) * hr); ctx.stroke(); }
  faceUp(ctx, hr * 0.92, skin, { lip: '#d9857a', brow: '#b99b78' });
  ctx.fillStyle = 'rgba(240,130,120,0.35)'; ctx.beginPath(); ctx.ellipse(hr * 0.28, -hr * 0.12, hr * 0.2, hr * 0.12, 0, 0, Math.PI * 2); ctx.fill(); // cheek
  if (st.mask) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.strokeStyle = 'rgba(80,150,190,0.7)'; ctx.lineWidth = 1.2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(hr * 0.7 + i * 6, -hr * 0.75 - i * 8, 3 + i, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } }
  ctx.restore(); ctx.restore();
  return { chestTop: top(cx), hx, hy, headTop: FLOOR - 2 * hr };
}

/* ====================================================================================== rescuers (far side, facing the viewer) */
function rescuerX(cx, info, lean) { return cx + (info.hx + 18 - cx) * lean; }
/** The kneeling legs go behind the victim, so they are drawn first. */
function rescuerLegs(ctx, st, rcx) {
  const drowning = st.mode === 'drowning';
  const skin = '#8f5b3c', shorts = drowning ? '#1f2a3a' : '#2c3340';
  blob(ctx, rcx, FLOOR + 6, 130, 12, 0.22);
  // legs (kneeling): thighs go back, shins fold along the floor
  [[-1, 1], [1, 1]].forEach(([s]) => { limb(ctx, [rcx + s * 36, 250], [rcx + s * 70, FLOOR - 38], 54, shorts); limb(ctx, [rcx + s * 70, FLOOR - 38], [rcx + s * 96, FLOOR - 30], 30, drowning ? skin : shorts); });
  [[-1], [1]].forEach(([s]) => { ctx.fillStyle = '#f4f4f4'; ctx.strokeStyle = '#8c949a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(rcx + s * 96 - 8 + (s > 0 ? 0 : -22), FLOOR - 40, 34, 20, 8); ctx.fill(); ctx.stroke(); });
}
function rescuerAdult(ctx, st, cx, dep, info, lean) {
  const drowning = st.mode === 'drowning';
  const skin = '#8f5b3c', top = drowning ? '#d6352c' : '#2e3f72';
  // breath pose: slide over to the head and bow down; compression pose: shoulders directly over the hands
  const rcx = rescuerX(cx, info, lean);
  const sy = 126 + dep + lean * 54, hy = info.chestTop - 6 + dep;
  const headY = sy - 54 + lean * 20, headDX = lean * -8;
  // torso
  const tg = ctx.createLinearGradient(rcx - 74, 0, rcx + 74, 0); tg.addColorStop(0, shade(top, 26)); tg.addColorStop(0.5, top); tg.addColorStop(1, shade(top, -26));
  ctx.beginPath(); ctx.moveTo(rcx - 66, sy + 8); ctx.quadraticCurveTo(rcx, sy - 18, rcx + 66, sy + 8); ctx.lineTo(rcx + 50, 282); ctx.quadraticCurveTo(rcx, 292, rcx - 50, 282); ctx.closePath(); ctx.fillStyle = tg; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1.3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(rcx + i * 18, sy + 22); ctx.quadraticCurveTo(rcx + i * 22, 230, rcx + i * 16, 276); ctx.stroke(); }
  if (drowning) { ctx.fillStyle = '#fff'; ctx.font = '800 17px system-ui'; ctx.textAlign = 'center'; ctx.fillText('GUARD', rcx, sy + 56); ctx.textAlign = 'left'; ctx.strokeStyle = '#2a2d30'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(rcx - 14, sy - 14); ctx.lineTo(rcx, sy + 22); ctx.lineTo(rcx + 14, sy - 14); ctx.stroke(); ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.roundRect(rcx - 5, sy + 20, 10, 14, 3); ctx.fill(); }
  else { ctx.strokeStyle = shade(top, 60); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rcx - 10, sy - 6); ctx.lineTo(rcx - 12, sy + 34); ctx.moveTo(rcx + 10, sy - 6); ctx.lineTo(rcx + 12, sy + 34); ctx.stroke(); }
  // neck and head
  limb(ctx, [rcx + headDX * 0.6, sy - 6], [rcx + headDX, headY + 24], 20, skin);
  const hx = rcx + headDX, hr = 33;
  const hg = ctx.createRadialGradient(hx - 8, headY - 10, 4, hx, headY, hr + 4); hg.addColorStop(0, shade(skin, 26)); hg.addColorStop(1, shade(skin, -26));
  ctx.beginPath(); ctx.arc(hx, headY, hr, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
  ctx.fillStyle = '#1b1613'; ctx.beginPath(); ctx.arc(hx, headY - 5, hr + 2, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(hx + hr * 0.5, headY - hr * 0.5, hx, headY - hr * 0.42); ctx.quadraticCurveTo(hx - hr * 0.5, headY - hr * 0.5, hx - hr - 2, headY - 5); ctx.fill();
  const look = 3 + lean * 2; // eyes look down at the person being helped
  ctx.fillStyle = '#fff'; [[-12], [12]].forEach(([dx]) => { ctx.beginPath(); ctx.ellipse(hx + dx, headY - 2, 6.5, 4.6, 0, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#2a1a10'; [[-12], [12]].forEach(([dx]) => { ctx.beginPath(); ctx.arc(hx + dx, headY - 2 + look * 0.5, 3, 0, Math.PI * 2); ctx.fill(); });
  ctx.strokeStyle = '#1b1613'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx - 20, headY - 12); ctx.quadraticCurveTo(hx - 12, headY - 16, hx - 5, headY - 11); ctx.moveTo(hx + 5, headY - 11); ctx.quadraticCurveTo(hx + 12, headY - 16, hx + 20, headY - 12); ctx.stroke();
  ctx.strokeStyle = shade(skin, -46); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx - 3, headY + 2); ctx.quadraticCurveTo(hx + 1, headY + 9, hx + 5, headY + 6); ctx.stroke();
  ctx.strokeStyle = '#4a2418'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(hx - 9, headY + 18); ctx.quadraticCurveTo(hx, headY + 21, hx + 9, headY + 18); ctx.stroke();
  ctx.fillStyle = shade(skin, -8); [[-1], [1]].forEach(([s]) => { ctx.beginPath(); ctx.ellipse(hx + s * (hr + 1), headY + 2, 5, 8, 0, 0, Math.PI * 2); ctx.fill(); });
  if (drowning) { ctx.strokeStyle = '#2a2d30'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx - 8, headY + 34); ctx.lineTo(rcx, sy - 8); ctx.moveTo(hx + 8, headY + 34); ctx.lineTo(rcx, sy - 8); ctx.stroke(); }
  // arms
  const sleeve = shade(top, 8);
  if (lean < 0.5) {
    // locked straight, shoulders over the clasped hands
    limb(ctx, [rcx - 58, sy + 12], [rcx - 12, hy - 22], 30, sleeve); limb(ctx, [rcx + 58, sy + 12], [rcx + 12, hy - 22], 30, sleeve);
    limb(ctx, [rcx - 12, hy - 22], [rcx - 6, hy - 4], 22, skin, { tipScale: 0.9 }); limb(ctx, [rcx + 12, hy - 22], [rcx + 6, hy - 4], 22, skin, { tipScale: 0.9 });
    clasped(ctx, rcx, hy - 2, skin, 0);
  } else {
    // one hand on the forehead, the other lifting the chin
    const fore = [info.hx - 10, info.headTop + 8], chin = [info.hx + 26, info.headTop + 30];
    limb(ctx, [rcx - 58, sy + 12], fore, 26, sleeve); limb(ctx, [rcx + 58, sy + 12], chin, 26, sleeve);
    ctx.fillStyle = skin; [fore, chin].forEach((p) => { ctx.beginPath(); ctx.ellipse(p[0], p[1], 15, 9, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke(); });
  }
}

function rescuerInfant(ctx, st, cx, dep, info, lean) {
  const skin = '#8f5b3c', sleeve = '#3d5a80';
  // an adult kneeling out of frame: the right arm comes in from the upper right with two fingertips on the breastbone
  const tipY = info.chestTop - 2 + dep, tipX = cx + 6;
  blob(ctx, cx + 150, FLOOR + 6, 140, 12, 0.2);
  limb(ctx, [cx + 250, 20], [cx + 118, 186 + dep * 0.6], 40, sleeve);
  limb(ctx, [cx + 118, 186 + dep * 0.6], [tipX + 30, tipY - 36], 24, skin);
  ctx.fillStyle = shade(sleeve, 14); ctx.beginPath(); ctx.roundRect(cx + 102, 174 + dep * 0.6, 32, 28, 8); ctx.fill();
  const palm = ctx.createLinearGradient(0, tipY - 52, 0, tipY - 20); palm.addColorStop(0, shade(skin, 24)); palm.addColorStop(1, shade(skin, -24));
  ctx.fillStyle = palm; ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.roundRect(tipX + 8, tipY - 56, 40, 22, 9); ctx.fill(); ctx.stroke();
  limb(ctx, [tipX + 19, tipY - 42], [tipX + 6, tipY], 9, skin, { tipScale: 0.95 }); limb(ctx, [tipX + 31, tipY - 42], [tipX + 20, tipY], 9, skin, { tipScale: 0.95 });
  ctx.fillStyle = shade(skin, 14); ctx.beginPath(); ctx.ellipse(tipX + 8, tipY + 1, 5, 3.5, 0, 0, Math.PI * 2); ctx.ellipse(tipX + 21, tipY + 1, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  // the other hand rests on the forehead to keep the head in a neutral position
  const fore = [info.hx - 4, info.headTop + 6];
  limb(ctx, [cx - 250, 20], [fore[0] - 6, fore[1] - 56], 38, sleeve); limb(ctx, [fore[0] - 6, fore[1] - 56], [fore[0] - 2, fore[1] - 6], 22, skin);
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(fore[0], fore[1], 20, 9, 0.1, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
  void lean;
}

/* ====================================================================================== the scene */
export function drawScene(ctx, st) {
  ctx.clearRect(0, 0, W, H);
  const mode = st.mode, infant = mode === 'infant';
  if (mode === 'drowning') bgPool(ctx, st.now); else if (infant) bgHome(ctx); else bgGym(ctx);
  const cx = 400;
  const dep = st.depthVisual * (infant ? 15 : 9), rise = st.rise * (infant ? 12 : 9);
  // 0 = hands on the chest, 1 = mouth over the mouth giving breaths
  const lean = st.breathing ? smooth(Math.min(st.breathing, 1 - st.breathing) * 6) : 0;
  if (infant) {
    const info = victimInfant(ctx, st, cx, dep, rise);
    rescuerInfant(ctx, st, cx, dep, info, lean);
    if (st.mask) breathMarks(ctx, info.hx + 20, info.hy - 56);
  } else {
    const info0 = { hx: 400 - 120 - 30 };
    rescuerLegs(ctx, st, rescuerX(cx, info0, lean));
    const info = victimAdult(ctx, st, cx, dep, rise);
    rescuerAdult(ctx, st, cx, dep, info, lean);
    if (st.mask) breathMarks(ctx, info.hx + 24, info.hy - 62);
  }
  if (st.called) phoneOnFloor(ctx, mode);
  // beat cue ring (optional): a soft pulse at 110 per minute
  if (st.cueOn) {
    const phase = (st.now % (60000 / 110)) / (60000 / 110), k = Math.max(0, 1 - phase * 2.2);
    ctx.strokeStyle = 'rgba(11,87,208,' + (0.15 + 0.6 * k) + ')'; ctx.lineWidth = 4 + 6 * k; ctx.beginPath(); ctx.arc(W - 70, 70, 26 + 8 * k, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(11,87,208,0.9)'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('beat', W - 70, 74); ctx.textAlign = 'left';
  }
  const mm = st.m;
  const who = (mm && mm.who ? mm.who : 'the person'); const label = who.charAt(0).toUpperCase() + who.slice(1);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.roundRect(10, 10, 206, 52, 8); ctx.fill();
  ctx.fillStyle = 'rgba(18,32,43,0.9)'; ctx.font = '700 15px system-ui, sans-serif'; ctx.fillText(label, 18, 30);
  ctx.font = '600 13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(18,32,43,0.72)'; ctx.fillText('Time since collapse ' + st.clock, 18, 51);
}
function breathMarks(ctx, x, y) {
  ctx.strokeStyle = 'rgba(70,150,200,0.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y + 10, 10 + i * 8, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke(); }
}
function phoneOnFloor(ctx, mode) {
  // the phone lies on speaker near the rescuer's knee
  const x = mode === 'infant' ? 150 : 590, y = FLOOR + 40;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12); ctx.fillStyle = '#1e2329'; ctx.beginPath(); ctx.roundRect(-34, -14, 68, 28, 6); ctx.fill(); ctx.fillStyle = '#2f9e6e'; ctx.beginPath(); ctx.roundRect(-29, -10, 58, 20, 3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('911', 0, 4); ctx.textAlign = 'left';
  ctx.strokeStyle = 'rgba(40,130,90,0.7)'; ctx.lineWidth = 2; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(0, -14, 12 + i * 9, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke(); }
  ctx.restore();
}
