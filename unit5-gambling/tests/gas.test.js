'use strict';
// Runs the REAL generated Code.gs + KeyData.gs against a mock of Google Apps Script services.
// Needs the private bank (authoring/ and private/KeyData.gs); skipped otherwise.
// What this proves: the adapter logic is correct (tabs, routing, locks, caches, expiry, resets, protections).
// What it cannot prove: real Google quotas, latency, permissions, or the spreadsheet UI.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const HAVE = fs.existsSync(path.join(__dirname, '..', 'private', 'KeyData.gs')) && fs.existsSync(path.join(__dirname, '..', 'dist', 'apps-script', 'Code.gs'));
const opts = { skip: HAVE ? false : 'private/KeyData.gs not built (run node tools/build.js with the private bank)' };
const U5 = require('../shared/core.js');
const G = require('../server/grading.js');
const { loadCode } = HAVE ? require('./gas-mock.js') : {};
const bank = HAVE ? require('../authoring') : null;
const idx = HAVE ? G.buildIndex(bank) : null;

const MIN = 60000;
const CODES = { 'Block 1/2': 'GAMB1-TEST', 'Block 3/4': 'GAMB2-TEST', 'Block 6/7': 'GAMB3-TEST', 'Block 8/9': 'GAMB4-TEST' };
function boot() {
  const clk = { t: Date.UTC(2026, 9, 14, 13, 0, 0) };
  const env = loadCode({ now: () => clk.t });
  env.clk = clk;
  env.ctx.U5_ENGINE_ = null;
  env.call('u5Setup');
  env.ui.promptAnswers.push('Teacher-Password-2026');
  env.call('u5SetPassword');
  const login = env.post('teacherLogin', { password: 'Teacher-Password-2026' });
  assert.ok(login.ok, JSON.stringify(login));
  env.tok = login.teacherToken;
  const codes = {}; U5.BLOCKS.forEach((b) => { codes[b] = { code: CODES[b], open: true }; });
  assert.ok(env.post('saveConfig', { teacherToken: env.tok, codes }).ok);
  return env;
}
function sessionRow(env, studentId) {
  const sh = env.ss.getSheetByName('_Sessions');
  for (let r = 2; r <= sh.getLastRow(); r++) if (sh.cell(r, 1) === studentId.toUpperCase()) return { r, json: JSON.parse(sh.cell(r, 7)) };
  return null;
}
function joinAs(env, who) {
  const p = Object.assign({ firstName: 'Ada', lastName: 'Lovelace', studentId: 'S100001', block: 'Block 6/7', code: CODES['Block 6/7'] }, who || {});
  const r = env.post('login', p); assert.ok(r.ok, JSON.stringify(r));
  const b = env.post('begin', { sessionId: r.sessionId, token: r.token }); assert.ok(b.ok, JSON.stringify(b));
  return { sid: r.sessionId, token: r.token, studentId: p.studentId, p };
}
function answer(env, st, itemId, mode, k) {
  const row = sessionRow(env, st.studentId), it = G.instantiate(idx.items[itemId], row.json);
  const resp = mode === 'ok' ? G.makeCorrect(it) : G.makeWrong(it, k || 0);
  return env.post('submit', { sessionId: st.sid, token: st.token, itemId, response: resp, requestId: 'rq' + Math.random().toString(36).slice(2, 12) });
}
function finishChapter(env, st, ch, mode) { idx.chapters[ch - 1].steps.filter((s) => s.kind === 'item').forEach((s) => { const r = answer(env, st, s.id, mode || 'ok'); assert.ok(r.ok, s.id + JSON.stringify(r)); }); }

