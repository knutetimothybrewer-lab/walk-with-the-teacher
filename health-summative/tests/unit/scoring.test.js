import test from 'node:test';
import assert from 'node:assert/strict';
import cfg from '../../config.js';
import {
  attemptCredit, multiplier, fractionMulti, fractionPlace, itemOutcome, percentOf, totals, pointsFor,
} from '../../js/engine/scoring.js';
import { grade, isComplete } from '../../js/engine/grade.js';
import { rngFrom, shuffle, orderEntries, hashStr } from '../../js/engine/rng.js';
import { completionCode } from '../../js/engine/code.js';
import { resolveVariant, buildPlan } from '../../js/engine/plan.js';
import content from '../../content/index.js';
import { mc, multi, sort, order, match, tag } from '../../content/dsl.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} !== ${b}`);

test('attempt multipliers: 100 / 90 / 75 / 0', () => {
  assert.equal(multiplier(1, cfg), 1);
  assert.equal(multiplier(2, cfg), 0.9);
  assert.equal(multiplier(3, cfg), 0.75);
  assert.equal(multiplier(4, cfg), 0);
});

test('single-answer item earns points x multiplier on the attempt it is solved', () => {
  near(itemOutcome(1, [{ fraction: 1 }], cfg).earned, 1);
  near(itemOutcome(1, [{ fraction: 0 }, { fraction: 1 }], cfg).earned, 0.9);
  near(itemOutcome(1, [{ fraction: 0 }, { fraction: 0 }, { fraction: 1 }], cfg).earned, 0.75);
  near(itemOutcome(1, [{ fraction: 0 }, { fraction: 0 }, { fraction: 0 }], cfg).earned, 0);
  near(itemOutcome(3, [{ fraction: 0 }, { fraction: 1 }], cfg).earned, 2.7);
});

test('partial credit: fraction x points x attempt multiplier; best attempt counts', () => {
  // 3 of 4 right on try 1, perfect on try 2 -> max(0.75, 0.9) = 0.9 (x2 points)
  near(itemOutcome(2, [{ fraction: 0.75 }, { fraction: 1 }], cfg).earned, 1.8);
  // 3 of 4 right on try 1 and never completed: keeps the 0.75 from try 1 (x2 points)
  near(itemOutcome(2, [{ fraction: 0.75 }, { fraction: 0.75 }, { fraction: 0.75 }], cfg).earned, 1.5);
  // try 1 was better than a later regression
  near(itemOutcome(2, [{ fraction: 0.5 }, { fraction: 0.25 }], cfg).earned, 1.0);
});

test('solved flag only when fraction is 1', () => {
  assert.equal(itemOutcome(1, [{ fraction: 0.99 }], cfg).solved, false);
  assert.equal(itemOutcome(1, [{ fraction: 1 }], cfg).solved, true);
});

test('skipped items earn full points and have no attempts', () => {
  const o = itemOutcome(3, [], cfg, true);
  assert.equal(o.earned, 3); assert.equal(o.attemptsUsed, 0); assert.equal(o.skipped, true);
});

test('multi-select fraction: (right - wrong) / right, floored at 0', () => {
  near(fractionMulti([1, 2, 3], [1, 2, 3]), 1);
  near(fractionMulti([1, 2], [1, 2, 3, 4]), 0.5);
  near(fractionMulti([1, 2, 9], [1, 2, 3, 4]), 0.25);
  near(fractionMulti([9], [1, 2]), 0);
  near(fractionMulti([1, 9, 8, 7], [1, 2]), 0);
  near(fractionMulti([], [1, 2]), 0);
  near(fractionMulti([1, 1, 2], [1, 2]), 1); // duplicates ignored
});

test('place fraction: share of tokens in the right slot', () => {
  const tokens = [{ id: 'a', slot: 'x' }, { id: 'b', slot: 'y' }, { id: 'c', slot: 'x' }, { id: 'd', slot: 'y' }];
  near(fractionPlace({ a: 'x', b: 'y', c: 'x', d: 'y' }, tokens), 1);
  near(fractionPlace({ a: 'x', b: 'y', c: 'y', d: 'x' }, tokens), 0.5);
  near(fractionPlace({ a: 'x' }, tokens), 0.25);
  near(fractionPlace({}, tokens), 0);
});

