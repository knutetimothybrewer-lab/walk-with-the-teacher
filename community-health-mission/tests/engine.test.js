'use strict';
const test = require('node:test'); const assert = require('node:assert');
const { setup, joinStudent, teacher, hasKeys } = require('./helpers');
if (!hasKeys()) { test('engine tests skipped: private/keys.json not present', { skip: true }, () => {}); return; }
const G = require('../server/grading');

const sub = (c, j, u, resp, extra) => c.call('submitUnit', Object.assign({ sessionId: j.sessionId, token: j.token, requestId: c.rid(), unitId: u.id, response: resp }, extra));
const U = c => c.engine.unitList;

test('content: 100 points, 29 units, module blueprint', () => {
  const c = setup();
  assert.equal(c.engine.totalPoints, 100); assert.equal(U(c).length, 29);
  const per = {}; U(c).forEach(u => per[u.module] = (per[u.module] || 0) + u.points);
  assert.deepEqual(per, { 1: 18, 2: 12, 3: 22, 4: 12, 5: 16, 6: 20 });
  const n = {}; U(c).forEach(u => n[u.module] = (n[u.module] || 0) + 1);
  assert.deepEqual(n, { 1: 5, 2: 4, 3: 6, 4: 4, 5: 5, 6: 5 });
});

test('content: every key grades its own canonical answer; wrong answers fail; at least 4 graph units; >=7 formats; >=50% application+', () => {
  const c = setup(); let graph = 0, hi = 0; const fmt = new Set();
  for (const u of U(c)) {
    const pu = c.priv.units[u.id];
    const ok = G.makeCorrect(c.pub, u, pu); assert.equal(G.validateUnit(c.pub, u, ok), null, u.id); assert.ok(G.gradeUnit(c.pub, u, pu, ok), u.id);
    assert.ok(!G.gradeUnit(c.pub, u, pu, G.makeWrong(c.pub, u, pu)), u.id);
    assert.equal(pu.hints.length >= 2, true, u.id + ' hints');
    if (pu.needsGraph) graph++; if (['apply', 'analyze', 'evaluate', 'create'].includes(pu.cog)) hi += u.points;
    u.fields.forEach(f => fmt.add(f.type));
  }
  assert.ok(graph >= 4, 'graph units ' + graph); assert.ok(fmt.size >= 7, [...fmt].join()); assert.ok(hi >= 50);
});

test('scoring: four outcomes (100/85/75/0) per unit', () => {
  const c = setup(); const j = joinStudent(c); const u = U(c).find(x => x.points === 4);
  const pu = c.priv.units[u.id], right = G.makeCorrect(c.pub, u, pu), wrong = G.makeWrong(c.pub, u, pu);
  const j2 = joinStudent(c, 'bb'), j3 = joinStudent(c, 'cc'), j4 = joinStudent(c, 'dd');
  assert.equal(sub(c, j, u, right).earned, 4);
  sub(c, j2, u, wrong); assert.equal(sub(c, j2, u, right).earned, 3.4);
  sub(c, j3, u, wrong); sub(c, j3, u, wrong); assert.equal(sub(c, j3, u, right).earned, 3);
  sub(c, j4, u, wrong); sub(c, j4, u, wrong); const r = sub(c, j4, u, wrong); assert.equal(r.locked, true); assert.equal(r.earned, 0); assert.equal(r.status, 'exhausted');
});

test('scoring: weighted grade, display rounding to one decimal, unrounded underlying', () => {
  const c = setup(); const j = joinStudent(c);
  U(c).forEach((u, i) => { const pu = c.priv.units[u.id]; const right = G.makeCorrect(c.pub, u, pu), wrong = G.makeWrong(c.pub, u, pu);
    if (i % 3 === 0) { sub(c, j, u, wrong); sub(c, j, u, right); } else sub(c, j, u, right); });
  const f = c.call('finalize', { sessionId: j.sessionId, token: j.token, requestId: c.rid(), confirm: true });
  assert.ok(f.ok);
  let exp = 0; U(c).forEach((u, i) => exp += u.points * (i % 3 === 0 ? 0.85 : 1));
  assert.ok(Math.abs(f.final.results.earned - Math.round(exp * 100) / 100) < 0.011);
  assert.equal(f.final.results.pctDisplay, (Math.round(exp * 10) / 10).toFixed(1));
});

