/* settings.js — per-device comfort settings (font, size, motion, read-aloud). */
import { storage } from '../engine/storage.js';

const KEY = 'wwt:settings';
const defaults = { dyslexiaFont: false, textSize: 0, motion: 'auto', readAloud: false };
let cur = { ...defaults, ...(storage.get(KEY, {}) || {}) };

function apply() {
  const r = document.documentElement;
  r.classList.toggle('dys', !!cur.dyslexiaFont);
  r.dataset.text = String(cur.textSize);
  r.classList.toggle('reduce-motion', settings.reducedMotion());
}

export const settings = {
  get: () => cur,
  set(patch) { cur = { ...cur, ...patch }; storage.set(KEY, cur); apply(); },
  reducedMotion() {
    if (cur.motion === 'on') return true;
    if (cur.motion === 'off') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  },
  /** Teacher-configured accommodations for one student (only turn things ON). */
  applyOverride(o) {
    if (!o) return;
    const patch = {};
    if (o.readAloud) patch.readAloud = true;
    if (o.largeText) patch.textSize = Math.max(cur.textSize, 2);
    if (o.reducedMotion) patch.motion = 'on';
    if (Object.keys(patch).length) this.set(patch);
  },
  apply,
};