test('points from sub-parts: 1 for 1-3, 2 for 4-6, 3 for 7+; item override wins', () => {
  assert.equal(pointsFor({}, 1, cfg), 1);
  assert.equal(pointsFor({}, 3, cfg), 1);
  assert.equal(pointsFor({}, 4, cfg), 2);
  assert.equal(pointsFor({}, 6, cfg), 2);
  assert.equal(pointsFor({}, 7, cfg), 3);
  assert.equal(pointsFor({}, 10, cfg), 3);
  assert.equal(pointsFor({ points: 5 }, 1, cfg), 5);
});

test('percent rounding is half-up and stable', () => {
  assert.equal(percentOf(0, 10), 0);
  assert.equal(percentOf(10, 10), 100);
  assert.equal(percentOf(8.5, 10), 85);
  assert.equal(percentOf(1, 3), 33);
  assert.equal(percentOf(2, 3), 67);
  assert.equal(percentOf(0.5, 100), 1);   // 0.5% rounds up
  assert.equal(percentOf(0.49, 100), 0);
  assert.equal(percentOf(7.35, 10), 74);  // 73.5 rounds up despite float noise
  assert.equal(percentOf(5, 0), 0);
});

test('totals: sums, per-station and per-topic breakdown', () => {
  const rows = [
    { id: 'a', station: 's1', topic: 'T1', points: 1, earned: 1 },
    { id: 'b', station: 's1', topic: 'T2', points: 2, earned: 1.8 },
    { id: 'c', station: 's2', topic: 'T1', points: 3, earned: 0 },
  ];
  const t = totals(rows);
  near(t.earned, 2.8); near(t.possible, 6);
  assert.equal(t.percent, 47);
  assert.equal(t.byStation.s1.percent, 93);
  assert.equal(t.byStation.s2.percent, 0);
  assert.equal(t.byTopic.T1.percent, 25);
});

/* ---------- grading real item shapes ---------- */
test('grade mc / multi / place via the content DSL', () => {
  const q = mc('x', { prompt: 'p', right: 'R', wrong: ['a', 'b'] });
  assert.equal(grade(q, { pick: 0 }).fraction, 1);
  assert.equal(grade(q, { pick: 1 }).fraction, 0);
  const m = multi('m', { prompt: 'p', right: ['r1', 'r2'], wrong: ['w1'] });
  assert.equal(grade(m, { picks: [0, 1] }).fraction, 1);
  assert.equal(grade(m, { picks: [0, 2] }).fraction, 0);   // 1 right - 1 wrong = 0
  assert.equal(grade(m, { picks: [0] }).fraction, 0.5);
  const s = sort('s', { prompt: 'p', slots: [['a', 'A'], ['b', 'B']], cards: [['x', 'a'], ['y', 'b'], ['z', 'b']] });
  assert.equal(grade(s, { map: { t0: 'a', t1: 'b', t2: 'b' } }).fraction, 1);
  assert.ok(Math.abs(grade(s, { map: { t0: 'a', t1: 'a', t2: 'b' } }).fraction - 2 / 3) < 1e-9);
  assert.equal(isComplete(s, { map: { t0: 'a' } }), false);
  assert.equal(isComplete(s, { map: { t0: 'a', t1: 'a', t2: 'a' } }), true);
  const o = order('o', { prompt: 'p', steps: ['1st', '2nd', '3rd'] });
  assert.equal(grade(o, { map: { t0: '1', t1: '2', t2: '3' } }).fraction, 1);
  assert.ok(Math.abs(grade(o, { map: { t0: '2', t1: '1', t2: '3' } }).fraction - 1 / 3) < 1e-9);
  const mt = match('mt', { prompt: 'p', pairs: [['L1', 'R1'], ['L2', 'R2']] });
  assert.equal(grade(mt, { map: { t0: 'r0', t1: 'r1' } }).fraction, 1);
  const tg = tag('tg', { prompt: 'p', slots: [['a', 'A'], ['b', 'B']], rows: [['s1', 'a'], ['s2', 'b']] });
  assert.equal(grade(tg, { map: { t0: 'b', t1: 'b' } }).fraction, 0.5);
});

