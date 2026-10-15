'use strict';
// Mission 2 model: press-and-hold -> compression, live meter readings, hand placement, and what a scene still needs.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const url = require('url');
const load = () => import(url.pathToFileURL(path.join(__dirname, '..', '..', 'js', 'sims', 'rescue-model.js')).href);

const run = (n, perMin, holdMs, t = 0) => Array.from({ length: n }, (_, i) => { const t0 = t + i * 60000 / perMin; return { t0, t1: t0 + holdMs }; });

test('a steady 110 per minute with a 250 ms hold reads as in-zone rate, good depth and full recoil', async () => {
  const M = await load(); const a = M.analyze(run(12, 110, 250), 'adult');
  assert.ok(Math.abs(a.rate - 110) < 1); assert.equal(a.rateState, 'good');
  assert.ok(a.depth > 2.0 && a.depth < 2.4); assert.equal(a.depthState, 'good');
  assert.equal(a.recoil, 'full'); assert.equal(a.pauses, 0); assert.equal(a.count, 12);
});

test('too slow, too fast, too shallow, too deep, leaning and long pauses are each detected', async () => {
  const M = await load();
  assert.equal(M.analyze(run(10, 80, 250), 'adult').rateState, 'slow');
  assert.equal(M.analyze(run(10, 145, 200), 'adult').rateState, 'fast');
  assert.equal(M.analyze(run(10, 110, 120), 'adult').depthState, 'shallow');
  assert.equal(M.analyze(run(10, 90, 380), 'adult').depthState, 'deep');
  const lean = run(10, 110, 250).map((e, i) => (i === 9 ? { t0: e.t0 - 200, t1: e.t1 - 200 } : e)); // last press starts 95 ms after the previous release
  assert.equal(M.analyze(lean, 'adult').recoil, 'leaning');
  const paused = run(5, 110, 250).concat(run(5, 110, 250, 7000));
  assert.equal(M.analyze(paused, 'adult').pauses, 1);
  assert.equal(M.analyze(run(1, 110, 250), 'adult').rate, null, 'one press cannot give a rate');
});

test('infants use a gentler depth scale, so the same hold is shallower than for an adult', async () => {
  const M = await load();
  assert.ok(M.depthFromHold(250, 'infant') < M.depthFromHold(250, 'adult'));
  const d = M.depthFromHold(260, 'infant'); assert.ok(d >= 1.4 && d <= 1.6, 'a 260 ms hold is about 1.5 in for an infant, got ' + d);
  assert.equal(M.depthFromHold(5000, 'adult'), M.MAX_DEPTH_IN, 'depth is capped');
});

test('hand placement: adult needs the lower half of the breastbone on the center line; infants just below the nipple line', async () => {
  const M = await load();
  assert.equal(M.placementFeedback(0.5, 0.55, 'adult').ok, true);
  assert.equal(M.placementFeedback(0.5, 0.2, 'adult').ok, false);
  assert.equal(M.placementFeedback(0.5, 0.9, 'adult').ok, false);
  assert.equal(M.placementFeedback(0.2, 0.55, 'adult').ok, false);
  assert.equal(M.placementFeedback(0.5, 0.5, 'infant').ok, true);
  assert.equal(M.placementFeedback(0.5, 0.3, 'infant').ok, false);
});

test('scene needs: adult is hands-only; drowning and infant also need an airway and breaths', async () => {
  const M = await load();
  const s = { responseChecked: true, breathingChecked: true, called: true, airwayOpened: false, placed: true, compressions: 30, breaths: 0 };
  assert.deepEqual(M.sceneNeeds('adult', s), []);
  assert.ok(M.sceneNeeds('drowning', s).includes('open the airway'));
  assert.ok(M.sceneNeeds('infant', s).includes('give 2 rescue breaths'));
  assert.deepEqual(M.sceneNeeds('drowning', Object.assign({}, s, { airwayOpened: true, breaths: 2 })), []);
  assert.ok(M.sceneNeeds('adult', Object.assign({}, s, { compressions: 12 }))[0].includes('12 so far'));
});