test('setup creates exactly the five primary tabs first, plus protected support tabs, and starts the watcher', opts, () => {
  const env = boot();
  assert.deepEqual(env.ss.order.slice(0, 5), ['Master Dashboard', 'Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9']);
  ['Config', 'Roster', 'Question Responses', 'Audit History', 'Test Records', '_Sessions', '_Preview', '_Demo'].forEach((n) => assert.ok(env.ss.getSheetByName(n), 'missing tab ' + n));
  assert.equal(env.ss.getSheetByName('Sheet1'), null, 'the empty default tab was removed');
  ['_Sessions', '_Preview', '_Demo'].forEach((n) => assert.equal(env.ss.getSheetByName(n).hidden, true, n + ' is hidden'));
  ['Config', 'Audit History', 'Question Responses', 'Test Records', '_Sessions'].forEach((n) => assert.ok(env.ss.getSheetByName(n).protections.length && !env.ss.getSheetByName(n).protections[0].warn, n + ' is protected'));
  assert.equal(env.triggers.length, 1, 'one-minute watcher installed');
  env.call('u5Setup');                                   // idempotent
  assert.equal(env.ss.order.length, new Set(env.ss.order).size);
  assert.equal(env.triggers.length, 1);
  assert.equal(env.get().ok, true);
});

test('config: four distinct generated codes, blocks start closed, students cannot sign in until the teacher opens a block', opts, () => {
  const env = loadCode({}); env.call('u5Setup');
  env.ui.promptAnswers.push('Teacher-Password-2026'); env.call('u5SetPassword');
  const cfg = env.ss.getSheetByName('Config');
  const codes = []; for (let r = 1; r <= cfg.getLastRow(); r++) if (U5.BLOCKS.includes(cfg.cell(r, 1))) { codes.push(cfg.cell(r, 2)); assert.match(cfg.cell(r, 2), /^GAMB\d-[A-Z0-9]{4}$/); assert.equal(cfg.cell(r, 3), false); }
  assert.equal(new Set(codes).size, 4);
  const r = env.post('login', { firstName: 'A', lastName: 'B', studentId: 'S555555', block: 'Block 1/2', code: codes[0] });
  assert.equal(r.code, 'CLOSED');
});

test('end to end: login, begin, answer, reports route each student to the right block tab and the Master Dashboard', opts, () => {
  const env = boot();
  const a = joinAs(env, { studentId: 'S100001', firstName: 'Ada', lastName: 'Lovelace', block: 'Block 6/7', code: CODES['Block 6/7'] });
  const b = joinAs(env, { studentId: 'S200002', firstName: 'Grace', lastName: 'Hopper', block: 'Block 1/2', code: CODES['Block 1/2'] });
  assert.ok(answer(env, a, 'c1-test', 'ok').correct);
  assert.equal(answer(env, b, 'c1-test', 'wrong').correct, false);
  assert.equal(sessionRow(env, 'S100001').json.status, 'active');
  env.call('u5RebuildNow');
  const master = env.ss.getSheetByName('Master Dashboard'), b67 = env.ss.getSheetByName('Block 6/7'), b12 = env.ss.getSheetByName('Block 1/2'), b34 = env.ss.getSheetByName('Block 3/4');
  const find = (sh, text) => { for (let r = 1; r <= sh.getLastRow(); r++) for (let c = 1; c <= 4; c++) if (sh.cell(r, c) === text) return r; return 0; };
  assert.ok(find(master, 'Ada') && find(master, 'Grace'), 'both students are on the Master Dashboard');
  assert.ok(find(b67, 'Ada') && !find(b67, 'Grace'), 'Block 6/7 shows only its own students');
  assert.ok(find(b12, 'Grace') && !find(b12, 'Ada'));
  assert.equal(find(b34, 'Ada') + find(b34, 'Grace'), 0, 'Block 3/4 has none');
  const hr = find(master, 'First Name'), head = master.rows[hr - 1];
  ['Class Block', 'Status', 'Start Time (UTC)', 'Deadline (UTC)', 'Submission Time (UTC)', 'Time Used (min)', 'Submission Type', 'Percent', 'Reset Status'].forEach((h) => assert.ok(head.some((x) => String(x).startsWith(h)), h));
  assert.equal(head.filter((x) => /^Ch \d/.test(String(x))).length, 6);
  const ar = master.rows[find(master, 'Ada') - 1]; assert.equal(ar[head.indexOf('Class Block')], 'Block 6/7'); assert.equal(ar[head.indexOf('Status')], 'In Progress');
  assert.equal(ar[head.indexOf('Start Time (UTC)')], '2026-10-14 13:00:00'); assert.equal(ar[head.indexOf('Deadline (UTC)')], '2026-10-14 14:30:00');
  // summary block lists every class block
  const labels = master.rows.map((r) => r[0]);
  U5.BLOCKS.concat(['All blocks']).forEach((x) => assert.ok(labels.includes(x), 'summary row ' + x));
  // block tab carries chapter scores and per-question points/attempts
  const bh = b67.rows[find(b67, 'First Name') - 1];
  assert.ok(bh.includes('c1-test pts') && bh.includes('c1-test tries'));
  const q = env.ss.getSheetByName('Question Responses'); assert.equal(q.getLastRow(), 3, 'header + one attempt per student'); assert.equal(q.cell(2, 5) || q.cell(3, 5), 'c1-test');
});

