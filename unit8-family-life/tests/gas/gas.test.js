'use strict';
// Runs the REAL generated apps-script/Code.gs against the strict Apps Script simulator (tests/gas/sim.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createWorld, ROOT } = require('./sim.js');
const { demoBuild, correctResponse, wrongResponse } = require('../unit/helpers.js');
const { buildText } = require('../../tools/build-apps-script.js');

const MIN = 60000;
const demo = demoBuild();

function ready(opts) {
  const w = createWorld(opts);
  w.setSeed(demo.bank);
  w.exec('setupWorkbook');
  w.ui.promptResponse = 'teacher-pass-1'; w.exec('setTeacherPasswordPrompt'); w.ui.promptResponse = null;
  w.exec('seedItemBank');
  w.codes = Object.fromEntries(w.table('Config', 2).filter((r) => String(r[0]).startsWith('code:')).map((r) => [String(r[0]).slice(5), String(r[1])]));
  w.login = (o) => w.post(Object.assign({ action: 'login', firstName: 'Ada', lastName: 'Lovelace', studentId: 'S1001', block: 'Block 1/2', classCode: w.codes['Block 1/2'] }, o || {}));
  w.begin = (o) => { const r = w.login(o); const b = w.post({ action: 'begin', token: r.token }); return { token: r.token, begin: b }; };
  w.teacher = () => w.post({ action: 'teacherLogin', password: 'teacher-pass-1' }).teacherToken;
  w.ids = () => Object.keys(demo.bank.items).sort((a, b) => demo.bank.items[a].order - demo.bank.items[b].order);
  w.submit = (token, id, good, rid) => w.post({ action: 'submit', token, itemId: id, response: (good ? correctResponse : wrongResponse)(demo.bank.items[id]), reqId: rid || id + (good ? 'g' : 'w') + Math.random() });
  return w;
}

/* ------------------------------------------------------------------ build + setup */
test('the committed Code.gs is exactly what the build produces (never stale) and contains no keys', () => {
  const committed = fs.readFileSync(path.join(ROOT, 'apps-script/Code.gs'), 'utf8');
  assert.equal(committed, buildText(), 'run: node tools/build-apps-script.js');
  Object.keys(demo.bank.items).forEach((id) => assert.equal(committed.includes(demo.bank.items[id].explanation), false));
  assert.equal(/teacher-pass|WALK-TEACHER-SECRET/.test(committed), false);
  const live = path.join(ROOT, 'private/itembank.json');
  if (fs.existsSync(live)) { const b = JSON.parse(fs.readFileSync(live, 'utf8')); Object.keys(b.items).forEach((id) => assert.equal(committed.includes(b.items[id].explanation.slice(0, 60)), false, 'live explanation in Code.gs: ' + id)); }
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps-script/appsscript.json'), 'utf8'));
  assert.equal(m.runtimeVersion, 'V8'); assert.equal(m.webapp.executeAs, 'USER_DEPLOYING'); assert.equal(m.webapp.access, 'ANYONE_ANONYMOUS');
});

test('setupWorkbook creates every tab, hides and protects the data tabs, sets random class codes, installs ONE 5-minute timer', () => {
  const w = ready();
  const names = w.sheets.map((s) => s.name);
  ['Master Dashboard', 'Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9', 'Config', 'ItemBank', 'Responses', 'Sessions', 'History', 'PreviewSessions'].forEach((n) => assert.ok(names.includes(n), 'missing tab ' + n));
  ['Config', 'ItemBank', 'Responses', 'Sessions', 'History', 'PreviewSessions'].forEach((n) => { assert.equal(w.sheet(n).hidden, true, n + ' should be hidden'); assert.equal(w.sheet(n).protections.length, 1, n + ' should be protected'); assert.equal(w.sheet(n).protections[0].warn, false); });
  ['Master Dashboard', 'Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9'].forEach((n) => { assert.equal(w.sheet(n).hidden, false); assert.equal(w.sheet(n).protections[0].warn, true, n + ' is a generated view: warn only'); });
  const codes = Object.values(w.codes);
  assert.equal(codes.length, 4); assert.equal(new Set(codes).size, 4, 'codes are distinct');
  codes.forEach((c) => assert.match(c, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/));
  w.exec('setupWorkbook'); w.exec('installTimer'); // safe to run again
  assert.equal(w.triggers.length, 1); assert.equal(w.triggers[0].fn, 'sweepExpired'); assert.equal(w.triggers[0].every, 5);
  assert.deepEqual(Object.fromEntries(w.table('Config', 2).filter((r) => String(r[0]).startsWith('code:')).map((r) => [String(r[0]).slice(5), String(r[1])])), w.codes, 'codes survive a second setup');
  assert.deepEqual(w.table('Sessions')[0], ['Student ID', 'Token', 'Token expires', 'Status', 'Block', 'Last name', 'First name', 'Session JSON', 'Updated']);
});

