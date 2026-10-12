/** Run with: node tests/unit.js   (no installs needed) */
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { createEnv, answerFor, ROOT } = require('./gas_harness');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e.stack || e).toString().split('\n').slice(0, 4).join('\n       ')); }
}
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

// ---------------------------------------------------------------- Stats (the real Stats.gs) ----
const ctx = vm.createContext({});
['Stats.gs', 'Grading.gs'].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, 'apps-script', f), 'utf8'), ctx));
const Stats = vm.runInContext('Stats', ctx), Grading = vm.runInContext('Grading', ctx);

console.log('\nStats');
test('mean / sd', () => { near(Stats.mean([2, 4, 6]), 4); near(Stats.sd([2, 4, 6]), 2); assert.strictEqual(Stats.sd([5]), null); assert.strictEqual(Stats.mean([]), null); });
test('normalized gain g = (post-pre)/(100-pre)', () => { near(Stats.hakeG(40, 70), 0.5); near(Stats.hakeG(0, 100), 1); near(Stats.hakeG(50, 50), 0); });
test('g can be negative', () => near(Stats.hakeG(80, 60), -1));
test('g is undefined at pre = 100 (ceiling)', () => { assert.strictEqual(Stats.hakeG(100, 100), null); assert.strictEqual(Stats.hakeG(100, 80), null); });
test('g is null when a score is missing', () => { assert.strictEqual(Stats.hakeG(null, 80), null); assert.strictEqual(Stats.hakeG(60, null), null); });
test('dz = mean diff / SD of diffs', () => near(Stats.dz([10, 20, 30]), 2));
test('dz edge cases: one pair, all-zero change, identical non-zero change', () => {
  assert.strictEqual(Stats.dz([10]), null); assert.strictEqual(Stats.dz([]), null);
  assert.strictEqual(Stats.dz([0, 0, 0]), 0); assert.strictEqual(Stats.dz([5, 5, 5]), null);
});

