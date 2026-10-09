'use strict';
// Guards on the PUBLIC content (content/items.json, content/figures.js, assets/*.svg). These need no private files, so they
// also run on a fresh clone. They protect against answers leaking into text that every student can read.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const pub = JSON.parse(fs.readFileSync(path.join(root, 'content/items.json'), 'utf8'));
const allItems = [];
pub.chapters.forEach((c) => c.units.forEach((u) => u.items.forEach((i) => allItems.push(i))));

test('public content has 40 items worth 100 points', () => {
  assert.equal(allItems.length, 40);
  assert.equal(allItems.reduce((a, i) => a + i.points, 0), 100);
});

test('public content carries no answer-bearing field names anywhere', () => {
  const bad = /^(ok|correct|answer|answers|key|keys|map|hint|hints|explanation|feedback|to|credit)$/i;
  const found = [];
  (function walk(o, trail) {
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, trail + '[' + i + ']'));
    if (o && typeof o === 'object') Object.keys(o).forEach((k) => { if (bad.test(k)) found.push(trail + '.' + k); walk(o[k], trail + '.' + k); });
  })(pub, 'items');
  assert.deepEqual(found, []);
});

test('label-the-diagram figures: alt text, description and SVG source never contain one of the labels', () => {
  const labelItems = allItems.filter((i) => i.assign && i.assign.mode === 'label');
  assert.ok(labelItems.length >= 2, 'expected at least the two anatomy label items');
  labelItems.forEach((item) => {
    const fig = pub.figures[item.assign.figure];
    assert.ok(fig, item.id + ' has a figure');
    const texts = [fig.alt, fig.desc, fs.readFileSync(path.join(root, fig.src), 'utf8')].map((t) => t.toLowerCase());
    item.assign.cards.forEach((c) => {
      const name = c.text.trim().toLowerCase();
      texts.forEach((t, k) => assert.ok(t.indexOf(name) < 0, item.id + ': the ' + ['alt text', 'description', 'SVG source'][k] + ' contains the label "' + c.text + '"'));
    });
  });
});

test('SVG figures contain no XML comments (they used to name the structures next to the shapes)', () => {
  fs.readdirSync(path.join(root, 'assets')).filter((f) => f.endsWith('.svg')).forEach((f) => {
    assert.ok(!/<!--/.test(fs.readFileSync(path.join(root, 'assets', f), 'utf8')), f + ' has an XML comment');
  });
});

test('every figure marker named in the description exists on the figure', () => {
  Object.keys(pub.figures).forEach((k) => {
    const fig = pub.figures[k];
    const mentioned = Array.from(fig.desc.matchAll(/Marker (\d)/g)).map((m) => Number(m[1]));
    mentioned.forEach((n) => assert.ok(fig.markers.some((m) => m.n === n), k + ' description mentions marker ' + n + ' which does not exist'));
    fig.markers.forEach((m) => assert.ok(mentioned.includes(m.n), k + ' description does not locate marker ' + m.n));
  });
});

test('every single-answer item has at least 5 options, every item has points and a time estimate', () => {
  allItems.forEach((i) => {
    if (i.type === 'single') assert.ok(i.options.length >= 5, i.id + ' has ' + i.options.length + ' options');
    assert.ok(Number.isInteger(i.points) && i.points > 0, i.id + ' points');
    assert.ok(i.secs > 0, i.id + ' time estimate');
  });
});

test('public docs and data files do not paste answer text from the private bank', () => {
  const bankPath = path.join(root, 'private/itembank.json');
  if (!fs.existsSync(bankPath)) return; // fresh clone: tools/check-secrets.js covers this when the vault is unlocked
  const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  const files = ['docs', 'content', 'tools/lib', 'README.md'].flatMap((p) => {
    const abs = path.join(root, p);
    if (!fs.existsSync(abs)) return [];
    if (fs.statSync(abs).isFile()) return [abs];
    const out = [];
    (function walk(d) { fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const f = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'demo') walk(f); } else if (/\.(md|json|js)$/.test(e.name) && e.name !== 'items.json') out.push(f); }); })(abs);
    return out;
  });
  const needles = [];
  Object.keys(bank.items).forEach((id) => {
    const b = bank.items[id];
    if (b.explanation && b.explanation.length > 40) needles.push(b.explanation.slice(0, 50));
    (b.hints || []).forEach((h) => { if (h.length > 40) needles.push(h.slice(0, 50)); });
  });
  files.forEach((f) => {
    const t = fs.readFileSync(f, 'utf8');
    needles.forEach((n) => assert.ok(t.indexOf(n) < 0, path.relative(root, f) + ' contains text from the private bank: ' + n));
  });
});
