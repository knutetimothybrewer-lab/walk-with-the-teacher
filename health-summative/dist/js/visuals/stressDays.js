/* stressDays.js — stress level over two weeks, with and without recovery.
   Illustrative model (not data): acute spikes fade; chronic stress with no
   recovery keeps climbing. A toggle lets students watch both.               */
import { h } from '../ui/dom.js';
import { s, svgRoot } from './svg.js';

const DAYS = 14;
// Illustrative values 0-100.
const WITH = [30, 38, 70, 45, 34, 30, 28, 32, 40, 62, 40, 31, 28, 27];     // spikes then recovers (acute)
const WITHOUT = [32, 40, 55, 52, 58, 62, 64, 68, 72, 70, 76, 78, 80, 82];  // no recovery -> climbs (chronic)

export function mount(host) {
  const W = 560, H = 230, L = 40, R = 16, T = 20, B = 36;
  const x = (i) => L + (i * (W - L - R)) / (DAYS - 1);
  const y = (v) => T + (1 - v / 100) * (H - T - B);
  const svg = svgRoot(`0 0 ${W} ${H}`, 'Stress level over 14 days. With recovery the line rises on hard days and then comes back down. Without recovery it keeps climbing.');
  svg.append(s('line', { x1: L, x2: W - R, y1: y(25), y2: y(25), class: 'baseline' }));
  svg.append(s('text', { x: W - R, y: y(25) - 6, 'text-anchor': 'end', class: 'tick' }, 'usual level'));
  const lineA = s('polyline', { points: WITH.map((v, i) => `${x(i)},${y(v)}`).join(' '), class: 'line a' });
  const lineB = s('polyline', { points: WITHOUT.map((v, i) => `${x(i)},${y(v)}`).join(' '), class: 'line b' });
  svg.append(lineB, lineA);
  [1, 4, 7, 10, 14].forEach(d => svg.append(s('text', { x: x(d - 1), y: H - 12, 'text-anchor': 'middle', class: 'tick' }, 'Day ' + d)));
  svg.append(s('text', { x: 10, y: 14, class: 'ax' }, 'Stress level'));

  const cap = h('p', { class: 'viz-tip', role: 'status', 'aria-live': 'polite' });
  const mk = (id, label) => {
    const b = h('button', { type: 'button', class: 'seg', role: 'radio', 'aria-checked': 'false', 'data-k': id }, label);
    return b;
  };
  const bBoth = mk('both', 'Show both'), bWith = mk('with', 'With recovery'), bNo = mk('without', 'No recovery');
  const seg = h('div', { class: 'seg-group', role: 'radiogroup', 'aria-label': 'Which line to show' }, bBoth, bWith, bNo);
  function show(k) {
    [bBoth, bWith, bNo].forEach(b => b.setAttribute('aria-checked', String(b.dataset.k === k)));
    lineA.style.opacity = k === 'without' ? '0.12' : '1';
    lineB.style.opacity = k === 'with' ? '0.12' : '1';
    cap.textContent = k === 'with' ? 'With recovery (sleep, movement, support, time): stress spikes on hard days, then comes back toward the usual level.'
      : k === 'without' ? 'With no recovery: stress does not come back down. Each day starts higher than the last.'
        : 'Solid line: spikes that fade (acute). Dashed line: stays high and keeps building because there is no recovery (chronic).';
  }
  [bBoth, bWith, bNo].forEach(b => b.addEventListener('click', () => show(b.dataset.k)));
  show('both');
  host.append(h('figure', { class: 'viz-fig' },
    h('figcaption', {}, 'Stress over two weeks (an illustration, not real data)'),
    svg, seg, cap));
  return {};
}
