// Decorative mission environments (SVG backgrounds) and diagrams.
import { h, rng } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (w = 1600, hgt = 900, cls = 'bgscene') => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', `0 0 ${w} ${hgt}`); s.setAttribute('preserveAspectRatio', 'xMidYMid slice'); s.setAttribute('class', cls); s.setAttribute('aria-hidden', 'true'); return s; };
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };

function network(s, color, color2, seed, n = 32, pulses = 12) {
  const r = rng(seed), pts = [];
  for (let i = 0; i < n; i++) pts.push([r() * 1600, r() * 900, 2 + r() * 4]);
  const g = el('g', { stroke: color, 'stroke-opacity': '.22', fill: 'none' }, s);
  const links = [];
  pts.forEach((p, i) => {
    pts.map((q, j) => [j, Math.hypot(p[0] - q[0], p[1] - q[1])]).filter(([j, d]) => j > i && d < 330).sort((a, b) => a[1] - b[1]).slice(0, 2).forEach(([j]) => {
      const q = pts[j], mx = (p[0] + q[0]) / 2 + (r() - .5) * 90, my = (p[1] + q[1]) / 2 + (r() - .5) * 90;
      el('path', { d: `M${p[0]} ${p[1]} Q${mx} ${my} ${q[0]} ${q[1]}`, 'stroke-width': 1.3 }, g); links.push(`M${p[0]} ${p[1]} Q${mx} ${my} ${q[0]} ${q[1]}`);
    });
  });
  links.slice(0, pulses).forEach((d, i) => {
    const pth = el('path', { d, stroke: color2, 'stroke-width': 3, fill: 'none', class: 'zip', 'stroke-linecap': 'round', style: `animation-delay:${(i * 0.7).toFixed(1)}s;animation-duration:${(3.5 + (i % 4)).toFixed(1)}s` }, s); pth.setAttribute('pathLength', '220');
  });
  pts.forEach((p, i) => el('circle', { cx: p[0], cy: p[1], r: p[2], fill: color2, class: 'twinkle', style: `animation-delay:${(i % 9) * .5}s` }, s));
}
function particles(s, color, seed, n = 46) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const rad = 3 + r() * 16;
    el('circle', { cx: r() * 1600, cy: 900 + r() * 200, r: rad, fill: color, 'fill-opacity': (.1 + r() * .22).toFixed(2), class: 'rise', style: `animation-delay:-${(r() * 20).toFixed(1)}s;animation-duration:${(14 + r() * 16).toFixed(1)}s` }, s);
  }
  const lung = el('g', { fill: 'none', stroke: color, 'stroke-opacity': '.14', 'stroke-width': 3, transform: 'translate(1040 170) scale(1.7)' }, s);
  el('path', { d: 'M100 20 v120 M100 90 C60 70 20 90 12 170 C8 215 52 230 85 200 C100 185 100 150 100 120 M100 90 C140 70 180 90 188 170 C192 215 148 230 115 200 C100 185 100 150 100 120' }, lung);
}
function instrument(s, color, color2, seed) {
  const r = rng(seed);
  const g = el('g', { stroke: color, 'stroke-opacity': '.16' }, s);
  for (let x = 0; x <= 1600; x += 80) el('line', { x1: x, y1: 0, x2: x, y2: 900, 'stroke-width': x % 400 === 0 ? 1.6 : .7 }, g);
  for (let y = 0; y <= 900; y += 75) el('line', { x1: 0, y1: y, x2: 1600, y2: y, 'stroke-width': .7 }, g);
  for (let k = 0; k < 4; k++) {
    let d = `M-60 ${220 + k * 170}`;
    for (let x = -60; x <= 1700; x += 40) d += ` L${x} ${220 + k * 170 + Math.sin(x / 90 + k) * (26 + k * 10)}`;
    const w = el('g', { class: 'wavy', style: `animation-delay:-${k * 3}s` }, s);
    el('path', { d, fill: 'none', stroke: k % 2 ? color2 : color, 'stroke-opacity': (.2 + k * .06).toFixed(2), 'stroke-width': 3 }, w);
  }
}
function radar(s, color, color2, seed) {
  const r = rng(seed);
  const g = el('g', { transform: 'translate(1050 450)', fill: 'none' }, s);
  for (let i = 1; i <= 6; i++) el('circle', { r: i * 90, stroke: color, 'stroke-opacity': (.22 - i * .02).toFixed(2), 'stroke-width': 1.5, 'stroke-dasharray': i % 2 ? '4 8' : '0' }, g);
  const sw = el('g', { class: 'sweep' }, g);
  el('path', { d: 'M0 0 L540 0 A540 540 0 0 0 467 -270 Z', fill: color2, 'fill-opacity': '.1' }, sw);
  el('line', { x1: 0, y1: 0, x2: 540, y2: 0, stroke: color2, 'stroke-opacity': '.5', 'stroke-width': 2 }, sw);
  for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 60 + r() * 460; el('circle', { cx: Math.cos(a) * d, cy: Math.sin(a) * d, r: 2 + r() * 3, fill: color, 'fill-opacity': '.6', class: 'twinkle', style: `animation-delay:${(i % 7) * .6}s` }, g); }
}
function emergency(s, color, color2) {
  const g = el('g', { fill: 'none' }, s);
  [[420, 300], [1180, 640], [820, 180]].forEach(([x, y], i) => { for (let k = 0; k < 3; k++) el('circle', { cx: x, cy: y, r: 70, stroke: color, 'stroke-width': 2, class: 'ping', style: `animation-delay:${i * 1.1 + k * 1.1}s` }, g); });
  el('path', { d: 'M-20 600 L300 600 L340 540 L390 690 L440 470 L490 640 L520 600 L1700 600', stroke: color2, 'stroke-opacity': '.55', 'stroke-width': 4, class: 'ecg', 'stroke-linejoin': 'round' }, g);
  el('path', { d: 'M-20 300 L400 300 L430 260 L470 340 L505 250 L545 300 L1700 300', stroke: color, 'stroke-opacity': '.3', 'stroke-width': 3, class: 'ecg', style: 'animation-delay:-2s', 'stroke-linejoin': 'round' }, g);
  const grid = el('g', { stroke: color2, 'stroke-opacity': '.07' }, s);
  for (let x = 0; x < 1600; x += 60) el('line', { x1: x, y1: 0, x2: x, y2: 900 }, grid);
  for (let y = 0; y < 900; y += 60) el('line', { x1: 0, y1: y, x2: 1600, y2: y }, grid);
}
function bubbles(s, color, color2, seed) {
  const r = rng(seed);
  for (let i = 0; i < 16; i++) {
    const w = 120 + r() * 200, hh = 40 + r() * 46, x = r() * 1500, y = 80 + r() * 800, mine = r() > .5;
    const g = el('g', { class: 'float', style: `animation-delay:-${(r() * 16).toFixed(1)}s;animation-duration:${(14 + r() * 14).toFixed(1)}s`, transform: `translate(${x} ${y})` }, s);
    el('rect', { width: w, height: hh, rx: 20, fill: mine ? color : color2, 'fill-opacity': '.1', stroke: mine ? color : color2, 'stroke-opacity': '.25' }, g);
    el('path', { d: mine ? `M${w - 10} ${hh - 4} l16 14 l-26 -4z` : `M10 ${hh - 4} l-16 14 l26 -4z`, fill: mine ? color : color2, 'fill-opacity': '.12' }, g);
    for (let k = 0; k < 2; k++) el('rect', { x: 16, y: 12 + k * 14, width: (w - 40) * (k ? .55 : .85), height: 5, rx: 3, fill: '#fff', 'fill-opacity': '.12' }, g);
  }
}
function board(s, color, color2, seed) {
  const r = rng(seed), cards = [];
  for (let i = 0; i < 10; i++) cards.push([100 + r() * 1350, 70 + r() * 700, 130 + r() * 90, 90 + r() * 70, (r() - .5) * 10]);
  const g = el('g', {}, s);
  cards.forEach((c, i) => { if (i) { const p = cards[i - 1]; el('line', { x1: p[0] + p[2] / 2, y1: p[1] + 5, x2: c[0] + c[2] / 2, y2: c[1] + 5, stroke: '#d6453d', 'stroke-opacity': '.4', 'stroke-width': 2, class: 'string' }, g); } });
  cards.forEach((c, i) => { const cg = el('g', { transform: `translate(${c[0]} ${c[1]}) rotate(${c[4]})`, class: 'float', style: `animation-delay:-${i * 2}s;animation-duration:${22 + i}s` }, g); el('rect', { width: c[2], height: c[3], fill: color, 'fill-opacity': '.07', stroke: color, 'stroke-opacity': '.25' }, cg); el('circle', { cx: c[2] / 2, cy: 5, r: 5, fill: '#d6453d', 'fill-opacity': '.55' }, cg); for (let k = 0; k < 3; k++) el('rect', { x: 12, y: 24 + k * 16, width: (c[2] - 24) * (1 - k * .2), height: 5, rx: 3, fill: color2, 'fill-opacity': '.2' }, cg); });
}

