// Accessibility preferences (stored only in this browser).
import { h, store, announce } from './util.js';
const KEY = 'u5.prefs';
export function loadPrefs() { return Object.assign({ size: 'normal', font: 'default', contrast: 'normal', motion: 'auto' }, store.get(KEY, {})); }
export function applyPrefs() { const p = loadPrefs(), r = document.documentElement; r.dataset.size = p.size; r.dataset.font = p.font; r.dataset.contrast = p.contrast; r.dataset.motion = p.motion; }
export function savePref(k, v) { const p = loadPrefs(); p[k] = v; store.set(KEY, p); applyPrefs(); }
export function prefsPanel() {
  const p = loadPrefs();
  const sw = (label, key, on, off) => {
    const cb = h('input', { type: 'checkbox', id: 'pf-' + key }); cb.checked = p[key] === on;
    cb.addEventListener('change', () => { savePref(key, cb.checked ? on : off); announce(label + (cb.checked ? ' on' : ' off')); });
    return h('label', { class: 'opt check', for: 'pf-' + key }, cb, h('span', { class: 'mark', 'aria-hidden': 'true' }), h('span', { class: 'ot' }, label));
  };
  return h('div', null, h('h3', null, 'Display settings'),
    h('p', { class: 'muted small' }, 'These stay on this computer only.'),
    h('div', { class: 'opts' }, sw('Larger text', 'size', 'large', 'normal'), sw('Dyslexia-friendly font', 'font', 'dyslexic', 'default'), sw('High contrast', 'contrast', 'high', 'normal'), sw('Reduce motion and animation', 'motion', 'reduced', 'auto')));
}
