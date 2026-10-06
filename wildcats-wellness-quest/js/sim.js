/* Health by a Thousand Choices — scoring model (worksheet rules).
 * A = +weight, B = 0, C = -weight. Fictional teaching weights, not a validated medical score.
 * Week = 20 categories x 7 days. Everything here is pure and deterministic.
 */
(function (root) {
  'use strict';
  var W = root.WWQ = root.WWQ || {};
  var S = W.Sim = {};

  S.DOMAINS = [
    { id: 'phys', n: 'Physical', ico: 'run' },
    { id: 'ment', n: 'Mental', ico: 'brain' },
    { id: 'emo', n: 'Emotional', ico: 'heart' },
    { id: 'soc', n: 'Social', ico: 'people' },
    { id: 'env', n: 'Environmental', ico: 'leaf' }
  ];
  S.CATS = [
    { id: 'sleep', n: 'Sleep', dom: 'phys', w: 3 }, { id: 'nutrition', n: 'Nutrition', dom: 'phys', w: 2 },
    { id: 'hydration', n: 'Hydration', dom: 'phys', w: 1 }, { id: 'movement', n: 'Movement', dom: 'phys', w: 2 },
    { id: 'screens', n: 'Screens/Media Use', dom: 'ment', w: 2 }, { id: 'stress', n: 'Stress Management', dom: 'ment', w: 2 },
    { id: 'focus', n: 'Focus & Follow-Through', dom: 'ment', w: 2 }, { id: 'rest', n: 'Mental Rest/Downtime', dom: 'ment', w: 1 },
    { id: 'selftalk', n: 'Self-Talk', dom: 'emo', w: 2 }, { id: 'express', n: 'Emotional Expression', dom: 'emo', w: 2 },
    { id: 'setbacks', n: 'Handling Setbacks', dom: 'emo', w: 2 }, { id: 'gratitude', n: 'Gratitude/Perspective', dom: 'emo', w: 1 },
    { id: 'peer', n: 'Peer Pressure/Social Choices', dom: 'soc', w: 3 }, { id: 'connect', n: 'Quality Connection Time', dom: 'soc', w: 2 },
    { id: 'conflict', n: 'Conflict Resolution', dom: 'soc', w: 2 }, { id: 'kindness', n: 'Kindness/Helping Others', dom: 'soc', w: 1 },
    { id: 'space', n: 'Personal Space', dom: 'env', w: 1 }, { id: 'outdoors', n: 'Time Outdoors/Nature', dom: 'env', w: 1 },
    { id: 'studyenv', n: 'Study/Work Environment', dom: 'env', w: 2 }, { id: 'sustain', n: 'Sustainable Choices', dom: 'env', w: 1 }
  ];
  S.DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  S.DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  S.CAT = {}; S.CATS.forEach(function (c) { S.CAT[c.id] = c; });
  S.DOM = {}; S.DOMAINS.forEach(function (d) { S.DOM[d.id] = d; });
  S.catsOf = function (dom) { return S.CATS.filter(function (c) { return c.dom === dom; }); };
  S.domDailyMax = function (dom) { return S.catsOf(dom).reduce(function (s, c) { return s + c.w; }, 0); };
  S.domWeekMax = function (dom) { return S.domDailyMax(dom) * 7; };
  S.DAILY_MAX = S.DOMAINS.reduce(function (s, d) { return s + S.domDailyMax(d.id); }, 0);   // 35
  S.WEEK_MAX = S.DAILY_MAX * 7;                                                             // 245

  S.points = function (catId, grade) { var w = S.CAT[catId].w; return grade === 'A' ? w : grade === 'C' ? -w : 0; };

  /* week = { catId: 'ABCBBCA' (7 chars) } */
  S.makeWeek = function (rows) { var wk = {}; S.CATS.forEach(function (c) { wk[c.id] = rows[c.id]; }); return wk; };
  S.uniform = function (grade) { var wk = {}; S.CATS.forEach(function (c) { wk[c.id] = new Array(8).join(grade); }); return wk; };
  S.cloneWeek = function (wk) { var o = {}; Object.keys(wk).forEach(function (k) { o[k] = wk[k]; }); return o; };
  S.setCell = function (wk, catId, day, grade) { var o = S.cloneWeek(wk), s = o[catId].split(''); s[day] = grade; o[catId] = s.join(''); return o; };
  S.grade = function (wk, catId, day) { return wk[catId].charAt(day); };
  S.cellPoints = function (wk, catId, day) { return S.points(catId, wk[catId].charAt(day)); };
  S.validWeek = function (wk) {
    if (!wk || typeof wk !== 'object') return false;
    return S.CATS.every(function (c) { return typeof wk[c.id] === 'string' && /^[ABC]{7}$/.test(wk[c.id]); });
  };

  S.domainDay = function (wk, dom, day) { return S.catsOf(dom).reduce(function (s, c) { return s + S.cellPoints(wk, c.id, day); }, 0); };
  S.dayTotal = function (wk, day) { return S.DOMAINS.reduce(function (s, d) { return s + S.domainDay(wk, d.id, day); }, 0); };
  S.domainWeek = function (wk, dom) { var t = 0; for (var d = 0; d < 7; d++) t += S.domainDay(wk, dom, d); return t; };
  S.catWeek = function (wk, catId) { var t = 0; for (var d = 0; d < 7; d++) t += S.cellPoints(wk, catId, d); return t; };
  S.running = function (wk) { var r = [], t = 0; for (var d = 0; d < 7; d++) { t += S.dayTotal(wk, d); r.push(t); } return r; };
  S.total = function (wk) { var r = S.running(wk); return r[6]; };

  /* Full computed view used by charts, tables and keys. */
  S.compute = function (wk) {
    var dayTotals = [], domainDay = {}, domainWeek = {}, normalized = {};
    S.DOMAINS.forEach(function (d) { domainDay[d.id] = []; for (var i = 0; i < 7; i++) domainDay[d.id].push(S.domainDay(wk, d.id, i)); domainWeek[d.id] = domainDay[d.id].reduce(function (a, b) { return a + b; }, 0); normalized[d.id] = domainWeek[d.id] / S.domWeekMax(d.id); });
    for (var i = 0; i < 7; i++) dayTotals.push(S.dayTotal(wk, i));
    var run = S.running(wk);
    return { dayTotals: dayTotals, running: run, domainDay: domainDay, domainWeek: domainWeek, normalized: normalized, total: run[6] };
  };

  /* Greatest daily effect = largest |daily total| (the biggest move of the running total in either direction).
   * Ties return every tied day so callers can handle them explicitly. */
  S.greatestDay = function (wk) {
    var t = S.compute(wk).dayTotals, best = -1, days = [];
    t.forEach(function (v, i) { var a = Math.abs(v); if (a > best) { best = a; days = [i]; } else if (a === best) days.push(i); });
    return { days: days, magnitude: best, signed: days.map(function (i) { return t[i]; }), tie: days.length > 1 };
  };
  /* Lowest normalized domain (weekly subtotal / that domain's own weekly maximum). Ties return all. */
  S.weakestDomain = function (wk) {
    var c = S.compute(wk), low = Infinity, ids = [];
    S.DOMAINS.forEach(function (d) { var v = c.normalized[d.id]; if (v < low - 1e-12) { low = v; ids = [d.id]; } else if (Math.abs(v - low) < 1e-12) ids.push(d.id); });
    return { ids: ids, value: low, tie: ids.length > 1 };
  };
  S.lowestRawDomain = function (wk) {
    var c = S.compute(wk), low = Infinity, ids = [];
    S.DOMAINS.forEach(function (d) { var v = c.domainWeek[d.id]; if (v < low) { low = v; ids = [d.id]; } else if (v === low) ids.push(d.id); });
    return { ids: ids, value: low, tie: ids.length > 1 };
  };
  S.gradeCount = function (wk, catId) { var s = wk[catId], o = { A: 0, B: 0, C: 0 }; for (var i = 0; i < 7; i++) o[s.charAt(i)]++; return o; };
  S.countGrade = function (wk, grade) { var n = 0; S.CATS.forEach(function (c) { for (var i = 0; i < 7; i++) if (wk[c.id].charAt(i) === grade) n++; }); return n; };
  S.diffWeeks = function (a, b) { var out = []; S.CATS.forEach(function (c) { for (var d = 0; d < 7; d++) if (a[c.id].charAt(d) !== b[c.id].charAt(d)) out.push({ cat: c.id, day: d, from: a[c.id].charAt(d), to: b[c.id].charAt(d), delta: S.points(c.id, b[c.id].charAt(d)) - S.points(c.id, a[c.id].charAt(d)) }); }); return out; };
})(typeof window !== 'undefined' ? window : globalThis);