console.log('\nGrowth rows and class summary');
const S = (id, phase, pct) => ({ student_id: id, lesson_id: 'L', phase, pct });
test('matched, pre-only and post-only are labelled; absences are not averaged', () => {
  const rows = Stats.growthRows([S('a', 'pre', 40), S('a', 'post', 80), S('b', 'pre', 20), S('c', 'post', 100)]);
  const by = Object.fromEntries(rows.map(r => [r.student_id, r]));
  assert.strictEqual(by.a.status, 'matched'); assert.strictEqual(by.b.status, 'pre only'); assert.strictEqual(by.c.status, 'post only');
  const s = Stats.summarize(rows, 80);
  assert.strictEqual(s.n_matched, 1); assert.strictEqual(s.n_pre_only, 1); assert.strictEqual(s.n_post_only, 1);
  near(s.mean_pre, 40); near(s.mean_post, 80); near(s.mean_gain, 40); near(s.class_g, 40 / 60);
  near(s.pct_mastery, 100);                        // mastery counts everyone with an exit ticket (a and c)
});
test('class <g> uses the class MEANS; mean of individual g is reported separately', () => {
  const rows = Stats.growthRows([S('a', 'pre', 20), S('a', 'post', 60), S('b', 'pre', 80), S('b', 'post', 100)]);
  const s = Stats.summarize(rows, 80);
  near(s.class_g, (80 - 50) / (100 - 50));         // class means 50 -> 80, so <g> = 0.6
  near(s.mean_individual_g, ((60 - 20) / 80 + (100 - 80) / 20) / 2);   // (0.5 + 1.0) / 2 = 0.75
  assert.notStrictEqual(Stats.round(s.class_g, 3), Stats.round(s.mean_individual_g, 3));
});
test('ceiling students are counted separately and left out of g averages', () => {
  const rows = Stats.growthRows([S('a', 'pre', 100), S('a', 'post', 100), S('b', 'pre', 50), S('b', 'post', 100)]);
  const s = Stats.summarize(rows, 80);
  assert.strictEqual(s.n_ceiling, 1); near(s.mean_individual_g, 1);
});
test('all students at ceiling: g is undefined, nothing blows up', () => {
  const rows = Stats.growthRows([S('a', 'pre', 100), S('a', 'post', 100), S('b', 'pre', 100), S('b', 'post', 100)]);
  const s = Stats.summarize(rows, 80);
  assert.strictEqual(s.class_g, null); assert.strictEqual(s.mean_individual_g, null); assert.strictEqual(s.n_ceiling, 2); assert.strictEqual(s.dz, 0);
});
test('pre = post for everyone: flat, g = 0, dz = 0', () => {
  const s = Stats.summarize(Stats.growthRows([S('a', 'pre', 60), S('a', 'post', 60), S('b', 'pre', 40), S('b', 'post', 40)]), 80);
  near(s.class_g, 0); near(s.pct_flat, 100); assert.strictEqual(s.dz, 0);
});
test('missing post for everyone: no matched pairs, no gain numbers', () => {
  const s = Stats.summarize(Stats.growthRows([S('a', 'pre', 60), S('b', 'pre', 40)]), 80);
  assert.strictEqual(s.n_matched, 0); assert.strictEqual(s.mean_gain, null); assert.strictEqual(s.class_g, null); assert.strictEqual(s.pct_mastery, null);
});
test('a single student works', () => {
  const s = Stats.summarize(Stats.growthRows([S('a', 'pre', 20), S('a', 'post', 80)]), 80);
  near(s.mean_gain, 60); near(s.class_g, 0.75); assert.strictEqual(s.dz, null); near(s.pct_mastery, 100);
});
test('gained / flat / declined shares', () => {
  const s = Stats.summarize(Stats.growthRows([S('a', 'pre', 20), S('a', 'post', 60), S('b', 'pre', 50), S('b', 'post', 50), S('c', 'pre', 90), S('c', 'post', 70), S('d', 'pre', 10), S('d', 'post', 40)]), 80);
  near(s.pct_gained, 50); near(s.pct_flat, 25); near(s.pct_declined, 25);
});
test('criterion stats use matched students only and flag reteach candidates', () => {
  const R = (id, phase, cid, points) => ({ student_id: id, phase, criterion_id: cid, points });
  const out = Stats.criterionStats([
    R('a', 'pre', 'C1', 0), R('a', 'post', 'C1', 1), R('b', 'pre', 'C1', 1), R('b', 'post', 'C1', 1),
    R('a', 'pre', 'C2', 1), R('a', 'post', 'C2', 1), R('b', 'pre', 'C2', 0), R('b', 'post', 'C2', 0),
    R('x', 'pre', 'C1', 0)                                           // x has no exit ticket: not matched, ignored
  ], { a: true, b: true }, 80);
  near(out.C1.pre, 50); near(out.C1.post, 100); near(out.C1.gain, 50); assert.strictEqual(out.C1.reteach, false);
  near(out.C2.post, 50); assert.strictEqual(out.C2.reteach, true);   // below mastery
  const known = Stats.criterionStats([R('a', 'pre', 'C3', 1), R('a', 'post', 'C3', 1)], { a: true }, 80);
  assert.strictEqual(known.C3.reteach, false); assert.strictEqual(known.C3.already_known, true);   // 100% -> 100%: already strong
  const stuck = Stats.criterionStats([R('a', 'pre', 'C4', 0.75), R('a', 'post', 'C4', 0.8)], { a: true }, 80);
  assert.strictEqual(stuck.C4.reteach, true);                         // reached the line but gained < 10: nothing really moved
});

