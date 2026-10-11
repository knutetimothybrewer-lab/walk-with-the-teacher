import { memo } from 'react';
import world from '../../content/shared/riverton-world.json';

/** Procedural, seeded "air photo meets illustrated atlas" detail for the Riverton map. Static: computed once. */
const [, , W, H] = [0, 0, ...world.map.viewBox.slice(2)];

function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

type Style = { angle: number; gap: number; lot: [number, number]; fill: number; trees: number; palette: string[]; big?: boolean; vacant?: number; park: number };
const WARM = ['#d9b9a0', '#cfa88c', '#e4cdb4', '#c79a86', '#d8c3a5'];
const COOL = ['#c5cbd3', '#b7bfca', '#d2d6dc', '#aeb7c2'];
const STYLE: Record<string, Style> = {
  hillcrest: { angle: -8, gap: 46, lot: [20, 15], fill: 0.62, trees: 0.9, palette: WARM, park: 0.18 },
  westbrook: { angle: 6, gap: 36, lot: [16, 12], fill: 0.78, trees: 0.6, palette: WARM, park: 0.08 },
  pinewood: { angle: -18, gap: 54, lot: [20, 14], fill: 0.5, trees: 0.7, palette: WARM, park: 0.1 },
  riverside: { angle: 14, gap: 40, lot: [16, 12], fill: 0.6, trees: 0.8, palette: WARM, park: 0.2 },
  oldtown: { angle: 0, gap: 28, lot: [13, 10], fill: 0.95, trees: 0.25, palette: ['#c9a58f', '#b98f7a', '#d6b9a0', '#a98a7a', '#cdb79d'], park: 0.03 },
  millworks: { angle: 4, gap: 50, lot: [34, 22], fill: 0.7, trees: 0.12, palette: COOL, big: true, park: 0 },
  southfield: { angle: -4, gap: 44, lot: [18, 13], fill: 0.62, trees: 0.35, palette: WARM, park: 0.05 },
  eastside: { angle: 10, gap: 34, lot: [15, 11], fill: 0.62, trees: 0.1, palette: ['#c4aa94', '#b79f8c', '#cdb8a4', '#a8998a'], vacant: 0.24, park: 0.01 },
};

const inPoly = (x: number, y: number, poly: number[][]) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const distToSeg = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => { const dx = bx - ax, dy = by - ay; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)); };
// river as a polyline for keep-out
const RIVER: number[][] = [[560, 230], [592, 280], [598, 330], [590, 380], [580, 410], [584, 450], [600, 500], [630, 540], [660, 575], [700, 610]];
const nearRiver = (x: number, y: number, r: number) => { for (let i = 0; i < RIVER.length - 1; i++) if (distToSeg(x, y, RIVER[i][0], RIVER[i][1], RIVER[i + 1][0], RIVER[i + 1][1]) < r) return true; return false; };
const ARTERIAL = 'M 230 330 L 420 332 L 598 336 L 740 330 L 960 318'; // bridge crosses the river near x=598
const HIGHWAY = 'M 640 20 Q 650 120 700 190 Q 760 260 790 330 Q 820 420 960 470';
const onHighway = (x: number, y: number) => { const pts = [[640, 20], [650, 100], [690, 175], [745, 235], [785, 320], [812, 395], [870, 440], [960, 470]]; for (let i = 0; i < pts.length - 1; i++) if (distToSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < 14) return true; return false; };

interface Bld { x: number; y: number; w: number; h: number; r: number; c: string; roof: string }
interface Tree { x: number; y: number; r: number; c: string }
interface Hood { id: string; roads: string; blds: Bld[]; trees: Tree[]; parks: { x: number; y: number; w: number; h: number }[]; lots: { x: number; y: number; w: number; h: number }[] }

