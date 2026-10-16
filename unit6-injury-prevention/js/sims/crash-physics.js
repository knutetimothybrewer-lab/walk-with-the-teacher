// Crash-lab physics. Pure functions, no DOM, so the same code is used by the page and by the tests.
//
// This is an ILLUSTRATIVE position-based model of a crash-test dummy (7 body points joined by rigid and limited links),
// not a medical or engineering prediction. Units: metres, kilograms, seconds. x points forward (toward the barrier), y up.
// The car scene is solved in the car's own frame with a "fictitious" forward push equal to the car's deceleration.
// Belt force limiters, contact "crush distances" and masses are rough textbook-scale values chosen so the numbers are plausible
// and move in the right direction when speed, belt or helmet change. Airbags and other systems are deliberately left out.

export const G = 9.81;
export const MPH = 0.44704;
const DT = 0.0005;          // solver step (0.5 ms)
const SAMPLE = 0.001;       // one stored frame per millisecond
const SMOOTH = 6;           // 6 steps x 0.5 ms = 3 ms averaging window (like the 3 ms clip used for crash-test chest readings)

export const BODY = ['H', 'N', 'P', 'K', 'A', 'E', 'W'];
const MASS = { H: 5, N: 32, P: 28, K: 9, A: 4, E: 2, W: 1 };
const TOTAL_MASS = BODY.reduce((a, k) => a + MASS[k], 0);

/* ---------------------------------------------------------------------------------------------- tiny vector helpers */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (a) => Math.hypot(a[0], a[1]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];

/* ---------------------------------------------------------------------------------------------- generic engine */
function makeWorld(def) {
  const names = Object.keys(def.points);
  const idx = {}; names.forEach((n, i) => { idx[n] = i; });
  const n = names.length;
  const px = new Float64Array(n), py = new Float64Array(n), vx = new Float64Array(n), vy = new Float64Array(n);
  const m = new Float64Array(n), r = new Float64Array(n);
  names.forEach((nm, i) => {
    const p = def.points[nm];
    px[i] = p.x; py[i] = p.y; vx[i] = p.vx || 0; vy[i] = p.vy || 0; m[i] = p.m; r[i] = p.r || 0.05;
  });
  return { names, idx, n, px, py, vx, vy, m, r, def, t: 0, broken: {}, contactV0: {}, hist: names.map(() => []) };
}

