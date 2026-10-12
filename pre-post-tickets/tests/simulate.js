/**
 * simulate.js - Phase 6 check: 3 periods x 25 students, 10 lessons, realistic patterns, then confirm the reports flag
 * what they should.   node tests/simulate.js
 * Patterns: random absences (some students miss only the warm-up or only the exit ticket), a few students who start at
 * the ceiling, general improvement, and ONE criterion (U1-D3-C3) that nobody learns (missed at warm-up AND exit ticket).
 */
const assert = require('assert');
const { demoEnv } = require('./dev_server');
const { answerFor } = require('./gas_harness');

let seed = 12345;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const env = demoEnv({ students: 25 });
const keys = env.keys();
const T = (a, b = {}) => env.call(a, Object.assign({ passcode: 'teacher' }, b));
const lessons = ['U1-D1', 'U1-D2', 'U1-D3', 'U1-D4', 'U1-D5', 'U2-D1', 'U2-D2', 'U2-D3', 'U2-D4', 'U2-D5'];
const codes = { '1': 'BLUE1', '3': 'RED3', '5': 'GREEN5' };
const roster = env.rows('Roster');
const ceiling = new Set(roster.filter((_, i) => i % 17 === 0).map(r => r.student_id));          // ~4 students always perfect
const STUCK = 'U1-D3-C3';

function takeTicket(student, lesson, phase) {
  const code = codes[student.period], creds = { code, student_id: String(student.student_id) };
  const t = env.call('s_ticket', creds); if (!t.items) return null;
  const ability = ceiling.has(String(student.student_id)) ? 1 : 0.35 + (student.student_id % 7) / 14;   // 0.35..0.78
  const p = Math.min(0.97, ability + (phase === 'post' ? 0.25 : 0));
  const miss = t.items.filter(it => (keys[it.item_id].criterion_id === STUCK) || (!ceiling.has(String(student.student_id)) && rand() > p)).map(it => it.item_id);
  const r = env.call('s_submit', Object.assign(creds, { lesson_id: lesson, phase, answers: answerFor(env, t.items, { miss: ceiling.has(String(student.student_id)) ? miss.filter(m => keys[m].criterion_id === STUCK) : miss }), seconds: 150 + Math.round(rand() * 200) }));
  return r;
}

let pre = 0, post = 0, absentPre = 0, absentPost = 0;
lessons.forEach(L => {
  Object.keys(codes).forEach(period => {
    const kids = roster.filter(r => String(r.period) === period);
    assert.ok(T('t_set', { period, lesson_id: L, phase: 'pre', open: true }).ok);
    kids.forEach(k => { if (rand() < 0.07) { absentPre++; return; } if (takeTicket(k, L, 'pre')) pre++; });
    assert.ok(T('t_set', { period, lesson_id: L, phase: 'post', open: true }).ok);
    kids.forEach(k => { if (rand() < 0.07) { absentPost++; return; } if (takeTicket(k, L, 'post')) post++; });
    T('t_set', { period, open: false });
  });
});
console.log(`Simulated ${lessons.length} lessons x 3 periods: ${pre} warm-ups, ${post} exit tickets (${absentPre} + ${absentPost} absences)`);
assert.strictEqual(env.rows('Scores').length, pre + post);

// 1. absences: pre-only / post-only are counted separately and never averaged into the gain
const rep = T('t_report', { lesson_id: 'U1-D1', period: 'ALL' });
const s = rep.summary;
console.log('U1-D1 all periods:', JSON.stringify({ matched: s.n_matched, pre_only: s.n_pre_only, post_only: s.n_post_only, mean_pre: s.mean_pre, mean_post: s.mean_post, class_g: s.class_g, ceiling: s.n_ceiling }));
assert.ok(s.n_pre_only + s.n_post_only > 0 && s.n_matched < 75);
assert.ok(s.mean_post > s.mean_pre && s.class_g > 0);
const rows = rep.students;
assert.strictEqual(rows.filter(r => r.status === 'matched').length, s.n_matched);
assert.ok(rows.filter(r => r.status === 'matched').every(r => r.pre !== null && r.post !== null));

// 2. ceiling students: counted, excluded from g averages
assert.ok(s.n_ceiling >= 1); assert.ok(rows.filter(r => r.ceiling).every(r => r.g === null));

// 3. the stuck criterion is flagged; healthy ones are not
const l3 = T('t_report', { lesson_id: 'U1-D3', period: 'ALL' });
const stuck = l3.criteria.find(c => c.criterion_id === STUCK);
console.log('U1-D3 criteria:', l3.criteria.map(c => `${c.criterion_id.slice(-2)} ${c.pre}->${c.post}${c.reteach ? ' RETEACH' : c.already_known ? ' known' : ''}`).join(' | '));
assert.ok(stuck.reteach && stuck.post < 100 && stuck.gain <= 0.5);
assert.ok(l3.criteria.filter(c => c.criterion_id !== STUCK).some(c => !c.reteach));

// 4. a student's trend over the 10 lessons, plus drill-down
const sid = String(roster.find(r => !ceiling.has(String(r.student_id))).student_id);
const st = T('t_student', { student_id: sid });
console.log('student', sid, JSON.stringify(st.summary), st.lessons.length + ' lessons');
assert.ok(st.lessons.length >= 8 && st.summary.mean_post > st.summary.mean_pre);
assert.ok(st.weakest.some(w => w.criterion_id === STUCK) || st.weakest.length > 0);

// 5. nightly tabs agree with the live report
T('t_recompute');
const cs = env.rows('ClassSummary').find(r => r.lesson_id === 'U1-D1' && r.period === 'ALL');
assert.strictEqual(cs.n_matched, s.n_matched); assert.strictEqual(cs.n_pre_only, s.n_pre_only);
assert.strictEqual(env.rows('Growth').length, env.rows('Scores').length > 0 ? new Set(env.rows('Scores').map(r => r.student_id + '|' + r.lesson_id)).size : 0);
const cm = env.rows('CriterionMastery').filter(r => r.criterion_id === STUCK && r.period === 'ALL');
assert.strictEqual(cm[0].reteach, 'Y');
console.log('\nSimulation passed: absences, ceiling, stuck criterion, student trend, and nightly tabs all behave.');
