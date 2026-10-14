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
// Lateral view of the left side of the brain (front of the brain on the left). Surface folds are drawn on the
// cerebrum; deep structures (reward circuit, hippocampus) are shown as if seen through the tissue.
let brainSeq = 0;
export function brainDiagram(regions, { onPick, selected, locked } = {}) {
  const isLocked = () => (typeof locked === 'function' ? locked() : !!locked);
  const uid = 'br' + (++brainSeq);
  const wrap = h('div.diagram');
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 660 420'); s.setAttribute('role', 'radiogroup'); s.setAttribute('aria-label', 'Side view of the brain; the front of the brain is on the left.');
  const CER = 'M78 192 C60 122 108 54 196 40 C286 26 396 38 446 98 C486 146 486 204 450 234 C432 250 404 252 380 246 C352 242 332 252 304 260 C272 270 232 272 202 258 C182 250 170 242 150 244 C110 246 84 226 78 192 Z';
  const r = rng(41);
  // fine surface folds: wandering rows, a dark groove with a pale ridge beside it
  let folds = '', ridges = '';
  for (let row = 0; row < 15; row++) {
    const y0 = 48 + row * 14.5; let d = `M60 ${y0}`, d2 = `M60 ${y0 + 3.5}`, ph = r() * 6, amp = 5 + r() * 5, fr = .075 + r() * .05;
    for (let x = 64; x <= 500; x += 9) { const y = y0 + Math.sin(x * fr + ph) * amp + Math.sin(x * fr * 2.3 + ph * 1.7) * 2.6; d += ` L${x} ${y.toFixed(1)}`; d2 += ` L${x} ${(y + 3.5).toFixed(1)}`; }
    folds += `<path d="${d}"/>`; ridges += `<path d="${d2}"/>`;
  }
  let cross = '';
  for (let k = 0; k < 16; k++) { const x0 = 96 + k * 25 + r() * 10, y0 = 52 + r() * 150; cross += `<path d="M${x0} ${y0} q${(r() * 16 - 8).toFixed(1)} ${(14 + r() * 12).toFixed(1)} ${(r() * 14 - 7).toFixed(1)} ${(26 + r() * 18).toFixed(1)}"/>`; }
  let folia = '';
  for (let k = 0; k < 11; k++) folia += `<path d="M${338 + k * 1.5} ${256 + k * 6} q60 ${-10 + (k % 2) * 5} 122 ${-6 + k * 1.5}"/>`;
  s.innerHTML = `
  <defs>
    <clipPath id="${uid}c"><path d="${CER}"/></clipPath>
    <clipPath id="${uid}cb"><path d="M346 250 C376 238 450 240 474 262 C490 284 462 322 414 328 C374 332 340 300 346 250 Z"/></clipPath>
    <radialGradient id="${uid}g" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="#f1c9c0"/><stop offset=".55" stop-color="#d79e9b"/><stop offset="1" stop-color="#a96f77"/></radialGradient>
    <linearGradient id="${uid}cbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cf938f"/><stop offset="1" stop-color="#97616c"/></linearGradient>
    <linearGradient id="${uid}bs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9a08f"/><stop offset=".5" stop-color="#e8c8b4"/><stop offset="1" stop-color="#b78b82"/></linearGradient>
    <radialGradient id="${uid}sh" cx="50%" cy="100%" r="70%"><stop offset="0" stop-color="#3b1a2c" stop-opacity=".55"/><stop offset="1" stop-color="#3b1a2c" stop-opacity="0"/></radialGradient>
    <filter id="${uid}soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation=".6"/></filter>
    <filter id="${uid}glow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="3.2"/></filter>
  </defs>
  <g transform="translate(40 44)">
    <ellipse cx="250" cy="332" rx="210" ry="14" fill="rgba(0,0,0,.35)" filter="url(#${uid}soft)"/>
    <path d="M296 214 C300 236 306 262 304 282 C318 296 322 322 324 352 C332 356 346 354 352 346 C350 318 356 292 366 264 C356 246 346 232 336 214 Z" fill="url(#${uid}bs)" stroke="#8a5a60" stroke-width="1.6"/>
    <path d="M308 270 C322 276 342 276 360 268 M312 296 C324 300 340 298 352 294" fill="none" stroke="#8a5a60" stroke-opacity=".5" stroke-width="1.4"/>
    <path d="M346 250 C376 238 450 240 474 262 C490 284 462 322 414 328 C374 332 340 300 346 250 Z" fill="url(#${uid}cbg)" stroke="#7d4d5a" stroke-width="1.8"/>
    <g clip-path="url(#${uid}cb)" fill="none" stroke="#6d3f4e" stroke-opacity=".6" stroke-width="1.5">${folia}</g>
    <path d="${CER}" fill="url(#${uid}g)"/>
    <g clip-path="url(#${uid}c)">
      <g fill="none" stroke="#f6d8cf" stroke-opacity=".38" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${ridges}</g>
      <g fill="none" stroke="#8a4f5e" stroke-opacity=".55" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" filter="url(#${uid}soft)">${folds}</g>
      <g fill="none" stroke="#8a4f5e" stroke-opacity=".4" stroke-width="1.6" stroke-linecap="round">${cross}</g>
      <path d="M268 40 C258 80 246 112 232 168" fill="none" stroke="#6e3a4c" stroke-opacity=".8" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M156 232 C196 214 250 190 300 174 C336 162 380 160 420 176" fill="none" stroke="#6e3a4c" stroke-opacity=".85" stroke-width="4" stroke-linecap="round"/>
      <path d="M404 98 C410 140 408 176 396 214" fill="none" stroke="#6e3a4c" stroke-opacity=".5" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="60" y="200" width="460" height="90" fill="url(#${uid}sh)"/>
    </g>
    <path d="${CER}" fill="none" stroke="#7b4756" stroke-width="2.2"/>
    <path d="M110 120 C130 76 176 56 226 54" fill="none" stroke="#fff" stroke-opacity=".32" stroke-width="5" stroke-linecap="round" filter="url(#${uid}soft)"/>
  </g>`;
  const art = s.querySelector('g');
  const shapes = {
    pfc: `<path class="shape" clip-path="url(#${uid}c)" d="M40 20 L214 20 C202 90 204 170 214 290 L40 290 Z" fill="#7b5cff" fill-opacity=".5" stroke="#d7ccff" stroke-width="2.2"/>`,
    reward: `<g class="shape-g"><ellipse class="glow" cx="262" cy="196" rx="52" ry="22" fill="#ff5fa0" fill-opacity=".45" filter="url(#${uid}glow)"/><path class="flow" d="M312 238 C296 222 280 214 262 206 C246 198 232 190 222 182" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2.4" stroke-dasharray="3 7" stroke-linecap="round"/><ellipse class="shape" cx="262" cy="196" rx="52" ry="22" fill="#ff7fb0" fill-opacity=".34" stroke="#ffd0e2" stroke-width="2.4" stroke-dasharray="6 4"/><circle cx="222" cy="182" r="7" fill="#ffd0e2" stroke="#b03a72" stroke-width="1.6"/><circle cx="312" cy="238" r="6" fill="#ffd0e2" stroke="#b03a72" stroke-width="1.6"/></g>`,
    cerebellum: `<path class="shape" d="M346 250 C376 238 450 240 474 262 C490 284 462 322 414 328 C374 332 340 300 346 250 Z" fill="#2fb5a8" fill-opacity=".42" stroke="#aef2ea" stroke-width="2.2"/>`,
    brainstem: `<path class="shape" d="M296 214 C300 236 306 262 304 282 C318 296 322 322 324 352 C332 356 346 354 352 346 C350 318 356 292 366 264 C356 246 346 232 336 214 Z" fill="#f0a530" fill-opacity=".5" stroke="#ffe0a3" stroke-width="2.2"/>`,
    hippo: `<path class="glow2" d="M300 226 C312 200 342 192 366 204 C384 214 380 232 366 230 C352 228 346 214 330 216 C318 218 312 236 300 226 Z" fill="#5aa0ff" fill-opacity=".5" filter="url(#${uid}glow)"/><path class="shape" d="M296 228 C306 198 340 190 366 202 C386 212 384 234 368 234 C354 234 350 218 334 220 C322 222 316 240 304 238 C296 238 292 234 296 228 Z" fill="#5aa0ff" fill-opacity=".55" stroke="#c4dcff" stroke-width="2.2"/>`
  };
  // label box (x, y within the art group), leader line from the box to the structure
  const lab = { pfc: { x: -30, y: -24, w: 138, a: [96, 110] }, reward: { x: 190, y: -38, w: 124, a: [262, 192] }, cerebellum: { x: 392, y: 338, w: 100, a: [440, 316] }, brainstem: { x: 150, y: 340, w: 110, a: [326, 330] }, hippo: { x: 480, y: 168, w: 100, a: [372, 214] } };
  const NSG = (t, a, p) => { const e = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); if (p) p.appendChild(e); return e; };
  const group = NSG('g', {}, art);
  regions.forEach(([k, name]) => {
    const g = NSG('g', { class: 'hs', role: 'radio', tabindex: isLocked() ? '-1' : '0', 'aria-label': name, 'aria-checked': selected === k ? 'true' : 'false', 'data-k': k }, group);
    const L = lab[k], ax = L.x + L.w / 2, ay = L.y + (L.y > 200 ? 0 : 26);
    g.innerHTML = shapes[k] + `<g class="lab"><line class="lead" x1="${ax}" y1="${ay}" x2="${L.a[0]}" y2="${L.a[1]}"/><circle class="dot" cx="${L.a[0]}" cy="${L.a[1]}" r="3.4"/><rect x="${L.x}" y="${L.y}" width="${L.w}" height="26" rx="8"/><text x="${L.x + 9}" y="${L.y + 18}">${name}</text></g>`;
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