function segClosest(ax, ay, bx, by, qx, qy) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((qx - ax) * dx + (qy - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return [ax + t * dx, ay + t * dy];
}

/**
 * Advance one solver step. `fict` is the fictitious acceleration in x (the car's deceleration seen from inside the car).
 * Returns per-point inertial acceleration (m/s^2), used for the force readings.
 */
function step(w, fict) {
  const { n, px, py, vx, vy, m, r, def } = w, I = w.idx;
  w.cf = {};
  const ax = new Float64Array(n), ay = new Float64Array(n);
  for (let i = 0; i < n; i++) { ay[i] = -G; ax[i] = fict; }

  // belts (one-sided springs with a force limiter) and other tension elements
  const tens = {};
  (def.belts || []).forEach((b) => {
    if (w.broken[b.id]) { tens[b.id] = 0; return; }
    const i = I[b.to];
    const dx = px[i] - b.anchor[0], dy = py[i] - b.anchor[1], d = Math.hypot(dx, dy) || 1e-9;
    const ext = d - b.len;
    let f = 0;
    if (ext > 0) {
      const vrad = ((vx[i]) * dx + (vy[i]) * dy) / d;
      f = Math.min(b.max, b.k * ext + (vrad > 0 ? b.c * vrad : 0));
      ax[i] -= f * dx / d / m[i]; ay[i] -= f * dy / d / m[i];
    }
    tens[b.id] = f;
    if (b.breakAt && f >= b.breakAt) w.broken[b.id] = true;
  });
  // element pairs with slack (rider's hands and seat contact on the bike): one-sided pulls that can let go
  (def.ties || []).forEach((tz) => {
    if (w.broken[tz.id]) return;
    const i = I[tz.a], j = I[tz.b];
    const dx = px[i] - px[j], dy = py[i] - py[j], d = Math.hypot(dx, dy) || 1e-9, ext = d - tz.len;
    if (ext > 0) {
      const f = Math.min(tz.max, tz.k * ext);
      const fx = f * dx / d, fy = f * dy / d;
      ax[i] -= fx / m[i]; ay[i] -= fy / m[i]; ax[j] += fx / m[j]; ay[j] += fy / m[j];
      if (tz.breakAt && f >= tz.breakAt) w.broken[tz.id] = true;
    }
  });

  // velocity update
  const ovx = new Float64Array(vx), ovy = new Float64Array(vy);
  for (let i = 0; i < n; i++) { vx[i] += ax[i] * DT; vy[i] += ay[i] * DT; }

  // contacts: "crush distance" model. On first touch remember the closing speed v0; decelerate so that the point stops in `crush` metres.
  (def.obstacles || []).forEach((ob, oi) => {
    ob.applies.forEach((nm) => {
      const i = I[nm]; if (i == null) return;
      const rad = (ob.radius && ob.radius[nm]) || r[i];
      const c = typeof ob.crush === 'object' ? (ob.crush[nm] != null ? ob.crush[nm] : ob.crush.default) : ob.crush;
      const cp = segClosest(ob.a[0], ob.a[1], ob.b[0], ob.b[1], px[i], py[i]);
      let nx = px[i] - cp[0], ny = py[i] - cp[1], dist = Math.hypot(nx, ny);
      let nrm;
      if (dist < 1e-9 || ob.flat) nrm = ob.n; else nrm = [nx / dist, ny / dist];
      if (ob.flat) dist = (px[i] - cp[0]) * nrm[0] + (py[i] - cp[1]) * nrm[1];
      const pen = rad - dist;
      const key = oi + ':' + nm;
      if (pen > -1e-3 && !(ob.flat && dist < -c - rad)) {
        const vn = vx[i] * nrm[0] + vy[i] * nrm[1];
        if (vn < 0) {
          if (w.contactV0[key] == null) w.contactV0[key] = -vn;
          const v0 = w.contactV0[key];
          const dec = Math.min(-vn, (v0 * v0) / (2 * Math.max(c, 1e-4)) * DT + 0.0);
          vx[i] += nrm[0] * dec; vy[i] += nrm[1] * dec;
          if (!ob.support) { w.cf = w.cf || {}; w.cf[nm] = (w.cf[nm] || 0) + m[i] * dec / DT; }
          // friction along the surface
          const tx = -nrm[1], ty = nrm[0], vt = vx[i] * tx + vy[i] * ty;
          const fr = Math.min(Math.abs(vt), (ob.mu || 0.3) * (dec / DT + G) * DT) * Math.sign(vt);
          vx[i] -= tx * fr; vy[i] -= ty * fr;
        }
        // keep it from sinking further than the crush distance
        if (pen > c) { px[i] += nrm[0] * (pen - c); py[i] += nrm[1] * (pen - c); }
        w.touched = w.touched || {}; w.touched[nm] = true; (w.events = w.events || []).push({ t: w.t, nm, oi, v0: w.contactV0[key] });
      } else if (pen < -0.02) delete w.contactV0[key];
    });
  });

  // predict positions
  const x0 = new Float64Array(px), y0 = new Float64Array(py);
  for (let i = 0; i < n; i++) { px[i] += vx[i] * DT; py[i] += vy[i] * DT; }

  // pins (e.g. a wheel against a curb) are handled by obstacles; distance constraints next
  for (let it = 0; it < 10; it++) {
    (def.links || []).forEach((L) => {
      const i = I[L.a], j = I[L.b];
      const dx = px[i] - px[j], dy = py[i] - py[j], d = Math.hypot(dx, dy) || 1e-9;
      let target = null;
      if (L.len != null) target = L.len; // rigid
      else if (d < L.min) target = L.min; else if (d > L.max) target = L.max;
      if (target == null) return;
      const wi = 1 / m[i], wj = 1 / m[j], diff = (d - target) / (d * (wi + wj));
      px[i] -= wi * diff * dx; py[i] -= wi * diff * dy; px[j] += wj * diff * dx; py[j] += wj * diff * dy;
    });
  }
  // one-sided shape holds (knee must stay in front of the hip-to-foot line, etc.) are expressed as extra min links by the caller

  // velocities from corrected positions, light damping so joints settle
  const out = { ax: new Float64Array(n), ay: new Float64Array(n) };
  for (let i = 0; i < n; i++) {
    vx[i] = (px[i] - x0[i]) / DT * 0.9997; vy[i] = (py[i] - y0[i]) / DT * 0.9997;
    out.ax[i] = (vx[i] - ovx[i]) / DT; out.ay[i] = (vy[i] - ovy[i]) / DT;
  }
  w.t += DT;
  w.tens = tens;
  return out;
}

function smoothPush(buf, v) { buf.push(v); if (buf.length > SMOOTH) buf.shift(); return buf.reduce((a, b) => a + b, 0) / buf.length; }

/* ---------------------------------------------------------------------------------------------- injury model (illustrative) */
export const risk = {
  // logistic risk curves of peak 3 ms acceleration; centres/widths are rough, chosen for a teaching model, not clinical use
  head(g) { return 1 / (1 + Math.exp(-(g - 150) / 40)); },
  chest(g) { return 1 / (1 + Math.exp(-(g - 55) / 9)); }
};
export function riskLabel(p) { return p < 0.1 ? 'Low' : p < 0.4 ? 'Moderate' : p < 0.75 ? 'High' : 'Severe'; }

/* ---------------------------------------------------------------------------------------------- scene: car */
const CAR = { seatX: -0.30 };

export function carDefinition(belted) {
  const pt = (x, y, k, r, vx) => ({ x, y, m: MASS[k], r, vx: vx || 0, vy: 0 });
  const P0 = [-0.30, 0.52], N0 = [-0.40, 1.01], H0 = [-0.43, 1.25];
  const K0 = [P0[0] + 0.45 * 0.994, P0[1] + 0.45 * 0.11];
  const A0 = [K0[0] + 0.45 * 0.1, K0[1] - 0.45 * 0.995];
  const E0 = [N0[0] + 0.30 * 0.35, N0[1] - 0.30 * 0.94];
  const W0 = [E0[0] + 0.28 * 0.85, E0[1] + 0.28 * 0.5];
  const D = [-0.58, 1.38], Bk = [-0.52, 0.43];
  const wheel = { a: [0.13, 0.72], b: [0.25, 1.04] };
  const wl = len(sub(wheel.b, wheel.a)); const wn = [-(wheel.b[1] - wheel.a[1]) / wl, (wheel.b[0] - wheel.a[0]) / wl]; // points back toward the driver? fix sign below
  if (wn[0] > 0) { wn[0] = -wn[0]; wn[1] = -wn[1]; }
  const ws = [0.62, 0.90], we = [0.10, 1.47]; const wsl = len(sub(we, ws));
  const wsn = [-(we[1] - ws[1]) / wsl, (we[0] - ws[0]) / wsl]; if (wsn[0] > 0) { wsn[0] = -wsn[0]; wsn[1] = -wsn[1]; }
  const sb = { a: [-0.52, 0.40], b: [-0.66, 1.35] }; const sbl = len(sub(sb.b, sb.a));
  const sbn = [(sb.b[1] - sb.a[1]) / sbl, -(sb.b[0] - sb.a[0]) / sbl]; if (sbn[0] < 0) { sbn[0] = -sbn[0]; sbn[1] = -sbn[1]; }
  const def = {
    points: {
      H: pt(H0[0], H0[1], 'H', 0.10), N: pt(N0[0], N0[1], 'N', 0.12), P: pt(P0[0], P0[1], 'P', 0.12), K: pt(K0[0], K0[1], 'K', 0.08),
      A: pt(A0[0], A0[1], 'A', 0.07), E: pt(E0[0], E0[1], 'E', 0.05), W: pt(W0[0], W0[1], 'W', 0.05)
    },
    links: [
      { a: 'N', b: 'P', len: len(sub(N0, P0)) }, { a: 'H', b: 'N', len: len(sub(H0, N0)) },
      { a: 'H', b: 'P', min: 0.66, max: len(sub(H0, P0)) }, // neck can nod a little, cannot stretch
      { a: 'K', b: 'P', len: len(sub(K0, P0)) }, { a: 'A', b: 'K', len: len(sub(A0, K0)) },
      { a: 'A', b: 'P', min: 0.32, max: 0.9 }, { a: 'K', b: 'N', min: 0.44, max: 2 },
      { a: 'E', b: 'N', len: len(sub(E0, N0)) }, { a: 'W', b: 'E', len: len(sub(W0, E0)) }
    ],
    obstacles: [
      { a: [-1, 0], b: [1.2, 0], n: [0, 1], flat: true, crush: 0.02, applies: BODY, mu: 0.8, support: true },                                   // floor
      { a: [-0.55, 0.40], b: [0.10, 0.40], n: [0, 1], crush: 0.03, applies: ['P', 'K'], mu: 0.35, support: true },                            // seat cushion
      { a: sb.a, b: sb.b, n: sbn, crush: 0.04, applies: ['H', 'N', 'P', 'E'], mu: 0.5 },                                       // seat back and head restraint
      { a: [0.56, 0.2], b: [0.56, 0.86], n: [-1, 0], flat: true, crush: { default: 0.05, K: 0.04, A: 0.03 }, applies: ['K', 'A', 'W', 'E', 'P'], mu: 0.3 }, // knee panel
      { a: ws, b: we, n: wsn, crush: { default: 0.04, H: 0.03 }, applies: ['H', 'N', 'E', 'W'], mu: 0.3 },                      // windshield
      { a: wheel.a, b: wheel.b, n: wn, crush: { default: 0.07, H: 0.06 }, applies: ['N', 'H', 'E', 'W'], mu: 0.3 },             // steering wheel (no airbag modelled)
      { a: [-0.7, 1.55], b: [0.12, 1.55], n: [0, -1], flat: true, crush: 0.05, applies: ['H'], mu: 0.3 }                       // roof
    ],
    belts: belted ? [
      { id: 'shoulder', anchor: [-0.66, 1.0], to: 'N', len: len(sub(N0, [-0.66, 1.0])) + 0.03, k: 110000, c: 900, max: 9500 },
      { id: 'lap', anchor: Bk, to: 'P', len: len(sub(P0, Bk)) + 0.03, k: 140000, c: 1100, max: 12000 }
    ] : [],
    ties: [],
    geometry: { wheel, windshield: { a: ws, b: we }, seatBack: sb, belt: { D, Bk } }
  };
  return def;
}

/** Car crash. mph: 10 to 70. Returns the frames and the readings. */
export function simulateCar({ mph, belted }) {
  const v0 = mph * MPH;
  const crush = 0.45 + 0.008 * mph;              // metres of crumple in front of the cabin
  const aCar = (v0 * v0) / (2 * crush);           // constant deceleration of the car
  const tStop = v0 / aCar;
  const w = makeWorld(carDefinition(belted));
  const frames = [];
  const smooth = { chest: [], head: [], body: [] };
  let peak = { chest: 0, head: 0, body: 0, belt: 0, headSpeed: 0, headHit: false };
  const readings = [];
  const T = Math.max(0.3, tStop + 0.2);
  const steps = Math.round(T / DT), every = Math.round(SAMPLE / DT);
  let headTouchedOnce = false;
  const hv = []; // head velocity history (inertial) for a 10 ms acceleration window
  for (let s = 0; s <= steps; s++) {
    const t = s * DT;
    const fict = t < tStop ? aCar : 0;
    const prevHeadSpeed = Math.hypot(w.vx[w.idx.H], w.vy[w.idx.H]);
    w.touched = {};
    step(w, fict);
    const carAx = t < tStop ? -aCar : 0;
    void carAx;
    const cf = w.cf || {}, tens = w.tens || {};
    const shoulder = tens.shoulder || 0, lap = tens.lap || 0;
    // clean force signals: belt tensions and contact forces (no differentiation of noisy positions)
    const chestN = shoulder + (cf.N || 0) + 0.5 * ((cf.E || 0) + (cf.W || 0));
    const headC = cf.H || 0;
    const bodyN = shoulder + lap + BODY.reduce((a, k) => a + (k === 'A' ? 0 : (cf[k] || 0)), 0);
    // head with no contact: neck load from the head's own acceleration over 10 ms
    hv.push([w.vx[w.idx.H] - (t < tStop ? 0 : 0), w.vy[w.idx.H]]); if (hv.length > 21) hv.shift();
    let whip = 0;
    if (hv.length > 20) { const ax = (hv[20][0] - hv[0][0]) / (20 * DT) - carAx, ay = (hv[20][1] - hv[0][1]) / (20 * DT); whip = Math.hypot(ax, ay) / G; }
    const chestG = (shoulder / 25 + ((cf.N || 0) + 0.5 * ((cf.E || 0) + (cf.W || 0))) / MASS.N) / G, headG = Math.max(headC / MASS.H / G, Math.min(whip, 80)), bodyG = bodyN / TOTAL_MASS / G;
    const cG = smoothPush(smooth.chest, chestG), hG = smoothPush(smooth.head, headG), bG = smoothPush(smooth.body, bodyG);
    if (cG > peak.chest) peak.chest = cG; if (hG > peak.head) peak.head = hG; if (bG > peak.body) peak.body = bG;
    const beltF = shoulder + lap;
    if (beltF > peak.belt) peak.belt = beltF;
    if (headC > 0 && !headTouchedOnce) { headTouchedOnce = true; peak.headHit = true; peak.headSpeed = prevHeadSpeed; }
    if (s % every === 0) {
      const f = { t, car: carShift(t, v0, aCar, tStop), pts: {}, chestG: cG, headG: hG, bodyG: bG, force: bG * G * TOTAL_MASS / 1000, belt: beltF / 1000, headHit: peak.headHit, peakChest: peak.chest, peakHead: peak.head, peakBelt: peak.belt / 1000 };
      BODY.forEach((k) => { const i = w.idx[k]; f.pts[k] = [w.px[i], w.py[i]]; });
      frames.push(f);
    }
  }
  const metrics = {
    mph, belted, crush, aCarG: aCar / G, stopMs: Math.round(tStop * 1000),
    peakChestG: peak.chest, peakHeadG: peak.head, peakBodyG: peak.body, peakForceKN: peak.body * G * TOTAL_MASS / 1000,
    peakBeltKN: peak.belt / 1000, headStruck: peak.headHit, headSpeedMph: peak.headSpeed / MPH,
    headRisk: risk.head(peak.head), chestRisk: risk.chest(peak.chest)
  };
  void readings;
  return { frames, metrics, geometry: w.def.geometry, tStop, crush, v0 };
}
// displacement of the car after the moment of impact (negative before it), in metres
export function carShift(t, v0, a, tStop) {
  if (t <= 0) return v0 * t;
  if (t < tStop) return v0 * t - 0.5 * a * t * t;
  return v0 * tStop - 0.5 * a * tStop * tStop;
}

/* ---------------------------------------------------------------------------------------------- scene: bicycle */
export function bikeDefinition(helmet) {
  const pt = (x, y, k, r, vx) => ({ x, y, m: MASS[k], r, vx, vy: 0 });
  const P0 = [-1.0, 1.10], N0 = [P0[0] + 0.5 * Math.sin(0.42), P0[1] + 0.5 * Math.cos(0.42)];
  const H0 = [N0[0] + 0.24 * 0.34, N0[1] + 0.24 * 0.94];
  const K0 = [P0[0] + 0.45 * 0.62, P0[1] - 0.45 * 0.78];
  const A0 = [K0[0] - 0.045, K0[1] - 0.448];
  const E0 = [N0[0] + 0.30 * 0.55, N0[1] - 0.30 * 0.83];
  const W0 = [E0[0] + 0.28 * 0.45, E0[1] - 0.28 * 0.89];
  return { P0, N0, H0, K0, A0, E0, W0, helmet };
}

export function simulateBike({ mph, helmet }) {
  const v0 = mph * MPH;
  const b = bikeDefinition(helmet);
  const mb = 3; // light bike points; a bike weighs about 12 kg in total
  const pts = {
    H: { x: b.H0[0], y: b.H0[1], m: MASS.H, r: 0.10, vx: v0, vy: 0 }, N: { x: b.N0[0], y: b.N0[1], m: MASS.N, r: 0.12, vx: v0, vy: 0 },
    P: { x: b.P0[0], y: b.P0[1], m: MASS.P, r: 0.12, vx: v0, vy: 0 }, K: { x: b.K0[0], y: b.K0[1], m: MASS.K, r: 0.08, vx: v0, vy: 0 },
    A: { x: b.A0[0], y: b.A0[1], m: MASS.A, r: 0.07, vx: v0, vy: 0 }, E: { x: b.E0[0], y: b.E0[1], m: MASS.E, r: 0.05, vx: v0, vy: 0 },
    W: { x: b.W0[0], y: b.W0[1], m: MASS.W, r: 0.05, vx: v0, vy: 0 },
    F: { x: -0.34, y: 0.34, m: 4, r: 0.34, vx: v0, vy: 0 }, R: { x: -1.34, y: 0.34, m: 4, r: 0.34, vx: v0, vy: 0 },
    S: { x: -1.05, y: 0.95, m: mb, r: 0.05, vx: v0, vy: 0 }, B: { x: -0.51, y: 1.04, m: mb, r: 0.05, vx: v0, vy: 0 }
  };
  const L = (a, bb) => len(sub([pts[a].x, pts[a].y], [pts[bb].x, pts[bb].y]));
  const def = {
    points: pts,
    links: [
      { a: 'N', b: 'P', len: L('N', 'P') }, { a: 'H', b: 'N', len: L('H', 'N') }, { a: 'H', b: 'P', min: 0.6, max: L('H', 'P') },
      { a: 'K', b: 'P', len: L('K', 'P') }, { a: 'A', b: 'K', len: L('A', 'K') }, { a: 'A', b: 'P', min: 0.32, max: 0.9 }, { a: 'K', b: 'N', min: 0.44, max: 2 },
      { a: 'E', b: 'N', len: L('E', 'N') }, { a: 'W', b: 'E', len: L('W', 'E') },
      // the bicycle frame is rigid
      { a: 'F', b: 'R', len: L('F', 'R') }, { a: 'F', b: 'B', len: L('F', 'B') }, { a: 'S', b: 'R', len: L('S', 'R') }, { a: 'S', b: 'B', len: L('S', 'B') },
      { a: 'S', b: 'F', len: L('S', 'F') }, { a: 'R', b: 'B', len: L('R', 'B') },
      // feet stay on the pedals
      { a: 'A', b: 'R', min: 0.2, max: 1.5 }
    ],
    ties: [
      { id: 'seat', a: 'P', b: 'S', len: 0.17, k: 60000, max: 4000, breakAt: 3500 },
      { id: 'hands', a: 'W', b: 'B', len: 0.03, k: 40000, max: 1800, breakAt: 1500 }
    ],
    belts: [],
    obstacles: [
      { a: [-3, 0], b: [4, 0], n: [0, 1], flat: true, crush: 0.02, applies: ['F', 'R', 'P', 'K', 'A', 'N', 'E', 'W', 'S', 'B'], mu: 0.6 },
      { a: [-3, 0], b: [4, 0], n: [0, 1], flat: true, crush: helmet ? 0.026 : 0.007, applies: ['H'], mu: 0.5, radius: { H: helmet ? 0.10 : 0.10 } },
      { a: [0, 0.0], b: [0, 0.7], n: [-1, 0], flat: true, crush: 0.05, applies: ['F'], mu: 0.2 }
    ],
    geometry: {}
  };
  const w = makeWorld(def);
  // a bicycle keeps its speed until the front wheel stops, so everything starts at v0 (already set)
  const frames = [], smooth = { head: [] };
  const peak = { head: 0, headSpeed: 0, hit: false, hitT: null };
  const T = 1.4, steps = Math.round(T / DT), every = Math.round(SAMPLE / DT);
  for (let s = 0; s <= steps; s++) {
    const t = s * DT; w.touched = {};
    step(w, 0);
    const hc = ((w.cf && w.cf.H) || 0) / MASS.H / G;
    const hG = smoothPush(smooth.head, hc);
    const vn = w.contactV0['1:H'] || 0;
    if (vn > peak.headSpeed) peak.headSpeed = vn;
    if (hG > peak.head) { peak.head = hG; }
    if (hc > 0 && !peak.hit) { peak.hit = true; peak.hitT = t; }
    if (s % every === 0) {
      const f = { t, pts: {}, headG: hG, peakHead: peak.head, headHit: peak.hit, hands: !w.broken.hands, seat: !w.broken.seat };
      Object.keys(pts).forEach((k) => { const i = w.idx[k]; f.pts[k] = [w.px[i], w.py[i]]; });
      frames.push(f);
    }
  }
  // Readings: the tumble above drives the animation; the head readings come from a clean drop-and-slide estimate so they rise smoothly with speed.
  // The faster the rider, the further the body falls before the head lands, and the more of the forward speed is still there at touchdown.
  const hEff = 0.15 + 1.4 * Math.min(1, mph / 25);
  const vDown = Math.sqrt(2 * G * hEff), vSide = 0.55 * v0;
  const vHead = Math.hypot(vDown, vSide);
  const crush = helmet ? 0.020 : 0.007;
  const headG = (vHead * vHead) / (2 * crush) / G;
  if (peak.hitT == null) { let best = frames[0]; frames.forEach((f) => { if (f.pts.H[1] < best.pts.H[1]) best = f; }); peak.hitT = best.t; peak.hit = true; }
  frames.forEach((f) => { // meters follow the animation: quiet until the head lands, a short spike, then the peak is held
    const dt = f.t - peak.hitT;
    f.headHit = dt >= 0; f.peakHead = dt >= 0.004 ? headG : (dt >= 0 ? headG * (dt / 0.004) : 0);
    f.headG = dt >= 0 && dt < 0.02 ? headG * Math.exp(-Math.pow((dt - 0.006) / 0.005, 2)) : 0;
  });
  const metrics = { mph, helmet, peakHeadG: headG, headStruck: true, headSpeedMph: vHead / MPH, headRisk: risk.head(headG), hitMs: peak.hit ? Math.round(peak.hitT * 1000) : null };
  return { frames, metrics, v0 };
}

/* ---------------------------------------------------------------------------------------------- egg test */
export const EGG = { massKg: 0.058, shellBreakN: 25 };
export function simulateEgg({ speed, sheet }) {
  // speed in m/s. The egg rides a cart that hits a wall. Without the sheet it meets the hard front rail in about 8 mm;
  // with the sheet it is slowed by a stretching cloth over about 30 cm.
  const stop = sheet ? 0.30 : 0.008;
  const a = (speed * speed) / (2 * stop);
  const tStop = speed / a;
  const peakN = EGG.massKg * a;
  const frames = [];
  const T = tStop + 0.1; const n = 120;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * T;
    const dist = t < tStop ? speed * t - 0.5 * a * t * t : stop;
    const f = t < tStop ? EGG.massKg * a : 0;
    frames.push({ t, dist, forceN: f });
  }
  return { frames, metrics: { speed, sheet, stopCm: stop * 100, peakG: a / G, peakN, tStopMs: tStop * 1000, cracks: peakN >= EGG.shellBreakN }, tStop };
}

/* ---------------------------------------------------------------------------------------------- data explorer facts (as given in the Day 1 slides/handout) */
export const BELT_USE = { national: { label: 'All front-seat occupants', pct: 91.3 }, young: { label: 'Ages 16 to 24', pct: 87 } };
