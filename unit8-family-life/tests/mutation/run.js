#!/usr/bin/env node
'use strict';
/*
 * Mutation testing of the server code.
 *
 * For each mutation: copy the project to a scratch folder, make ONE small deliberate bug in server/core.js, server/gas/*.js (and
 * rebuild apps-script/Code.gs so the "Code.gs is not stale" test does not trivially fail), then run the unit + Apps Script
 * simulator tests. A mutation is KILLED if any test fails and SURVIVED if every test still passes. A survivor means the tests
 * do not notice that bug; each survivor is listed with a note on whether it is a real gap or an equivalent change.
 *
 *   node tests/mutation/run.js
 *
 * Needs only Node. The private files are NOT copied, so this also works on a fresh clone. Writes tests/mutation/last-run.json.
 * This tests the TESTS. It does not test the live Google deployment.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..', '..');

/* find must occur EXACTLY once in its file. `note` explains a survivor. */
const M = [
  // ---- scoring and grading (server/core.js)
  { id: 'credit-2nd', file: 'server/core.js', find: 'var CREDIT = [1, 0.85, 0.75];', rep: 'var CREDIT = [1, 0.9, 0.75];', what: 'second try is worth 90% instead of 85%' },
  { id: 'credit-3rd', file: 'server/core.js', find: 'var CREDIT = [1, 0.85, 0.75];', rep: 'var CREDIT = [1, 0.85, 0.8];', what: 'third try is worth 80% instead of 75%' },
  { id: 'attempts-4', file: 'server/core.js', find: 'var MAX_ATTEMPTS = 3;', rep: 'var MAX_ATTEMPTS = 4;', what: 'four attempts instead of three' },
  { id: 'locked-credit', file: 'server/core.js', find: 'st.l = 1; st.c = 0;', rep: 'st.l = 1; st.c = 0.25;', what: 'a locked item still earns 25%' },
  { id: 'multi-superset', file: 'server/core.js', find: "case 'multi': return sameSet(resp.choices, key.correct || []);", rep: "case 'multi': return (key.correct || []).every(function (x) { return resp.choices.indexOf(x) >= 0; });", what: 'select-all accepts extra wrong choices' },
  { id: 'order-length', file: 'server/core.js', find: 'return resp.order.length === o.length;', rep: 'return true;', what: 'ordering ignores a wrong-length answer', note: 'EQUIVALENT: validateResponse already rejects a wrong-length order before grading, so this second check is defence in depth.' },
  { id: 'hint-off-by-one', file: 'server/core.js', find: 'res.hint = (bi.hints || [])[st.a - 1] || null;', rep: 'res.hint = (bi.hints || [])[st.a] || null;', what: 'hint 2 is shown after the first miss' },
  { id: 'percent-denominator', file: 'server/core.js', find: 'percent: possible ? round1(pts / possible * 100) : 0,', rep: 'percent: round1(pts / 100 * 100),', what: 'percent ignores turned-off items' },
  { id: 'disabled-ignored', file: 'server/core.js', find: 'return s.preview || !disabled[id];', rep: 'return true;', what: 'turned-off questions are still asked' },
  { id: 'stage-lock-off', file: 'server/core.js', find: 'if (bi.unlockAfter && !s.preview) {', rep: 'if (false) {', what: 'a staged step can be answered before the earlier one' },
  { id: 'dup-reqid-off', file: 'server/core.js', find: 'if (rid && st.rid === rid && st.last) {', rep: 'if (false) {', what: 'a retried request counts as a new attempt' },
  // ---- time
  { id: 'submit-grace', file: 'server/core.js', find: 'if (!s.preview && s.status === STATUS.IN_PROGRESS && s.deadline && t > s.deadline) {\n          finalize(s, \'auto\', t);', rep: 'if (!s.preview && s.status === STATUS.IN_PROGRESS && s.deadline && t > s.deadline + 600000) {\n          finalize(s, \'auto\', t);', what: 'a late answer is accepted for 10 extra minutes' },
  { id: 'sweep-late', file: 'server/core.js', find: "if (s.status === STATUS.IN_PROGRESS && s.deadline && t > s.deadline) { finalize(s, 'auto', t); n++; }", rep: "if (s.status === STATUS.IN_PROGRESS && s.deadline && t > s.deadline + 3600000) { finalize(s, 'auto', t); n++; }", what: 'the timer waits an hour past the deadline' },
  { id: 'expire-on-read-off', file: 'server/core.js', find: 'if (s && !s.preview && s.status === STATUS.IN_PROGRESS && s.deadline && now() > s.deadline) return finalize(s, \'auto\', now());', rep: 'if (false) return s;', what: 'expired sessions are not finalized when touched' },
  // ---- sign-in and identity
  { id: 'class-code-off', file: 'server/core.js', find: "if (!expected || !constEq(code, expected)) fail('BAD_CODE'", rep: "if (!expected) fail('BAD_CODE'", what: 'any class code is accepted' },
  { id: 'last-name-check-off', file: 'server/core.js', find: "if (normName(s.lastName) !== normName(last)) fail('ID_MISMATCH'", rep: "if (false) fail('ID_MISMATCH'", what: 'a different last name can use an existing ID' },
  { id: 'block-lock-off', file: 'server/core.js', find: "if (started && s.block !== block) fail('BLOCK_LOCKED'", rep: "if (false) fail('BLOCK_LOCKED'", what: 'block can change after Begin' },
  { id: 'student-token-expiry-off', file: 'server/core.js', find: "if (s.tokenExp && now() > s.tokenExp) fail('NO_SESSION', 'Your sign-in expired. Please sign in again.');", rep: '', what: 'student tokens never expire' },
  // ---- teacher
  { id: 'teacher-expiry-off', file: 'server/core.js', find: "if (!exp || now() > exp) fail('TEACHER_AUTH'", rep: "if (!exp) fail('TEACHER_AUTH'", what: 'teacher tokens never expire' },
  { id: 'teacher-throttle-off', file: 'server/core.js', find: 'if (fails >= 5 && store.sleep)', rep: 'if (false)', what: 'repeated wrong teacher passwords are not slowed' },
  { id: 'password-length', file: 'server/core.js', find: "if (pw.length < 8) fail('BAD_INPUT', 'Use at least 8 characters.');", rep: "if (pw.length < 1) fail('BAD_INPUT', 'Use at least 8 characters.');", what: 'a 1-character teacher password is accepted' },
  { id: 'reset-name-check-off', file: 'server/core.js', find: "if (normName(req.lastName) !== normName(s.lastName)) fail('CONFIRM_MISMATCH'", rep: "if (false) fail('CONFIRM_MISMATCH'", what: 'reset does not need the typed last name' },
  { id: 'closed-ignored', file: 'server/core.js', find: "if (!s.preview && !cfg.open) fail('CLOSED', 'This assessment is not open right now. Ask your teacher.');\n        var disabled", rep: "var disabled", what: 'Begin works while the assessment is closed' },
  // ---- Apps Script adapter and workbook tools
  { id: 'busy-mapping', file: 'server/gas/sheets-store.js', find: "throw new W8Core.ApiError('BUSY'", rep: "throw new Error('BUSY'", what: 'a busy lock crashes instead of a retryable BUSY' },
  { id: 'lock-not-released', file: 'server/gas/sheets-store.js', find: 'finally { depth--; lock.releaseLock(); }', rep: 'finally { depth--; }', what: 'the script lock is never released' },
  { id: 'preview-logged', file: 'server/gas/sheets-store.js', find: 'if (r.preview) return; // preview answers live only in the PreviewSessions row, never in the student log', rep: '', what: 'preview answers are written to the student log' },
  { id: 'cache-writethrough-off', file: 'server/gas/sheets-store.js', find: "      cput('s:' + s.studentId, s);\n      if (s.token) cache.put('t:' + s.token, s.studentId, W8_CACHE_TTL);", rep: "      if (s.token) cache.put('t:' + s.token, s.studentId, W8_CACHE_TTL);", what: 'saved sessions are not written through to the cache' },
  { id: 'wrong-row-update', file: 'server/gas/sheets-store.js', find: 'else sh.getRange(row, 1, 1, 9).setValues([vals]);', rep: 'else sh.getRange(row + 1, 1, 1, 9).setValues([vals]);', what: 'an existing student row update writes the next row' },
  { id: 'teacher-token-ttl', file: 'server/gas/sheets-store.js', find: "cache.put('tt:' + tok, String(exp), 7200);", rep: "cache.put('tt:' + tok, String(exp), 21600);", what: 'teacher tokens are cached 6 hours instead of 2', note: 'EQUIVALENT while core.js also checks the expiry time itself.' },
  { id: 'hide-data-tabs-off', file: 'server/gas/entry.js', find: "if (hide) { try { sh.hideSheet(); }", rep: "if (false) { try { sh.hideSheet(); }", what: 'the data tabs are not hidden' },
  { id: 'class-code-fixed', file: 'server/gas/entry.js', find: 'cfg.classCodes[b] = W8Core.randomCode({ uuid: Utilities.getUuid }, 6);', rep: "cfg.classCodes[b] = 'AAAAAA';", what: 'every class code is AAAAAA' },
  { id: 'timer-interval', file: 'server/gas/entry.js', find: "ScriptApp.newTrigger('sweepExpired').timeBased().everyMinutes(5).create();", rep: "ScriptApp.newTrigger('sweepExpired').timeBased().everyMinutes(30).create();", what: 'the auto-submit timer runs every 30 minutes' }
];

