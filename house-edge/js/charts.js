/* THE HOUSE EDGE — self-contained canvas charts (no libraries). */
(function (root) {
  'use strict';
  var HE = root.HE = root.HE || {}, UI = HE.UI, E = HE.Engine;
  var Ch = HE.Charts = {};
  var COL = { ink: '#e8ecff', dim: '#8d96c4', grid: 'rgba(160,170,220,.18)', a: '#ffd43b', b: '#4dd0ff', c: '#ff6b81', d: '#7ee787', e: '#c9a7ff' };
  Ch.COL = COL;

  function setup(cv) {
    var dpr = Math.min(2, root.devicePixelRatio || 1), w = cv.clientWidth || +cv.getAttribute('width') || 600, h = +cv.getAttribute('data-h') || cv.clientHeight || 260;
    cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    return { g: g, w: w, h: h };
  }
  function anim(draw, ms) {
    if (UI.reduced || !ms) { draw(1); return; }
    var t0 = performance.now();
    (function f(t) { var k = Math.min(1, (t - t0) / ms); draw(1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(f); })(t0);
  }
  function text(g, s, x, y, o) { o = o || {}; g.fillStyle = o.c || COL.ink; g.font = (o.f || '12px system-ui,sans-serif'); g.textAlign = o.a || 'left'; g.textBaseline = o.b || 'alphabetic'; g.fillText(s, x, y); }

  /* ---- distribution histogram with overlays and markers ---- */
  Ch.hist = function (cv, o) {
    var S = setup(cv), g = S.g, W = S.w, H = S.h, L = 14, R = 14, T = 44, B = 40, pw = W - L - R, ph = H - T - B;
    var series = [{ counts: o.counts, color: o.color || COL.b }].concat(o.overlays || []);
    var nb = o.counts.length, max = 1;
    series.forEach(function (s) { var tot = s.counts.reduce(function (a, b) { return a + b; }, 0) || 1; s.n = tot; s.counts.forEach(function (c) { var f = o.normalize ? c / tot : c; if (f > max || max === 1 && f > 0) max = Math.max(max, f); }); });
    max = 0; series.forEach(function (s) { s.counts.forEach(function (c) { var f = o.normalize ? c / s.n : c; if (f > max) max = f; }); }); max = max || 1;
    var bw = pw / nb, xOf = function (v) { return L + (v - o.lo) / (o.hi - o.lo) * pw; };
    anim(function (k) {
      g.clearRect(0, 0, W, H);
      g.strokeStyle = COL.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(L, T + ph + .5); g.lineTo(W - R, T + ph + .5); g.stroke();
      series.forEach(function (s, si) {
        g.fillStyle = s.color; g.globalAlpha = series.length > 1 ? .55 : .9;
        s.counts.forEach(function (c, i) {
          var f = o.normalize ? c / s.n : c, bh = f / max * ph * k;
          g.fillRect(L + i * bw + 1, T + ph - bh, Math.max(1, bw - 2), bh);
        });
      }); g.globalAlpha = 1;
      if (o.lo < 0 && o.hi > 0) { var zx = xOf(0); g.strokeStyle = COL.dim; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(zx, T); g.lineTo(zx, T + ph); g.stroke(); g.setLineDash([]); text(g, 'BREAK EVEN', zx, T + ph + 28, { a: 'center', c: COL.dim, f: '11px system-ui' }); }
      text(g, o.leftLabel || '← LARGE LOSS', L, H - 6, { c: COL.c, f: 'bold 12px system-ui' });
      text(g, o.rightLabel || 'LARGE WIN →', W - R, H - 6, { a: 'right', c: COL.d, f: 'bold 12px system-ui' });
      text(g, E.fmt(o.lo, 0), L, T + ph + 14, { c: COL.dim, f: '11px system-ui' }); text(g, E.fmt(o.hi, 0), W - R, T + ph + 14, { a: 'right', c: COL.dim, f: '11px system-ui' });
      (o.markers || []).forEach(function (m, i) {
        if (k < 1 && !o.markersAlways) return;
        var x = Math.max(L + 2, Math.min(W - R - 2, xOf(m.x))), y0 = 12 + (i % 2) * 15;
        g.strokeStyle = m.color || COL.a; g.lineWidth = 2; g.setLineDash(m.dash ? [5, 4] : []); g.beginPath(); g.moveTo(x, y0 + 14); g.lineTo(x, T + ph); g.stroke(); g.setLineDash([]);
        g.fillStyle = m.color || COL.a; g.beginPath(); g.moveTo(x, y0 + 16); g.lineTo(x - 6, y0 + 7); g.lineTo(x + 6, y0 + 7); g.closePath(); g.fill();
        var tx = x < 100 ? x - 2 : (x > W - 120 ? x + 2 : x), ta = x < 100 ? 'left' : (x > W - 120 ? 'right' : 'center');
        text(g, m.label, tx, y0 + 3, { a: ta, c: m.color || COL.a, f: 'bold 12px system-ui' });
      });
    }, o.animate === false ? 0 : 650);
    if (o.alt) cv.setAttribute('aria-label', o.alt);
  };

  /* ---- vertical bars (e.g. dice totals) with optional theory outline ---- */
  Ch.vbars = function (cv, o) {
    var S = setup(cv), g = S.g, W = S.w, H = S.h, L = 30, R = 10, T = 14, B = 34, pw = W - L - R, ph = H - T - B, n = o.values.length;
    var max = Math.max.apply(null, o.values.concat(o.theory || [], [1])), bw = pw / n;
    g.strokeStyle = COL.grid; g.beginPath(); g.moveTo(L, T + ph + .5); g.lineTo(W - R, T + ph + .5); g.stroke();
    o.values.forEach(function (v, i) {
      var bh = v / max * ph; g.fillStyle = o.color || COL.b; g.fillRect(L + i * bw + 3, T + ph - bh, bw - 6, bh);
      text(g, o.labels[i], L + i * bw + bw / 2, H - 14, { a: 'center', c: COL.dim }); if (v) text(g, E.fmt(v, o.dec || 0), L + i * bw + bw / 2, T + ph - bh - 3, { a: 'center', f: '10px system-ui', c: COL.ink });
    });
    if (o.theory) { g.strokeStyle = COL.a; g.lineWidth = 2; o.theory.forEach(function (v, i) { var y = T + ph - v / max * ph; g.beginPath(); g.moveTo(L + i * bw + 2, y); g.lineTo(L + (i + 1) * bw - 2, y); g.stroke(); }); text(g, o.theoryLabel || 'expected', W - R, T + 10, { a: 'right', c: COL.a, f: 'bold 11px system-ui' }); }
    if (o.xlabel) text(g, o.xlabel, W / 2, H - 1, { a: 'center', c: COL.dim, f: '11px system-ui' });
  };

  /* ---- line chart (balance paths, convergence) ---- */
  Ch.lines = function (cv, o) {
    var S = setup(cv), g = S.g, W = S.w, H = S.h, L = 52, R = 12, T = 14, B = 26, pw = W - L - R, ph = H - T - B, mn = Infinity, mx = -Infinity, xm = 0;
    o.series.forEach(function (s) { s.ys.forEach(function (v) { if (v < mn) mn = v; if (v > mx) mx = v; }); if (s.ys.length - 1 > xm) xm = s.ys.length - 1; });
    if (o.min != null) mn = Math.min(mn, o.min); if (o.max != null) mx = Math.max(mx, o.max);
    if (o.zero) { mn = Math.min(mn, 0); mx = Math.max(mx, 0); } if (mx === mn) { mx += 1; mn -= 1; }
    var pad = (mx - mn) * .06; mn -= pad; mx += pad; xm = xm || 1;
    var X = function (i) { return L + i / xm * pw; }, Y = function (v) { return T + ph - (v - mn) / (mx - mn) * ph; };
    anim(function (k) {
      g.clearRect(0, 0, W, H); g.strokeStyle = COL.grid; g.lineWidth = 1; g.fillStyle = COL.dim;
      for (var i = 0; i <= 4; i++) { var v = mn + (mx - mn) * i / 4, y = Y(v); g.beginPath(); g.moveTo(L, y + .5); g.lineTo(W - R, y + .5); g.stroke(); text(g, E.fmt(v, o.dec == null ? (mx - mn < 8 ? 2 : 0) : o.dec) + (o.unit || ''), L - 6, y + 4, { a: 'right', c: COL.dim, f: '11px system-ui' }); }
      if (o.zero || (mn < 0 && mx > 0)) { g.strokeStyle = COL.dim; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(W - R, Y(0)); g.stroke(); g.setLineDash([]); }
      o.series.forEach(function (s) {
        var len = s.ys.length, step = Math.max(1, Math.floor(len / 700)), upto = Math.floor((len - 1) * k);
        g.strokeStyle = s.color; g.lineWidth = s.w || 2; g.setLineDash(s.dash ? [6, 4] : []); g.beginPath();
        for (var j = 0; j <= upto; j += step) { var x = X(j), y = Y(s.ys[j]); if (j === 0) g.moveTo(x, y); else g.lineTo(x, y); }
        if (upto === len - 1 && (upto % step)) g.lineTo(X(upto), Y(s.ys[upto])); g.stroke(); g.setLineDash([]);
      });
      var lx = L + 6; o.series.forEach(function (s) { if (!s.label) return; g.fillStyle = s.color; g.fillRect(lx, T + 2, 12, 4); text(g, s.label, lx + 16, T + 8, { c: COL.ink, f: '11px system-ui' }); lx += 30 + s.label.length * 6.2; });
      if (o.xlabel) text(g, o.xlabel, W - R, H - 6, { a: 'right', c: COL.dim, f: '11px system-ui' });
    }, o.animate === false ? 0 : 700);
  };

  /* ---- horizontal comparison bars (can be negative) ---- */
  Ch.hbars = function (cv, o) {
    var S = setup(cv), g = S.g, W = S.w, H = S.h, L = 170, R = 70, T = 8, n = o.items.length, rh = (H - T * 2) / n;
    var mx = Math.max.apply(null, o.items.map(function (i) { return Math.abs(i.value); }).concat([1e-9])), mid = L + (W - L - R) * (o.items.some(function (i) { return i.value < 0; }) ? (o.items.some(function (i) { return i.value > 0; }) ? .5 : 1) : 0), half = o.items.some(function (i) { return i.value < 0; }) && o.items.some(function (i) { return i.value > 0; }) ? (W - L - R) / 2 : (W - L - R);
    anim(function (k) {
      g.clearRect(0, 0, W, H);
      o.items.forEach(function (it, i) {
        var y = T + i * rh + rh * .18, bh = rh * .64, len = Math.abs(it.value) / mx * half * k, x = it.value >= 0 ? mid : mid - len;
        g.fillStyle = it.color || COL.b; g.fillRect(x, y, Math.max(2, len), bh);
        text(g, it.label, 6, y + bh / 2 + 4, { c: COL.ink, f: '13px system-ui' });
        var lab = (o.fmt ? o.fmt(it.value) : E.fmt(it.value, 1)); text(g, lab, it.value >= 0 ? x + len + 6 : x - 6, y + bh / 2 + 4, { a: it.value >= 0 ? 'left' : 'right', c: COL.ink, f: 'bold 13px system-ui' });
      });
      g.strokeStyle = COL.dim; g.beginPath(); g.moveTo(mid + .5, T); g.lineTo(mid + .5, H - T); g.stroke();
    }, 600);
  };

  /* ---- parlay survivors: observed bars vs theoretical ticks ---- */
  Ch.survivors = function (cv, o, upto) {
    var S = setup(cv), g = S.g, W = S.w, H = S.h, L = 12, R = 12, T = 22, B = 34, n = o.observed.length, pw = W - L - R, ph = H - T - B, bw = pw / n, max = o.observed[0] || 1;
    for (var i = 0; i < n; i++) {
      if (upto != null && i > upto) break;
      var h = o.observed[i] / max * ph, x = L + i * bw;
      g.fillStyle = COL.b; g.globalAlpha = .85; g.fillRect(x + 6, T + ph - h, bw - 12, h); g.globalAlpha = 1;
      text(g, E.fmt(o.observed[i], 0), x + bw / 2, T + ph - h - 4, { a: 'center', f: 'bold 12px system-ui' });
      text(g, i === 0 ? 'BEGIN' : 'Leg ' + i, x + bw / 2, H - 16, { a: 'center', c: COL.dim });
      if (o.theory) { var ty = T + ph - o.theory[i] / max * ph; g.strokeStyle = COL.a; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 2, ty); g.lineTo(x + bw - 2, ty); g.stroke(); }
    }
    if (o.theory) { g.fillStyle = COL.a; g.fillRect(W - 190, 6, 14, 3); text(g, 'theoretical expectation', W - 172, 10, { c: COL.a, f: '11px system-ui' }); }
  };

  /* ---- dot plot (up to 10,000 dots, binned & stacked) ---- */
  Ch.dots = function (cv, o) {
    var S = setup(cv), g = S.g, W = S.w, H = S.h, L = 14, R = 14, T = 30, B = 30, pw = W - L - R, ph = H - T - B, n = o.values.length, nb = Math.max(20, Math.min(70, Math.floor(pw / 9)));
    var bins = new Array(nb).fill(0), w = (o.hi - o.lo) / nb, xOf = function (v) { return L + (v - o.lo) / (o.hi - o.lo) * pw; };
    var r = Math.max(1, Math.min(5, pw / nb / 2 - .5)), cap = Math.floor(ph / (r * 2 + .5)), scale = 1, i;
    o.values.forEach(function (v) { var b = Math.min(nb - 1, Math.max(0, Math.floor((v - o.lo) / w))); bins[b]++; });
    var mb = Math.max.apply(null, bins); if (mb > cap) scale = cap / mb;
    g.strokeStyle = COL.grid; g.beginPath(); g.moveTo(L, T + ph + .5); g.lineTo(W - R, T + ph + .5); g.stroke();
    if (o.lo < 0 && o.hi > 0) { g.strokeStyle = COL.dim; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(xOf(0), T); g.lineTo(xOf(0), T + ph); g.stroke(); g.setLineDash([]); }
    for (i = 0; i < nb; i++) {
      var c = Math.max(bins[i] ? 1 : 0, Math.round(bins[i] * scale)), cx = L + (i + .5) * pw / nb, mid = (o.lo + (i + .5) * w);
      g.fillStyle = mid >= 0 ? COL.d : COL.c; g.globalAlpha = .85;
      for (var k = 0; k < c; k++) { g.beginPath(); g.arc(cx, T + ph - r - k * (r * 2 + .5), r, 0, 6.3); g.fill(); }
    } g.globalAlpha = 1;
    text(g, '← LARGE LOSS', L, H - 8, { c: COL.c, f: 'bold 12px system-ui' }); text(g, 'LARGE WIN →', W - R, H - 8, { a: 'right', c: COL.d, f: 'bold 12px system-ui' });
    if (o.marker != null) { var x = Math.max(L + 4, Math.min(W - R - 4, xOf(o.marker.x))); g.strokeStyle = COL.a; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 18); g.lineTo(x, T + ph); g.stroke(); g.fillStyle = COL.a; g.beginPath(); g.arc(x, T + ph - 5, 6, 0, 6.3); g.fill(); text(g, o.marker.label, Math.max(60, Math.min(W - 60, x)), 12, { a: 'center', c: COL.a, f: 'bold 12px system-ui' }); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