test('teacher password: stored only as a salted hash; too short is refused; the UI is optional', () => {
  const w = ready();
  const rec = JSON.parse(w.props.TEACHER_HASH);
  assert.ok(rec.salt && rec.hash && rec.hash.length === 64);
  assert.equal(JSON.stringify(w.props).includes('teacher-pass-1'), false);
  w.sheets.forEach((s) => assert.equal(JSON.stringify(s.rows).includes('teacher-pass-1'), false, 'password found in sheet ' + s.name));
  w.ui.promptResponse = 'short'; w.exec('setTeacherPasswordPrompt');
  assert.match(w.ui.alerts.slice(-1)[0][1], /too short/);
  assert.equal(JSON.parse(w.props.TEACHER_HASH).hash, rec.hash, 'unchanged');
  const w2 = createWorld({ noUi: true }); w2.exec('setTeacherPasswordPrompt'); // run from the editor: must not crash
  assert.ok(w2.logs.some((l) => /Unit 8 menu/.test(l)));
  assert.equal(w.post({ action: 'teacherLogin', password: 'wrong' }).error.code, 'TEACHER_PASSWORD');
  assert.equal(w.post({ action: 'teacherLogin', password: 'teacher-pass-1' }).ok, true);
});

test('seedItemBank without a seed file explains what to do; with one it loads and Health Check is all OK', () => {
  const w = createWorld(); w.exec('setupWorkbook');
  w.exec('seedItemBank'); assert.match(w.ui.alerts.slice(-1)[0][1], /No item bank found/);
  assert.equal(w.post({ action: 'ping' }).bank, null, 'ping works before the bank is loaded');
  w.setSeed(demo.bank); w.exec('seedItemBank');
  assert.equal(w.table('ItemBank').length, 1 + Object.keys(demo.bank.items).length);
  assert.equal(w.post({ action: 'ping' }).bank.structureHash, demo.bank.meta.structureHash);
  w.ui.promptResponse = 'teacher-pass-1'; w.exec('setTeacherPasswordPrompt'); w.exec('healthCheck');
  const report = w.ui.alerts.slice(-1)[0][1];
  assert.doesNotMatch(report, /FIX/, report);
  const tt = w.post({ action: 'teacherLogin', password: 'teacher-pass-1' }).teacherToken;
  const t = w.post({ action: 'tTest', tt });
  t.checks.forEach((c) => assert.equal(c.ok, true, c.name + ': ' + c.detail));
});