console.log('\nGrading');
const MC = { type: 'mc', options: ['a', 'b', 'c', 'd'], correct: [2] };
const MS = { type: 'ms', options: ['a', 'b', 'c', 'd', 'e'], correct: [0, 2, 3] };
const MT = { type: 'match', options: ['x', 'y'], rows: ['r1', 'r2', 'r3', 'r4'], correct: [0, 1, 1, 0] };
test('multiple choice', () => {
  assert.strictEqual(Grading.gradeItem(MC, [2], false).correct, 1);
  assert.strictEqual(Grading.gradeItem(MC, [1], false).correct, 0);
  assert.strictEqual(Grading.gradeItem(MC, [2, 1], false).correct, 0);
  assert.strictEqual(Grading.gradeItem(MC, null, false).correct, 0);
  assert.strictEqual(Grading.gradeItem(MC, [9], false).correct, 0);
});
test('multiple select is all-or-nothing by default', () => {
  assert.strictEqual(Grading.gradeItem(MS, [3, 0, 2], false).points, 1);
  assert.strictEqual(Grading.gradeItem(MS, [0, 2], false).points, 0);
  assert.strictEqual(Grading.gradeItem(MS, [0, 2, 3, 1], false).points, 0);
  assert.strictEqual(Grading.gradeItem(MS, [0, 0, 2, 3], false).points, 1);     // duplicates ignored
});
test('multiple select partial credit: (right - wrong) / right, floored at 0', () => {
  near(Grading.gradeItem(MS, [0, 2], true).points, 2 / 3);
  near(Grading.gradeItem(MS, [0, 2, 3, 1], true).points, 2 / 3);
  assert.strictEqual(Grading.gradeItem(MS, [1, 4], true).points, 0);
  assert.strictEqual(Grading.gradeItem(MS, [0, 2], true).correct, 0);           // "correct" stays all-or-nothing
});
test('matching', () => {
  assert.strictEqual(Grading.gradeItem(MT, [0, 1, 1, 0], false).correct, 1);
  assert.strictEqual(Grading.gradeItem(MT, [0, 1, 1, 1], false).points, 0);
  near(Grading.gradeItem(MT, [0, 1, 1, 1], true).points, 0.75);
  assert.strictEqual(Grading.gradeItem(MT, [0, 1, null, 0], false).correct, 0);
});
test('describe turns answers into words', () => {
  assert.ok(Grading.describe(MS, [0, 3]).indexOf('a | d') === 0);
  assert.ok(Grading.describe(MT, [0, 1, 1, 0]).indexOf('r1 → x') === 0);
});

// ---------------------------------------------------------------- Backend, real code + real item bank ----
console.log('\nBackend (apps-script/*.gs on an in-memory sheet, real item bank)');
function fresh({ roster = 4 } = {}) {
  const env = createEnv();
  env.setup();
  env.setRows('Periods', [{ period: '1', class_code: 'BLUE1', label: 'Period 1' }, { period: '2', class_code: 'GREEN2', label: 'Period 2' }]);
  env.setRows('Control', [{ period: '1' }, { period: '2' }]);
  const R = [];
  for (let i = 1; i <= roster; i++) R.push({ student_id: '1000' + i, last: 'Lee' + i, first: 'Sam' + i, period: '1', active: 'Y' });
  R.push({ student_id: '20001', last: 'Park', first: 'Jo', period: '2', active: 'Y' }, { student_id: '19999', last: 'Gone', first: 'Al', period: '1', active: 'N' });
  env.setRows('Roster', R);
  env.loadItemBank();
  env.props.TEACHER_PASSCODE = 'sesame';
  return env;
}
const T = (env, action, body = {}) => env.call(action, Object.assign({ passcode: 'sesame' }, body));
const stu = (id, code = 'BLUE1') => ({ code, student_id: id });