function buildHood(h: (typeof world.neighborhoods)[number], idx: number): Hood {
  const st = STYLE[h.id]; const R = rng(1000 + idx * 77); const poly = h.polygon as number[][];
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const a = (st.angle * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a); const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const toW = (u: number, v: number): [number, number] => [cx + u * ca - v * sa, cy + u * sa + v * ca];
  const span = Math.hypot(x1 - x0, y1 - y0) / 2 + 20; const roads: string[] = [];
  for (let u = -span; u <= span; u += st.gap) { const [ax, ay] = toW(u, -span), [bx, by] = toW(u, span); roads.push(`M${ax.toFixed(0)} ${ay.toFixed(0)}L${bx.toFixed(0)} ${by.toFixed(0)}`); }
  for (let v = -span; v <= span; v += st.gap * 0.9) { const [ax, ay] = toW(-span, v), [bx, by] = toW(span, v); roads.push(`M${ax.toFixed(0)} ${ay.toFixed(0)}L${bx.toFixed(0)} ${by.toFixed(0)}`); }
  const blds: Bld[] = [], trees: Tree[] = [], parks: Hood['parks'] = [], lots: Hood['lots'] = [];
  const g = st.gap, g2 = st.gap * 0.9;
  for (let u = -span; u < span; u += g) for (let v = -span; v < span; v += g2) {
    const [mx, my] = toW(u + g / 2, v + g2 / 2); if (!inPoly(mx, my, poly) || nearRiver(mx, my, 26) || onHighway(mx, my)) continue;
    const roll = R();
    if (roll < st.park) { parks.push({ x: mx - g / 2 + 5, y: my - g2 / 2 + 5, w: g - 10, h: g2 - 10 }); for (let k = 0; k < 6; k++) trees.push({ x: mx + (R() - 0.5) * (g - 14), y: my + (R() - 0.5) * (g2 - 14), r: 4 + R() * 3, c: R() < 0.5 ? '#4f9a58' : '#5aa862' }); continue; }
    if (st.vacant && roll > 1 - st.vacant) { lots.push({ x: mx - g / 2 + 5, y: my - g2 / 2 + 5, w: g - 10, h: g2 - 10 }); continue; }
    if (st.big) { if (R() < st.fill) blds.push({ x: mx, y: my, w: st.lot[0] * (0.8 + R() * 0.6), h: st.lot[1] * (0.8 + R() * 0.5), r: a * 57.3, c: st.palette[Math.floor(R() * st.palette.length)], roof: '#9aa5b1' }); continue; }
    const nx = Math.max(1, Math.round((g - 8) / (st.lot[0] + 4))), ny = Math.max(1, Math.round((g2 - 8) / (st.lot[1] + 6)));
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      if (R() > st.fill) continue;
      const lu = u + 4 + (i + 0.5) * ((g - 8) / nx), lv = v + 5 + (j + 0.5) * ((g2 - 10) / ny); const [bx, by] = toW(lu, lv); if (!inPoly(bx, by, poly) || nearRiver(bx, by, 22) || onHighway(bx, by)) continue;
      const wv = st.lot[0] * (0.75 + R() * 0.35), hv = st.lot[1] * (0.75 + R() * 0.3);
      blds.push({ x: bx, y: by, w: wv, h: hv, r: st.angle, c: st.palette[Math.floor(R() * st.palette.length)], roof: R() < 0.5 ? '#b5654b' : '#8a7f78' });
      if (R() < st.trees * 0.55) { const [tx, ty] = toW(lu + (R() - 0.5) * 8, lv + hv * 0.9 + 3); trees.push({ x: tx, y: ty, r: 3.2 + R() * 3, c: R() < 0.5 ? '#4f9a58' : '#5aa862' }); }
    }
  }
  return { id: h.id, roads: roads.join(''), blds, trees, parks, lots };
}

const HOODS = world.neighborhoods.map(buildHood);
// shore trees along the river
const SHORE: Tree[] = (() => { const R = rng(4242); const out: Tree[] = []; for (let i = 0; i < RIVER.length - 1; i++) for (let k = 0; k < 6; k++) { const t = k / 6; const x = RIVER[i][0] + (RIVER[i + 1][0] - RIVER[i][0]) * t, y = RIVER[i][1] + (RIVER[i + 1][1] - RIVER[i][1]) * t; const side = R() < 0.5 ? -1 : 1; out.push({ x: x + side * (22 + R() * 14), y: y + (R() - 0.5) * 12, r: 4 + R() * 4, c: R() < 0.5 ? '#3f8a52' : '#4f9a58' }); } return out; })();

