/*
 * seededRandom.js — deterministic pseudo-random numbers for PARLAY LAB.
 *
 * seedString -> hash (cyrb128) -> PRNG (sfc32)
 *
 * Everything that decides the SIMULATED GAME must use this file, never Math.random().
 * The same seed string always gives exactly the same stream of numbers, on every
 * computer, so every student who enters the same class code watches the same game.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};

  var MAX_SEED_LENGTH = 64;

  /** 128-bit string hash (public-domain "cyrb128"). Returns four unsigned 32-bit ints. */
  function hashString(str) {
    var h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (var i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
  }

  /** sfc32 generator: small, fast, good statistical quality. Returns floats in [0,1). */
  function sfc32(a, b, c, d) {
    return function () {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      var t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }

  /**
   * createSeededRandom("HEALTH101") -> rng object.
   * rng.next() float [0,1); rng.int(a,b) inclusive; rng.chance(p); rng.normal(mean,sd);
   * rng.pick(arr); rng.weighted(weights) -> index; rng.shuffle(arr); rng.fork(label) -> independent child stream.
   */
  function createSeededRandom(seedString) {
    var seed = String(seedString);
    var h = hashString(seed);
    var gen = sfc32(h[0], h[1], h[2], h[3]);
    for (var i = 0; i < 15; i++) gen(); // warm-up

    var rng = {
      seed: seed,
      next: gen,
      range: function (a, b) { return a + (b - a) * gen(); },
      int: function (a, b) { return a + Math.floor(gen() * (b - a + 1)); },
      chance: function (p) { return gen() < p; },
      // Irwin–Hall approximation (sum of 12 uniforms). Uses only + and − so every browser,
      // on every computer, produces bit-identical numbers (no Math.log/Math.cos differences).
      normal: function (mean, sd) {
        var s = 0;
        for (var i = 0; i < 12; i++) s += gen();
        return (mean || 0) + (sd === undefined ? 1 : sd) * (s - 6);
      },
      pick: function (arr) { return arr[Math.floor(gen() * arr.length)]; },
      weighted: function (weights) {
        var total = 0, i;
        for (i = 0; i < weights.length; i++) total += weights[i];
        var r = gen() * total;
        for (i = 0; i < weights.length; i++) {
          r -= weights[i];
          if (r < 0) return i;
        }
        return weights.length - 1;
      },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
          var j = Math.floor(gen() * (i + 1));
          var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
      },
      fork: function (label) { return createSeededRandom(seed + '|' + label); }
    };
    return rng;
  }

  /**
   * Clean up whatever a student/teacher typed as a class code.
   * Returns {ok, seed, truncated, error}.
   */
  function normalizeSeed(raw) {
    var s = String(raw == null ? '' : raw).replace(/[\u0000-\u001f]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (!s) return { ok: false, seed: '', error: 'Please enter a class code, or choose Individual Practice.' };
    if (!/^[A-Z0-9 _\-]+$/.test(s)) {
      return { ok: false, seed: s, error: 'Class codes use letters, numbers, spaces, - or _ only.' };
    }
    var truncated = false;
    if (s.length > MAX_SEED_LENGTH) { s = s.slice(0, MAX_SEED_LENGTH).trim(); truncated = true; }
    return { ok: true, seed: s, truncated: truncated };
  }

  /** Short random class code like "H7K4P2" (no look-alike characters). Not used for any game outcome. */
  function generateClassCode(length) {
    var alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var n = length || 6, out = '', i;
    var buf = null;
    try {
      if (root.crypto && root.crypto.getRandomValues) { buf = new Uint32Array(n); root.crypto.getRandomValues(buf); }
    } catch (e) { buf = null; }
    for (i = 0; i < n; i++) {
      var r = buf ? buf[i] : Math.floor(Math.random() * 4294967296);
      out += alphabet.charAt(r % alphabet.length);
    }
    return out;
  }

  PL.hashString = hashString;
  PL.createSeededRandom = createSeededRandom;
  PL.normalizeSeed = normalizeSeed;
  PL.generateClassCode = generateClassCode;
  PL.MAX_SEED_LENGTH = MAX_SEED_LENGTH;
})(typeof window !== 'undefined' ? window : globalThis);