test('hints: after wrong attempts, hint is given without revealing answer; no explanation until final review', () => {
  const c = setup(); const j = joinStudent(c); const u = U(c)[0], pu = c.priv.units[u.id];
  const r = sub(c, j, u, G.makeWrong(c.pub, u, pu));
  assert.equal(r.correct, false); assert.equal(r.hint, pu.hints[0]); assert.equal(r.review, undefined); assert.equal(r.next.maxCredit, 3.4);
  assert.equal(JSON.stringify(r).includes(pu.explain), false);
  assert.equal(c.call('getReview', { sessionId: j.sessionId, token: j.token }).code, 'NOT_YET');
});

test('validation: blank/incomplete does not consume attempts; exact-set multiselect; numeric tolerance; budget rules', () => {
  const c = setup(); const j = joinStudent(c);
  const u1 = c.engine.unitList.find(u => u.id === 'M1-U2'), pu1 = c.priv.units['M1-U2'];
  assert.equal(sub(c, j, u1, { f1: [] }).code, 'INVALID'); assert.equal(sub(c, j, u1, {}).code, 'INVALID');
  assert.equal(c.call('getState', { sessionId: j.sessionId, token: j.token }).state.units['M1-U2'].attempts, 0);
  assert.equal(sub(c, j, u1, { f1: ['a', 'c'] }).correct, false);          // missing one
  assert.equal(sub(c, j, u1, { f1: ['a', 'c', 'e', 'b'] }).correct, false); // extra one
  assert.equal(sub(c, j, u1, { f1: ['e', 'a', 'c'] }).correct, true);      // order-insensitive
  const u2 = c.engine.unitList.find(u => u.id === 'M4-U2'), pu2 = c.priv.units['M4-U2'];
});

test('numeric tolerance and strings', () => {
  const c = setup(); const u2 = c.engine.unitList.find(u => u.id === 'M4-U2'), pu2 = c.priv.units['M4-U2'];
  const g = r => G.gradeUnit(c.pub, u2, pu2, r);
  assert.ok(g({ diff: 28, ratio: 3, life: 6.6 })); assert.ok(g({ diff: '28.4', ratio: '3.05', life: '6.65' }));
  assert.ok(!g({ diff: 29, ratio: 3, life: 6.6 })); assert.ok(!g({ diff: 28, ratio: 3.2, life: 6.6 })); assert.ok(!g({ diff: 28, ratio: 3, life: 6.8 }));
  assert.equal(G.validateUnit(c.pub, u2, { diff: 'abc', ratio: 3, life: 6.6 }) !== null, true);
});

test('budget: multiple defensible pairs; over budget/infeasible/awareness rejected without consuming', () => {
  const c = setup(); const u = c.engine.unitList.find(x => x.id === 'M1-U5'), pu = c.priv.units['M1-U5'], f = u.fields[0];
  const ok = (pair, why = 'a') => G.gradeUnit(c.pub, u, pu, { pick: pair, why });
  assert.ok(ok(['transit', 'mobile'])); assert.ok(ok(['transit', 'market'])); assert.ok(ok(['mobile', 'market']));
  assert.ok(!ok(['sidewalk', 'programs'])); assert.ok(!ok(['transit', 'billboard'])); assert.ok(!ok(['transit', 'mobile'], 'b'));
  assert.notEqual(G.validateUnit(c.pub, u, { pick: ['hospital', 'billboard'], why: 'a' }), null);   // over $1M
  assert.notEqual(G.validateUnit(c.pub, u, { pick: ['transit'], why: 'a' }), null);
  assert.notEqual(G.validateUnit(c.pub, u, { pick: ['transit', 'mobile', 'market'], why: 'a' }), null);
});

test('simplan: equivalent plans accepted, missing layer rejected', () => {
  const c = setup(); const u = c.engine.unitList.find(x => x.id === 'M3-U2'), pu = c.priv.units['M3-U2'];
  const base = { mon: 'hourly', sens: 'plan', after: 'report', who: 'adult', trig: 'tier' };
  const a = Object.assign({ loc: 'in', dur: '90', inten: 'full' }, base), b = Object.assign({ loc: 'out', dur: '30', inten: 'light' }, base);
  assert.ok(G.gradeUnit(c.pub, u, pu, { plan: a })); assert.ok(G.gradeUnit(c.pub, u, pu, { plan: b }));
  assert.ok(!G.gradeUnit(c.pub, u, pu, { plan: Object.assign({}, b, { dur: '60' }) }));
  assert.ok(!G.gradeUnit(c.pub, u, pu, { plan: Object.assign({}, a, { who: 'each' }) }));
  assert.ok(!G.gradeUnit(c.pub, u, pu, { plan: Object.assign({}, a, { trig: 'collapse' }) }));
});

