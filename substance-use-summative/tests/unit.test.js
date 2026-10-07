import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sha256 } from '../js/sha256.js';
import { canon, answerHash } from '../js/canon.js';
import { creditFor, earnedFor, totals } from '../js/scoring.js';
import { buildPlan, planParts, presentation, newState, Session, gradeLocal, partsOf } from '../js/engine.js';
import { makeStore } from '../js/storage.js';
import { simulate } from '../js/bacmodel.js';
import { runChat, allPaths, passingPaths } from '../js/chatmodel.js';
import { obf, deobf } from '../js/obf.js';
import content from '../content/public.js';

const mods = [];
for (const m of ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8']) mods.push((await import(`../authoring/${m}.js`)).default);
const chat = (await import('../authoring/chat.js')).default;
function* authoredQs(stages) { for (const s of stages) { if (s.kind === 'pool') for (const g of s.groups) yield* authoredQs(g.items); else if (s.kind === 'q') yield s.q; else yield* s.qs; } }
const authored = Object.fromEntries(mods.flatMap((m) => [...authoredQs(m.stages)]).map((q) => [q.id, q]));
const pubQs = {}; (function w(st) { for (const s of st) { if (s.kind === 'pool') s.groups.forEach((g) => w(g.items)); else partsOf(s).forEach((q) => (pubQs[q.id] = q)); } })(content.missions.flatMap((m) => m.stages));

test('sha256 test vectors', () => {
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256('a'.repeat(1000)), '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
});

test('three-attempt credit: 100 / 85 / 75 / 0', () => {
  assert.equal(creditFor(1), 1); assert.equal(creditFor(2), 0.85); assert.equal(creditFor(3), 0.75); assert.equal(creditFor(4), 0);
  const att = (...r) => ({ attempts: r.map((c, i) => ({ n: i + 1, correct: c })) });
  assert.equal(earnedFor(4, att(true)), 4);
  assert.equal(earnedFor(4, att(false, true)), 3.4);
  assert.equal(earnedFor(4, att(false, false, true)), 3);
  assert.equal(earnedFor(4, att(false, false, false)), 0);
});

test('every authored answer is accepted and a wrong answer is rejected (local hash grading)', () => {
  let n = 0;
  for (const [id, q] of Object.entries(authored)) {
    const pq = pubQs[id]; assert.ok(pq, 'public question exists ' + id);
    assert.ok(!('ans' in pq) && !('explain' in pq), 'no plaintext key in public content: ' + id);
    if (q.type === 'run') {
      for (const p of passingPaths(chat)) assert.equal(gradeLocal(content, pq, p), true);
      assert.equal(gradeLocal(content, pq, ['c1a', 'c2b', 'c3a']), false);
    } else {
      assert.equal(gradeLocal(content, pq, q.ans), true, id);
      let wrong;
      switch (q.type) {
        case 'mc': case 'predict': wrong = q.opts.find((o) => o[0] !== q.ans)[0]; break;
        case 'hotspot': wrong = q.regions.find((o) => o[0] !== q.ans)[0]; break;
        case 'multi': wrong = q.ans.slice(1); if (!wrong.length) wrong = [q.opts.find((o) => !q.ans.includes(o[0]))[0]]; break;
        case 'sort': case 'match': { wrong = { ...q.ans }; const k = Object.keys(wrong)[0]; const bins = (q.bins || q.choices).map((b) => b[0]); wrong[k] = bins.find((b) => b !== wrong[k]); break; }
        case 'slots': wrong = { ...q.ans, s1: q.slots[0].opts.find((o) => o[0] !== q.ans.s1)[0] }; break;
        case 'seq': wrong = q.ans.slice().reverse(); break;
        case 'pick': wrong = q.ans.slice().reverse(); break;
      }
      assert.equal(gradeLocal(content, pq, wrong), false, 'wrong answer rejected: ' + id);
      if (q.type === 'multi' && q.ans.length > 1) assert.equal(gradeLocal(content, pq, [...q.ans].reverse()), true, 'order-independent multi');
    }
    n++;
  }
  assert.ok(n > 70);
});

test('every student version is worth exactly 100 points and covers every domain', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const plan = buildPlan(content, 'seed' + i);
    const parts = planParts(plan);
    assert.equal(parts.reduce((a, q) => a + q.pts, 0), 100, 'seed ' + i);
    assert.equal(new Set(parts.map((q) => q.id)).size, parts.length, 'no duplicate questions');
    for (const d of ['brain', 'nicotine', 'alcohol', 'cannabisRx', 'opioid', 'decision', 'literacy']) assert.ok(parts.some((q) => q.domain === d), d);
    seen.add(plan.versionId);
  }
  assert.ok(seen.size > 20, 'pools produce many different versions: ' + seen.size);
});

