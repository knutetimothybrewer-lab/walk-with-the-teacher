/* thirdVar.js — animated "third variable" illustration. Two things move
   together (A and B). Reveal a hidden factor C that can drive both.        */
import { h } from '../ui/dom.js';
import { s, svgRoot } from './svg.js';

export function mount(host, ctx) {
  const o = ctx.visual || {};
  const A = o.a || 'Hot weather', B = o.b || 'Ice cream sales', C = o.c || 'Summer season';
  const note = o.note || 'Two things can rise together without one causing the other. A hidden third factor may be pushing both.';
  const svg = svgRoot('0 0 560 230', `A causes B? A is "${A}", B is "${B}". A hidden factor "${C}" may be driving both.`);
  const box = (x, y, w, t, cls) => s('g', { class: `tv-box ${cls}` }, s('rect', { x, y, width: w, height: 46, rx: 14 }), s('text', { x: x + w / 2, y: y + 29, 'text-anchor': 'middle' }, t));
  svg.append(
    s('defs', {}, s('marker', { id: 'arr', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, s('path', { d: 'M0 0 L10 5 L0 10 z', fill: 'currentColor' }))),
    s('line', { x1: 190, y1: 160, x2: 370, y2: 160, class: 'tv-arrow main', 'marker-end': 'url(#arr)' }),
    s('text', { x: 280, y: 148, 'text-anchor': 'middle', class: 'tv-q' }, 'moves together'),
    box(30, 138, 160, A, 'a'), box(370, 138, 160, B, 'b'));
  const hidden = s('g', { class: 'tv-hidden', style: 'opacity:0' },
    s('line', { x1: 250, y1: 62, x2: 120, y2: 134, class: 'tv-arrow', 'marker-end': 'url(#arr)' }),
    s('line', { x1: 310, y1: 62, x2: 440, y2: 134, class: 'tv-arrow', 'marker-end': 'url(#arr)' }),
    box(190, 16, 180, C, 'c'));
  svg.append(hidden);
  const msg = h('p', { class: 'viz-tip', role: 'status', 'aria-live': 'polite' }, note);
  const btn = h('button', { type: 'button', class: 'btn-ghost', 'aria-pressed': 'false' }, 'Reveal the hidden factor');
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? 'Hide the hidden factor' : 'Reveal the hidden factor';
    hidden.style.opacity = on ? '1' : '0';
    svg.classList.toggle('revealed', on);
    msg.textContent = on ? `"${C}" can push both "${A}" and "${B}" up. That is a third variable (a confounder).` : note;
  });
  host.append(h('figure', { class: 'viz-fig' }, h('figcaption', {}, 'Third-variable illustration'), svg, btn, msg));
  return {};
}