const SCENES = {
  entry: (s) => network(s, '#7cc4ff', '#5ee0d0', 11),
  brain: (s) => network(s, '#a58bff', '#59c4ff', 22, 40, 18),
  nicotine: (s) => particles(s, '#3fdccb', 33),
  alcohol: (s) => instrument(s, '#ffb347', '#ff7f5a', 44),
  cannabis: (s) => radar(s, '#8ad896', '#c8e6a0', 55),
  opioid: (s) => emergency(s, '#ff5d6e', '#69b0ff'),
  pressure: (s) => bubbles(s, '#ff93b6', '#86c8ff', 66),
  claim: (s) => board(s, '#ecc95d', '#f0a37a', 77),
  final: (s) => { network(s, '#f3cf6a', '#6fe0d2', 88, 36, 16); },
  results: (s) => network(s, '#6fe0d2', '#f3cf6a', 99, 30, 10)
};
const cache = {};
export function setBackground(theme) {
  const host = document.getElementById('bg');
  if (!host) return;
  document.body.dataset.theme = theme;
  if (!cache[theme] && SCENES[theme]) { const s = svg(); SCENES[theme](s); host.appendChild(s); cache[theme] = s; }
  for (const [k, s] of Object.entries(cache)) s.classList.toggle('on', k === theme);
}

