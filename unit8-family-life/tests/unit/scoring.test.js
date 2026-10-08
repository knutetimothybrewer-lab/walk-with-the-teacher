'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setup, correctResponse, wrongResponse, W8 } = require('./helpers.js');

/* ------------------------------------------------------------------ SHA-256 (hand-rolled, so it must match Node) */
test('sha256Hex matches Node crypto for assorted inputs', () => {
  const samples = ['', 'a', 'abc', 'The quick brown fox jumps over the lazy dog', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000), 'café éè 中文 😀', 'Block 1/2|C1-01'];
  samples.forEach((s) => assert.equal(W8.sha256Hex(s), crypto.createHash('sha256').update(s, 'utf8').digest('hex'), JSON.stringify(s.slice(0, 20))));
});

test('canon() sorts keys so hashes are order independent', () => {
  assert.equal(W8.canon({ b: 1, a: [2, { d: 1, c: 2 }] }), W8.canon({ a: [2, { c: 2, d: 1 }], b: 1 }));
});

/* ------------------------------------------------------------------ attempts and credit */
function firstOfType(S, type) { return S.ids().find((id) => S.bank.items[id].type === type && !S.bank.items[id].unlockAfter); }

test('correct on attempt 1 earns 100% and shows the explanation', () => {
  const S = setup(); const { token } = S.begin();
  const id = firstOfType(S, 'single'), bi = S.bank.items[id];
  const r = S.api('submit', { token, itemId: id, response: correctResponse(bi), reqId: 'r1' });
  assert.equal(r.ok, true); assert.equal(r.correct, true);
  assert.equal(r.creditEarned, 1); assert.equal(r.attempt, 1); assert.equal(r.attemptsRemaining, 0);
  assert.equal(r.pointsEarned, bi.points);
  assert.ok(r.explanation && r.explanation.length > 10);
  assert.equal(r.hint, undefined);
});

test('wrong then correct earns 85%; wrong, wrong, correct earns 75%', () => {
  const S = setup(); const { token } = S.begin();
  const id = firstOfType(S, 'single'), bi = S.bank.items[id];
  let r = S.api('submit', { token, itemId: id, response: wrongResponse(bi), reqId: 'a' });
  assert.equal(r.correct, false); assert.equal(r.attemptsRemaining, 2); assert.equal(r.creditEarned, null);
  r = S.api('submit', { token, itemId: id, response: correctResponse(bi), reqId: 'b' });
  assert.equal(r.creditEarned, 0.85); assert.equal(r.attempt, 2);

  const id2 = S.ids().find((x) => S.bank.items[x].type === 'multi'), bi2 = S.bank.items[id2];
  S.api('submit', { token, itemId: id2, response: wrongResponse(bi2), reqId: 'c' });
  S.api('submit', { token, itemId: id2, response: wrongResponse(bi2), reqId: 'd' });
  r = S.api('submit', { token, itemId: id2, response: correctResponse(bi2), reqId: 'e' });
  assert.equal(r.creditEarned, 0.75); assert.equal(r.attempt, 3);
});

test('three wrong attempts = 0%, locked, explanation shown, no further grading', () => {
  const S = setup(); const { token } = S.begin();
  const id = firstOfType(S, 'single'), bi = S.bank.items[id];
  const r1 = S.api('submit', { token, itemId: id, response: wrongResponse(bi), reqId: '1' });
  const r2 = S.api('submit', { token, itemId: id, response: wrongResponse(bi), reqId: '2' });
  const r3 = S.api('submit', { token, itemId: id, response: wrongResponse(bi), reqId: '3' });
  assert.equal(r1.hintLevel, 1); assert.equal(r2.hintLevel, 2);
  assert.ok(r1.hint && r2.hint && r1.hint !== r2.hint);
  assert.equal(r3.locked, true); assert.equal(r3.creditEarned, 0); assert.equal(r3.pointsEarned, 0);
  assert.equal(r3.hint, undefined);
  assert.ok(r3.explanation);
  // a later correct answer must not resurrect credit
  const r4 = S.api('submit', { token, itemId: id, response: correctResponse(bi), reqId: '4' });
  assert.equal(r4.alreadyDone, true);
  const st = S.api('state', { token });
  assert.equal(st.items[id].c, 0); assert.equal(st.items[id].l, 1); assert.equal(st.items[id].a, 3);
});

test('hint text is revealed only up to the attempts used and never before', () => {
  const S = setup(); const { token } = S.begin();
  const id = firstOfType(S, 'single'), bi = S.bank.items[id];
  let st = S.api('state', { token });
  assert.equal(st.items[id].hints, undefined); assert.equal(st.items[id].ex, undefined);
  S.api('submit', { token, itemId: id, response: wrongResponse(bi), reqId: 'h1' });
  st = S.api('state', { token });
  assert.deepEqual(st.items[id].hints, [bi.hints[0]]); assert.equal(st.items[id].ex, undefined);
  S.api('submit', { token, itemId: id, response: wrongResponse(bi), reqId: 'h2' });
  st = S.api('state', { token });
  assert.deepEqual(st.items[id].hints, [bi.hints[0], bi.hints[1]]);
});

