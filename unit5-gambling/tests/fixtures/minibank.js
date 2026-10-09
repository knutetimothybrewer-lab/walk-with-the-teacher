'use strict';
// A tiny bank (one or two items per chapter, every item type) used only by the engine tests.
const U5 = require('../../shared/core.js');
const o = (id, text) => ({ id, text });
const theme = ['navy-gold', 'teal-lab', 'purple-lab', 'green-desk', 'studio', 'calm'];
function chapter(id, steps) { return { id, title: 'Chapter ' + id, subtitle: 'Test chapter ' + id, theme: theme[id - 1], minutes: 10, steps }; }

const bank = { title: 'Mini bank', version: 'test-1', chapters: [
  chapter(1, [
    { kind: 'intro', id: 'i1', title: 'Intro' },
    { kind: 'item', id: 'c1-mc', item: { title: 'Single choice', pts: 4, min: 1, lo: ['L1'], prompt: 'Pick B', stim: [{ k: 'p', t: 'Context' }],
      parts: [{ id: 'a', type: 'choice', lvl: 'U', options: [o('A', 'Alpha'), o('B', 'Bravo'), o('C', 'Charlie'), o('D', 'Delta')], key: 'B' }],
      hints: ['hint one', 'hint two'], explain: 'Because B.' } },
    { kind: 'item', id: 'c1-multi', item: { title: 'Multi', pts: 4, min: 1, prompt: 'Pick the primes', stim: [],
      parts: [{ id: 'a', type: 'multi', lvl: 'P', options: [o('2', '2'), o('3', '3'), o('4', '4'), o('5', '5'), o('6', '6')], key: ['2', '3', '5'] }],
      hints: ['h1', 'h2'], explain: 'Primes.' } }
  ]),
  chapter(2, [
    { kind: 'item', id: 'c2-num', item: (ctx) => { const n = ctx.r.int(3, 9); return { title: 'Numeric variant', pts: 6, min: 2, prompt: `Marbles: ${n} red, 7 blue.`, stim: [],
      parts: [{ id: 'a', type: 'number', lvl: 'P', fields: [
        { id: 'p', label: 'P(red)', kind: 'prob', ans: n / (n + 7), tol: 0.0005 },
        { id: 'o', label: 'Odds red:blue', kind: 'ratio', ans: [n, 7] }] }],
      hints: ['h1', 'h2'], explain: `${n}/${n + 7}` }; } },
    { kind: 'item', id: 'c2-lab', item: (ctx) => { const s = U5.coinStats(ctx.coinSeed, 20); return { title: 'Lab number', pts: 3, min: 2, prompt: 'Heads in first 20 flips?', sim: 'coin', stim: [],
      parts: [{ id: 'a', type: 'number', lvl: 'P', fields: [{ id: 'h', label: 'Heads', kind: 'num', ans: s.heads, tol: 0 }] }], hints: ['h1', 'h2'], explain: 'Count them.' }; } }
  ]),
  chapter(3, [
    { kind: 'item', id: 'c3-map', item: { title: 'Match', pts: 6, min: 2, prompt: 'Match', stim: [],
      parts: [{ id: 'a', type: 'map', lvl: 'U', rows: [{ id: 'r1', text: 'One' }, { id: 'r2', text: 'Two' }, { id: 'r3', text: 'Three' }], options: [o('x', 'X'), o('y', 'Y'), o('z', 'Z')], key: { r1: 'x', r2: 'y', r3: 'z' } }],
      hints: ['h1', 'h2'], explain: 'ok' } },
    { kind: 'item', id: 'c3-map8', item: { title: 'Match eight', pts: 8, min: 2, prompt: 'Match eight', stim: [],
      parts: [{ id: 'a', type: 'map', lvl: 'U', rows: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: 'r' + n, text: 'Row ' + n })), options: [o('x', 'X'), o('y', 'Y')],
        key: { r1: 'x', r2: 'y', r3: 'x', r4: 'y', r5: 'x', r6: 'y', r7: 'x', r8: 'y' } }],
      hints: ['h1', 'h2'], explain: 'ok' } },
    { kind: 'item', id: 'c3-order', item: { title: 'Order', pts: 4, min: 1, prompt: 'Order', stim: [],
      parts: [{ id: 'a', type: 'order', lvl: 'P', options: [o('s1', 'First'), o('s2', 'Second'), o('s3', 'Third'), o('s4', 'Fourth')], key: ['s1', 's2', 's3', 's4'] }],
      hints: ['h1', 'h2'], explain: 'ok' } }
  ]),
  chapter(4, [
    { kind: 'item', id: 'c4-set', item: { title: 'Composite', pts: 8, min: 3, prompt: 'Claim and evidence', stim: [],
      parts: [
        { id: 'claim', type: 'choice', w: 1, lvl: 'E', options: [o('a', 'A'), o('b', 'B')], key: 'a' },
        { id: 'ev', type: 'multi', w: 2, lvl: 'E', options: [o('e1', 'E1'), o('e2', 'E2'), o('e3', 'E3'), o('e4', 'E4')], key: ['e1', 'e3'], min: 1, max: 3 }],
      hints: ['h1', 'h2'], explain: 'ok' } }
  ]),
  chapter(5, [{ kind: 'item', id: 'c5-mc', item: { title: 'Five', pts: 5, min: 1, prompt: 'Pick R', stim: [], parts: [{ id: 'a', type: 'choice', lvl: 'N', options: [o('Q', 'q'), o('R', 'r')], key: 'R' }], hints: ['h1', 'h2'], explain: 'R.' } }]),
  chapter(6, [{ kind: 'item', id: 'c6-mc', item: { title: 'Six', pts: 6, min: 1, prompt: 'Pick S', stim: [], parts: [{ id: 'a', type: 'choice', lvl: 'E', options: [o('S', 's'), o('T', 't')], key: 'S' }], hints: ['h1', 'h2'], explain: 'S.' } }])
] };
module.exports = bank;
