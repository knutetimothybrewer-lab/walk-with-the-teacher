/*
 * props.js — the prediction "market": every prediction students can pick.
 *
 * Every prediction is stored the same way: "this number (stat) must land strictly between lo and hi".
 *     Harbor City Wins            ->  margin  in (0, ∞)
 *     Over 205.5 total points     ->  total   in (205.5, ∞)
 *     Ellis Under 21.5 points     ->  pts:ID  in (-∞, 21.5)
 * One simple shape makes it easy to
 *   - resolve predictions at the end of the game (is the value inside the interval?),
 *   - track them live,
 *   - detect conflicts (two intervals on the same stat with nothing in common),
 *   - merge overlapping predictions on the same stat, and
 *   - estimate probabilities from the simulated replays.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};
  var INF = Infinity;

  var STAT_LABEL = { pts: 'Points', reb: 'Rebounds', ast: 'Assists', tpm: 'Three-Pointers' };
  var STAT_SHORT = { pts: 'PTS', reb: 'REB', ast: 'AST', tpm: '3PM' };

  /** How each number behaves while a game is in progress. */
  function statMeta(stat) {
    if (stat === 'margin') return { monotone: false, settle: 'final' };
    if (stat === 'ot') return { monotone: true, settle: 'regulation' };
    if (stat === 'homeFirst') return { monotone: false, settle: 'first' };
    if (stat === 'q1min') return { monotone: true, settle: 'q1' };
    return { monotone: true, settle: 'final' }; // totals, leads, player counting stats only go up
  }

  function floorHalf(x) { return Math.floor(x) + 0.5; }
  function fmtLine(x) { return (Math.round(x * 2) / 2).toFixed(1); }
  function signed(x) { return (x > 0 ? '+' : (x < 0 ? '-' : '')) + Math.abs(x).toFixed(1); }

  function makeProp(o) {
    o.lo = o.lo === undefined ? -INF : o.lo;
    o.hi = o.hi === undefined ? INF : o.hi;
    return o;
  }

  /** Build every prediction for this matchup and price it from the model. */
  function buildMarket(matchup, model) {
    var H = matchup.home, A = matchup.away, props = [], i;
    var hn = H.city, an = A.city;

    // ---- game winner ----
    props.push(makeProp({ id: 'ML:H', cat: 'winner', group: 'Game Winner', label: H.name + ' Wins', short: H.name + ' Wins', stat: 'margin', lo: 0, side: 'home', comp: 'ML:A' }));
    props.push(makeProp({ id: 'ML:A', cat: 'winner', group: 'Game Winner', label: A.name + ' Wins', short: A.name + ' Wins', stat: 'margin', hi: 0, side: 'away', comp: 'ML:H' }));

    // ---- point spread (home handicap h: home covers when margin + h > 0) ----
    var mu = model.mean('margin'), h0 = -floorHalf(mu);
    [-4, 0, 4].forEach(function (off) {
      var h = h0 + off;
      var key = h.toFixed(1);
      props.push(makeProp({ id: 'SP:H:' + key, cat: 'spread', group: 'Spread ' + signed(h), label: hn + ' ' + signed(h), short: hn + ' ' + signed(h), stat: 'margin', lo: -h, line: h, side: 'home', main: off === 0, comp: 'SP:A:' + (-h).toFixed(1), order: off }));
      props.push(makeProp({ id: 'SP:A:' + (-h).toFixed(1), cat: 'spread', group: 'Spread ' + signed(h), label: an + ' ' + signed(-h), short: an + ' ' + signed(-h), stat: 'margin', hi: -h, line: -h, side: 'away', main: off === 0, comp: 'SP:H:' + key, order: off }));
    });

    // ---- total points ----
    var tmu = model.mean('total'), t0 = floorHalf(tmu);
    [-8, 0, 8].forEach(function (off) {
      var T = t0 + off, k = T.toFixed(1);
      props.push(makeProp({ id: 'TOT:O:' + k, cat: 'total', group: 'Total ' + k, label: 'Over ' + k + ' Total Points', short: 'Over ' + k, stat: 'total', lo: T, line: T, side: 'over', main: off === 0, comp: 'TOT:U:' + k, order: off }));
      props.push(makeProp({ id: 'TOT:U:' + k, cat: 'total', group: 'Total ' + k, label: 'Under ' + k + ' Total Points', short: 'Under ' + k, stat: 'total', hi: T, line: T, side: 'under', main: off === 0, comp: 'TOT:O:' + k, order: off }));
    });

    // ---- player props ----
    var thresholds = { pts: 4, reb: 2, ast: 1.5, tpm: 0.8 };
    var steps = { pts: 4, reb: 2, ast: 2, tpm: 1 };
    var players = matchup.players;
    for (var g = 0; g < players.length; g++) {
      var p = players[g];
      if (model.sumMin[g] / model.N < 12) continue;
      ['pts', 'reb', 'ast', 'tpm'].forEach(function (st) {
        var key = st + ':' + p.id, m = model.mean(key);
        if (m < thresholds[st]) return;
        var base = floorHalf(m), step = steps[st];
        if (st === 'pts') step = Math.max(3, Math.round(model.sd(key) * 0.8));
        [-step, 0, step].forEach(function (off) {
          var L = base + off;
          if (L < 0.5) return;
          var k = L.toFixed(1), nm = p.name;
          props.push(makeProp({ id: 'PL:' + p.id + ':' + st + ':O:' + k, cat: 'player', group: nm, label: nm + ' Over ' + k + ' ' + STAT_LABEL[st], short: nm.split(' ')[1] + ' Over ' + k + ' ' + STAT_SHORT[st], stat: key, lo: L, line: L, side: 'over', main: off === 0, statType: st, playerId: p.id, gid: g, comp: 'PL:' + p.id + ':' + st + ':U:' + k, order: off }));
          props.push(makeProp({ id: 'PL:' + p.id + ':' + st + ':U:' + k, cat: 'player', group: nm, label: nm + ' Under ' + k + ' ' + STAT_LABEL[st], short: nm.split(' ')[1] + ' Under ' + k + ' ' + STAT_SHORT[st], stat: key, hi: L, line: L, side: 'under', main: off === 0, statType: st, playerId: p.id, gid: g, comp: 'PL:' + p.id + ':' + st + ':O:' + k, order: off }));
        });
      });
    }

    // ---- game events ----
    function yn(id, label, stat, lo, hi, extra) {
      var yes = makeProp({ id: 'EV:' + id + ':Y', cat: 'events', group: label, label: label + ' — Yes', short: label + ' (Yes)', stat: stat, lo: lo, hi: hi, side: 'yes', comp: 'EV:' + id + ':N' });
      var no = makeProp({ id: 'EV:' + id + ':N', cat: 'events', group: label, label: label + ' — No', short: label + ' (No)', stat: stat, lo: hi === INF ? -INF : hi, hi: hi === INF ? lo : INF, side: 'no', comp: 'EV:' + id + ':Y' });
      // "No" is the complement: the value is NOT inside (lo, hi) — expressible as an interval for one-sided events.
      if (extra) { yes.note = no.note = extra; }
      props.push(yes, no);
    }
    props.push(makeProp({ id: 'EV:FIRST:H', cat: 'events', group: 'Team Scores First', label: H.name + ' Score First', short: H.name + ' Score First', stat: 'homeFirst', lo: 0.5, side: 'home', comp: 'EV:FIRST:A' }));
    props.push(makeProp({ id: 'EV:FIRST:A', cat: 'events', group: 'Team Scores First', label: A.name + ' Score First', short: A.name + ' Score First', stat: 'homeFirst', hi: 0.5, side: 'away', comp: 'EV:FIRST:H' }));
    [10, 15, 20].forEach(function (n) { yn('LEAD' + n, 'Either Team Leads By ' + n + '+', 'maxLead', n - 0.5, INF); });
    yn('OT', 'Game Goes To Overtime', 'ot', 0.5, INF);
    yn('Q1', 'Both Teams Score 25+ During Q1', 'q1min', 24.5, INF);
    yn('P30', 'Any Player Scores 30+', 'maxPts', 29.5, INF);
    var minAvg = model.mean('minScore'), floorT = Math.floor((minAvg - 3) / 5) * 5;
    yn('BOTH' + floorT, 'Both Teams Score ' + floorT + '+', 'minScore', floorT - 0.5, INF);

    // ---- price every prediction from the replays ----
    var byId = {};
    for (i = 0; i < props.length; i++) {
      var pr = props[i], est = model.prob(pr.stat, pr.lo, pr.hi);
      pr.p = est.p; pr.k = est.k; pr.n = est.n;
      byId[pr.id] = pr;
    }
    // "No" events are the exact complement of "Yes": make them add to 100%.
    props.forEach(function (pr) {
      if (/:N$/.test(pr.id) && byId[pr.comp]) { pr.p = 1 - byId[pr.comp].p; pr.k = pr.n - byId[pr.comp].k; }
    });
    return { props: props, byId: byId, matchup: matchup, model: model };
  }

  // ---- "No" events: value must be OUTSIDE (lo,hi) ----
  // For one-sided Yes events (lo,∞) the complement is (-∞,lo). buildMarket's yn() encodes that above.

  /** Is this prediction offered at the current house margin? (Avoids prices where a win would pay less than the stake.) */
  function isOffered(prop, margin) {
    return prop.p >= 0.02 && prop.p <= (1 - margin) / 1.03;
  }

  /** Do two predictions contradict each other (can never both be true)? */
  function conflictBetween(a, b) {
    if (a.stat !== b.stat) return null;
    var lo = Math.max(a.lo, b.lo), hi = Math.min(a.hi, b.hi);
    var firstInt = Math.floor(lo) + 1;
    if (!(firstInt < hi)) return { a: a, b: b };
    return null;
  }

  /** Merge several predictions on the SAME stat into one interval (intersection). */
  function mergeByStat(props) {
    var map = {}, order = [];
    props.forEach(function (p) {
      var m = map[p.stat];
      if (!m) { m = map[p.stat] = { stat: p.stat, lo: p.lo, hi: p.hi, members: [p] }; order.push(p.stat); }
      else { m.lo = Math.max(m.lo, p.lo); m.hi = Math.min(m.hi, p.hi); m.members.push(p); }
    });
    return order.map(function (s) { return map[s]; });
  }

  function inside(prop, v) { return v > prop.lo && v < prop.hi; }

  /** Final resolution from the finished game's stat vector. */
  function resolveFinal(prop, stats) { return inside(prop, stats[prop.stat]); }

  /**
   * Live status of one leg: 'pending' | 'live' | 'hit' | 'missed'
   * `vec` = statVector(live), `live` = live state.
   */
  function legStatus(prop, vec, live) {
    if (!live.started) return 'pending';
    var meta = statMeta(prop.stat), v = vec[prop.stat], settled = false;
    switch (meta.settle) {
      case 'final': settled = live.final; break;
      case 'regulation': settled = live.regulationOver; break;
      case 'q1': settled = live.period >= 2 || live.final; break;
      case 'first': settled = live.firstScorer !== null; break;
    }
    if (v === null || v === undefined) return 'live';
    if (settled) return inside(prop, v) ? 'hit' : 'missed';
    if (meta.monotone) {
      if (v >= prop.hi) return 'missed';
      if (v > prop.lo && prop.hi === INF) return 'hit';
    }
    return 'live';
  }

  /** Short human text for what the leg needs. */
  function requirement(prop) {
    if (prop.cat === 'player' || prop.cat === 'total') {
      return prop.side === 'over' ? Math.ceil(prop.lo) + '+' : 'under ' + prop.hi.toFixed(1);
    }
    return '';
  }

  /** Progress text such as "7 REB" or "Total 112" for the tracker. */
  function progressText(prop, vec, game) {
    var v = vec[prop.stat], H = game.matchup.home, A = game.matchup.away;
    if (v === null || v === undefined) return 'Waiting for first basket';
    if (prop.cat === 'player') return v + ' ' + STAT_LABEL[prop.statType].toUpperCase();
    switch (prop.stat) {
      case 'margin': return v === 0 ? 'Tied' : (v > 0 ? H.city + ' lead by ' + v : A.city + ' lead by ' + (-v));
      case 'total': return 'Total ' + v + ' points';
      case 'maxLead': return 'Largest lead so far: ' + v;
      case 'ot': return v ? 'Overtime!' : 'Not tied after regulation (yet)';
      case 'homeFirst': return (v ? H.city : A.city) + ' scored first';
      case 'q1min': return 'Lower Q1 score: ' + v;
      case 'maxPts': return 'Top scorer: ' + v + ' points';
      case 'minScore': return 'Lower team score: ' + v;
    }
    return String(v);
  }

  PL.Props = {
    STAT_LABEL: STAT_LABEL, STAT_SHORT: STAT_SHORT, statMeta: statMeta, buildMarket: buildMarket, isOffered: isOffered,
    conflictBetween: conflictBetween, mergeByStat: mergeByStat, resolveFinal: resolveFinal, legStatus: legStatus,
    requirement: requirement, progressText: progressText, inside: inside, fmtLine: fmtLine
  };
})(typeof window !== 'undefined' ? window : globalThis);
