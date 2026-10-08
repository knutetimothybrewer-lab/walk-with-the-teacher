// Mission environments (animated SVG backgrounds) and small icons. Purely decorative (aria-hidden).
import { h, rng } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const svgRoot = () => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 1600 900'); s.setAttribute('preserveAspectRatio', 'xMidYMid slice'); s.setAttribute('class', 'bgscene'); s.setAttribute('aria-hidden', 'true'); return s; };
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };

function orbs(s, colors, seed, n = 18) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) el('circle', { cx: r() * 1600, cy: 900 + r() * 200, r: 8 + r() * 34, fill: colors[i % colors.length], 'fill-opacity': (.08 + r() * .16).toFixed(2), class: 'rise', style: `animation-delay:-${(r() * 24).toFixed(1)}s;animation-duration:${(16 + r() * 18).toFixed(1)}s` }, s);
}
function leaves(s, seed) {
  const r = rng(seed), cols = ['#8be26e', '#ffb454', '#ff7a6b', '#f5e27a'];
  for (let i = 0; i < 22; i++) {
    const x = r() * 1600, y = 900 + r() * 150, sc = .6 + r() * 1.1;
    const g = el('g', { class: 'rise', style: `animation-delay:-${(r() * 26).toFixed(1)}s;animation-duration:${(20 + r() * 16).toFixed(1)}s` }, s);
    const gg = el('g', { transform: `translate(${x} ${y}) scale(${sc}) rotate(${(r() * 120 - 60).toFixed(0)})`, fill: cols[i % 4], 'fill-opacity': '.2' }, g);
    if (i % 3 === 0) { el('circle', { r: 18 }, gg); el('path', { d: 'M0 -18 C4 -34 16 -34 18 -30 C14 -22 6 -18 0 -18Z', fill: '#8be26e', 'fill-opacity': '.35' }, gg); }
    else if (i % 3 === 1) el('path', { d: 'M0 -30 C26 -12 26 16 0 30 C-26 16 -26 -12 0 -30Z' }, gg);
    else { el('path', { d: 'M0 30 V-30', stroke: cols[i % 4], 'stroke-opacity': '.3', 'stroke-width': 3 }, gg); for (let k = 0; k < 4; k++) el('ellipse', { cx: k % 2 ? 9 : -9, cy: -20 + k * 11, rx: 5, ry: 10 }, gg); }
  }
}
function scan(s) {
  const g = el('g', { stroke: 'rgba(20,30,50,.07)' }, s);
  for (let x = 0; x <= 1600; x += 64) el('line', { x1: x, y1: 0, x2: x, y2: 900 }, g);
  for (let y = 0; y <= 900; y += 64) el('line', { x1: 0, y1: y, x2: 1600, y2: y }, g);
  const bars = el('g', { fill: 'rgba(20,30,50,.07)', transform: 'translate(1180 90)' }, s);
  let x = 0; const r = rng(7); for (let i = 0; i < 38; i++) { const w = 3 + Math.floor(r() * 9); el('rect', { x, y: 0, width: w, height: 190 }, bars); x += w + 3 + Math.floor(r() * 7); }
  el('rect', { x: 0, y: 0, width: 1600, height: 6, fill: 'rgba(34,87,214,.25)', class: 'scanline' }, s);
}
function speed(s, seed) {
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const y = r() * 900, len = 140 + r() * 380;
    el('line', { x1: 0, y1: y, x2: len, y2: y, stroke: i % 2 ? '#ff7a3d' : '#ffd23f', 'stroke-opacity': (.1 + r() * .25).toFixed(2), 'stroke-width': 2 + r() * 5, 'stroke-linecap': 'round', class: 'streak', style: `animation-delay:-${(r() * 8).toFixed(1)}s;animation-duration:${(2.2 + r() * 3.5).toFixed(1)}s` }, s);
  }
  for (let k = 0; k < 3; k++) el('circle', { cx: 1250, cy: 450, r: 80 + k * 90, fill: 'none', stroke: '#ff7a3d', 'stroke-opacity': '.16', 'stroke-width': 3, class: 'ping', style: `animation-delay:${k * 1.2}s` }, s);
  el('path', { d: 'M-40 780 C400 640 900 880 1700 700', fill: 'none', stroke: '#ffd23f', 'stroke-opacity': '.14', 'stroke-width': 26 }, s);
}
function neon(s, seed) {
  const r = rng(seed);
  for (let i = 0; i < 9; i++) {
    const g = el('g', { class: 'rise', style: `animation-delay:-${(r() * 26).toFixed(1)}s;animation-duration:${(24 + r() * 14).toFixed(1)}s` }, s);
    const x = r() * 1500, y = 900 + r() * 100, c = i % 2 ? '#3df2ff' : '#ff4fd8';
    el('rect', { x, y, width: 120, height: 170, rx: 16, fill: 'none', stroke: c, 'stroke-opacity': '.35', 'stroke-width': 2.5 }, g);
    el('circle', { cx: x + 24, cy: y + 24, r: 11, fill: c, 'fill-opacity': '.3' }, g);
    el('rect', { x: x + 14, y: y + 50, width: 92, height: 60, rx: 8, fill: c, 'fill-opacity': '.12' }, g);
    el('path', { d: `M${x + 40} ${y + 138} c-10 -9 -18 -16 -10 -24 c5 -5 10 -2 10 2 c0 -4 5 -7 10 -2 c8 8 0 15 -10 24z`, fill: '#ff4fd8', 'fill-opacity': '.45' }, g);
  }
  for (let i = 0; i < 18; i++) el('circle', { cx: r() * 1600, cy: r() * 900, r: 1.5 + r() * 3, fill: '#fff', 'fill-opacity': '.5', class: 'twinkle', style: `animation-delay:${(r() * 4).toFixed(1)}s` }, s);
}
function planner(s, seed) {
  const r = rng(seed), g = el('g', { stroke: 'rgba(130,190,255,.12)', fill: 'none' }, s);
  for (let x = 0; x <= 1600; x += 100) el('line', { x1: x, y1: 0, x2: x, y2: 900 }, g);
  for (let y = 0; y <= 900; y += 100) el('line', { x1: 0, y1: y, x2: 1600, y2: y }, g);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(r() * 15) * 100 + 10, y = Math.floor(r() * 8) * 100 + 10, w = 80 + Math.floor(r() * 2) * 100;
    el('rect', { x, y, width: w, height: 38, rx: 8, fill: i % 2 ? '#5aa9ff' : '#7ef0c4', 'fill-opacity': '.12', class: 'twinkle', style: `animation-delay:${(r() * 5).toFixed(1)}s` }, s);
  }
  el('path', { d: 'M0 780 L260 700 L520 720 L780 560 L1040 590 L1300 380 L1600 300', fill: 'none', stroke: '#7ef0c4', 'stroke-opacity': '.3', 'stroke-width': 4, 'stroke-dasharray': '10 12', class: 'dashmove' }, s);
}
function earth(s, seed) {
  const r = rng(seed);
  for (let i = 0; i < 12; i++) el('path', { d: `M-40 ${430 + i * 42} C400 ${380 + i * 42 + Math.sin(i) * 40} 1100 ${520 + i * 42} 1700 ${430 + i * 42}`, fill: 'none', stroke: i % 2 ? '#9bd35a' : '#e8b86b', 'stroke-opacity': (.1 + i * .012).toFixed(2), 'stroke-width': 12 }, s);
  el('circle', { cx: 1320, cy: 160, r: 70, fill: '#e8b86b', 'fill-opacity': '.2', class: 'ping' }, s);
  const pts = []; for (let i = 0; i < 20; i++) pts.push([r() * 1600, r() * 380, 3 + r() * 5]);
  const g = el('g', { stroke: '#9bd35a', 'stroke-opacity': '.25', fill: 'none' }, s);
  pts.forEach((p, i) => { pts.slice(i + 1).filter((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 300).slice(0, 2).forEach((q) => el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], 'stroke-width': 1.5 }, g)); });
  pts.forEach((p, i) => el('circle', { cx: p[0], cy: p[1], r: p[2], fill: '#e8b86b', 'fill-opacity': '.6', class: 'twinkle', style: `animation-delay:${(i % 8) * .5}s` }, s));
}
function finale(s, seed) { orbs(s, ['#ffd36a', '#6be3d0', '#ff7a3d', '#ff4fd8', '#8be26e'], seed, 22); earth(s, seed + 1); }
function confetti(s, seed) { orbs(s, ['#6be3d0', '#ffd36a', '#ff7a6b', '#7aa8ff'], seed, 26); }

