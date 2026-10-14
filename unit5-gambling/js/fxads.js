// Animated pictures that go with the six FICTIONAL ads (ids ad1..ad6 in shared/data.js).  Pure illustration: inline SVG, CSS animation only,
// no images to download.  Each scene dramatizes the persuasion technique the ad uses, without naming it, so it never gives an answer away.
import { svg } from './charts.js';

const A = 'var(--accent)', B = 'var(--accent2)', INK = 'var(--ink)', LINE = 'var(--line)';
const cls = (el, c, style) => { el.setAttribute('class', c); if (style) el.setAttribute('style', style); return el; };
const g = (kids, c, style) => cls(svg('g', null, kids), c || '', style);
const wrap = (kids, label) => svg('svg', { viewBox: '0 0 320 150', class: 'adfx-svg', role: 'img', 'aria-label': label }, kids);
const txt = (x, y, t, o) => svg('text', Object.assign({ x, y, 'text-anchor': 'middle', 'font-weight': 800, fill: INK }, o || {}), t);
const person = (x, y, c) => g([svg('circle', { cx: x, cy: y - 16, r: 10, fill: c }), svg('path', { d: `M${x - 17} ${y + 26}c0-22 8-30 17-30s17 8 17 30z`, fill: c })]);

const SCENES = {
  // Risk-free first bet: a shield that looks protective while the fine print slides in underneath.
  ad1: () => wrap([
    cls(svg('path', { d: 'M160 14l52 18v34c0 36-24 58-52 70-28-12-52-34-52-70V32z', fill: 'color-mix(in srgb, var(--accent) 30%, transparent)', stroke: A, 'stroke-width': 4 }), 'fx-pulse'),
    txt(160, 72, '$500', { 'font-size': 30, fill: A }), txt(160, 92, 'RISK-FREE', { 'font-size': 12, 'letter-spacing': 2 }),
    ...[0, 1, 2, 3].map((i) => cls(svg('circle', { cx: 40 + i * 80, cy: 0, r: 8, fill: A }), 'fx-fall', `animation-delay:${i * 0.55}s`)),
    cls(svg('text', { x: 160, y: 142, 'text-anchor': 'middle', 'font-size': 8, fill: 'var(--ink2)' }, 'bonus bet credit · winnings only · expires in 7 days'), 'fx-slide-up')
  ], 'A shield labelled risk-free with coins falling and tiny fine print sliding in below'),

  // Streak rewards: a counter climbs, a flame flickers, and a chain grows.
  ad2: () => wrap([
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => cls(svg('circle', { cx: 50 + i * 36, cy: 112, r: 12, fill: 'none', stroke: A, 'stroke-width': 4 }), 'fx-chain', `animation-delay:${i * 0.45}s`)),
    cls(svg('path', { d: 'M160 18c10 18 26 26 26 48a26 26 0 0 1-52 0c0-14 8-20 12-30 4 10 8 12 8 12 2-10 0-20 6-30z', fill: '#ff7a1a' }), 'fx-flicker'),
    cls(svg('path', { d: 'M160 44c6 10 14 14 14 26a14 14 0 0 1-28 0c0-8 6-12 8-18 2 6 4 6 4 6 0-6 0-8 2-14z', fill: '#ffd23f' }), 'fx-flicker', 'animation-delay:.15s'),
    txt(160, 142, 'DAY 1 → DAY 7 → DAY 30', { 'font-size': 11, 'letter-spacing': 1, fill: 'var(--ink2)' }),
    cls(svg('rect', { x: 214, y: 30, width: 70, height: 22, rx: 11, fill: A }), 'fx-pulse'), txt(249, 45, '7-DAY!', { 'font-size': 11, fill: 'var(--on-accent)' })
  ], 'A flame and a chain of days growing longer, with a seven-day badge'),

  // Celebrity endorsement: spotlight, athlete silhouette, sparkles and a speech bubble.
  ad3: () => wrap([
    svg('path', { d: 'M160 0L96 148h128z', fill: 'color-mix(in srgb, var(--accent) 16%, transparent)' }),
    person(160, 78, B),
    cls(svg('path', { d: 'M170 108l18 12', stroke: B, 'stroke-width': 7, 'stroke-linecap': 'round' }), 'fx-wave'),
    cls(svg('circle', { cx: 196, cy: 122, r: 9, fill: '#ff9a3c' }), 'fx-bounce'),
    ...[[70, 40], [250, 52], [92, 112], [232, 104]].map((p, i) => cls(txt(p[0], p[1], '★', { 'font-size': 18, fill: A }), 'fx-twinkle', `animation-delay:${i * 0.4}s`)),
    cls(svg('g', null, svg('rect', { x: 196, y: 14, width: 108, height: 34, rx: 10, fill: 'var(--panel2)', stroke: A, 'stroke-width': 2 }), txt(250, 36, '“I use it every game day”', { 'font-size': 8.5, 'font-weight': 700 })), 'fx-pop')
  ], 'A spotlight on an athlete with sparkles and a speech bubble'),

  // "It's a game of skill": a brain and a die trade places while a trophy sits behind.
  ad4: () => wrap([
    svg('path', { d: 'M126 40h68v22c0 22-14 34-34 36-20-2-34-14-34-36z', fill: 'color-mix(in srgb, var(--accent) 24%, transparent)', stroke: A, 'stroke-width': 3 }),
    svg('rect', { x: 150, y: 98, width: 20, height: 14, fill: A }), svg('rect', { x: 134, y: 112, width: 52, height: 9, rx: 3, fill: A }),
    cls(g([svg('circle', { cx: 0, cy: 0, r: 22, fill: B, opacity: .9 }), txt(0, 6, 'SKILL', { 'font-size': 11, fill: 'var(--on-accent)' })]), 'fx-swap-a'),
    cls(g([svg('rect', { x: -20, y: -20, width: 40, height: 40, rx: 8, fill: 'var(--panel2)', stroke: LINE, 'stroke-width': 2 }), ...[[-9, -9], [9, -9], [0, 0], [-9, 9], [9, 9]].map((p) => svg('circle', { cx: p[0], cy: p[1], r: 3.4, fill: INK }))]), 'fx-swap-b'),
    txt(160, 142, 'entry fee · prize depends on who else enters', { 'font-size': 8.5, fill: 'var(--ink2)', 'font-weight': 600 })
  ], 'A trophy with a brain badge and a die that keep swapping places'),

  // Live betting: scoreboard clock, odds that keep changing, and a button that keeps pulsing.
  ad5: () => wrap([
    svg('rect', { x: 50, y: 18, width: 220, height: 66, rx: 12, fill: 'var(--panel2)', stroke: A, 'stroke-width': 3 }),
    txt(160, 44, 'LIVE', { 'font-size': 11, fill: '#ff4d4d', 'letter-spacing': 3 }),
    cls(svg('circle', { cx: 130, cy: 40, r: 4, fill: '#ff4d4d' }), 'fx-blink'),
    txt(110, 72, '84', { 'font-size': 24 }), txt(210, 72, '81', { 'font-size': 24 }), txt(160, 70, '1:12', { 'font-size': 14, fill: A }),
    g([cls(txt(100, 112, '−140', { 'font-size': 15, fill: A }), 'fx-odds-a'), cls(txt(100, 112, '+125', { 'font-size': 15, fill: '#ff9a9a' }), 'fx-odds-b'), cls(txt(220, 112, '+120', { 'font-size': 15, fill: '#ff9a9a' }), 'fx-odds-a'), cls(txt(220, 112, '−150', { 'font-size': 15, fill: A }), 'fx-odds-b')]),
    cls(g([svg('rect', { x: 124, y: 120, width: 72, height: 24, rx: 12, fill: A }), txt(160, 137, 'BET NOW', { 'font-size': 11, fill: 'var(--on-accent)' })]), 'fx-pulse')
  ], 'A live scoreboard whose odds keep flipping above a pulsing bet-now button'),

  // Referral bonus: people link up, bonus coins fly between them, and the circle keeps growing.
  ad6: () => wrap([
    svg('path', { d: 'M70 80Q160 20 250 80', fill: 'none', stroke: LINE, 'stroke-width': 3, 'stroke-dasharray': '5 6' }),
    person(70, 92, A), person(160, 70, B), person(250, 92, A),
    cls(svg('g', null, svg('circle', { r: 11, fill: '#ffd23f' }), txt(0, 4, '$50', { 'font-size': 9, fill: '#3a2a00' })), 'fx-fly-r'),
    cls(svg('g', null, svg('circle', { r: 11, fill: '#ffd23f' }), txt(0, 4, '$50', { 'font-size': 9, fill: '#3a2a00' })), 'fx-fly-l'),
    cls(g([svg('circle', { cx: 290, cy: 44, r: 12, fill: 'none', stroke: A, 'stroke-width': 3, 'stroke-dasharray': '3 4' }), txt(290, 49, '+', { 'font-size': 18, fill: A })]), 'fx-pulse'),
    txt(160, 140, 'invite more · earn more', { 'font-size': 10, fill: 'var(--ink2)', 'font-weight': 700 })
  ], 'Three friends linked together with bonus coins flying between them')
};

/** An animated scene for ad id 'ad1'..'ad6', or null for an unknown id. */
export function adArt(id) { const f = SCENES[id]; return f ? f() : null; }