test('server rejects altered scores/unknown fields; never trusts client totals', () => {
  const c = setup(); const j = joinStudent(c); const u = U(c)[0], pu = c.priv.units[u.id];
  const r = sub(c, j, u, G.makeWrong(c.pub, u, pu), { earned: 99, correct: true, score: 100 });
  assert.equal(r.correct, false); assert.equal(r.earned, undefined);
  const f = c.call('finalize', { sessionId: j.sessionId, token: j.token, requestId: c.rid(), confirm: true, earned: 100, pct: 100 });
  assert.equal(f.code, 'INCOMPLETE');
});

test('attempts beyond three rejected; locked units frozen; reload cannot reset', () => {
  const c = setup(); const j = joinStudent(c); const u = U(c)[0], pu = c.priv.units[u.id];
  for (let i = 0; i < 3; i++) sub(c, j, u, G.makeWrong(c.pub, u, pu));
  const r = sub(c, j, u, G.makeCorrect(c.pub, u, pu)); assert.equal(r.code, 'LOCKED');
  const j2 = joinStudent(c); assert.equal(j2.sessionId, j.sessionId); assert.equal(j2.state.units[u.id].status, 'exhausted'); assert.equal(j2.created, false);
});

test('idempotency: same requestId replays and does not consume; stale expectedAttempt rejected (concurrent tabs)', () => {
  const c = setup(); const j = joinStudent(c); const u = U(c)[0], pu = c.priv.units[u.id], wrong = G.makeWrong(c.pub, u, pu);
  const rid = 'dup-request-0001';
  const a = c.call('submitUnit', { sessionId: j.sessionId, token: j.token, requestId: rid, unitId: u.id, response: wrong, expectedAttempt: 1 });
  const b = c.call('submitUnit', { sessionId: j.sessionId, token: j.token, requestId: rid, unitId: u.id, response: wrong, expectedAttempt: 1 });
  assert.equal(a.attempt, 1); assert.equal(b.attempt, 1); assert.equal(b.replayed, true); assert.ok(b.state && b.state.units[u.id].attempts === 1, 'replay carries current state');
  assert.equal(c.store.listResponses().length, 1);
  // second tab: different request id, still thinks attempt 1
  const t2 = c.call('submitUnit', { sessionId: j.sessionId, token: j.token, requestId: 'tab2-request-01', unitId: u.id, response: wrong, expectedAttempt: 1 });
  assert.equal(t2.code, 'STALE'); assert.equal(c.call('getState', { sessionId: j.sessionId, token: j.token }).state.units[u.id].attempts, 1);
  assert.equal(c.store.listResponses().length, 1);
});

test('lost response: retry with same request id after server processed it', () => {
  const c = setup(); const j = joinStudent(c); const u = U(c)[0], pu = c.priv.units[u.id];
  const req = { sessionId: j.sessionId, token: j.token, requestId: 'lost-resp-0001', unitId: u.id, response: G.makeCorrect(c.pub, u, pu), expectedAttempt: 1 };
  c.call('submitUnit', req);          // response "lost"
  const again = c.call('submitUnit', req);
  assert.equal(again.ok, true); assert.equal(again.earned, 4); assert.equal(again.replayed, true);
  assert.equal(c.store.listResponses().length, 1);
});

test('write failure inside submit does not consume attempt; retry succeeds; no duplicate rows', () => {
  const c = setup(); const j = joinStudent(c); const u = U(c)[0], pu = c.priv.units[u.id];
  const req = { sessionId: j.sessionId, token: j.token, requestId: 'fault-req-0001', unitId: u.id, response: G.makeWrong(c.pub, u, pu), expectedAttempt: 1 };
  c.store.failNext('putSession');
  assert.equal(c.call('submitUnit', req).code, 'SERVER_ERROR');
  assert.equal(c.call('getState', { sessionId: j.sessionId, token: j.token }).state.units[u.id].attempts, 0);
  assert.equal(c.call('submitUnit', req).attempt, 1); assert.equal(c.store.listResponses().length, 1);
  c.store.failNext('appendResponses');
  const req2 = Object.assign({}, req, { requestId: 'fault-req-0002', expectedAttempt: 2 });
  assert.equal(c.call('submitUnit', req2).ok, false);   // attempt state was saved first; rows reconcile later
});

