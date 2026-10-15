'use strict';
// Mission 5 model: phone choices change reaction time and stopping distance; the ruler becomes a reaction time.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const url = require('url');
const load = () => import(url.pathToFileURL(path.join(__dirname, '..', '..', 'js', 'sims', 'road-model.js')).href);

test('more kinds of distraction mean a slower reaction, in every mode', async () => {
  const M = await load();
  for (const mode of ['drive', 'bike', 'walk']) {
    const order = ['dnd', 'ignore', 'glance', 'read', 'type'].map((c) => M.reactionTime(mode, c));
    assert.equal(order[0], order[1], 'ignoring the buzz costs nothing');
    assert.ok(order[2] > order[1] && order[3] > order[2] && order[4] > order[3], mode + ' reaction times rise with distraction');
    assert.equal(M.reactionTime(mode, 'stop'), order[0]);
  }
  assert.deepEqual(M.CHOICES.type.types.slice().sort(), ['eyes', 'hands', 'mind'], 'typing a reply pulls all three ways');
  assert.ok(M.CHOICES.voice.delay < M.CHOICES.read.delay);
});

test('driving at 35 mph: attentive and Do Not Disturb stop in time, typing a reply does not', async () => {
  const M = await load();
  const calm = M.trip('drive', 35, 'dnd'), ign = M.trip('drive', 35, 'ignore'), typ = M.trip('drive', 35, 'type');
  assert.equal(calm.hit, false); assert.equal(ign.hit, false); assert.ok(calm.margin > 10);
  assert.equal(typ.hit, true); assert.ok(typ.impactMph > 5 && typ.impactMph <= 35);
  assert.ok(typ.totalFt > calm.totalFt);
  assert.ok(Math.abs(typ.reactFt - M.feetPerSecond(35) * typ.reactionTime) < 1e-9, 'reaction distance is speed times time');
  assert.ok(Math.abs(typ.brakeFt - calm.brakeFt) < 1e-9, 'braking distance does not depend on the phone');
});

test('speed matters: braking distance grows with the square of speed', async () => {
  const M = await load();
  const b25 = M.trip('drive', 25, 'ignore').brakeFt, b50 = M.trip('drive', 50, 'ignore').brakeFt;
  assert.ok(Math.abs(b50 / b25 - 4) < 1e-9);
  assert.equal(M.trip('drive', 55, 'glance').hit, true, 'a quick glance at 55 mph is enough to hit the car ahead');
  assert.equal(M.trip('drive', 25, 'glance').hit, false);
});

test('biking and walking: a distracted rider or walker also reacts late, a focused one stops', async () => {
  const M = await load();
  for (const mode of ['bike', 'walk']) {
    const mph = M.MODES[mode].speed;
    assert.equal(M.trip(mode, mph, 'ignore').hit, false, mode + ' focused');
    assert.equal(M.trip(mode, mph, 'type').hit, true, mode + ' typing');
  }
});

test('positionAt: the vehicle moves at full speed during the reaction, then slows, and stops or hits', async () => {
  const M = await load();
  const tr = M.trip('drive', 35, 'ignore');
  const p1 = M.positionAt(tr, tr.reactionTime * 0.5); assert.ok(!p1.braking && Math.abs(p1.x - M.feetPerSecond(35) * tr.reactionTime * 0.5) < 1e-9);
  const end = M.positionAt(tr, tr.reactionTime + tr.brakeSeconds + 1); assert.ok(end.stopped && Math.abs(end.x - tr.totalFt) < 0.5);
  const bad = M.trip('drive', 35, 'type'); assert.ok(M.positionAt(bad, 20).hit);
});

test('ruler drop: distance and time convert both ways, and bigger catch distances mean slower reactions', async () => {
  const M = await load();
  assert.ok(Math.abs(M.reactionFromCm(M.fallCm(0.2)) - 0.2) < 1e-9);
  assert.ok(Math.abs(M.fallCm(0.2) - 19.62) < 0.01);
  assert.ok(M.reactionFromCm(30) > M.reactionFromCm(15));
  assert.equal(Math.round(M.reactionFromCm(15) * 1000), 175); assert.equal(Math.round(M.reactionFromCm(30) * 1000), 247);
});
