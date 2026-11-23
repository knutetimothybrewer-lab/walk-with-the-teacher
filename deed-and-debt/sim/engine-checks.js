#!/usr/bin/env node
/* Engine-level Definition of Done checks (no browser needed):
   1. Save -> reload -> resume: at 300 random points (including mid-Year and mid-prompt), the state is
      written to JSON and read back. The copy must equal the original, and playing on from the copy
      must give exactly the same final results as playing on from the original.
   2. End Game Now from any point: at 300 random points (every kind of prompt), the teacher ends the
      game; the game must reach a valid Results page.
   3. No softlocks: every game in this file reaches Results; negative cash always resolves.
   4. CSV: the game log parses as RFC 4180 CSV with 6 columns on every row and no formula-like cells.
   Usage: node sim/engine-checks.js                                                                  */
const { Engine: E } = require('./load-engine')();
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

function game(seed, n = 4, years = 10, diff = 'standard') {
  return E.newGame({ seed, groupName: 'chk', players: Array.from({ length: n }, (_, i) => ({ name: 'P' + i, cpu: true, strategy: E.STRATEGIES[(seed + i) % 5] })), settings: { years, difficulty: diff, quickChecks: false } });
}
function runToEnd(s, label) {
  let k = 0;
  while (s.flow.stage !== 'results') {
    const r = E.stepMut(s, { type: 'cpu' });
    if (r.error) throw new Error(label + ' error ' + r.error + ' at ' + JSON.stringify(s.pending));
    if (++k > 60000) throw new Error(label + ' softlock at ' + JSON.stringify(s.pending));
  }
  return s;
}
function advanceN(s, n) { for (let i = 0; i < n && s.flow.stage !== 'results'; i++) E.stepMut(s, { type: 'cpu' }); return s; }
const strip = (s) => { const c = JSON.parse(JSON.stringify(s)); c.savedAt = 0; return JSON.stringify(c); };

// ---------- 1. save / resume ----------
const kinds = {};
for (let i = 1; i <= 300; i++) {
  const seed = 1000 + i, diff = ['easy', 'standard', 'advanced'][i % 3];
  const s = advanceN(game(seed, 2 + (i % 5), 10, diff), Math.floor((i * 7919) % 380));
  if (s.flow.stage === 'results') continue;
  kinds[s.pending ? s.pending.kind : 'none'] = (kinds[s.pending ? s.pending.kind : 'none'] || 0) + 1;
  const saved = JSON.stringify(s); const loaded = JSON.parse(saved);
  ok(strip(loaded) === strip(s), 'save/resume: copy differs at seed ' + seed);
  try {
    const a = runToEnd(s, 'orig ' + seed), b = runToEnd(loaded, 'copy ' + seed);
    ok(JSON.stringify(E.results(a)) === JSON.stringify(E.results(b)), 'save/resume: different outcome at seed ' + seed);
  } catch (e) { fails.push(e.message); }
}
console.log('Save/resume tested at prompts:', JSON.stringify(kinds));

// ---------- 2. End Game Now ----------
const endKinds = {};
for (let i = 1; i <= 300; i++) {
  const seed = 5000 + i;
  const s = advanceN(game(seed, 2 + (i % 5), [3, 4, 6, 8, 10, 14, 20, 25][i % 8], ['easy', 'standard', 'advanced'][i % 3]), Math.floor((i * 104729) % 300));
  if (s.flow.stage === 'results') continue;
  const kind = s.pending ? s.pending.kind : 'none'; endKinds[kind] = (endKinds[kind] || 0) + 1;
  const r = E.stepMut(s, { type: 'endGameNow' });
  ok(!r.error, 'endGameNow error ' + r.error);
  try {
    runToEnd(s, 'endnow ' + seed);
    const R = E.results(s);
    ok(R.players.length >= 2 && R.rank.length === R.players.length && R.ended, 'endnow: bad results at seed ' + seed);
    ok(R.players.every(p => isFinite(p.nw) && p.yearly.length >= 1), 'endnow: bad player data at seed ' + seed);
    ok(s.flow.turn === null || s.flow.stage === 'results', 'endnow: still in a turn');
  } catch (e) { fails.push(e.message); }
}
console.log('End Game Now tested at prompts:', JSON.stringify(endKinds));

// ---------- 3/4. full games: no softlocks + CSV ----------
function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') { if (f !== '') throw new Error('quote inside unquoted field'); q = true; }
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\r') { if (text[i + 1] !== '\n') throw new Error('bare CR'); }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (q) throw new Error('unclosed quote'); if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}
let debtsResolved = 0, games = 0;
for (let seed = 1; seed <= 120; seed++) {
  try {
    const s = game(seed, 2 + (seed % 5), [3, 4, 6, 8, 10, 14, 20, 25][seed % 8], ['easy', 'standard', 'advanced'][seed % 3]);
    let k = 0, inDebt = false;
    while (s.flow.stage !== 'results') {
      const r = E.stepMut(s, { type: 'cpu' }); if (r.error) throw new Error('seed ' + seed + ' ' + r.error);
      if (s.pending && s.pending.kind === 'debt') inDebt = true; else if (inDebt) { debtsResolved++; inDebt = false; }
      if (++k > 60000) throw new Error('softlock seed ' + seed);
    }
    games++;
    ok(s.players.every(p => p.cash >= 0), 'negative cash at end, seed ' + seed);
    const csv = E.csv(s); const rows = parseCSV(csv);
    ok(rows[0].join(',') === 'Year,Turn,Player,Type,Description,Amount', 'csv header');
    ok(rows.every(r => r.length === 6), 'csv column count, seed ' + seed);
    ok(rows.slice(1).every(r => r.every(c => !/^[=+\-@]/.test(c) || !isNaN(Number(c)))), 'csv formula-like cell, seed ' + seed);
    ok(rows.slice(1).every(r => r[5] === '' || !isNaN(Number(r[5]))), 'csv amount not numeric, seed ' + seed);
    ok(rows.length === s.log.length + 1, 'csv row count, seed ' + seed);
  } catch (e) { fails.push(e.message); }
}
console.log('Full games finished:', games, '| times a player went negative and recovered:', debtsResolved);
if (fails.length) { console.log('FAILURES (' + fails.length + '):\n' + fails.slice(0, 30).join('\n')); process.exit(1); }
console.log('ALL ENGINE CHECKS PASSED');
