/**
 * Stats.gs - the growth math. Pure functions: no Google services, so the exact same file is loaded by the
 * Node tests (tests/unit.js). Percent scores are on a 0-100 scale throughout.
 *
 *   Raw gain            = post - pre
 *   Normalized gain g   = (post - pre) / (100 - pre)            (Hake). Not defined when pre = 100 ("ceiling").
 *   Class <g>           = (mean post - mean pre) / (100 - mean pre)   (Hake's class-average definition)
 *   Paired effect size  = mean(post - pre) / SD(post - pre)           (dz)
 *
 * Gain metrics use MATCHED PAIRS only (students with both a warm-up and an exit-ticket score for the lesson).
 */
var Stats = (function () {
  function mean(xs) {
    if (!xs.length) return null;
    var s = 0;
    for (var i = 0; i < xs.length; i++) s += xs[i];
    return s / xs.length;
  }

  // Sample standard deviation (n - 1). Null for fewer than two values.
  function sd(xs) {
    var n = xs.length;
    if (n < 2) return null;
    var m = mean(xs), s = 0;
    for (var i = 0; i < n; i++) s += (xs[i] - m) * (xs[i] - m);
    return Math.sqrt(s / (n - 1));
  }

  function round(x, d) {
    if (x === null || x === undefined || isNaN(x)) return null;
    var p = Math.pow(10, d === undefined ? 1 : d);
    return Math.round(x * p) / p;
  }

  function pct(raw, max) {
    return max > 0 ? 100 * raw / max : null;
  }

  // Individual normalized gain. Null when either score is missing or pre is already 100.
  function hakeG(pre, post) {
    if (pre === null || post === null || pre === undefined || post === undefined) return null;
    if (pre >= 100) return null;
    return (post - pre) / (100 - pre);
  }

  // Paired effect size. Null with fewer than 2 pairs; 0 when every difference is 0; null when all differences are
  // identical but not 0 (the spread is zero, so the ratio is undefined).
  function dz(diffs) {
    if (diffs.length < 2) return null;
    var s = sd(diffs), m = mean(diffs);
    if (s === 0) return m === 0 ? 0 : null;
    return m / s;
  }

  /**
   * One row per student x lesson from raw score rows.
   * scores: [{student_id, lesson_id, phase: 'pre'|'post', pct}]. If a student has two rows for the same phase the
   * later one wins (the backend prevents duplicates; this just keeps the math safe).
   */
  function growthRows(scores) {
    var map = {}, order = [];
    scores.forEach(function (s) {
      var k = s.student_id + '|' + s.lesson_id;
      if (!map[k]) { map[k] = { student_id: s.student_id, lesson_id: s.lesson_id, pre: null, post: null }; order.push(k); }
      map[k][s.phase] = s.pct;
    });
    return order.map(function (k) {
      var r = map[k], matched = r.pre !== null && r.post !== null;
      r.status = matched ? 'matched' : (r.pre !== null ? 'pre only' : 'post only');
      r.gain = matched ? r.post - r.pre : null;
      r.g = matched ? hakeG(r.pre, r.post) : null;
      r.ceiling = matched && r.pre >= 100;
      return r;
    });
  }

  /**
   * Class summary for a set of growth rows (one lesson, optionally one period).
   * Gain numbers use matched pairs; "% mastery" uses everyone who has an exit-ticket score.
   */
  function summarize(rows, threshold) {
    var matched = rows.filter(function (r) { return r.status === 'matched'; });
    var posts = rows.filter(function (r) { return r.post !== null; });
    var diffs = matched.map(function (r) { return r.post - r.pre; });
    var gs = matched.filter(function (r) { return !r.ceiling; }).map(function (r) { return r.g; });
    var mp = mean(matched.map(function (r) { return r.pre; }));
    var mq = mean(matched.map(function (r) { return r.post; }));
    var share = function (n, d) { return d ? 100 * n / d : null; };
    return {
      n_matched: matched.length,
      n_pre_only: rows.filter(function (r) { return r.status === 'pre only'; }).length,
      n_post_only: rows.filter(function (r) { return r.status === 'post only'; }).length,
      mean_pre: mp,
      mean_post: mq,
      mean_gain: mean(diffs),
      class_g: mp === null ? null : hakeG(mp, mq),
      mean_individual_g: gs.length ? mean(gs) : null,
      n_ceiling: matched.length - gs.length,
      dz: dz(diffs),
      n_post: posts.length,
      pct_mastery: share(posts.filter(function (r) { return r.post >= threshold; }).length, posts.length),
      pct_gained: share(diffs.filter(function (d) { return d > 1e-9; }).length, diffs.length),
      pct_flat: share(diffs.filter(function (d) { return Math.abs(d) <= 1e-9; }).length, diffs.length),
      pct_declined: share(diffs.filter(function (d) { return d < -1e-9; }).length, diffs.length)
    };
  }

  /**
   * Per-criterion pre vs post for ONE lesson, matched students only.
   * responses: [{student_id, phase, criterion_id, points}] with points 0..1 (1 = fully correct).
   * matchedIds: {student_id: true}. Returns {criterion_id: {pre, post, gain, n, reteach}}.
   * "Reteach candidate" = post below the mastery threshold OR gain under 10 points, EXCEPT when the class was already at
   * or above the mastery line at the warm-up and stayed there ("already strong": nothing to reteach).
   */
  function criterionStats(responses, matchedIds, threshold) {
    var acc = {};
    responses.forEach(function (r) {
      if (!matchedIds[r.student_id]) return;
      var c = acc[r.criterion_id] || (acc[r.criterion_id] = { pre: [], post: [], ids: {} });
      c[r.phase].push(r.points);
      c.ids[r.student_id] = true;
    });
    var out = {};
    Object.keys(acc).forEach(function (cid) {
      var c = acc[cid];
      var pre = c.pre.length ? 100 * mean(c.pre) : null, post = c.post.length ? 100 * mean(c.post) : null;
      var gain = pre === null || post === null ? null : post - pre;
      var known = pre !== null && post !== null && pre >= threshold && post >= threshold;
      out[cid] = {
        pre: pre, post: post, gain: gain, n: Object.keys(c.ids).length, already_known: known,
        reteach: post !== null && !known && (post < threshold || (gain !== null && gain < 10))
      };
    });
    return out;
  }

  return { mean: mean, sd: sd, round: round, pct: pct, hakeG: hakeG, dz: dz,
           growthRows: growthRows, summarize: summarize, criterionStats: criterionStats };
})();
