#!/usr/bin/env node
/* Headless simulation: plays N seeded CPU-only games and writes sim/REPORT.md.
   Usage: node sim/simulate.js [games=500] [players=4] [years=10]            */
const fs = require('fs'), path = require('path');
const { Engine: E, C } = require('./load-engine')();
const N = +process.argv[2] || 500, NP = +process.argv[3] || 4, YEARS = +process.argv[4] || 10;
const PATHS = ['college', 'trade', 'work'], HOMES = ['rent', 'own'];

// ---- time model (seconds) for "real classroom time" ----
const TIME = { humanTurn: 20, rerollDecision: 6, perRoll: 0.9, perHop: 0.15, turnBanner: 1.1, payFly: 0.65, deedFlip: 1.1, cardFlip: 0.6, build: 0.25, yearBanner: 1.9,
  auction: 10, eventCard: 15, annualReport: 15, ballotIntro: 30, ballotVotePerPlayer: 4, ballotTally: 5, setup: 150 };

function playGame(seed) {
  // assign strategies (distinct), careers and housing at random from the seed
  let r = seed * 9301 + 49297; const rand = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const strats = E.STRATEGIES.slice().sort(() => rand() - 0.5).slice(0, NP);
  const players = strats.map((st, i) => ({ name: 'CPU' + (i + 1), cpu: true, strategy: st }));
  const s = E.newGame({ seed, groupName: 'sim' + seed, players, settings: { years: YEARS, quickChecks: false } });
  s.players.forEach(p => { p.forceCareer = PATHS[Math.floor(rand() * 3)]; p.forceHome = HOMES[Math.floor(rand() * 2)]; });
  const t = { rolls: 0, hops: 0, cards: 0, buys: 0, pays: 0, builds: 0, auctions: 0, events: 0, annual: 0, ballots: 0 };
  let steps = 0;
  while (s.flow.stage !== 'results') {
    const res = E.stepMut(s, { type: 'cpu' });
    if (res.error) throw new Error('seed ' + seed + ': ' + res.error + ' pending=' + JSON.stringify(s.pending));
    for (const f of res.fx) {
      if (f.t === 'dice') t.rolls++; else if (f.t === 'move') t.hops += f.path.length; else if (f.t === 'card' || f.t === 'cardShow' || f.t === 'taxday') t.cards++;
      else if (f.t === 'buy' && !f.trade) t.buys++; else if (f.t === 'pay') t.pays++; else if (f.t === 'build') t.builds++; else if (f.t === 'auctionStart') t.auctions++;
      else if (f.t === 'event') t.events++; else if (f.t === 'annual') t.annual++; else if (f.t === 'ballotResult') t.ballots++;
    }
    if (++steps > 100000) throw new Error('softlock: seed ' + seed + ' pending=' + JSON.stringify(s.pending));
  }
  // play time = human decision time per turn + animation time + Year screens (career setup is reported separately)
  const turns = s.flow.turnCount;
  const sec = turns * (TIME.humanTurn + TIME.turnBanner) + (t.rolls - turns) * TIME.rerollDecision + t.rolls * TIME.perRoll + t.hops * TIME.perHop + t.pays * TIME.payFly + t.buys * TIME.deedFlip +
    t.cards * TIME.cardFlip + t.builds * TIME.build + t.auctions * TIME.auction + t.events * (TIME.eventCard + TIME.yearBanner) + t.annual * TIME.annualReport +
    t.ballots * (TIME.ballotIntro + TIME.ballotVotePerPlayer * NP + TIME.ballotTally);
  return { s, R: E.results(s), sec, t };
}

