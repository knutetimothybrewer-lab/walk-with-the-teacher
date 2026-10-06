/*
 * selftest.js — automated checks for the reproducibility and math rules.
 * Run in a browser:  Teacher Mode → "Run self-test"   (or open the page with  #selftest )
 * Run in Node:       node tests/run-tests.js
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};

  function fingerprint(game) {
    // everything that defines a game, as one string
    var r = game.result;
    return JSON.stringify([game.matchup.home.id, game.matchup.away.id, r.score, r.qScores, r.ot, r.box, r.stats, game.events.length,
      game.events.map(function (e) { return [e.type, e.q, e.clock, e.team, e.player, e.pts, e.score]; })]);
  }
  function hash(str) { return PL.hashString(str).join('-'); }

  function run(opts) {
    opts = opts || {};
    var N = opts.samples || 150;
    var results = [], cfg = PL.Classroom.sanitizeConfig({ modelSamples: N });
    function test(name, fn) {
      try { var r = fn(); results.push({ name: name, ok: r === undefined || r === true, detail: r === undefined || r === true ? '' : String(r) }); }
      catch (e) { results.push({ name: name, ok: false, detail: 'threw: ' + (e && e.message) }); }
    }
    function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'values differ') + ' (' + a + ' vs ' + b + ')'); }
    function near(a, b, tol, msg) { if (Math.abs(a - b) > tol) throw new Error((msg || 'not close') + ' (' + a + ' vs ' + b + ')'); }
    function gen(seed, record) { return PL.Classroom.prepareGameSync(seed, 1, cfg); }

    // ---------- seeded randomness ----------
    test('RNG: same seed gives identical stream', function () {
      var a = PL.createSeededRandom('HEALTH101'), b = PL.createSeededRandom('HEALTH101');
      for (var i = 0; i < 1000; i++) eq(a.next(), b.next(), 'stream diverged at ' + i);
    });
    test('RNG: different seeds differ', function () {
      var a = PL.createSeededRandom('HEALTH101').next(), b = PL.createSeededRandom('HEALTH102').next();
      if (a === b) throw new Error('same first value');
    });
    var base = null, baseFp = '';
    test('Game: HEALTH101 reproduces identically (5 times)', function () {
      var first = null;
      for (var i = 0; i < 5; i++) {
        var p = gen('HEALTH101'); var fp = fingerprint(p.game);
        if (first === null) { first = fp; base = p; baseFp = fp; } else eq(fp, first, 'run ' + i + ' differs');
      }
    });
    test('Game: never calls Math.random', function () {
      var orig = Math.random; Math.random = function () { throw new Error('Math.random called!'); };
      try { PL.Classroom.prepareGameSync('NORANDOM', 1, PL.Classroom.sanitizeConfig({ modelSamples: 200 })); } finally { Math.random = orig; }
    });
    test('Game: same seed → same matchup, probabilities and pregame stats', function () {
      var a = gen('PERIOD3'), b = gen('PERIOD3');
      eq(JSON.stringify(a.market.props.map(function (p) { return [p.id, p.p]; })), JSON.stringify(b.market.props.map(function (p) { return [p.id, p.p]; })), 'market differs');
      eq(JSON.stringify(a.pregame), JSON.stringify(b.pregame), 'pregame differs');
    });
    test('Game: different class codes give different games', function () {
      var a = fingerprint(gen('PERIOD3').game), b = fingerprint(gen('PERIOD4').game);
      if (a === b) throw new Error('identical games');
    });
    test('Student actions cannot change the game', function () {
      var p = gen('HEALTH101'), before = fingerprint(p.game);
      var st = PL.Classroom.createSession({ classCode: 'HEALTH101', config: cfg });
      var ids = p.market.props.filter(function (x) { return x.main; }).slice(0, 5).map(function (x) { return x.id; });
      st.draft.legs = ids; st.draft.stake = 50; PL.Classroom.lockSlip(st, p.market);
      PL.Classroom.settleGame(st, p);
      eq(fingerprint(p.game), before, 'game changed after student actions');
      eq(fingerprint(gen('HEALTH101').game), before, 'regenerated game differs');
    });

    // ---------- engine consistency ----------
    test('Live replay of events equals engine final numbers', function () {
      var g = base.game, live = PL.Basketball.liveAt(g, g.events.length);
      var vec = PL.Basketball.statVector(live, g.players);
      eq(JSON.stringify(vec), JSON.stringify(g.result.stats), 'stat vector differs');
      eq(live.score[0], g.result.score[0]); eq(live.score[1], g.result.score[1]);
    });
    test('Quarter scores add up to final score; scores never decrease', function () {
      var g = base.game, h = 0, a = 0, ph = 0, pa = 0;
      g.result.qScores.forEach(function (q) { h += q[0]; a += q[1]; });
      eq(h, g.result.score[0]); eq(a, g.result.score[1]);
      g.events.forEach(function (e) { if (e.score[0] < ph || e.score[1] < pa) throw new Error('score decreased'); ph = e.score[0]; pa = e.score[1]; });
    });
    test('Player points sum to team score', function () {
      var g = base.game, s = [0, 0];
      g.players.forEach(function (p, i) { s[p.teamIdx] += g.result.box[i].pts; });
      eq(s[0], g.result.score[0]); eq(s[1], g.result.score[1]);
    });
    test('Plausible basketball ranges across 40 seeds', function () {
      var minT = 1e9, maxT = 0, maxP = 0, otCount = 0;
      for (var i = 0; i < 40; i++) {
        var m = PL.League.createMatchup('RANGE' + i);
        var r = PL.Basketball.simulateGame(m, PL.createSeededRandom('RANGE' + i + '|game'), { record: false });
        var t = r.score[0] + r.score[1]; minT = Math.min(minT, t); maxT = Math.max(maxT, t);
        r.box.forEach(function (b) { maxP = Math.max(maxP, b.pts); });
        if (r.ot) otCount++;
      }
      if (minT < 140 || maxT > 290) throw new Error('total range ' + minT + '–' + maxT);
      if (maxP > 75) throw new Error('player scored ' + maxP);
    });
    test('Overtime game: resolves, quarter list has 5 periods, replay matches', function () {
      var found = null;
      for (var i = 0; i < 400 && !found; i++) {
        var m = PL.League.createMatchup('OT' + i);
        var r = PL.Basketball.simulateGame(m, PL.createSeededRandom('OT' + i + '|game'), { record: true });
        if (r.ot) found = { m: m, r: r };
      }
      if (!found) throw new Error('no OT game in 400 seeds');
      var g = { matchup: found.m, players: found.m.players, events: found.r.events, quarterSeconds: 720, result: found.r };
      eq(found.r.qScores.length >= 5, true, 'qScores');
      eq(found.r.score[0] === found.r.score[1], false, 'still tied');
      eq(JSON.stringify(PL.Basketball.statVector(PL.Basketball.liveAt(g, g.events.length), g.players)), JSON.stringify(found.r.stats));
      eq(found.r.stats.ot, 1);
    });

    // ---------- probability & parlay math ----------
    test('Probability: 55% legs → 30.25%, 16.64%, 9.15%, 5.03%', function () {
      near(PL.Prob.independentParlay(0.55, 2), 0.3025, 1e-9); near(PL.Prob.independentParlay(0.55, 3), 0.166375, 1e-9);
      near(PL.Prob.independentParlay(0.55, 4), 0.09150625, 1e-9); near(PL.Prob.independentParlay(0.55, 5), 0.0503284, 1e-6);
    });
    test('Probability: normInv inverts normCdf', function () {
      [0.01, 0.2, 0.5, 0.77, 0.99].forEach(function (p) { near(PL.Prob.normCdf(PL.Prob.normInv(p)), p, 1e-4); });
    });
    test('Pricing: fair vs offered return and house margin compounding', function () {
      var pr = PL.Prob.pricing(10, 0.25, 2, 0.05);
      near(pr.fairReturn, 40, 1e-9); near(pr.offeredReturn, 40 * 0.9025, 1e-9); eq(pr.offeredReturnR, 36);
      near(pr.expectedValue, 0.25 * 36.1 - 10, 1e-9);
      var hi = PL.Prob.pricing(10, 0.25, 2, 0.10), lo = PL.Prob.pricing(10, 0.25, 2, 0);
      eq(hi.offeredReturn < pr.offeredReturn && pr.offeredReturn < lo.offeredReturn, true, 'margin ordering');
      near(lo.expectedValue, 0, 1e-9, 'zero margin should be fair');
    });
    test('Joint probability: independent legs ≈ product; identical legs ≈ single', function () {
      var rng = PL.createSeededRandom('JT'), a = new Uint8Array(2000), b = new Uint8Array(2000), c = new Uint8Array(2000);
      for (var i = 0; i < 2000; i++) { a[i] = rng.chance(0.5) ? 1 : 0; b[i] = rng.chance(0.5) ? 1 : 0; c[i] = a[i]; }
      var ind = PL.Prob.jointProbability([{ p: 0.5, ind: a }, { p: 0.5, ind: b }]);
      near(ind.p, 0.25, 0.03, 'independent');
      var same = PL.Prob.jointProbability([{ p: 0.5, ind: a }, { p: 0.5, ind: c }]);
      if (same.p < 0.42) throw new Error('identical legs joint too small: ' + same.p);
    });
    var mk = base.market, cfgP = { houseMargin: 0.05, maxLegs: 8, maxStake: 100 };
    test('Parlay: probability falls and potential return rises with every added leg', function () {
      var legs = mk.props.filter(function (p) { return p.main && p.side !== 'under' && p.cat !== 'spread' && PL.Props.isOffered(p, 0.05); }).slice(0, 8).map(function (p) { return p.id; });
      var lastP = 2, lastR = 0;
      for (var n = 1; n <= legs.length; n++) {
        var e = PL.Parlay.evaluateSlip(legs.slice(0, n), 10, mk, cfgP);
        if (!(e.p < lastP)) throw new Error('probability did not fall at ' + n);
        if (!(e.potentialReturn >= lastR)) throw new Error('return did not rise at ' + n);
        lastP = e.p; lastR = e.potentialReturn;
      }
    });
    test('House margin: offered ≤ fair, difference grows with legs', function () {
      var legs = mk.props.filter(function (p) { return p.main && p.cat === 'player' && p.side === 'over'; }).slice(0, 4).map(function (p) { return p.id; });
      var d1 = PL.Parlay.evaluateSlip(legs.slice(0, 1), 100, mk, cfgP), d4 = PL.Parlay.evaluateSlip(legs, 100, mk, cfgP);
      eq(d1.offeredReturn < d1.fairReturn, true); eq(d4.evPct < d1.evPct, true, 'EV should worsen with legs');
      var z = PL.Parlay.evaluateSlip(legs, 100, mk, { houseMargin: 0, maxLegs: 8, maxStake: 100 });
      near(z.evPct, 0, 1e-6, 'zero margin EV');
    });
    test('Correlation: home win & home star points are positively related', function () {
      var star = mk.props.filter(function (p) { return p.cat === 'player' && p.statType === 'pts' && p.main && p.side === 'over' && p.gid < 8; }).sort(function (a, b) { return b.line - a.line; })[0];
      var e = PL.Parlay.evaluateSlip(['ML:H', star.id], 10, mk, cfgP);
      if (!(e.p > e.pInd)) throw new Error('joint ' + e.p + ' not above independent ' + e.pInd);
    });
    test('Contradictions, duplicates and max legs are detected', function () {
      var o = mk.props.find(function (p) { return p.cat === 'total' && p.side === 'over' && p.main; });
      var u = mk.props.find(function (p) { return p.cat === 'total' && p.side === 'under' && p.main; });
      eq(PL.Parlay.checkAdd([o.id], u.id, mk, cfgP).kind, 'conflict');
      eq(PL.Parlay.checkAdd([o.id], o.id, mk, cfgP).kind, 'duplicate');
      eq(PL.Parlay.checkAdd(['ML:H'], 'ML:A', mk, cfgP).kind, 'conflict');
      eq(PL.Parlay.checkAdd(['ML:H'], 'ML:H', mk, cfgP).kind, 'duplicate');
      var ids = []; mk.props.forEach(function (p) { if (ids.length < 3 && p.cat === 'player' && p.main && p.side === 'over' && PL.Props.isOffered(p, 0.05)) ids.push(p.id); });
      eq(PL.Parlay.checkAdd(ids, 'ML:H', mk, { houseMargin: 0.05, maxLegs: 3, maxStake: 100 }).kind, 'max');
    });
    test('Stake checks: 0, too large, over limit, valid', function () {
      eq(PL.Parlay.checkStake(0, 500, cfgP).ok, false); eq(PL.Parlay.checkStake(-5, 500, cfgP).ok, false);
      eq(PL.Parlay.checkStake(600, 500, { maxStake: 1000 }).ok, false); eq(PL.Parlay.checkStake(150, 500, cfgP).ok, false);
      eq(PL.Parlay.checkStake(25, 500, cfgP).value, 25); eq(PL.Parlay.checkStake('abc', 500, cfgP).ok, false);
    });

    // ---------- resolution & tokens ----------
    test('Resolution: all legs win / first leg loses / final leg loses', function () {
      var stats = base.game.result.stats, trues = [], falses = [];
      mk.props.forEach(function (p) { if (!PL.Props.isOffered(p, 0.05)) return; (PL.Props.resolveFinal(p, stats) ? trues : falses).push(p); });
      function pickCompatible(start, pool) {
        var ids = start.slice();
        pool.forEach(function (p) { if (ids.length < 4 && PL.Parlay.checkAdd(ids, p.id, mk, cfgP).ok) ids.push(p.id); });
        return ids;
      }
      var allWin = pickCompatible([], trues);
      var w = PL.Parlay.resolveSlip({ legs: allWin, potentialReturn: 100 }, stats, mk);
      eq(w.win, true); eq(w.returned, 100);
      var f0 = falses.find(function (p) { return p.cat === 'player' || p.cat === 'total'; });
      var firstLoses = pickCompatible([f0.id], trues);
      var r1 = PL.Parlay.resolveSlip({ legs: firstLoses, potentialReturn: 100 }, stats, mk);
      eq(r1.win, false); eq(r1.hits, firstLoses.length - 1); eq(r1.returned, 0);
      var lastLoses = pickCompatible([], trues).slice(0, 3).concat([f0.id]);
      if (PL.Parlay.checkAdd(lastLoses.slice(0, 3), f0.id, mk, cfgP).ok || true) {
        var r2 = PL.Parlay.resolveSlip({ legs: lastLoses, potentialReturn: 100 }, stats, mk);
        eq(r2.win, false); eq(r2.nearMiss, true);
      }
    });
    test('Tokens: lock deducts, win/loss settles, history balances', function () {
      var p = gen('TOKENS1'), st = PL.Classroom.createSession({ classCode: 'TOKENS1', config: cfg });
      var stats = p.game.result.stats;
      var winProp = p.market.props.find(function (x) { return PL.Props.isOffered(x, 0.05) && PL.Props.resolveFinal(x, stats); });
      var loseProp = p.market.props.find(function (x) { return PL.Props.isOffered(x, 0.05) && !PL.Props.resolveFinal(x, stats); });
      st.draft.legs = [winProp.id]; st.draft.stake = 40; var s1 = PL.Classroom.lockSlip(st, p.market);
      eq(st.balance, st.startTokens - 40);
      st.draft.legs = [loseProp.id]; st.draft.stake = 10; PL.Classroom.lockSlip(st, p.market);
      eq(st.balance, st.startTokens - 50);
      PL.Classroom.settleGame(st, p);
      eq(st.history[0].result, 'WIN'); eq(st.history[1].result, 'LOSS');
      eq(st.balance, st.startTokens - 50 + s1.potentialReturn);
      eq(st.history[1].endBalance, st.balance, 'running balance');
      eq(PL.Classroom.settleGame(st, p), null, 'settle twice');
      eq(st.balance, st.startTokens - 50 + s1.potentialReturn, 'double credit');
      try { PL.Classroom.lockSlip(st, p.market); throw new Error('should have failed'); } catch (e) { if (e.message === 'should have failed') throw e; }
    });
    test('Live tracker agrees with final resolution for every prediction', function () {
      var g = base.game, live = PL.Basketball.liveAt(g, g.events.length), vec = PL.Basketball.statVector(live, g.players);
      mk.props.forEach(function (p) {
        var s = PL.Props.legStatus(p, vec, live), f = PL.Props.resolveFinal(p, g.result.stats);
        if (s !== (f ? 'hit' : 'missed')) throw new Error(p.id + ' tracker ' + s + ' vs final ' + f);
      });
    });
    test('Early resolution never contradicts the final result', function () {
      var g = base.game, step = Math.max(1, Math.floor(g.events.length / 40));
      for (var i = 1; i < g.events.length; i += step) {
        var live = PL.Basketball.liveAt(g, i), vec = PL.Basketball.statVector(live, g.players);
        mk.props.forEach(function (p) {
          var s = PL.Props.legStatus(p, vec, live);
          if (s === 'hit' && !PL.Props.resolveFinal(p, g.result.stats)) throw new Error(p.id + ' hit early but missed at the end');
          if (s === 'missed' && PL.Props.resolveFinal(p, g.result.stats)) throw new Error(p.id + ' missed early but hit at the end');
        });
      }
    });

    // ---------- labs ----------
    test('Monte Carlo: win rate near theory, deterministic by run id', function () {
      var a = PL.Sim.monteCarloParlay({ legs: 3, p: 0.55, margin: 0.05, trials: 10000, runId: 'T1' });
      var b = PL.Sim.monteCarloParlay({ legs: 3, p: 0.55, margin: 0.05, trials: 10000, runId: 'T1' });
      eq(a.wins, b.wins, 'not deterministic'); near(a.winPct, 0.166375, 0.012); near(a.evSim, a.evTheory, 0.15, 'EV sim vs theory');
      eq(a.trials, 10000);
    });
    test('Class experiment: larger parlays end lower on average', function () {
      var e = PL.Sim.classExperiment({ students: 100, predictions: 100, p: 0.5, margin: 0.05, stake: 10, runId: 'CL1' });
      eq(e.sizes.length, 10); if (!(e.sizes[0].avg > e.sizes[9].avg)) throw new Error('1-leg should end above 10-leg');
    });
    test('Luck vs skill: identical strategy, different outcomes, reproducible', function () {
      var a = PL.Sim.luckVsSkill({ legs: 3, p: 0.5, margin: 0.05, stake: 5, runId: 'LV1' }), b = PL.Sim.luckVsSkill({ legs: 3, p: 0.5, margin: 0.05, stake: 5, runId: 'LV1' });
      eq(JSON.stringify(a.series), JSON.stringify(b.series)); eq(a.series.length, 5);
      var at20 = a.series.map(function (s) { return s[20]; }); if (Math.max.apply(null, at20) === Math.min.apply(null, at20)) throw new Error('no variation at round 20');
    });

    // ---------- seeds, links, storage ----------
    test('Seed handling: empty, invalid, long, lowercase', function () {
      eq(PL.normalizeSeed('').ok, false); eq(PL.normalizeSeed('   ').ok, false); eq(PL.normalizeSeed('bad<code>').ok, false);
      eq(PL.normalizeSeed(' health101 ').seed, 'HEALTH101');
      var long = PL.normalizeSeed(new Array(300).join('A')); eq(long.ok, true); eq(long.seed.length, PL.MAX_SEED_LENGTH); eq(long.truncated, true);
      var p = PL.Classroom.prepareGameSync(long.seed, 1, PL.Classroom.sanitizeConfig({ modelSamples: 200 })); eq(p.game.events.length > 100, true);
    });
    test('Class link round-trips teacher settings', function () {
      var c = PL.Classroom.sanitizeConfig({ startTokens: 500, maxLegs: 6, houseMargin: 0.08, quarterMinutes: 6, difficulty: 'advanced' });
      var link = PL.Classroom.buildStudentLink('https://x.github.io/parlay-lab/', 'H7K4P2', c, 'stats');
      var back = PL.Classroom.parseLink(link.slice(link.indexOf('#')));
      eq(back.code, 'H7K4P2'); eq(back.config.startTokens, 500); eq(back.config.maxLegs, 6); near(back.config.houseMargin, 0.08, 1e-9);
      eq(back.config.quarterMinutes, 6); eq(back.config.difficulty, 'advanced'); eq(back.mode, 'stats');
    });
    test('Config sanitizing clamps bad values', function () {
      var c = PL.Classroom.sanitizeConfig({ startTokens: -5, maxLegs: 99, houseMargin: 5, maxStake: 99999, speed: 7 });
      eq(c.startTokens, 100); eq(c.maxLegs, 12); eq(c.houseMargin, 0.25); eq(c.maxStake <= c.startTokens, true); eq(c.speed, 1);
    });
    test('Storage: round-trips session JSON (memory fallback ok)', function () {
      PL.Storage.set('selftest', { a: 1, b: [1, 2, 3] });
      eq(JSON.stringify(PL.Storage.get('selftest')), JSON.stringify({ a: 1, b: [1, 2, 3] })); PL.Storage.remove('selftest');
    });
    test('Session state survives JSON save/restore', function () {
      var p = gen('RESTORE1'), st = PL.Classroom.createSession({ classCode: 'RESTORE1', config: cfg });
      st.draft.legs = ['ML:H']; PL.Classroom.lockSlip(st, p.market);
      var back = JSON.parse(JSON.stringify(st)); PL.Classroom.settleGame(back, p);
      eq(back.history.length, 1);
    });

    var failed = results.filter(function (r) { return !r.ok; });
    return { total: results.length, passed: results.length - failed.length, failed: failed.length, results: results, fingerprint: hash(baseFp) };
  }

  PL.SelfTest = { run: run };
})(typeof window !== 'undefined' ? window : globalThis);
