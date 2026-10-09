/* =====================================================================================================
 * server/grading.js: pure functions for building, validating and grading assessment items.
 * Runs in Node (tests, dev server) and in Google Apps Script (concatenated into Code.gs).
 * NEVER shipped to the student's browser.
 *
 * ITEM MODEL (see authoring/ for real examples)
 *   item  = { id, ch, title, pts, min, lo[], stim[], prompt, parts[], hints[], explain, sim? }
 *   part  = { id, type, prompt, w, lvl, ... }   type: choice | multi | number | map | order
 *   Public fields go to students.  PRIVATE fields (key, ans, tol, rel, dec, lvl, lo, hints, explain, skill)
 *   are stripped by publicItem().
 *
 * SCORING (one rule for every item, single answer or many parts)
 *   Each CHECK ANSWER press is one attempt.  An attempt earns accuracy f in [0,1] (fraction of the item's
 *   weighted parts that are right).  Credit for that attempt = attempt multiplier x f, with multipliers
 *   1.00 / 0.85 / 0.75 for attempts 1 / 2 / 3.  The item's credit is the BEST attempt credit.
 *   For single-answer items f is 0 or 1, giving exactly 100% / 85% / 75% / 0%.
 *   An item locks when it is fully correct, when attempt 3 is used, or when no later attempt could raise
 *   the credit already earned.
 * ===================================================================================================== */
