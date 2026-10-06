/* THE HOUSE EDGE — progress, Analyst levels and localStorage (nothing leaves the browser). */
(function (root) {
  'use strict';
  var HE = root.HE = root.HE || {}, C = HE.CONFIG;
  var P = HE.Progress = {};
  var mem = null, listeners = [];

  function fresh() {
    return { v: 1, created: Date.now(), steps: {}, zone: 'z0', levelSeen: 0, prediction: null, q: {}, data: {},
      prefs: { sound: false, demo: false, nameLine: false }, reflection: { best: '', why: '' }, exit: {}, completedAt: null };
  }
  function load() {
    try { var s = root.localStorage.getItem(C.storageKey); if (s) { var o = JSON.parse(s); if (o && o.v === 1) return o; } } catch (e) {}
    return fresh();
  }
  var S = P.state = load();
  P.storageWorks = (function () { try { root.localStorage.setItem('he.t', '1'); root.localStorage.removeItem('he.t'); return true; } catch (e) { return false; } })();
  P.save = function () { try { root.localStorage.setItem(C.storageKey, JSON.stringify(S)); } catch (e) {} };
  P.reset = function () { try { root.localStorage.removeItem(C.storageKey); } catch (e) {} var f = fresh(); for (var k in S) delete S[k]; for (k in f) S[k] = f[k]; };
  P.on = function (fn) { listeners.push(fn); };
  function emit(ev, d) { listeners.forEach(function (f) { try { f(ev, d); } catch (e) { console.error(e); } }); }

  /* ---- steps ---- */
  P.zoneSteps = function (zid) {
    var z = C.zoneById(zid);
    if (zid === 'z9') return (HE.QUESTIONS || []).filter(function (q) { return q.zone === 'z9'; }).map(function (q) { return ['q:' + q.id, q.short || q.id]; });
    return z.steps;
  };
  P.allSteps = function () { var a = []; C.zones.forEach(function (z) { P.zoneSteps(z.id).forEach(function (s) { a.push(s[0]); }); }); return a; };
  P.isDone = function (id) { return !!S.steps[id]; };
  P.complete = function (id) {
    if (S.steps[id]) return false;
    S.steps[id] = Date.now();
    if (P.percent() === 100 && !S.completedAt) S.completedAt = Date.now();
    P.save(); emit('step', id); return true;
  };
  P.zoneDone = function (zid) { return P.zoneSteps(zid).every(function (s) { return S.steps[s[0]]; }); };
  P.zoneProgress = function (zid) { var st = P.zoneSteps(zid), d = st.filter(function (s) { return S.steps[s[0]]; }).length; return { done: d, total: st.length }; };
  P.percent = function () { var a = P.allSteps(), d = a.filter(function (s) { return S.steps[s]; }).length; return a.length ? Math.round(d / a.length * 100) : 0; };
  P.complete100 = function () { return P.allSteps().every(function (s) { return S.steps[s]; }); };
  P.demo = function () { return !!S.prefs.demo; };
  P.zoneUnlocked = function (zid) {
    if (P.demo()) return true;
    for (var i = 0; i < C.zones.length; i++) { if (C.zones[i].id === zid) return true; if (!P.zoneDone(C.zones[i].id)) return false; }
    return false;
  };
  P.nextZone = function (zid) { for (var i = 0; i < C.zones.length - 1; i++) if (C.zones[i].id === zid) return C.zones[i + 1]; return null; };
  P.firstIncompleteZone = function () { for (var i = 0; i < C.zones.length; i++) if (!P.zoneDone(C.zones[i].id)) return C.zones[i].id; return 'z10'; };

  /* ---- Analyst level (monotonic) ---- */
  P.level = function () {
    var lv = 0;
    for (var i = 1; i < C.levels.length; i++) {
      var L = C.levels[i], ok = L.zone ? P.zoneDone(L.zone) : L.requires.every(function (s) { return S.steps[s]; });
      if (ok) lv = i; else break;
    }
    return lv;
  };
  P.levelInfo = function (n) { return C.levels[n == null ? P.level() : n]; };
  /* Returns the new level if it just increased. */
  P.checkLevelUp = function () {
    var lv = P.level();
    if (lv > S.levelSeen) { S.levelSeen = lv; P.save(); return lv; }
    return null;
  };

  /* ---- questions ---- */
  P.qrec = function (id) { return S.q[id] || (S.q[id] = { attempts: 0, correct: false, firstAnswer: null, firstCorrect: null, last: null }); };
  P.recordAnswer = function (id, answer, correct) {
    var r = P.qrec(id); r.attempts++;
    if (r.attempts === 1) { r.firstAnswer = answer; r.firstCorrect = correct; }
    r.last = answer; if (correct) r.correct = true; P.save(); return r;
  };

  /* ---- generic data bucket ---- */
  P.get = function (k, d) { return S.data[k] === undefined ? d : S.data[k]; };
  P.set = function (k, v) { S.data[k] = v; P.save(); };
  P.pref = function (k, v) { if (v === undefined) return S.prefs[k]; S.prefs[k] = v; P.save(); };

  /* ---- concept mastery ---- */
  P.conceptStatus = function (cid) {
    var qs = (HE.QUESTIONS || []).filter(function (q) { return q.required && q.concept === cid; });
    var done = qs.filter(function (q) { return S.q[q.id] && S.q[q.id].correct; }).length;
    var firstTry = qs.filter(function (q) { return S.q[q.id] && S.q[q.id].firstCorrect; }).length;
    return { total: qs.length, correct: done, firstTry: firstTry, mastered: qs.length > 0 && done === qs.length };
  };
})(typeof window !== 'undefined' ? window : globalThis);
