'use strict';
// WCAG AA contrast, checked against the REAL tokens in css/tokens.css (not a copy), for every chapter palette.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', '..', 'css', 'tokens.css'), 'utf8');

function tokens(block) {
  const out = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2];
  return out;
}
const root = tokens(css.slice(css.indexOf(':root'), css.indexOf('/* Chapter palettes')));
const themes = {};
for (const m of css.matchAll(/\[data-theme="(\w+)"\]\s*\{([^}]*)\}/g)) themes[m[1]] = Object.assign({}, root, tokens(m[2]));

function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }

test('all six chapter themes are defined', () => {
  assert.deepEqual(Object.keys(themes).sort(), ['case', 'lab', 'medlab', 'paths', 'resource', 'studio']);
});

test('neutral text and status colors meet AA (4.5:1) on their backgrounds', () => {
  const t = root;
  const pairs = [
    ['ink', 'bg'], ['ink', 'surface'], ['ink-2', 'surface'], ['muted', 'surface'], ['muted', 'bg'], ['muted', 'surface-2'],
    ['ok-ink', 'ok-bg'], ['warn-ink', 'warn-bg'], ['bad-ink', 'bad-bg'], ['info-ink', 'info-bg'],
    ['timer-amber-ink', 'timer-amber-bg'], ['timer-red-ink', 'timer-red-bg']
  ];
  pairs.forEach(([f, b]) => assert.ok(ratio(t[f], t[b]) >= 4.5, f + ' on ' + b + ' = ' + ratio(t[f], t[b]).toFixed(2)));
  // focus ring is a UI component: 3:1 against the surfaces it appears on
  assert.ok(ratio(t.focus, t.surface) >= 3 && ratio(t.focus, t.bg) >= 3);
});

for (const name of ['lab', 'studio', 'medlab', 'paths', 'resource', 'case']) {
  test('theme ' + name + ': accent buttons, accent text, soft panels, and hero text all meet AA', () => {
    const t = themes[name];
    const chk = (f, b, min, label) => assert.ok(ratio(t[f], t[b]) >= min, name + ': ' + label + ' (' + f + ' on ' + b + ') = ' + ratio(t[f], t[b]).toFixed(2) + ' < ' + min);
    chk('accent-ink', 'accent', 4.5, 'button label on accent');
    chk('accent-text', 'surface', 4.5, 'heading/link text on white');
    chk('accent-text', 'accent-soft', 4.5, 'heading text on soft panel');
    chk('ink', 'accent-soft', 7, 'body text on soft panel');
    chk('hero-ink', 'hero-a', 4.5, 'hero text on gradient start');
    chk('hero-ink', 'hero-b', 4.5, 'hero text on gradient end');
    chk('accent', 'surface', 3, 'accent as a UI component on white (borders, focus, bars)');
  });
}

test('case file gold on navy hero meets AA for its kicker text', () => {
  const t = themes.case;
  assert.ok(ratio(t['accent-gold'], t['hero-a']) >= 4.5, ratio(t['accent-gold'], t['hero-a']).toFixed(2));
  assert.ok(ratio(t['accent-gold'], t['hero-b']) >= 4.5, ratio(t['accent-gold'], t['hero-b']).toFixed(2));
});
