/* THE HOUSE EDGE — probability, simulation and math engine.
   Reads ONLY HE.CONFIG. Used by gameplay, X-Ray, charts and the Monte Carlo lab. */
(function (root) {
  'use strict';
  var HE = root.HE = root.HE || {};
  var C = HE.CONFIG;

  /* ---------- RNG (seedable; default seed from crypto) ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function randomSeed() {
    try { var u = new Uint32Array(1); (root.crypto || {}).getRandomValues(u); return u[0]; }
    catch (e) { return (Math.random() * 4294967296) >>> 0; }
  }
  var Engine = HE.Engine = {};
  Engine.makeRng = function (seed) { return mulberry32(seed == null ? randomSeed() : seed); };
  var mainRng = Engine.makeRng();
  Engine.rand = function () { return mainRng(); };
  Engine.seed = function (s) { mainRng = Engine.makeRng(s); };

  /* ---------- Games: derived statistics + drawing ---------- */
  var cache = {};
  function prep(g) {
    if (g._prep) return g;
    var cum = [], s = 0, rtp = 0, i;
    for (i = 0; i < g.outcomes.length; i++) { s += g.outcomes[i].p; cum.push(s); rtp += g.outcomes[i].p * g.outcomes[i].ret; }
    var ev = rtp - 1, v = 0, hit = 0;
    for (i = 0; i < g.outcomes.length; i++) {
      var o = g.outcomes[i], d = (o.ret - 1) - ev;
      v += o.p * d * d; if (o.ret > 1) hit += o.p;
    }
    g._cum = cum; g._sum = s; g.rtp = rtp; g.ev = ev; g.edge = 1 - rtp; g.sd = Math.sqrt(v); g.winP = hit; g._prep = true;
    return g;
  }
  Engine.game = function (id) {
    var g = C.games[id] || cache[id];
    if (!g) throw new Error('Unknown game ' + id);
    return prep(g);
  };
  /* Hypothetical even-money game with the given house edge. */
  Engine.edgeGame = function (edge) {
    var key = 'edge:' + edge;
    if (!cache[key]) {
      var p = (1 - edge) / 2;
      cache[key] = { id: key, name: (edge * 100).toFixed(0) + '% house edge (educational simulation)', wagers: [C.edgeLab.wager],
        outcomes: [{ id: 'win', label: 'Win', p: p, ret: 2 }, { id: 'lose', label: 'Lose', p: 1 - p, ret: 0 }] };
    }
    return prep(cache[key]);
  };
  Engine.validate = function () {
    var bad = [];
    for (var k in C.games) { var g = Engine.game(k); if (Math.abs(g._sum - 1) > 1e-9) bad.push(k + ' sums to ' + g._sum); }
    var sl = C.sports.slate; for (var i = 0; i < sl.length; i++) if (sl[i].pHome <= 0 || sl[i].pHome >= 1) bad.push('slate ' + sl[i].id);
    return bad;
  };
  /* Map a uniform number r in [0,1) onto the configured probability ranges. */
  Engine.pick = function (g, r) {
    var cum = g._cum, n = cum.length;
    for (var i = 0; i < n; i++) if (r < cum[i]) return i;
    return n - 1;
  };
  /* Full draw with details used by X-Ray (random value, range). */
  Engine.draw = function (gameOrId, rng) {
    var g = typeof gameOrId === 'string' ? Engine.game(gameOrId) : prep(gameOrId);
    var r = (rng || Engine.rand)();
    var i = Engine.pick(g, r);
    return { r: r, index: i, outcome: g.outcomes[i], lo: i ? g._cum[i - 1] : 0, hi: g._cum[i] };
  };
  /* Table of per-outcome contributions for a given wager (feeds EV animation). */
  Engine.evTable = function (gameOrId, wager) {
    var g = typeof gameOrId === 'string' ? Engine.game(gameOrId) : prep(gameOrId);
    var rows = g.outcomes.map(function (o) {
      var net = (o.ret - 1) * wager;
      return { id: o.id, label: o.label, p: o.p, ret: o.ret * wager, net: net, contrib: o.p * net };
    });
    var ev = rows.reduce(function (a, r) { return a + r.contrib; }, 0);
    return { rows: rows, ev: ev, wager: wager, rtp: g.rtp, edge: g.edge, expectedReturn: g.rtp * wager };
  };
  Engine.evOfTwo = function (pWin, win, lose) { return pWin * win + (1 - pWin) * lose; };

  /* ---------- Player / session models (shared by gameplay AND simulation) ---------- */
  function newTally(start) {
    return { start: start, bal: start, wagered: 0, returned: 0, bets: 0, wins: 0, losses: 0, largestWin: 0,
      curW: 0, curL: 0, longW: 0, longL: 0, trace: null };
  }
  function record(t, w, ret) {
    t.bal += ret - w; t.wagered += w; t.returned += ret; t.bets++;
    var net = ret - w;
    if (net > 0) { t.wins++; t.curW++; t.curL = 0; if (net > t.largestWin) t.largestWin = net; if (t.curW > t.longW) t.longW = t.curW; }
    else if (net < 0) { t.losses++; t.curL++; t.curW = 0; if (t.curL > t.longL) t.longL = t.curL; }
    else { t.curW = 0; t.curL = 0; }
  }
  function finish(t) { t.end = t.bal; t.net = t.bal - t.start; delete t.curW; delete t.curL; return t; }
  Engine.newTally = newTally; Engine.record = record; Engine.finish = finish;

  /* Play a fixed list of wagers on one game (Zone 2 session, A/B test). */
  Engine.playSeq = function (gameId, wagers, rng, start) {
    var g = Engine.game(gameId), t = newTally(start == null ? C.slotSession.startBalance : start);
    for (var i = 0; i < wagers.length; i++) {
      var o = g.outcomes[Engine.pick(g, rng())];
      record(t, wagers[i], o.ret * wagers[i]);
    }
    return finish(t);
  };
  /* Play n identical bets (variance / RTP labs). trace = record balance each bet. */
  Engine.playN = function (gameId, wager, n, rng, trace, start) {
    var g = typeof gameId === 'string' ? Engine.game(gameId) : prep(gameId), t = newTally(start || 0);
    if (trace) t.trace = [t.bal];
    for (var i = 0; i < n; i++) {
      var o = g.outcomes[Engine.pick(g, rng())];
      record(t, wager, o.ret * wager);
      if (trace) t.trace.push(t.bal);
    }
    return finish(t);
  };
  /* Strategy runner (Zone 8). strat = {game, wager, afterLoss, stopWin, stopLoss, maxBets} */
  var ROTATE = ['slots', 'wheel', 'dice'];
  Engine.runStrategy = function (s, rng, keepLog) {
    var B = C.beat, t = newTally(B.bankroll), wager = s.wager, log = keepLog ? [] : null;
    t.trace = keepLog ? [t.bal] : null; t.bust = false; t.stopped = null; t.byGame = {};
    for (var i = 0; i < (s.maxBets || B.maxBets); i++) {
      var gid = s.game === 'rotate' ? ROTATE[i % ROTATE.length] : s.game;
      var w = Math.min(wager, t.bal);
      if (w <= 0) { t.bust = true; break; }
      var g = Engine.game(gid), r = rng(), k = Engine.pick(g, r), o = g.outcomes[k];
      record(t, w, o.ret * w); t.byGame[gid] = (t.byGame[gid] || 0) + w;
      if (keepLog) { log.push({ i: i + 1, game: gid, wager: w, ret: o.ret * w, outcome: o.id, label: o.label, r: r, bal: t.bal }); t.trace.push(t.bal); }
      var lost = o.ret * w < w;
      wager = (s.afterLoss === 'double' && lost) ? Math.min(w * 2, B.doubleCap) : s.wager;
      var net = t.bal - t.start;
      if (s.stopWin && net >= s.stopWin) { t.stopped = 'stop-win'; break; }
      if (s.stopLoss && net <= -s.stopLoss) { t.stopped = 'stop-loss'; break; }
    }
    if (t.bal <= 0) t.bust = true;
    t.log = log;
    return finish(t);
  };

  /* ---------- Monte Carlo ---------- */
  var Sim = HE.Sim = {};
  /* playerFn(rng, index) -> tally. Returns a summary object. */
  Sim.run = function (n, playerFn, opts) {
    opts = opts || {};
    var rng = Engine.makeRng(opts.seed), nets = new Float64Array(n), W = 0, R = 0, bets = 0, i;
    var extra = opts.collect ? [] : null;
    for (i = 0; i < n; i++) {
      var t = playerFn(rng, i);
      nets[i] = t.net; W += t.wagered; R += t.returned; bets += t.bets;
      if (extra) extra.push(opts.collect(t));
    }
    return Sim.summarize(nets, W, R, bets, opts);
  };
  Sim.summarize = function (nets, W, R, bets, opts) {
    opts = opts || {};
    var n = nets.length, sorted = Float64Array.from(nets).sort();
    var sum = 0, i; for (i = 0; i < n; i++) sum += nets[i];
    var mean = sum / n, v = 0; for (i = 0; i < n; i++) v += (nets[i] - mean) * (nets[i] - mean);
    var sd = Math.sqrt(v / Math.max(1, n - 1));
    var meanW = W / n, band = C.sim.breakEvenBandPct * meanW, prof = 0, loss = 0, be = 0;
    for (i = 0; i < n; i++) { if (nets[i] > 0) prof++; else if (nets[i] < 0) loss++; if (Math.abs(nets[i]) <= band) be++; }
    var median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    return { n: n, nets: nets, sorted: sorted, mean: mean, median: median, min: sorted[0], max: sorted[n - 1], sd: sd,
      pctProfit: prof / n, pctLoss: loss / n, pctBreakEven: be / n, band: band,
      totalWagered: W, totalReturned: R, totalBets: bets, playerNet: R - W, houseNet: W - R, meanWagered: meanW };
  };
  /* Where does a value sit among simulated results? */
  Sim.position = function (sum, x) {
    var s = sum.sorted, n = s.length, lo = 0, hi = n, m;
    while (lo < hi) { m = (lo + hi) >> 1; if (s[m] < x - 1e-9) lo = m + 1; else hi = m; }
    var below = lo; hi = n;
    var lo2 = lo; while (lo2 < hi) { m = (lo2 + hi) >> 1; if (s[m] <= x + 1e-9) lo2 = m + 1; else hi = m; }
    var equalOrBelow = lo2, equal = equalOrBelow - below, above = n - equalOrBelow;
    return { below: below / n, equal: equal / n, above: above / n, percentile: (below + equal / 2) / n * 100 };
  };
  Sim.histogram = function (nets, lo, hi, nb) {
    var counts = new Array(nb).fill(0), w = (hi - lo) / nb;
    for (var i = 0; i < nets.length; i++) {
      var b = Math.floor((nets[i] - lo) / w); if (b < 0) b = 0; if (b >= nb) b = nb - 1; counts[b]++;
    }
    return { lo: lo, hi: hi, nb: nb, counts: counts, w: w };
  };
  /* Choose axis bounds (include extras such as the student's own result). */
  Sim.bounds = function (sum, extras) {
    var lo = sum.min, hi = sum.max, e = extras || [];
    for (var i = 0; i < e.length; i++) { if (e[i] < lo) lo = e[i]; if (e[i] > hi) hi = e[i]; }
    var pad = (hi - lo) * 0.04 || 1; return { lo: lo - pad, hi: hi + pad };
  };
  /* Compact, storable form of a summary (no raw arrays). */
  Sim.compact = function (sum, extra) {
    var b = Sim.bounds(sum, extra && extra.include), h = Sim.histogram(sum.nets, b.lo, b.hi, C.sim.bins);
    var o = { n: sum.n, mean: sum.mean, median: sum.median, min: sum.min, max: sum.max, sd: sum.sd, pctProfit: sum.pctProfit,
      pctLoss: sum.pctLoss, pctBreakEven: sum.pctBreakEven, totalWagered: sum.totalWagered, totalReturned: sum.totalReturned,
      hist: { lo: h.lo, hi: h.hi, counts: h.counts } };
    for (var k in extra) if (k !== 'include') o[k] = extra[k];
    return o;
  };

  /* ---------- Expected values of whole sessions ---------- */
  Engine.expectedSeq = function (gameId, wagers) {
    var g = Engine.game(gameId), tot = wagers.reduce(function (a, b) { return a + b; }, 0);
    return { wagered: tot, net: g.ev * tot, returned: g.rtp * tot };
  };

  /* ---------- Parlays ---------- */
  var P = HE.Parlay = {};
  P.legOdds = function (p) { return (1 - C.sports.margin) / p; };
  P.legP = function (leg) { var g = P.game(leg.game); return leg.side === 'home' ? g.pHome : 1 - g.pHome; };
  P.game = function (id) { return C.sports.slate.filter(function (g) { return g.id === id; })[0]; };
  /* ps: array of true win probabilities. */
  P.stats = function (ps) {
    var prob = 1, off = 1, fair = 1, odds = ps.map(function (p) { return P.legOdds(p); });
    ps.forEach(function (p, i) { prob *= p; off *= odds[i]; fair *= 1 / p; });
    return { n: ps.length, ps: ps, odds: odds, prob: prob, fairMult: fair, offeredMult: off, ev: prob * off - 1, rtp: prob * off, edge: 1 - prob * off };
  };
  P.reference = function (n) { var a = []; for (var i = 0; i < n; i++) a.push(C.sports.referenceLegP); return P.stats(a); };
  /* Monte Carlo survivors after each leg. */
  P.survivors = function (ps, n, rng) {
    rng = rng || Engine.makeRng();
    var alive = new Array(ps.length + 1).fill(0); alive[0] = n;
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < ps.length; j++) { if (rng() < ps[j]) alive[j + 1]++; else break; }
    }
    return alive;
  };
  P.resolveGame = function (id, rng) { var g = P.game(id); return (rng || Engine.rand)() < g.pHome ? 'home' : 'away'; };

  /* ---------- Streak math ---------- */
  Engine.probRunAtLeast = function (n, k) {   // P(a run of >= k same results somewhere in n fair flips)
    if (k <= 1) return 1; if (n < k) return 0;
    var f = new Array(k).fill(0), hit = 0, j; f[1] = 1;
    for (var t = 2; t <= n; t++) {
      var g = new Array(k).fill(0);
      for (j = 1; j < k; j++) {
        g[1] += f[j] * 0.5;
        if (j + 1 >= k) hit += f[j] * 0.5; else g[j + 1] += f[j] * 0.5;
      }
      f = g;
    }
    return hit;
  };
  Engine.longestRun = function (arr) {
    var best = 0, cur = 0, prev = null, start = 0, bs = 0;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === prev) cur++; else { cur = 1; start = i; prev = arr[i]; }
      if (cur > best) { best = cur; bs = start; }
    }
    return { len: best, start: bs };
  };
  Engine.expectedLongestRun = function (n) { var e = 0; for (var k = 1; k <= n; k++) { var p = Engine.probRunAtLeast(n, k); e += p; if (p < 1e-9) break; } return e; };

  /* ---------- Parsing & formatting ---------- */
  Engine.parseNumber = function (str, mode) {
    if (str == null) return NaN;
    var s = String(str).trim().replace(/,/g, '').replace(/\s+/g, '');
    if (!s) return NaN;
    var pct = /%$/.test(s); if (pct) s = s.slice(0, -1);
    var v;
    if (/^[+-]?\d*\.?\d+\/\d*\.?\d+$/.test(s)) { var a = s.split('/'); v = parseFloat(a[0]) / parseFloat(a[1]); }
    else if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) v = parseFloat(s);
    else return NaN;
    if (mode === 'prob') { if (pct) v = v / 100; else if (v > 1) v = v / 100; }
    else if (pct) v = v / 100 * 1; // plain numeric with % stays as percent number
    return v;
  };
  Engine.fmt = function (x, d) {
    if (x == null || isNaN(x)) return '—';
    d = d == null ? (Math.abs(x - Math.round(x)) < 1e-9 ? 0 : 1) : d;
    return Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  Engine.signed = function (x, d) { var s = Engine.fmt(x, d); return (x > 0 ? '+' : '') + s.replace('-', '−'); };
  Engine.pct = function (x, d) { return Engine.fmt(x * 100, d == null ? 1 : d) + '%'; };

  if (typeof module !== 'undefined' && module.exports) module.exports = HE;
})(typeof window !== 'undefined' ? window : globalThis);