function copyTree(src, dst, skip) {
  fs.mkdirSync(dst, { recursive: true });
  fs.readdirSync(src, { withFileTypes: true }).forEach((e) => {
    if (skip(e.name, src)) return;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyTree(s, d, skip); else fs.copyFileSync(s, d);
  });
}

function runTests(dir) {
  const files = ['tests/unit', 'tests/gas'].flatMap((d) => fs.readdirSync(path.join(dir, d)).filter((f) => /\.test\.js$/.test(f)).map((f) => path.join(d, f)));
  const r = spawnSync(process.execPath, ['--test'].concat(files), { cwd: dir, encoding: 'utf8', timeout: 180000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const failing = Array.from(out.matchAll(/^not ok \d+ - (.*)$/gm)).map((m) => m[1]);
  return { pass: r.status === 0, timedOut: r.error && r.error.code === 'ETIMEDOUT', failing };
}

function rebuildCodeGs(dir) { return spawnSync(process.execPath, ['tools/build-apps-script.js'], { cwd: dir, encoding: 'utf8' }).status === 0; }

function main() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'w8-mut-'));
  const skip = (name) => ['node_modules', '.git', 'authoring', 'private', 'test-results', 'vault'].includes(name);
  let results = [], invalid = 0;
  try {
    copyTree(root, work, skip);
    if (!rebuildCodeGs(work)) throw new Error('baseline: could not build Code.gs');
    const base = runTests(work);
    if (!base.pass) { console.error('Baseline tests FAIL in the scratch copy, so mutation results would mean nothing:\n  ' + base.failing.join('\n  ')); process.exit(2); }
    console.log('Baseline: all tests pass in the scratch copy (private files excluded). Running ' + M.length + ' mutations...\n');
    const originals = {};
    M.forEach((m) => {
      const fp = path.join(work, m.file);
      if (!(m.file in originals)) originals[m.file] = fs.readFileSync(fp, 'utf8');
      const orig = originals[m.file];
      const count = orig.split(m.find).length - 1;
      if (count !== 1) { invalid++; results.push(Object.assign({}, m, { status: 'INVALID', detail: 'find string occurs ' + count + ' times' })); console.log('  INVALID  ' + m.id + ' (' + count + ' matches)'); return; }
      fs.writeFileSync(fp, orig.replace(m.find, () => m.rep));
      let res;
      try {
        const built = rebuildCodeGs(work);
        res = built ? runTests(work) : { pass: false, failing: ['(Code.gs build failed)'] };
      } finally { fs.writeFileSync(fp, orig); }
      const status = res.pass ? 'SURVIVED' : 'killed';
      results.push(Object.assign({}, m, { status, killedBy: res.failing.slice(0, 2) }));
      console.log('  ' + (res.pass ? 'SURVIVED' : 'killed  ') + '  ' + m.id.padEnd(26) + m.what + (res.pass ? '' : '   <- ' + (res.failing[0] || '').slice(0, 70)));
    });
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
  const killed = results.filter((r) => r.status === 'killed').length, survived = results.filter((r) => r.status === 'SURVIVED');
  console.log('\n' + killed + ' of ' + results.length + ' mutations killed; ' + survived.length + ' survived; ' + invalid + ' invalid.');
  survived.forEach((s) => console.log('  survivor: ' + s.id + ' (' + s.what + ')' + (s.note ? ' - ' + s.note : '')));
  fs.writeFileSync(path.join(__dirname, 'last-run.json'), JSON.stringify({ when: new Date().toISOString(), node: process.version, total: results.length, killed, survived: survived.map((s) => ({ id: s.id, what: s.what, note: s.note || null })), invalid, results: results.map((r) => ({ id: r.id, what: r.what, status: r.status })) }, null, 2) + '\n');
  process.exit(invalid ? 2 : 0);
}
main();
