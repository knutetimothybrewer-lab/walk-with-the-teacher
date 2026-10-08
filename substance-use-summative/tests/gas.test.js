import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEnv } from './gas-mock.js';
import { buildPlan, planParts } from '../js/engine.js';
import { canon } from '../js/canon.js';
import content from '../content/public.js';
import { passingPaths } from '../js/chatmodel.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mods = []; for (const m of ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8']) mods.push((await import(`../authoring/${m}.js`)).default);
const chat = (await import('../authoring/chat.js')).default;
function* aq(st) { for (const s of st) { if (s.kind === 'pool') for (const g of s.groups) yield* aq(g.items); else if (s.kind === 'q') yield s.q; else yield* s.qs; } }
const A = Object.fromEntries(mods.flatMap((m) => [...aq(m.stages)]).map((q) => [q.id, q]));
const respFor = (q) => (q.type === 'run' ? passingPaths(chat)[0] : q.ans);

function session(seed, perfect = true) {
  const plan = buildPlan(content, seed), parts = planParts(plan);
  const attempts = parts.flatMap((p) => { const q = A[p.id]; return perfect ? [{ q: p.id, n: 1, c: canon(q.type, respFor(q)), t: Date.now() }] : []; });
  return { plan, parts, attempts, stageIds: plan.ids };
}
const student = (n = 'Ada Lovelace', code = 'HEALTH2') => ({ name: n, period: '2', code });

test('setup creates tabs; DEMO and configured codes validate; unknown code is refused', () => {
  const env = makeEnv(root); env.run('setup()');
  assert.ok(['Summary', 'Questions', 'Config', 'Sessions', 'Analytics'].every((n) => env.book.has(n)));
  assert.equal(env.call({ action: 'validate', code: 'DEMO2026' }).demo, true);
  assert.equal(env.call({ action: 'validate', code: 'health2' }).ok, true);
  assert.equal(env.call({ action: 'validate', code: 'NOPE' }).error, 'invalid-code');
  assert.equal(env.call({ action: 'ping' }).ok, true);
  assert.equal(env.call({ action: 'bogus' }).error, 'unknown-action');
});

test('a perfect submission scores 100, writes Summary (1 row) and Questions (1 row per question), and is idempotent', () => {
  const env = makeEnv(root); env.run('setup()');
  const s = session('a1'), st = student();
  assert.equal(env.call({ action: 'start', sid: 'S-1', student: st, stageIds: s.stageIds, versionId: 'V-X' }).ok, true);
  const r = env.call({ action: 'submit', sid: 'S-1', student: st, stageIds: s.stageIds, attempts: s.attempts, startedAt: Date.now() - 3e6, completedAt: Date.now(), activeMs: 2.9e6, clientScore: { earned: 100, possible: 100 }, versionId: 'V-X' });
  assert.equal(r.ok, true); assert.equal(r.score.earned, 100); assert.equal(r.score.possible, 100); assert.equal(r.mismatch, false);
  const sum = env.book.get('Summary'), q = env.book.get('Questions');
  assert.equal(sum.length, 2); assert.equal(q.length - 1, s.parts.length);
  assert.equal(sum[1][1], 'Ada Lovelace'); assert.equal(sum[1][16], 'Completed'); assert.equal(sum[1][17], 'LIVE');
  const again = env.call({ action: 'submit', sid: 'S-1', student: st, stageIds: s.stageIds, attempts: s.attempts });
  assert.equal(again.duplicate, true); assert.equal(env.book.get('Summary').length, 2);
});

test('server re-scores: inflated client claims are caught, wrong/late attempts earn partial credit', () => {
  const env = makeEnv(root); env.run('setup()');
  const s = session('b2'), st = student('Grace Hopper');
  // first question: wrong on attempt 1, right on attempt 2 (85%); second: three wrong (0); rest perfect
  const [q0, q1] = s.parts; const a0 = A[q0.id], a1 = A[q1.id];
  const attempts = s.attempts.filter((a) => a.q !== q0.id && a.q !== q1.id);
  attempts.push({ q: q0.id, n: 1, c: 'zzz' }, { q: q0.id, n: 2, c: canon(a0.type, respFor(a0)) }, { q: q1.id, n: 1, c: 'x' }, { q: q1.id, n: 2, c: 'y' }, { q: q1.id, n: 3, c: 'z' }, { q: q1.id, n: 4, c: canon(a1.type, respFor(a1)) });
  const r = env.call({ action: 'submit', sid: 'S-2', student: st, stageIds: s.stageIds, attempts, clientScore: { earned: 100, possible: 100 } });
  const expected = 100 - q0.pts * 0.15 - q1.pts;
  assert.ok(Math.abs(r.score.earned - expected) < 0.011, `${r.score.earned} vs ${expected}`);
  assert.equal(r.mismatch, true);
  const summ = env.book.get('Summary')[1];
  assert.match(summ[18], /mismatch/);
  const qrow = env.book.get('Questions').find((x) => x[6] === q1.id);
  assert.equal(qrow[13], 'Missed (locked)'); assert.equal(qrow[14], 0);
});

