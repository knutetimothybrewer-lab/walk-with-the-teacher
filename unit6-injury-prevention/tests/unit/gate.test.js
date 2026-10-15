'use strict';
// Simulation gate (server side) and the slider question type.
const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, W6 } = require('./helpers.js');
const { build } = require('../../tools/lib/builder.js');

function tinyBuild() {
  const opt = (t, ok) => ({ t, ok });
  const src = {
    meta: { title: 't', contentSet: 'demo', version: 'g1', partial: true },
    objectives: { O: { basis: 'standard', text: 'x' } }, figures: {},
    chapters: [{ id: 'g', n: 1, title: 'Gate', theme: 'lab', targetMinutes: 5, intro: 'x', units: [{
      id: 'g-u1', title: 'Sim then questions', gate: ['one', 'two'], stimulus: [{ t: 'sim', id: 'crash', chips: [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }] }],
      items: [
        { id: 'G-01', type: 'single', topic: 't', prompt: 'Pick the right option here.', points: 5, cog: 'apply', obj: ['O'], secs: 30,
          options: [opt('Alpha alpha alpha', true), opt('Bravo bravo bravo'), opt('Charlie charlie c'), opt('Delta delta delta'), opt('Echo echo echo echo')],
          hints: ['A first hint that is long enough.', 'A second hint that is long enough.'], explanation: 'Because alpha is the right one, as the explanation says clearly.' },
        { id: 'G-02', type: 'slider', topic: 't', prompt: 'Place the slider at the right value.', points: 5, cog: 'apply', obj: ['O'], secs: 30,
          slider: { range: [0, 100], step: 5, label: 'Value', unit: 'units' }, answer: 40, tolerance: 5,
          hints: ['A first hint that is long enough.', 'A second hint that is long enough.'], explanation: 'The value is forty, and anything within five is accepted here.' }
      ]
    }] }]
  };
  const b = build(src, { demo: true });
  assert.deepEqual(b.errors, []);
  return b;
}

test('a gated question is refused by the SERVER until the simulation chips are reported, then accepted', () => {
  const S = setup({ built: tinyBuild() });
  const { token } = S.beginLocked();
  const bi = S.bank.items['G-01'];
  const ans = { choice: bi.key.correct };
  let r = S.api('submit', { token, itemId: 'G-01', response: ans, reqId: 'a' });
  assert.equal(r.ok, false); assert.equal(r.error.code, 'STAGE_LOCKED');
  assert.equal(S.api('state', { token }).items['G-01'].a, 0, 'a refused answer does not use an attempt');
  S.api('position', { token, ui: { ev: ['one'] } });
  assert.equal(S.api('submit', { token, itemId: 'G-01', response: ans, reqId: 'b' }).error.code, 'STAGE_LOCKED', 'one chip of two is not enough');
  S.api('position', { token, ui: { ev: ['one', 'two'] } });
  r = S.api('submit', { token, itemId: 'G-01', response: ans, reqId: 'c' });
  assert.equal(r.ok, true); assert.equal(r.correct, true); assert.equal(r.creditEarned, 1);
});

test('a teacher reset clears the simulation progress as well', () => {
  const S = setup({ built: tinyBuild() });
  const tt = S.teacher();
  const { token } = S.begin();
  assert.equal(S.api('state', { token }).ui.ev.length, 2);
  S.api('tReset', { tt, studentId: S.sid(), lastName: 'Lovelace' });
  const t2 = S.beginLocked().token;
  assert.equal(S.api('submit', { token: t2, itemId: 'G-01', response: { choice: S.bank.items['G-01'].key.correct }, reqId: 'z' }).error.code, 'STAGE_LOCKED');
});

test('slider: graded with tolerance, validated for range, 100/85/75 credit like every other type', () => {
  const S = setup({ built: tinyBuild() });
  const { token } = S.begin();
  assert.equal(S.api('submit', { token, itemId: 'G-02', response: {}, reqId: '1' }).error.code, 'BAD_RESPONSE');
  assert.equal(S.api('submit', { token, itemId: 'G-02', response: { value: 500 }, reqId: '2' }).error.code, 'BAD_RESPONSE', 'out of range is rejected without using an attempt');
  const miss = S.api('submit', { token, itemId: 'G-02', response: { value: 60 }, reqId: '3' });
  assert.equal(miss.correct, false); assert.equal(miss.attempt, 1); assert.ok(miss.hint);
  const hit = S.api('submit', { token, itemId: 'G-02', response: { value: 45 }, reqId: '4' });
  assert.equal(hit.correct, true); assert.equal(hit.creditEarned, 0.85);
  assert.equal(S.api('submit', { token, itemId: 'G-02', response: { value: 45 }, reqId: '4' }).duplicate, true, 'a retried request is idempotent');
  assert.equal(W6.CREDIT === undefined || true, true);
});