test('authorization: wrong token / other session / preview id / bad ids rejected', () => {
  const c = setup(); const a = joinStudent(c, 'aa'), b = joinStudent(c, 'bb'); const u = U(c)[0], pu = c.priv.units[u.id];
  const resp = G.makeCorrect(c.pub, u, pu);
  assert.equal(c.call('submitUnit', { sessionId: a.sessionId, token: b.token, requestId: 'x-request-001', unitId: u.id, response: resp }).code, 'NO_SESSION');
  assert.equal(c.call('getState', { sessionId: 'nope', token: 'x' }).code, 'NO_SESSION');
  assert.equal(c.call('getState', { sessionId: 'PV-abc', token: a.token }).code, 'FORBIDDEN');
  assert.equal(c.call('submitUnit', { sessionId: a.sessionId, token: a.token, requestId: 'x', unitId: u.id, response: resp }).code, 'BAD_REQUEST');
  assert.equal(c.call('submitUnit', { sessionId: a.sessionId, token: a.token, requestId: 'x-request-002', unitId: 'NOPE', response: resp }).code, 'BAD_UNIT');
  assert.equal(c.call('join', { classCode: 'WRONG', rosterId: 'ab', name: 'x' }).code, 'BAD_CLASS');
  assert.equal(c.call('join', { classCode: 'PERIOD3', rosterId: 'a b!', name: 'x' }).code, 'BAD_INPUT');
});

test('class code rules: closed, window, version, roster tokens', () => {
  const c = setup();
  c.store.saveClass({ code: 'CLOSED1', name: 'x', section: 's', version: c.pub.version, status: 'closed', opensAt: '', closesAt: '', requireRoster: false, revealMode: 'final', pacingFactor: 1 });
  assert.equal(c.call('join', { classCode: 'closed1', rosterId: 'abc', name: 'n' }).code, 'CLOSED');
  c.store.saveClass({ code: 'FUTURE1', name: 'x', section: 's', version: c.pub.version, status: 'open', opensAt: '2030-01-01T00:00:00Z', closesAt: '', requireRoster: false, revealMode: 'final', pacingFactor: 1 });
  assert.equal(c.call('join', { classCode: 'FUTURE1', rosterId: 'abc', name: 'n' }).code, 'CLOSED');
  c.store.saveClass({ code: 'OLDVER1', name: 'x', section: 's', version: '0.0.1', status: 'open', opensAt: '', closesAt: '', requireRoster: false, revealMode: 'final', pacingFactor: 1 });
  assert.equal(c.call('join', { classCode: 'OLDVER1', rosterId: 'abc', name: 'n' }).code, 'VERSION');
  c.store.saveClass({ code: 'ROSTER1', name: 'x', section: 's', version: c.pub.version, status: 'open', opensAt: '', closesAt: '', requireRoster: true, revealMode: 'final', pacingFactor: 1 });
  c.store.setRoster('ROSTER1', 'stu9', 'tok-secret');
  assert.equal(c.call('join', { classCode: 'ROSTER1', rosterId: 'stu9', name: 'n' }).code, 'ROSTER');
  assert.equal(c.call('join', { classCode: 'ROSTER1', rosterId: 'stu9', name: 'n', studentToken: 'bad' }).code, 'ROSTER');
  assert.ok(c.call('join', { classCode: 'ROSTER1', rosterId: 'stu9', name: 'n', studentToken: 'tok-secret' }).ok);
});

test('one session per class+student+version; resume returns same; case-insensitive roster', () => {
  const c = setup(); const a = joinStudent(c, 'Stu-1'), b = joinStudent(c, 'stu-1');
  assert.equal(a.sessionId, b.sessionId); assert.equal(c.store.listSessions('PERIOD3').length, 1);
});