/* ------------------------------------------------------------------ a full student run, one fresh execution per request */
test('student flow through doPost: Sessions, Responses, Master Dashboard and block tab rows (upsert, never duplicates)', () => {
  const w = ready();
  const { token, begin } = w.begin();
  assert.equal(begin.session.status, 'in_progress');
  const ids = w.ids();
  const r1 = w.submit(token, ids[0], false); assert.equal(r1.correct, false);
  const r2 = w.submit(token, ids[0], true); assert.equal(r2.creditEarned, 0.85);
  w.submit(token, ids[1], true);
  assert.equal(w.table('Sessions', 2).length, 1, 'one session row per student');
  const resp = w.table('Responses', 2);
  assert.equal(resp.length, 3); assert.deepEqual(resp.map((r) => [r[4], r[5], r[6]]), [[ids[0], 1, 0], [ids[0], 2, 1], [ids[1], 1, 1]]);
  const fin = w.post({ action: 'finish', token, confirm: true });
  assert.equal(fin.ok, true); assert.equal(fin.completion.submissionType, 'Student Submit');
  const master = w.table('Master Dashboard', 11);
  assert.equal(master.length, 2, 'header + exactly one student row');
  const hdr = master[0], row = master[1];
  const col = (n) => row[hdr.indexOf(n)];
  assert.equal(col('Student ID'), 'S1001'); assert.equal(col('Status'), 'Submitted'); assert.equal(col('Submission type'), 'Student Submit');
  assert.equal(col('Points'), fin.completion.points); assert.equal(col('Percent'), fin.completion.percent); assert.equal(col('Block'), 'Block 1/2');
  const blk = w.table('Block 1/2', 3); assert.equal(blk.length, 2);
  assert.equal(blk[1][blk[0].indexOf(ids[0] + ' attempts')], 2); assert.equal(blk[1][blk[0].indexOf(ids[0] + ' credit')], 0.85);
  assert.equal(w.table('Block 3/4', 3).length, 1, 'other block tabs have no student rows');
  // a second student does not overwrite the first, and begin/final upserts keep one row each
  w.begin({ studentId: 'S2002', lastName: 'Turing', firstName: 'Alan', block: 'Block 3/4', classCode: w.codes['Block 3/4'] });
  assert.equal(w.table('Master Dashboard', 11).length, 3);
  assert.equal(w.table('Block 3/4', 3).length, 2);
});

test('the cache is only an accelerator: wiping it mid-assessment changes nothing for the student', () => {
  const w = ready();
  const { token } = w.begin(); const ids = w.ids();
  w.submit(token, ids[0], false);
  w.evictCache();
  const st = w.post({ action: 'state', token });
  assert.equal(st.ok, true); assert.equal(st.items[ids[0]].a, 1, 'attempt count came back from the sheet');
  w.evictCache();
  const r = w.submit(token, ids[0], true); assert.equal(r.attempt, 2); assert.equal(r.creditEarned, 0.85);
  w.evictCache();
  const login = w.login(); assert.equal(login.resumed, true); assert.equal(login.items[ids[0]].ok, 1);
  w.evictCache();
  const tt = w.teacher(); w.evictCache();
  assert.equal(w.post({ action: 'tRoster', tt }).ok, false, 'teacher tokens live only in the cache, so the teacher just signs in again');
});

test('a busy lock gives a retryable BUSY answer, and the retry (same reqId) is graded exactly once', () => {
  const w = ready();
  const { token } = w.begin(); const id = w.ids()[0]; const rid = 'retry-1';
  w.holdLock();
  const busy = w.post({ action: 'submit', token, itemId: id, response: correctResponse(demo.bank.items[id]), reqId: rid });
  assert.equal(busy.ok, false); assert.equal(busy.error.code, 'BUSY'); assert.match(busy.error.message, /not lost/);
  assert.equal(w.table('Responses', 2).length, 0, 'nothing was recorded while the lock was busy');
  w.freeLock();
  const ok = w.post({ action: 'submit', token, itemId: id, response: correctResponse(demo.bank.items[id]), reqId: rid });
  assert.equal(ok.correct, true);
  const dup = w.post({ action: 'submit', token, itemId: id, response: correctResponse(demo.bank.items[id]), reqId: rid });
  assert.equal(dup.alreadyDone || dup.duplicate, true);
  assert.equal(w.table('Responses', 2).length, 1);
});

test('30 students (own block codes), interleaved answers: every attempt recorded once; counts are exact', () => {
  const w = ready();
  const ids = w.ids(), blocks = ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9'];
  const toks = [];
  for (let i = 0; i < 30; i++) {
    const b = blocks[i % 4];
    const r = w.login({ studentId: 'ST' + String(i).padStart(3, '0'), lastName: 'Student' + i, firstName: 'S' + i, block: b, classCode: w.codes[b] });
    assert.equal(r.ok, true, JSON.stringify(r)); w.post({ action: 'begin', token: r.token }); toks.push(r.token);
  }
  let attempts = 0;
  for (let round = 0; round < 2; round++) toks.forEach((t, i) => { const id = ids[(i + round) % ids.length]; const r = w.submit(t, id, (i + round) % 3 !== 0); if (r.ok) attempts++; });
  assert.equal(w.table('Sessions', 2).length, 30);
  assert.equal(w.table('Responses', 2).length, attempts);
  assert.equal(new Set(w.table('Sessions', 2).map((r) => r[0])).size, 30, 'no duplicate student rows');
  // per-session attempt totals add up to the Responses log
  const total = w.table('Sessions', 2).reduce((a, r) => a + Object.values(JSON.parse(r[7]).items).reduce((x, it) => x + it.a, 0), 0);
  assert.equal(total, attempts);
  w.exec('sweepExpired');
  assert.equal(w.table('Master Dashboard', 12).length, 30, 'the 5-minute rebuild lists everyone once');
  const top = w.table('Master Dashboard', 3).slice(0, 5);
  assert.equal(top[0][0], 'Block'); assert.equal(top[1][0], 'Block 1/2'); assert.ok(top[1][1] >= 7);
});

