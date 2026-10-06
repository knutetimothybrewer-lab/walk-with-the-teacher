/*
 * probability.js — the math used everywhere in PARLAY LAB.
 *
 *  - normal distribution helpers
 *  - independent probability (multiply the legs)
 *  - correlation-aware joint probability (Gaussian copula built from simulated games)
 *  - house-margin pricing: fair return vs offered return
 *  - number formatting helpers
 *
 * No student or game state lives here: these are pure functions.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};

  // ---- normal distribution ----
  function normCdf(x) {
    // Abramowitz-Stegun 7.1.26 via erf
    var s = x < 0 ? -1 : 1, t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
    return 0.5 * (1 + s * y);
  }
  function normInv(p) { // Acklam's algorithm
    if (p <= 0) return -8; if (p >= 1) return 8;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var pl = 0.02425, q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  // ---- basic parlay math ----
  function product(ps) { var x = 1; for (var i = 0; i < ps.length; i++) x *= ps[i]; return x; }

  /** n identical legs, each with probability p, treated as independent. */
  function independentParlay(p, n) { return Math.pow(p, n); }

  /**
   * Pricing rule used by the whole simulation.
   *   fairReturn    = stake / P(all legs happen)                       (no house advantage)
   *   offeredReturn = fairReturn × (1 − margin)^legs                   (each leg carries the margin)
   * Margins compound: more legs means a bigger total advantage for the "house".
   */
  function pricing(stake, probability, legs, margin) {
    var P = Math.max(probability, 1e-9);
    var fair = stake / P;
    var offered = fair * Math.pow(1 - margin, legs);
    return {
      fairReturn: fair, offeredReturn: offered,
      fairReturnR: Math.round(fair), offeredReturnR: Math.floor(offered),
      difference: fair - offered,
      expectedValue: P * offered - stake,           // average net tokens per slip
      expectedReturnPct: (P * offered) / stake - 1  // e.g. -0.12 means lose 12% on average
    };
  }

  // ---- association between two yes/no events (Yule's approximation of tetrachoric correlation) ----
  function yuleCorrelation(a, b) {
    var n11 = 0.5, n10 = 0.5, n01 = 0.5, n00 = 0.5;
    for (var i = 0; i < a.length; i++) {
      if (a[i]) { if (b[i]) n11++; else n10++; } else { if (b[i]) n01++; else n00++; }
    }
    var or = (n11 * n00) / (n10 * n01);
    var rho = Math.cos(Math.PI / (1 + Math.sqrt(or)));
    return Math.max(-0.95, Math.min(0.95, rho));
  }

  // ---- Gaussian copula: P(all events happen) when events are correlated ----
  var COPULA_M = 30000, COPULA_D = 12, zCache = null;
  function zDraws() {
    if (zCache) return zCache;
    var rng = PL.createSeededRandom('COPULA-DRAWS-v1');
    zCache = new Float32Array(COPULA_M * COPULA_D);
    for (var i = 0; i < zCache.length; i++) zCache[i] = normInv(Math.min(0.999999, Math.max(0.000001, rng.next())));
    return zCache;
  }
  function cholesky(R, n) {
    var shrink = 1;
    for (var attempt = 0; attempt < 12; attempt++) {
      var L = [], ok = true, i, j, k, s;
      for (i = 0; i < n; i++) L.push(new Array(n).fill(0));
      for (i = 0; i < n && ok; i++) {
        for (j = 0; j <= i; j++) {
          s = (i === j ? 1 : R[i][j] * shrink);
          for (k = 0; k < j; k++) s -= L[i][k] * L[j][k];
          if (i === j) { if (s <= 1e-6) { ok = false; break; } L[i][j] = Math.sqrt(s); }
          else L[i][j] = s / L[j][j];
        }
      }
      if (ok) return L;
      shrink *= 0.8;
    }
    return null;
  }

  /**
   * items: [{p, ind}] where p = probability the leg wins and ind = 0/1 array over the simulated games.
   * Returns {p, pInd, corr, hits, approx}.
   */
  function jointProbability(items) {
    var n = items.length, i, j;
    var pInd = product(items.map(function (x) { return x.p; }));
    if (n === 0) return { p: 1, pInd: 1, corr: [], approx: false };
    if (n === 1) return { p: items[0].p, pInd: items[0].p, corr: [[1]], approx: false };
    var R = [];
    for (i = 0; i < n; i++) { R.push(new Array(n).fill(0)); R[i][i] = 1; }
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
      var c = yuleCorrelation(items[i].ind, items[j].ind);
      R[i][j] = R[j][i] = c;
    }
    if (n > COPULA_D) return { p: pInd, pInd: pInd, corr: R, approx: true };
    var L = cholesky(R, n);
    if (!L) return { p: pInd, pInd: pInd, corr: R, approx: true };
    var t = items.map(function (x) { return normInv(Math.min(0.9999, Math.max(0.0001, x.p))); });
    var Z = zDraws(), hits = 0;
    for (var m = 0; m < COPULA_M; m++) {
      var base = m * COPULA_D, ok = true;
      for (i = 0; i < n; i++) {
        var x = 0;
        for (j = 0; j <= i; j++) x += L[i][j] * Z[base + j];
        if (x >= t[i]) { ok = false; break; }
      }
      if (ok) hits++;
    }
    if (hits < 20) return { p: pInd, pInd: pInd, corr: R, hits: hits, approx: true };
    return { p: hits / COPULA_M, pInd: pInd, corr: R, hits: hits, approx: false };
  }

  // ---- formatting ----
  function fmtPct(p) {
    var v = p * 100;
    if (v >= 9.95) return Math.round(v) + '%';
    if (v >= 0.995) return v.toFixed(1) + '%';
    if (v >= 0.0995) return v.toFixed(2) + '%';
    return '<0.1%';
  }
  function fmtTokens(n) { return Math.round(n).toLocaleString('en-US'); }
  function fmtSigned(n, digits) {
    var s = (digits === undefined ? n.toFixed(1) : n.toFixed(digits));
    return (n > 0 ? '+' : '') + s;
  }

  PL.Prob = {
    normCdf: normCdf, normInv: normInv, product: product, independentParlay: independentParlay,
    pricing: pricing, yuleCorrelation: yuleCorrelation, jointProbability: jointProbability,
    fmtPct: fmtPct, fmtTokens: fmtTokens, fmtSigned: fmtSigned
  };
})(typeof window !== 'undefined' ? window : globalThis);