const THEMES = {
  entry: (s) => { orbs(s, ['#6be3b0', '#ffc857', '#7cc4ff'], 3, 20); },
  fuel: (s) => leaves(s, 11), label: (s) => scan(s), move: (s) => speed(s, 5), ads: (s) => neon(s, 9), plan: (s) => planner(s, 4),
  earth: (s) => earth(s, 6), final: (s) => finale(s, 8), results: (s) => confetti(s, 10)
};
const cache = {};
export function setBackground(theme) {
  const bg = document.getElementById('bg'); if (!bg) return;
  document.body.dataset.theme = theme;
  if (!cache[theme]) { const s = svgRoot(); (THEMES[theme] || THEMES.entry)(s); cache[theme] = s; bg.appendChild(s); }
  Object.entries(cache).forEach(([k, s]) => s.classList.toggle('on', k === theme));
}

export function heroWave() {
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 520 120'); s.setAttribute('class', 'wave pulse-line'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<path d="M0 70 H70 l18 -42 l26 84 l22 -62 l12 20 H220 c20 -50 60 -50 80 0 H360 l16 -30 l16 60 l16 -30 H520" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="296" cy="70" r="7" fill="var(--accent-2)"/>';
  return s;
}
const ICONS = { arrow: 'M5 12h14M13 6l6 6-6 6', back: 'M19 12H5M11 6l-6 6 6 6', gear: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z', book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11' };
export function icon(name, size = 20) {
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(NS, 'path'); p.setAttribute('d', ICONS[name] || ICONS.arrow); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '2'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
  s.appendChild(p); return s;
}
