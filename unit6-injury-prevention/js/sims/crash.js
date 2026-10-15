// Mission 1 simulation: the crash lab (car crash, bike crash, egg test, belt-use data).
// Everything here is observation: the student changes a setting, runs it, and watches the motion and the live readings.
// No scored answer is shown. The physics is an illustrative model (see crash-physics.js).
import { h, svg } from '../util.js';
import * as P from './crash-physics.js';

const W = 960, H = 420, S = 130; // canvas logical size and pixels per metre
const GROUND = 345;
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const f0 = (x) => String(Math.round(x));

/* ====================================================================================== drawing helpers */
function capsule(ctx, a, b, wm, fill, stroke) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-6;
  const ang = Math.atan2(dy, dx), r = wm / 2;
  ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(L, -r); ctx.arc(L, 0, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(0, r); ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = 1.5; ctx.strokeStyle = stroke; ctx.stroke(); }
  ctx.restore();
}
function skyGround(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, '#cfe8f7'); g.addColorStop(1, '#f1f8fc');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND);
  // far hills
  ctx.fillStyle = '#d7e6ee'; ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(0, 250);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 235 + 18 * Math.sin(x / 120) + 10 * Math.sin(x / 47));
  ctx.lineTo(W, GROUND); ctx.closePath(); ctx.fill();
  const r = ctx.createLinearGradient(0, GROUND, 0, H);
  r.addColorStop(0, '#59636b'); r.addColorStop(1, '#3a4249');
  ctx.fillStyle = r; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#e8edf0'; ctx.fillRect(0, GROUND, W, 3);
  ctx.fillStyle = '#e7e29a';
  for (let x = 10; x < W; x += 110) ctx.fillRect(x, GROUND + 46, 60, 5);
}
function barrier(ctx, x, wm, hm) {
  const px = x, w = wm * S, hh = hm * S;
  const g = ctx.createLinearGradient(px, 0, px + w, 0);
  g.addColorStop(0, '#8d979e'); g.addColorStop(0.5, '#c7cdd2'); g.addColorStop(1, '#8a949b');
  ctx.fillStyle = g; ctx.fillRect(px, GROUND - hh, w, hh);
  ctx.strokeStyle = 'rgba(80,90,98,0.5)'; ctx.lineWidth = 1;
  for (let y = GROUND - hh + 24; y < GROUND; y += 24) { ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + w, y); ctx.stroke(); }
  ctx.strokeStyle = '#5d676e'; ctx.lineWidth = 2; ctx.strokeRect(px, GROUND - hh, w, hh);
  ctx.fillStyle = '#f2c230'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(px + i * w / 4, GROUND - hh); ctx.lineTo(px + (i + 0.5) * w / 4, GROUND - hh); ctx.lineTo(px + (i + 0.25) * w / 4, GROUND - hh + 14); ctx.closePath(); }
}
function dummy(ctx, pt, T, opts) {
  // pt in metres (car frame or world), T maps metres to canvas pixels
  const P2 = {}; Object.keys(pt).forEach((k) => { P2[k] = T(pt[k]); });
  const yellow = '#f2b81c', dark = '#c58f0b', edge = '#7a5606', metal = '#7e8a93';
  capsule(ctx, P2.P, P2.K, 0.15 * S, yellow, edge);          // thigh
  capsule(ctx, P2.K, P2.A, 0.115 * S, yellow, edge);         // shin
  // foot
  const fa = Math.atan2(P2.A[1] - P2.K[1], P2.A[0] - P2.K[0]);
  ctx.save(); ctx.translate(P2.A[0], P2.A[1]); ctx.rotate(fa - Math.PI / 2 + 0.1);
  ctx.fillStyle = '#2b2f33'; ctx.beginPath(); ctx.roundRect(-0.04 * S, -0.03 * S, 0.24 * S, 0.075 * S, 6); ctx.fill(); ctx.restore();
  // torso: tapered body from pelvis to shoulders
  const nx = P2.N[0] - P2.P[0], ny = P2.N[1] - P2.P[1], L = Math.hypot(nx, ny) || 1, ux = nx / L, uy = ny / L, vx = -uy, vy = ux;
  const wp = 0.15 * S, ws = 0.15 * S; // half widths (pelvis and chest), the chest is deeper
  ctx.beginPath(); ctx.moveTo(P2.P[0] + vx * wp, P2.P[1] + vy * wp);
  ctx.quadraticCurveTo(P2.P[0] + ux * L * 0.5 + vx * (ws + 8), P2.P[1] + uy * L * 0.5 + vy * (ws + 8), P2.N[0] + vx * ws, P2.N[1] + vy * ws);
  ctx.lineTo(P2.N[0] - vx * ws, P2.N[1] - vy * ws);
  ctx.quadraticCurveTo(P2.P[0] + ux * L * 0.5 - vx * (ws + 8), P2.P[1] + uy * L * 0.5 - vy * (ws + 8), P2.P[0] - vx * wp, P2.P[1] - vy * wp);
  ctx.closePath();
  const gt = ctx.createLinearGradient(P2.P[0] + vx * wp, P2.P[1] + vy * wp, P2.P[0] - vx * wp, P2.P[1] - vy * wp);
  gt.addColorStop(0, '#f8cd4d'); gt.addColorStop(1, dark);
  ctx.fillStyle = gt; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = edge; ctx.stroke();
  // rib lines
  ctx.strokeStyle = 'rgba(122,86,6,0.55)'; ctx.lineWidth = 1.2;
  for (let i = 1; i < 5; i++) { const t = 0.45 + i * 0.1; ctx.beginPath(); ctx.moveTo(P2.P[0] + ux * L * t + vx * ws * 0.9, P2.P[1] + uy * L * t + vy * ws * 0.9); ctx.lineTo(P2.P[0] + ux * L * t - vx * ws * 0.9, P2.P[1] + uy * L * t - vy * ws * 0.9); ctx.stroke(); }
  // neck and head
  capsule(ctx, P2.N, P2.H, 0.075 * S, metal, '#4c565d');
  const hr = 0.115 * S, ha = Math.atan2(P2.H[1] - P2.N[1], P2.H[0] - P2.N[0]);
  ctx.save(); ctx.translate(P2.H[0], P2.H[1]); ctx.rotate(ha + Math.PI / 2);
  ctx.beginPath(); ctx.arc(0, 0, hr, 0, Math.PI * 2); ctx.fillStyle = '#f4c63d'; ctx.fill();
  ctx.fillStyle = '#16191c'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, hr, 0, Math.PI / 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, hr, Math.PI, Math.PI * 1.5); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = edge; ctx.beginPath(); ctx.arc(0, 0, hr, 0, Math.PI * 2); ctx.stroke();
  if (opts && opts.helmet) {
    ctx.beginPath(); ctx.arc(0, 0, hr * 1.22, Math.PI * 0.95, Math.PI * 2.05); ctx.lineTo(hr * 1.15, hr * 0.15); ctx.lineTo(-hr * 1.15, hr * 0.15); ctx.closePath();
    const hg = ctx.createLinearGradient(-hr, -hr * 1.3, hr, 0); hg.addColorStop(0, '#59b5ff'); hg.addColorStop(1, '#1d63b4');
    ctx.fillStyle = hg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#0b3c75'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, hr * 1.08, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
  }
  ctx.restore();
  // arm over the torso
  capsule(ctx, P2.N, P2.E, 0.10 * S, '#f0b01a', edge);
  capsule(ctx, P2.E, P2.W, 0.085 * S, '#e6a617', edge);
  [P2.K, P2.E, P2.P].forEach((p) => { ctx.beginPath(); ctx.arc(p[0], p[1], 0.045 * S, 0, Math.PI * 2); ctx.fillStyle = metal; ctx.fill(); });
}
function wheel(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, '#4a4a4a'); g.addColorStop(1, '#121212'); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); const g2 = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, r * 0.55); g2.addColorStop(0, '#e6e9ec'); g2.addColorStop(1, '#8b949b'); ctx.fillStyle = g2; ctx.fill();
  ctx.strokeStyle = '#6a737a'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { const a = i * 1.2566; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55); ctx.stroke(); }
}

