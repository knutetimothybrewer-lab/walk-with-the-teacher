/* gauges.js — "Recovery dial". Two gauges: sympathetic "gas pedal" (stress
   response) and parasympathetic "brake pedal" (recovery). Each option in the
   item carries fx:[gasChange, brakeChange]; the gauges move live as the student
   selects actions. Qualitative only (no made-up numbers).                    */
import { h } from '../ui/dom.js';
import { s, svgRoot } from './svg.js';
import { settings } from '../ui/settings.js';

const level = (v) => (v >= 66 ? 'high' : v >= 34 ? 'medium' : 'low');

function gauge(label, cls) {
  const svg = svgRoot('0 0 180 110', label);
  svg.append(s('path', { d: 'M 15 95 A 75 75 0 0 1 165 95', class: 'g-track', pathLength: '100' }));
  const arc = s('path', { d: 'M 15 95 A 75 75 0 0 1 165 95', class: `g-fill ${cls}`, pathLength: '100', 'stroke-dasharray': '100', 'stroke-dashoffset': '100' });
  svg.append(arc);
  const needle = s('line', { x1: 90, y1: 95, x2: 90, y2: 32, class: 'g-needle', style: 'transform-origin:90px 95px' });
  svg.append(needle);
  svg.append(s('circle', { cx: 90, cy: 95, r: 6, class: 'g-hub' }));
  return { svg, arc, needle };
}

export function mount(host, ctx) {
  const item = ctx.item;
  const base = item.gaugeStart || [85, 15];
  const gas = gauge('Gas pedal (stress response)', 'gas');
  const brake = gauge('Brake pedal (recovery)', 'brake');
  const gasTxt = h('span', { class: 'g-level' });
  const brakeTxt = h('span', { class: 'g-level' });
  const wrap = h('div', { class: 'gauges', role: 'group', 'aria-label': 'Recovery dial' },
    h('div', { class: 'gauge' }, gas.svg, h('div', { class: 'g-cap' }, h('strong', {}, 'Gas pedal'), h('small', {}, 'sympathetic: stress response'), gasTxt)),
    h('div', { class: 'gauge' }, brake.svg, h('div', { class: 'g-cap' }, h('strong', {}, 'Brake pedal'), h('small', {}, 'parasympathetic: recovery'), brakeTxt)));
  host.append(wrap);

  function set(g, txt, v) {
    const c = Math.max(0, Math.min(100, v));
    g.arc.setAttribute('stroke-dashoffset', String(100 - c));
    g.needle.style.transform = `rotate(${-90 + c * 1.8}deg)`;
    txt.textContent = `Level: ${level(c)}`;
  }
  function update(resp) {
    const picks = (resp && resp.picks) || [];
    let gv = base[0], bv = base[1];
    picks.forEach(i => { const fx = item.options[i].fx; if (fx) { gv += fx[0]; bv += fx[1]; } });
    set(gas, gasTxt, gv); set(brake, brakeTxt, bv);
  }
  if (settings.reducedMotion()) wrap.classList.add('no-anim');
  update({ picks: [] });
  return { update };
}
