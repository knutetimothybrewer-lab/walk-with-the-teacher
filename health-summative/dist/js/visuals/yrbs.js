/* yrbs.js — interactive trend chart: U.S. high school students reporting
   persistent feelings of sadness or hopelessness (CDC YRBS, 2013-2023).
   Values are rounded to whole percents (see DISCREPANCIES.md). Points are
   keyboard-focusable; a table view is available for screen readers.        */
import { h } from '../ui/dom.js';
import { s, svgRoot } from './svg.js';

export const YRBS = [
  { y: 2013, v: 30 }, { y: 2015, v: 30 }, { y: 2017, v: 32 },
  { y: 2019, v: 37 }, { y: 2021, v: 42 }, { y: 2023, v: 40, exact: '39.7' },
];

export function mount(host) {
  const W = 560, H = 270, L = 48, R = 20, T = 24, B = 40;
  const x = (i) => L + (i * (W - L - R)) / (YRBS.length - 1);
  const y = (v) => T + (1 - (v - 20) / (50 - 20)) * (H - T - B);
  const svg = svgRoot(`0 0 ${W} ${H}`, 'Line chart of the percent of U.S. high school students with persistent feelings of sadness or hopelessness, 2013 to 2023: about 30, 30, 32, 37, 42, 40 percent.', { interactive: true });
  [20, 30, 40, 50].forEach(v => {
    svg.append(s('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }));
    svg.append(s('text', { x: L - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'tick' }, v + '%'));
  });
  const pts = YRBS.map((d, i) => `${x(i)},${y(d.v)}`).join(' ');
  svg.append(s('polyline', { points: pts, class: 'line draw', pathLength: '100' }));
  const tip = h('div', { class: 'viz-tip', role: 'status', 'aria-live': 'polite' }, 'Hover, tap or focus a point to see its value.');
  const dots = YRBS.map((d, i) => {
    const g = s('g', { class: 'pt', tabindex: '0', role: 'button', 'aria-label': `${d.y}: about ${d.v} percent` });
    g.append(s('circle', { cx: x(i), cy: y(d.v), r: 7 }));
    g.append(s('text', { x: x(i), y: H - B + 20, 'text-anchor': 'middle', class: 'tick' }, d.y));
    const show = () => {
      tip.textContent = `${d.y}: about ${d.v}% of high school students reported persistent feelings of sadness or hopelessness` + (d.exact ? ` (${d.exact}% before rounding).` : '.');
      dots.forEach(o => o.classList.toggle('on', o === g));
    };
    g.addEventListener('mouseenter', show); g.addEventListener('focus', show); g.addEventListener('click', show);
    return g;
  });
  dots.forEach(g => svg.append(g));
  svg.append(s('text', { x: 14, y: T - 8, class: 'ax' }, 'Percent of students'));
  const tableBtn = h('button', { type: 'button', class: 'btn-ghost', 'aria-expanded': 'false' }, 'Show data as a table');
  const table = h('table', { class: 'viz-table', hidden: true },
    h('caption', {}, 'Persistent feelings of sadness or hopelessness, U.S. high school students (CDC YRBS), rounded'),
    h('thead', {}, h('tr', {}, h('th', {}, 'Year'), h('th', {}, 'Percent'))),
    h('tbody', {}, YRBS.map(d => h('tr', {}, h('td', {}, String(d.y)), h('td', {}, `about ${d.v}%`)))));
  tableBtn.addEventListener('click', () => {
    const open = table.hidden; table.hidden = !open;
    tableBtn.setAttribute('aria-expanded', String(open));
    tableBtn.textContent = open ? 'Hide table' : 'Show data as a table';
  });
  host.append(h('figure', { class: 'viz-fig' },
    h('figcaption', {}, 'Students with persistent feelings of sadness or hopelessness (CDC Youth Risk Behavior Survey, high school students, U.S.)'),
    svg, tip, tableBtn, table,
    h('p', { class: 'viz-note' }, 'Source: CDC, Youth Risk Behavior Survey Data Summary & Trends Report 2013–2023. Rounded to whole percents. "Persistent" = felt this way almost every day for at least 2 weeks in a row, enough to stop usual activities.')));
  return {};
}