/* ====================================================================================== car scene renderer */
const XB = 6.8;                 // barrier face, metres from the left edge
const CAB0 = XB - 2.52;         // car-frame x = 0 at the moment of impact
function drawCar(ctx, run, tms) {
  const fr = run.frames, geo = run.geometry, v0 = run.v0;
  const i = Math.max(0, Math.min(fr.length - 1, tms));
  const f = fr[i];
  const t = tms / 1000;
  const shift = tms < 0 ? v0 * t : f.car;                       // metres moved since the moment of impact
  const cab = CAB0 + shift;
  const gy = (y) => GROUND - (y + 0.30) * S;                    // car-frame y -> canvas y
  const T = (p) => [(cab + p[0]) * S, gy(p[1])];
  const pts = f.pts;
  ctx.clearRect(0, 0, W, H);
  skyGround(ctx);
  barrier(ctx, XB * S, 0.9, 1.6);
  const frontX = Math.min(XB, cab + 0.62 + 1.9);
  const crushFrac = Math.max(0, Math.min(1, (cab + 0.62 + 1.9 - XB) / 1.0));
  // car shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse((cab - 0.2) * S, GROUND + 4, 2.7 * S, 9, 0, 0, Math.PI * 2); ctx.fill();
  // body paint (back layer): lower body, hood with crumple, trunk
  const paint = ctx.createLinearGradient(0, gy(0.9), 0, gy(-0.1)); paint.addColorStop(0, '#d93a35'); paint.addColorStop(1, '#8e1f1c');
  const xs = (x) => (cab + x) * S;
  ctx.beginPath();
  ctx.moveTo(xs(-2.3), gy(-0.05));
  ctx.lineTo(xs(-2.3), gy(0.62)); ctx.quadraticCurveTo(xs(-2.2), gy(0.84), xs(-1.85), gy(0.86));
  ctx.lineTo(xs(0.62), gy(0.9));
  // hood: buckles into an accordion as it crumples
  const hoodStart = xs(0.62), hoodEnd = frontX * S;
  const seg = 7;
  for (let k = 1; k <= seg; k++) { const x = hoodStart + (hoodEnd - hoodStart) * k / seg; const up = (k < seg ? (k % 2 ? -1 : 0.4) : 0) * crushFrac * 20; ctx.lineTo(x, gy(0.9 - 0.14 * (k / seg)) + up); }
  ctx.lineTo(hoodEnd, gy(0.62)); ctx.lineTo(hoodEnd - 6, gy(-0.05));
  ctx.closePath(); ctx.fillStyle = paint; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#5c1210'; ctx.stroke();
  // window pillars and roof: cutaway so the dummy stays visible
  ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.strokeStyle = '#b32e2a';
  ctx.beginPath(); ctx.moveTo(xs(0.62), gy(0.9)); ctx.lineTo(xs(0.10), gy(1.47)); ctx.lineTo(xs(-0.05), gy(1.57)); ctx.lineTo(xs(-1.25), gy(1.55)); ctx.lineTo(xs(-1.85), gy(0.9)); ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = '#7e1a17'; ctx.beginPath(); ctx.moveTo(xs(-0.78), gy(1.55)); ctx.lineTo(xs(-0.84), gy(0.86)); ctx.stroke();
  // glass tint
  ctx.fillStyle = 'rgba(160,205,235,0.22)'; ctx.beginPath(); ctx.moveTo(xs(0.62), gy(0.9)); ctx.lineTo(xs(0.10), gy(1.47)); ctx.lineTo(xs(-0.05), gy(1.57)); ctx.lineTo(xs(-1.25), gy(1.55)); ctx.lineTo(xs(-1.85), gy(0.9)); ctx.closePath(); ctx.fill();
  // interior
  const sb = geo.seatBack;
  ctx.fillStyle = '#3a4048'; ctx.beginPath(); ctx.roundRect(...T([-0.62, 0.40]), 0.78 * S, -0.10 * S, 8); ctx.fill();  // seat cushion
  ctx.lineCap = 'round'; ctx.lineWidth = 0.17 * S; ctx.strokeStyle = '#2f343b'; ctx.beginPath(); ctx.moveTo(...T([sb.a[0] - 0.06, sb.a[1] + 0.02])); ctx.lineTo(...T([sb.b[0] - 0.06, sb.b[1]])); ctx.stroke();
  ctx.lineWidth = 0.1 * S; ctx.strokeStyle = '#444b53'; ctx.beginPath(); ctx.moveTo(...T([sb.b[0] + 0.0, sb.b[1] - 0.2])); ctx.lineTo(...T([sb.b[0] - 0.01, sb.b[1] + 0.0])); ctx.stroke();
  // dash and steering wheel
  ctx.fillStyle = '#2b3036'; ctx.beginPath(); ctx.moveTo(...T([0.56, 0.0])); ctx.lineTo(...T([0.56, 0.86])); ctx.lineTo(...T([0.62, 0.92])); ctx.lineTo(...T([0.9, 0.9])); ctx.lineTo(...T([0.9, 0.0])); ctx.closePath(); ctx.fill();
  ctx.lineCap = 'round'; ctx.lineWidth = 0.05 * S; ctx.strokeStyle = '#555d66'; ctx.beginPath(); ctx.moveTo(...T([0.30, 0.66])); ctx.lineTo(...T([0.19, 0.88])); ctx.stroke();
  ctx.lineWidth = 0.075 * S; ctx.strokeStyle = '#161a1e'; ctx.beginPath(); ctx.moveTo(...T(geo.wheel.a)); ctx.lineTo(...T(geo.wheel.b)); ctx.stroke();
  // floor and pedals
  ctx.fillStyle = '#23272c'; ctx.fillRect(xs(-1.2), gy(0.0), 2.0 * S, 0.06 * S);
  // dummy (behind the belt)
  dummy(ctx, pts, T, null);
  if (run.metrics.belted) {
    const D = geo.belt.D, Bk = geo.belt.Bk, N = pts.N, Pp = pts.P;
    const dx = Pp[0] - N[0], dy = Pp[1] - N[1], l = Math.hypot(dx, dy) || 1, vx = -dy / l, vy = dx / l;
    const chestFront = [N[0] + vx * -0.13 + (dx / l) * 0.05, N[1] + vy * -0.13 + (dy / l) * 0.05];
    const lapPt = [Pp[0] + vx * -0.13, Pp[1] + vy * -0.13];
    const tension = Math.min(1, f.belt / 12);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = (0.05 + 0.02 * tension) * S; ctx.strokeStyle = '#15181b';
    ctx.beginPath(); ctx.moveTo(...T(D)); ctx.lineTo(...T(N)); ctx.lineTo(...T(lapPt)); ctx.lineTo(...T(Bk)); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.moveTo(...T(D)); ctx.lineTo(...T(N)); ctx.lineTo(...T(lapPt)); ctx.stroke();
    void chestFront;
  }
  // wheels, bumper
  wheel(ctx, xs(0.62 + 0.5), GROUND - 0.31 * S, 0.33 * S);
  wheel(ctx, xs(-1.55), GROUND - 0.31 * S, 0.33 * S);
  ctx.fillStyle = '#9aa3aa'; ctx.fillRect(hoodEnd - 8, gy(0.16), 10, 0.2 * S);
  // impact flash
  if (tms >= 0 && tms < 45) { const k = 1 - tms / 45; ctx.save(); ctx.globalAlpha = 0.85 * k; ctx.fillStyle = '#ffe9a6'; ctx.translate(XB * S, GROUND - 0.55 * S); ctx.beginPath(); for (let a = 0; a < 16; a++) { const r = (a % 2 ? 22 : 62) * (0.6 + 0.4 * k); ctx.lineTo(Math.cos(a * Math.PI / 8) * r, Math.sin(a * Math.PI / 8) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); }
  // head impact ring
  if (f.headHit && run.headHitMs != null && tms >= run.headHitMs && tms < run.headHitMs + 80) {
    const k = (tms - run.headHitMs) / 80; ctx.strokeStyle = 'rgba(179,38,30,' + (1 - k) + ')'; ctx.lineWidth = 3; const hp = T(pts.H); ctx.beginPath(); ctx.arc(hp[0], hp[1], 24 + k * 34, 0, Math.PI * 2); ctx.stroke();
  }
  // clock
  ctx.fillStyle = 'rgba(18,32,43,0.85)'; ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText(tms < 0 ? 'Before impact' : 'Impact + ' + String(tms).padStart(3, ' ') + ' ms', 18, 28);
}

/* ====================================================================================== bike scene renderer */
function drawBike(ctx, run, tms) {
  const fr = run.frames, i = Math.max(0, Math.min(fr.length - 1, tms)), f = fr[i], t = tms / 1000;
  const v0 = run.v0;
  // the camera follows the bike until the wheel hits the curb, then holds
  const camX = 4.2;           // metres: where the curb is on screen
  const T = (p) => [(camX + p[0]) * S, GROUND - p[1] * S];
  ctx.clearRect(0, 0, W, H); skyGround(ctx);
  // curb / obstacle: a parked car's rear bumper
  const ox = camX * S;
  const og = ctx.createLinearGradient(ox, 0, ox + 160, 0); og.addColorStop(0, '#2f6fb0'); og.addColorStop(1, '#1b4a7c');
  ctx.fillStyle = og; ctx.beginPath(); ctx.roundRect(ox, GROUND - 0.78 * S, 2.6 * S, 0.62 * S, 12); ctx.fill();
  ctx.fillStyle = '#9fc7e8'; ctx.beginPath(); ctx.roundRect(ox + 0.5 * S, GROUND - 1.25 * S, 1.6 * S, 0.5 * S, 10); ctx.fill();
  wheel(ctx, ox + 0.55 * S, GROUND - 0.2 * S, 0.24 * S);
  ctx.fillStyle = '#c63a34'; ctx.fillRect(ox - 4, GROUND - 0.65 * S, 8, 0.2 * S);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(T([-0.8, 0])[0], GROUND + 3, 1.2 * S, 7, 0, 0, Math.PI * 2); ctx.fill();
  const p = f.pts;
  // bicycle
  const F = T(p.F), R = T(p.R), Sd = T(p.S), B = T(p.B);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  [[R, 0.34], [F, 0.34]].forEach(([c, r]) => { ctx.beginPath(); ctx.arc(c[0], c[1], r * S, 0, Math.PI * 2); ctx.lineWidth = 6; ctx.strokeStyle = '#1b1d1f'; ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = '#8d949a'; for (let a = 0; a < 8; a++) { ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + Math.cos(a * 0.785 + t * 6) * r * S, c[1] + Math.sin(a * 0.785 + t * 6) * r * S); ctx.stroke(); } });
  ctx.lineWidth = 6; ctx.strokeStyle = '#e07b1f';
  ctx.beginPath(); ctx.moveTo(R[0], R[1]); ctx.lineTo(Sd[0], Sd[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(F[0], F[1]); ctx.moveTo(Sd[0], Sd[1]); ctx.lineTo(F[0], F[1]); ctx.moveTo(R[0], R[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = '#2a2d30'; ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(B[0] - 4, B[1] - 20); ctx.stroke(); ctx.fillRect(Sd[0] - 16, Sd[1] - 6, 30, 8);
  dummy(ctx, p, T, { helmet: run.metrics.helmet });
  if (f.headHit && tms >= run.hitMs && tms < run.hitMs + 90) { const k = (tms - run.hitMs) / 90; const hp = T(p.H); ctx.strokeStyle = 'rgba(179,38,30,' + (1 - k) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hp[0], hp[1], 20 + k * 36, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(18,32,43,0.85)'; ctx.font = '700 15px system-ui, sans-serif'; ctx.fillText(Math.round(v0 / P.MPH) + ' mph  ·  ' + String(tms).padStart(4, ' ') + ' ms', 18, 28);
}

/* ====================================================================================== egg scene renderer */
function drawEgg(ctx, run, tms) {
  const m = run.metrics, fr = run.frames, speed = m.speed;
  ctx.clearRect(0, 0, W, H); skyGround(ctx);
  const wallX = 780;
  barrier(ctx, wallX, 1.3, 1.5);
  // time: the cart rolls in, hits the wall, the egg keeps going until its stop distance is used up
  const total = fr[fr.length - 1].t, pre = 0.35;                       // animation timeline in sim seconds (before impact is "pre")
  const t = tms / 1000;                                                  // negative before impact
  const eggRel = t <= 0 ? 0 : fr[Math.min(fr.length - 1, Math.round(t / total * (fr.length - 1)))].dist; // metres the egg has slid forward relative to the cart
  const cartX = wallX - 330 + (t < 0 ? Math.max(-480, speed * 90 * t / 1) : 0);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(cartX + 150, GROUND + 3, 190, 8, 0, 0, Math.PI * 2); ctx.fill();
  // cart
  const cg = ctx.createLinearGradient(0, GROUND - 90, 0, GROUND - 38); cg.addColorStop(0, '#3b8fd9'); cg.addColorStop(1, '#1b4f86');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.roundRect(cartX, GROUND - 72, 300, 42, 9); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#0f3560'; ctx.stroke();
  wheel(ctx, cartX + 55, GROUND - 24, 25); wheel(ctx, cartX + 245, GROUND - 24, 25);
  // posts
  ctx.fillStyle = '#7a5a36'; ctx.fillRect(cartX + 40, GROUND - 160, 12, 90); ctx.fillRect(cartX + 250, GROUND - 160, 12, 90);
  const eggX0 = cartX + 150;
  const slide = Math.min(eggRel, 0.32) * 300;                            // 1 m = 300 px here so the stretch is easy to see
  const ex = eggX0 + (m.sheet ? slide : Math.min(slide, 70)), ey = m.sheet ? GROUND - 134 : GROUND - 98;
  if (m.sheet) {
    // sheet: a cloth between the posts that bulges forward and down as the egg loads it
    const sag = 40 + Math.min(1, eggRel / 0.3) * 38, bulge = slide * 0.7;
    ctx.fillStyle = '#e8edf1'; ctx.strokeStyle = '#8c9aa5'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cartX + 46, GROUND - 150); ctx.quadraticCurveTo(cartX + 150 + bulge, GROUND - 150 + sag * 1.6, cartX + 256, GROUND - 150); ctx.lineTo(cartX + 256, GROUND - 140); ctx.quadraticCurveTo(cartX + 150 + bulge, GROUND - 140 + sag * 1.7, cartX + 46, GROUND - 140); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    ctx.fillStyle = '#5b3f22'; ctx.fillRect(cartX + 262, GROUND - 120, 14, 50); // hard front rail
    ctx.fillStyle = '#8a6a3f'; ctx.fillRect(cartX + 100, GROUND - 76, 100, 6); // a plain wooden tray under the egg
  }
  // egg
  const broken = m.cracks && t > 0 && eggRel > Math.min(m.stopCm / 100, 0.008) * 0.9;
  ctx.save(); ctx.translate(ex, ey);
  const eg = ctx.createLinearGradient(-14, -18, 14, 20); eg.addColorStop(0, '#fffdf4'); eg.addColorStop(1, '#e2d3b0');
  ctx.beginPath(); ctx.ellipse(0, 0, 19, 25, 0, 0, Math.PI * 2); ctx.fillStyle = eg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#a38f61'; ctx.stroke();
  if (broken) { ctx.strokeStyle = '#6b5a38'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(0, -8); ctx.lineTo(-8, 2); ctx.lineTo(2, 14); ctx.lineTo(-4, 24); ctx.stroke(); ctx.fillStyle = '#f2b51c'; ctx.beginPath(); ctx.ellipse(10, 30, 14, 7, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(18,32,43,0.85)'; ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText(t < 0 ? 'Cart rolling toward the wall' : 'Impact + ' + Math.round(t * 1000) + ' ms', 18, 28);
  void pre; void total;
}

/* ====================================================================================== the sim UI */
export function mountSim(host, api) {
  const state = { tab: 'car', runs: [], seen: { belt: new Set(), helmet: new Set(), egg: new Set(), group: new Set() }, raf: 0, destroyed: false };
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const mkCanvas = (label) => {
    const c = h('canvas', { role: 'img', 'aria-label': label, width: Math.round(W * dpr), height: Math.round(H * dpr) });
    const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    return { c, ctx };
  };
  const scenes = {};
  const tabs = [['car', 'Car crash'], ['bike', 'Bike crash'], ['egg', 'Egg test'], ['data', 'Belt-use data']];

  /* ---------- tab bar ---------- */
  const tablist = h('div.sim-tabs', { role: 'tablist', 'aria-label': 'Crash lab sections' });
  const panels = {};
  tabs.forEach(([id, label]) => {
    const b = h('button.sim-tab', { type: 'button', role: 'tab', id: 'tab-' + id, 'aria-controls': 'panel-' + id, 'aria-selected': id === 'car' ? 'true' : 'false', tabindex: id === 'car' ? '0' : '-1', onclick: () => select(id) }, label);
    b.addEventListener('keydown', (e) => { const k = tabs.map((x) => x[0]), i = k.indexOf(id); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = k[(i + (e.key === 'ArrowRight' ? 1 : k.length - 1)) % k.length]; select(n); document.getElementById('tab-' + n).focus(); } });
    tablist.appendChild(b);
  });
  function select(id) {
    state.tab = id;
    tabs.forEach(([t]) => { const b = document.getElementById('tab-' + t); if (b) { b.setAttribute('aria-selected', String(t === id)); b.tabIndex = t === id ? 0 : -1; } panels[t].hidden = t !== id; });
    if (id === 'data') dataView();
  }

  /* ---------- shared scene player ---------- */
  function player(kind) {
    const sc = scenes[kind];
    const speedSel = h('select.input.sm', { 'aria-label': 'Playback speed', onchange: () => { sc.rate = Number(speedSel.value); } },
      h('option', { value: '0.1' }, 'Slow motion (1/10)'), h('option', { value: '0.03' }, 'Very slow (1/30)'), h('option', { value: '1' }, 'Real time'));
    sc.rate = 0.1;
    const scrub = h('input', { type: 'range', min: '0', max: '0', value: '0', step: '1', 'aria-label': 'Scrub through the crash, in milliseconds', disabled: true });
    const stepBack = h('button.btn.secondary.small', { type: 'button', disabled: true, onclick: () => seek(sc.t - 10) }, '− 10 ms');
    const stepFwd = h('button.btn.secondary.small', { type: 'button', disabled: true, onclick: () => seek(sc.t + 10) }, '+ 10 ms');
    const replay = h('button.btn.secondary.small', { type: 'button', disabled: true, onclick: () => play() }, 'Replay');
    const pre = kind === 'bike' ? 150 : kind === 'egg' ? 350 : 220;
    scrub.addEventListener('input', () => { stopAnim(); sc.t = Number(scrub.value) - pre; draw(); });
    function seek(t) { stopAnim(); sc.t = Math.max(-pre, Math.min(sc.end, Math.round(t))); scrub.value = String(sc.t + pre); draw(); }
    function draw() { if (!sc.run) return; const tt = Math.round(sc.t); sc.draw(sc.ctx, sc.run, tt); sc.onFrame && sc.onFrame(sc.run, tt); scrub.value = String(tt + pre); }
    function stopAnim() { if (sc.raf) cancelAnimationFrame(sc.raf); sc.raf = 0; }
    function play() {
      if (!sc.run) return; stopAnim();
      if (api.reduced()) { seek(sc.peakAt()); return; }                // no animation: jump to the moment of impact and let the student step
      sc.t = -pre; let last = performance.now();
      const loop = (now) => {
        if (state.destroyed) return;
        sc.t += (now - last) * sc.rate; last = now;
        if (sc.t >= sc.end) { sc.t = sc.end; draw(); sc.raf = 0; return; }
        draw(); sc.raf = requestAnimationFrame(loop);
      };
      sc.raf = requestAnimationFrame(loop);
    }
    function load(run, endMs) {
      sc.run = run; sc.end = endMs; scrub.max = String(endMs + pre); [scrub, stepBack, stepFwd, replay].forEach((e) => { e.disabled = false; });
      play();
    }
    sc.load = load; sc.stop = stopAnim;
    return { speedSel, scrub, stepBack, stepFwd, replay, load, draw, stop: stopAnim, seek };
  }

  /* ---------- meters ---------- */
  function meter(label, unit, max) {
    const val = h('span.mv-val', '0'); const bar = h('i'); const track = h('div.mv-track', { role: 'meter', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': '0' }, bar);
    const el = h('div.gm', h('div.mv-top', h('span.mv-lab', label), h('span.mv-num', val, h('span.mv-unit', ' ' + unit))), track);
    return { el, set(v) { val.textContent = v >= 100 ? f0(v) : f1(v); bar.style.width = Math.min(100, v / max * 100) + '%'; track.setAttribute('aria-valuenow', String(Math.round(v))); } };
  }
  function riskMeter(label) {
    const word = h('span.risk-word', '—'); const bar = h('i'); const track = h('div.mv-track.risk', { role: 'meter', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, bar);
    const el = h('div.gm', h('div.mv-top', h('span.mv-lab', label), h('span.mv-num', word)), track);
    return { el, set(p) { const w = P.riskLabel(p); word.textContent = w + ' · ' + Math.round(p * 100) + '%'; bar.style.width = (p * 100) + '%'; track.setAttribute('aria-valuenow', String(Math.round(p * 100))); el.dataset.level = w.toLowerCase(); } };
  }
  const live = h('p.sim-live.sr-only', { role: 'status', 'aria-live': 'polite' });

  /* ---------- run log ---------- */
  const logBody = h('tbody');
  const logTable = h('table.run-log', h('caption', 'Your runs (newest first)'), h('thead', h('tr', ['Run', 'Test', 'Setting', 'Force', 'Chest', 'Head', 'Head risk'].map((x) => h('th', { scope: 'col' }, x)))), logBody);
  function logRun(row) {
    state.runs.unshift(row);
    state.runs = state.runs.slice(0, 8);
    logBody.replaceChildren(...state.runs.map((r) => h('tr', h('td', '#' + r.n), h('td', r.test), h('td', r.setting), h('td.num', r.force), h('td.num', r.chest), h('td.num', r.head), h('td', r.risk))));
  }
  let runN = 0;

  /* ================= CAR PANEL ================= */
  {
    const cv = mkCanvas('Side view of a crash-test dummy seated in a car that is about to hit a concrete wall.');
    scenes.car = { c: cv.c, ctx: cv.ctx, draw: drawCar };
    const pl = player('car');
    const belt = h('input', { type: 'checkbox', id: 'sim-belt', role: 'switch', checked: true });
    const spd = h('input', { type: 'range', id: 'sim-car-speed', min: '10', max: '60', step: '5', value: '30', 'aria-describedby': 'sim-car-speed-out' });
    const spdOut = h('output#sim-car-speed-out', { for: 'sim-car-speed' }, '30 mph');
    spd.addEventListener('input', () => { spdOut.textContent = spd.value + ' mph'; });
    const mForce = meter('Force on the dummy', 'kN', 100), mChest = meter('Chest load', 'g', 150), mHead = meter('Head load', 'g', 300), mBelt = meter('Belt pull', 'kN', 25);
    const rHead = riskMeter('Head injury risk'), rChest = riskMeter('Chest injury risk');
    const go = h('button.btn', { type: 'button', id: 'sim-car-go', onclick: runCar }, 'Run the crash');
    const out = h('p.sim-note', { role: 'status', 'aria-live': 'polite' }, 'Pick a setting and press Run the crash.');
    scenes.car.onFrame = (run, t) => {
      const f = run.frames[Math.max(0, Math.min(run.frames.length - 1, t))];
      mForce.set(f.force); mChest.set(f.chestG); mHead.set(f.headG); mBelt.set(f.belt);
      rHead.set(P.risk.head(f.peakHead)); rChest.set(P.risk.chest(f.peakChest));
    };
    scenes.car.peakAt = () => { const fr = scenes.car.run.frames; let b = 0; fr.forEach((f, i) => { if (f.force > fr[b].force) b = i; }); return b; };
    function runCar() {
      const mph = Number(spd.value), belted = belt.checked;
      const run = P.simulateCar({ mph, belted });
      const hit = run.frames.find((f) => f.headHit); run.headHitMs = hit ? Math.round(hit.t * 1000) : null;
      scenes.car.load(run, run.frames.length - 1);
      state.seen.belt.add(belted ? 'on' : 'off'); if (belted) api.report('belted'); else api.report('unbelted');
      const m = run.metrics; runN++;
      logRun({ n: runN, test: 'Car', setting: (belted ? 'Buckled' : 'Unbuckled') + ', ' + mph + ' mph', force: f1(m.peakForceKN) + ' kN', chest: f0(m.peakChestG) + ' g', head: f0(m.peakHeadG) + ' g', risk: P.riskLabel(m.headRisk) });
      out.textContent = (belted ? 'Buckled' : 'Unbuckled') + ' at ' + mph + ' mph: the car stopped in ' + m.stopMs + ' ms. Peak force on the dummy ' + f1(m.peakForceKN) + ' kN, chest ' + f0(m.peakChestG) + ' g, head ' + f0(m.peakHeadG) + ' g. Head injury risk ' + P.riskLabel(m.headRisk).toLowerCase() + ', chest injury risk ' + P.riskLabel(m.chestRisk).toLowerCase() + '.';
      cv.c.setAttribute('aria-label', 'Side view of a crash-test dummy, ' + (belted ? 'buckled' : 'not buckled') + ', in a car hitting a concrete wall at ' + mph + ' miles per hour.');
    }
    // first frame so the panel is never empty
    const first = P.simulateCar({ mph: 30, belted: true }); first.headHitMs = null; scenes.car.run = first; scenes.car.t = -220; drawCar(cv.ctx, first, -220);
    panels.car = h('div.sim-panel', { role: 'tabpanel', id: 'panel-car', 'aria-labelledby': 'tab-car' },
      h('p.sim-intro', 'A crash-test dummy rides in a car that hits a solid wall. This is a simplified model: there are no airbags, so you can see what the belt does on its own.'),
      h('div.sim-stage', cv.c),
      h('div.sim-controls',
        h('div.ctl', h('label', { for: 'sim-belt' }, 'Seat belt'), h('label.switch', belt, h('span.knob'), h('span.switch-text', 'Buckled'))),
        h('div.ctl', h('label', { for: 'sim-car-speed' }, 'Speed'), spd, spdOut),
        h('div.ctl', go)),
      h('div.sim-controls.sub', h('div.ctl', h('label', 'Playback'), pl.speedSel), h('div.ctl.row', pl.replay, pl.stepBack, pl.stepFwd), h('div.ctl.grow', h('label.sr-only', 'Scrub'), pl.scrub)),
      out,
      h('div.sim-meters', mForce.el, mChest.el, mHead.el, mBelt.el, rHead.el, rChest.el),
      h('p.sim-fine', 'Readings come from a teaching model, not a medical prediction. Chest and head loads are peak values held for about 3 thousandths of a second; g means multiples of gravity.'));
    belt.addEventListener('change', () => { const t = belt.parentNode.querySelector('.switch-text'); t.textContent = belt.checked ? 'Buckled' : 'Unbuckled'; });
  }

  /* ================= BIKE PANEL ================= */
  {
    const cv = mkCanvas('Side view of a cyclist riding toward the back of a parked car.');
    scenes.bike = { c: cv.c, ctx: cv.ctx, draw: drawBike };
    const pl = player('bike');
    const helmet = h('input', { type: 'checkbox', id: 'sim-helmet', role: 'switch', checked: true });
    const spd = h('input', { type: 'range', id: 'sim-bike-speed', min: '5', max: '25', step: '5', value: '15', 'aria-describedby': 'sim-bike-speed-out' });
    const spdOut = h('output#sim-bike-speed-out', { for: 'sim-bike-speed' }, '15 mph');
    spd.addEventListener('input', () => { spdOut.textContent = spd.value + ' mph'; });
    const mHead = meter('Head load', 'g', 520), rHead = riskMeter('Head injury risk'), mSpeed = meter('Head speed at landing', 'mph', 25);
    const out = h('p.sim-note', { role: 'status', 'aria-live': 'polite' }, 'A rider swerves into the back of a parked car and goes over the handlebars. Choose a setting and press Run the crash.');
    const go = h('button.btn', { type: 'button', id: 'sim-bike-go', onclick: runBike }, 'Run the crash');
    scenes.bike.onFrame = (run, t) => { const f = run.frames[Math.max(0, Math.min(run.frames.length - 1, t))]; mHead.set(f.headG); rHead.set(P.risk.head(f.peakHead)); mSpeed.set(f.headHit ? run.metrics.headSpeedMph : 0); };
    scenes.bike.peakAt = () => scenes.bike.run.metrics.hitMs || 0;
    function runBike() {
      const mph = Number(spd.value), hel = helmet.checked;
      const run = P.simulateBike({ mph, helmet: hel }); run.hitMs = run.metrics.hitMs;
      scenes.bike.load(run, Math.min(run.frames.length - 1, (run.hitMs || 600) + 500));
      state.seen.helmet.add(hel ? 'on' : 'off'); if (state.seen.helmet.size >= 2) api.report('helmet');
      const m = run.metrics; runN++;
      logRun({ n: runN, test: 'Bike', setting: (hel ? 'Helmet' : 'No helmet') + ', ' + mph + ' mph', force: '—', chest: '—', head: f0(m.peakHeadG) + ' g', risk: P.riskLabel(m.headRisk) });
      out.textContent = (hel ? 'With a helmet' : 'Without a helmet') + ' at ' + mph + ' mph: the head landed at about ' + f0(m.headSpeedMph) + ' mph. Peak head load ' + f0(m.peakHeadG) + ' g. Head injury risk ' + P.riskLabel(m.headRisk).toLowerCase() + '.';
      cv.c.setAttribute('aria-label', 'Side view of a cyclist ' + (hel ? 'wearing a helmet' : 'with no helmet') + ' going over the handlebars after hitting a parked car at ' + mph + ' miles per hour.');
    }
    const first = P.simulateBike({ mph: 15, helmet: true }); first.hitMs = first.metrics.hitMs; scenes.bike.run = first; scenes.bike.t = 0; drawBike(cv.ctx, first, 0);
    panels.bike = h('div.sim-panel', { role: 'tabpanel', id: 'panel-bike', 'aria-labelledby': 'tab-bike', hidden: true },
      h('div.sim-stage', cv.c),
      h('div.sim-controls',
        h('div.ctl', h('label', { for: 'sim-helmet' }, 'Helmet'), h('label.switch', helmet, h('span.knob'), h('span.switch-text', 'Helmet on'))),
        h('div.ctl', h('label', { for: 'sim-bike-speed' }, 'Speed'), spd, spdOut),
        h('div.ctl', go)),
      h('div.sim-controls.sub', h('div.ctl', h('label', 'Playback'), pl.speedSel), h('div.ctl.row', pl.replay, pl.stepBack, pl.stepFwd), h('div.ctl.grow', h('label.sr-only', 'Scrub'), pl.scrub)),
      out, h('div.sim-meters', mHead.el, mSpeed.el, rHead.el),
      h('p.sim-fine', 'Try the same speed with the helmet on and off. The helmet readings come from a teaching model, not a medical prediction.'));
    helmet.addEventListener('change', () => { helmet.parentNode.querySelector('.switch-text').textContent = helmet.checked ? 'Helmet on' : 'Helmet off'; });
  }

  /* ================= EGG PANEL ================= */
  {
    const cv = mkCanvas('Side view of a toy cart carrying an egg toward a wall.');
    scenes.egg = { c: cv.c, ctx: cv.ctx, draw: drawEgg };
    const pl = player('egg');
    const sheet = h('input', { type: 'checkbox', id: 'sim-sheet', role: 'switch', checked: false });
    const spd = h('input', { type: 'range', id: 'sim-egg-speed', min: '1', max: '4', step: '0.5', value: '3', 'aria-describedby': 'sim-egg-speed-out' });
    const spdOut = h('output#sim-egg-speed-out', { for: 'sim-egg-speed' }, '3 m/s');
    spd.addEventListener('input', () => { spdOut.textContent = spd.value + ' m/s'; });
    const mF = meter('Force on the egg', 'N', 70), mG = meter('Slowing down', 'g', 130);
    const out = h('p.sim-note', { role: 'status', 'aria-live': 'polite' }, 'An egg rides on a toy cart. Try the cart with and without the sheet, then change the speed.');
    const go = h('button.btn', { type: 'button', id: 'sim-egg-go', onclick: runEgg }, 'Roll the cart');
    scenes.egg.onFrame = (run, t) => { const fr = run.frames; const k = t <= 0 ? 0 : Math.min(fr.length - 1, Math.round(t / (fr[fr.length - 1].t * 1000) * (fr.length - 1) * 1)); const f = fr[k]; mF.set(f.forceN); mG.set(f.forceN / P.EGG.massKg / P.G); };
    scenes.egg.peakAt = () => 5;
    function runEgg() {
      const sp = Number(spd.value), sh = sheet.checked;
      const run = P.simulateEgg({ speed: sp, sheet: sh });
      scenes.egg.load(run, Math.round(run.frames[run.frames.length - 1].t * 1000));
      state.seen.egg.add(sh ? 'on' : 'off'); if (state.seen.egg.size >= 2) api.report('egg');
      const m = run.metrics; runN++;
      logRun({ n: runN, test: 'Egg', setting: (sh ? 'Sheet' : 'No sheet') + ', ' + sp + ' m/s', force: f1(m.peakN) + ' N', chest: '—', head: '—', risk: m.cracks ? 'Cracked' : 'Intact' });
      out.textContent = (sh ? 'With the sheet' : 'Without the sheet') + ' at ' + sp + ' m/s: the egg stopped over ' + f1(m.stopCm) + ' cm in about ' + f0(m.tStopMs) + ' ms. Peak force ' + f1(m.peakN) + ' N. The egg ' + (m.cracks ? 'cracked.' : 'stayed whole.');
    }
    const first = P.simulateEgg({ speed: 3, sheet: false }); scenes.egg.run = first; scenes.egg.t = -350; drawEgg(cv.ctx, first, -350);
    panels.egg = h('div.sim-panel', { role: 'tabpanel', id: 'panel-egg', 'aria-labelledby': 'tab-egg', hidden: true },
      h('div.sim-stage', cv.c),
      h('div.sim-controls',
        h('div.ctl', h('label', { for: 'sim-sheet' }, 'Stretchy sheet'), h('label.switch', sheet, h('span.knob'), h('span.switch-text', 'No sheet'))),
        h('div.ctl', h('label', { for: 'sim-egg-speed' }, 'Cart speed'), spd, spdOut),
        h('div.ctl', go)),
      h('div.sim-controls.sub', h('div.ctl', h('label', 'Playback'), pl.speedSel), h('div.ctl.row', pl.replay, pl.stepBack, pl.stepFwd), h('div.ctl.grow', h('label.sr-only', 'Scrub'), pl.scrub)),
      out, h('div.sim-meters', mF.el, mG.el),
      h('p.sim-fine', 'The egg model uses a simple stopping-distance rule and a made-up shell strength, to compare the two setups.'));
    sheet.addEventListener('change', () => { sheet.parentNode.querySelector('.switch-text').textContent = sheet.checked ? 'Sheet on' : 'No sheet'; });
  }

  /* ================= DATA PANEL ================= */
  const dataHost = h('div.sim-panel', { role: 'tabpanel', id: 'panel-data', 'aria-labelledby': 'tab-data', hidden: true });
  panels.data = dataHost;
  let showing = 'national';
  function personIcon(on, key) {
    return svg('svg', { class: 'pic' + (on ? ' on' : ''), viewBox: '0 0 20 28', 'aria-hidden': 'true', focusable: 'false' },
      svg('circle', { cx: 10, cy: 6, r: 4.2 }), svg('path', { d: 'M3 27c0-8 2-13 7-13s7 5 7 13z' }), on ? svg('path', { class: 'belt', d: 'M5 15l11 10' }) : null);
  }
  function grid(group) {
    const pct = P.BELT_USE[group].pct, filled = Math.round(pct);
    const cells = []; for (let i = 0; i < 100; i++) cells.push(personIcon(i < filled, group + i));
    return h('figure.icon-grid', { role: 'group', 'aria-label': P.BELT_USE[group].label + ': ' + pct + ' percent buckle up. About ' + filled + ' of every 100 riders.' },
      h('figcaption', h('strong', P.BELT_USE[group].label), h('span.big', pct + '%'), h('span.muted', 'buckled up (2025, as given in the Day 1 slides). A filled figure with a belt is a rider who buckles; an empty outline is a rider who does not.')),
      h('div.pic-grid', cells));
  }
  function dataView() {
    const mk = (id, label) => h('button.btn.secondary.small', { type: 'button', 'aria-pressed': String(showing === id), onclick: () => { showing = id; if (id === 'both') { state.seen.group.add('national'); state.seen.group.add('young'); } else state.seen.group.add(id); dataView(); } }, label);
    if (showing === 'both') { state.seen.group.add('national'); state.seen.group.add('young'); } else state.seen.group.add(showing);
    if (state.seen.group.size >= 2) api.report('data');
    const body = showing === 'both' ? h('div.grids', grid('national'), grid('young')) : grid(showing);
    dataHost.replaceChildren(
      h('p.sim-intro', 'Out of every 100 front-seat riders, how many buckle up? Look at one group at a time, then look at both together.'),
      h('div.sim-controls', h('div.ctl.row', mk('national', 'All front-seat riders'), mk('young', 'Ages 16 to 24'), mk('both', 'Compare both'))),
      body,
      h('p.sim-fine', 'Source: the Day 1 slides and handout. NHTSA reports 91.3% belt use for front-seat occupants in 2025.'));
  }
  dataView();

  host.replaceChildren(h('div.crash-lab', tablist, panels.car, panels.bike, panels.egg, panels.data, h('div.run-log-wrap', logTable), live));
  void live;
  return { destroy() { state.destroyed = true; Object.values(scenes).forEach((s) => s.raf && cancelAnimationFrame(s.raf)); } };
}
