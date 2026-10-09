'use strict';
// WCAG contrast check for every chapter theme, computed from css/tokens.css (axe cannot evaluate text over the animated gradients).
// Text must reach 4.5:1 (normal) and non-text/large UI 3:1, measured against the WORSE of the two gradient ends.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'tokens.css'), 'utf8');

function parseColor(s) {
  s = s.trim();
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1]; }
  m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) { const p = m[1].split(',').map((x) => parseFloat(x)); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  throw new Error('color? ' + s);
}
const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat([1]);
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

function vars(block) { const o = {}; block.replace(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi, (_, k, v) => { o[k] = v.trim(); return ''; }); return o; }
const root = vars(css.match(/:root\s*\{([^}]*)\}/)[1]);
const themes = {};
css.replace(/^body\[data-ch="([^"]+)"\](?:,\s*body\[data-ch="([^"]+)"\])?\s*\{([^}]*)\}/gm, (_, a, b, body) => { const v = vars(body); themes[a] = v; if (b) themes[b] = v; return ''; });

const NAMES = { 1: 'navy and gold', 2: 'teal laboratory', 3: 'purple neuroscience', 4: 'green analytics', 5: 'marketing studio', 6: 'calm decision', 7: 'results', t: 'teacher' };
for (const id of Object.keys(NAMES)) {
  test(`theme ${id} (${NAMES[id]}) meets WCAG AA contrast`, () => {
    const t = Object.assign({}, root, themes[id] || {});
    if (id === '1') Object.assign(t, themes['0'] ? {} : {});
    const bg0 = parseColor(t.bg0 || '#0a1228'), bg1 = parseColor(t.bg1 || '#172a55');
    const panel = (c) => [over(parseColor(c), bg0), over(parseColor(c), bg1)];
    const panelDefault = t.panel || 'rgba(255,255,255,.07)', panel2 = t.panel2 || 'rgba(255,255,255,.11)';
    const pairs = [];       // [label, foreground, [backgrounds], minimum]
    const surfaces = [bg0, bg1].concat(panel(panelDefault)).concat(panel(panel2));
    const solid = (c) => parseColor(t[c]);
    pairs.push(['body text (ink)', solid('ink'), surfaces, 4.5]);
    pairs.push(['secondary text (ink2)', solid('ink2'), surfaces, 4.5]);
    pairs.push(['accent as text/link/kicker', solid('accent'), surfaces, 4.5]);
    pairs.push(['accent2 as text', solid('accent2'), surfaces, 3]);
    pairs.push(['primary button text on accent', solid('on-accent'), [solid('accent')], 4.5]);
    for (const k of ['good', 'bad', 'warn', 'info']) pairs.push([`${k} status text`, solid(k), surfaces, 4.5]);
    if (t.alarm) pairs.push(['white text on the alarm red (final timer, danger buttons)', [255, 255, 255, 1], [solid('alarm')], 4.5]);
    pairs.push(['focus ring on background', solid('focus'), [bg0, bg1], 3]);
    const fails = [];
    for (const [label, fg, bgs, min] of pairs) for (const bg of bgs) { const r = ratio(fg.length > 3 && fg[3] < 1 ? over(fg, bg) : fg, bg); if (r < min) fails.push(`${label}: ${r.toFixed(2)}:1 < ${min}:1 on rgb(${bg.slice(0, 3).map(Math.round)})`); }
    assert.deepStrictEqual(fails, [], `theme ${id}:\n  ` + fails.join('\n  '));
  });
}
test('the timer warning states keep contrast on their own backgrounds', () => {
  const t = Object.assign({}, root, themes['1']);
  const bg = over(parseColor(t.panel || 'rgba(255,255,255,.07)'), parseColor(t.bg0));
  assert.ok(ratio(parseColor(t.warn), bg) >= 4.5, 'amber');
  assert.ok(ratio(parseColor(t.bad), bg) >= 4.5, 'red');
  assert.ok(ratio([255, 255, 255, 1], parseColor(t.alarm)) >= 4.5, 'final warning and destructive buttons: white on dark red');
});
