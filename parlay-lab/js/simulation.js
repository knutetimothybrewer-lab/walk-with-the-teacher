/*
 * simulation.js — the "Probability Lab" engines: Monte Carlo parlays, luck-vs-skill, class experiment.
 *
 * These labs use simple repeated yes/no events (each leg wins with probability p) so students can
 * see the long-run pattern clearly. They use their own seeded random streams; they never touch the
 * basketball game. Each run shows a Run ID so a teacher can reproduce it.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};

  /** Offered payout multiple (return per 1 token staked) for n legs of probability p with margin m. */
  function offeredMultiple(p, n, margin) { return Math.pow((1 - margin) / p, n); }
  function fairMultiple(p, n) { return Math.pow(1 / p, n); }

  /** Table for the Parlay Probability Visualizer: one row per number of legs. */
  function ladder(p, maxLegs, margin) {
    var rows = [];
    for (var n = 1; n <= maxLegs; n++) {
      var prob = Math.pow(p, n), off = offeredMultiple(p, n, margin);
      rows.push({ n: n, prob: prob, fair: fairMultiple(p, n), offered: off, ev: prob * off - 1 });
    }
    return rows;
  }

  function runId() { return PL.generateClassCode(6); }

  /**
   * Run `trials` parlays of `legs` legs (each leg wins with probability p).
   * Also builds: convergence line, histogram of "balance after 50 parlays" for 200 simulated students,
   * and a "what it felt like" snapshot of the first 10 parlays.
   */
  function monteCarloParlay(o) {
    var legs = o.legs, p = o.p, margin = o.margin, stake = o.stake || 10, trials = o.trials || 10000;
    var id = o.runId || runId();
    var rng = PL.createSeededRandom('MC|' + id + '|' + legs + '|' + p);
    var payout = Math.floor(stake * offeredMultiple(p, legs, margin));
    var wins = 0, totalReturn = 0, curLose = 0, curWin = 0, maxLose = 0, maxWin = 0;
    var convergence = [], first = [], nextCheck = 1, balance10 = 1000, firstWin = null;
    var perStudent = 50, students = Math.floor(trials / perStudent), ends = [], bal = 1000;
    for (var t = 1; t <= trials; t++) {
      var win = true;
      for (var k = 0; k < legs; k++) { if (rng.next() >= p) { win = false; break; } }
      if (win) { wins++; totalReturn += payout; curWin++; curLose = 0; if (curWin > maxWin) maxWin = curWin; if (firstWin === null) firstWin = t; }
      else { curLose++; curWin = 0; if (curLose > maxLose) maxLose = curLose; }
      if (t <= 10) { first.push(win); balance10 += (win ? payout : 0) - stake; }
      if (t >= nextCheck) {
        convergence.push({ t: t, avgNet: (totalReturn - stake * t) / t / stake, winPct: wins / t });
        nextCheck = Math.ceil(nextCheck * 1.12) + (nextCheck < 10 ? 1 : 0);
      }
      bal += (win ? payout : 0) - stake;
      if (t % perStudent === 0) { ends.push(bal); bal = 1000; }
    }
    if (!convergence.length || convergence[convergence.length - 1].t !== trials) convergence.push({ t: trials, avgNet: (totalReturn - stake * trials) / trials / stake, winPct: wins / trials });
    var theoryP = Math.pow(p, legs);
    return {
      runId: id, legs: legs, p: p, margin: margin, stake: stake, trials: trials, payout: payout,
      wins: wins, losses: trials - wins, winPct: wins / trials, theoryP: theoryP,
      avgReturn: totalReturn / trials, avgNet: totalReturn / trials - stake,
      evSim: (totalReturn - stake * trials) / (stake * trials),
      evTheory: theoryP * (stake * offeredMultiple(p, legs, margin)) / stake - 1,
      maxLoseStreak: maxLose, maxWinStreak: maxWin, firstWin: firstWin,
      convergence: convergence, first10: first, balanceAfter10: balance10,
      studentEnds: ends, studentsAboveStart: ends.filter(function (b) { return b > 1000; }).length,
      studentCount: students, perStudent: perStudent, totalNet: totalReturn - stake * trials
    };
  }

  /** Same strategy for every participant — only luck differs. */
  function luckVsSkill(o) {
    var names = ['Student A', 'Student B', 'Student C', 'Student D', 'Student E'];
    var legs = o.legs, p = o.p, margin = o.margin, stake = o.stake, start = o.start || 1000, rounds = o.rounds || 1000;
    var id = o.runId || runId();
    var payout = Math.floor(stake * offeredMultiple(p, legs, margin));
    var series = names.map(function (nm, idx) {
      var rng = PL.createSeededRandom('LVS|' + id + '|' + idx);
      var bal = start, arr = [bal];
      for (var r = 1; r <= rounds; r++) {
        if (bal >= stake) {
          var win = true;
          for (var k = 0; k < legs; k++) { if (rng.next() >= p) { win = false; break; } }
          bal += (win ? payout : 0) - stake;
        }
        arr.push(bal);
      }
      return arr;
    });
    return { runId: id, names: names, series: series, legs: legs, p: p, stake: stake, payout: payout, start: start, rounds: rounds,
      evPerRound: Math.pow(p, legs) * offeredMultiple(p, legs, margin) * stake - stake };
  }

  /** N simulated students, each making M parlays of every size 1..10. */
  function classExperiment(o) {
    var students = o.students, preds = o.predictions, p = o.p, margin = o.margin, stake = o.stake || 10, start = o.start || 1000;
    var maxSize = o.maxSize || 10, id = o.runId || runId();
    var out = [];
    for (var n = 1; n <= maxSize; n++) {
      var payout = Math.floor(stake * offeredMultiple(p, n, margin));
      var rng = PL.createSeededRandom('CLASS|' + id + '|' + n);
      var balances = [], bust = 0, above = 0, sum = 0, best = -Infinity, worst = Infinity;
      for (var s = 0; s < students; s++) {
        var bal = start;
        for (var r = 0; r < preds; r++) {
          if (bal < stake) break;
          var win = true;
          for (var k = 0; k < n; k++) { if (rng.next() >= p) { win = false; break; } }
          bal += (win ? payout : 0) - stake;
        }
        balances.push(bal);
        sum += bal; if (bal < stake) bust++; if (bal > start) above++;
        if (bal > best) best = bal; if (bal < worst) worst = bal;
      }
      var sorted = balances.slice().sort(function (a, b) { return a - b; });
      out.push({ size: n, avg: sum / students, median: sorted[Math.floor(students / 2)], min: worst, max: best,
        pctAbove: above / students, pctBust: bust / students, balances: balances, payout: payout,
        theoryEvPerSlip: Math.pow(p, n) * offeredMultiple(p, n, margin) * stake - stake });
    }
    return { runId: id, students: students, predictions: preds, p: p, margin: margin, stake: stake, start: start, sizes: out };
  }

  PL.Sim = { offeredMultiple: offeredMultiple, fairMultiple: fairMultiple, ladder: ladder, monteCarloParlay: monteCarloParlay, luckVsSkill: luckVsSkill, classExperiment: classExperiment };
})(typeof window !== 'undefined' ? window : globalThis);

/* ---- Gambler's-fallacy demo: does a streak change the next flip? ---- */
(function (root) {
  'use strict';
  var PL = root.PL;
  /**
   * Flip a fair coin `flips` times. Look at every place where `streak` heads in a row just happened
   * and count how often the NEXT flip is also heads. (It stays near 50%: no "due" flip.)
   */
  PL.Sim.streakTest = function (streak, flips, runId) {
    var rng = PL.createSeededRandom('STREAK|' + (runId || 'x') + '|' + streak);
    var run = 0, cases = 0, nextHeads = 0;
    for (var i = 0; i < flips; i++) {
      var h = rng.next() < 0.5;
      if (run >= streak) { cases++; if (h) nextHeads++; }
      run = h ? run + 1 : 0;
    }
    return { streak: streak, flips: flips, cases: cases, nextHeads: nextHeads, pct: cases ? nextHeads / cases : 0 };
  };
})(typeof window !== 'undefined' ? window : globalThis);
