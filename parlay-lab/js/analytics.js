/*
 * analytics.js — numbers, observations and plain-text summaries built from the student's session history.
 * Pure functions. Observations describe MATHEMATICAL PATTERNS only; they never label a student
 * ("good gambler", "bad gambler", ...) and never recommend bigger stakes or hot streaks.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};

  function sum(a, f) { var s = 0; for (var i = 0; i < a.length; i++) s += f ? f(a[i]) : a[i]; return s; }
  function pct(p) { return PL.Prob.fmtPct(p); }
  function tok(n) { return PL.Prob.fmtTokens(n); }

  /** Aggregate statistics for the session table and the report. */
  function sessionStats(state) {
    var h = state.history || [];
    var n = h.length;
    var risked = sum(h, function (r) { return r.stake; });
    var returned = sum(h, function (r) { return r.returned; });
    var legsTotal = sum(h, function (r) { return r.legs; });
    var won = h.filter(function (r) { return r.result === 'WIN'; }).length;
    var largestPotential = h.reduce(function (m, r) { return Math.max(m, r.potentialReturn); }, 0);
    var largestActual = h.reduce(function (m, r) { return Math.max(m, r.returned); }, 0);
    var largestParlay = h.reduce(function (m, r) { return Math.max(m, r.legs); }, 0);
    var expected = sum(h, function (r) { return r.p * r.potentialReturn - r.stake; });
    return {
      startBalance: state.startTokens,
      endBalance: state.balance,
      totalPredictions: legsTotal,
      totalParlays: n,
      parlaysWon: won,
      parlaysLost: n - won,
      totalRisked: risked,
      totalReturned: returned,
      net: returned - risked,
      avgLegs: n ? legsTotal / n : 0,
      largestPotential: largestPotential,
      largestActual: largestActual,
      largestParlay: largestParlay,
      avgInitialProb: n ? sum(h, function (r) { return r.firstLegP; }) / n : 0,
      avgFinalProb: n ? sum(h, function (r) { return r.p; }) / n : 0,
      expectedNet: expected,
      nearMisses: h.filter(function (r) { return r.nearMiss; }).length,
      gamesPlayed: (state.games || []).length
    };
  }

  /** Educational observations from the student's decisions. */
  function observations(state) {
    var s = sessionStats(state), h = state.history || [], out = [];
    if (!h.length) return ['No predictions were locked in yet. Build a slip, lock it in, and watch the game to generate observations.'];

    if (s.avgLegs >= 3.5) {
      out.push('Your slips averaged ' + s.avgLegs.toFixed(1) + ' legs. Adding legs increased the potential return, but each added leg also had to happen: your average estimated parlay probability fell from ' +
        pct(s.avgInitialProb) + ' (first leg) to ' + pct(s.avgFinalProb) + ' (whole slip).');
    } else if (s.avgLegs > 1.5) {
      out.push('Your slips averaged ' + s.avgLegs.toFixed(1) + ' legs. Even a small number of required events lowers the chance of winning: the average estimate went from ' + pct(s.avgInitialProb) + ' for the first leg to ' + pct(s.avgFinalProb) + ' for the whole slip.');
    } else {
      out.push('Most of your slips were single predictions, so each one only needed one event to happen (average estimated probability ' + pct(s.avgFinalProb) + ').');
    }

    var ev = s.totalRisked ? s.expectedNet / s.totalRisked : 0;
    out.push('Before any luck, the slips you chose had an expected result of ' + (ev >= 0 ? '+' : '') + (ev * 100).toFixed(1) + '% of tokens risked (' + (s.expectedNet >= 0 ? '+' : '') + Math.round(s.expectedNet) + ' tokens). Your actual net was ' + (s.net >= 0 ? '+' : '') + s.net + ' tokens. The gap between those two numbers is the effect of luck over a small number of slips.');

    if (s.largestPotential > 0 && s.largestActual < s.largestPotential) {
      out.push('Your largest potential return was ' + tok(s.largestPotential) + ' tokens, but your largest actual return was ' + tok(s.largestActual) + '. A large potential return describes what happens only if every required event occurs.');
    }
    if (s.nearMisses > 0) {
      out.push(s.nearMisses + ' of your slips were near misses (all but one leg correct). Each leg is still a separate event, and getting close does not make the next slip more likely to win.');
    }
    // stake changes after losses (pattern description only)
    var raised = 0, pairs = 0;
    for (var i = 1; i < h.length; i++) {
      if (h[i - 1].result === 'LOSS') { pairs++; if (h[i].stake > h[i - 1].stake) raised++; }
    }
    if (pairs >= 2 && raised / pairs >= 0.5) {
      out.push('After a losing slip, your next slip used a larger token amount ' + raised + ' of ' + pairs + ' times. Raising the amount to win back losses does not change the probability of the next event; it only raises the amount exposed. This is sometimes called “chasing losses”.');
    }
    if (s.net > 0) {
      out.push('You finished above your starting balance. A negative expected value does not prevent short-term gains; over many repetitions, results move toward expectation (see the Probability Lab).');
    } else if (s.net < 0) {
      out.push('You finished below your starting balance. Short-term results mix expectation with luck; over many repetitions, the built-in house margin makes losses more likely to grow (see the Probability Lab).');
    }
    var peeks = state.answers && state.answers.peeks || 0;
    if (state.mode === 'experience' && peeks > 0) {
      out.push('In Experience First mode you revealed probabilities ' + peeks + ' time' + (peeks === 1 ? '' : 's') + ' before locking in.');
    }
    var al = (state.answers && state.answers.addLeg) || [];
    var added = al.filter(function (a) { return a.added; }).length;
    if (al.length) out.push('“Add one more leg?” appeared ' + al.length + ' time' + (al.length === 1 ? '' : 's') + '; you added the leg ' + added + ' time' + (added === 1 ? '' : 's') + '.');
    return out;
  }

  /** Plain-text result block a student can paste into an LMS (anonymous). */
  function resultsSummaryText(state) {
    var s = sessionStats(state);
    return [
      'PARLAY LAB RESULTS',
      'Class Code: ' + (state.classCode || 'N/A'),
      'Starting Tokens: ' + tok(s.startBalance),
      'Ending Tokens: ' + tok(s.endBalance),
      'Parlays: ' + s.totalParlays,
      'Average Legs: ' + s.avgLegs.toFixed(1),
      'Largest Parlay: ' + s.largestParlay + ' Leg' + (s.largestParlay === 1 ? '' : 's'),
      'Largest Potential Return: ' + tok(s.largestPotential) + ' Tokens',
      'Actual Largest Return: ' + tok(s.largestActual) + ' Tokens',
      'Parlays Won: ' + s.parlaysWon,
      'Parlays Lost: ' + s.parlaysLost
    ].join('\n');
  }

  /** Plain-text session summary (includes the student's last reflection). */
  function sessionSummaryText(state) {
    var s = sessionStats(state);
    var refl = (state.answers && state.answers.reflections) || [];
    var last = refl.length ? refl[refl.length - 1].text : '';
    var lines = [
      'PARLAY LAB SESSION',
      'Class Code: ' + (state.classCode || 'N/A'),
      'Starting Tokens: ' + s.startBalance,
      'Ending Tokens: ' + s.endBalance,
      'Parlays Attempted: ' + s.totalParlays,
      'Average Legs: ' + s.avgLegs.toFixed(1),
      'Parlays Won: ' + s.parlaysWon,
      'Parlays Lost: ' + s.parlaysLost,
      'Largest Potential Return: ' + s.largestPotential,
      'Largest Actual Return: ' + s.largestActual
    ];
    if (last) { lines.push('Reflection:'); lines.push('"' + last + '"'); }
    lines.push('(Lab Tokens have no real-world value. Educational simulation.)');
    return lines.join('\n');
  }

  /** Near-miss details for a resolved slip. */
  function nearMissText(row) {
    return 'YOU PREDICTED ' + row.legs + ' EVENTS. ' + row.hits + ' WERE CORRECT. YOUR PARLAY STILL LOST.';
  }

  PL.Analytics = {
    sessionStats: sessionStats, observations: observations, resultsSummaryText: resultsSummaryText,
    sessionSummaryText: sessionSummaryText, nearMissText: nearMissText
  };
})(typeof window !== 'undefined' ? window : globalThis);