/* ------------------------------------------------------------------ the timer and the 5-minute trigger */
test('the 5-minute trigger auto-submits expired sessions, scores unanswered items as 0, and updates the sheets', () => {
  const w = ready();
  const a = w.begin({ studentId: 'AAA1', lastName: 'Alpha' }); const ids = w.ids();
  w.submit(a.token, ids[0], true);
  w.clock.t += 60 * MIN;
  const b = w.begin({ studentId: 'BBB2', lastName: 'Beta', block: 'Block 3/4', classCode: w.codes['Block 3/4'] });
  w.clock.t += 31 * MIN; // A is 1 minute past its deadline; B has 59 left
  const n = w.exec('sweepExpired');
  assert.equal(n, 1);
  const rows = Object.fromEntries(w.table('Sessions', 2).map((r) => [r[0], JSON.parse(r[7])]));
  assert.equal(rows.AAA1.status, 'auto_submitted'); assert.equal(rows.AAA1.submissionType, 'Time Expired — Auto-Submitted'); assert.equal(rows.BBB2.status, 'in_progress');
  const m = w.table('Master Dashboard', 11); const hdr = m[0];
  const aRow = m.find((r) => r[0] === 'AAA1');
  assert.equal(aRow[hdr.indexOf('Status')], 'Auto-submitted'); assert.equal(aRow[hdr.indexOf('Submission type')], 'Time Expired — Auto-Submitted');
  assert.equal(aRow[hdr.indexOf('Points')], demo.bank.items[ids[0]].points);
  assert.equal(w.post({ action: 'submit', token: a.token, itemId: ids[1], response: correctResponse(demo.bank.items[ids[1]]), reqId: 'late' }).error.code, 'FINALIZED');
  assert.equal(w.exec('sweepExpired'), 0);
  assert.ok(b.token);
});

test('a late submission is rejected by the server itself, not just by the trigger', () => {
  const w = ready(); const { token } = w.begin(); const ids = w.ids();
  w.clock.t += 91 * MIN;
  const r = w.submit(token, ids[0], true);
  assert.equal(r.ok, false); assert.equal(r.error.code, 'EXPIRED');
  assert.equal(w.table('Responses', 2).length, 0);
  assert.equal(JSON.parse(w.table('Sessions', 2)[0][7]).status, 'auto_submitted');
});

/* ------------------------------------------------------------------ teacher actions on the sheets */
test('reset copies the full record to History, clears the session, and updates the dashboards', () => {
  const w = ready(); const tt = w.teacher(); const { token } = w.begin(); const ids = w.ids();
  w.submit(token, ids[0], true); w.post({ action: 'finish', token, confirm: true });
  assert.equal(w.post({ action: 'tReset', tt, studentId: 'S1001', lastName: 'Wrong' }).error.code, 'CONFIRM_MISMATCH');
  assert.equal(w.table('History', 2).length, 0);
  const r = w.post({ action: 'tReset', tt, studentId: 'S1001', lastName: 'LOVELACE', reason: 'Technical problem' });
  assert.equal(r.ok, true);
  const hist = w.table('History', 2); assert.equal(hist.length, 1);
  const rec = JSON.parse(hist[0][10]); assert.equal(rec.studentId, 'S1001'); assert.ok(rec.items[ids[0]].ok); assert.equal(hist[0][9], 'Technical problem');
  const sess = JSON.parse(w.table('Sessions', 2)[0][7]); assert.equal(sess.status, 'reset'); assert.deepEqual(sess.items, {}); assert.equal(sess.resetCount, 1);
  const m = w.table('Master Dashboard', 11); assert.equal(m.length, 2); assert.equal(m[1][m[0].indexOf('Status')], 'Reset (ready)'); assert.equal(m[1][m[0].indexOf('Resets')], 1);
  assert.equal(w.post({ action: 'state', token }).error.code, 'NO_SESSION');
  const again = w.login(); assert.equal(again.session.status, 'reset');
  assert.equal(w.post({ action: 'begin', token: again.token }).items[ids[0]].a, 0);
});