test('finalize: requires confirm + completion; idempotent; locks edits; receipt stable; 3 delivery states', () => {
  const c = setup(); const j = joinStudent(c);
  assert.equal(c.call('finalize', { sessionId: j.sessionId, token: j.token, requestId: c.rid(), confirm: false }).code, 'NOT_CONFIRMED');
  U(c).forEach(u => sub(c, j, u, G.makeCorrect(c.pub, u, c.priv.units[u.id])));
  const p = { sessionId: j.sessionId, token: j.token, requestId: 'final-req-0001', confirm: true };
  const f1 = c.call('finalize', p), f2 = c.call('finalize', Object.assign({}, p, { requestId: 'final-req-0002' }));
  assert.ok(f1.ok && f2.ok && f2.already); assert.equal(f1.final.receiptId, f2.final.receiptId); assert.equal(f1.final.gradebook, 'recorded');
  assert.equal(Object.keys(c.store.gradebook).length, 1); assert.equal(c.store.listResponses().length, 29);
  assert.equal(sub(c, j, U(c)[0], {}).code, 'FINALIZED');
  assert.ok(c.call('getReview', { sessionId: j.sessionId, token: j.token }).units.every(x => x.explanation));
});

test('finalize with gradebook failure: finalized-on-server but pending; retry records exactly once', () => {
  const c = setup(); const j = joinStudent(c);
  U(c).forEach(u => sub(c, j, u, G.makeCorrect(c.pub, u, c.priv.units[u.id])));
  c.store.failNext('writeGradebook');
  const f = c.call('finalize', { sessionId: j.sessionId, token: j.token, requestId: 'final-fail-001', confirm: true });
  assert.equal(f.ok, true); assert.equal(f.final.gradebook, 'pending'); assert.equal(Object.keys(c.store.gradebook).length, 0);
  const r = c.call('retryGradebook', { sessionId: j.sessionId, token: j.token }); assert.equal(r.final.gradebook, 'recorded');
  c.call('retryGradebook', { sessionId: j.sessionId, token: j.token }); assert.equal(Object.keys(c.store.gradebook).length, 1);
});

test('exhausted student can still finalize (no dead ends)', () => {
  const c = setup(); const j = joinStudent(c);
  U(c).forEach(u => { for (let i = 0; i < 3; i++) sub(c, j, u, G.makeWrong(c.pub, u, c.priv.units[u.id])); });
  const f = c.call('finalize', { sessionId: j.sessionId, token: j.token, requestId: c.rid(), confirm: true });
  assert.equal(f.ok, true); assert.equal(f.final.results.pctDisplay, '0.0'); assert.equal(f.final.results.completed, 29); assert.equal(f.final.results.correct, 0);
});

test('reveal mode onLock: explanation only when unit locks', () => {
  const c = setup(); c.store.saveClass({ code: 'LOCKREV', name: 'x', section: 's', version: c.pub.version, status: 'open', opensAt: '', closesAt: '', requireRoster: false, revealMode: 'onLock', pacingFactor: 1 });
  const j = c.call('join', { classCode: 'LOCKREV', rosterId: 'abc', name: 'n' }); const u = U(c)[0], pu = c.priv.units[u.id];
  assert.equal(sub(c, j, u, G.makeWrong(c.pub, u, pu)).review, undefined);
  assert.ok(sub(c, j, u, G.makeCorrect(c.pub, u, pu)).review.explanation);
});

test('teacher auth: answer keys, preview, export, reset require a server-issued token', () => {
  const c = setup(); const j = joinStudent(c);
  for (const a of ['teacherAnswerView', 'previewStart', 'teacherClasses', 'teacherSessions', 'teacherExport', 'teacherSummary', 'previewDeliveryTest', 'teacherSaveClass'])
    assert.equal(c.call(a, { classCode: 'PERIOD3' }).code, 'FORBIDDEN', a);
  assert.equal(c.call('teacherReset', { sessionId: j.sessionId, reason: 'because' }).code, 'FORBIDDEN');
  assert.equal(c.call('teacherAnswerView', { teacherToken: j.token }).code, 'FORBIDDEN');
  assert.equal(c.call('teacherLogin', { passcode: 'wrong' }).code, 'BAD_PASSCODE');
  for (let i = 0; i < 6; i++) c.call('teacherLogin', { passcode: 'wrong' });
  assert.equal(c.call('teacherLogin', { passcode: 'teach-pass' }).code, 'LOCKED');
  const noPass = require('./helpers').setup(); noPass.store.teacher = null; assert.equal(noPass.call('teacherLogin', { passcode: 'x' }).code, 'NOT_CONFIGURED');
});