export const TerrainDefs = memo(function TerrainDefs() {
  return (
    <defs>
      <linearGradient id="rv-land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#dde6c8" /><stop offset="1" stopColor="#cfdcb4" /></linearGradient>
      <filter id="rv-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" /><feColorMatrix values="0 0 0 0 .25  0 0 0 0 .3  0 0 0 0 .2  0 0 0 .22 0" /></filter>
      <filter id="rv-soft"><feGaussianBlur stdDeviation="9" /></filter>
      <filter id="rv-shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4" /></filter>
      {world.neighborhoods.map((h) => <clipPath key={h.id} id={`rv-clip-${h.id}`}><polygon points={h.polygon.map((p) => p.join(',')).join(' ')} /></clipPath>)}
    </defs>
  );
});

export const TerrainBase = memo(function TerrainBase() {
  return (<g><rect width={W} height={H} fill="url(#rv-land)" /><rect width={W} height={H} filter="url(#rv-grain)" opacity=".9" /></g>);
});

/** Per-neighborhood ground detail: streets, parks, vacant lots, house footprints and trees. */
export const HoodGround = memo(function HoodGround({ id }: { id: string }) {
  const h = HOODS.find((x) => x.id === id)!; const st = STYLE[id];
  return (
    <g clipPath={`url(#rv-clip-${id})`} pointerEvents="none">
      <path d={h.roads} stroke="#b9ae98" strokeWidth="6.2" fill="none" opacity=".75" />
      <path d={h.roads} stroke="#fffaf0" strokeWidth="4.4" fill="none" />
      {h.parks.map((p, i) => <g key={'p' + i}><rect x={p.x} y={p.y} width={p.w} height={p.h} rx="8" fill="#9fcf8a" /><rect x={p.x + 3} y={p.y + 3} width={p.w - 6} height={p.h - 6} rx="6" fill="#b3dc9c" opacity=".8" /></g>)}
      {h.lots.map((p, i) => <g key={'l' + i}><rect x={p.x} y={p.y} width={p.w} height={p.h} rx="3" fill="#cdbf9e" opacity=".85" /><path d={`M${p.x} ${p.y}l${p.w} ${p.h}M${p.x + p.w} ${p.y}l${-p.w} ${p.h}`} stroke="#b8a982" strokeWidth="1" opacity=".6" /></g>)}
      {h.blds.map((b, i) => (
        <g key={i} transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.r.toFixed(1)})`}>
          <rect x={-b.w / 2 + 2} y={-b.h / 2 + 2.5} width={b.w} height={b.h} rx="1.5" fill="#2b2118" opacity=".22" filter="url(#rv-shadow)" />
          <rect x={-b.w / 2} y={-b.h / 2} width={b.w} height={b.h} rx="1.5" fill={b.c} stroke="#6b5a4c" strokeOpacity=".35" strokeWidth=".7" />
          {st.big ? <path d={`M${-b.w / 2 + 2} ${-b.h / 4}H${b.w / 2 - 2}M${-b.w / 2 + 2} ${b.h / 4}H${b.w / 2 - 2}`} stroke="#8d97a3" strokeWidth="1" opacity=".7" /> : <path d={`M${-b.w / 2} ${-b.h / 2}L0 ${-b.h * 0.05}L${b.w / 2} ${-b.h / 2}Z`} fill={b.roof} opacity=".55" />}
        </g>))}
      {h.trees.map((t, i) => (<g key={'t' + i}><circle cx={t.x + 1.5} cy={t.y + 2.2} r={t.r} fill="#1c2b1c" opacity=".25" /><circle cx={t.x} cy={t.y} r={t.r} fill={t.c} /><circle cx={t.x - t.r * 0.3} cy={t.y - t.r * 0.3} r={t.r * 0.45} fill="#9ad08a" opacity=".55" /></g>))}
    </g>
  );
});

export const Waterways = memo(function Waterways({ animate }: { animate: boolean }) {
  const d = world.map.river;
  return (
    <g pointerEvents="none">
      {SHORE.map((t, i) => <g key={i}><circle cx={t.x + 1.5} cy={t.y + 2} r={t.r} fill="#1c2b1c" opacity=".22" /><circle cx={t.x} cy={t.y} r={t.r} fill={t.c} /><circle cx={t.x - t.r * 0.3} cy={t.y - t.r * 0.3} r={t.r * 0.45} fill="#a0d492" opacity=".5" /></g>)}
      <path d={d} fill="none" stroke="#d9cfa8" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
      <path d={d} fill="none" stroke="#4a9fd6" strokeWidth="26" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#6fbbe8" strokeWidth="19" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#d6eefb" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3 16" opacity=".85">{animate && <animate attributeName="stroke-dashoffset" from="38" to="0" dur="2.2s" repeatCount="indefinite" />}</path>
      <path d={d} fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 30" opacity=".7" transform="translate(4 -3)">{animate && <animate attributeName="stroke-dashoffset" from="64" to="0" dur="3.6s" repeatCount="indefinite" />}</path>
    </g>
  );
});

export const Roads = memo(function Roads({ animate }: { animate: boolean }) {
  const cars: { path: string; dur: number; begin: number; c: string }[] = [
    { path: ARTERIAL, dur: 16, begin: 0, c: '#e1604a' }, { path: ARTERIAL, dur: 22, begin: 6, c: '#3b6fc4' }, { path: HIGHWAY, dur: 14, begin: 2, c: '#f2a93b' }, { path: HIGHWAY, dur: 17, begin: 9, c: '#6b7a86' }, { path: HIGHWAY, dur: 20, begin: 4, c: '#e9eef2' },
  ];
  return (
    <g pointerEvents="none">
      <path d={HIGHWAY} fill="none" stroke="#7b7568" strokeWidth="17" strokeLinecap="round" opacity=".85" />
      <path d={HIGHWAY} fill="none" stroke="#585a5e" strokeWidth="13" strokeLinecap="round" />
      <path d={HIGHWAY} fill="none" stroke="#f3dd8a" strokeWidth="1.6" strokeDasharray="9 8" />
      <path d={ARTERIAL} fill="none" stroke="#b9ae98" strokeWidth="11" strokeLinecap="round" />
      <path d={ARTERIAL} fill="none" stroke="#fffaf0" strokeWidth="8" strokeLinecap="round" />
      <rect x="580" y="324" width="36" height="24" rx="3" fill="#cfc6b0" stroke="#8d846f" strokeWidth="1.4" />
      <path d="M580 330H616M580 342H616" stroke="#fffaf0" strokeWidth="2" />
      {animate && cars.map((c, i) => (<g key={i}><rect x="-5" y="-2.6" width="10" height="5.2" rx="2" fill={c.c} stroke="#00000040" strokeWidth=".6" /><animateMotion path={c.path} dur={`${c.dur}s`} begin={`${c.begin}s`} repeatCount="indefinite" rotate="auto" /></g>))}
    </g>
  );
});

export const Sky = memo(function Sky({ animate }: { animate: boolean }) {
  if (!animate) return null;
  const clouds = [{ y: 90, dur: 70, s: 1 }, { y: 330, dur: 95, s: 1.3 }, { y: 520, dur: 80, s: 0.9 }];
  return (
    <g pointerEvents="none" className="rv-sky">
      {clouds.map((c, i) => (
        <g key={i}>
          <g opacity=".5" filter="url(#rv-soft)"><ellipse cx="0" cy="26" rx={70 * c.s} ry={20 * c.s} fill="#1d2b3a" opacity=".25" /><animateTransform attributeName="transform" type="translate" from={`-160 ${c.y}`} to={`1160 ${c.y}`} dur={`${c.dur}s`} begin={`${-i * 25}s`} repeatCount="indefinite" /></g>
          <g opacity=".55" filter="url(#rv-soft)"><ellipse cx="0" cy="0" rx={70 * c.s} ry={20 * c.s} fill="#fff" /><ellipse cx={34 * c.s} cy={-10 * c.s} rx={44 * c.s} ry={18 * c.s} fill="#fff" /><animateTransform attributeName="transform" type="translate" from={`-160 ${c.y - 24}`} to={`1160 ${c.y - 24}`} dur={`${c.dur}s`} begin={`${-i * 25}s`} repeatCount="indefinite" /></g>
        </g>))}
    </g>
  );
});