/* ---------- seeded randomness ---------- */
test('seeded shuffle is repeatable and differs by seed', () => {
  const arr = Array.from({ length: 20 }, (_, i) => i);
  const a = shuffle(arr, rngFrom('seed-1')), b = shuffle(arr, rngFrom('seed-1')), c = shuffle(arr, rngFrom('seed-2'));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.deepEqual(a.slice().sort((x, y) => x - y), arr);
});

test('orderEntries keeps fixed entries in place and does not lose any', () => {
  const entries = [{ id: 'a', fixed: true }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e', fixed: true }, { id: 'f' }];
  const out = orderEntries(entries, 'seed', 'st');
  assert.equal(out[0].id, 'a'); assert.equal(out[4].id, 'e');
  assert.deepEqual(out.map(e => e.id).sort(), ['a', 'b', 'c', 'd', 'e', 'f']);
  assert.deepEqual(out, orderEntries(entries, 'seed', 'st'));
});

test('hashStr is stable', () => { assert.equal(hashStr('abc'), hashStr('abc')); assert.notEqual(hashStr('abc'), hashStr('abd')); });

test('completion code format and determinism', () => {
  const a = completionCode({ first: 'A', last: 'B', code: 'X', percent: 90, earned: 80, endedAt: 1 });
  assert.match(a, /^WWT-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  assert.equal(a, completionCode({ first: 'a', last: 'b', code: 'x', percent: 90, earned: 80, endedAt: 1 }));
  assert.notEqual(a, completionCode({ first: 'A', last: 'B', code: 'X', percent: 91, earned: 80, endedAt: 1 }));
});

test('variants: none by default; when present, chosen per student and stable; id is preserved', () => {
  const base = mc('v1', { prompt: 'base', right: 'R', wrong: ['a', 'b'] });
  assert.equal(resolveVariant(base, 'seed'), base);
  const withV = { ...base, variants: [{ prompt: 'alt 1' }, { prompt: 'alt 2' }] };
  const seen = new Set();
  for (let i = 0; i < 60; i++) { const r = resolveVariant(withV, 'student-' + i); seen.add(r.prompt); assert.equal(r.id, 'v1'); assert.equal(r, resolveVariant(withV, 'student-' + i) && r); }
  assert.deepEqual([...seen].sort(), ['alt 1', 'alt 2', 'base']);
  assert.equal(resolveVariant(withV, 's').prompt, resolveVariant(withV, 's').prompt);
});

test('plan: every question appears exactly once; disabled items and empty stations are dropped', () => {
  const cfg2 = { ...cfg, disabledItems: [] };
  const plan = buildPlan(content, { seed: 'x' }, cfg2);
  const ids = plan.all.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length > 50);
  const plan2 = buildPlan(content, { seed: 'x' }, { ...cfg, disabledItems: ids.filter(i => i.startsWith('s1-') || i === 's2-01') });
  assert.equal(plan2.stations.find(s => s.id === 's1'), undefined);
  assert.equal(plan2.stations.find(s => s.id === 's2').steps.some(s => s.id === 's2-01'), false);
  const plan3 = buildPlan(content, { seed: 'x' }, { ...cfg, capstone: { enabled: false } });
  assert.equal(plan3.stations.some(s => s.id === 'capstone'), false);
});

test('plan: no more than 3 consecutive entries of the same kind (except scenes)', async () => {
  const { kindOf } = await import('../../js/engine/rng.js');
  for (let n = 0; n < 40; n++) {
    const plan = buildPlan(content, { seed: 'student-' + n }, cfg);
    for (const st of plan.stations) {
      const kinds = [];
      let lastBlock = null;
      for (const r of st.steps) {
        if (r.blockId) { if (r.blockId !== lastBlock) kinds.push('chat'); lastBlock = r.blockId; }
        else { lastBlock = null; kinds.push(kindOf(r.item)); }
      }
      let run = 1;
      for (let i = 1; i < kinds.length; i++) {
        run = kinds[i] === kinds[i - 1] ? run + 1 : 1;
        assert.ok(run <= 3, `station ${st.id} seed ${n}: ${run} consecutive ${kinds[i]}`);
      }
    }
  }
});