test('setup is safe to run twice and builds every tab', () => {
  const env = fresh(); env.setup();
  ['Config', 'Periods', 'Roster', 'Lessons', 'Criteria', 'ItemBank', 'Control', 'Responses', 'Scores', 'Growth', 'ClassSummary', 'CriterionMastery'].forEach(n => assert.ok(env.tabs[n], n));
  assert.strictEqual(env.rows('Lessons').length, 46); assert.ok(env.rows('Criteria').length > 100);
  assert.strictEqual(env.rows('Roster').length, 6);                  // roster untouched by a second setup
});
test('placeholder class codes are refused', () => {
  const env = createEnv(); env.setup(); env.props.TEACHER_PASSCODE = 'sesame';
  env.setRows('Roster', [{ student_id: '1', last: 'A', first: 'B', period: '1', active: 'Y' }]);
  const r = env.call('s_status', stu('1', 'CHANGEME-1'));
  assert.strictEqual(r.ok, false);
});
test('student login errors are friendly: wrong code, unknown ID, other period, inactive', () => {
  const env = fresh();
  assert.match(env.call('s_status', stu('10001', 'NOPE')).error, /class code/);
  assert.match(env.call('s_status', stu('99999')).error, /student ID/);
  assert.match(env.call('s_status', stu('20001')).error, /student ID/);        // period 2 student with period 1 code
  assert.match(env.call('s_status', stu('19999')).error, /student ID/);        // inactive
  assert.strictEqual(env.call('s_status', stu('10001', 'blue1')).ok, true);    // code is not case-sensitive
  assert.match(env.call('s_status', { code: '', student_id: '' }).error, /Enter/);
});
test('teacher actions need the passcode', () => {
  const env = fresh();
  assert.match(env.call('t_state', {}).error, /passcode/);
  assert.match(env.call('t_state', { passcode: 'wrong' }).error, /passcode/);
  assert.strictEqual(T(env, 't_state').ok, true);
  delete env.props.TEACHER_PASSCODE;
  assert.match(T(env, 't_state').error, /No teacher passcode/);
});
test('no ticket is open until the teacher opens one', () => {
  const env = fresh();
  assert.strictEqual(env.call('s_status', stu('10001')).open, false);
  assert.strictEqual(env.call('s_ticket', stu('10001')).open, false);
});
test('opening a ticket: students get questions WITHOUT keys, rationale, or criteria', () => {
  const env = fresh();
  assert.strictEqual(T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'pre', open: true }).ok, true);
  const st = env.call('s_status', stu('10001'));
  assert.strictEqual(st.open, true); assert.strictEqual(st.ticket.label, 'Warm-Up'); assert.strictEqual(st.ticket.title, 'Addiction & the adolescent brain');
  assert.strictEqual(JSON.stringify(st).includes('objective'), false);                // warm-up never shows the objective
  const t = env.call('s_ticket', stu('10001'));
  assert.strictEqual(t.items.length, 5);
  const raw = JSON.stringify(t);
  ['correct', 'rationale', 'criterion', 'source_item'].forEach(w => assert.strictEqual(raw.includes(w), false, 'leaked: ' + w));
  assert.deepStrictEqual(Object.keys(t.items[0]).sort(), ['item_id', 'options', 'rows', 'stem', 'type']);
  assert.strictEqual(env.call('s_status', stu('20001', 'GREEN2')).open, false);       // other period still closed
});
test('only one ticket per period is open: opening a second replaces the first', () => {
  const env = fresh();
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'pre', open: true });
  T(env, 't_set', { period: '1', lesson_id: 'U4-D2', phase: 'pre', open: true });
  assert.strictEqual(env.call('s_status', stu('10001')).ticket.lesson_id, 'U4-D2');
  assert.strictEqual(env.rows('Control').filter(c => String(c.period) === '1').length, 1);
});
test('a lesson with no questions cannot be opened (U6-D4 placeholder)', () => {
  const env = fresh();
  assert.match(T(env, 't_set', { period: '1', lesson_id: 'U6-D4', phase: 'pre', open: true }).error, /no questions/);
  assert.strictEqual(T(env, 't_lessons').lessons.find(l => l.lesson_id === 'U6-D4').ready, false);
});

