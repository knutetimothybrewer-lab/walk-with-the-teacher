// Chapter artwork: small inline SVG scenes (no images to download), animated with transform/opacity only.
import { svg } from './charts.js';

const A = 'var(--accent)', B = 'var(--accent2)', L = 'var(--line)', I = 'var(--ink)';
const wrap = (kids, label) => svg('svg', { viewBox: '0 0 320 180', class: 'chapter-art', role: 'img', 'aria-label': label }, kids);
const anim = (el, name, dur, delay) => { el.style.animation = `${name} ${dur}s ease-in-out ${delay || 0}s infinite`; el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center'; return el; };

export function chapterArt(n) {
  switch (n) {
    case 1: return wrap([ // case file and magnifier
      svg('path', { d: 'M40 60h80l12 14h148v82H40z', fill: 'color-mix(in srgb, var(--accent) 22%, transparent)', stroke: A, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
      svg('rect', { x: 62, y: 88, width: 150, height: 10, rx: 5, fill: L }), svg('rect', { x: 62, y: 108, width: 110, height: 10, rx: 5, fill: L }), svg('rect', { x: 62, y: 128, width: 130, height: 10, rx: 5, fill: L }),
      anim(svg('g', null, svg('circle', { cx: 232, cy: 104, r: 28, fill: 'none', stroke: A, 'stroke-width': 7 }), svg('path', { d: 'M252 126l26 26', stroke: A, 'stroke-width': 9, 'stroke-linecap': 'round' }), svg('text', { x: 232, y: 112, 'text-anchor': 'middle', fill: B, 'font-size': 22, 'font-weight': 800 }, '?')), 'u5float', 4)
    ], 'A case file with a magnifying glass');
    case 2: { // histogram of coin results with a coin
      const bars = [4, 9, 17, 26, 34, 26, 17, 9, 4].map((v, i) => anim(svg('rect', { x: 40 + i * 30, y: 150 - v * 3.4, width: 22, height: v * 3.4, rx: 3, fill: i === 4 ? A : B, opacity: .85 }), 'u5grow', 3.4, i * 0.12));
      return wrap([svg('line', { x1: 30, x2: 300, y1: 150, y2: 150, stroke: L, 'stroke-width': 2 }), ...bars, anim(svg('g', null, svg('circle', { cx: 160, cy: 40, r: 20, fill: A }), svg('text', { x: 160, y: 47, 'text-anchor': 'middle', fill: 'var(--on-accent)', 'font-size': 20, 'font-weight': 800 }, 'H')), 'u5flip', 3.2)], 'A bell-shaped histogram of coin flip results');
    }
    case 3: { // neural network
      const pts = [[60, 70], [110, 40], [110, 110], [170, 30], [170, 80], [170, 135], [230, 55], [230, 110], [270, 85]];
      const links = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 8]];
      return wrap([...links.map((l, i) => anim(svg('line', { x1: pts[l[0]][0], y1: pts[l[0]][1], x2: pts[l[1]][0], y2: pts[l[1]][1], stroke: B, 'stroke-width': 2, opacity: .6 }), 'u5glow', 3 + (i % 3), i * 0.2)),
        ...pts.map((p, i) => anim(svg('circle', { cx: p[0], cy: p[1], r: i === 8 ? 12 : 8, fill: i === 8 ? A : B }), 'u5pulse', 2.6, i * 0.25))], 'A network of connected neurons');
    }
    case 4: return wrap([ // scoreboard bars and a falling expected-value line
      ...[40, 70, 55, 95, 80].map((v, i) => anim(svg('rect', { x: 40 + i * 38, y: 150 - v, width: 26, height: v, rx: 3, fill: A, opacity: .8 }), 'u5grow', 3.6, i * 0.15)),
      svg('path', { d: 'M40 60 L110 78 L180 98 L250 122 L290 140', fill: 'none', stroke: B, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': '6 6' }),
      svg('text', { x: 290, y: 40, 'text-anchor': 'end', fill: I, 'font-size': 20, 'font-weight': 800 }, 'EV < 0')], 'Bars and a downward expected value line');
    case 5: return wrap([ // three ad frames with a highlighter
      ...[0, 1, 2].map((i) => svg('g', null, svg('rect', { x: 34 + i * 92, y: 40 + (i % 2) * 14, width: 80, height: 100, rx: 8, fill: 'var(--panel2)', stroke: i === 1 ? A : L, 'stroke-width': 3 }), svg('rect', { x: 44 + i * 92, y: 54 + (i % 2) * 14, width: 60, height: 12, rx: 4, fill: B }), svg('rect', { x: 44 + i * 92, y: 74 + (i % 2) * 14, width: 50, height: 8, rx: 4, fill: L }), svg('rect', { x: 44 + i * 92, y: 90 + (i % 2) * 14, width: 40, height: 8, rx: 4, fill: L }))),
      anim(svg('rect', { x: 126, y: 72, width: 62, height: 14, rx: 4, fill: A, opacity: .45 }), 'u5glow', 2.8)], 'Three advertisements being studied');
    default: return wrap([ // calm path and stepping stones
      svg('path', { d: 'M20 150 C90 150 80 90 150 90 S230 40 300 40', fill: 'none', stroke: L, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-dasharray': '2 14' }),
      ...[[40, 150], [95, 128], [150, 90], [210, 66], [270, 42]].map((p, i) => anim(svg('circle', { cx: p[0], cy: p[1], r: 11, fill: i === 4 ? A : B }), 'u5pulse', 3, i * 0.3)),
      anim(svg('text', { x: 270, y: 24, 'text-anchor': 'middle', fill: A, 'font-size': 26 }, '★'), 'u5float', 3.4)], 'A calm path of stepping stones toward a goal');
  }
}
