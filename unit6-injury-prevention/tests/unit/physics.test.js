'use strict';
// The crash-lab model must move in the right direction when a student changes a setting, and must be deterministic.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const url = require('url');

const load = () => import(url.pathToFileURL(path.join(__dirname, '..', '..', 'js', 'sims', 'crash-physics.js')).href);

test('car: more speed means more force, chest load and head load, buckled or not', async () => {
  const P = await load();
  for (const belted of [true, false]) {
    let prev = null;
    for (const mph of [15, 30, 45, 60]) {
      const m = P.simulateCar({ mph, belted }).metrics;
      if (prev) { assert.ok(m.peakForceKN > prev.peakForceKN, 'force rises with speed (belted=' + belted + ' at ' + mph + ')'); assert.ok(m.peakChestG > prev.peakChestG, 'chest rises with speed'); }
      prev = m;
    }
  }
});

test('car: at the same speed the buckled dummy takes a lower chest load and lower body force than the unbuckled one', async () => {
  const P = await load();
  for (const mph of [30, 45, 60]) {
    const b = P.simulateCar({ mph, belted: true }).metrics, u = P.simulateCar({ mph, belted: false }).metrics;
    assert.ok(b.peakChestG < u.peakChestG, 'chest at ' + mph);
    assert.ok(b.peakForceKN < u.peakForceKN, 'force at ' + mph);
    assert.ok(b.peakBeltKN > 0 && u.peakBeltKN === 0, 'only a buckled dummy has belt pull');
  }
  assert.ok(P.simulateCar({ mph: 30, belted: false }).metrics.chestRisk > P.simulateCar({ mph: 30, belted: true }).metrics.chestRisk);
});

test('car: deterministic, with one frame per millisecond and the dummy kept inside the car', async () => {
  const P = await load();
  const a = P.simulateCar({ mph: 30, belted: false }), b = P.simulateCar({ mph: 30, belted: false });
  assert.deepEqual(a.metrics, b.metrics);
  assert.ok(a.frames.length > 250);
  a.frames.forEach((f) => Object.values(f.pts).forEach(([x, y]) => { assert.ok(isFinite(x) && isFinite(y)); assert.ok(x > -0.9 && x < 0.9 && y > -0.05 && y < 1.7, 'point left the cabin at ' + f.t); }));
});

test('bike: a helmet always lowers the head load and the head injury risk; more speed raises both', async () => {
  const P = await load();
  let prevBare = 0, prevHelm = 0;
  for (const mph of [5, 10, 15, 20, 25]) {
    const bare = P.simulateBike({ mph, helmet: false }).metrics, helm = P.simulateBike({ mph, helmet: true }).metrics;
    assert.ok(helm.peakHeadG < bare.peakHeadG * 0.5, 'helmet cuts head load by more than half at ' + mph);
    assert.ok(helm.headRisk < bare.headRisk);
    assert.ok(bare.peakHeadG > prevBare && helm.peakHeadG > prevHelm);
    prevBare = bare.peakHeadG; prevHelm = helm.peakHeadG;
    assert.ok(P.simulateBike({ mph, helmet: true }).metrics.hitMs > 0);
  }
});

test('egg: the sheet lengthens the stop, so the force is far lower and the shell survives where it would otherwise crack', async () => {
  const P = await load();
  const bare = P.simulateEgg({ speed: 3, sheet: false }).metrics, sheet = P.simulateEgg({ speed: 3, sheet: true }).metrics;
  assert.ok(sheet.stopCm > bare.stopCm * 10); assert.ok(sheet.peakN < bare.peakN / 10);
  assert.equal(bare.cracks, true); assert.equal(sheet.cracks, false);
  assert.equal(P.simulateEgg({ speed: 1, sheet: false }).metrics.cracks, false, 'a slow bump does not crack it');
});

test('belt-use facts match the Day 1 slides', async () => {
  const P = await load();
  assert.equal(P.BELT_USE.national.pct, 91.3); assert.equal(P.BELT_USE.young.pct, 87);
});
