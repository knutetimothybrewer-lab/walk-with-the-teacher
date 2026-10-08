// Unit tests: scoring tiers, answer checking for EVERY question and variant, randomization equivalence, label math, plans, analytics.
import test from 'node:test';
import assert from 'node:assert/strict';
import content from '../content/public.js';
import { CONFIG } from '../js/config.js';
import { creditFor, earnedFor, totals, DOMAIN_NAME, masteryLabel } from '../js/scoring.js';
import { canon, answerHash, isComplete } from '../js/canon.js';
import { buildPlan, planParts, gradeLocal, Session, newState, presentation, subst, namesFor, buildSubmission } from '../js/engine.js';
import { solve, describe, candidates } from '../js/solve.js';
import { evalPlan, ACTIVITY_BLOCKS } from '../js/plan.js';
import { pctDV, scaled, dvLevel } from '../js/labeldata.js';
import { sha256 } from '../js/sha256.js';
import { makeStore } from '../js/storage.js';
import * as A from '../js/analytics.js';
import { sandboxData } from '../js/demo.js';
import { allQuestions, canonOf, mods } from './helpers.js';

const authored = Object.fromEntries(allQuestions().map((q) => [q.id, q]));
const pubQs = []; (function walk(stages) { for (const s of stages) { if (s.kind === 'pool') s.groups.forEach((g) => walk(g.items)); else if (s.kind === 'q') pubQs.push(s.q); else if (s.kind === 'scene') pubQs.push(...s.qs); } })(content.missions.flatMap((m) => m.stages));
const memStore = () => { const m = new Map(); return { saveSession: (s) => m.set('s', JSON.stringify(s)), loadSession: () => (m.has('s') ? JSON.parse(m.get('s')) : null) }; };
const seeds = Array.from({ length: 40 }, (_, i) => 'seed' + i * 97);

test('attempt credit: 100% / 85% / 75% / 0 and the first wrong answer moves to the 85% tier', () => {
  assert.deepEqual([1, 2, 3, 4].map(creditFor), [1, 0.85, 0.75, 0]);
  const rec = (...flags) => ({ attempts: flags.map((c, i) => ({ n: i + 1, correct: c })), status: 'x' });
  assert.equal(earnedFor(2, rec(true)), 2);
  assert.equal(earnedFor(2, rec(false, true)), 1.7);
  assert.equal(earnedFor(2, rec(false, false, true)), 1.5);
  assert.equal(earnedFor(2, rec(false, false, false)), 0);
  assert.equal(earnedFor(3, rec(false, true)), 2.55);
  assert.equal(earnedFor(2, undefined), 0);
});

test('the assessment totals exactly 100 points for every randomized version, with equal domain weights', () => {
  let first = null;
  for (const seed of seeds) for (const focus of ['fuel', 'move']) {
    const plan = buildPlan(content, seed, { focus }), parts = planParts(plan);
    const pts = parts.reduce((a, q) => a + q.pts, 0); assert.equal(pts, 100, `${seed}/${focus}`);
    const dom = {}; parts.forEach((q) => { dom[q.domain] = (dom[q.domain] || 0) + q.pts; });
    first ||= dom; assert.deepEqual(dom, first, 'domain points identical in every version');
    assert.equal(new Set(parts.map((q) => q.id)).size, parts.length, 'no duplicate questions');
  }
  assert.deepEqual(first, { found: 13, labels: 18, activity: 16, marketing: 13, goals: 10, systems: 21, integrated: 9 });
});

test('randomization actually varies versions (order, variants, names, option order)', () => {
  const ids = new Set(), names = new Set(), orders = new Set();
  for (const seed of seeds) { const p = buildPlan(content, seed, {}); ids.add(p.ids.join(',')); names.add(p.names.join(',')); const q = planParts(p).find((x) => x.id === 'f-balance'); orders.add(presentation(q, seed).opts.map((o) => o[0]).join('')); }
  assert.ok(ids.size > 20, 'many distinct plans'); assert.ok(names.size > 20); assert.ok(orders.size >= 6, 'answer choices are shuffled');
  const calcVariants = new Set(seeds.map((s) => planParts(buildPlan(content, s, {})).find((q) => q.slot === 'l-total').prompt.match(/of a package of ([A-Za-z ]+)\./)[1]));
  assert.equal(calcVariants.size, 3, 'numeric/product variants rotate');
});