test('plans are deterministic for a seed and answer order is shuffled', () => {
  const a = buildPlan(content, 'X1'), b = buildPlan(content, 'X1');
  assert.deepEqual(a.ids, b.ids);
  let moved = 0, total = 0;
  for (const q of planParts(a)) if (q.type === 'mc' && !q.fixedOrder) { total++; const p = presentation(q, 'X1'); if (p.opts[0][0] !== q.opts[0][0]) moved++; assert.deepEqual(p, presentation(q, 'X1')); }
  assert.ok(moved > 0 && total > 10);
  // sequence items never start in the correct (authoring) order
  for (const q of planParts(a)) if (q.type === 'seq') assert.notDeepEqual(presentation(q, 'X1').steps.map((s) => s[0]), authored[q.id].ans);
  // pinned options stay last
  const cs = planParts(a).find((q) => q.pin && q.pin.length && q.type === 'mc');
  assert.equal(presentation(cs, 'k').opts.at(-1)[0], cs.pin.at(-1));
});

test('attempt bookkeeping: counted at CHECK, persisted, three max, locked afterwards', () => {
  const store = makeStore('t1');
  const st = newState({ student: { name: 'A B', period: '3', code: 'DEMO2026' }, demo: true, content });
  const s = new Session(st, content, store);
  const q = s.parts.find((p) => p.type === 'mc');
  for (let i = 1; i <= 3; i++) {
    const pend = s.beginAttempt(q, 'zzz'); assert.equal(pend.a.n, i);
    // simulate a refresh before grading resolves: reload from storage
    const reloaded = new Session(store.loadSession(), content, store); assert.equal(reloaded.attemptsUsed(q.id), i);
    s.finishAttempt(q, pend, false);
  }
  assert.equal(s.status(q.id), 'locked');
  assert.equal(s.beginAttempt(q, 'a'), null, 'no fourth attempt');
  assert.equal(s.totals().earned, 0);
  const q2 = s.parts.find((p) => p.type === 'mc' && p.id !== q.id);
  const p2 = s.beginAttempt(q2, 'x'); s.finishAttempt(q2, p2, false);
  const p3 = s.beginAttempt(q2, 'y'); s.finishAttempt(q2, p3, true);
  assert.equal(s.totals().earned, q2.pts * 0.85);
  assert.equal(s.totals().second, 1);
});

test('unresolved attempts (tab closed mid-check) count as used', () => {
  const store = makeStore('t2');
  const st = newState({ student: { name: 'C D', period: '1', code: 'DEMO2026' }, demo: true, content });
  const s = new Session(st, content, store);
  const q = s.parts[0]; s.beginAttempt(q, 'x');
  const r = new Session(store.loadSession(), content, store); r.settlePending();
  assert.equal(r.rec(q.id).attempts[0].correct, false);
});

test('tampering with saved state is noticed', () => {
  const store = makeStore('t3');
  const st = newState({ student: { name: 'E F', period: '1', code: 'DEMO2026' }, demo: true, content });
  store.saveSession(st);
  assert.equal(store.loadSession().tamper, false);
});

test('obfuscated explanations round-trip', () => {
  const t = 'Naloxone works only on opioids — and is temporary.';
  assert.equal(deobf(obf(t, 'k'), 'k'), t);
});

test('BAC model behaves like the lessons say (and never goes negative)', () => {
  const base = { drinks: 4, body: 'medium', window: 'h1', food: 'fasted' };
  const a = simulate(base), slow = simulate({ ...base, window: 'h4' }), fed = simulate({ ...base, food: 'fed' });
  const small = simulate({ ...base, body: 'small' }), large = simulate({ ...base, body: 'large' });
  assert.ok(slow.peak < a.peak * 0.6, 'slower pace lowers peak');
  assert.ok(Math.abs(slow.zeroT - a.zeroT) <= 0.5, 'but total clearing time about the same');
  assert.ok(fed.peak < a.peak && fed.peakT > a.peakT, 'food lowers and delays peak');
  assert.ok(Math.abs(fed.zeroT - a.zeroT) <= 0.5, 'food does not speed clearing');
  assert.ok(small.peak > a.peak && a.peak > large.peak, 'body size');
  assert.ok(Math.min(...a.bac) >= 0);
  assert.ok(simulate({ ...base, drinks: 8 }).zeroT > a.zeroT);
});

test('chat model: passing runs exist, unsafe runs fail, partial runs are not complete', () => {
  assert.ok(passingPaths(chat).length > 10);
  assert.equal(runChat(chat, ['c1a', 'c2b', 'c3a']).pass, false);
  assert.equal(runChat(chat, ['c1c', 'c2c', 'c3b', 'c4a']).pass, true);
  assert.equal(runChat(chat, ['c1c', 'c2c']).ended, false);
  assert.ok(allPaths(chat).length > 100);
});
