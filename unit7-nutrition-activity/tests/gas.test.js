// Tests the Google Apps Script backend (Code.gs + KeyData.gs) against a mock of the Google services.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEnv } from './gas-mock.js';
import { canon } from '../js/canon.js';
import { plan as planOf, allQuestions, canonOf } from './helpers.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fresh = () => { const env = makeEnv(root); env.run('setupGradebook()'); env.props.RESET_CODE = 'RESET-TEST-1'; return env; };
const student = (first = 'Ada', last = 'Lovelace', block = 'Block 3/4') => ({ first, last, block, code: 'UNIT7' });
const hasTab = (env, n) => env.book.has(n);
const rowsOf = (env, tab) => env.book.get(tab).slice(1).filter((r) => r.some((x) => x !== '' && x !== undefined));

/** Build a submission whose attempts follow `mode(qIndex)` = 1,2,3 (correct on that attempt) or 0 (three wrong). */
function submission(sid, st, mode = () => 1, extra = {}) {
  const { stageIds, qs } = planOf(0);
  const attempts = [];
  qs.forEach((q, i) => {
    const hit = mode(i, q);
    const wrong = (n) => ({ q: q.id, n, c: 'definitely-wrong-' + n, t: 1 });
    const right = (n) => ({ q: q.id, n, c: canonOf(q), t: 1 });
    if (hit === 0) { attempts.push(wrong(1), wrong(2), wrong(3)); }
    else { for (let n = 1; n < hit; n++) attempts.push(wrong(n)); attempts.push(right(hit)); }
  });
  return { action: 'submit', sid, student: st, assessmentId: 'unit7-nutrition-activity', versionId: 'V-T', seed: 's', startedAt: Date.now() - 3.2e6, completedAt: Date.now(), activeMs: 3.0e6, stageIds, attempts, clientScore: { earned: 100, possible: 100 }, choices: { focus: 'fuel' }, ...extra };
}

test('setupGradebook builds every required tab, the block tabs, settings and a dashboard passcode', () => {
  const env = fresh();
  for (const t of ['MASTER RESULTS', 'BLOCK 1-2', 'BLOCK 3-4', 'BLOCK 6-7', 'BLOCK 8-9', 'ITEM ANALYSIS', 'CLASS ANALYTICS', 'GRADE EXPORT', 'SETTINGS', 'SESSIONS']) assert.ok(hasTab(env, t), 'missing tab ' + t);
  assert.match(env.props.TEACHER_PASSCODE, /^DASH-\d{6}$/);
  const hdr = env.book.get('MASTER RESULTS')[0];
  for (const h of ['Timestamp', 'Student First Name', 'Student Last Name', 'Class Block', 'Assessment Version', 'Start Time', 'Submission Time', 'Total Duration (min)', 'Raw Points Earned', 'Total Points Possible', 'Final Percentage', 'Nutrition Foundations %', 'Nutrition Labels %', 'Physical Activity/FITT %', 'Marketing Literacy %', 'SMART Goals %', 'Food Systems %', 'Integrated Decision-Making %', 'First-Attempt Correct', 'Second-Attempt Correct', 'Third-Attempt Correct', 'Zero-Credit Questions', 'Completion Status']) assert.ok(hdr.includes(h), 'missing column ' + h);
  assert.deepEqual(env.book.get('BLOCK 1-2')[0], hdr);
  assert.ok(env.book.get('CLASS ANALYTICS').some((r) => String(r[1]).startsWith('=COUNTIFS')), 'analytics formulas present');
});

test('class code and block validation', () => {
  const env = fresh();
  assert.equal(env.call({ action: 'validate', code: 'unit7', first: 'A', last: 'B', block: 'Block 1/2' }).ok, true);
  assert.equal(env.call({ action: 'validate', code: 'NOPE', first: 'A', last: 'B', block: 'Block 1/2' }).error, 'invalid-code');
  assert.equal(env.call({ action: 'validate', code: 'UNIT7', first: 'A', last: 'B', block: 'Block 5' }).error, 'invalid-block');
  assert.equal(env.call({ action: 'validate', code: 'UNIT7', first: '', last: 'B', block: 'Block 1/2' }).error, 'invalid-name');
});