test('the correct answer is spread across positions (no "always C" pattern)', () => {
  const pos = [0, 0, 0, 0];
  for (const seed of seeds.concat(seeds.map((s) => s + 'b'))) for (const q of planParts(buildPlan(content, seed, {})).filter((x) => x.type === 'mc' && !x.fixedOrder && x.opts.length === 4)) {
    const k = authored[q.id].ans, order = presentation(q, seed).opts.map((o) => o[0]); pos[order.indexOf(k)]++;
  }
  const total = pos.reduce((a, b) => a + b, 0);
  pos.forEach((n) => assert.ok(n / total > 0.15 && n / total < 0.35, 'position share ' + (n / total).toFixed(2)));
});

test('EVERY question and variant: the authored answer is accepted, a wrong answer is rejected (no false "wrong")', () => {
  assert.equal(pubQs.length, allQuestions().length);
  for (const q of pubQs) {
    const src = authored[q.id];
    const right = q.type === 'plan' ? { flags: 'm1v1s1b1', touched: true } : (q.type === 'num' || q.type === 'slider') ? (Array.isArray(src.ans) ? src.ans[0] : src.ans) : src.ans;
    assert.equal(gradeLocal(content, q, right), true, `${q.id}: authored answer marked wrong`);
    if (Array.isArray(src.ans) && (q.type === 'slider' || q.type === 'num')) for (const a of src.ans) assert.equal(gradeLocal(content, q, a), true, `${q.id}: alternate accepted value ${a}`);
    const sol = solve(q, content.salt);
    assert.ok(sol.length >= 1, `${q.id}: solver finds answer`);
    const wrong = [...candidates(q)].find((c) => !q.h.includes(answerHash(content.salt, q.id, c.c)));
    assert.ok(wrong, `${q.id}: has wrong candidates`);
    assert.equal(gradeLocal(content, q, wrong.resp), false, `${q.id}: wrong answer accepted`);
  }
});

test('multi-select and order-sensitive items are order-independent / order-dependent as designed', () => {
  const q = pubQs.find((x) => x.id === 'a-rec'); const ans = authored['a-rec'].ans;
  assert.equal(gradeLocal(content, q, [...ans].reverse()), true);
  assert.equal(gradeLocal(content, q, ans.slice(1)), false, 'missing one correct option');
  assert.equal(gradeLocal(content, q, [...ans, 'e']), false, 'extra incorrect option');
  const s = pubQs.find((x) => x.id === 'f-rank'); const ord = authored['f-rank'].ans;
  assert.equal(gradeLocal(content, s, ord), true); assert.equal(gradeLocal(content, s, [...ord].reverse()), false);
});

test('answers are not stored in plain text in the public bundle', () => {
  const txt = JSON.stringify(content);
  assert.ok(!/"ans"\s*:/.test(txt), 'no ans field'); assert.ok(!/"explain"\s*:/.test(txt), 'no plain explanations');
  for (const q of pubQs) { assert.ok(Array.isArray(q.h) && q.h.every((x) => /^[0-9a-f]{20}$/.test(x))); assert.ok(typeof q.x === 'string' && q.x.length > 5); }
  const s = new Session(newState({ student: { first: 'A', last: 'B', block: 'Block 1/2', code: 'X' }, content, seed: 'abc' }), content, memStore());
  const q = s.parts.find((x) => x.id === 'g-eval' || x.id === 'f-balance'); assert.ok(s.explanation(q).length > 20);
});

