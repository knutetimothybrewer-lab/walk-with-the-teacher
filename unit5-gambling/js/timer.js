// The 90-minute countdown (upper right).  The deadline is the SERVER's; the browser only displays it.
// Remaining time = deadline - (this computer's clock + the measured offset to the server clock), so a wrong
// Chromebook clock, a throttled background tab, or a refresh can never change the real deadline.
import { h, fmtClock, announce } from './util.js';
import { serverNow } from './api.js';
import { svg } from './charts.js';

export function createTimer({ deadlineMs, preview, onExpire, onBanner }) {
  let deadline = deadlineMs, expired = false, said = {}, last = null;
  const text = h('span', { class: 'tm' }, '--:--'), sr = h('span', { class: 'sr-only' }, ''); let lastMin = null;
  const clock = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' }, svg('circle', { cx: 12, cy: 13, r: 8 }), svg('path', { d: 'M12 9v4l3 2M9 2h6' }));
  const el = h('div', { class: 'timer' + (preview ? ' preview' : ''), role: 'timer', 'aria-label': (preview ? 'Preview timer. ' : '') + 'Time remaining' }, clock, text, sr);
  function tick() {
    const rem = Math.max(0, (deadline - serverNow()) / 1000), min = rem / 60;
    const secs = Math.ceil(rem); text.textContent = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
    const cls = rem <= 0 ? 'final' : min <= 5 ? 'final' : min <= 10 ? 'red' : min <= 30 ? 'amber' : '';
    if (cls !== last) { el.classList.remove('amber', 'red', 'final'); if (cls) el.classList.add(cls); last = cls; onBanner && onBanner(min <= 5 && rem > 0, Math.ceil(min)); }
    const mm = Math.ceil(min); if (mm !== lastMin) { lastMin = mm; sr.textContent = ` ${mm} minute${mm === 1 ? '' : 's'} remaining`; }
    [[30, 'Thirty minutes remaining.'], [10, 'Ten minutes remaining.'], [5, 'Five minutes remaining. Finish the question you are on.'], [1, 'One minute remaining.']].forEach(([m, msg]) => {
      if (min <= m && rem > 0 && !said[m]) { said[m] = true; announce(msg, m <= 5); }
    });
    if (rem <= 0 && !expired) { expired = true; onExpire && onExpire(); }
  }
  tick();
  const iv = setInterval(tick, 1000), vis = () => tick();
  document.addEventListener('visibilitychange', vis);
  return {
    el, tick,
    setDeadline(ms) { deadline = ms; expired = false; said = {}; const min = (deadline - serverNow()) / 60000; [30, 10, 5, 1].forEach((m) => { if (min <= m) said[m] = true; }); tick(); },
    destroy() { clearInterval(iv); document.removeEventListener('visibilitychange', vis); }
  };
}
