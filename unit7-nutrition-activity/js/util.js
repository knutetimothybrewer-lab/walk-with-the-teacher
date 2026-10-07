// Small helpers: seeded randomness, DOM builder, formatting.
import { sha256 } from './sha256.js';
export { sha256 };

export function seedFrom(str) { return parseInt(sha256(str).slice(0, 8), 16) >>> 0; }
export function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffled(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const uid = (n = 10) => {
  const a = new Uint8Array(n);
  (globalThis.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => (a[i] = Math.floor(Math.random() * 256)));
  return Array.from(a, (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
};
export function fmtDur(ms) {
  const s = Math.max(0, Math.round(ms / 1000)), m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${String(s % 60).padStart(2, '0')}s`;
}
export const pct = (x) => (Math.round(x * 10) / 10).toString().replace(/\.0$/, '') + '%';

// Hyperscript-ish DOM builder: h('div.card#id', {onclick, aria-label:'x'}, child, 'text', ...)
export function h(sel, props, ...kids) {
  if (props != null && (typeof props === 'string' || typeof props === 'number' || props.nodeType || Array.isArray(props))) { kids.unshift(props); props = null; }
  const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(sel) || [];
  const svgTags = 'svg g path circle rect line polyline polygon text defs linearGradient radialGradient stop ellipse use title desc filter feGaussianBlur animate animateTransform clipPath mask tspan';
  const tag = m[1] || 'div';
  const el = svgTags.split(' ').includes(tag) ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const part of (m[2] || '').match(/[.#][\w-]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
  }
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') v.split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const reducedMotion = () => document.documentElement.dataset.motion === 'reduced' ||
  (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.motion !== 'full');
