'use strict';
const test = require('node:test'); const assert = require('node:assert');
const { setup, joinStudent, hasKeys } = require('./helpers');
if (!hasKeys()) { test('skipped: private/keys.json not present', { skip: true }, () => {}); return; }
const G = require('../server/grading');
test('smoke: join + correct first attempt', () => {
  const c = setup(); const j = joinStudent(c);
  const u = c.engine.unitList[0], pu = c.priv.units[u.id];
  const r = c.call('submitUnit', { sessionId: j.sessionId, token: j.token, requestId: c.rid(), unitId: u.id, response: G.makeCorrect(c.pub, u, pu), expectedAttempt: 1 });
  assert.equal(r.ok, true); assert.equal(r.correct, true); assert.equal(r.earned, 4);
});