test('student text can never become a spreadsheet formula', opts, () => {
  const env = boot();
  joinAs(env, { studentId: 'S300003', firstName: '=HYPERLINK("http://x","click")', lastName: '+cmd', block: 'Block 3/4', code: CODES['Block 3/4'] });
  env.call('u5RebuildNow');
  const master = env.ss.getSheetByName('Master Dashboard');
  const cells = master.rows.flat().filter((v) => typeof v === 'string');
  assert.ok(cells.some((v) => v.startsWith("'=HYPERLINK")), 'name is neutralized');
  assert.ok(!cells.some((v) => /^[=+@]/.test(v)), 'no cell starts with a formula character');
});

test('the deadline is enforced by the server clock: late answers rejected, the watcher auto-submits offline students and updates Sheets', opts, () => {
  const env = boot();
  const a = joinAs(env, { studentId: 'S400004', firstName: 'Offline', lastName: 'Kid', block: 'Block 8/9', code: CODES['Block 8/9'] });
  const b = joinAs(env, { studentId: 'S400005', firstName: 'Online', lastName: 'Kid', block: 'Block 8/9', code: CODES['Block 8/9'] });
  assert.ok(answer(env, a, 'c1-test', 'ok').correct); assert.ok(answer(env, b, 'c1-test', 'ok').correct);
  env.clk.t += 89 * MIN + 59000;
  assert.ok(answer(env, b, 'c1-vocab', 'ok').ok, 'an answer at 89:59 is accepted');
  env.clk.t += 2000;                                             // 90:01
  const late = answer(env, b, 'c1-ledger', 'ok');
  assert.equal(late.code, 'TIME_UP'); assert.equal(late.state.final.typeLabel, 'Time Expired — Auto-Submitted');
  // the other student never contacted the server again: the 1-minute watcher handles them
  assert.equal(sessionRow(env, 'S400004').json.status, 'active');
  env.call('u5Tick');
  const sa = sessionRow(env, 'S400004').json; assert.equal(sa.status, 'final'); assert.equal(sa.finalType, 'expired');
  const master = env.ss.getSheetByName('Master Dashboard');
  const rowOf = (n) => master.rows.find((r) => r[0] === n);
  const head = master.rows.find((r) => r[0] === 'First Name');
  assert.equal(rowOf('Offline')[head.indexOf('Submission Type')], 'Time Expired — Auto-Submitted');
  assert.equal(rowOf('Offline')[head.indexOf('Status')], 'Time Expired — Auto-Submitted');
  assert.equal(rowOf('Offline')[head.indexOf('Submission Time (UTC)')], '2026-10-14 14:30:00', 'official submission time is the deadline');
  assert.equal(rowOf('Offline')[head.indexOf('Time Used (min)')], 90);
  assert.ok(rowOf('Offline')[head.indexOf('Score (/100)')] > 0, 'earlier work is preserved');
  // a student who comes back later just sees the finished state; nothing more can be recorded
  const back = env.post('login', { firstName: 'Offline', lastName: 'Kid', studentId: 'S400004', block: 'Block 8/9', code: CODES['Block 8/9'] });
  assert.equal(back.state.status, 'final');
  assert.equal(answer(env, { sid: back.sessionId, token: back.token, studentId: 'S400004' }, 'c1-vocab', 'ok').code, 'FINALIZED');
});