// ---------- icons ----------
export const ICON = {
  check: '<path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
  reload: '<path d="M19 8a8 8 0 1 0 1 6M19 3v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
};
export const icon = (name, size = 20) => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICON[name]; return s; };

// ---------- brain diagram (hotspot) ----------
export function brainDiagram(regions, { onPick, selected, locked } = {}) {
  const isLocked = () => (typeof locked === 'function' ? locked() : !!locked);
  const colors = { pfc: '#7b5cff', reward: '#ff7fb0', cerebellum: '#3da6a0', brainstem: '#e0a040', hippo: '#5aa0ff' };
  const wrap = h('div.diagram');
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 560 360'); s.setAttribute('role', 'radiogroup'); s.setAttribute('aria-label', 'Side view of the brain; the front of the brain is on the left.');
  s.innerHTML = `
  <defs><radialGradient id="bgl" cx="40%" cy="30%"><stop offset="0" stop-color="#3a2f78"/><stop offset="1" stop-color="#171244"/></radialGradient></defs>
  <path id="cerebrum" d="M74 185 C62 110 128 48 226 42 C334 36 438 66 468 142 C488 192 466 224 422 236 C388 245 352 244 318 250 C290 255 258 257 226 252 C154 246 84 236 74 185 Z" fill="url(#bgl)" stroke="#8d82e8" stroke-width="2"/>
  <path d="M130 100 C170 80 210 96 232 80 M220 150 C260 126 300 150 340 128 M330 96 C370 90 410 104 436 130 M150 200 C190 180 240 200 280 184 M300 210 C340 198 380 214 420 200" fill="none" stroke="#8d82e8" stroke-opacity=".45" stroke-width="2.2"/>`;
  const shapes = {
    pfc: '<path class="shape" d="M74 185 C62 110 128 48 200 43 C190 95 188 165 196 248 C140 242 82 232 74 185 Z" fill="#7b5cff" fill-opacity=".55" stroke="#c9bcff" stroke-width="2"/>',
    reward: '<ellipse class="shape" cx="268" cy="182" rx="34" ry="19" fill="#ff7fb0" fill-opacity=".6" stroke="#ffc0d8" stroke-width="2" stroke-dasharray="5 3"/>',
    cerebellum: '<path class="shape" d="M348 252 C372 236 440 240 458 266 C470 290 436 316 396 314 C362 312 336 290 348 252 Z" fill="#3da6a0" fill-opacity=".6" stroke="#9be8e0" stroke-width="2"/><path d="M366 262 C390 270 420 268 444 262 M360 282 C390 292 422 290 450 282" fill="none" stroke="#9be8e0" stroke-opacity=".6" stroke-width="2"/>',
    brainstem: '<path class="shape" d="M300 254 L346 250 L356 346 L318 352 Z" fill="#e0a040" fill-opacity=".62" stroke="#ffd98f" stroke-width="2"/>',
    hippo: '<path class="shape" d="M296 196 C322 176 358 184 366 208 C370 222 354 226 346 214 C338 202 318 202 304 214 C296 220 286 208 296 196 Z" fill="#5aa0ff" fill-opacity=".62" stroke="#b4d4ff" stroke-width="2"/>'
  };
  const labelPos = { pfc: [18, 66], reward: [206, 124], cerebellum: [392, 326], brainstem: [172, 322], hippo: [380, 176] };
  const lines = { pfc: [[100, 92], [92, 100]], reward: [[268, 164], [268, 148]], cerebellum: [[420, 316], [430, 322]], brainstem: [[340, 320], [372, 318]], hippo: [[350, 196], [372, 190]] };
  const labw = { pfc: 138, reward: 124, cerebellum: 100, brainstem: 100, hippo: 100 };
  const group = document.createElementNS(NS, 'g'); s.appendChild(group);
  regions.forEach(([k, name]) => {
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'hs'); g.setAttribute('role', 'radio'); g.setAttribute('tabindex', isLocked() ? '-1' : '0'); g.setAttribute('aria-label', name); g.dataset.k = k; g.setAttribute('aria-checked', selected === k ? 'true' : 'false');
    const [lx, ly] = labelPos[k], w = labw[k];
    g.innerHTML = shapes[k] + `<g class="lab"><rect x="${lx}" y="${ly}" width="${w}" height="26" rx="8"/><text x="${lx + 9}" y="${ly + 18}">${name.replace('Reward circuit', 'Reward circuit')}</text></g>`;
    group.appendChild(g);
    const pick = () => { if (isLocked()) return; group.querySelectorAll('.hs').forEach((x) => x.setAttribute('aria-checked', x === g ? 'true' : 'false')); onPick && onPick(k); };
    g.addEventListener('click', pick);
    g.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pick(); } else if (e.key.startsWith('Arrow')) { e.preventDefault(); const all = [...group.querySelectorAll('.hs')]; const i = all.indexOf(g); const nx = all[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + all.length) % all.length]; nx.focus(); } });
  });
  wrap.appendChild(s);
  return wrap;
}

// ---------- seat for hero art ----------
export function heroWave() {
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 520 300'); s.setAttribute('class', 'wave pulse-line'); s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'A signal line that pulses like a heartbeat.');
  s.innerHTML = `<defs><linearGradient id="hw" x1="0" x2="1"><stop offset="0" stop-color="#7cc4ff"/><stop offset="1" stop-color="#5ee0d0"/></linearGradient></defs>
  <rect x="2" y="2" width="516" height="296" rx="22" fill="rgba(8,16,34,.6)" stroke="rgba(160,185,230,.3)"/>
  <g stroke="rgba(160,185,230,.12)">${Array.from({ length: 9 }, (_, i) => `<line x1="${30 + i * 58}" y1="20" x2="${30 + i * 58}" y2="280"/>`).join('')}${Array.from({ length: 5 }, (_, i) => `<line x1="20" y1="${40 + i * 55}" x2="500" y2="${40 + i * 55}"/>`).join('')}</g>
  <path d="M20 160 H120 L150 160 L172 90 L204 236 L236 70 L262 190 L284 160 H500" fill="none" stroke="url(#hw)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="236" cy="70" r="7" fill="#5ee0d0"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/></circle>`;
  return s;
}