test('duplicate submission for the same student + class is refused until the teacher resets it', () => {
  const env = makeEnv(root); env.run('setup()');
  const s = session('c3'), st = student('Alan Turing', 'HEALTH3');
  env.call({ action: 'start', sid: 'S-3', student: st, stageIds: s.stageIds });
  assert.equal(env.call({ action: 'submit', sid: 'S-3', student: st, stageIds: s.stageIds, attempts: s.attempts }).ok, true);
  assert.equal(env.call({ action: 'validate', code: 'HEALTH3', name: 'alan  turing' }).error, 'already-completed');
  assert.equal(env.call({ action: 'start', sid: 'S-4', student: st, stageIds: s.stageIds }).error, 'already-completed');
  assert.equal(env.call({ action: 'submit', sid: 'S-4', student: st, stageIds: s.stageIds, attempts: s.attempts }).error, 'already-completed');
  env.run("PropertiesService.getScriptProperties().setProperty('TEACHER_PASSCODE','pw')");
  assert.equal(env.call({ action: 't_reset', pass: 'wrong', sid: 'S-3' }).error, 'bad-passcode');
  assert.equal(env.call({ action: 't_reset', pass: 'pw', sid: 'S-3' }).ok, true);
  assert.equal(env.call({ action: 'status', sid: 'S-3' }).reset, true);
  assert.equal(env.call({ action: 'validate', code: 'HEALTH3', name: 'Alan Turing' }).reset, true);
  assert.equal(env.call({ action: 'start', sid: 'S-5', student: st, stageIds: s.stageIds }).ok, true);
  assert.equal(env.call({ action: 'submit', sid: 'S-5', student: st, stageIds: s.stageIds, attempts: s.attempts }).ok, true);
  const sum = env.book.get('Summary');
  assert.match(sum[1][16], /Reset by teacher/);
});

test('demo submissions are marked DEMO and never block real students', () => {
  const env = makeEnv(root); env.run('setup()');
  const s = session('d4'), st = student('Demo Teacher', 'DEMO2026');
  env.call({ action: 'start', sid: 'S-6', student: st, stageIds: s.stageIds });
  const r = env.call({ action: 'submit', sid: 'S-6', student: st, stageIds: s.stageIds, attempts: s.attempts });
  assert.equal(r.ok, true);
  const row = env.book.get('Summary')[1];
  assert.equal(row[1], '[DEMO] Demo Teacher'); assert.equal(row[17], 'DEMO'); assert.match(row[16], /DEMO/);
  assert.equal(env.call({ action: 'start', sid: 'S-7', student: st, stageIds: s.stageIds }).ok, true);
});

test('server grading: attempts are counted on the server, limited to three, idempotent, explanation only after lock', () => {
  const env = makeEnv(root); env.run('setup()');
  const s = session('e5'), st = student('Katherine Johnson', 'HEALTH5');
  env.call({ action: 'start', sid: 'S-8', student: st, stageIds: s.stageIds });
  const mc = s.parts.find((p) => p.type === 'mc'), q = A[mc.id];
  const wrong = q.opts.find((o) => o[0] !== q.ans)[0];
  let r = env.call({ action: 'check', sid: 'S-8', qid: mc.id, n: 1, resp: wrong }); assert.deepEqual([r.ok, r.correct, r.explain], [true, false, undefined]);
  assert.equal(env.call({ action: 'check', sid: 'S-8', qid: mc.id, n: 1, resp: q.ans }).correct, false, 'replaying attempt 1 cannot change the result');
  assert.equal(env.call({ action: 'check', sid: 'S-8', qid: mc.id, n: 3, resp: q.ans }).error, 'out-of-order');
  env.call({ action: 'check', sid: 'S-8', qid: mc.id, n: 2, resp: wrong });
  r = env.call({ action: 'check', sid: 'S-8', qid: mc.id, n: 3, resp: wrong }); assert.equal(r.correct, false); assert.ok(r.explain && r.explain.length > 20);
  assert.equal(env.call({ action: 'check', sid: 'S-8', qid: mc.id, n: 4, resp: q.ans }).error, 'locked');
  const mc2 = s.parts.find((p) => p.type === 'mc' && p.id !== mc.id), q2 = A[mc2.id];
  assert.equal(env.call({ action: 'check', sid: 'S-8', qid: mc2.id, n: 1, resp: q2.ans }).correct, true);
  const sub = env.call({ action: 'submit', sid: 'S-8', student: st, stageIds: s.stageIds, attempts: [{ q: mc.id, n: 1, c: q.ans }] });
  assert.ok(sub.score.earned < 100 && sub.score.earned >= mc2.pts - 0.01, 'server-recorded attempts win over what the browser sends');
});

