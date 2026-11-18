/* OUTBREAK CITY: core utilities (seeded RNG, iso math, pathfinding, encoding) */
(function (root) {
  'use strict';
  var NS = root.OutbreakCity = root.OutbreakCity || {};
  var C = NS.core = {};

  /* ---------------- Seeded RNG ---------------- */
  // String -> 32-bit hash (cyrb-style). Same string = same hash on every device.
  C.hashStr = function (str) {
    str = String(str);
    var h1 = 0xdeadbeef ^ str.length, h2 = 0x41c6ce57 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ((h2 & 0x1fffff) * 4294967296 + (h1 >>> 0)) >>> 0 || 1;
  };

  // mulberry32: tiny, fast, deterministic.
  function RNG(seed) { this.s = (seed >>> 0) || 1; }
  RNG.prototype.next = function () {
    this.s = (this.s + 0x6D2B79F5) >>> 0;
    var t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  RNG.prototype.int = function (n) { return Math.floor(this.next() * n); };
  RNG.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
  RNG.prototype.chance = function (p) { return this.next() < p; };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  RNG.prototype.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(this.next() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  };
  // Number of events for an expected count (Poisson-ish, cheap and deterministic)
  RNG.prototype.count = function (expected) {
    if (expected <= 0) return 0;
    var n = Math.floor(expected), f = expected - n;
    if (n > 30) return Math.round(expected + (this.next() - 0.5) * Math.sqrt(expected) * 2);
    var k = 0;
    for (var i = 0; i < n; i++) if (this.next() < 0.98) k++; else k += 2;
    if (this.next() < f) k++;
    return k;
  };
  RNG.prototype.exp = function (mean) { return -Math.log(1 - this.next() * 0.9999) * mean; };
  C.RNG = RNG;

  C.randomSeed = function () {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  };
  C.dailySeed = function (d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return 'DAY-' + d.getFullYear() + (m < 10 ? '0' : '') + m + (day < 10 ? '0' : '') + day;
  };
  C.cleanSeed = function (s) {
    s = String(s || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
    return s || C.randomSeed();
  };

  /* ---------------- Math ---------------- */
  C.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  C.lerp = function (a, b, t) { return a + (b - a) * t; };
  C.smooth = function (t) { t = C.clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  /* ---------------- Isometric projection (2:1) ----------------
     World/tile coordinates (x, y) on a flat grid -> iso pixels (before camera). */
  var HW = 32, HH = 16;
  C.ISO = {
    HW: HW, HH: HH,
    toIso: function (x, y, out) { out = out || {}; out.x = (x - y) * HW; out.y = (x + y) * HH; return out; },
    toWorld: function (ix, iy, out) { out = out || {}; var a = ix / HW, b = iy / HH; out.x = (a + b) / 2; out.y = (b - a) / 2; return out; },
    // A world-space circle of radius r becomes this ellipse in iso space
    ellipse: function (r) { return { rx: r * HW * Math.SQRT2, ry: r * HH * Math.SQRT2 }; }
  };

  /* ---------------- Binary heap ---------------- */
  function Heap(cap) { this.ids = new Int32Array(cap); this.pr = new Float32Array(cap); this.n = 0; }
  Heap.prototype.push = function (id, p) {
    var i = this.n++, ids = this.ids, pr = this.pr;
    while (i > 0) { var par = (i - 1) >> 1; if (pr[par] <= p) break; ids[i] = ids[par]; pr[i] = pr[par]; i = par; }
    ids[i] = id; pr[i] = p;
  };
  Heap.prototype.pop = function () {
    var ids = this.ids, pr = this.pr, top = ids[0];
    var n = --this.n; if (n <= 0) return top;
    var id = ids[n], p = pr[n], i = 0;
    for (;;) {
      var l = 2 * i + 1; if (l >= n) break;
      var r = l + 1, c = (r < n && pr[r] < pr[l]) ? r : l;
      if (pr[c] >= p) break;
      ids[i] = ids[c]; pr[i] = pr[c]; i = c;
    }
    ids[i] = id; pr[i] = p;
    return top;
  };

  /* ---------------- A* on a 4-connected grid ----------------
     costFn(idx) returns the cost of entering a tile, or Infinity if blocked. */
  function Pathfinder(W, H) {
    this.W = W; this.H = H; var N = W * H;
    this.g = new Float32Array(N); this.came = new Int32Array(N);
    this.stamp = new Uint32Array(N); this.closed = new Uint32Array(N); this.cur = 0;
    this.heap = new Heap(N * 4);
  }
  Pathfinder.prototype.find = function (from, to, costFn) {
    if (from === to) return [to];
    var W = this.W, g = this.g, came = this.came, stamp = this.stamp, closed = this.closed, heap = this.heap;
    var s = ++this.cur; heap.n = 0;
    var tx = to % W, ty = (to / W) | 0;
    g[from] = 0; stamp[from] = s; came[from] = -1;
    heap.push(from, 0);
    var nb = [0, 0, 0, 0], iter = 0;
    while (heap.n > 0) {
      var c = heap.pop();
      if (closed[c] === s) continue;
      closed[c] = s;
      if (c === to) break;
      if (++iter > 6000) return null;
      var cx = c % W, cy = (c / W) | 0, k = 0;
      if (cx > 0) nb[k++] = c - 1;
      if (cx < W - 1) nb[k++] = c + 1;
      if (cy > 0) nb[k++] = c - W;
      if (cy < this.H - 1) nb[k++] = c + W;
      for (var i = 0; i < k; i++) {
        var n = nb[i];
        if (closed[n] === s) continue;
        var cost = n === to ? 1 : costFn(n);
        if (cost === Infinity) continue;
        var ng = g[c] + cost;
        if (stamp[n] !== s || ng < g[n]) {
          stamp[n] = s; g[n] = ng; came[n] = c;
          var nx = n % W, ny = (n / W) | 0;
          heap.push(n, ng + Math.abs(nx - tx) + Math.abs(ny - ty));
        }
      }
    }
    if (closed[to] !== s) return null;
    var path = [], p = to;
    while (p !== -1) { path.push(p); p = came[p]; }
    path.reverse();
    return path;
  };
  C.Pathfinder = Pathfinder;

  /* ---------------- Encoding (completion codes) ---------------- */
  C.b64e = function (str) {
    var bytes = unescape(encodeURIComponent(str)), b;
    b = (typeof btoa !== 'undefined') ? btoa(bytes) : Buffer.from(bytes, 'binary').toString('base64');
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  C.b64d = function (s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bytes = (typeof atob !== 'undefined') ? atob(s) : Buffer.from(s, 'base64').toString('binary');
    return decodeURIComponent(escape(bytes));
  };
  C.checksum = function (str) {
    var h = C.hashStr('oc|' + str).toString(36).toUpperCase();
    return ('0000' + h).slice(-4);
  };

  C.fmtTime = function (s) { s = Math.max(0, Math.ceil(s)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; };
  C.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
})(typeof window !== 'undefined' ? window : globalThis);