test('a perfect submission scores 100 points and is routed to MASTER and the right block tab only', () => {
  const env = fresh();
  assert.equal(env.call({ action: 'start', sid: 'S1', student: student('Ada', 'Lovelace', 'Block 6/7'), stageIds: planOf(0).stageIds }).ok, true);
  const r = env.call(submission('S1', student('Ada', 'Lovelace', 'Block 6/7')));
  assert.equal(r.ok, true); assert.deepEqual(r.score, { earned: 100, possible: 100 });
  const m = rowsOf(env, 'MASTER RESULTS'); assert.equal(m.length, 1);
  assert.equal(m[0][13], 1); assert.equal(m[0][1], 'LIVE'); assert.equal(m[0][24], 0); assert.equal(m[0][25], 'Submitted'); assert.equal(m[0][26], 'OK');
  assert.equal(rowsOf(env, 'BLOCK 6-7').length, 1);
  for (const t of ['BLOCK 1-2', 'BLOCK 3-4', 'BLOCK 8-9']) assert.equal(rowsOf(env, t).length, 0);
  const items = rowsOf(env, 'ITEM ANALYSIS'); assert.equal(items.length, planOf(0).qs.length);
  assert.ok(items.every((r2) => r2[18] === 'Correct (attempt 1)'));
});

test('100 / 85 / 75 / 0 attempt scoring is enforced on the server and totals are recomputed', () => {
  const env = fresh();
  const qs = planOf(0).qs, pts = (f) => qs.reduce((a, q, i) => a + Math.round(q.pts * f(i) * 100) / 100, 0);
  const cr = [1, 0.85, 0.75, 0];
  const mode = (i) => [1, 2, 3, 0][i % 4];
  const r = env.call(submission('S2', student('Bo', 'Peep'), mode));
  const expected = Math.round(pts((i) => cr[(mode(i) || 4) - 1]) * 100) / 100;
  assert.equal(r.score.earned, expected);
  const row = rowsOf(env, 'MASTER RESULTS')[0];
  assert.equal(row[11], expected);
  assert.equal(row[21] + row[22] + row[23] + row[24], qs.length);
  assert.equal(r.mismatch, true); // client claimed 100
  assert.match(row[28], /mismatch/);
});

test('three wrong attempts earn zero; fewer than 3 attempts and never correct also earns zero', () => {
  const env = fresh();
  const r = env.call(submission('S3', student('Zed', 'Zero'), () => 0));
  assert.equal(r.score.earned, 0);
  assert.equal(rowsOf(env, 'MASTER RESULTS')[0][24], planOf(0).qs.length);
});

test('duplicate submissions are flagged for review, never silently overwritten', () => {
  const env = fresh();
  env.call(submission('A1', student('Cy', 'Twombly')));
  const second = env.call(submission('A2', student('cy ', 'TWOMBLY'), () => 2));
  assert.equal(second.ok, true); assert.equal(second.duplicateFlag, true);
  const m = rowsOf(env, 'MASTER RESULTS'); assert.equal(m.length, 2);
  assert.equal(m[0][26], 'OK'); assert.equal(m[1][26], 'DUPLICATE: REVIEW'); assert.equal(m[1][27], 'A1');
  assert.equal(m[0][13], 1, 'original grade untouched');
  assert.equal(env.call({ action: 'validate', code: 'UNIT7', first: 'Cy', last: 'Twombly', block: 'Block 3/4' }).error, 'already-completed');
  // resubmitting the same session id is idempotent
  assert.equal(env.call(submission('A1', student('Cy', 'Twombly'))).duplicate, true);
  assert.equal(rowsOf(env, 'MASTER RESULTS').length, 2);
});

test('teacher reset (reset code) supersedes the old row and allows a retake', () => {
  const env = fresh();
  env.call(submission('R1', student('Di', 'Reset')));
  assert.equal(env.call({ action: 'reset_student', resetCode: 'wrong', first: 'Di', last: 'Reset', block: 'Block 3/4' }).error, 'bad-reset-code');
  assert.equal(env.call({ action: 'reset_student', resetCode: 'RESET-TEST-1', first: 'Di', last: 'Reset', block: 'Block 3/4' }).ok, true);
  assert.equal(rowsOf(env, 'MASTER RESULTS')[0][26], 'RESET: superseded');
  assert.equal(rowsOf(env, 'BLOCK 3-4')[0][26], 'RESET: superseded');
  const v = env.call({ action: 'validate', code: 'UNIT7', first: 'Di', last: 'Reset', block: 'Block 3/4' });
  assert.equal(v.ok, true); assert.equal(v.reset, true);
  const again = env.call(submission('R2', student('Di', 'Reset'), () => 2));
  assert.equal(again.duplicateFlag, false);
  assert.equal(rowsOf(env, 'MASTER RESULTS').length, 2);
});