test('refresh/resume through the sheet and a cold cache: same record, same deadline, same attempts', opts, () => {
  const env = boot();
  const a = joinAs(env, { studentId: 'S500005', firstName: 'Ref', lastName: 'Resh' });
  answer(env, a, 'c1-test', 'wrong');
  env.clk.t += 20 * MIN;
  Object.keys(env.cache).forEach((k) => delete env.cache[k]);            // simulate cache eviction / new server instance
  const again = env.post('login', { firstName: 'Ref', lastName: 'Resh', studentId: 'S500005', block: 'Block 6/7', code: CODES['Block 6/7'] });
  assert.ok(again.ok && again.resumed);
  assert.equal(again.state.items['c1-test'].n, 1);
  assert.equal(Date.parse(again.state.deadline) - env.clk.t, 70 * MIN);
  assert.equal(env.ss.getSheetByName('_Sessions').getLastRow(), 2, 'still exactly one record');
});

test('Reset Student Progress archives to the protected history, keeps one active row, and restores attempts and time', opts, () => {
  const env = boot();
  const a = joinAs(env, { studentId: 'S600006', firstName: 'Rae', lastName: 'Set' });
  finishChapter(env, a, 1, 'ok');
  env.clk.t += 30 * MIN;
  const rs = env.post('resetStudent', { teacherToken: env.tok, studentId: 'S600006', reason: 'Chromebook froze', confirm: true });
  assert.ok(rs.ok, JSON.stringify(rs));
  const audit = env.ss.getSheetByName('Audit History'); const row = audit.rows.find((r) => String(r[1]).startsWith('RESET'));
  assert.ok(row, 'audit row exists'); assert.equal(row[3], 'Chromebook froze'); assert.equal(row[4], 'S600006'); assert.equal(row[7], 'active');
  const snap = JSON.parse(row[10]); assert.ok(snap.items['c1-test'] && snap.items['c1-test'].st === 'correct', 'the previous answers are preserved');
  assert.equal(env.ss.getSheetByName('_Sessions').getLastRow(), 2, 'no duplicate active record');
  assert.equal(sessionRow(env, 'S600006').json.status, 'registered');
  const again = env.post('login', { firstName: 'Rae', lastName: 'Set', studentId: 'S600006', block: 'Block 6/7', code: CODES['Block 6/7'] });
  assert.equal(again.state.progress.done, 0);
  const b = env.post('begin', { sessionId: again.sessionId, token: again.token });
  assert.equal(Date.parse(b.state.deadline) - Date.parse(b.state.startedAt), 90 * MIN);
  env.call('u5RebuildNow');
  const master = env.ss.getSheetByName('Master Dashboard'), head = master.rows.find((r) => r[0] === 'First Name'), mr = master.rows.find((r) => r[0] === 'Rae');
  assert.match(mr[head.indexOf('Reset Status')], /Reset 1x/);
  assert.equal(env.post('listAudit', {}).code, 'BAD_ACTION');
});

test('Preview Mode and fictional test submissions never reach the gradebook tabs', opts, () => {
  const env = boot();
  joinAs(env, { studentId: 'S700007', firstName: 'Real', lastName: 'Student' });
  const pv = env.post('previewStart', { teacherToken: env.tok }); assert.ok(pv.ok);
  const g = env.post('generateDemo', { teacherToken: env.tok, count: 10 }); assert.ok(g.ok && g.created === 10);
  const t = env.post('testSheets', { teacherToken: env.tok }); assert.ok(t.ok && t.readBack, JSON.stringify(t));
  env.call('u5RebuildNow');
  const master = env.ss.getSheetByName('Master Dashboard');
  const names = master.rows.map((r) => String(r[0]));
  assert.ok(names.includes('Real') && !names.some((n) => n.includes('[DEMO]')), 'demo students are not in the Master Dashboard');
  assert.equal(env.ss.getSheetByName('_Sessions').getLastRow(), 2);
  const tr = env.ss.getSheetByName('Test Records'); assert.ok(tr.getLastRow() >= 11, 'fictional records are in Test Records');
  U5.BLOCKS.forEach((bk) => { const sh = env.ss.getSheetByName(bk); sh.rows.forEach((r) => assert.ok(!String(r[0]).includes('[DEMO]'))); });
  assert.equal(env.ss.getSheetByName('_Preview').getLastRow() >= 2, true);
});

