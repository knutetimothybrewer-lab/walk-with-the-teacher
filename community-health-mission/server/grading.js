(function (root) {
  'use strict';
  // Deterministic grading. All-or-nothing per unit. No keyword matching of free text.
  var MAX_ATTEMPTS = 3;
  var CREDIT = [1, 0.85, 0.75];

  function isStr(x) { return typeof x === 'string'; }
  function setEq(a, b) {
    if (a.length !== b.length) return false;
    var s = {}; a.forEach(function (x) { s[x] = 1; });
    return b.every(function (x) { return s[x]; });
  }
  function ids(list) { return list.map(function (o) { return o.id; }); }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  // Controls for a simplan field (public).
  function simplanControls(pub, field) {
    var sp = pub.simplans[field.scenario];
    return sp ? sp.controls : null;
  }

  // validate: returns null if the response is complete and well-formed, else a short message (no attempt consumed).
  function validateField(pub, f, v) {
    var t = f.type, i;
    if (t === 'single') {
      if (!isStr(v) || !v) return 'Choose an answer for "' + (f.label || 'this question') + '".';
      if (ids(f.options).indexOf(v) < 0) return 'That choice is not valid.';
    } else if (t === 'multi' || t === 'mapselect') {
      if (!Array.isArray(v) || v.length === 0) return 'Select at least one option' + (f.label ? ' for "' + f.label + '"' : '') + '.';
      if (uniq(v).length !== v.length) return 'Duplicate choices.';
      var oi = ids(f.options);
      for (i = 0; i < v.length; i++) if (oi.indexOf(v[i]) < 0) return 'That choice is not valid.';
    } else if (t === 'match') {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return 'Assign every item.';
      var cats = ids(f.cats);
      for (i = 0; i < f.rows.length; i++) {
        var a = v[f.rows[i].id];
        if (!isStr(a) || !a) return 'Assign a category to every item before submitting.';
        if (cats.indexOf(a) < 0) return 'That category is not valid.';
      }
    } else if (t === 'order') {
      if (!Array.isArray(v) || v.length !== f.items.length) return 'Put every item in order.';
      if (!setEq(uniq(v), ids(f.items))) return 'The order is not valid.';
    } else if (t === 'num') {
      var n = typeof v === 'number' ? v : (isStr(v) && v.trim() !== '' ? Number(v.replace(/,/g, '')) : NaN);
      if (!isFinite(n)) return 'Enter a number' + (f.label ? ' for: ' + f.label : '') + '.';
      if (Math.abs(n) > 1e9) return 'That number is out of range.';
    } else if (t === 'budget') {
      if (!Array.isArray(v) || uniq(v).length !== f.need) return 'Choose exactly ' + f.need + ' interventions.';
      var bi = ids(f.options);
      for (i = 0; i < v.length; i++) if (bi.indexOf(v[i]) < 0) return 'That choice is not valid.';
      var cost = 0;
      v.forEach(function (id) { cost += f.options.filter(function (o) { return o.id === id; })[0].cost; });
      if (cost > f.budget) return 'Your two choices cost $' + cost + 'k, which is over the $' + f.budget + 'k budget. Adjust before submitting.';
    } else if (t === 'simplan') {
      var ctr = simplanControls(pub, f);
      if (!ctr) return 'Plan not available.';
      if (!v || typeof v !== 'object' || Array.isArray(v)) return 'Complete the plan.';
      for (i = 0; i < ctr.length; i++) {
        var c = v[ctr[i].id];
        if (!isStr(c) || !c) return 'Choose an option for "' + ctr[i].label + '" before submitting.';
        if (ids(ctr[i].options).indexOf(c) < 0) return 'That choice is not valid.';
      }
    } else return 'Unsupported question type.';
    return null;
  }

  function validateUnit(pub, unit, response) {
    if (!response || typeof response !== 'object' || Array.isArray(response)) return 'No answer was submitted.';
    if (JSON.stringify(response).length > 4000) return 'Answer is too large.';
    for (var i = 0; i < unit.fields.length; i++) {
      var e = validateField(pub, unit.fields[i], response[unit.fields[i].id]);
      if (e) return e;
    }
    return null;
  }

  function gradeField(pub, f, v, key) {
    var t = f.type;
    if (t === 'single') return Array.isArray(key) ? key.indexOf(v) >= 0 : v === key;
    if (t === 'multi' || t === 'mapselect') return setEq(uniq(v), key);
    if (t === 'match') return f.rows.every(function (r) { var k = key[r.id]; return Array.isArray(k) ? k.indexOf(v[r.id]) >= 0 : v[r.id] === k; });
    if (t === 'order') return v.length === key.length && v.every(function (x, i) { return x === key[i]; });
    if (t === 'num') { var n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '')); return Math.abs(n - key.v) <= key.tol + 1e-9; }
    if (t === 'budget') {
      var sel = uniq(v);
      if (sel.length !== f.need) return false;
      var cost = 0, doms = {};
      for (var i = 0; i < sel.length; i++) {
        var o = f.options.filter(function (x) { return x.id === sel[i]; })[0];
        if (!o || key.good.indexOf(o.id) < 0) return false;
        cost += o.cost; doms[o.domain] = 1;
      }
      if (cost > f.budget) return false;
      if (key.distinctDomains && Object.keys(doms).length !== sel.length) return false;
      return true;
    }
    if (t === 'simplan') {
      var common = key.common || {}, ok = true;
      Object.keys(common).forEach(function (cid) { if (common[cid].indexOf(v[cid]) < 0) ok = false; });
      if (!ok) return false;
      var alts = key.alts || [];
      if (!alts.length) return true;
      return alts.some(function (alt) { return Object.keys(alt).every(function (cid) { return alt[cid].indexOf(v[cid]) >= 0; }); });
    }
    return false;
  }

  function gradeUnit(pub, unit, privUnit, response) {
    for (var i = 0; i < unit.fields.length; i++) {
      var f = unit.fields[i];
      if (!gradeField(pub, f, response[f.id], privUnit.keys[f.id])) return false;
    }
    return true;
  }

  function creditFor(attempt) { return CREDIT[attempt - 1] || 0; }
  function round2(x) { return Math.round(x * 100) / 100; }

  // Human-readable answer for the review and the teacher view.
  function optText(list, id) { var o = list.filter(function (x) { return x.id === id; })[0]; return o ? o.t : id; }
  function formatKey(pub, f, key) {
    var t = f.type;
    if (t === 'single') return (Array.isArray(key) ? key : [key]).map(function (k) { return optText(f.options, k); }).join(' OR ');
    if (t === 'multi' || t === 'mapselect') return key.map(function (k) { return optText(f.options, k); }).join('; ');
    if (t === 'match') return f.rows.map(function (r) { var k = key[r.id]; return r.t + ' → ' + (Array.isArray(k) ? k : [k]).map(function (c) { return optText(f.cats, c); }).join(' OR '); }).join('\n');
    if (t === 'order') return key.map(function (k, i) { return (i + 1) + '. ' + optText(f.items, k); }).join('\n');
    if (t === 'num') return key.v + (f.unit ? ' ' + f.unit : '') + ' (accepted ±' + key.tol + ')';
    if (t === 'budget') return 'Any two of: ' + key.good.map(function (k) { return optText(f.options, k); }).join(' | ') + ' — total ≤ $' + f.budget + 'k and from different domains';
    if (t === 'simplan') {
      var ctr = simplanControls(pub, f), lines = [];
      Object.keys(key.common || {}).forEach(function (cid) { var c = ctr.filter(function (x) { return x.id === cid; })[0]; lines.push(c.label + ': ' + key.common[cid].map(function (k) { return optText(c.options, k); }).join(' OR ')); });
      (key.alts || []).forEach(function (alt, i) { lines.push('Alternative ' + (i + 1) + ': ' + Object.keys(alt).map(function (cid) { var c = ctr.filter(function (x) { return x.id === cid; })[0]; return c.label + ' = ' + alt[cid].map(function (k) { return optText(c.options, k); }).join(' OR '); }).join(' AND ')); });
      return lines.join('\n');
    }
    return '';
  }

  // Build a canonical correct / deliberately wrong response (used by preview scenarios and tests).
  function makeCorrect(pub, unit, privUnit) {
    var r = {};
    unit.fields.forEach(function (f) {
      var key = privUnit.keys[f.id], t = f.type;
      if (t === 'single') r[f.id] = Array.isArray(key) ? key[0] : key;
      else if (t === 'multi' || t === 'mapselect') r[f.id] = key.slice();
      else if (t === 'match') { r[f.id] = {}; f.rows.forEach(function (row) { var k = key[row.id]; r[f.id][row.id] = Array.isArray(k) ? k[0] : k; }); }
      else if (t === 'order') r[f.id] = key.slice();
      else if (t === 'num') r[f.id] = key.v;
      else if (t === 'budget') {
        var picks = null;
        for (var i = 0; i < key.good.length && !picks; i++) for (var j = i + 1; j < key.good.length && !picks; j++) {
          var a = f.options.filter(function (o) { return o.id === key.good[i]; })[0], b = f.options.filter(function (o) { return o.id === key.good[j]; })[0];
          if (a.cost + b.cost <= f.budget && (!key.distinctDomains || a.domain !== b.domain)) picks = [a.id, b.id];
        }
        r[f.id] = picks;
      } else if (t === 'simplan') {
        var ctr = simplanControls(pub, f), p = {};
        ctr.forEach(function (c) { p[c.id] = c.options[0].id; });
        Object.keys(key.common || {}).forEach(function (cid) { p[cid] = key.common[cid][0]; });
        var alt = (key.alts || [])[0];
        if (alt) Object.keys(alt).forEach(function (cid) { p[cid] = alt[cid][0]; });
        r[f.id] = p;
      }
    });
    return r;
  }

  function makeWrong(pub, unit, privUnit) {
    var r = makeCorrect(pub, unit, privUnit), f = unit.fields[0], t = f.type, key = privUnit.keys[f.id];
    if (t === 'single') { var k = Array.isArray(key) ? key : [key]; r[f.id] = ids(f.options).filter(function (x) { return k.indexOf(x) < 0; })[0]; }
    else if (t === 'multi' || t === 'mapselect') { var extra = ids(f.options).filter(function (x) { return key.indexOf(x) < 0; }); r[f.id] = extra.length ? extra.slice(0, 1) : key.slice(1); }
    else if (t === 'match') { var row = f.rows[0], ck = key[row.id]; ck = Array.isArray(ck) ? ck : [ck]; r[f.id][row.id] = ids(f.cats).filter(function (x) { return ck.indexOf(x) < 0; })[0]; }
    else if (t === 'order') { var o = key.slice(); var x = o[0]; o[0] = o[1]; o[1] = x; r[f.id] = o; }
    else if (t === 'num') r[f.id] = key.v + key.tol + 7;
    else if (t === 'budget') {
      var found = null;
      for (var i = 0; i < f.options.length && !found; i++) for (var j = i + 1; j < f.options.length && !found; j++) {
        var a = f.options[i], b = f.options[j];
        if (a.cost + b.cost <= f.budget && (key.good.indexOf(a.id) < 0 || key.good.indexOf(b.id) < 0)) found = [a.id, b.id];
      }
      r[f.id] = found;
    }
    else if (t === 'simplan') { var ctr = simplanControls(pub, f); var cid = Object.keys(key.common)[0]; var wrongOpt = ids(ctr.filter(function (c) { return c.id === cid; })[0].options).filter(function (id) { return key.common[cid].indexOf(id) < 0; })[0]; r[f.id][cid] = wrongOpt; }
    if (gradeUnit(pub, unit, privUnit, r)) throw new Error('makeWrong produced a correct response for ' + unit.id);
    return r;
  }

  var api = { MAX_ATTEMPTS: MAX_ATTEMPTS, CREDIT: CREDIT, validateUnit: validateUnit, validateField: validateField, gradeUnit: gradeUnit, gradeField: gradeField,
    creditFor: creditFor, round2: round2, formatKey: formatKey, makeCorrect: makeCorrect, makeWrong: makeWrong };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CHM_grading = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