function submit(env, id, lesson, phase, opts = {}, code = 'BLUE1') {
  const t = env.call('s_ticket', stu(id, code));
  if (!t.items) return t;
  return env.call('s_submit', Object.assign(stu(id, code), { lesson_id: lesson, phase, answers: answerFor(env, t.items, opts), seconds: 200 }));
}
test('warm-up submit: graded server-side, no score shown to the student', () => {
  const env = fresh();
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'pre', open: true });
  const r = submit(env, '10001', 'U4-D1', 'pre', { miss: ['U4-D1-I1', 'U4-D1-I2'] });
  assert.strictEqual(r.ok, true); assert.deepStrictEqual(r.result, { phase: 'pre', submitted: true });
  const sc = env.rows('Scores'); assert.strictEqual(sc.length, 1);
  assert.strictEqual(sc[0].raw, 3); assert.strictEqual(sc[0].max, 5); near(sc[0].pct, 60);
  const rs = env.rows('Responses'); assert.strictEqual(rs.length, 5);
  assert.strictEqual(rs.filter(x => x.correct === 1).length, 3); assert.ok(rs.every(x => x.criterion_id && x.phase === 'pre'));
});
test('one submission per student per lesson per phase', () => {
  const env = fresh();
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'pre', open: true });
  assert.strictEqual(submit(env, '10001', 'U4-D1', 'pre').ok, true);
  const t = env.call('s_ticket', stu('10001'));
  assert.strictEqual(t.already, true); assert.strictEqual(t.items, undefined);       // comes back as "already turned in"
  const again = env.call('s_submit', Object.assign(stu('10001'), { lesson_id: 'U4-D1', phase: 'pre', answers: {} }));
  assert.match(again.error, /already/); assert.strictEqual(env.rows('Scores').length, 1);
});
test('submissions for a closed ticket (or the wrong lesson/phase) are rejected and nothing is written', () => {
  const env = fresh();
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'pre', open: true });
  const t = env.call('s_ticket', stu('10001'));
  const mk = over => env.call('s_submit', Object.assign(stu('10001'), { lesson_id: 'U4-D1', phase: 'pre', answers: answerFor(env, t.items) }, over));
  assert.match(mk({ phase: 'post' }).error, /closed/);
  assert.match(mk({ lesson_id: 'U4-D2' }).error, /closed/);
  T(env, 't_set', { period: '1', open: false });
  assert.match(mk({}).error, /closed/);
  assert.strictEqual(env.rows('Scores').length, 0); assert.strictEqual(env.rows('Responses').length, 0);
});
test('exit ticket: shows post, pre, change, per-item rationale and the objective; no keys beyond that', () => {
  const env = fresh();
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'pre', open: true });
  submit(env, '10001', 'U4-D1', 'pre', { miss: ['U4-D1-I1', 'U4-D1-I2', 'U4-D1-I3'] });      // 40%
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'post', open: true });
  const r = submit(env, '10001', 'U4-D1', 'post', { miss: ['U4-D1-I1'] });                      // 80%
  assert.strictEqual(r.result.pct, 80); assert.strictEqual(r.result.pre_pct, 40); assert.strictEqual(r.result.change, 40);
  assert.strictEqual(r.result.items.length, 5); assert.strictEqual(r.result.items.filter(i => i.correct).length, 4);
  assert.ok(r.result.items.every(i => i.rationale)); assert.ok(r.result.objective.length > 20);
  // coming back later shows the same feedback
  const back = env.call('s_ticket', stu('10001'));
  assert.strictEqual(back.already, true); assert.strictEqual(back.result.pct, 80); assert.strictEqual(back.result.items.length, 5);
});
test('POST_FEEDBACK = score_only hides the per-item explanations', () => {
  const env = fresh(); env.setConfig('POST_FEEDBACK', 'score_only');
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'post', open: true });
  const r = submit(env, '10001', 'U4-D1', 'post');
  assert.strictEqual(r.result.items.length, 0); assert.strictEqual(r.result.pct, 100);
});
test('the student never sees a pre score in a post when there was no warm-up (absent at warm-up)', () => {
  const env = fresh();
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'post', open: true });
  const r = submit(env, '10002', 'U4-D1', 'post');
  assert.strictEqual(r.result.pre_pct, null); assert.strictEqual(r.result.change, null);
});
test('PARALLEL_FORMS: warm-up uses form A, exit ticket uses the matching form B, both graded correctly', () => {
  const env = fresh(); env.setConfig('PARALLEL_FORMS', 'TRUE');
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'pre', open: true });
  const pre = env.call('s_ticket', stu('10001')); assert.ok(pre.items.every(i => !/B$/.test(i.item_id)));
  submit(env, '10001', 'U4-D1', 'pre');
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'post', open: true });
  const post = env.call('s_ticket', stu('10001')); assert.ok(post.items.every(i => /B$/.test(i.item_id)));
  const r = submit(env, '10001', 'U4-D1', 'post'); assert.strictEqual(r.result.pct, 100);
  const crit = env.rows('Responses').map(x => x.criterion_id + '|' + x.phase);
  ['U4-D1-C1', 'U4-D1-C4'].forEach(c => { assert.ok(crit.includes(c + '|pre')); assert.ok(crit.includes(c + '|post')); });
});
test('partial credit changes points but not the 0/1 "correct" column', () => {
  const env = fresh(); env.setConfig('PARTIAL_CREDIT', 'TRUE');
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'pre', open: true });
  const t = env.call('s_ticket', stu('10001'));
  const ans = answerFor(env, t.items);
  const ms = t.items.find(i => i.type === 'ms');
  ans[ms.item_id] = env.keys()[ms.item_id].correct.slice(0, -1);                               // one right answer left off
  env.call('s_submit', Object.assign(stu('10001'), { lesson_id: 'U4-D1', phase: 'pre', answers: ans }));
  const row = env.rows('Responses').find(r => r.item_id === ms.item_id);
  assert.strictEqual(row.correct, 0); assert.ok(row.points > 0 && row.points < 1);
});
test('unanswered, junk, and unknown-item answers score zero and do not break grading', () => {
  const env = fresh();
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'pre', open: true });
  const r = env.call('s_submit', Object.assign(stu('10001'), { lesson_id: 'U4-D1', phase: 'pre', answers: { 'U4-D1-I1': 'banana', 'FAKE-ITEM': [0], 'U4-D1-I2': [99] }, seconds: -5 }));
  assert.strictEqual(r.ok, true); assert.strictEqual(env.rows('Scores')[0].raw, 0); assert.strictEqual(env.rows('Scores')[0].seconds, 0);
  assert.strictEqual(env.rows('Responses').length, 5);
});
test('30 students submitting at once: every score lands exactly once', () => {
  const env = fresh({ roster: 30 });
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'pre', open: true });
  for (let i = 1; i <= 30; i++) assert.strictEqual(submit(env, '1000' + i, 'U4-D1', 'pre').ok, true, 'student ' + i);
  assert.strictEqual(env.rows('Scores').length, 30); assert.strictEqual(env.rows('Responses').length, 150);
  assert.strictEqual(new Set(env.rows('Scores').map(s => s.student_id)).size, 30);
});

