'use strict';
// The short form that ships (content/src/short.js): 23 units, exactly 100 points, nothing but the listed units removed,
// and the real engine can run a whole class through it. Engine behavior is tested on the full content in engine.test.js.
const test = require('node:test'); const assert = require('node:assert');
const { setup, joinStudent, hasKeys } = require('./helpers');
if (!hasKeys()) { test('short form tests skipped: private/keys.json not present', { skip: true }, () => {}); return; }
if (process.env.CHM_FULL) { test('short form tests skipped: CHM_FULL=1 builds the full assessment', { skip: true }, () => {}); return; }
const G = require('../server/grading'); const split = require('../tools/split'); const S = require('../content/src/short');
const full = split.load({ full: true });

test('short form: 23 of 29 units, exactly 100 points, every location keeps its point share', () => {
  const c = setup({}, { short: true });
  const units = c.engine.unitList;
  assert.equal(units.length, 29 - S.drop.length); assert.equal(c.engine.totalPoints, 100);
  const per = {}; units.forEach(u => per[u.module] = (per[u.module] || 0) + u.points);
  assert.deepEqual(per, { 1: 18, 2: 12, 3: 22, 4: 12, 5: 16, 6: 20 });
  assert.equal(Object.values(c.priv.units).reduce((a, u) => a + u.points, 0), 100, 'server key points add to 100');
  units.forEach(u => assert.equal(c.priv.units[u.id].points, u.points, u.id + ' points agree between page and key'));
});

test('short form: only the listed units are gone; everything else is the full content with new points', () => {
  const c = setup({}, { short: true });
  const ids = new Set(c.engine.unitList.map(u => u.id));
  S.drop.forEach(id => { assert.ok(!ids.has(id), id + ' should be left out'); assert.ok(!c.priv.units[id], id + ' key should be left out'); });
  full.pub.modules.flatMap(m => m.units).forEach(fu => {
    if (S.drop.includes(fu.id)) return;
    const u = c.engine.unitList.find(x => x.id === fu.id); assert.ok(u, fu.id + ' missing');
    assert.deepStrictEqual(u.fields, fu.fields, fu.id + ' fields unchanged'); assert.deepStrictEqual(c.priv.units[fu.id].keys, full.priv.units[fu.id].keys, fu.id + ' answer key unchanged');
    assert.equal(u.points, S.points[fu.id] != null ? S.points[fu.id] : fu.points);
  });
});

test('short form: a class answering everything correctly scores 100.0; everything wrong scores 0.0; both can finalize', () => {
  const c = setup({}, { short: true });
  const j = joinStudent(c, 'good1', 'Good Student'), w = joinStudent(c, 'bad1', 'Wrong Student');
  for (const u of c.engine.unitList) {
    assert.equal(c.call('submitUnit', { sessionId: j.sessionId, token: j.token, requestId: c.rid(), unitId: u.id, response: G.makeCorrect(c.pub, u, c.priv.units[u.id]), expectedAttempt: 1 }).correct, true, u.id);
    for (let a = 1; a <= 3; a++) c.call('submitUnit', { sessionId: w.sessionId, token: w.token, requestId: c.rid(), unitId: u.id, response: G.makeWrong(c.pub, u, c.priv.units[u.id]), expectedAttempt: a });
  }
  const f1 = c.call('finalize', { sessionId: j.sessionId, token: j.token, requestId: c.rid(), confirm: true }), f2 = c.call('finalize', { sessionId: w.sessionId, token: w.token, requestId: c.rid(), confirm: true });
  assert.equal(f1.ok, true); assert.equal(f1.final.results.pctDisplay, '100.0'); assert.equal(f1.final.results.possible, 100); assert.equal(f1.final.results.completed, c.engine.unitList.length);
  assert.equal(f2.ok, true); assert.equal(f2.final.results.pctDisplay, '0.0');
});
