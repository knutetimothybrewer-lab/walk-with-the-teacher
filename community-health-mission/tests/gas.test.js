'use strict';
// Runs the REAL generated dist/apps-script/Code.gs against mocked Google services.
// This proves the adapter logic; it does NOT prove a live deployment (see docs/QA_REPORT.md).
const test = require('node:test'); const assert = require('node:assert'); const crypto = require('crypto');
const { execSync } = require('child_process'); const { loadCode } = require('./gas-mock');
const G = require('../server/grading'); const split = require('../tools/split');
const HAVE = !!split.load().priv;
if (!HAVE) { test('GAS tests skipped: private/keys.json not present', { skip: true }, () => {}); return; }
execSync('node tools/build.js', { cwd: require('path').join(__dirname, '..') });
const { pub, priv } = split.load();

function boot() {
  const e = loadCode(); const c = e.ctx;
  c.chmSetup = c.chmSetup; // menu setup uses UI alert: do the non-UI part manually
  c.PropertiesService.getScriptProperties().setProperty('SHEET_ID', 'SHEET123');
  const salt = 'abc', hash = crypto.createHash('sha256').update(salt + 'pass-word-1').digest('hex');
  const p = c.PropertiesService.getScriptProperties(); p.setProperty('TEACHER_SALT', salt); p.setProperty('TEACHER_HASH', hash);
  const api = (action, payload) => JSON.parse(c.api(JSON.stringify({ action, payload })));
  // create class through teacher API
  const tk = api('teacherLogin', { passcode: 'pass-word-1' }).teacherToken;
  assert.ok(api('teacherSaveClass', { teacherToken: tk, cls: { code: 'HEALTH3A', name: 'Health 3A', section: '3A', status: 'open' } }).ok);
  return { e, c, api, tk };
}
const U = pub.modules.flatMap(m => m.units);

test('GAS: join, submit, resume, finalize writes Sessions/Responses; row counts exact', () => {
  const { e, api, tk } = boot();
  const j = api('join', { classCode: 'health3a', rosterId: 'stu01', name: '=cmd|calc', period: '3' }); assert.ok(j.ok, JSON.stringify(j));
  U.forEach(u => assert.equal(api('submitUnit', { sessionId: j.sessionId, token: j.token, requestId: 'req-' + u.id + '-aaaa', unitId: u.id, response: G.makeCorrect(pub, u, priv.units[u.id]), expectedAttempt: 1 }).correct, true));
  const again = api('join', { classCode: 'HEALTH3A', rosterId: 'STU01', name: 'x' }); assert.equal(again.sessionId, j.sessionId); assert.equal(again.state.units[U[0].id].status, 'correct');
  const f = api('finalize', { sessionId: j.sessionId, token: j.token, requestId: 'final-aaaaaa', confirm: true });
  assert.ok(f.ok); assert.equal(f.final.gradebook, 'recorded'); assert.equal(f.final.results.pctDisplay, '100.0');
  const sess = e.ss.sheets.Sessions.rows, resp = e.ss.sheets.Responses.rows;
  assert.equal(sess.length, 2); assert.equal(resp.length, 30);                       // header + 29
  assert.equal(sess[1][17], 'recorded'); assert.equal(sess[1][7], 'finalized'); assert.equal(sess[1][14], 100);
  assert.equal(sess[1][4], "'=cmd|calc");                                            // formula injection neutralised
  assert.equal(e.ss.sheets._State.hidden, true);
  assert.equal(api('submitUnit', { sessionId: j.sessionId, token: j.token, requestId: 'late-aaaaaa', unitId: U[0].id, response: {} }).code, 'FINALIZED');
  const ex = api('teacherExport', { teacherToken: tk, classCode: 'HEALTH3A' }); assert.ok(ex.csv.includes("'=cmd|calc"));
});

test('GAS: duplicate requests and stale tabs through the real adapter do not double-write', () => {
  const { e, api } = boot(); const j = api('join', { classCode: 'HEALTH3A', rosterId: 'stu02', name: 'B' }); const u = U[0];
  const req = { sessionId: j.sessionId, token: j.token, requestId: 'dup-req-000001', unitId: u.id, response: G.makeWrong(pub, u, priv.units[u.id]), expectedAttempt: 1 };
  api('submitUnit', req); const r2 = api('submitUnit', req); assert.equal(r2.replayed, true);
  assert.equal(api('submitUnit', Object.assign({}, req, { requestId: 'other-req-00001' })).code, 'STALE');
  assert.equal(e.ss.sheets.Responses.rows.length, 2);
});

test('GAS: busy lock returns retryable BUSY without consuming; later retry succeeds', () => {
  const { e, api } = boot(); const j = api('join', { classCode: 'HEALTH3A', rosterId: 'stu03', name: 'C' }); const u = U[0];
  const req = { sessionId: j.sessionId, token: j.token, requestId: 'busy-req-00001', unitId: u.id, response: G.makeCorrect(pub, u, priv.units[u.id]), expectedAttempt: 1 };
  e.forceLock(true); const busy = api('submitUnit', req); e.forceLock(false);
  assert.equal(busy.code, 'BUSY'); assert.equal(busy.retryable, true);
  assert.equal(api('getState', { sessionId: j.sessionId, token: j.token }).state.units[u.id].attempts, 0);
  assert.equal(api('submitUnit', req).earned, 4);
});