test('accommodation time and settings are stored in the sheets and survive a cache wipe', () => {
  const w = ready(); const tt = w.teacher(); w.login();
  assert.equal(w.post({ action: 'tSetTime', tt, studentId: 'S1001', allowedMinutes: 135 }).allowedMinutes, 135);
  const b = w.post({ action: 'begin', token: w.login().token });
  assert.equal(b.session.deadline - b.session.startTime, 135 * MIN);
  const tt2 = w.teacher();
  const set = w.post({ action: 'tSetSettings', tt: tt2, settings: { classCodes: { 'Block 6/7': 'New-Code-7' }, defaultMinutes: 75, showScore: false, open: false, disabledItems: [w.ids()[0]] } });
  assert.equal(set.ok, true);
  w.evictCache();
  const cfg = w.table('Config', 2); const get = (k) => cfg.find((r) => r[0] === k)[1];
  assert.equal(get('code:Block 6/7'), 'NEW-CODE-7'); assert.equal(get('defaultMinutes'), 75); assert.equal(get('showScore'), false); assert.equal(get('open'), false); assert.equal(get('disabledItems'), w.ids()[0]);
  const tt3 = w.teacher(); const g = w.post({ action: 'tGetSettings', tt: tt3 });
  assert.equal(g.settings.showScore, false); assert.equal(g.settings.open, false); assert.deepEqual(g.settings.disabledItems, [w.ids()[0]]);
});

test('preview is isolated: its own sheet row, never in Sessions, Responses, dashboards, roster or export', () => {
  const w = ready(); const tt = w.teacher(); w.begin({ studentId: 'REAL1', lastName: 'Real' });
  const p = w.post({ action: 'tPreviewStart', tt }); assert.equal(p.ok, true); const ids = w.ids();
  w.submit(p.token, ids[0], true); w.submit(p.token, ids[1], true);
  assert.equal(w.table('Sessions', 2).length, 1); assert.equal(w.table('Responses', 2).length, 0, 'preview answers are never in the student log');
  assert.equal(JSON.parse(w.table('PreviewSessions', 2)[0][7]).preview, true);
  assert.equal(w.table('Master Dashboard', 11).length, 2);
  assert.equal(w.post({ action: 'tRoster', tt }).rows.length, 1); assert.equal(w.post({ action: 'tExport', tt }).roster.length, 2);
  assert.equal(w.post({ action: 'tAnalytics', tt }).analytics.byBlock['Block 1/2'].students, 1);
  w.post({ action: 'tPreviewReset', tt });
  assert.equal(w.table('PreviewSessions', 2).filter((r) => r[0] !== '').length, 0);
  assert.equal(w.post({ action: 'state', token: p.token }).error.code, 'NO_SESSION');
});

test('teacher tokens expire (cache TTL) and the failed-login throttle slows guessing without locking the teacher out', () => {
  const w = ready(); const tt = w.teacher();
  assert.equal(w.post({ action: 'tRoster', tt }).ok, true);
  w.clock.t += 2 * 3600 * 1000 + 1000;
  assert.equal(w.post({ action: 'tRoster', tt }).error.code, 'TEACHER_AUTH');
  for (let i = 0; i < 7; i++) w.post({ action: 'teacherLogin', password: 'guess' + i });
  assert.ok(w.stats.slept > 0, 'later guesses are delayed');
  assert.equal(w.post({ action: 'teacherLogin', password: 'teacher-pass-1' }).ok, true, 'the real password still works');
});