/* ------------------------------------------------------------------ every item type, all-or-nothing */
test('every item type grades correct and incorrect responses', () => {
  const S = setup(); const { token } = S.begin();
  const seen = new Set();
  S.ids().forEach((id) => {
    const bi = S.bank.items[id];
    // unlock chain: answer prerequisites first (ids are in order)
    const wrong = S.api('submit', { token, itemId: id, response: wrongResponse(bi), reqId: id + 'w' });
    if (wrong.ok === false) { assert.equal(wrong.error.code, 'STAGE_LOCKED'); return; }
    assert.equal(wrong.correct, false, id + ' wrong response graded as correct');
    const right = S.api('submit', { token, itemId: id, response: correctResponse(bi), reqId: id + 'r' });
    assert.equal(right.correct, true, id + ' correct response graded as wrong');
    assert.equal(right.creditEarned, 0.85);
    seen.add(bi.type + (bi.type === 'assign' ? ':' + bi.struct.fill : ''));
  });
  ['single', 'multi', 'order', 'numeric', 'assign:cards', 'assign:targets'].forEach((t) => assert.ok(seen.has(t), 'demo bank has no ' + t + ' item'));
});

test('multi-select: a missing option and an extra option are both wrong', () => {
  const S = setup(); const { token } = S.begin();
  const id = S.ids().find((x) => S.bank.items[x].type === 'multi'), bi = S.bank.items[id];
  const extra = bi.struct.optionIds.find((o) => !bi.key.correct.includes(o));
  let r = S.api('submit', { token, itemId: id, response: { choices: bi.key.correct.concat([extra]) }, reqId: 'x1' });
  assert.equal(r.correct, false);
  r = S.api('submit', { token, itemId: id, response: { choices: bi.key.correct.slice(1) }, reqId: 'x2' });
  assert.equal(r.correct, false);
  r = S.api('submit', { token, itemId: id, response: { choices: bi.key.correct.slice().reverse() }, reqId: 'x3' });
  assert.equal(r.correct, true, 'order of selection must not matter');
});

test('numeric: tolerance, numeric strings, and range', () => {
  const S = setup(); const { token } = S.begin();
  const id = S.ids().find((x) => S.bank.items[x].type === 'numeric'), bi = S.bank.items[id];
  let r = S.api('submit', { token, itemId: id, response: { value: 'abc' }, reqId: 'n1' });
  assert.equal(r.ok, false); assert.equal(r.error.code, 'BAD_RESPONSE');
  r = S.api('submit', { token, itemId: id, response: { value: 1e9 }, reqId: 'n2' });
  assert.equal(r.error.code, 'BAD_RESPONSE');
  r = S.api('submit', { token, itemId: id, response: { value: String(bi.key.value) }, reqId: 'n3' });
  assert.equal(r.correct, true);
});

test('numeric tolerance is honored when the key sets one', () => {
  const S = setup(); const { token } = S.begin();
  const id = S.ids().find((x) => S.bank.items[x].type === 'numeric');
  S.bank.items[id].key.tolerance = 0.5; S.store.setBank(S.bank);
  const r = S.api('submit', { token, itemId: id, response: { value: S.bank.items[id].key.value + 0.4 }, reqId: 't1' });
  assert.equal(r.correct, true);
});

/* ------------------------------------------------------------------ malformed input never costs an attempt */
test('malformed or incomplete responses are rejected without consuming an attempt', () => {
  const S = setup(); const { token } = S.begin();
  const checks = [];
  S.ids().filter((id) => !S.bank.items[id].unlockAfter).forEach((id) => {
    const bi = S.bank.items[id];
    const bad = bi.type === 'single' ? { choice: 'nope' }
      : bi.type === 'multi' ? { choices: [] }
        : bi.type === 'assign' ? { map: { x: 'y' } }
          : bi.type === 'order' ? { order: ['a'] } : { value: NaN };
    const r = S.api('submit', { token, itemId: id, response: bad, reqId: id + 'bad' });
    assert.equal(r.ok, false, id); assert.equal(r.error.code, 'BAD_RESPONSE', id);
    checks.push(id);
    assert.equal(S.api('state', { token }).items[id].a, 0, id + ' attempt count changed');
  });
  assert.ok(checks.length >= 5);
  assert.equal(S.api('submit', { token, itemId: checks[0], response: null }).error.code, 'BAD_RESPONSE');
});