const q = (arr, p) => { const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const out = { games: 0, sec: [], restructured: 0, players: 0, winNW: [], gap: [], wins: {}, seen: {}, turnCounts: [] };
const bump = (o, k, v = 1) => { o[k] = (o[k] || 0) + v; };
const t0 = Date.now();
for (let g = 1; g <= N; g++) {
  const { s, R, sec } = playGame(g);
  out.games++; out.sec.push(sec); out.turnCounts.push(s.flow.turnCount);
  const w = R.players.find(p => p.id === R.rank[0]), last = R.players.find(p => p.id === R.rank[R.rank.length - 1]);
  out.winNW.push(w.nw); out.gap.push(w.nw - last.nw);
  R.players.forEach(p => {
    out.players++; if (p.bankrupt) out.restructured++;
    const keys = ['strategy:' + p.strategy, 'career:' + p.career, 'home:' + p.homeStart];
    keys.forEach(k => bump(out.seen, k)); if (p.id === w.id) keys.forEach(k => bump(out.wins, k));
  });
}
const ms = Date.now() - t0;
const mins = out.sec.map(x => x / 60);
const row = (k) => { const wins = out.wins[k] || 0, seen = out.seen[k] || 0; return { k, share: wins / out.games, rateWhenPresent: seen ? wins / seen : 0, wins, seen }; };
const strat = E.STRATEGIES.map(st => row('strategy:' + st)), career = PATHS.map(c => row('career:' + c)), home = HOMES.map(h => row('home:' + h));
const pct = (v) => (v * 100).toFixed(1) + '%', money = (v) => '$' + Math.round(v).toLocaleString('en-US');
const checks = [
  ['Standard game takes 40-45 minutes (median estimate)', q(mins, 0.5) >= 40 && q(mins, 0.5) <= 45, q(mins, 0.5).toFixed(1) + ' min'],
  ['Fewer than 25% of players restructure', out.restructured / out.players < 0.25, pct(out.restructured / out.players)],
  ['No strategy wins more than 40% of games', strat.every(x => x.share <= 0.40), strat.map(x => x.k.split(':')[1] + ' ' + pct(x.share)).join(', ')],
  ['No career wins more than 40% of games', career.every(x => x.share <= 0.40), career.map(x => x.k.split(':')[1] + ' ' + pct(x.share)).join(', ')],
  ['Both residential and commercial strategies can win (each wins at least 10% of games)', strat.find(x => x.k === 'strategy:res').share >= 0.10 && strat.find(x => x.k === 'strategy:com').share >= 0.10,
    'res ' + pct(strat.find(x => x.k === 'strategy:res').share) + ', com ' + pct(strat.find(x => x.k === 'strategy:com').share)]
];
const tbl = (rows, label) => '| ' + label + ' | Share of all wins | Win rate when in the game | Games played in |\n|---|---|---|---|\n' + rows.map(x => '| ' + (E.STRAT_LABEL[x.k.split(':')[1]] || x.k.split(':')[1]) + ' | ' + pct(x.share) + ' | ' + pct(x.rateWhenPresent) + ' | ' + x.seen + ' |').join('\n');
const md = `# DEED & DEBT: Simulation Report

Generated by \`node sim/simulate.js ${N} ${NP} ${YEARS}\` on ${new Date().toISOString().slice(0, 10)}.
${N} seeded CPU-only games (seeds 1-${N}), ${NP} players each, ${YEARS} Years (Standard difficulty, ballots on).
Each game, the ${NP} CPU players get ${NP} different strategies (of 5), and a random career and rent/buy choice.
The engine is loaded straight from \`index.html\`. Run time: ${(ms / 1000).toFixed(1)} s.

## Pass / fail

| Target | Result | Value |
|---|---|---|
${checks.map(c => '| ' + c[0] + ' | ' + (c[1] ? 'PASS' : 'FAIL') + ' | ' + c[2] + ' |').join('\n')}

## Estimated real classroom time per game

Model: ${TIME.humanTurn}s of human decision time per turn (reading cards and choosing happen inside this), plus ${TIME.rerollDecision}s per doubles re-roll, plus animation time at Normal speed: ${TIME.turnBanner}s turn banner, ${TIME.perRoll}s per dice roll, ${TIME.perHop}s per space hopped, ${TIME.payFly}s per rent payment, ${TIME.deedFlip}s per deed flip, ${TIME.cardFlip}s per card flip, ${TIME.build}s per building, ${TIME.auction}s per auction (30s cap; it closes as soon as every human presses Pass, and instantly when no human can afford the opening bid).
Once per Year: ${TIME.yearBanner}s Year banner, ${TIME.eventCard}s to read the event card together, ${TIME.annualReport}s for the Annual Report. Per ballot: ${TIME.ballotIntro}s to read the measure, ${TIME.ballotVotePerPlayer}s per private vote, ${TIME.ballotTally}s tally.
Career and home picks at the start (about ${(TIME.setup / 60).toFixed(1)} min) belong to the 5-minute setup in the lesson plan, so they are not counted here.

| | Minutes |
|---|---|
| Median | ${q(mins, 0.5).toFixed(1)} |
| 10th-90th percentile | ${q(mins, 0.1).toFixed(1)} - ${q(mins, 0.9).toFixed(1)} |
| Turns per game (median) | ${q(out.turnCounts, 0.5)} |

## Bankruptcy / restructuring

${out.restructured} of ${out.players} players (${pct(out.restructured / out.players)}) needed a Liquidation or Repayment Plan at least once.

## Winning net worth

| | Value |
|---|---|
| Median winning net worth | ${money(q(out.winNW, 0.5))} |
| 10th-90th percentile | ${money(q(out.winNW, 0.1))} - ${money(q(out.winNW, 0.9))} |
| Median gap, 1st to last place | ${money(q(out.gap, 0.5))} |
| 10th-90th percentile gap | ${money(q(out.gap, 0.1))} - ${money(q(out.gap, 0.9))} |

## Win rate by strategy

With ${NP} players from 5 strategies, an even game gives each strategy about ${pct(1 / 5)} of all wins (or ${pct(1 / NP)} when it is in the game).

${tbl(strat, 'Strategy')}

## Win rate by career path

${tbl(career, 'Career')}

## Win rate by rent vs. buy (choice at the start)

${tbl(home, 'Housing')}

Rent vs. buy has only two options, so one of them always takes more than 40% of wins; the 40% target applies to strategies and careers.
`;
fs.writeFileSync(path.join(__dirname, 'REPORT.md'), md);
console.log(md.split('## Estimated')[0]);
console.log('strategies:', strat.map(x => x.k + ' ' + pct(x.share)).join(' | '));
console.log('careers:', career.map(x => x.k + ' ' + pct(x.share)).join(' | '), '| homes:', home.map(x => x.k + ' ' + pct(x.share)).join(' '));
console.log('median min', q(mins, 0.5).toFixed(1), 'winNW', q(out.winNW, 0.5), 'gap', q(out.gap, 0.5));
