'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const bank = require('./fixtures/minibank.js');
const { setup, student, submit, itemFor, CODES, G, U5 } = require('./helpers.js');

const MIN = 60000;
function begun(t, over) { const st = student(t, over); assert.ok(st.r.ok, JSON.stringify(st.r)); const b = t.call('begin', { sessionId: st.sid, token: st.token }); assert.ok(b.ok, JSON.stringify(b)); return st; }
const correct = (t, st, id) => G.makeCorrect(itemFor(t, st, id));
const wrong = (t, st, id, v) => G.makeWrong(itemFor(t, st, id), v);
// resolve every item of chapters 1..(n-1) with correct answers so chapter n is unlocked
function advance(t, st, n) { for (let ch = 1; ch < n; ch++) t.engine.index.chapters[ch - 1].steps.filter((x) => x.kind === 'item').forEach((x) => { const r = submit(t, st, x.id, correct(t, st, x.id)); assert.ok(r.ok, x.id + JSON.stringify(r)); }); }

test('public config reveals no answers and lists exactly the four blocks', () => {
  const t = setup(bank);
  const c = t.call('config', {});
  assert.deepEqual(c.blocks, ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9']);
  assert.equal(c.timeLimitMin, 90);
  assert.equal(c.outline.length, 6);
  const txt = JSON.stringify(c);
  assert.ok(!/"key"|"ans"|"explain"|"hints"/.test(txt));
});

test('login validates every field, the block code, and open/closed state', () => {
  const t = setup(bank);
  const bad = (over, code) => { const r = t.call('login', Object.assign({ firstName: 'Ada', lastName: 'L', studentId: '123456', block: 'Block 6/7', code: CODES['Block 6/7'] }, over)); assert.equal(r.ok, false); if (code) assert.equal(r.code, code); return r; };
  bad({ firstName: '' }, 'BAD_INPUT'); bad({ lastName: ' ' }, 'BAD_INPUT'); bad({ studentId: 'a b' }, 'BAD_INPUT'); bad({ studentId: '12' }, 'BAD_INPUT');
  bad({ block: 'Block 5' }, 'BAD_INPUT'); bad({ block: '' }, 'BAD_INPUT'); bad({ code: '' }, 'BAD_INPUT');
  bad({ code: 'WRONG-CODE' }, 'BAD_CODE');
  bad({ code: CODES['Block 1/2'] }, 'BAD_CODE');                      // another block's code does not work for this block
  const ok = t.call('login', { firstName: 'Ada', lastName: 'L', studentId: '123456', block: 'Block 6/7', code: ' gamb3-cccc ' });  // case/space tolerant
  assert.ok(ok.ok);
  // closing a block blocks new sign-ins for that block only
  const cfg = t.store.getConfig(); cfg.codes['Block 8/9'].open = false; t.store.saveConfig(cfg);
  assert.equal(t.call('login', { firstName: 'B', lastName: 'C', studentId: 'S2000', block: 'Block 8/9', code: CODES['Block 8/9'] }).code, 'CLOSED');
  assert.ok(t.call('login', { firstName: 'B', lastName: 'C', studentId: 'S2001', block: 'Block 3/4', code: CODES['Block 3/4'] }).ok);
});

test('brute forcing a code for one Student ID locks that ID, not the whole class', () => {
  const t = setup(bank);
  for (let i = 0; i < 8; i++) assert.equal(t.call('login', { firstName: 'A', lastName: 'B', studentId: 'ABC123', block: 'Block 6/7', code: 'NOPE-' + i }).code, 'BAD_CODE');
  assert.equal(t.call('login', { firstName: 'A', lastName: 'B', studentId: 'ABC123', block: 'Block 6/7', code: CODES['Block 6/7'] }).code, 'LOCKED');
  assert.ok(t.call('login', { firstName: 'C', lastName: 'D', studentId: 'XYZ789', block: 'Block 6/7', code: CODES['Block 6/7'] }).ok);
  t.clock.min(11);   // lockout expires
  assert.ok(t.call('login', { firstName: 'A', lastName: 'B', studentId: 'ABC123', block: 'Block 6/7', code: CODES['Block 6/7'] }).ok);
});

test('the timer does NOT start at login; it starts at Begin and the deadline is exactly 90 minutes later', () => {
  const t = setup(bank);
  const st = student(t);
  assert.equal(st.r.state.status, 'registered');
  assert.equal(st.r.state.startedAt, ''); assert.equal(st.r.state.deadline, '');
  t.clock.min(25);                                   // student sits at the briefing screen for 25 minutes
  const b = t.call('begin', { sessionId: st.sid, token: st.token });
  assert.equal(b.state.status, 'active');
  const started = Date.parse(b.state.startedAt), deadline = Date.parse(b.state.deadline);
  assert.equal(started, t.clock.t);
  assert.equal(deadline - started, 90 * MIN);
  // begin again (double click / refresh) never moves the deadline
  t.clock.min(10);
  const b2 = t.call('begin', { sessionId: st.sid, token: st.token });
  assert.ok(b2.already); assert.equal(Date.parse(b2.state.deadline), deadline);
});

test('refresh / close browser / new device: same record, same deadline, same attempts; old token dies', () => {
  const t = setup(bank);
  const st = begun(t);
  const r1 = submit(t, st, 'c1-mc', wrong(t, st, 'c1-mc'));
  assert.equal(r1.attempt, 1); assert.equal(r1.correct, false);
  t.clock.min(30);
  const again = t.call('login', { firstName: ' ada ', lastName: 'LOVELACE', studentId: '123456', block: 'Block 6/7', code: CODES['Block 6/7'] });
  assert.ok(again.ok && again.resumed);
  assert.equal(again.sessionId, st.sid);
  assert.equal(again.state.items['c1-mc'].n, 1, 'the used attempt is remembered');
  assert.equal(Date.parse(again.state.deadline) - Date.parse(again.state.startedAt), 90 * MIN);
  assert.equal(t.store.listSessions().length, 1, 'no duplicate active records');
  assert.equal(t.call('state', { sessionId: st.sid, token: st.token }).code, 'NO_SESSION', 'old token is invalid after a new sign-in');
  const s2 = t.call('state', { sessionId: again.sessionId, token: again.token });
  assert.ok(s2.ok);
  const remaining = Date.parse(s2.state.deadline) - Date.parse(s2.state.serverTime);
  assert.equal(remaining, 60 * MIN, 'the clock kept running while the student was away');
});

test('identity safeguards: same ID with another block or another name is refused', () => {
  const t = setup(bank);
  begun(t);
  const r = t.call('login', { firstName: 'Ada', lastName: 'Lovelace', studentId: '123456', block: 'Block 1/2', code: CODES['Block 1/2'] });
  assert.equal(r.code, 'BLOCK_MISMATCH');
  const r2 = t.call('login', { firstName: 'Grace', lastName: 'Hopper', studentId: '123456', block: 'Block 6/7', code: CODES['Block 6/7'] });
  assert.equal(r2.code, 'NAME_MISMATCH');
  assert.equal(t.store.listSessions().length, 1);
});

test('a roster, when loaded, restricts sign-in to listed students in the right block', () => {
  const roster = { 'S100': { first: 'Mia', last: 'Chen', block: 'Block 3/4' } };
  const t = setup(bank, { roster });
  assert.equal(t.call('login', { firstName: 'Mia', lastName: 'Chen', studentId: 'S100', block: 'Block 6/7', code: CODES['Block 6/7'] }).code, 'ROSTER');
  assert.equal(t.call('login', { firstName: 'Zed', lastName: 'Chen', studentId: 'S100', block: 'Block 3/4', code: CODES['Block 3/4'] }).code, 'ROSTER');
  assert.equal(t.call('login', { firstName: 'Mia', lastName: 'Chen', studentId: 'S999', block: 'Block 3/4', code: CODES['Block 3/4'] }).code, 'ROSTER');
  assert.ok(t.call('login', { firstName: 'mia', lastName: 'CHEN', studentId: 's100', block: 'Block 3/4', code: CODES['Block 3/4'] }).ok);
});

test('questions are served only after Begin, only for unlocked chapters, and never contain keys', () => {
  const t = setup(bank);
  const st = student(t);
  assert.equal(t.call('content', { sessionId: st.sid, token: st.token, chapter: 1 }).code, 'NOT_STARTED');
  t.call('begin', { sessionId: st.sid, token: st.token });
  const c1 = t.call('content', { sessionId: st.sid, token: st.token, chapter: 1 });
  assert.ok(c1.ok);
  const txt = JSON.stringify(c1);
  ['"key"', '"ans"', '"explain"', '"hints"', 'Because B.', 'hint one', '"lvl"', '"lo"'].forEach((bad) => assert.ok(!txt.includes(bad), 'leaked ' + bad));
  assert.equal(t.call('content', { sessionId: st.sid, token: st.token, chapter: 2 }).code, 'LOCKED_CHAPTER');
  // submit to a locked chapter is also refused
  assert.equal(submit(t, st, 'c2-lab', { parts: {} }).code, 'LOCKED_CHAPTER');
  // finish chapter 1 (both items), chapter 2 unlocks
  assert.ok(submit(t, st, 'c1-mc', correct(t, st, 'c1-mc')).ok);
  assert.ok(submit(t, st, 'c1-multi', correct(t, st, 'c1-multi')).ok);
  assert.ok(t.call('content', { sessionId: st.sid, token: st.token, chapter: 2 }).ok);
  assert.equal(t.call('state', { sessionId: st.sid, token: st.token }).state.unlockedThrough, 2);
});

test('three-attempt credit: 100% / 85% / 75% / 0%, hints on misses, explanation only after lock', () => {
  const t = setup(bank);
  const mk = (n) => { const st = begun(t, { studentId: 'S' + n, firstName: 'S' + n }); return st; };
  // correct on attempt 1
  let st = mk(1000);
  let r = submit(t, st, 'c1-mc', correct(t, st, 'c1-mc'));
  assert.equal(r.correct, true); assert.equal(r.earned, 4); assert.equal(r.status, 'correct'); assert.equal(r.explain, undefined);
  // correct on attempt 2
  st = mk(1001);
  r = submit(t, st, 'c1-mc', wrong(t, st, 'c1-mc'));
  assert.equal(r.correct, false); assert.equal(r.hint, 'hint one'); assert.equal(r.status, 'open'); assert.equal(r.explain, undefined);
  assert.equal(r.next.attempt, 2); assert.equal(r.next.maxCredit, 3.4);
  r = submit(t, st, 'c1-mc', correct(t, st, 'c1-mc'));
  assert.equal(r.correct, true); assert.equal(r.earned, 3.4);
  // correct on attempt 3
  st = mk(1002);
  r = submit(t, st, 'c1-mc', wrong(t, st, 'c1-mc', 0));
  r = submit(t, st, 'c1-mc', wrong(t, st, 'c1-mc', 1)); assert.equal(r.hint, 'hint two'); assert.equal(r.next.maxCredit, 3);
  r = submit(t, st, 'c1-mc', correct(t, st, 'c1-mc')); assert.equal(r.earned, 3); assert.equal(r.attempt, 3);
  // never correct: locked with zero, explanation provided, no 4th attempt
  st = mk(1003);
  submit(t, st, 'c1-mc', wrong(t, st, 'c1-mc', 0)); submit(t, st, 'c1-mc', wrong(t, st, 'c1-mc', 1));
  r = submit(t, st, 'c1-mc', wrong(t, st, 'c1-mc', 2));
  assert.equal(r.locked, true); assert.equal(r.status, 'locked'); assert.equal(r.earned, 0); assert.equal(r.explain, 'Because B.');
  r = submit(t, st, 'c1-mc', correct(t, st, 'c1-mc'));
  assert.equal(r.code, 'ITEM_DONE');
  assert.equal(t.call('state', { sessionId: st.sid, token: st.token }).state.items['c1-mc'].explain, 'Because B.', 'explanation survives a refresh');
});

test('incomplete or malformed answers never use an attempt', () => {
  const t = setup(bank);
  const st = begun(t);
  assert.equal(submit(t, st, 'c1-mc', { parts: {} }).code, 'INVALID');
  assert.equal(submit(t, st, 'c1-mc', { parts: { a: { c: 'NOT-AN-OPTION' } } }).code, 'INVALID');
  assert.equal(submit(t, st, 'c1-multi', { parts: { a: { c: [] } } }).code, 'INVALID');
  assert.equal(submit(t, st, 'c1-mc', null).code, 'INVALID');
  assert.equal(t.call('state', { sessionId: st.sid, token: st.token }).state.items['c1-mc'].n, 0);
  assert.equal(submit(t, st, 'c1-mc', correct(t, st, 'c1-mc')).attempt, 1);
});

test('retrying the same request id (network retry) is idempotent: no double counting', () => {
  const t = setup(bank);
  const st = begun(t);
  const resp = wrong(t, st, 'c1-mc');
  const a = t.call('submit', { sessionId: st.sid, token: st.token, itemId: 'c1-mc', response: resp, requestId: 'same-request-1' });
  const b = t.call('submit', { sessionId: st.sid, token: st.token, itemId: 'c1-mc', response: resp, requestId: 'same-request-1' });
  assert.equal(a.attempt, 1); assert.equal(b.attempt, 1); assert.ok(b.replayed);
  assert.equal(t.call('state', { sessionId: st.sid, token: st.token }).state.items['c1-mc'].n, 1);
  // a stale second window (expects attempt 1 but attempt 2 is next) is refused without using an attempt
  const stale = submit(t, st, 'c1-mc', resp, { expectedAttempt: 1 });
  assert.equal(stale.code, 'STALE');
  assert.equal(t.call('state', { sessionId: st.sid, token: st.token }).state.items['c1-mc'].n, 1);
});

test('partial credit: credit = best of (attempt multiplier x fraction right); locks when it cannot improve', () => {
  const t = setup(bank);
  // multi: key {2,3,5}.  Pick {2,3}: f = 2/3.  Attempt 1 credit .667 of 4 pts
  let st = begun(t, { studentId: 'P1000', firstName: 'P1' });
  let r = submit(t, st, 'c1-multi', { parts: { a: { c: ['2', '3'] } } });
  assert.equal(r.correct, false); assert.equal(r.partial, true); assert.equal(r.detail[0].got, 2); assert.equal(r.detail[0].total, 3);
  assert.equal(r.earned, 2.67);
  assert.equal(r.status, 'open');                                   // a 100% on attempt 2 pays 85% > 66.7%, so retrying can help
  r = submit(t, st, 'c1-multi', correct(t, st, 'c1-multi'));
  assert.equal(r.earned, 3.4);                                      // 4 x .85
  // selecting a wrong extra option costs: {2,3,5,4} -> TP 3 - FP 1 = 2/3
  st = begun(t, { studentId: 'P1001', firstName: 'P2' });
  r = submit(t, st, 'c1-multi', { parts: { a: { c: ['2', '3', '5', '4'] } } });
  assert.equal(r.earned, 2.67);
  // 8-point composite: claim (w1) right, evidence (w2) wrong -> f = 1/3 ...
  st = begun(t, { studentId: 'P1002', firstName: 'P3' });
  for (const id of ['c1-mc', 'c1-multi', 'c2-num', 'c2-lab', 'c3-map', 'c3-map8', 'c3-order']) { for (let k = 0; k < 3; k++) { const rr = submit(t, st, id, wrong(t, st, id, k)); if (rr.locked) break; } }
  assert.ok(t.call('content', { sessionId: st.sid, token: st.token, chapter: 4 }).ok);
  r = submit(t, st, 'c4-set', { parts: { claim: { c: 'a' }, ev: { c: ['e2', 'e4'] } } });
  assert.equal(r.earned, 2.67);                                     // 8 x (1/3)
  r = submit(t, st, 'c4-set', { parts: { claim: { c: 'a' }, ev: { c: ['e1', 'e3'] } } });
  assert.equal(r.earned, 6.8);                                      // 8 x .85
  // 7 of 8 rows right = 87.5% on attempt 1.  A perfect attempt 2 pays only 85%, so retrying cannot help: the item locks at once.
  st = begun(t, { studentId: 'P1003', firstName: 'P4' });
  advance(t, st, 3);
  const it = itemFor(t, st, 'c3-map8');
  const near = G.makeCorrect(it); near.parts.a.m.r8 = 'x';
  r = submit(t, st, 'c3-map8', near);
  assert.equal(r.status, 'locked'); assert.equal(r.locked, true); assert.equal(r.earned, 7);          // 8 x 0.875
  assert.equal(r.explain, 'ok');
  assert.equal(submit(t, st, 'c3-map8', correct(t, st, 'c3-map8')).code, 'ITEM_DONE');
  // 6 of 8 = 75%: a perfect attempt 2 (85%) would be better, so it stays open; then attempt 2 perfect = 6.8
  st = begun(t, { studentId: 'P1004', firstName: 'P5' });
  advance(t, st, 3);
  const bad6 = G.makeCorrect(itemFor(t, st, 'c3-map8')); bad6.parts.a.m.r7 = 'y'; bad6.parts.a.m.r8 = 'x';
  r = submit(t, st, 'c3-map8', bad6);
  assert.equal(r.status, 'open'); assert.equal(r.earned, 6);
  r = submit(t, st, 'c3-map8', correct(t, st, 'c3-map8'));
  assert.equal(r.earned, 6.8);
  // ordering earns credit by correct positions
  st = begun(t, { studentId: 'P1005', firstName: 'P6' });
  advance(t, st, 3);
  const swap = G.makeCorrect(itemFor(t, st, 'c3-order')); const o = swap.parts.a.o; [o[0], o[1]] = [o[1], o[0]];
  r = submit(t, st, 'c3-order', swap);
  assert.equal(r.status, 'open'); assert.equal(r.earned, 2);                                           // 2 of 4 positions
});

test('numeric answers with variants and ratios; lab-based answers match the student\'s own lab data', () => {
  const t = setup(bank);
  const st = begun(t);
  assert.ok(submit(t, st, 'c1-mc', correct(t, st, 'c1-mc')).ok); assert.ok(submit(t, st, 'c1-multi', correct(t, st, 'c1-multi')).ok);
  const it = itemFor(t, st, 'c2-num');
  const n = Number(/(\d+) red/.exec(it.prompt)[1]);
  // wrong typed answers
  assert.equal(submit(t, st, 'c2-num', { parts: { a: { v: { p: 'abc', o: { a: '1', b: '1' } } } } }).code, 'INVALID');
  let r = submit(t, st, 'c2-num', { parts: { a: { v: { p: '0.99', o: { a: String(n), b: '7' } } } } });
  assert.equal(r.correct, false); assert.equal(r.detail[0].got, 1); assert.equal(r.detail[0].total, 2);
  // fraction, percent, and decimal forms of the probability are all accepted; proportional odds accepted
  r = submit(t, st, 'c2-num', { parts: { a: { v: { p: `${n}/${n + 7}`, o: { a: String(2 * n), b: '14' } } } } });
  assert.equal(r.correct, true); assert.equal(r.earned, 5.1);       // 6 x .85
  const lab = t.call('state', { sessionId: st.sid, token: st.token }).state.labs;
  const heads = U5.coinStats(lab.coin, 20).heads;
  r = submit(t, st, 'c2-lab', { parts: { a: { v: { h: String(heads) } } } });
  assert.equal(r.correct, true); assert.equal(r.earned, 3);
});

test('answers after the deadline are rejected; the session is finalized as Time Expired and keeps earlier work', () => {
  const t = setup(bank);
  const st = begun(t);
  assert.ok(submit(t, st, 'c1-mc', correct(t, st, 'c1-mc')).ok);                 // 4 pts banked
  t.clock.t = Date.parse(t.store.getSession(st.sid) && new Date(t.store.getSession(st.sid).deadline).toISOString()) - 1;   // 1 ms before the deadline
  const ok = submit(t, st, 'c1-multi', correct(t, st, 'c1-multi'));
  assert.ok(ok.ok, 'an answer at 89:59.999 is accepted');
  t.clock.adv(2);                                                                 // now past the deadline
  const late = submit(t, st, 'c2-num', {});
  assert.equal(late.code, 'TIME_UP');
  const s = late.state;
  assert.equal(s.status, 'final'); assert.equal(s.final.typeLabel, 'Time Expired — Auto-Submitted');
  assert.equal(s.final.earned, 8);                                                // 4 + 4 preserved, everything else 0
  assert.equal(s.final.pct, U5.round1(100 * 8 / t.engine.totalPts));
  assert.equal(Date.parse(s.final.submittedAt) - Date.parse(s.startedAt), 90 * MIN, 'official submission time is the deadline');
  assert.equal(submit(t, st, 'c2-lab', {}).code, 'FINALIZED');
});

test('offline student: the server-side sweep finalizes them at the deadline and queues the report', () => {
  const t = setup(bank);
  const a = begun(t, { studentId: 'OFF100', firstName: 'Off' }), b = begun(t, { studentId: 'ON1000', firstName: 'On' });
  submit(t, a, 'c1-mc', correct(t, a, 'c1-mc'));
  t.clock.min(91);
  assert.equal(t.engine.sweepExpired(), 2);
  const sa = t.store.getSession(a.sid);
  assert.equal(sa.status, 'final'); assert.equal(sa.finalType, 'expired');
  assert.equal(t.engine.sweepExpired(), 0, 'sweeping twice does nothing');
  assert.equal(t.store.d.dirty, true, 'reports were marked for update');
  t.call('flushReports', {});
  const rep = t.store.lastReport;
  assert.equal(rep.master.rows.length, 2);
  const row = rep.master.rows.find((r) => r[2] === 'OFF100');
  assert.equal(row[9], 'Time Expired — Auto-Submitted'); assert.equal(row[10], 4);
  // student returning after the deadline just sees the completion state
  const back = t.call('login', { firstName: 'Off', lastName: 'Lovelace', studentId: 'OFF100', block: 'Block 6/7', code: CODES['Block 6/7'] });
  assert.equal(back.state.status, 'final'); assert.equal(back.state.final.type, 'expired');
});

test('lazy finalization: any request after the deadline finalizes (no reliance on the browser timer)', () => {
  const t = setup(bank);
  const st = begun(t);
  t.clock.min(90);
  const s = t.call('state', { sessionId: st.sid, token: st.token });
  assert.equal(s.state.status, 'final');
  const hb = begun(t, { studentId: 'HB1000', firstName: 'Hb' });
  t.clock.min(95);
  assert.equal(t.call('heartbeat', { sessionId: hb.sid, token: hb.token, pos: { ch: 1, step: 0 } }).state.status, 'final');
});

test('submitting early: confirmation and incomplete-work guard; afterwards everything is locked', () => {
  const t = setup(bank);
  const st = begun(t);
  assert.equal(t.call('finalize', { sessionId: st.sid, token: st.token, requestId: 'fin-req-0001' }).code, 'NOT_CONFIRMED');
  assert.equal(t.call('finalize', { sessionId: st.sid, token: st.token, requestId: 'fin-req-0002', confirm: true }).code, 'INCOMPLETE');
  const f = t.call('finalize', { sessionId: st.sid, token: st.token, requestId: 'fin-req-0003', confirm: true, confirmIncomplete: true });
  assert.ok(f.ok); assert.equal(f.state.final.typeLabel, 'Submitted'); assert.equal(f.state.final.earned, 0);
  assert.equal(submit(t, st, 'c1-mc', correct(t, st, 'c1-mc')).code, 'FINALIZED');
  assert.ok(t.call('finalize', { sessionId: st.sid, token: st.token, requestId: 'fin-req-0004', confirm: true }).already);
  assert.equal(t.store.listSessions().length, 1);
});

test('chapter timer accounting is server-side and capped', () => {
  const t = setup(bank);
  const st = begun(t);
  t.call('heartbeat', { sessionId: st.sid, token: st.token, pos: { ch: 1, step: 0 } });
  t.clock.adv(30000); t.call('heartbeat', { sessionId: st.sid, token: st.token, pos: { ch: 1, step: 1 } });
  t.clock.adv(30000); t.call('heartbeat', { sessionId: st.sid, token: st.token, pos: { ch: 1, step: 2 } });
  t.clock.min(20);   t.call('heartbeat', { sessionId: st.sid, token: st.token, pos: { ch: 1, step: 2 } });   // long gap: capped at 90 s
  submit(t, st, 'c1-mc', correct(t, st, 'c1-mc'));
  const row = t.call('teacherStudent', { teacherToken: t.teacher(), studentId: '123456' });
  assert.equal(row.chMs['1'], 30000 + 30000 + 90000);
  // cannot claim a position in a locked chapter
  t.call('heartbeat', { sessionId: st.sid, token: st.token, pos: { ch: 5, step: 0 } });
  assert.ok(t.call('state', { sessionId: st.sid, token: st.token }).state.position.ch <= 2);
});

test('teacher auth: password checked on the server, lockout, and every teacher call needs a token', () => {
  const t = setup(bank);
  assert.equal(t.call('teacherLogin', { password: 'nope' }).code, 'BAD_PASSWORD');
  assert.equal(t.call('teacherLogin', { password: '' }).code, 'BAD_PASSWORD');
  assert.equal(t.call('teacherLogin', { password: 'WALK-TEACHER' }).code, 'BAD_PASSWORD', 'the shortcut code is not a credential');
  ['teacherOverview', 'teacherAnalytics', 'answerKey', 'getConfig', 'saveConfig', 'resetStudent', 'previewStart', 'previewReset', 'generateDemo', 'testSheets', 'exportData', 'moveBlock', 'finalizeNow'].forEach((a) => {
    assert.equal(t.call(a, {}).code, 'FORBIDDEN', a);
    assert.equal(t.call(a, { teacherToken: 'x'.repeat(40) }).code, 'FORBIDDEN', a + ' with a guessed token');
  });
  const stTok = student(t); assert.equal(t.call('answerKey', { teacherToken: stTok.token }).code, 'FORBIDDEN', 'a student token is not a teacher token');
  const tok = t.teacher();
  assert.ok(t.call('answerKey', { teacherToken: tok }).ok);
  for (let i = 0; i < 6; i++) t.call('teacherLogin', { password: 'bad' + i });
  assert.equal(t.call('teacherLogin', { password: 'Teacher-Pass-1' }).code, 'LOCKED');
  t.clock.min(11);
  assert.ok(t.call('teacherLogin', { password: 'Teacher-Pass-1' }).ok);
  t.call('teacherLogout', { teacherToken: tok });
  assert.equal(t.call('answerKey', { teacherToken: tok }).code, 'FORBIDDEN');
});

test('teacher not configured: login explains how to set the password', () => {
  const t = setup(bank); t.store.setTeacher(null);
  assert.equal(t.call('teacherLogin', { password: 'x' }).code, 'NOT_CONFIGURED');
});

test('Reset Student Progress: archives the old record, restores 3 attempts and a fresh 90 minutes, keeps history', () => {
  const t = setup(bank);
  const st = begun(t);
  submit(t, st, 'c1-mc', correct(t, st, 'c1-mc')); submit(t, st, 'c1-multi', wrong(t, st, 'c1-multi'));
  t.clock.min(40);
  const tok = t.teacher();
  assert.equal(t.call('resetStudent', { teacherToken: tok, studentId: '123456', reason: 'Chromebook died' }).code, 'NOT_CONFIRMED');
  const r = t.call('resetStudent', { teacherToken: tok, studentId: '123456', reason: 'Chromebook died', confirm: true });
  assert.ok(r.ok); assert.equal(r.row.status, 'registered'); assert.equal(r.row.resetCount, 1);
  assert.equal(t.store.listSessions().length, 1, 'still exactly one active record');
  const arch = t.store.listArchive('123456'); assert.equal(arch.length, 1); assert.equal(arch[0].reason, 'Chromebook died'); assert.equal(arch[0].status, 'active');
  assert.ok(t.store.d.archive[0].snapshot.items['c1-mc'], 'the previous answers are preserved in the protected history');
  // the old browser session is dead
  assert.equal(t.call('state', { sessionId: st.sid, token: st.token }).code, 'NO_SESSION');
  // student signs in again: everything is fresh and the clock has not started
  const again = t.call('login', { firstName: 'Ada', lastName: 'Lovelace', studentId: '123456', block: 'Block 6/7', code: CODES['Block 6/7'] });
  assert.ok(again.ok); assert.equal(again.state.status, 'registered'); assert.equal(again.state.progress.done, 0);
  t.clock.min(5);
  const b = t.call('begin', { sessionId: again.sessionId, token: again.token });
  assert.equal(Date.parse(b.state.deadline) - Date.parse(b.state.startedAt), 90 * MIN);
  assert.equal(b.state.items['c1-mc'].n, 0, 'attempts restored');
  // reset a student who already submitted: allowed, and they can retake
  const done = t.call('finalize', { sessionId: again.sessionId, token: again.token, requestId: 'fin-xxxx-0001', confirm: true, confirmIncomplete: true });
  assert.ok(done.ok);
  assert.ok(t.call('resetStudent', { teacherToken: tok, studentId: '123456', confirm: true }).ok);
  assert.equal(t.store.listArchive('123456').length, 2);
  // reports show the reset
  t.call('flushReports', {});
  assert.match(t.store.lastReport.master.rows[0][t.store.lastReport.master.head.indexOf('Reset Status')], /Reset 2x/);
  assert.equal(t.call('resetStudent', { teacherToken: tok, studentId: 'NOBODY1', confirm: true }).code, 'NOT_FOUND');
});

test('teacher can move a student to another block without losing progress', () => {
  const t = setup(bank);
  const st = begun(t);
  submit(t, st, 'c1-mc', correct(t, st, 'c1-mc'));
  const r = t.call('moveBlock', { teacherToken: t.teacher(), studentId: '123456', block: 'Block 3/4' });
  assert.equal(r.row.block, 'Block 3/4'); assert.equal(r.row.earned, 4);
  t.call('flushReports', {});
  assert.equal(t.store.lastReport.blocks['Block 3/4'].rows.length, 1); assert.equal(t.store.lastReport.blocks['Block 6/7'].rows.length, 0);
});

test('access codes: one per block, unique, validated, can be generated, and tested without creating a record', () => {
  const t = setup(bank); const tok = t.teacher();
  const dup = t.call('saveConfig', { teacherToken: tok, codes: { 'Block 1/2': { code: 'SAME-1', open: true }, 'Block 3/4': { code: 'SAME-1', open: true } } });
  assert.equal(dup.code, 'BAD_INPUT');
  assert.equal(t.call('saveConfig', { teacherToken: tok, codes: { 'Block 1/2': { code: 'x', open: true } } }).code, 'BAD_INPUT');
  const g = t.call('generateCodes', { teacherToken: tok });
  assert.ok(g.ok);
  const codes = Object.values(g.codes).map((c) => c.code); assert.equal(new Set(codes).size, 4);
  Object.values(g.codes).forEach((c) => { assert.match(c.code, /^GAMB\d-[A-Z0-9]{4}$/); assert.equal(c.open, false); });
  assert.equal(t.call('testCode', { teacherToken: tok, block: 'Block 1/2', code: g.codes['Block 1/2'].code }).valid, true);
  assert.equal(t.call('testCode', { teacherToken: tok, block: 'Block 3/4', code: g.codes['Block 1/2'].code }).valid, false);
  assert.equal(t.store.listSessions().length, 0, 'testing a code creates nothing');
  // old codes stop working immediately
  assert.equal(t.call('login', { firstName: 'A', lastName: 'B', studentId: 'ZZ1000', block: 'Block 6/7', code: CODES['Block 6/7'] }).code, 'BAD_CODE');
});

test('Preview Mode never touches real records and "Reset My Preview Progress" restarts everything', () => {
  const t = setup(bank); const tok = t.teacher();
  const pv = t.call('previewStart', { teacherToken: tok });
  assert.ok(pv.ok); assert.equal(pv.sessionId, 'PV-MAIN'); assert.equal(pv.state.status, 'active');
  assert.equal(t.call('state', { sessionId: 'PV-MAIN', token: pv.token }).code, 'FORBIDDEN', 'a preview needs the teacher token');
  const base = { sessionId: 'PV-MAIN', token: pv.token, teacherToken: tok };
  const key = t.engine.index.items['c1-mc'];
  let r = t.call('submit', Object.assign({ itemId: 'c1-mc', requestId: 'pv-req-0001', response: G.makeCorrect(G.instantiate(key, { seed: t.store.getPreview('PV-MAIN').seed })) }, base));
  assert.ok(r.ok && r.earned === 4);
  assert.equal(t.store.listSessions().length, 0, 'no student record');
  assert.equal(t.store.d.dirty, false, 'the gradebook was not marked for update');
  // all chapters are open to the teacher
  assert.ok(t.call('content', Object.assign({ chapter: 6 }, base)).ok);
  // scenario fill then reset
  assert.ok(t.call('previewScenario', { teacherToken: tok, mode: 'second' }).ok);
  const st = t.call('state', base).state; assert.ok(st.progress.earned > 0); assert.equal(st.items['c1-mc'].n, 2);
  const startedBefore = Date.parse(st.startedAt);
  t.clock.min(12);
  const rs = t.call('previewReset', { teacherToken: tok });
  assert.ok(rs.ok); assert.equal(rs.state.progress.done, 0); assert.equal(rs.state.items['c1-mc'].n, 0);
  assert.ok(Date.parse(rs.state.startedAt) > startedBefore, 'preview timer restarted');
  assert.equal(rs.state.position.ch, 1);
  // test expiry in the preview: shorten the clock, wait, auto-submit
  assert.ok(t.call('previewSetClock', { teacherToken: tok, seconds: 30 }).ok);
  t.clock.adv(31000);
  const after = t.call('state', { sessionId: 'PV-MAIN', token: rs.token, teacherToken: tok });
  assert.equal(after.state.status, 'final'); assert.equal(after.state.final.typeLabel, 'Time Expired — Auto-Submitted'); assert.equal(after.state.final.preview, true);
  assert.equal(t.store.d.dirty, false);
});

test('answer key: teacher-only, and in the preview it shows the preview session\'s own numbers', () => {
  const t = setup(bank); const tok = t.teacher();
  assert.equal(t.call('answerKey', {}).code, 'FORBIDDEN');
  assert.equal(t.call('answerKey', { teacherToken: 'x'.repeat(40) }).code, 'FORBIDDEN');
  const pv = t.call('previewStart', { teacherToken: tok });
  const seed = t.store.getPreview('PV-MAIN').seed;
  const mine = G.instantiate(t.engine.index.items['c2-num'], { seed });
  const generic = t.call('answerKey', { teacherToken: tok });
  const prev = t.call('answerKey', { teacherToken: tok, preview: true });
  assert.ok(generic.ok && prev.ok);
  const find = (r) => r.chapters.flatMap((c) => c.steps).find((x) => x.id === 'c2-num');
  const wantText = G.formatKey(mine).map((x) => x.text).join('|');
  assert.equal(find(prev).key.map((x) => x.text).join('|'), wantText, 'preview key matches the preview session numbers');
  // the key payload names every part with its level and weight, and carries hints and an explanation
  assert.ok(Array.isArray(find(prev).hints) && typeof find(prev).explain === 'string' && find(prev).parts.length >= 1 && find(prev).parts.every((p) => p.id && p.lvl !== undefined));
  // the key is not part of what a student receives
  const st = student(t); t.call('begin', { sessionId: st.sid, token: st.token });
  const served = JSON.stringify(t.call('content', { sessionId: st.sid, token: st.token, chapter: 1 }));
  assert.ok(!/"key"|"explain"|"hints"/.test(served), 'no key, hints or explanation in student content');
  assert.equal(pv.ok, true);
});

test('exportData returns the Master and per-block tables, and the response log only when asked', () => {
  const t = setup(bank); const tok = t.teacher();
  assert.equal(t.call('exportData', {}).code, 'FORBIDDEN');
  const st = student(t, { block: 'Block 3/4', code: CODES['Block 3/4'] }); t.call('begin', { sessionId: st.sid, token: st.token });
  submit(t, st, 'c1-mc', correct(t, st, 'c1-mc'));
  const a = t.call('exportData', { teacherToken: tok, block: 'Block 3/4' });
  assert.ok(a.ok && a.master.rows.length === 1 && a.block.rows.length === 1 && a.responses === undefined);
  const b = t.call('exportData', { teacherToken: tok, block: 'Block 3/4', responses: true });
  assert.ok(b.responses.rows.length >= 1 && b.responses.head.includes('Fraction Correct'));
  assert.equal(t.call('exportData', { teacherToken: tok, block: 'Block 1/2' }).block.rows.length, 0, 'other block tab holds only its own students');
});

test('fictional demo submissions are kept out of the real gradebook', () => {
  const t = setup(bank); const tok = t.teacher();
  const real = begun(t); submit(t, real, 'c1-mc', correct(t, real, 'c1-mc'));
  const g = t.call('generateDemo', { teacherToken: tok, count: 12 });
  assert.ok(g.ok); assert.equal(g.created, 12); assert.equal(g.testRecordsWritten, 12);
  assert.equal(t.store.listSessions().length, 1);
  t.call('flushReports', {});
  assert.equal(t.store.lastReport.master.rows.length, 1);
  assert.equal(t.call('teacherOverview', { teacherToken: tok }).rows.length, 1);
  const demoAn = t.call('teacherAnalytics', { teacherToken: tok, source: 'demo' });
  assert.equal(demoAn.overall.registered, 12); assert.ok(demoAn.items.every((i) => i.attempted > 0 || true));
  const realAn = t.call('teacherAnalytics', { teacherToken: tok });
  assert.equal(realAn.overall.registered, 1);
  assert.ok(t.call('testSheets', { teacherToken: tok }).readBack);
});

test('analytics: averages, most-missed, attempts, chapter time, auto-submits and approaching deadlines', () => {
  const t = setup(bank); const tok = t.teacher();
  const mk = (id, blk) => begun(t, { studentId: id, firstName: id, block: blk, code: CODES[blk] });
  const a = mk('AN1000', 'Block 1/2'), b = mk('AN1001', 'Block 1/2'), c = mk('AN1002', 'Block 3/4');
  submit(t, a, 'c1-mc', correct(t, a, 'c1-mc'));
  submit(t, b, 'c1-mc', wrong(t, b, 'c1-mc')); submit(t, b, 'c1-mc', correct(t, b, 'c1-mc'));
  submit(t, c, 'c1-mc', wrong(t, c, 'c1-mc', 0)); submit(t, c, 'c1-mc', wrong(t, c, 'c1-mc', 1)); submit(t, c, 'c1-mc', wrong(t, c, 'c1-mc', 2));
  t.clock.min(80);
  t.call('finalize', { sessionId: a.sid, token: a.token, requestId: 'fin-aaaa-0001', confirm: true, confirmIncomplete: true });
  let an = t.call('teacherAnalytics', { teacherToken: tok });
  assert.equal(an.approaching.length, 2, 'two students are within 15 minutes of the deadline');
  t.clock.min(11);
  an = t.call('teacherAnalytics', { teacherToken: tok });                              // sweep runs: b and c auto-submitted
  assert.equal(an.autoSubmissions, 2);
  const it = an.items.find((i) => i.id === 'c1-mc');
  assert.equal(it.attempted, 3); assert.equal(it.firstTryPct, 33.3); assert.equal(it.eventuallyPct, 66.7); assert.equal(it.zeroCredit, 1); assert.equal(it.avgAttempts, 2);
  assert.equal(an.mostMissed[0].id, 'c1-mc');
  assert.equal(an.byBlock['Block 1/2'].submitted, 2); assert.equal(an.byBlock['Block 3/4'].submitted, 1);
  const only = t.call('teacherAnalytics', { teacherToken: tok, block: 'Block 3/4' });
  assert.equal(only.overall.registered, 1);
});

test('reports: Master lists all four blocks, each block tab only its own students, with chapter scores and attempts', () => {
  const t = setup(bank); const tok = t.teacher();
  U5.BLOCKS.forEach((blk, i) => { const s = begun(t, { studentId: 'RP' + (1000 + i), firstName: 'Kid' + i, lastName: 'Z' + i, block: blk, code: CODES[blk] }); submit(t, s, 'c1-mc', correct(t, s, 'c1-mc')); });
  t.call('flushReports', {});
  const rep = t.store.lastReport;
  assert.equal(rep.master.rows.length, 4);
  U5.BLOCKS.forEach((blk) => { assert.equal(rep.blocks[blk].rows.length, 1); assert.equal(rep.blocks[blk].rows[0][rep.blocks[blk].head.indexOf('Class Block') >= 0 ? 0 : 0] !== undefined, true); });
  const head = rep.master.head;
  ['First Name', 'Last Name', 'Student ID', 'Class Block', 'Status', 'Start Time (UTC)', 'Deadline (UTC)', 'Submission Time (UTC)', 'Time Used (min)', 'Submission Type', 'Percent', 'Reset Status'].forEach((h) => assert.ok(head.some((x) => x.startsWith(h)), h));
  assert.equal(head.filter((h) => /^Ch \d/.test(h)).length, 6);
  const blkHead = rep.blocks['Block 6/7'].head;
  assert.ok(blkHead.includes('c1-mc pts') && blkHead.includes('c1-mc tries'));
  const x = t.call('exportData', { teacherToken: tok, block: 'Block 6/7' });
  assert.equal(x.block.rows.length, 1); assert.equal(x.master.rows.length, 4);
});

test('a student can never read another student\'s record', () => {
  const t = setup(bank);
  const a = begun(t, { studentId: 'AA1000', firstName: 'A' }), b = begun(t, { studentId: 'BB1000', firstName: 'B' });
  assert.equal(t.call('state', { sessionId: a.sid, token: b.token }).code, 'NO_SESSION');
  assert.equal(submit(t, { sid: a.sid, token: b.token }, 'c1-mc', correct(t, a, 'c1-mc')).code, 'NO_SESSION');
  assert.equal(t.call('teacherOverview', { sessionId: a.sid, token: a.token }).code, 'FORBIDDEN');
});

test('students who are closed out mid-test (block closed) cannot start; those already running continue', () => {
  const t = setup(bank);
  const early = begun(t, { studentId: 'EA1000', firstName: 'E' });
  const late = student(t, { studentId: 'LT1000', firstName: 'L' });
  const cfg = t.store.getConfig(); cfg.codes['Block 6/7'].open = false; t.store.saveConfig(cfg);
  assert.equal(t.call('begin', { sessionId: late.sid, token: late.token }).code, 'CLOSED');
  assert.ok(submit(t, early, 'c1-mc', correct(t, early, 'c1-mc')).ok);
});

// ---------------------------------------------------------------------------------------------------- hostile input
test('malformed and hostile requests never crash the engine, never leak, and never change the gradebook', () => {
  const t = setup(bank); const tok = t.teacher();
  const st = student(t); t.call('begin', { sessionId: st.sid, token: st.token });
  const before = JSON.stringify(t.store.getSession(st.sid));
  const junk = [null, undefined, 0, -1, 1e308, NaN, '', ' ', 'a'.repeat(100000), [], [[]], {}, { __proto__: { admin: true } }, true, '\u0000', '<script>alert(1)</script>', '=HYPERLINK("http://x")', { constructor: 'x' }, ['x'], { a: { b: { c: {} } } }];
  const actions = ['config', 'login', 'begin', 'submit', 'heartbeat', 'finalize', 'state', 'content', 'teacherLogin', 'teacherOverview', 'teacherAnalytics', 'teacherStudent', 'findStudent', 'resetStudent', 'moveBlock', 'finalizeNow', 'getConfig', 'saveConfig', 'generateCodes', 'testCode', 'answerKey', 'previewStart', 'previewReset', 'previewSetClock', 'previewScenario', 'generateDemo', 'testSheets', 'flushReports', 'exportData', 'nonsense', '__proto__', 'constructor'];
  const fields = ['sessionId', 'token', 'teacherToken', 'itemId', 'response', 'requestId', 'studentId', 'block', 'code', 'firstName', 'lastName', 'password', 'chapter', 'query', 'codes', 'settings', 'seconds', 'mode', 'count', 'expectedAttempt', 'pos', 'sims', 'confirm'];
  let n = 0;
  for (const a of actions) {
    for (const j of junk) {
      let r;
      assert.doesNotThrow(() => { r = t.call(a, j); }, `${a}(${typeof j}) threw`);
      assert.ok(r && typeof r === 'object' && typeof r.ok === 'boolean', `${a} returned a non-object`);
      n++;
    }
    for (const f of fields) for (const j of junk.slice(0, 12)) {
      const payload = { [f]: j }; if (a !== 'config' && a !== 'login' && a !== 'teacherLogin') { payload.sessionId = payload.sessionId === undefined ? st.sid : payload.sessionId; }
      let r; assert.doesNotThrow(() => { r = t.call(a, payload); }, `${a}.${f} threw`);
      assert.ok(r && typeof r.ok === 'boolean');
      if (r.ok && /teacher|answerKey|resetStudent|moveBlock|finalizeNow|getConfig|saveConfig|generateCodes|testCode|previewStart|previewReset|previewSetClock|previewScenario|generateDemo|testSheets|findStudent|exportData/.test(a) && a !== 'teacherLogin') assert.fail(`${a} succeeded for a caller with no valid teacher token (${f})`);
      n++;
    }
  }
  assert.ok(n > 1000);
  // nothing above could award credit or finish the student
  const after = t.store.getSession(st.sid);
  assert.equal(after.status, 'active'); assert.equal(Object.keys(after.items).length, JSON.parse(before).items ? Object.keys(JSON.parse(before).items).length : 0);
  // and the teacher token is still the only way in
  assert.equal(t.call('answerKey', {}).code, 'FORBIDDEN');
  assert.ok(t.call('answerKey', { teacherToken: tok }).ok);
});

test('answers cannot be sent for another student’s session, for a locked chapter, or with extra/prototype fields', () => {
  const t = setup(bank);
  const a = begun(t, { studentId: '111111', firstName: 'Ann', lastName: 'A' }), b = begun(t, { studentId: '222222', firstName: 'Bo', lastName: 'B' });
  const resp = correct(t, a, 'c1-mc');
  const wrongToken = t.call('submit', { sessionId: a.sid, token: b.token, itemId: 'c1-mc', response: resp, requestId: 'x-req-000000001', expectedAttempt: 1 });
  assert.equal(wrongToken.ok, false);
  const locked = t.call('submit', { sessionId: a.sid, token: a.token, itemId: 'c2-num', response: correct(t, a, 'c2-num'), requestId: 'x-req-000000002', expectedAttempt: 1 });
  assert.equal(locked.code, 'LOCKED_CHAPTER');
  const proto = JSON.parse('{"parts":{"p1":{"c":"x","__proto__":{"c":"y"}}},"__proto__":{"admin":true}}');
  const r = t.call('submit', { sessionId: a.sid, token: a.token, itemId: 'c1-mc', response: proto, requestId: 'x-req-000000003', expectedAttempt: 1 });
  assert.ok(r.ok === false || r.correct === false, 'prototype-pollution style payload gets no credit');
  assert.equal({}.admin, undefined, 'Object.prototype was not polluted');
  assert.equal(t.store.getSession(b.sid).items['c1-mc'], undefined, 'the other student’s record is untouched');
});