test('label/match items need every box filled with distinct cards; classify needs every card placed', () => {
  const S = setup(); const { token } = S.begin();
  const match = S.ids().find((x) => S.bank.items[x].struct.fill === 'targets'), mb = S.bank.items[match];
  const full = correctResponse(mb);
  const dup = { map: Object.assign({}, full.map) }; const ks = Object.keys(dup.map); dup.map[ks[1]] = dup.map[ks[0]];
  assert.equal(S.api('submit', { token, itemId: match, response: dup, reqId: 'm1' }).error.code, 'BAD_RESPONSE');
  const part = { map: { [ks[0]]: full.map[ks[0]] } };
  assert.equal(S.api('submit', { token, itemId: match, response: part, reqId: 'm2' }).error.code, 'BAD_RESPONSE');
  const cls = S.ids().find((x) => S.bank.items[x].struct.fill === 'cards' && !S.bank.items[x].unlockAfter), cb = S.bank.items[cls];
  const cpart = { map: { [Object.keys(cb.key.map)[0]]: Object.values(cb.key.map)[0] } };
  assert.equal(S.api('submit', { token, itemId: cls, response: cpart, reqId: 'm3' }).error.code, 'BAD_RESPONSE');
});

/* ------------------------------------------------------------------ idempotency and stage gating */
test('a retried request (same reqId) returns the same result and does not use another attempt', () => {
  const S = setup(); const { token } = S.begin();
  const id = firstOfType(S, 'single'), bi = S.bank.items[id];
  const a = S.api('submit', { token, itemId: id, response: wrongResponse(bi), reqId: 'dup-1' });
  const b = S.api('submit', { token, itemId: id, response: wrongResponse(bi), reqId: 'dup-1' });
  assert.equal(b.duplicate, true); assert.equal(b.attempt, a.attempt); assert.equal(b.hint, a.hint);
  assert.equal(S.api('state', { token }).items[id].a, 1);
});

test('later stages unlock only after the earlier stage is correct or locked', () => {
  const S = setup(); const { token } = S.begin();
  const second = S.ids().find((x) => S.bank.items[x].unlockAfter), prev = S.bank.items[second].unlockAfter, pb = S.bank.items[prev];
  assert.equal(S.api('submit', { token, itemId: second, response: correctResponse(S.bank.items[second]), reqId: 'g0' }).error.code, 'STAGE_LOCKED');
  // wrong attempt on prev does not unlock
  S.api('submit', { token, itemId: prev, response: wrongResponse(pb), reqId: 'g1' });
  assert.equal(S.api('submit', { token, itemId: second, response: correctResponse(S.bank.items[second]), reqId: 'g2' }).error.code, 'STAGE_LOCKED');
  // locking the previous stage (3 wrong) unlocks the next: the student is never stuck
  S.api('submit', { token, itemId: prev, response: wrongResponse(pb), reqId: 'g3' });
  const lock = S.api('submit', { token, itemId: prev, response: wrongResponse(pb), reqId: 'g4' });
  assert.equal(lock.locked, true);
  assert.equal(S.api('submit', { token, itemId: second, response: correctResponse(S.bank.items[second]), reqId: 'g5' }).correct, true);
});

/* ------------------------------------------------------------------ no key leakage */
test('no server response ever contains an answer key before an item is finished', () => {
  const S = setup(); const { token, begin } = S.begin();
  const blob = [JSON.stringify(begin), JSON.stringify(S.api('state', { token })), JSON.stringify(S.api('ping'))];
  const id = firstOfType(S, 'single'), bi = S.bank.items[id];
  blob.push(JSON.stringify(S.api('submit', { token, itemId: id, response: wrongResponse(bi), reqId: 'k1' })));
  const all = blob.join('\n');
  assert.equal(/"key"|"correct":\s*"o|"order":\s*\["s/.test(all.replace(/"correct":(true|false)/g, '')), false, 'a key-looking structure appeared in a response');
  Object.keys(S.bank.items).forEach((i) => assert.equal(all.includes(S.bank.items[i].explanation), false, 'explanation leaked before the item was done: ' + i));
});

/* ------------------------------------------------------------------ totals */
test('scores add up: points, percent, per-chapter, answered counts', () => {
  const S = setup(); const { token } = S.begin();
  const total = S.ids().reduce((a, id) => a + S.bank.items[id].points, 0);
  S.ids().forEach((id) => {
    const bi = S.bank.items[id];
    // first-try correct on odd items, second-try on even
    if (S.ids().indexOf(id) % 2) S.api('submit', { token, itemId: id, response: wrongResponse(bi), reqId: id + 'w' });
    S.api('submit', { token, itemId: id, response: correctResponse(bi), reqId: id + 'r' });
  });
  const fin = S.api('finish', { token, confirm: true });
  assert.equal(fin.ok, true);
  const expected = S.ids().reduce((a, id, i) => a + S.bank.items[id].points * (i % 2 ? 0.85 : 1), 0);
  assert.equal(fin.completion.points, Math.round(expected * 100) / 100);
  assert.equal(fin.completion.possible, total);
  assert.equal(fin.completion.percent, Math.round(expected / total * 1000) / 10);
  assert.equal(fin.completion.answered, S.ids().length);
  const chSum = Object.values(fin.completion.chapters).reduce((a, c) => a + c.earned, 0);
  assert.ok(Math.abs(chSum - fin.completion.points) < 0.05);
});
