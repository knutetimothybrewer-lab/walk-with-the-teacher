'use strict';
// The locked, printable final report: per-question results with no answers in them.
const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, correctResponse, wrongResponse } = require('./helpers.js');

test('completion carries who, when and a result row per question that adds up to the score, with no answer material', () => {
  const S = setup(); const { token } = S.begin();
  const ids = S.ids();
  S.api('submit', { token, itemId: ids[0], response: correctResponse(S.bank.items[ids[0]]), reqId: 'a' });
  S.api('submit', { token, itemId: ids[1], response: wrongResponse(S.bank.items[ids[1]]), reqId: 'b' });
  S.api('submit', { token, itemId: ids[1], response: correctResponse(S.bank.items[ids[1]]), reqId: 'c' });
  for (let i = 0; i < 3; i++) S.api('submit', { token, itemId: ids[2], response: wrongResponse(S.bank.items[ids[2]]), reqId: 'd' + i });
  const fin = S.api('finish', { token, confirm: true });
  const c = fin.completion;
  assert.deepEqual(c.student, { firstName: 'Ada', lastName: 'Lovelace', block: 'Block 1/2' });
  assert.ok(c.startTime && c.submittedAt >= c.startTime);
  assert.equal(c.items.length, ids.length);
  assert.equal(c.items[0].status, 'correct'); assert.equal(c.items[0].attempts, 1);
  assert.equal(c.items[1].attempts, 2); assert.equal(c.items[1].earned, Math.round(S.bank.items[ids[1]].points * 0.85 * 100) / 100);
  assert.equal(c.items[2].status, 'locked'); assert.equal(c.items[2].earned, 0);
  assert.equal(c.items[3].status, 'unanswered');
  assert.equal(Math.round(c.items.reduce((a, i) => a + i.earned, 0) * 100) / 100, c.points);
  const text = JSON.stringify(c);
  ['"key"', '"hint', '"explanation"', '"correct":', '"map"', '"order":'].forEach((w) => assert.ok(!text.includes(w), 'completion contains ' + w));
});

test('with scores hidden the report carries no per-question rows', () => {
  const S = setup(); const tt = S.teacher();
  assert.equal(S.api('tSetSettings', { tt, settings: { showScore: false } }).ok, true);
  const { token } = S.begin(); const fin = S.api('finish', { token, confirm: true });
  assert.equal(fin.completion.items, undefined); assert.equal(fin.completion.points, undefined);
});