(function (root) {
  'use strict';
  var U5 = (typeof module === 'object' && module && module.exports) ? require('../shared/core.js') : root.U5;
  var SEEDS = (typeof module === 'object' && module && module.exports) ? require('../shared/seeds.js') : root.U5_SEEDS;

  var PRIVATE_KEYS = { key: 1, ans: 1, tol: 1, rel: 1, dec: 1, lvl: 1, lo: 1, hints: 1, explain: 1, skill: 1, why: 1, w: 1 };

  // ---------------------------------------------------------------------------------------- build / index
  function buildIndex(bank) {
    var items = {}, order = [], chapters = [];
    bank.chapters.forEach(function (ch) {
      var c = { id: ch.id, steps: [] };
      ch.steps.forEach(function (st, i) {
        if (st.kind === 'item') {
          var id = st.id || (st.item && st.item.id);
          if (!id) throw new Error('item step without id in chapter ' + ch.id);
          if (items[id]) throw new Error('duplicate item id ' + id);
          items[id] = { id: id, ch: ch.id, def: st.item, stepIndex: i };
          order.push(id);
          c.steps.push({ kind: 'item', id: id });
        } else c.steps.push({ kind: st.kind, id: st.id });
      });
      chapters.push(c);
    });
    return { items: items, order: order, chapters: chapters };
  }

  // Deterministic per-student context for item variants and simulation-backed answers.
  function makeCtx(session, itemId) {
    var seedStr = String(session.seed);
    var coinSeed = SEEDS.coin[U5.hashStr(seedStr + '|coin') % SEEDS.coin.length];
    var houseSeed = SEEDS.house[U5.hashStr(seedStr + '|house') % SEEDS.house.length];
    return { r: U5.rng(seedStr + '|' + itemId), seed: seedStr, coinSeed: coinSeed, houseSeed: houseSeed, U5: U5 };
  }
  function instantiate(entry, session) {
    var def = entry.def;
    var item = typeof def === 'function' ? def(makeCtx(session, entry.id)) : def;
    item = Object.assign({}, item, { id: entry.id, ch: entry.ch });
    item.parts = (item.parts || []).map(function (pt, i) { return pt.id ? pt : Object.assign({ id: 'p' + (i + 1) }, pt); });
    return item;
  }
  // Items are authored as plain objects OR as a function (ctx) => object; the step carries the id.

  // ---------------------------------------------------------------------------------------- public view
  function stripPrivate(v) {
    if (Array.isArray(v)) return v.map(stripPrivate);
    if (v && typeof v === 'object') {
      var o = {};
      Object.keys(v).forEach(function (k) { if (!PRIVATE_KEYS[k]) o[k] = stripPrivate(v[k]); });
      return o;
    }
    return v;
  }
  function seededOrder(arr, seed, notEqualTo) {
    var r = U5.rng(seed), o = r.shuffle(arr);
    if (notEqualTo && o.length > 1 && o.every(function (x, i) { return x.id === notEqualTo[i]; })) o = o.slice(1).concat(o.slice(0, 1));
    return o;
  }
  function publicItem(item, seed) {
    var out = { id: item.id, ch: item.ch, title: item.title, pts: item.pts, min: item.min, stim: stripPrivate(item.stim || []), prompt: item.prompt, sim: item.sim || null, parts: [] };
    item.parts.forEach(function (p) {
      var q = stripPrivate(p);
      q.id = p.id; q.type = p.type;
      var s = seed + '|' + item.id + '|' + p.id;
      if ((p.type === 'choice' || p.type === 'multi' || p.type === 'map') && p.options && !p.fixed) q.options = seededOrder(p.options.map(stripPrivate), s);
      if (p.type === 'order') q.options = seededOrder(p.options.map(stripPrivate), s, p.key);
      if (p.type === 'number') q.fields = p.fields.map(function (f) { var g = stripPrivate(f); g.id = f.id; return g; });
      out.parts.push(q);
    });
    return out;
  }

  // ---------------------------------------------------------------------------------------- validation
  function optIds(p) { var o = {}; (p.options || []).forEach(function (x) { o[x.id] = 1; }); return o; }
  function validateResponse(item, resp) {
    if (!resp || typeof resp !== 'object' || !resp.parts || typeof resp.parts !== 'object') return 'Answer every part before checking.';
    for (var i = 0; i < item.parts.length; i++) {
      var p = item.parts[i], r = resp.parts[p.id], ids = optIds(p);
      if (r == null || typeof r !== 'object') return 'Answer every part before checking.';
      if (p.type === 'choice') {
        if (typeof r.c !== 'string' || !ids[r.c]) return 'Choose an answer before checking.';
      } else if (p.type === 'multi') {
        if (!Array.isArray(r.c) || r.c.length > 12) return 'Choose your answer(s) before checking.';
        var seen = {};
        for (var k = 0; k < r.c.length; k++) { if (typeof r.c[k] !== 'string' || !ids[r.c[k]] || seen[r.c[k]]) return 'Choose your answer(s) before checking.'; seen[r.c[k]] = 1; }
        var min = p.min != null ? p.min : 1, max = p.max != null ? p.max : 99;
        if (r.c.length < min) return min > 1 ? 'Select at least ' + min + '.' : 'Select at least one answer.';
        if (r.c.length > max) return 'Select no more than ' + max + '.';
      } else if (p.type === 'number') {
        if (!r.v || typeof r.v !== 'object') return 'Fill in every box before checking.';
        for (var j = 0; j < p.fields.length; j++) {
          var f = p.fields[j], t = r.v[f.id];
          if (f.kind === 'ratio') {
            if (!t || typeof t !== 'object' || !U5.parseNum(t.a) || !U5.parseNum(t.b)) return 'Fill in every box with a number before checking.';
          } else if (typeof t !== 'string' && typeof t !== 'number') return 'Fill in every box before checking.';
          else if (!U5.parseNum(t)) return 'Enter numbers only (for example 12, 0.25, 30% or 3/10).';
          if (typeof t === 'string' && t.length > 24) return 'That entry is too long.';
        }
      } else if (p.type === 'map') {
        if (!r.m || typeof r.m !== 'object') return 'Place every item before checking.';
        for (var m = 0; m < p.rows.length; m++) { var v = r.m[p.rows[m].id]; if (typeof v !== 'string' || !ids[v]) return 'Place every item before checking.'; }
      } else if (p.type === 'order') {
        if (!Array.isArray(r.o) || r.o.length !== p.options.length) return 'Put every item in order before checking.';
        var s2 = {};
        for (var q = 0; q < r.o.length; q++) { if (!ids[r.o[q]] || s2[r.o[q]]) return 'Put every item in order before checking.'; s2[r.o[q]] = 1; }
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------------------- grading
  function gradePart(p, r) {
    var got = 0, total = 1, f = 0;
    if (p.type === 'choice') {
      var keys = Array.isArray(p.key) ? p.key : [p.key];
      f = keys.indexOf(r.c) >= 0 ? 1 : 0; got = f;
    } else if (p.type === 'multi') {
      var tp = 0, fp = 0, keyset = {};
      p.key.forEach(function (k) { keyset[k] = 1; });
      r.c.forEach(function (c) { if (keyset[c]) tp++; else fp++; });
      total = p.key.length; got = Math.max(0, tp - fp);
      f = total ? got / total : 0;
      if (fp === 0 && tp === total) f = 1;
    } else if (p.type === 'number') {
      total = p.fields.length;
      p.fields.forEach(function (fl) {
        var t = r.v[fl.id], ok;
        if (fl.kind === 'ratio') ok = U5.ratioOk(fl, t.a, t.b); else ok = U5.fieldOk(fl, t);
        if (ok) got++;
      });
      f = got / total;
    } else if (p.type === 'map') {
      total = p.rows.length;
      p.rows.forEach(function (row) {
        var k = p.key[row.id];
        if (Array.isArray(k) ? k.indexOf(r.m[row.id]) >= 0 : r.m[row.id] === k) got++;
      });
      f = got / total;
    } else if (p.type === 'order') {
      total = p.key.length;
      p.key.forEach(function (id, i) { if (r.o[i] === id) got++; });
      f = got / total;
    }
    return { f: f, got: got, total: total };
  }
  function gradeItem(item, resp) {
    var sumW = 0, sum = 0, detail = [], allOk = true;
    item.parts.forEach(function (p) {
      var w = p.w != null ? p.w : 1, g = gradePart(p, resp.parts[p.id]);
      sumW += w; sum += w * g.f;
      if (g.f < 0.999999) allOk = false;
      detail.push({ id: p.id, got: Math.round(g.got * 100) / 100, total: g.total, ok: g.f >= 0.999999 });
    });
    return { f: sumW ? sum / sumW : 0, ok: allOk, detail: detail };
  }

  // The item record kept per student.  rec = { st, n, best, att: [{n, t, f, ok}] }
  function newRec() { return { st: 'open', n: 0, best: 0, att: [] }; }
  // Applies one graded attempt to a record (mutates).  Returns { locked, mult }.
  function applyAttempt(rec, g, nowMs, respJson) {
    rec.n += 1;
    var mult = U5.creditFor(rec.n), cand = mult * g.f;
    if (cand > rec.best) rec.best = cand;
    var a = { n: rec.n, t: nowMs, f: Math.round(g.f * 1000) / 1000, ok: g.ok ? 1 : 0 };
    if (respJson) a.r = respJson;
    rec.att.push(a);
    if (g.ok) rec.st = 'correct';
    else if (rec.n >= U5.MAX_ATTEMPTS || rec.best >= U5.creditFor(rec.n + 1) - 1e-9) rec.st = 'locked';
    return { mult: mult, status: rec.st };
  }
  function earnedOf(item, rec) { return rec ? U5.round2(item.pts * rec.best) : 0; }

  // ---------------------------------------------------------------------------------------- helpers for tests / teacher
  function makeCorrect(item) {
    var parts = {};
    item.parts.forEach(function (p) {
      if (p.type === 'choice') parts[p.id] = { c: Array.isArray(p.key) ? p.key[0] : p.key };
      else if (p.type === 'multi') parts[p.id] = { c: p.key.slice() };
      else if (p.type === 'number') { var v = {}; p.fields.forEach(function (f) { v[f.id] = f.kind === 'ratio' ? { a: String(f.ans[0]), b: String(f.ans[1]) } : String(f.ans); }); parts[p.id] = { v: v }; }
      else if (p.type === 'map') { var m = {}; p.rows.forEach(function (r) { var k = p.key[r.id]; m[r.id] = Array.isArray(k) ? k[0] : k; }); parts[p.id] = { m: m }; }
      else if (p.type === 'order') parts[p.id] = { o: p.key.slice() };
    });
    return { parts: parts };
  }
  function makeWrong(item, variant) {
    var parts = {};
    item.parts.forEach(function (p) {
      if (p.type === 'choice') {
        var keys = Array.isArray(p.key) ? p.key : [p.key];
        var other = p.options.filter(function (o) { return keys.indexOf(o.id) < 0; });
        parts[p.id] = { c: other[(variant || 0) % other.length].id };
      } else if (p.type === 'multi') {
        var wrong = p.options.filter(function (o) { return p.key.indexOf(o.id) < 0; });
        parts[p.id] = { c: wrong.length ? [wrong[0].id] : [] };
        if (!wrong.length) parts[p.id] = { c: [p.options[0].id] };
      } else if (p.type === 'number') { var v = {}; p.fields.forEach(function (f) { v[f.id] = f.kind === 'ratio' ? { a: '999', b: '1' } : String((Number(f.ans) || 0) + 987.5); }); parts[p.id] = { v: v }; }
      else if (p.type === 'map') {
        var ids = p.options.map(function (o) { return o.id; }), m = {};
        p.rows.forEach(function (r, i) { var k = p.key[r.id], kk = Array.isArray(k) ? k : [k]; var alt = ids.filter(function (x) { return kk.indexOf(x) < 0; }); m[r.id] = alt.length ? alt[i % alt.length] : ids[0]; });
        parts[p.id] = { m: m };
      } else if (p.type === 'order') {
        var o = p.key.slice().reverse();
        if (o.every(function (x, i) { return x === p.key[i]; })) o = o.slice(1).concat(o.slice(0, 1));
        parts[p.id] = { o: o };
      }
    });
    return { parts: parts };
  }
  // A response that is right on exactly the first `n` of the item's parts (for partial-credit tests)
  function makePartial(item, nCorrect) {
    var good = makeCorrect(item), bad = makeWrong(item), parts = {};
    item.parts.forEach(function (p, i) { parts[p.id] = i < nCorrect ? good.parts[p.id] : bad.parts[p.id]; });
    return { parts: parts };
  }
  function optText(p, id) { var o = (p.options || []).filter(function (x) { return x.id === id; })[0]; return o ? o.text : id; }
  function formatKey(item) {
    return item.parts.map(function (p) {
      var lead = item.parts.length > 1 && p.prompt ? '[' + p.id + '] ' : '';
      if (p.type === 'choice') return { id: p.id, text: lead + optText(p, Array.isArray(p.key) ? p.key[0] : p.key) };
      if (p.type === 'multi') return { id: p.id, text: lead + p.key.map(function (k) { return optText(p, k); }).join('  |  ') };
      if (p.type === 'number') return { id: p.id, text: lead + p.fields.map(function (f) { return (f.label || f.id) + ' = ' + (f.kind === 'ratio' ? f.ans.join(' : ') : (f.kind === 'pct' ? U5.fmtNum(f.ans, 4) + '%' : (f.kind === 'prob' ? U5.fmtNum(f.ans, 6) : U5.fmtNum(f.ans, 4)))) + (f.unit && f.kind !== 'pct' ? ' ' + f.unit : '') + (f.tol ? ' (±' + U5.fmtNum(f.tol, 4) + ')' : ''); }).join('; ') };
      if (p.type === 'map') return { id: p.id, text: lead + p.rows.map(function (r) { var k = p.key[r.id]; return r.text + ' → ' + optText(p, Array.isArray(k) ? k[0] : k); }).join('  |  ') };
      if (p.type === 'order') return { id: p.id, text: lead + p.key.map(function (k, i) { return (i + 1) + '. ' + optText(p, k); }).join('  ') };
      return { id: p.id, text: '' };
    });
  }

  var api = {
    PRIVATE_KEYS: PRIVATE_KEYS, buildIndex: buildIndex, makeCtx: makeCtx, instantiate: instantiate,
    publicItem: publicItem, stripPrivate: stripPrivate, validateResponse: validateResponse, gradePart: gradePart, gradeItem: gradeItem,
    newRec: newRec, applyAttempt: applyAttempt, earnedOf: earnedOf,
    makeCorrect: makeCorrect, makeWrong: makeWrong, makePartial: makePartial, formatKey: formatKey, optText: optText
  };
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  root.U5G = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