test('teacher dashboard data requires the passcode and locks out after repeated failures', () => {
  const env = fresh();
  env.call(submission('T1', student('Ed', 'Teacher')));
  assert.equal(env.call({ action: 't_data', pass: 'nope' }).error, 'bad-passcode');
  const d = env.call({ action: 't_data', pass: env.props.TEACHER_PASSCODE });
  assert.equal(d.ok, true); assert.equal(d.students.length, 1); assert.equal(d.students[0].pct, 100); assert.equal(d.students[0].counted, 1);
  assert.equal(d.items.length, planOf(0).qs.length); assert.ok(d.meta['f-roles'].x);
  for (let i = 0; i < 8; i++) env.call({ action: 't_data', pass: 'bad' });
  assert.equal(env.call({ action: 't_data', pass: env.props.TEACHER_PASSCODE }).error, 'locked-out');
});

test('DEMO DATA: 28 labelled records across all four blocks; delete removes only demo rows', () => {
  const env = fresh();
  env.call(submission('REAL1', student('Real', 'Student', 'Block 8/9')));
  const g = env.call({ action: 't_demo_generate', pass: env.props.TEACHER_PASSCODE, count: 28 });
  assert.equal(g.created, 28);
  const m = rowsOf(env, 'MASTER RESULTS');
  assert.equal(m.filter((r) => r[1] === 'DEMO DATA').length, 28); assert.equal(m.filter((r) => r[1] === 'LIVE').length, 1);
  for (const t of ['BLOCK 1-2', 'BLOCK 3-4', 'BLOCK 6-7', 'BLOCK 8-9']) assert.ok(rowsOf(env, t).filter((r) => r[1] === 'DEMO DATA').length >= 5, t);
  const pcts = m.filter((r) => r[1] === 'DEMO DATA').map((r) => r[13]); assert.ok(Math.max(...pcts) - Math.min(...pcts) > 0.2, 'realistic range of scores');
  assert.ok(m.filter((r) => r[1] === 'DEMO DATA').every((r) => String(r[2]).startsWith('[DEMO]')));
  const d = env.call({ action: 't_data', pass: env.props.TEACHER_PASSCODE });
  assert.equal(d.students.filter((s) => s.counted).length, 1, 'DEMO excluded from analytics unless enabled');
  const del = env.call({ action: 't_demo_delete', pass: env.props.TEACHER_PASSCODE });
  assert.equal(del.deleted, 28);
  const after = rowsOf(env, 'MASTER RESULTS');
  assert.equal(after.length, 1); assert.equal(after[0][1], 'LIVE'); assert.equal(after[0][3], 'Student');
  assert.equal(rowsOf(env, 'ITEM ANALYSIS').every((r) => r[1] === 'LIVE'), true);
  assert.equal(rowsOf(env, 'BLOCK 8-9').length, 1);
});

test('server-grading mode: check() counts attempts and refuses a fourth', () => {
  const env = fresh();
  const { stageIds, qs } = planOf(0), q = qs.find((x) => x.type === 'mc');
  env.call({ action: 'start', sid: 'G1', student: student('Gus', 'Grader'), stageIds });
  assert.equal(env.call({ action: 'check', sid: 'G1', qid: q.id, n: 1, resp: 'wrong' }).correct, false);
  assert.equal(env.call({ action: 'check', sid: 'G1', qid: q.id, n: 1, resp: canon('mc', q.ans) }).replay, true, 'attempt 1 is idempotent and cannot be re-tried');
  assert.equal(env.call({ action: 'check', sid: 'G1', qid: q.id, n: 2, resp: canon('mc', q.ans) }).correct, true);
  assert.equal(env.call({ action: 'check', sid: 'G1', qid: q.id, n: 3, resp: 'x' }).error, 'locked');
});

test('rejects malformed input and oversize payloads without crashing', () => {
  const env = fresh();
  assert.equal(env.call({ action: 'submit', sid: '', student: student() }).ok, false);
  assert.equal(env.call({ action: 'submit', sid: 'X', student: { ...student(), block: 'Nope' } }).error, 'invalid-block');
  assert.equal(env.call({ action: 'wat' }).error, 'unknown-action');
  const big = JSON.parse(env.sandbox.doPost({ postData: { contents: 'x'.repeat(500000) } })._s);
  assert.equal(big.ok, false);
});