test('locks: a busy script lock returns a retryable BUSY (never corrupts), a busy document lock only defers the report', opts, () => {
  const env = boot();
  const a = joinAs(env, { studentId: 'S800008', firstName: 'Lock', lastName: 'Test' });
  env.scriptLock(true);
  const r = answer(env, a, 'c1-test', 'ok');
  assert.equal(r.code, 'BUSY'); assert.equal(r.retryable, true);
  env.scriptLock(false);
  assert.equal(sessionRow(env, 'S800008').json.items['c1-test'], undefined, 'a rejected request used no attempt');
  assert.ok(answer(env, a, 'c1-test', 'ok').correct);
  env.docLock(true);
  const f = env.post('flushReports', { teacherToken: env.tok });
  assert.ok(f.ok);                                            // returns without throwing; the next tick will write
  env.docLock(false);
});

test('the idle watcher is cheap: no sessions to expire and nothing dirty means almost no sheet reads', opts, () => {
  const env = boot();
  joinAs(env, { studentId: 'S900009', firstName: 'Idle', lastName: 'Kid' });
  env.call('u5RebuildNow'); env.clk.t += 1000;
  const before = env.stats.reads, wrote = env.stats.writes;
  env.call('u5Tick');
  assert.ok(env.stats.reads - before <= 6, 'reads in an idle tick: ' + (env.stats.reads - before));
  assert.equal(env.stats.writes, wrote, 'an idle tick writes nothing');
});

test('the largest possible session record (every item wrong three times) fits a cell', opts, () => {
  const env = boot();
  const a = joinAs(env, { studentId: 'S110011', firstName: 'Big', lastName: 'Record' });
  for (let ch = 1; ch <= 6; ch++) idx.chapters[ch - 1].steps.filter((s) => s.kind === 'item').forEach((s) => { for (let k = 0; k < 3; k++) { const r = answer(env, a, s.id, 'wrong', k); assert.ok(r.ok, s.id + JSON.stringify(r)); if (r.locked) break; } });
  const row = sessionRow(env, 'S110011'); const len = env.ss.getSheetByName('_Sessions').cell(row.r, 7).length;
  console.log('worst-case session JSON length:', len);
  assert.ok(len < 49500);
  assert.equal(row.json.items['c6-synth'].st, 'locked');
});

test('security: no question text, option text or answer reaches the browser except after Begin; teacher endpoints need the token', opts, () => {
  const env = boot();
  const cfg = env.post('config', {}); const txt = JSON.stringify(cfg);
  ['Maple Ridge', 'Zendle', 'nucleus accumbens'].forEach((w) => assert.ok(!txt.includes(w)));
  assert.equal(env.post('answerKey', {}).code, 'FORBIDDEN');
  assert.equal(env.post('teacherOverview', { teacherToken: 'x'.repeat(40) }).code, 'FORBIDDEN');
  const st = env.post('login', { firstName: 'Un', lastName: 'Begun', studentId: 'S120012', block: 'Block 6/7', code: CODES['Block 6/7'] });
  assert.equal(env.post('content', { sessionId: st.sessionId, token: st.token, chapter: 1 }).code, 'NOT_STARTED');
  assert.equal(env.post('nonsense', {}).code, 'BAD_ACTION');
  const huge = env.ctx.doPost({ postData: { contents: 'x'.repeat(70000) } }); assert.equal(JSON.parse(huge.getContent()).ok, false);
});