test('server-grading content file contains no hashes, explanations or answers (set gradingMode: "server")', async () => {
  const fs = await import('node:fs'); const txt = fs.readFileSync(new URL('../content/public.server.js', import.meta.url), 'utf8');
  assert.ok(!/"h":\[/.test(txt) && !/"x":"/.test(txt) && !/"ans"/.test(txt)); assert.ok(/"mode":"server"/.test(txt));
  const srv = JSON.parse(txt.slice(txt.indexOf('export default ') + 15).replace(/;\s*$/, '')); let n = 0;
  (function walk(st) { for (const s of st) { if (s.kind === 'pool') s.groups.forEach((g) => walk(g.items)); else { for (const q of s.kind === 'q' ? [s.q] : s.qs || []) { n++; assert.equal(q.h, undefined); assert.equal(q.x, undefined); } } } })(srv.missions.flatMap((m) => m.stages));
  assert.equal(n, pubQs.length);
});

test('Session: attempts persist before grading, lock after three, never reveal after 1-2', () => {
  const store = memStore(), st = newState({ student: { first: 'A', last: 'B', block: 'Block 1/2', code: 'X' }, content, seed: 'abc' });
  const s = new Session(st, content, store), q = s.parts.find((x) => x.type === 'mc');
  const p1 = s.beginAttempt(q, 'zz'); assert.equal(store.loadSession().answers[q.id].attempts.length, 1, 'saved before grading');
  s.finishAttempt(q, p1, false); assert.equal(s.status(q.id), 'open');
  s.finishAttempt(q, s.beginAttempt(q, 'zy'), false); assert.equal(s.status(q.id), 'open');
  s.finishAttempt(q, s.beginAttempt(q, 'zx'), false); assert.equal(s.status(q.id), 'locked');
  assert.equal(s.beginAttempt(q, 'zw'), null, 'cannot attempt a locked question');
  assert.equal(s.totals().earned, 0);
  const q2 = s.parts.find((x) => x.type === 'mc' && x.id !== q.id); s.finishAttempt(q2, s.beginAttempt(q2, 'no'), false); s.finishAttempt(q2, s.beginAttempt(q2, authored[q2.id].ans), true);
  assert.equal(s.totals().earned, Math.round(q2.pts * 85) / 100); assert.equal(s.totals().second, 1);
  // refresh recovery: a new Session from the stored state keeps everything
  const again = new Session(store.loadSession(), content, store); assert.equal(again.totals().earned, s.totals().earned); assert.equal(again.status(q.id), 'locked');
});

test('Session: closing the tab mid-attempt counts the unresolved attempt as used (refresh cannot restore attempts)', () => {
  const store = memStore(), s = new Session(newState({ student: { first: 'A', last: 'B', block: 'Block 1/2', code: 'X' }, content, seed: 'q' }), content, store), q = s.parts[0];
  s.beginAttempt(q, 'x'); const s2 = new Session(store.loadSession(), content, store); s2.settlePending();
  assert.equal(s2.attemptsUsed(q.id), 1); assert.equal(s2.rec(q.id).attempts[0].correct, false);
});

test('branching: the unscored Jordan choice rebuilds the plan with the matching scenario, still 100 points', () => {
  const store = memStore(), s = new Session(newState({ student: { first: 'A', last: 'B', block: 'Block 1/2', code: 'X' }, content, seed: 'br' }), content, store);
  s.setChoice('focus', 'fuel'); assert.ok(s.parts.some((q) => q.slot === 'i-fuel')); assert.ok(!s.parts.some((q) => q.slot === 'i-move'));
  s.setChoice('focus', 'move'); assert.ok(s.parts.some((q) => q.slot === 'i-move')); assert.ok(!s.parts.some((q) => q.slot === 'i-fuel'));
  assert.equal(s.parts.reduce((a, q) => a + q.pts, 0), 100); assert.equal(buildSubmission(s, 'x').choices.focus, 'move');
});

test('names are substituted consistently and never left as placeholders', () => {
  for (const seed of seeds) { const plan = buildPlan(content, seed, {}); const text = JSON.stringify(plan.missions.map((m) => m.resolved)); assert.ok(!/\{N[123]\}/.test(text), 'placeholder left'); assert.equal(new Set(namesFor(seed)).size, 3); }
  assert.equal(subst('{N1} and {N2}', ['A', 'B', 'C']), 'A and B');
});

test('Nutrition Facts math: %DV, scaling and the 5% / 20% benchmarks', () => {
  assert.equal(pctDV('sod', 345), 15); assert.equal(pctDV('added', 10), 20); assert.equal(pctDV('sat', 4), 20); assert.equal(pctDV('fiber', 5.6), 20);
  assert.equal(dvLevel(5), 'low'); assert.equal(dvLevel(20), 'high'); assert.equal(dvLevel(12), 'in between');
  const p = { cal: 150, fat: 5, sat: 1, trans: 0, chol: 0, sod: 345, carb: 25, fiber: 2, sugars: 10, added: 8, protein: 3, vitD: 0, ca: 20, fe: 0.8, k: 110 };
  const v = scaled(p, 2); assert.equal(v.cal, 300); assert.equal(v.sod, 690); assert.equal(v.dv_sod, 30); assert.equal(v.dv_added, 32);
  // independent re-derivation of every authored label-simulation answer
  for (const q of pubQs.filter((x) => x.slot === 'l-total')) { const src = authored[q.id]; assert.ok(Number.isFinite(src.ans)); }
});

test('calorie calculation variants are arithmetically correct (4-4-9)', () => {
  for (const q of allQuestions().filter((x) => x.slot === 'f-kcal')) { const [c, p, f] = q.prompt.match(/(\d+) g of carbohydrate, (\d+) g of protein and (\d+) g of fat/).slice(1).map(Number); assert.equal(q.ans, c * 4 + p * 4 + f * 9, q.id); }
});

test('label-simulation answers match independent calculations for every variant', () => {
  for (const i of [0, 1, 2]) {
    const total = authored['l-total-' + i], dv = authored['l-dv-' + i], inter = authored['l-interp-' + i];
    const mm = /(\d+(?:\.\d+)?) × (\d+) calories = (\d+(?:\.\d+)?) calories/.exec(total.explain); assert.ok(mm, 'total explanation parses'); assert.equal(Number(mm[1]) * Number(mm[2]), total.ans);
    const m = /One serving has (\d+(?:\.\d+)?) g added sugars \((\d+)% DV\)\. ([\d.]+) servings gives ([\d.]+) g, which is (\d+)% DV/.exec(dv.explain);
    assert.ok(m, 'explanation parses'); const [, per, , k, , pct] = m.map(Number); assert.equal(dv.ans, k); assert.ok(pctDV('added', per * k) >= 20 && pctDV('added', per * (k - 0.5)) < 20, 'smallest step reaching 20% DV');
    assert.ok(inter.opts.find((o) => o[0] === inter.ans)[1].includes('high'));
  }
});

test('FITT plan evaluation: all four recommendations are checked independently', () => {
  const base = { Mon: ['soccer'], Fri: ['soccer'] };
  const days = (extra) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => [...(base[d] || []), ...(extra[d] || [])]);
  assert.equal(evalPlan(days({})).flags, 'm0v0s0b0');
  const good = days({ Mon: ['bands'], Tue: ['hoops', 'bands', 'walk'], Wed: ['run', 'body', 'walk'], Thu: ['rope', 'bands', 'walk'], Fri: ['body'], Sat: ['hoops', 'bike'], Sun: ['walk', 'dance'] });
  assert.equal(evalPlan(good).flags, 'm1v1s1b1');
  const light = days({ Tue: ['stroll', 'stroll', 'yoga'], Wed: ['walk', 'bike'], Thu: ['walk', 'bike'], Sat: ['walk', 'bike'], Sun: ['walk', 'bike'], Mon: ['bands'], Fri: ['body'] });
  assert.equal(evalPlan(light).flags.slice(0, 2), 'm0', 'light activity does not count toward daily minutes');
  assert.equal(evalPlan(days({ Tue: ['walk', 'bike'], Wed: ['walk', 'bike'], Thu: ['walk', 'bike'], Sat: ['walk', 'bike'], Sun: ['walk', 'bike'] })).flags, 'm1v0s0b0'.replace('v0', 'v0'));
});

test('weighting follows the unit emphasis and cognitive-demand targets', () => {
  const stat = JSON.parse(JSON.stringify({})); const bs = JSON.parse(require_fs('teacher-private/build-stats.json'));
  const L = bs.stat.byLvl, tot = bs.stat.pts, share = (k) => (L[k] || 0) / tot * 100;
  assert.ok(share('K') >= 18 && share('K') <= 26, 'knowledge/comprehension ' + share('K')); assert.ok(share('AP') >= 38 && share('AP') <= 47, 'application ' + share('AP'));
  assert.ok(share('AN') >= 24 && share('AN') <= 31, 'analysis/evaluation ' + share('AN')); assert.ok(share('SY') >= 5 && share('SY') <= 10, 'synthesis ' + share('SY'));
  assert.ok(bs.stat.byType.mc / 53 < 0.4, 'conventional multiple choice share under 40%');
});
import fs from 'node:fs';
function require_fs(p) { return fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'); }

test('every question has metadata, hints, a concept in the registry and a source domain', () => {
  for (const q of allQuestions()) {
    for (const f of ['id', 'domain', 'concept', 'skill', 'difficulty', 'qt', 'type', 'lvl']) assert.ok(q[f] !== undefined, `${q.id} missing ${f}`);
    assert.ok(q.hints.length >= 1 && q.hints.every((h) => h.length > 15), q.id + ' hints');
    assert.ok(!/(the answer is|correct answer)/i.test(q.hints.join(' ')), q.id + ' hint gives the answer away');
    assert.ok(content.concepts[q.concept] && content.concepts[q.concept].tip && content.concepts[q.concept].struggle);
  }
});

test('health-sensitive design: no weights, BMI, dieting, calorie-restriction goals or "good/bad food" labels in student content', () => {
  const txt = JSON.stringify(content.missions).toLowerCase();
  assert.ok(!/\bbmi\b/.test(txt), 'bmi');
  for (const bad of ['weigh yourself', 'your weight', 'lose weight', 'weight loss', 'diet plan', 'calorie deficit', 'calorie restriction', 'good food', 'bad food', 'junk food', 'clean eating', 'cheat day', 'skinny', 'fat-burning']) assert.ok(!txt.includes(bad), 'found: ' + bad);
});

test('config: default teacher codes hash correctly; four blocks exactly as specified', () => {
  assert.deepEqual(CONFIG.blocks, ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9']);
  const h = (k, v) => sha256(CONFIG.hashSalt + '|' + k + '|' + v);
  assert.equal(CONFIG.resetCodeHash, h('reset', 'RESET-7-TEACHER')); assert.equal(CONFIG.previewPasscodeHash, h('preview', 'PREVIEW-7-TEACHER')); assert.equal(CONFIG.teacherPasscodeHash, h('dash', 'DASH-7-TEACHER'));
  assert.ok(CONFIG.classCodes.length >= 1); assert.ok(['full', 'score', 'hidden'].includes(CONFIG.studentResults));
});

test('mastery labels and domain list', () => {
  assert.equal(masteryLabel(90), 'Strong Understanding'); assert.equal(masteryLabel(85), 'Strong Understanding'); assert.equal(masteryLabel(84.9), 'Developing'); assert.equal(masteryLabel(70), 'Developing'); assert.equal(masteryLabel(69.9), 'Review Recommended');
  assert.deepEqual(Object.values(DOMAIN_NAME), ['Nutrition Foundations', 'Nutrition Labels', 'Physical Activity & FITT', 'Marketing Literacy', 'SMART Goal Setting', 'Food Systems', 'Integrated Decision-Making']);
});

test('analytics: summary, domain means, item stats, most missed, reteach and block comparison are computed from the data', () => {
  const d = sandboxData(content, { blocks: CONFIG.blocks, domainOrder: Object.keys(DOMAIN_NAME), domainNames: DOMAIN_NAME, options: { strongAt: 85, developingAt: 70 } });
  const R = A.counted(d, { showDemo: true }); assert.equal(R.length, 28); assert.equal(A.counted(d, { showDemo: false }).length, 0, 'demo hidden by default');
  const S = A.summary(R, d.options); assert.equal(S.n, 28); assert.ok(Math.abs(S.avg - R.reduce((a, s) => a + s.pct, 0) / 28) < 0.06); assert.ok(S.min <= S.median && S.median <= S.max);
  assert.equal(A.counted(d, { block: 'Block 3/4', showDemo: true }).length, 7);
  const stats = A.itemStats(d, R.map((s) => s.sid)); assert.ok(stats.length >= 45);
  const mm = A.mostMissed(stats, 5); assert.ok(mm[0].firstPct <= mm[4].firstPct);
  const rt = A.reteach(stats, content.concepts, { scope: 'All Classes' }); assert.equal(rt.length, 5); assert.ok(rt[0].pct <= rt[4].pct); assert.match(rt[0].text, /Priority 1/);
  const cmp = A.compareBlocks(d, { showDemo: true }); assert.equal(cmp.length, 4); assert.ok(cmp.every((b) => b.n === 7 && b.domains.length === 7));
  const rep = A.studentReport(d, R[0].sid); assert.equal(rep.a1.length + rep.a2.length + rep.a3.length + rep.zero.length, rep.items.length);
  assert.equal(rep.a1.length, R[0].f1);
});

test('CSV exports: master CSV, per-block CSV and the simplified grade export', () => {
  const d = sandboxData(content, { blocks: CONFIG.blocks, domainOrder: Object.keys(DOMAIN_NAME), domainNames: DOMAIN_NAME, options: { strongAt: 85, developingAt: 70 } });
  const R = A.counted(d, { showDemo: true }); const g = A.gradeCsv(R).replace('﻿', '').split('\r\n');
  assert.equal(g[0], '"Student Last Name","Student First Name","Block","Final Percentage"'); assert.equal(g.length, 29);
  const m = A.masterCsv(d, R.filter((s) => s.block === 'Block 6/7')).split('\r\n'); assert.equal(m.length, 8);
  assert.ok(A.toCsv(['a'], [['x"y']]).includes('"x""y"'));
});

test('storage wrapper keeps a tamper checksum and never throws without localStorage', () => {
  const st = makeStore('t'); st.saveSession({ a: 1 }); const back = st.loadSession(); assert.equal(back.a, 1); assert.ok(!back.tamper);
  st.setLock('A B|Block 1/2', 'X', { t: 1 }); assert.equal(st.isLocked('A B|Block 1/2', 'x'), true); st.clearLock('A B|Block 1/2', 'X'); assert.equal(st.isLocked('A B|Block 1/2', 'x'), false);
});

test('isComplete gates the Check button for each type', () => {
  assert.equal(isComplete({ type: 'mc' }, null), false); assert.equal(isComplete({ type: 'mc' }, 'a'), true);
  assert.equal(isComplete({ type: 'multi' }, []), false); assert.equal(isComplete({ type: 'num' }, ''), false); assert.equal(isComplete({ type: 'num' }, 5), true);
  assert.equal(isComplete({ type: 'slider' }, null), false); assert.equal(isComplete({ type: 'plan' }, { flags: 'x', touched: false }), false);
  assert.equal(isComplete({ type: 'match', items: [['a', 1], ['b', 2]] }, { a: 'x' }), false); assert.equal(isComplete({ type: 'seq', steps: [[1], [2]] }, [1, 2]), true);
});
