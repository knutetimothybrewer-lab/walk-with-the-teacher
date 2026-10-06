/*
 * parlay.js — building, checking, pricing and resolving parlay slips.
 *
 * A "slip" is a list of legs (predictions). To win, EVERY leg must be correct.
 * This file never touches the game: it only reads the market (probabilities) and, after the game
 * is over, the final stat numbers.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};

  var RISK = [
    { level: 1, key: 'moderate', label: 'MODERATE RISK', icon: '▲', min: 0.5 },
    { level: 2, key: 'high', label: 'HIGH RISK', icon: '▲▲', min: 0.25 },
    { level: 3, key: 'veryhigh', label: 'VERY HIGH RISK', icon: '▲▲▲', min: 0.10 },
    { level: 4, key: 'extreme', label: 'EXTREME RISK', icon: '▲▲▲▲', min: 0 }
  ];
  function riskLevel(p) {
    for (var i = 0; i < RISK.length; i++) if (p >= RISK[i].min) return RISK[i];
    return RISK[RISK.length - 1];
  }

  /** Can this prediction be added to the slip? Returns {ok, reason, kind}. */
  function checkAdd(legIds, propId, market, cfg) {
    var prop = market.byId[propId];
    if (!prop) return { ok: false, kind: 'missing', reason: 'That prediction is not available.' };
    if (legIds.indexOf(propId) >= 0) return { ok: false, kind: 'duplicate', reason: 'That prediction is already on your slip.' };
    if (!PL.Props.isOffered(prop, cfg.houseMargin)) {
      return { ok: false, kind: 'unoffered', reason: 'Not offered: this outcome is so likely (or unlikely) that the simulated price would be unusable.' };
    }
    for (var i = 0; i < legIds.length; i++) {
      var other = market.byId[legIds[i]];
      var c = PL.Props.conflictBetween(prop, other);
      if (c) {
        return { ok: false, kind: 'conflict', other: other,
          reason: 'These selections conflict: “' + other.label + '” and “' + prop.label + '” cannot both happen.' };
      }
    }
    if (legIds.length >= cfg.maxLegs) {
      return { ok: false, kind: 'max', reason: 'Your teacher set a maximum of ' + cfg.maxLegs + ' legs per slip.' };
    }
    return { ok: true };
  }

  /** Check a requested stake against the teacher's limits and the student's balance. */
  function checkStake(stake, available, cfg) {
    var s = Math.floor(Number(stake));
    if (!isFinite(s) || s <= 0) return { ok: false, reason: 'Choose at least 1 Lab Token.', value: 0 };
    if (s > cfg.maxStake) return { ok: false, reason: 'The limit is ' + cfg.maxStake + ' Lab Tokens per slip.', value: cfg.maxStake };
    if (s > available) return { ok: false, reason: 'You only have ' + available + ' Lab Tokens available.', value: available };
    return { ok: true, value: s };
  }

  /**
   * Price a slip. Everything a student sees about odds comes from here.
   * Returns null for an empty slip.
   */
  function evaluateSlip(legIds, stake, market, cfg) {
    var legs = legIds.map(function (id) { return market.byId[id]; }).filter(Boolean);
    if (!legs.length) return null;
    var merged = PL.Props.mergeByStat(legs);
    var items = merged.map(function (m) {
      if (m.members.length === 1) {
        var pr = m.members[0];
        return { p: pr.p, ind: market.model.indicator(pr.stat, pr.lo, pr.hi), merged: m };
      }
      var est = market.model.prob(m.stat, m.lo, m.hi);
      return { p: est.p, ind: est.ind, merged: m };
    });
    var joint = PL.Prob.jointProbability(items);
    var pInd = PL.Prob.product(legs.map(function (l) { return l.p; }));
    var s = stake || 0;
    var price = PL.Prob.pricing(s || 1, joint.p, legs.length, cfg.houseMargin);
    // scale per-token numbers back to the actual stake
    var out = {
      legs: legs, n: legs.length, stake: s,
      p: joint.p, pInd: pInd, approx: joint.approx, hits: joint.hits, copulaN: 30000,
      fairMultiple: price.fairReturn, offeredMultiple: price.offeredReturn,
      fairReturn: price.fairReturn * s, offeredReturn: price.offeredReturn * s,
      potentialReturn: Math.floor(price.offeredReturn * s + 1e-9),
      difference: price.difference * s,
      expectedValue: price.expectedValue * s,
      evPct: price.expectedReturnPct,
      risk: riskLevel(joint.p), notes: []
    };
    // educational notes about relationships between legs
    merged.forEach(function (m) {
      if (m.members.length > 1) {
        out.notes.push({ type: 'nested', text: 'Overlapping selections on the same number (' + m.members.map(function (x) { return x.short; }).join(' + ') + ') are counted as one combined requirement.' });
      }
    });
    for (var i = 0; i < items.length; i++) for (var j = i + 1; j < items.length; j++) {
      var rho = joint.corr[i] ? joint.corr[i][j] : 0;
      if (Math.abs(rho) >= 0.3) {
        out.notes.push({ type: rho > 0 ? 'correlated' : 'inverse', rho: rho,
          a: merged[i].members[0], b: merged[j].members[0],
          text: '“' + merged[i].members[0].short + '” and “' + merged[j].members[0].short + '” are ' + (Math.abs(rho) >= 0.6 ? 'strongly ' : '') + (rho > 0 ? 'positively' : 'negatively') + ' related (correlation ≈ ' + rho.toFixed(2) + '). The estimate accounts for this.' });
      }
    }
    if (legs.length > 1 && joint.p >= 0.0001) {
      var minP = Math.min.apply(null, legs.map(function (l) { return l.p; }));
      if (joint.p > 0.93 * minP && merged.length > 1) {
        out.notes.push({ type: 'redundant', text: 'Your hardest leg already makes the others almost certain, so extra legs add little.' });
      }
    }
    return out;
  }

  /** What changes if one more leg is added? */
  function previewAdd(legIds, propId, stake, market, cfg) {
    var before = evaluateSlip(legIds, stake, market, cfg);
    var after = evaluateSlip(legIds.concat([propId]), stake, market, cfg);
    if (!before || !after) return null;
    return {
      before: before, after: after,
      returnChangePct: before.potentialReturn > 0 ? after.offeredReturn / before.offeredReturn - 1 : 0,
      probChangePct: after.p / before.p - 1
    };
  }

  /** Suggest a plausible "next leg" for the Add One More Leg prompt (neutral: closest to a coin flip). */
  function suggestNextLeg(legIds, market, cfg) {
    var best = null, bestScore = 1e9;
    market.props.forEach(function (pr) {
      if (!pr.main && pr.cat !== 'events' && pr.cat !== 'winner') return;
      if (!checkAdd(legIds, pr.id, market, cfg).ok) return;
      var score = Math.abs(pr.p - 0.5) + (legIds.some(function (id) { return market.byId[id].playerId && market.byId[id].playerId === pr.playerId; }) ? 0.2 : 0);
      if (score < bestScore) { bestScore = score; best = pr; }
    });
    return best;
  }

  /** Create the permanent record of a locked-in slip. */
  function createSlip(legIds, stake, market, cfg, gameNo, slipNo) {
    var ev = evaluateSlip(legIds, stake, market, cfg);
    return {
      id: 'g' + gameNo + 's' + slipNo, gameNo: gameNo, slipNo: slipNo,
      legs: legIds.slice(),
      legsSnap: ev.legs.map(function (l) { return { id: l.id, label: l.label, short: l.short, p: l.p }; }),
      stake: stake, p: ev.p, pInd: ev.pInd, margin: cfg.houseMargin,
      fairReturn: ev.fairReturn, potentialReturn: ev.potentialReturn, evPct: ev.evPct,
      riskKey: ev.risk.key, result: null, hits: null, returned: null
    };
  }

  /** Resolve a locked slip against the finished game's numbers. */
  function resolveSlip(slip, stats, market) {
    var legResults = slip.legs.map(function (id) {
      var prop = market.byId[id];
      return { id: id, hit: PL.Props.resolveFinal(prop, stats), value: stats[prop.stat] };
    });
    var hits = legResults.filter(function (r) { return r.hit; }).length;
    var win = hits === slip.legs.length;
    return {
      legResults: legResults, hits: hits, win: win,
      nearMiss: !win && slip.legs.length >= 2 && hits === slip.legs.length - 1,
      returned: win ? slip.potentialReturn : 0
    };
  }

  PL.Parlay = {
    riskLevel: riskLevel, checkAdd: checkAdd, checkStake: checkStake, evaluateSlip: evaluateSlip,
    previewAdd: previewAdd, suggestNextLeg: suggestNextLeg, createSlip: createSlip, resolveSlip: resolveSlip, RISK: RISK
  };
})(typeof window !== 'undefined' ? window : globalThis);
