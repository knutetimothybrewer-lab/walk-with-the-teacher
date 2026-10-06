/*
 * model.js — the "pregame model": we replay the SAME matchup many times (default 500) with
 * different random streams. The share of replays in which something happens is our estimate of its
 * probability. Because every replay is a whole simulated game, correlations (e.g. star scores more
 * when his team wins) appear naturally.
 *
 * The real game (the one students watch) is a separate, independent draw from the same engine.
 * Nothing in here ever looks at the real game's result.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};

  function Model(matchup, seed, N) {
    this.matchup = matchup; this.seed = seed; this.N = 0; this.target = N;
    this.samples = [];
    this.sumMin = new Array(16).fill(0); this.sumFgm = new Array(16).fill(0); this.sumFga = new Array(16).fill(0);
    this.sumPoss = [0, 0]; this.otCount = 0;
    this._ind = {}; this._stat = {};
  }
  Model.prototype.addSample = function (r) {
    this.samples.push(r.stats);
    for (var g = 0; g < 16; g++) { this.sumMin[g] += r.box[g].min; this.sumFgm[g] += r.box[g].fgm; this.sumFga[g] += r.box[g].fga; }
    this.sumPoss[0] += r.possessions[0]; this.sumPoss[1] += r.possessions[1];
    this.N = this.samples.length;
    this._ind = {}; this._stat = {};
  };
  Model.prototype.values = function (stat) {
    var c = this._stat[stat];
    if (c) return c;
    c = new Float64Array(this.N);
    for (var i = 0; i < this.N; i++) c[i] = this.samples[i][stat];
    this._stat[stat] = c; return c;
  };
  Model.prototype.mean = function (stat) {
    var v = this.values(stat), s = 0; for (var i = 0; i < v.length; i++) s += v[i]; return s / v.length;
  };
  Model.prototype.sd = function (stat) {
    var v = this.values(stat), m = this.mean(stat), s = 0; for (var i = 0; i < v.length; i++) s += (v[i] - m) * (v[i] - m);
    return Math.sqrt(s / v.length);
  };
  /** 0/1 array: did the interval (lo, hi) on `stat` win in each replay? */
  Model.prototype.indicator = function (stat, lo, hi) {
    var key = stat + '|' + lo + '|' + hi, c = this._ind[key];
    if (c) return c;
    var v = this.values(stat); c = new Uint8Array(v.length);
    for (var i = 0; i < v.length; i++) c[i] = (v[i] > lo && v[i] < hi) ? 1 : 0;
    this._ind[key] = c; return c;
  };
  /** Smoothed probability estimate that the interval wins. */
  Model.prototype.prob = function (stat, lo, hi) {
    var ind = this.indicator(stat, lo, hi), k = 0;
    for (var i = 0; i < ind.length; i++) k += ind[i];
    return { k: k, n: ind.length, p: Math.min(0.995, Math.max(0.005, (k + 1) / (ind.length + 2))), ind: ind };
  };

  function simOne(matchup, seed, i, qSec) {
    return PL.Basketball.simulateGame(matchup, PL.createSeededRandom(seed + '|model|' + i), { record: false, quarterSeconds: qSec });
  }

  /** Synchronous build (used by tests). */
  function buildModel(matchup, seed, opts) {
    opts = opts || {};
    var N = opts.N || 500, m = new Model(matchup, seed, N);
    for (var i = 0; i < N; i++) m.addSample(simOne(matchup, seed, i, opts.quarterSeconds));
    return m;
  }

  /** Same, but yields to the browser every few games so the loading bar can animate. */
  function buildModelAsync(matchup, seed, opts, onProgress) {
    opts = opts || {};
    var N = opts.N || 500, m = new Model(matchup, seed, N), i = 0;
    return new Promise(function (resolve) {
      function chunk() {
        var stop = Math.min(N, i + 25);
        for (; i < stop; i++) m.addSample(simOne(matchup, seed, i, opts.quarterSeconds));
        if (onProgress) onProgress(i / N);
        if (i < N) setTimeout(chunk, 0); else resolve(m);
      }
      chunk();
    });
  }

  PL.Model = { build: buildModel, buildAsync: buildModelAsync };
})(typeof window !== 'undefined' ? window : globalThis);
