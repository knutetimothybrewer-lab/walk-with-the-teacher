// Run: node house-edge/tests/engine.test.js
require('../js/config.js'); const HE = require('../js/engine.js');
const E = HE.Engine, C = HE.CONFIG; let fails = 0;
function ok(c, m) { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); }
function near(a, b, t, m) { ok(Math.abs(a - b) <= t, m + ' (' + a + ' vs ' + b + ')'); }
ok(E.validate().length === 0, 'all game probabilities sum to 1');
const s = E.game('slots'); near(s.rtp, 0.895, 1e-9, 'slots RTP 89.5%'); near(s.ev, -0.105, 1e-9, 'slots EV -0.105');
near(E.game('wheel').edge, 2 / 38, 1e-9, 'wheel edge 5.26%'); near(E.game('dice').rtp, 5.5 / 6, 1e-9, 'dice RTP');
near(E.game('coin').ev, 0, 1e-12, 'coin EV 0');
for (const e of C.edgeLab.edges) near(E.edgeGame(e).edge, e, 1e-12, 'edge game ' + e);
const t = E.evTable('slots', 10); near(t.ev, -1.05, 1e-9, 'EV table per 10 tokens');
// Monte Carlo agrees with theory
for (const id of ['slots', 'wheel', 'dice']) {
  const sum = HE.Sim.run(10000, r => E.playN(id, 10, 200, r), { seed: 1 }); const g = E.game(id);
  const exp = g.ev * 2000; const se = g.sd * 10 * Math.sqrt(200) / Math.sqrt(10000);
  near(sum.mean, exp, 4 * se, id + ' sim mean ~ expected ' + exp.toFixed(1));
  near(sum.totalReturned / sum.totalWagered, g.rtp, 0.01, id + ' observed RTP');
}
// empirical frequencies equal configured probabilities
{ const g = E.game('slots'), rng = E.makeRng(7), N = 400000, c = new Array(6).fill(0);
  for (let i = 0; i < N; i++) c[E.pick(g, rng())]++;
  g.outcomes.forEach((o, i) => near(c[i] / N, o.p, 0.004, 'freq ' + o.id)); }
// parlay
const ref = HE.Parlay.reference(6); near(ref.prob, 0.015625, 1e-12, '6-leg 50/50 = 1.5625%'); near(HE.Parlay.reference(3).prob, 0.125, 1e-12, '3-leg');
near(HE.Parlay.reference(3).rtp, 0.955 ** 3, 1e-9, '3-leg rtp'); near(ref.fairMult, 64, 1e-9, 'fair mult 64');
const sv = HE.Parlay.survivors([.5, .5, .5, .5, .5], 10000, E.makeRng(3)); near(sv[5], 312.5, 80, '5-leg survivors ~312'); near(sv[1], 5000, 200, 'leg1 ~5000');
// streaks
near(E.probRunAtLeast(2, 2), 0.5, 1e-12, 'run>=2 in 2 flips'); near(E.probRunAtLeast(3, 3), 0.25, 1e-12, 'run>=3 in 3 flips');
console.log('P(run>=5 in 100)=', E.probRunAtLeast(100, 5).toFixed(3), ' E[longest]=', E.expectedLongestRun(100).toFixed(2));
// percentile
const sm = HE.Sim.summarize(Float64Array.from([1, 2, 3, 4, 5]), 0, 0, 0); const pos = HE.Sim.position(sm, 4);
near(pos.below, 0.6, 1e-9, 'below'); near(pos.above, 0.2, 1e-9, 'above'); near(pos.percentile, 70, 1e-9, 'percentile');
// parse
near(E.parseNumber('1/6', 'prob'), 1 / 6, 1e-12, 'parse fraction'); near(E.parseNumber('16.7%', 'prob'), .167, 1e-12, 'parse %'); near(E.parseNumber('16.7', 'prob'), .167, 1e-12, 'parse plain pct');
near(E.parseNumber('-1.5', 'num'), -1.5, 0, 'parse neg');
// strategy
const st = E.runStrategy({ game: 'rotate', wager: 100, afterLoss: 'double', stopWin: 0, stopLoss: 0 }, E.makeRng(5), true);
ok(st.bets === st.log.length && Math.abs(st.net - (st.returned - st.wagered)) < 1e-9, 'strategy tally consistent');
// timing
let t0 = Date.now(); HE.Sim.run(10000, r => E.playN('slots', 10, 1000, r)); console.log('10k players x 1000 bets ms:', Date.now() - t0);
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
