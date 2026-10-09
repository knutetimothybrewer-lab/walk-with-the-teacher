/* =====================================================================================================
 * shared/core.js: code that MUST behave identically in the browser, in Node tests and on the server
 * (Google Apps Script).  Nothing in here is secret.  It contains:
 *   - a small deterministic random-number toolkit (seeded streams, shuffles)
 *   - the deterministic simulation "cores" (coin lab, house-edge lab) so the server can re-compute
 *     any number a student is asked to read from their own simulation
 *   - the three-attempt credit rule
 *   - a forgiving number parser used for typed numeric answers
 * Loaded as a classic script in the browser (window.U5), via require() in Node, and concatenated
 * into Code.gs for Apps Script (global U5).
 * ===================================================================================================== */
(function (root) {
  'use strict';

  // ------------------------------------------------------------------------------------ constants
  var MAX_ATTEMPTS = 3;
  var ATTEMPT_CREDIT = [1, 0.85, 0.75];          // 1st, 2nd, 3rd correct attempt
  var TIME_LIMIT_MIN = 90;
  var BLOCKS = ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9'];
  var TEACHER_SHORTCUT = 'WALK-TEACHER';          // shortcut only; it is NOT a credential

  function creditFor(attemptNo) { return ATTEMPT_CREDIT[attemptNo - 1] || 0; }
  function round2(x) { return Math.round(x * 100) / 100; }
  function round1(x) { return Math.round(x * 10) / 10; }

  // ------------------------------------------------------------------------------------ hashing / random
  // xmur3 string hash -> 32-bit unsigned int
  function hashStr(str) {
    str = String(str);
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // Stateless, index-addressable uniform number in [0,1).  u01(seed, i) never changes for the same inputs,
  // so "flip number 37 of your lab" has one fixed answer that the server can recompute.
  function u01(seed, i) {
    var h = (seed ^ Math.imul((i | 0) + 1, 0x9E3779B1)) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // mulberry32 sequential generator with helpers (used for shuffles, item variants)
  function rng(seedStr) {
    var a = typeof seedStr === 'number' ? seedStr >>> 0 : hashStr(seedStr);
    function next() {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      next: next,
      int: function (lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      shuffle: function (arr) {
        var o = arr.slice();
        for (var i = o.length - 1; i > 0; i--) { var j = Math.floor(next() * (i + 1)); var t = o[i]; o[i] = o[j]; o[j] = t; }
        return o;
      }
    };
  }

  // ------------------------------------------------------------------------------------ identity helpers
  function cleanText(s, n) {
    return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n || 60);
  }
  function normName(s) { return cleanText(s, 40).toLowerCase().replace(/[^a-z0-9À-ɏ ]/g, '').replace(/\s+/g, ' ').trim(); }
  function normId(s) { return String(s == null ? '' : s).toUpperCase().replace(/[\s]/g, ''); }
  function validId(s) { return /^[A-Z0-9][A-Z0-9_-]{2,19}$/.test(s); }
  function normCode(s) { return String(s == null ? '' : s).toUpperCase().replace(/\s+/g, ''); }

  // ------------------------------------------------------------------------------------ number parsing
  // Returns {v, pct, frac} or null.  Accepts: 12, 12.5, -0.1, −0.1, 1,500, $1.50, 52.4%, 3/10, .3, 5 tokens
  function parseNum(raw) {
    if (raw == null) return null;
    var s = String(raw).trim().toLowerCase();
    if (!s) return null;
    s = s.replace(/[−–—]/g, '-').replace(/,/g, '').replace(/\$/g, '').replace(/\s+/g, '');
    s = s.replace(/(tokens?|coins?|points?|pts?|dollars?|usd|bucks|cents?|heads|flips?|spins?|rounds?|bets?|games?|plays?|tickets?|times|x)$/g, '');
    var pct = false;
    if (/%$/.test(s)) { pct = true; s = s.slice(0, -1); }
    var m = s.match(/^(-?\d+\.?\d*|-?\.\d+)\/(\d+\.?\d*|\.\d+)$/);
    if (m) {
      var d = parseFloat(m[2]);
      if (!d) return null;
      return { v: parseFloat(m[1]) / d, pct: pct, frac: true };
    }
    if (/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/.test(s)) return { v: parseFloat(s), pct: pct, frac: false };
    return null;
  }

  // Compare a typed value with the key for a field.  kinds:
  //   num   plain number              ans in same units, tol absolute
  //   money plain number, $ ignored   (same as num)
  //   prob  probability: accepts 0.3, 30%, 30, 3/10     ans stored as a decimal 0..1
  //   pct   percent: accepts 52.4, 52.4%, 0.524 (unless dec:false), 21/40
  function fieldOk(field, typed) {
    var p = parseNum(typed);
    if (!p || !isFinite(p.v)) return false;
    var ans = field.ans, tol = field.tol != null ? field.tol : 0, kind = field.kind || 'num';
    var cands = [];
    if (kind === 'prob') {
      if (p.pct) cands.push(p.v / 100);
      else if (p.frac) cands.push(p.v);
      else { cands.push(p.v); if (p.v > 1) cands.push(p.v / 100); }
    } else if (kind === 'pct') {
      if (p.pct) cands.push(p.v);
      else if (p.frac) cands.push(p.v * 100);
      else { cands.push(p.v); if (field.dec !== false && Math.abs(p.v) <= 1 && Math.abs(ans) > 1) cands.push(p.v * 100); }
    } else {
      cands.push(p.pct ? p.v : p.v);
    }
    if (field.rel != null) tol = Math.max(tol, Math.abs(ans) * field.rel);
    for (var i = 0; i < cands.length; i++) if (Math.abs(cands[i] - ans) <= tol + 1e-9) return true;
    return false;
  }

  // ratio field: typed {a,b}; proportional equivalents accepted (3:7 == 6:14); both must be positive
  function ratioOk(field, a, b) {
    var pa = parseNum(a), pb = parseNum(b);
    if (!pa || !pb || pa.v <= 0 || pb.v <= 0) return false;
    return Math.abs(pa.v * field.ans[1] - pb.v * field.ans[0]) < 1e-9 * Math.max(1, pa.v * field.ans[1]);
  }

  // ------------------------------------------------------------------------------------ simulation cores
  // Lab seeds are small integers drawn from a vetted pool (SEED_POOL, built by tools/seeds.js) so every
  // student's own data shows the lesson (e.g. percent heads settling toward 50% as flips grow).
  function coinHeads(seed, i) { return u01(seed, i) < 0.5; }
  function coinStats(seed, n) {
    var heads = 0, streak = 0, best = 0, prev = null, bestEnd = 0;
    for (var i = 0; i < n; i++) {
      var h = coinHeads(seed, i);
      if (h) heads++;
      if (prev === h) streak++; else streak = 1;
      if (streak > best) { best = streak; bestEnd = i; }
      prev = h;
    }
    return { n: n, heads: heads, tails: n - heads, pctHeads: n ? 100 * heads / n : 0, longest: best, longestEnd: bestEnd };
  }
  function dieRoll(seed, i) { return 1 + Math.floor(u01(seed ^ 0x5bd1e995, i) * 6); }
  function dieCounts(seed, n) {
    var c = [0, 0, 0, 0, 0, 0];
    for (var i = 0; i < n; i++) c[dieRoll(seed, i) - 1]++;
    return c;
  }

  // House-edge lab: class "High/Low" dice game.  Bet `bet` tokens on High (4-6) or Low (1-3).  A win pays
  // `win` tokens of PROFIT (1.8 for a 2-token bet in class; a fair game would pay 2).  A loss costs the bet.
  var HOUSE_GAME = { bet: 2, win: 1.8, start: 100, p: 0.5 };
  function houseRun(seed, rounds, side, game) {
    game = game || HOUSE_GAME;
    var bal = game.start, wins = 0, series = [bal];
    for (var i = 0; i < rounds; i++) {
      var d = dieRoll(seed ^ 0x2545F491, i), isHigh = d >= 4;
      var won = side === 'high' ? isHigh : !isHigh;
      if (won) { bal += game.win; wins++; } else { bal -= game.bet; }
      series.push(Math.round(bal * 100) / 100);
    }
    return { balance: Math.round(bal * 100) / 100, wins: wins, losses: rounds - wins, series: series };
  }
  function houseExpected(rounds, game) {
    game = game || HOUSE_GAME;
    var ev = game.p * game.win - (1 - game.p) * game.bet;
    return { perRound: Math.round(ev * 1e6) / 1e6, total: Math.round(ev * rounds * 100) / 100, balance: Math.round((game.start + ev * rounds) * 100) / 100, edgePct: Math.round(-ev / game.bet * 1e6) / 1e4 };
  }

  // Near-miss dartboard and spinner outcomes (probabilities fixed, shown to the student after the activity)
  var DART = { bullseye: 1 / 12, near: 5 / 12 };   // everything else is an obvious miss
  function dartOutcome(seed, i) {
    var u = u01(seed ^ 0x1b873593, i);
    return u < DART.bullseye ? 'bullseye' : (u < DART.bullseye + DART.near ? 'near' : 'miss');
  }

  // ------------------------------------------------------------------------------------ small utilities
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtNum(x, dp) {
    if (typeof x !== 'number' || !isFinite(x)) return String(x);
    var s = x.toFixed(dp == null ? 2 : dp);
    if (dp == null) s = s.replace(/\.?0+$/, '');
    return s;
  }
  function fmtMoney(x, dp) { var neg = x < 0; var s = Math.abs(x).toFixed(dp == null ? 2 : dp); return (neg ? '-$' : '$') + s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function commas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  var api = {
    MAX_ATTEMPTS: MAX_ATTEMPTS, ATTEMPT_CREDIT: ATTEMPT_CREDIT, TIME_LIMIT_MIN: TIME_LIMIT_MIN, BLOCKS: BLOCKS, TEACHER_SHORTCUT: TEACHER_SHORTCUT,
    creditFor: creditFor, round1: round1, round2: round2,
    hashStr: hashStr, u01: u01, rng: rng,
    cleanText: cleanText, normName: normName, normId: normId, validId: validId, normCode: normCode,
    parseNum: parseNum, fieldOk: fieldOk, ratioOk: ratioOk,
    coinHeads: coinHeads, coinStats: coinStats, dieRoll: dieRoll, dieCounts: dieCounts,
    HOUSE_GAME: HOUSE_GAME, houseRun: houseRun, houseExpected: houseExpected, DART: DART, dartOutcome: dartOutcome,
    esc: esc, fmtNum: fmtNum, fmtMoney: fmtMoney, commas: commas
  };
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  root.U5 = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
