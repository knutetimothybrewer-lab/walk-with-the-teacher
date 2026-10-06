/* Attempt policy + deterministic scoring engine.
 *
 *   earned points = raw correctness fraction x item maximum x attempt cap     (cap = 100% / 90% / 75%)
 *   best earned value across permitted attempts is retained; decimals are kept, only the final total is rounded.
 *
 * Items are authored declaratively (see data/*.js). Every graded response is scored from an explicit key:
 *   - radio/select/chips : opts[].c credit map, or a compatibility matrix keyed by the student's other selections
 *   - multi              : choose exactly `pick`; credit = sum of option credits / best possible sum
 *   - num                : exact numeric key (optional tolerance)
 */
(function (root) {
  'use strict';
  var W = root.WWQ = root.WWQ || {};
  var U = W.U, EPS = 1e-9;

  W.ITEMS = []; W.ITEM_BY_ID = {}; W.ACTIVITIES = [];

  /* ---------- authoring helpers ---------- */
  // P(id, label, type, opts, extra) — opts entries: [id, text, credit]
  W.P = function (id, label, type, opts, extra) {
    var p = { id: id, label: label, type: type || 'radio', opts: opts || [] };
    if (extra) Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
    return p;
  };
  W.V = function (id, ctx, parts, extra) {
    var v = { id: id, ctx: ctx || '', parts: parts };
    if (extra) Object.keys(extra).forEach(function (k) { v[k] = extra[k]; });
    return v;
  };
  W.normItem = function (def) {
    def.d = def.d || 'A';
    def.variants.forEach(function (v) {
      v.parts.forEach(function (p) {
        p.w = p.w == null ? 1 : p.w;
        p.opts = (p.opts || []).map(function (o) { return Array.isArray(o) ? { id: o[0], t: o[1], c: o[2] || 0 } : o; });
        if (p.type === 'multi' && !p.pick) p.pick = 2;
      });
    });
    return def;
  };
  W.defItem = function (def) {
    W.normItem(def);
    if (W.ITEM_BY_ID[def.id]) throw new Error('Duplicate item id ' + def.id);
    W.ITEMS.push(def); W.ITEM_BY_ID[def.id] = def;
    return def;
  };
  W.defActivity = function (a) { W.ACTIVITIES.push(a); };

  var P = {};
  W.Policy = P;

  /* ---------- limits and caps ---------- */
  P.limitFor = function (item) {
    var cfg = W.CONFIG.attemptLimits[item.cls === 'short' ? 'short' : 'complex'];
    cfg = Math.max(2, Math.min(3, cfg | 0));
    return Math.min(cfg, item.variants.length, 3);
  };
  P.capFor = function (n) { var c = W.CONFIG.caps; return c[Math.max(0, Math.min(n, c.length) - 1)]; };

  /* ---------- scoring of one response against one variant ---------- */
  function depKey(part, all) {
    var deps = Array.isArray(part.dep) ? part.dep : [part.dep];
    return deps.map(function (d) { var v = all[d]; return Array.isArray(v) ? v.slice().sort().join('+') : v; }).join('|');
  }
  function row(part, all) {
    if (!part.dep) return null;
    var m = part.matrix || {};
    return m[depKey(part, all)] || m['*'] || {};
  }
  function optCredit(part, id, all) {
    var r = row(part, all);
    if (r) return r[id] || 0;
    for (var i = 0; i < part.opts.length; i++) if (part.opts[i].id === id) return part.opts[i].c || 0;
    return 0;
  }
  function isAnswered(part, v) {
    if (part.type === 'num') return v !== undefined && v !== null && v !== '' && isFinite(Number(v));
    if (part.type === 'multi') return Array.isArray(v) && v.length > 0;
    return v !== undefined && v !== null && v !== '';
  }
  function validPart(part, v) {
    if (!isAnswered(part, v)) return false;
    if (part.type === 'num') return true;
    var ids = part.opts.map(function (o) { return o.id; });
    if (part.type === 'multi') {
      if (v.length !== part.pick) return false;
      for (var i = 0; i < v.length; i++) if (ids.indexOf(v[i]) < 0 || v.indexOf(v[i]) !== i) return false;
      return true;
    }
    return typeof v === 'string' && ids.indexOf(v) >= 0;
  }
  function basePartCredit(part, v, all) {
    if (part.type === 'num') return Math.abs(Number(v) - part.key) <= (part.tol || 0) + EPS ? 1 : 0;
    if (part.type === 'multi') {
      var credits = part.opts.map(function (o) { return optCredit(part, o.id, all); }).sort(function (a, b) { return b - a; });
      var best = U.sum(credits.slice(0, part.pick));
      var got = U.sum(v.map(function (id) { return optCredit(part, id, all); }));
      return best > 0 ? Math.min(1, got / best) : 0;
    }
    return Math.min(1, optCredit(part, v, all));
  }

  P.optionCredit = function (part, id, all) { return optCredit(part, id, all || {}); };
  P.scoreResponse = function (variant, response) {
    response = response || {};
    var missing = [], invalid = [];
    variant.parts.forEach(function (p) {
      if (!isAnswered(p, response[p.id])) missing.push(p.id);
      else if (!validPart(p, response[p.id])) invalid.push(p.id);
    });
    if (missing.length || invalid.length) return { valid: false, missing: missing, invalid: invalid, raw: 0, parts: [] };
    var memo = {}, byId = {};
    variant.parts.forEach(function (p) { byId[p.id] = p; });
    function credit(p) {
      if (memo[p.id] !== undefined) return memo[p.id];
      var c = basePartCredit(p, response[p.id], response);
      if (p.dep && p.depCap !== undefined) {
        var deps = Array.isArray(p.dep) ? p.dep : [p.dep];
        var depZero = deps.some(function (d) { return byId[d] && credit(byId[d]) <= EPS; });
        if (depZero) c *= p.depCap;
      }
      memo[p.id] = c; return c;
    }
    var totalW = 0, got = 0, parts = variant.parts.map(function (p) {
      var c = credit(p); totalW += p.w; got += p.w * c;
      return { id: p.id, credit: c, w: p.w };
    });
    return { valid: true, raw: totalW ? got / totalW : 0, parts: parts };
  };

  /* ---------- per-item record ---------- */
  P.newRec = function () { return { attempts: [], draft: {}, finalized: false, best: 0, retryReady: false, finalizedReason: '', finalizedAt: null }; };
  P.variantAt = function (item, idx) { return item.variants[Math.min(idx, item.variants.length - 1)]; };
  P.mode = function (item, rec) {
    if (rec.finalized) return 'final';
    return rec.attempts.length > 0 && !rec.retryReady ? 'review' : 'draft';
  };
  P.currentVariant = function (item, rec) {
    var idx = P.mode(item, rec) === 'draft' ? rec.attempts.length : Math.max(0, rec.attempts.length - 1);
    return P.variantAt(item, idx);
  };
  P.attemptsLeft = function (item, rec) { return Math.max(0, P.limitFor(item) - rec.attempts.length); };
  P.nextCap = function (item, rec) { return P.capFor(rec.attempts.length + 1); };

  P.awarded = function (raw, pts, n) { return raw * pts * P.capFor(n); };

  P.submit = function (item, rec, response, nowIso) {
    if (rec.finalized) return { ok: false, reason: 'finalized' };
    if (P.mode(item, rec) !== 'draft') return { ok: false, reason: 'not-in-draft' };
    var limit = P.limitFor(item), n = rec.attempts.length + 1;
    if (n > limit) return { ok: false, reason: 'exhausted' };
    var variant = P.variantAt(item, n - 1), res = P.scoreResponse(variant, response);
    if (!res.valid) return { ok: false, reason: 'incomplete', missing: res.missing, invalid: res.invalid };
    var cap = P.capFor(n), awarded = res.raw * item.pts * cap, hintShown = res.raw < 1 - EPS;
    rec.attempts.push({
      n: n, variantId: variant.id, response: U.clone(response), raw: res.raw, rawPoints: res.raw * item.pts,
      cap: cap, awarded: awarded, parts: res.parts.map(function (p) { return { id: p.id, credit: p.credit }; }),
      hintShown: hintShown, at: nowIso || U.nowISO()
    });
    rec.best = Math.max(rec.best, awarded);
    rec.retryReady = false; rec.draft = {};
    if (n >= limit) P.finalize(rec, 'exhausted', nowIso);
    else if (res.raw >= 1 - EPS) P.finalize(rec, n === 1 ? 'full' : 'full-on-retry', nowIso);
    else if (rec.best >= item.pts * P.capFor(n + 1) - EPS) P.finalize(rec, 'no-gain', nowIso);
    return { ok: true, attempt: rec.attempts[rec.attempts.length - 1], finalized: rec.finalized };
  };
  P.finalize = function (rec, reason, nowIso) { rec.finalized = true; rec.finalizedReason = reason; rec.finalizedAt = nowIso || U.nowISO(); rec.retryReady = false; };
  P.keep = function (item, rec, nowIso) {
    if (rec.finalized || !rec.attempts.length) return false;
    P.finalize(rec, 'kept', nowIso); return true;
  };
  /* A voluntarily kept item can be reopened BEFORE final submission. Attempt counts never reset; only attempts that remain can be used. */
  P.canReopen = function (item, rec) { return rec.finalized && rec.finalizedReason === 'kept' && P.attemptsLeft(item, rec) > 0; };
  P.reopen = function (item, rec) { if (!P.canReopen(item, rec)) return false; rec.finalized = false; rec.finalizedReason = ''; rec.finalizedAt = null; rec.retryReady = false; return true; };
  P.startRetry = function (item, rec) {
    if (rec.finalized || P.mode(item, rec) !== 'review' || P.attemptsLeft(item, rec) < 1) return false;
    rec.retryReady = true; rec.draft = {}; return true;
  };

  /* ---------- hints (conceptual; never reveal the key) ---------- */
  P.hintsFor = function (item, rec) {
    var last = rec.attempts[rec.attempts.length - 1];
    if (!last) return { general: '', parts: [] };
    var v = P.variantAt(item, last.n - 1), out = [];
    last.parts.forEach(function (pr) {
      if (pr.credit < 1 - EPS) {
        var part = v.parts.filter(function (p) { return p.id === pr.id; })[0];
        out.push({ id: pr.id, label: part.label, hint: part.hint || '', credit: pr.credit });
      }
    });
    return { general: item.hint || '', parts: out };
  };

  /* ---------- totals / completion ---------- */
  var MISSION_MAX = { 1: 12, 2: 16, 3: 18, 4: 18, 5: 14, 6: 16, 7: 6 };
  P.MISSION_MAX = MISSION_MAX;
  P.totals = function (state) {
    var byMission = {}, earned = 0, first = 0, max = 0, finalized = 0, attemptsUsed = 0, attemptsAllowed = 0, unused = [];
    for (var m = 1; m <= 7; m++) byMission[m] = { earned: 0, max: 0, first: 0, items: 0, finalized: 0 };
    W.ITEMS.forEach(function (it) {
      var rec = state.items[it.id] || P.newRec(), bm = byMission[it.m];
      bm.max += it.pts; bm.items++; max += it.pts;
      bm.earned += rec.best; earned += rec.best;
      var f = rec.attempts[0] ? rec.attempts[0].awarded : 0; bm.first += f; first += f;
      if (rec.finalized) { bm.finalized++; finalized++; }
      attemptsUsed += rec.attempts.length; attemptsAllowed += P.limitFor(it);
      if (rec.finalized && rec.attempts.length < P.limitFor(it) && rec.finalizedReason !== 'full' && rec.finalizedReason !== 'full-on-retry' && rec.finalizedReason !== 'no-gain') unused.push(it.id);
      else if (!rec.finalized && rec.attempts.length) unused.push(it.id);
    });
    return { earned: earned, max: max, first: first, byMission: byMission, finalized: finalized, items: W.ITEMS.length, attemptsUsed: attemptsUsed, attemptsAllowed: attemptsAllowed, unusedRetryItems: unused };
  };
  P.completion = function (state) {
    var done = 0, total = W.ITEMS.length + W.ACTIVITIES.length;
    W.ITEMS.forEach(function (it) { if ((state.items[it.id] || {}).finalized) done++; });
    W.ACTIVITIES.forEach(function (a) { if (state.progress.activities[a.id]) done++; });
    return { done: done, total: total, pct: total ? Math.floor((done / total) * 1000) / 10 : 0 };
  };
  P.missionStatus = function (state, m) {
    var items = W.ITEMS.filter(function (i) { return i.m === m; }), acts = W.ACTIVITIES.filter(function (a) { return a.m === m; });
    var done = items.filter(function (i) { return (state.items[i.id] || {}).finalized; }).length + acts.filter(function (a) { return state.progress.activities[a.id]; }).length;
    var total = items.length + acts.length;
    return { done: done, total: total, complete: done === total };
  };
  P.maxByMission = function () {
    var by = {}; W.ITEMS.forEach(function (i) { by[i.m] = (by[i.m] || 0) + i.pts; }); return by;
  };
  P.letter = function (points) {
    var lg = W.CONFIG.letterGrades; if (!lg || !lg.enabled) return null;
    var bands = lg.bands.slice().sort(function (a, b) { return b.min - a.min; });
    for (var i = 0; i < bands.length; i++) if (points >= bands[i].min - EPS) return bands[i].letter;
    return null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