test('live count and "still waiting" list on the teacher screen', () => {
  const env = fresh();
  T(env, 't_set', { period: '1', lesson_id: 'U4-D1', phase: 'pre', open: true });
  submit(env, '10001', 'U4-D1', 'pre'); submit(env, '10002', 'U4-D1', 'pre');
  const p = T(env, 't_state').periods.find(x => x.period === '1');
  assert.strictEqual(p.roster, 4); assert.strictEqual(p.submitted, 2); assert.strictEqual(p.waiting.length, 2);   // inactive student not counted
  assert.ok(p.waiting.includes('Sam3 Lee3')); assert.strictEqual(p.median_seconds, 200);
  assert.strictEqual(p.ticket_label, 'Warm-Up'); assert.strictEqual(p.open, true);
});
test('suggested next lesson follows the last exit ticket the period finished', () => {
  const env = fresh();
  const first = T(env, 't_state').periods[0].suggested_lesson_id; assert.strictEqual(first, 'U1-D1');
  T(env, 't_set', { period: '1', lesson_id: 'U1-D2', phase: 'post', open: true });
  submit(env, '10001', 'U1-D2', 'post');
  assert.strictEqual(T(env, 't_state').periods[0].suggested_lesson_id, 'U1-D3');
});

console.log('\nReports');
function classDay(env, lesson, preMiss, postMiss, students) {
  T(env, 't_set', { period: '1', lesson_id: lesson, phase: 'pre', open: true });
  students.forEach(([id, miss]) => submit(env, id, lesson, 'pre', { miss: miss.pre || [] }));
  T(env, 't_set', { period: '1', lesson_id: lesson, phase: 'post', open: true });
  students.forEach(([id, miss]) => { if (!miss.absentPost) submit(env, id, lesson, 'post', { miss: miss.post || [] }); });
}
test('lesson report: pre/post/change per student, class gain, absences kept out of the averages', () => {
  const env = fresh();
  const L = 'U4-D1', ids = [1, 2, 3, 4, 5].map(n => `${L}-I${n}`);
  classDay(env, L, null, null, [
    ['10001', { pre: ids.slice(0, 3), post: ids.slice(0, 1) }],     // 40 -> 80
    ['10002', { pre: ids.slice(0, 2), post: [] }],                  // 60 -> 100
    ['10003', { pre: [], post: [] }],                               // 100 -> 100 (ceiling)
    ['10004', { pre: ids.slice(0, 2), absentPost: true }]           // 60 -> absent
  ]);
  const r = T(env, 't_report', { lesson_id: L, period: '1' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.summary.n_matched, 3); assert.strictEqual(r.summary.n_pre_only, 1); assert.strictEqual(r.summary.n_ceiling, 1);
  near(r.summary.mean_pre, 66.7, 0.05); near(r.summary.mean_post, 93.3, 0.05); near(r.summary.mean_gain, 26.7, 0.05);
  near(r.summary.class_g, (93.333 - 66.667) / (100 - 66.667), 0.01); assert.strictEqual(r.summary.pct_mastery, 100);
  assert.strictEqual(r.students.length, 4);
  const a = r.students.find(s => s.student_id === '10001');
  assert.deepStrictEqual([a.pre, a.post, a.gain, a.g, a.status], [40, 80, 40, 0.67, 'matched']);
  assert.strictEqual(r.students.find(s => s.student_id === '10003').ceiling, true);
  assert.strictEqual(r.students.find(s => s.student_id === '10004').status, 'pre only');
  assert.strictEqual(r.summary.n_no_post, 1);
  assert.ok(r.criteria.length >= 4 && r.items.length === 5);
});
test('a criterion that does not move is flagged as a reteach candidate', () => {
  const env = fresh();
  const L = 'U4-D1', i1 = `${L}-I1`;                                   // I1 is criterion C1: miss it at BOTH warm-up and exit ticket
  classDay(env, L, null, null, [['10001', { pre: [i1], post: [i1] }], ['10002', { pre: [i1], post: [i1] }]]);
  const r = T(env, 't_report', { lesson_id: L });
  const c1 = r.criteria.find(c => c.criterion_id === 'U4-D1-C1');
  assert.strictEqual(c1.pre, 0); assert.strictEqual(c1.post, 0); assert.strictEqual(c1.reteach, true);
  const others = r.criteria.filter(c => c.criterion_id !== 'U4-D1-C1');
  assert.ok(others.length >= 3 && others.every(c => !c.reteach && c.already_known));   // 100% at both: already strong, not reteach
});
test('student growth across lessons, with item-level drill-down', () => {
  const env = fresh();
  classDay(env, 'U4-D1', null, null, [['10001', { pre: ['U4-D1-I1', 'U4-D1-I2'], post: [] }]]);
  classDay(env, 'U4-D2', null, null, [['10001', { pre: ['U4-D2-I1'], post: [] }]]);
  const s = T(env, 't_student', { student_id: '10001' });
  assert.strictEqual(s.lessons.length, 2); assert.deepStrictEqual(s.lessons.map(l => l.lesson_id), ['U4-D1', 'U4-D2']);
  assert.strictEqual(s.summary.lessons_with_pairs, 2); near(s.summary.mean_pre, 70); near(s.summary.mean_post, 100); near(s.summary.mean_gain, 30);
  const d = T(env, 't_student_lesson', { student_id: '10001', lesson_id: 'U4-D1' });
  assert.strictEqual(d.items.length, 5);
  const first = d.items.find(i => i.key === 'U4-D1-I1');
  assert.strictEqual(first.pre.correct, false); assert.strictEqual(first.post.correct, true); assert.ok(first.pre.answer && first.pre.correct_answer);
});
test('unit review: draws items from earlier lessons and keeps their criteria', () => {
  const env = fresh();
  T(env, 't_set', { period: '1', lesson_id: 'U4-D6', phase: 'pre', open: true });
  const t = env.call('s_ticket', stu('10001')); assert.strictEqual(t.items.length, 5);
  assert.strictEqual(env.call('s_status', stu('10001')).ticket.label, 'Unit Review Warm-Up');
  submit(env, '10001', 'U4-D6', 'pre', { miss: ['U4-D6-R1'] });
  const rs = env.rows('Responses').filter(r => r.lesson_id === 'U4-D6');
  assert.strictEqual(rs.length, 5); assert.ok(rs.every(r => r.ticket_type === 'unit_review'));
  assert.deepStrictEqual(rs.map(r => r.criterion_id.split('-')[1]).sort(), ['D1', 'D2', 'D3', 'D4', 'D5']);
});
test('nightly summary tabs: Growth, ClassSummary, CriterionMastery (with retention vs. unit review)', () => {
  const env = fresh();
  const i = n => `U4-D1-I${n}`;
  classDay(env, 'U4-D1', null, null, [['10001', { pre: [i(1)], post: [] }], ['10002', { pre: [], post: [] }]]);
  T(env, 't_set', { period: '1', lesson_id: 'U4-D6', phase: 'pre', open: true });
  submit(env, '10001', 'U4-D6', 'pre', { miss: ['U4-D6-R1'] });       // R1 is the review twin of U4-D1-I1 (criterion U4-D1-C1)
  submit(env, '10002', 'U4-D6', 'pre', { miss: ['U4-D6-R1'] });
  assert.ok(T(env, 't_recompute').rows > 0);
  const g = env.rows('Growth'); assert.ok(g.some(r => r.student_id === '10001' && r.lesson_id === 'U4-D1' && r.status === 'matched'));
  const cs = env.rows('ClassSummary').find(r => r.lesson_id === 'U4-D1' && r.period === 'ALL'); assert.strictEqual(cs.n_matched, 2);
  const cm = env.rows('CriterionMastery').find(r => r.criterion_id === 'U4-D1-C1' && r.period === 'ALL');
  assert.strictEqual(cm.post_pct, 100); assert.strictEqual(cm.review_pre_pct, 0); assert.strictEqual(cm.retention_drop, 100); assert.strictEqual(cm.not_retained, 'Y');
  const other = env.rows('CriterionMastery').find(r => r.criterion_id === 'U4-D1-C2' && r.period === 'ALL'); assert.strictEqual(other.not_retained, 'N');
});
test('check setup reports what is missing', () => {
  const env = createEnv(); env.setup();
  const text = env.run('checkSetup()');
  assert.match(text, /passcode is NOT set/); assert.match(text, /CHANGEME/); assert.match(text, /import items_import\.csv/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