test('teacher dashboard requires the passcode, rate-limits guessing, and reports class stats', () => {
  const env = makeEnv(root); env.run('setup()');
  const s = session('f6'), st = student('Mae Jemison', 'HEALTH2');
  env.call({ action: 'start', sid: 'S-9', student: st, stageIds: s.stageIds });
  env.call({ action: 'submit', sid: 'S-9', student: st, stageIds: s.stageIds, attempts: s.attempts });
  const pw = env.props.TEACHER_PASSCODE; assert.ok(pw && pw.startsWith('ChangeMe-'));
  const d = env.call({ action: 't_dashboard', pass: pw });
  assert.equal(d.ok, true); assert.equal(d.students.length, 1); assert.equal(d.students[0].pct, 100); assert.equal(d.classes[0].avg, 100);
  assert.ok(d.questions.length > 40 && d.questions.every((x) => x.firstPct === 100));
  for (let i = 0; i < 8; i++) env.call({ action: 't_dashboard', pass: 'bad' + i });
  assert.equal(env.call({ action: 't_dashboard', pass: pw }).error, 'locked-out');
  env.run('rebuildAnalytics()'); const an = env.book.get('Analytics'); assert.ok(an.some((r) => String(r[0]).includes('CLASS SUMMARY')));
});

test('sampleSubmission() self-test from the setup guide runs cleanly', () => {
  const env = makeEnv(root); env.run('sampleSubmission()');
  assert.equal(env.book.get('Summary').length, 2); assert.equal(env.book.get('Summary')[1][17], 'DEMO');
});

test('Config tab drives the sign-in: classes list shows labels/periods (never codes) and the Sheet period wins', () => {
  const env = makeEnv(root); env.run('setup()');
  const cfg = env.book.get('Config');
  cfg.push(['BIO-A', 'Ms. Lee: Block A', true, 'A'], ['OLD', 'Retired', false, '9']);
  const r = env.call({ action: 'classes' });
  assert.equal(r.ok, true);
  assert.ok(r.classes.some((c) => c.value === 'A' && c.label === 'Ms. Lee: Block A'));
  assert.ok(!JSON.stringify(r).includes('BIO-A') && !JSON.stringify(r).includes('HEALTH2'), 'codes are never exposed');
  assert.ok(!r.classes.some((c) => c.value === '9'), 'inactive rows hidden');
  assert.equal(env.call({ action: 'validate', code: 'bio-a' }).period, 'A');
  const s = session('p1'), st = student('Pat Period', 'BIO-A'); st.period = '7';
  env.call({ action: 'start', sid: 'S-P', student: st, stageIds: s.stageIds });
  env.call({ action: 'submit', sid: 'S-P', student: st, stageIds: s.stageIds, attempts: s.attempts });
  assert.equal(env.book.get('Summary')[1][3], 'A', 'Summary uses the Sheet period, not the student dropdown');
});

test('each class gets its own tab (named from the Config label); DEMO runs go to a DEMO tab; reset marks the class tab', () => {
  const env = makeEnv(root); env.run('setup()');
  env.book.get('Config').push(['BIO-A', 'Ms. Lee: Period 2', true, '2']);
  const s = session('t1'), a = student('Ann One', 'BIO-A'), d = student('Demo Dee', 'DEMO2026');
  env.call({ action: 'start', sid: 'S-A', student: a, stageIds: s.stageIds });
  env.call({ action: 'submit', sid: 'S-A', student: a, stageIds: s.stageIds, attempts: s.attempts });
  env.call({ action: 'start', sid: 'S-D', student: d, stageIds: s.stageIds });
  env.call({ action: 'submit', sid: 'S-D', student: d, stageIds: s.stageIds, attempts: s.attempts });
  const tab = env.book.get('Ms. Lee- Period 2'); assert.ok(tab, 'class tab exists'); assert.equal(tab.length, 2); assert.equal(tab[1][1], 'Ann One'); assert.equal(tab[1][9], 100);
  assert.equal(env.book.get('DEMO').length, 2);
  assert.equal(env.book.get('Summary').length, 3, 'master Summary keeps every row');
  env.run("PropertiesService.getScriptProperties().setProperty('TEACHER_PASSCODE','pw')");
  env.call({ action: 't_reset', pass: 'pw', sid: 'S-A' });
  assert.match(env.book.get('Ms. Lee- Period 2')[1][16], /Reset by teacher/);
});

test('createClassTabs() makes a tab for every active Config row, none for inactive ones, and is repeatable', () => {
  const env = makeEnv(root); env.run('setup()');
  const cfg = env.book.get('Config'); cfg.length = 1;
  cfg.push(['Block 1/2', 'Period 1/2', true, ''], ['Block 3/4', 'Period 3/4', true, ''], ['OLD', 'Retired', false, '']);
  env.run('createClassTabs()'); env.run('createClassTabs()');
  assert.ok(env.book.has('Period 1-2') && env.book.has('Period 3-4') && !env.book.has('Retired'));
  assert.equal(env.book.get('Period 1-2')[0][1], 'Student Name');
});
