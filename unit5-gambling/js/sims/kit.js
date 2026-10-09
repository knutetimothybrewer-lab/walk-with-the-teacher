// Shared helpers for the labs.
import { h, md, reducedMotion } from '../util.js';
export const stat = (k, v, s, hot) => { const el = h('div', { class: 'stat' + (hot ? ' hot' : '') }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v), s ? h('div', { class: 's' }, s) : null); return el; };
export function setStat(el, v, s) { el.querySelector('.v').textContent = v; const sub = el.querySelector('.s'); if (sub) sub.textContent = s || ''; }
export function tabs(defs, onShow) {
  const bar = h('div', { class: 'sim-tabs', role: 'tablist' }), body = h('div', { class: 'sim-body' });
  const btns = defs.map((d, i) => { const b = h('button', { class: 'sim-tab', role: 'tab', type: 'button', 'aria-selected': 'false', id: 'st-' + d.id }, d.label, h('span', { class: 'tick', 'aria-hidden': 'true' })); b.addEventListener('click', () => show(i)); bar.append(b); return b; });
  bar.addEventListener('keydown', (e) => { const i = btns.findIndex((b) => b.getAttribute('aria-selected') === 'true'); if (e.key === 'ArrowRight') { e.preventDefault(); show((i + 1) % btns.length); btns[(i + 1) % btns.length].focus(); } if (e.key === 'ArrowLeft') { e.preventDefault(); show((i + btns.length - 1) % btns.length); btns[(i + btns.length - 1) % btns.length].focus(); } });
  const panes = defs.map((d) => { const p = h('div', { role: 'tabpanel', hidden: true, 'aria-labelledby': 'st-' + d.id }); body.append(p); return p; });
  function show(i) { btns.forEach((b, j) => { b.setAttribute('aria-selected', i === j ? 'true' : 'false'); b.tabIndex = i === j ? 0 : -1; }); panes.forEach((p, j) => { p.hidden = i !== j; }); if (!defs[i].__built) { defs[i].__built = true; defs[i].build(panes[i]); } onShow && onShow(i, defs[i]); }
  return { bar, body, show, mark: (i) => { btns[i].querySelector('.tick').textContent = '✓'; } };
}
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
export function dieFace(n) { const d = h('div', { class: 'die', role: 'img', 'aria-label': 'Die showing ' + n }); for (let i = 0; i < 9; i++) d.append(h('i', { class: (PIPS[n] || []).includes(i) ? 'on' : '' })); return d; }
export function setDie(el, n) { el.setAttribute('aria-label', 'Die showing ' + n); Array.from(el.children).forEach((c, i) => c.classList.toggle('on', (PIPS[n] || []).includes(i))); if (!reducedMotion()) { el.classList.remove('roll'); void el.offsetWidth; el.classList.add('roll'); } }
export const note = (t) => h('p', { class: 'lab-note' }, md(t));
export const tick = (c, ms) => new Promise((r) => setTimeout(r, reducedMotion() ? 0 : ms));
