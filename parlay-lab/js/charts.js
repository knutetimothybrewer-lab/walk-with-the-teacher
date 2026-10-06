/*
 * charts.js — tiny dependency-free SVG chart builders (they return strings).
 * Every chart has role="img" and an aria-label summary so screen readers get the gist.
 * Animations are plain CSS (see animations.css) and switch off under prefers-reduced-motion.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), n = v / p;
    var m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return m * p;
  }
  function frame(w, h, label, inner) {
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label) + '" preserveAspectRatio="xMidYMid meet">' + inner + '</svg>';
  }
  var M = { l: 54, r: 14, t: 14, b: 40 };

  function axes(w, h, xTicks, yTicks, xLabel, yLabel, xs, ys) {
    var out = '', i;
    for (i = 0; i < yTicks.length; i++) {
      var y = ys(yTicks[i].v);
      out += '<line class="grid" x1="' + M.l + '" x2="' + (w - M.r) + '" y1="' + y + '" y2="' + y + '"/>' +
        '<text class="tick" x="' + (M.l - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + esc(yTicks[i].t) + '</text>';
    }
    for (i = 0; i < xTicks.length; i++) {
      var x = xs(xTicks[i].v);
      out += '<text class="tick" x="' + x + '" y="' + (h - M.b + 16) + '" text-anchor="middle">' + esc(xTicks[i].t) + '</text>';
    }
    out += '<line class="axis" x1="' + M.l + '" x2="' + (w - M.r) + '" y1="' + (h - M.b) + '" y2="' + (h - M.b) + '"/>' +
      '<line class="axis" x1="' + M.l + '" x2="' + M.l + '" y1="' + M.t + '" y2="' + (h - M.b) + '"/>';
    if (xLabel) out += '<text class="axlabel" x="' + ((M.l + w - M.r) / 2) + '" y="' + (h - 6) + '" text-anchor="middle">' + esc(xLabel) + '</text>';
    if (yLabel) out += '<text class="axlabel" transform="translate(12 ' + ((M.t + h - M.b) / 2) + ') rotate(-90)" text-anchor="middle">' + esc(yLabel) + '</text>';
    return out;
  }

  /**
   * series: [{name, cls, points:[{x,y}]}]; opts: {w,h,xMin,xMax,yMin,yMax,xTicks,yTicks,xLabel,yLabel,yFmt,label,hline:{v,label},markers:[{x,y,label}]}
   */
  function lineChart(series, o) {
    var w = o.w || 520, h = o.h || 280;
    var xMin = o.xMin, xMax = o.xMax, yMin = o.yMin === undefined ? 0 : o.yMin, yMax = o.yMax;
    var xs = function (v) { return M.l + (v - xMin) / (xMax - xMin || 1) * (w - M.l - M.r); };
    var ys = function (v) { return h - M.b - (v - yMin) / (yMax - yMin || 1) * (h - M.t - M.b); };
    var inner = axes(w, h, o.xTicks, o.yTicks, o.xLabel, o.yLabel, xs, ys);
    if (o.hline) {
      var yy = ys(o.hline.v);
      inner += '<line class="refline" x1="' + M.l + '" x2="' + (w - M.r) + '" y1="' + yy + '" y2="' + yy + '"/>' +
        '<text class="reftext" x="' + (w - M.r - 4) + '" y="' + (yy - 5) + '" text-anchor="end">' + esc(o.hline.label) + '</text>';
    }
    series.forEach(function (s, si) {
      var d = s.points.map(function (p, i) { return (i ? 'L' : 'M') + xs(p.x).toFixed(1) + ' ' + ys(Math.max(yMin, Math.min(yMax, p.y))).toFixed(1); }).join(' ');
      inner += '<path class="line ' + (s.cls || 'c' + (si % 6)) + '" d="' + d + '" pathLength="1"/>';
      if (s.dots) s.points.forEach(function (p) {
        inner += '<circle class="dot ' + (s.cls || 'c' + (si % 6)) + '" cx="' + xs(p.x).toFixed(1) + '" cy="' + ys(Math.max(yMin, Math.min(yMax, p.y))).toFixed(1) + '" r="3.6"/>';
      });
    });
    (o.markers || []).forEach(function (m) {
      inner += '<circle class="marker" cx="' + xs(m.x) + '" cy="' + ys(m.y) + '" r="5"/><text class="markertext" x="' + (xs(m.x) + 8) + '" y="' + (ys(m.y) - 8) + '">' + esc(m.label) + '</text>';
    });
    if (o.legend) {
      o.legend.forEach(function (l, i) {
        inner += '<g transform="translate(' + (M.l + 8 + i * 110) + ' ' + (M.t + 6) + ')"><line class="line ' + l.cls + '" x1="0" x2="18" y1="0" y2="0" style="animation:none;stroke-dasharray:none"/><text class="tick" x="23" y="4">' + esc(l.name) + '</text></g>';
      });
    }
    return frame(w, h, o.label || 'Line chart', inner);
  }

  /** bars: [{label, value, cls, sub}] */
  function barChart(bars, o) {
    var w = o.w || 520, h = o.h || 280, yMax = o.yMax || niceMax(Math.max.apply(null, bars.map(function (b) { return b.value; })));
    var yMin = o.yMin || 0;
    var bw = (w - M.l - M.r) / bars.length;
    var ys = function (v) { return h - M.b - (v - yMin) / (yMax - yMin || 1) * (h - M.t - M.b); };
    var yTicks = o.yTicks || [0, 0.25, 0.5, 0.75, 1].map(function (f) { var v = yMin + f * (yMax - yMin); return { v: v, t: o.yFmt ? o.yFmt(v) : Math.round(v) }; });
    var inner = axes(w, h, [], yTicks, o.xLabel, o.yLabel, function () { return 0; }, ys);
    if (o.hline) {
      var yy = ys(o.hline.v);
      inner += '<line class="refline" x1="' + M.l + '" x2="' + (w - M.r) + '" y1="' + yy + '" y2="' + yy + '"/><text class="reftext" x="' + (w - M.r - 4) + '" y="' + (yy - 5) + '" text-anchor="end">' + esc(o.hline.label) + '</text>';
    }
    bars.forEach(function (b, i) {
      var x = M.l + i * bw + bw * 0.14, bwid = bw * 0.72, y0 = ys(Math.max(yMin, 0)), y1 = ys(b.value);
      var top = Math.min(y0, y1), ht = Math.max(1, Math.abs(y1 - y0));
      inner += '<rect class="bar ' + (b.cls || 'c0') + '" x="' + x.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bwid.toFixed(1) + '" height="' + ht.toFixed(1) + '" rx="2" style="animation-delay:' + (i * 30) + 'ms"><title>' + esc(b.label + ': ' + (o.valFmt ? o.valFmt(b.value) : b.value)) + '</title></rect>' +
        '<text class="tick" x="' + (x + bwid / 2).toFixed(1) + '" y="' + (h - M.b + 15) + '" text-anchor="middle">' + esc(b.label) + '</text>';
      if (o.showValues) inner += '<text class="valtext" x="' + (x + bwid / 2).toFixed(1) + '" y="' + (top - 4).toFixed(1) + '" text-anchor="middle">' + esc(o.valFmt ? o.valFmt(b.value) : b.value) + '</text>';
    });
    return frame(w, h, o.label || 'Bar chart', inner);
  }

  /** Histogram of numbers. markers: [{x,label}] vertical reference lines. */
  function histogram(values, o) {
    var w = o.w || 520, h = o.h || 260, bins = o.bins || 20;
    var lo = o.min !== undefined ? o.min : Math.min.apply(null, values), hi = o.max !== undefined ? o.max : Math.max.apply(null, values);
    if (hi === lo) hi = lo + 1;
    var counts = new Array(bins).fill(0), i;
    values.forEach(function (v) { var k = Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / (hi - lo) * bins))); counts[k]++; });
    var yMax = niceMax(Math.max.apply(null, counts));
    var xs = function (v) { return M.l + (v - lo) / (hi - lo) * (w - M.l - M.r); };
    var ys = function (v) { return h - M.b - v / yMax * (h - M.t - M.b); };
    var xTicks = [], t = 5;
    for (i = 0; i <= t; i++) { var xv = lo + (hi - lo) * i / t; xTicks.push({ v: xv, t: o.xFmt ? o.xFmt(xv) : Math.round(xv) }); }
    var yTicks = [0, 0.5, 1].map(function (f) { return { v: f * yMax, t: Math.round(f * yMax) }; });
    var inner = axes(w, h, xTicks, yTicks, o.xLabel, o.yLabel || 'Count', xs, ys);
    var bw = (w - M.l - M.r) / bins;
    counts.forEach(function (c, k) {
      inner += '<rect class="bar ' + (o.cls || 'c0') + '" x="' + (M.l + k * bw + 1).toFixed(1) + '" y="' + ys(c).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + (h - M.b - ys(c)).toFixed(1) + '" style="animation-delay:' + (k * 15) + 'ms"><title>' + c + ' simulated students</title></rect>';
    });
    (o.markers || []).forEach(function (m) {
      if (m.x < lo || m.x > hi) return;
      inner += '<line class="refline" x1="' + xs(m.x) + '" x2="' + xs(m.x) + '" y1="' + M.t + '" y2="' + (h - M.b) + '"/><text class="reftext" x="' + (xs(m.x) + 4) + '" y="' + (M.t + 11) + '">' + esc(m.label) + '</text>';
    });
    return frame(w, h, o.label || 'Histogram', inner);
  }

  /** Strip plot: one column of dots per category. cols: [{label, values}] */
  function dotStrip(cols, o) {
    var w = o.w || 640, h = o.h || 300, yMin = o.yMin, yMax = o.yMax;
    var cw = (w - M.l - M.r) / cols.length;
    var ys = function (v) { return h - M.b - (Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin || 1) * (h - M.t - M.b); };
    var yTicks = [0, 0.25, 0.5, 0.75, 1].map(function (f) { var v = yMin + f * (yMax - yMin); return { v: v, t: o.yFmt ? o.yFmt(v) : Math.round(v) }; });
    var inner = axes(w, h, [], yTicks, o.xLabel, o.yLabel, function () { return 0; }, ys);
    if (o.hline) {
      var yy = ys(o.hline.v);
      inner += '<line class="refline" x1="' + M.l + '" x2="' + (w - M.r) + '" y1="' + yy + '" y2="' + yy + '"/><text class="reftext" x="' + (w - M.r - 4) + '" y="' + (yy - 5) + '" text-anchor="end">' + esc(o.hline.label) + '</text>';
    }
    cols.forEach(function (c, i) {
      var cx = M.l + cw * (i + 0.5);
      c.values.forEach(function (v, k) {
        var jitter = (((k * 2654435761) >>> 0) % 1000) / 1000 - 0.5;
        inner += '<circle class="sdot' + (v > o.hline.v ? ' up' : '') + '" cx="' + (cx + jitter * cw * 0.7).toFixed(1) + '" cy="' + ys(v).toFixed(1) + '" r="2.4"/>';
      });
      if (c.avg !== undefined) inner += '<line class="avgmark" x1="' + (cx - cw * 0.4) + '" x2="' + (cx + cw * 0.4) + '" y1="' + ys(c.avg) + '" y2="' + ys(c.avg) + '"/>';
      inner += '<text class="tick" x="' + cx + '" y="' + (h - M.b + 15) + '" text-anchor="middle">' + esc(c.label) + '</text>';
    });
    return frame(w, h, o.label || 'Dot plot', inner);
  }

  PL.Charts = { lineChart: lineChart, barChart: barChart, histogram: histogram, dotStrip: dotStrip, niceMax: niceMax, esc: esc };
})(typeof window !== 'undefined' ? window : globalThis);