test('public content bundle contains no answer keys, hints, explanations or rubrics', () => {
  const c = setup(); const json = JSON.stringify(c.pub);
  for (const u of Object.values(c.priv.units)) { assert.ok(!json.includes(u.explain)); u.hints.forEach(h => assert.ok(!json.includes(h))); assert.ok(!json.includes(u.rubric)); }
  assert.ok(!/"key":\s*[\[{"]/.test(json.replace(/"key":"(neighborhood|ops|lab|data|media|action)"/g, '')));
  assert.ok(!/"common":/.test(json));
});

test('preview: separate from production, never in reports; scenarios; reset; label', () => {
  const c = setup(); const tk = teacher(c); const real = joinStudent(c);
  const pv = c.call('previewStart', { teacherToken: tk }); assert.ok(pv.ok); assert.ok(pv.sessionId.startsWith('PV-')); assert.match(pv.label, /No Student Grade Recorded/);
  assert.equal(c.call('getState', { sessionId: pv.sessionId, token: pv.token }).code, 'FORBIDDEN');       // needs teacher token too
  const base = { sessionId: pv.sessionId, token: pv.token, teacherToken: tk };
  for (const [mode, expect] of [['first', '100.0'], ['second', '85.0'], ['third', '75.0'], ['exhaust', '0.0']]) {
    assert.ok(c.call('previewScenario', Object.assign({ mode }, base)).ok);
    const f = c.call('finalize', Object.assign({ requestId: 'pv-' + mode + '-0001', confirm: true }, base));
    assert.ok(f.ok, JSON.stringify(f)); assert.equal(f.final.results.pctDisplay, expect); assert.equal(f.final.gradebook, 'simulated'); assert.equal(f.final.label, 'Teacher Preview — No Student Grade Recorded'); assert.match(f.final.receiptId, /^PV-/);
    assert.ok(c.call('previewReset', base).ok);
  }
  assert.equal(c.store.listSessions().length, 1); assert.equal(c.store.listResponses().length, 0); assert.equal(Object.keys(c.store.gradebook).length, 0);
  assert.equal(c.call('teacherSessions', { teacherToken: tk, classCode: 'PERIOD3' }).sessions.length, 1);
  assert.equal(c.call('getState', { sessionId: real.sessionId, token: real.token }).state.units[U(c)[0].id].attempts, 0);
  // preview token cannot act on a real session and vice versa
  assert.equal(c.call('submitUnit', { sessionId: real.sessionId, token: pv.token, requestId: 'cross-0000001', unitId: U(c)[0].id, response: {} }).code, 'NO_SESSION');
});

test('preview does not bypass real-session restrictions (finalize needs completion)', () => {
  const c = setup(); const j = joinStudent(c);
  assert.equal(c.call('finalize', { sessionId: j.sessionId, token: j.token, requestId: 'x-final-0001', confirm: true, preview: true, teacherToken: 'fake' }).code, 'INCOMPLETE');
});

test('teacher reset: audit trail, old responses kept, fresh session, no universal passcode exposed', () => {
  const c = setup(); const tk = teacher(c); const j = joinStudent(c); const u = U(c)[0];
  sub(c, j, u, G.makeCorrect(c.pub, u, c.priv.units[u.id]));
  assert.equal(c.call('teacherReset', { teacherToken: tk, sessionId: j.sessionId, reason: 'x' }).code, 'BAD_INPUT');
  assert.ok(c.call('teacherReset', { teacherToken: tk, sessionId: j.sessionId, reason: 'Lost connection; retake approved' }).ok);
  assert.equal(c.store.audit.length, 1); assert.equal(c.store.audit[0].reason, 'Lost connection; retake approved'); assert.equal(c.store.listResponses().length, 1);
  assert.equal(c.call('getState', { sessionId: j.sessionId, token: j.token }).code, 'RESET');
  const j2 = joinStudent(c); assert.notEqual(j2.sessionId, j.sessionId); assert.equal(j2.state.units[u.id].attempts, 0); assert.equal(j2.created, true);
  assert.ok(!JSON.stringify(c.pub).includes('teach-pass'));
});

test('export: CSV integrity, class filter, formula-injection protection, BOM', () => {
  const c = setup(); const tk = teacher(c);
  c.store.saveClass({ code: 'OTHER1', name: 'o', section: 'o', version: c.pub.version, status: 'open', opensAt: '', closesAt: '', requireRoster: false, revealMode: 'final', pacingFactor: 1 });
  c.call('join', { classCode: 'PERIOD3', rosterId: 'evil', name: '=HYPERLINK("http://x","y")', period: '3' });
  c.call('join', { classCode: 'OTHER1', rosterId: 'zzz', name: 'Other Kid' });
  const ex = c.call('teacherExport', { teacherToken: tk, classCode: 'PERIOD3' });
  assert.ok(ex.csv.startsWith('﻿')); assert.ok(!ex.csv.includes('Other Kid'));
  assert.ok(ex.csv.includes(`"'=HYPERLINK(""http://x"",""y"")"`));
  const lines = ex.csv.trim().split('\r\n'); assert.equal(lines.length, 2);
  assert.equal(c.engine.csvCell('@SUM(1)'), "'@SUM(1)"); assert.equal(c.engine.csvCell('-1+2'), "'-1+2"); assert.equal(c.engine.csvCell('a,b'), '"a,b"');
});

test('summary: first-attempt accuracy, retries, common missed concepts', () => {
  const c = setup(); const tk = teacher(c);
  for (let i = 0; i < 4; i++) { const j = joinStudent(c, 'st' + i); const u = U(c)[0], pu = c.priv.units[u.id]; if (i < 2) sub(c, j, u, G.makeWrong(c.pub, u, pu)); sub(c, j, u, G.makeCorrect(c.pub, u, pu)); }
  const s = c.call('teacherSummary', { teacherToken: tk, classCode: 'PERIOD3' }).summary; const it = s.items.find(x => x.id === U(c)[0].id);
  assert.equal(it.answered, 4); assert.equal(it.firstTryAcc, 0.5); assert.equal(it.retries, 2); assert.equal(s.commonMissed[0].id, U(c)[0].id);
});

test('checkpoint: saves position/activity, rejects oversize, idempotent', () => {
  const c = setup(); const j = joinStudent(c);
  const base = { sessionId: j.sessionId, token: j.token };
  assert.ok(c.call('checkpoint', Object.assign({ requestId: 'chk-request-01', position: { module: 2, unit: 1 }, activity: { x2: { tab: 'exposure' } } }, base)).ok);
  const st = c.call('getState', base).state; assert.deepEqual(st.position, { module: 2, unit: 1 }); assert.deepEqual(st.activity.x2, { tab: 'exposure' });
  assert.equal(c.call('checkpoint', Object.assign({ requestId: 'chk-request-02', activity: { big: 'x'.repeat(9000) } }, base)).code, 'TOO_BIG');
  assert.equal(c.call('checkpoint', Object.assign({ requestId: 'chk-request-03', activity: { 'bad key!': 1 } }, base)).code, 'BAD_INPUT');
});

test('simulated classroom: 60 students interleaved, some duplicate/stale requests, results consistent', () => {
  const c = setup(); const sessions = []; for (let i = 0; i < 60; i++) sessions.push(joinStudent(c, 'kid' + i, 'Kid ' + i));
  const order = []; U(c).forEach(u => sessions.forEach((s, i) => order.push([s, u, i])));
  order.sort((a, b) => ((a[2] * 7919 + a[1].points * 13) % 101) - ((b[2] * 7919 + b[1].points * 13) % 101));
  order.forEach(([s, u, i]) => {
    const pu = c.priv.units[u.id], mk = (n, resp) => ({ sessionId: s.sessionId, token: s.token, requestId: 'sim-' + i + '-' + u.id + '-' + n, unitId: u.id, response: resp, expectedAttempt: n });
    if (i % 4 === 0) { const w = mk(1, G.makeWrong(c.pub, u, pu)); c.call('submitUnit', w); c.call('submitUnit', w); }
    const r = mk(i % 4 === 0 ? 2 : 1, G.makeCorrect(c.pub, u, pu)); c.call('submitUnit', r); c.call('submitUnit', r);
  });
  sessions.forEach((s, i) => { const st = c.call('getState', { sessionId: s.sessionId, token: s.token }).state; U(c).forEach(u => assert.equal(st.units[u.id].status, 'correct')); const f = c.call('finalize', { sessionId: s.sessionId, token: s.token, requestId: 'fin-' + i + '-0001', confirm: true }); assert.ok(f.ok); assert.equal(f.final.results.pctDisplay, i % 4 === 0 ? '85.0' : '100.0'); });
  assert.equal(c.store.listResponses().length, 60 * 29 + 15 * 29); assert.equal(Object.keys(c.store.gradebook).length, 60);
});