test('GAS: answer keys never leave the server; preview and tests are isolated from production tabs', () => {
  const { e, api, tk } = boot(); const j = api('join', { classCode: 'HEALTH3A', rosterId: 'stu04', name: 'D' });
  for (const a of ['teacherAnswerView', 'previewStart', 'teacherExport', 'previewDeliveryTest']) assert.equal(api(a, {}).code, 'FORBIDDEN');
  assert.equal(api('teacherAnswerView', { teacherToken: j.token }).code, 'FORBIDDEN');
  const n = name => (e.ss.sheets[name] || { rows: [] }).rows.length; const before = { s: n('Sessions'), r: n('Responses') };
  const pv = api('previewStart', { teacherToken: tk }); assert.ok(pv.ok);
  assert.ok(api('previewScenario', { teacherToken: tk, sessionId: pv.sessionId, token: pv.token, mode: 'second' }).ok);
  const fin = api('finalize', { teacherToken: tk, sessionId: pv.sessionId, token: pv.token, requestId: 'pv-final-00001', confirm: true }); assert.equal(fin.final.gradebook, 'simulated');
  assert.equal(n('Sessions'), before.s); assert.equal(n('Responses'), before.r);
  const t = api('previewDeliveryTest', { teacherToken: tk }); assert.ok(t.ok); assert.equal(t.readBack, true);
  assert.equal(e.ss.sheets.DeliveryTest.rows.length, 2); assert.equal(e.ss.sheets.Sessions.rows.length, before.s);
  assert.ok(!JSON.stringify(api('join', { classCode: 'HEALTH3A', rosterId: 'stu04', name: 'D' })).includes(priv.units[U[0].id].explain));
});

test('GAS: reset writes ResetAudit, supersedes old row, student can restart', () => {
  const { e, api, tk } = boot(); const j = api('join', { classCode: 'HEALTH3A', rosterId: 'stu05', name: 'E' }); const u = U[0];
  api('submitUnit', { sessionId: j.sessionId, token: j.token, requestId: 'rs-req-0000001', unitId: u.id, response: G.makeCorrect(pub, u, priv.units[u.id]), expectedAttempt: 1 });
  assert.ok(api('teacherReset', { teacherToken: tk, sessionId: j.sessionId, reason: 'teacher approved retake' }).ok);
  assert.equal(e.ss.sheets.ResetAudit.rows.length, 2); assert.equal(e.ss.sheets.ResetAudit.rows[1][1], 'RESET');
  const j2 = api('join', { classCode: 'HEALTH3A', rosterId: 'stu05', name: 'E' }); assert.notEqual(j2.sessionId, j.sessionId); assert.equal(j2.state.units[u.id].attempts, 0);
  assert.equal(e.ss.sheets.Sessions.rows.find(r => r[0] === j.sessionId)[7], 'reset'); assert.equal(e.ss.sheets.Responses.rows.length, 2);
});

test('GAS: simultaneous classroom (45 students x 29 units) stays consistent and quick per call', () => {
  const { e, api } = boot(); const S = []; for (let i = 0; i < 45; i++) S.push(api('join', { classCode: 'HEALTH3A', rosterId: 'kid' + i, name: 'Kid ' + i }));
  const t0 = Date.now();
  for (const u of U) for (const s of S) assert.equal(api('submitUnit', { sessionId: s.sessionId, token: s.token, requestId: 'c-' + s.sessionId + u.id, unitId: u.id, response: G.makeCorrect(pub, u, priv.units[u.id]), expectedAttempt: 1 }).ok, true);
  S.forEach((s, i) => assert.ok(api('finalize', { sessionId: s.sessionId, token: s.token, requestId: 'cf-' + i + '-000001', confirm: true }).ok));
  assert.equal(e.ss.sheets.Responses.rows.length, 1 + 45 * 29); assert.equal(e.ss.sheets.Sessions.rows.length, 46);
  assert.equal(e.ss.sheets.Sessions.rows.slice(1).every(r => r[17] === 'recorded' && r[14] === 100), true);
  console.log('      mock: ' + (45 * 29) + ' submits + 45 finalizes in ' + (Date.now() - t0) + ' ms of pure compute; lock waits: ' + e.stats.lockWaits);
});

test('GAS: dist/apps-script/Index.html has no answer key; Code.gs is the only file with keys', () => {
  const fs = require('fs'), idx = fs.readFileSync(__dirname + '/../dist/apps-script/Index.html', 'utf8');
  Object.values(priv.units).forEach(u => { assert.ok(!idx.includes(u.explain)); assert.ok(!idx.includes(u.rubric)); });
  assert.ok(!idx.includes('CHM_PRIV')); assert.ok(!idx.includes('simplanKeys'));
  assert.ok(fs.readFileSync(__dirname + '/../dist/apps-script/Code.gs', 'utf8').includes('CHM_PRIV'));
  for (const f of ['web', 'demo']) assert.ok(!fs.readFileSync(__dirname + '/../dist/' + f + '/index.html', 'utf8').includes(priv.units['M1-U5'].explain));
});