/* ------------------------------------------------------------------ platform limits and hygiene */
test('doGet and bad requests reveal nothing', () => {
  const w = ready();
  assert.deepEqual(Object.keys(w.get()).sort(), ['ok', 'serverNow', 'service', 'version']);
  assert.equal(w.post('not json').error.code, 'BAD_REQUEST');
  assert.equal(w.post({ action: 'tKeys' }).error.code, 'TEACHER_AUTH');
  const text = JSON.stringify([w.get(), w.post('{}'), w.post({ action: 'ping' })]);
  assert.equal(/TEACHER_HASH|salt|CODE|key/.test(text.replace(/"key"/g, '')), false);
});

test('request cost on a warm cache: a graded answer touches the sheet only a few times', () => {
  const w = ready(); const { token } = w.begin(); const ids = w.ids();
  w.submit(token, ids[0], false); // warm everything
  const before = JSON.parse(JSON.stringify({ r: w.stats.reads, w: w.stats.writes, a: w.stats.appends }));
  w.submit(token, ids[0], true);
  const used = { reads: w.stats.reads - before.r, writes: w.stats.writes - before.w, appends: w.stats.appends - before.a };
  // a fresh execution re-reads from the cache; sheet reads are only for the row-number check; one write for the session and one append for the log
  assert.ok(used.reads <= 3, 'sheet reads per answer: ' + used.reads);
  assert.ok(used.writes <= 2, 'sheet writes per answer: ' + used.writes);
  assert.equal(used.appends, 1);
  fs.writeFileSync(path.join(__dirname, 'last-cost.json'), JSON.stringify({ note: 'Sheet operations for one graded answer, warm cache, in the simulator', ...used }, null, 2) + '\n');
});

test('the full real-size bank fits Sheets/Cache limits: wide block tabs grow the grid, session JSON stays small', { skip: !fs.existsSync(path.join(ROOT, 'private/itembank.json')) && 'private bank not present' }, () => {
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'private/itembank.json'), 'utf8'));
  const w = createWorld(); w.setSeed(bank); w.exec('setupWorkbook');
  w.ui.promptResponse = 'teacher-pass-1'; w.exec('setTeacherPasswordPrompt'); w.exec('seedItemBank');
  assert.equal(w.table('ItemBank', 2).length, 40);
  const codes = Object.fromEntries(w.table('Config', 2).filter((r) => String(r[0]).startsWith('code:')).map((r) => [String(r[0]).slice(5), String(r[1])]));
  const r = w.post({ action: 'login', firstName: 'Ada', lastName: 'Lovelace', studentId: 'S1001', block: 'Block 1/2', classCode: codes['Block 1/2'] });
  const b = w.post({ action: 'begin', token: r.token }); assert.equal(b.itemIds.length, 40);
  const ids = Object.keys(bank.items).sort((x, y) => bank.items[x].order - bank.items[y].order);
  ids.forEach((id) => { const it = bank.items[id]; const resp = it.type === 'single' ? { choice: it.key.correct } : it.type === 'multi' ? { choices: it.key.correct } : it.type === 'assign' ? { map: it.key.map } : it.type === 'order' ? { order: it.key.order } : { value: it.key.value }; const s = w.post({ action: 'submit', token: r.token, itemId: id, response: resp, reqId: id }); assert.equal(s.correct, true, id); });
  const fin = w.post({ action: 'finish', token: r.token, confirm: true });
  assert.equal(fin.completion.points, 100); assert.equal(fin.completion.percent, 100);
  const sessJson = w.table('Sessions', 2)[0][7];
  assert.ok(sessJson.length < 15000, 'session JSON is ' + sessJson.length + ' chars (cell limit 50,000)');
  const blk = w.sheet('Block 1/2'); assert.ok(blk.maxCols >= 22 + 80, 'block tab grew to ' + blk.maxCols + ' columns');
  const t = w.table('Block 1/2', 3); assert.equal(t[1][t[0].indexOf('C1-01 credit')], 1);
  assert.equal(w.table('Master Dashboard', 11)[1][13 - 1 + 0], 100);
  w.evictCache(); assert.equal(w.post({ action: 'state', token: r.token }).ok, true);
  // the whole bank must round-trip through the 100 KB cache chunks
  assert.ok([...w.cacheStore.keys()].some((k) => k.startsWith('bank:')));
});
