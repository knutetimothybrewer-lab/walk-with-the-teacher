/**
 * Reports.gs - what the teacher sees: lesson results, one student's growth, and the nightly summary tabs.
 * The math is in Stats.gs; this file gathers the right rows and hands them over.
 */

function activeRoster_() { return roster_().filter(function (r) { return r.active; }); }

function byName_(a, b) {
  return (a.period + '').localeCompare(b.period + '', undefined, { numeric: true }) || a.last.localeCompare(b.last) || a.first.localeCompare(b.first);
}

function pairKey_(itemId) { return itemId.replace(/(-[IR]\d+)B$/, '$1'); }   // form-B twin shares its form-A item's key

// ---------------------------------------------------------------------------------------------------------------------
// One lesson, one period (or all periods)
// ---------------------------------------------------------------------------------------------------------------------
function t_report(req) {
  requireTeacher_(req);
  var lesson = lessonById_(str_(req.lesson_id));
  if (!lesson) throw new UserError('Pick a lesson.');
  var period = str_(req.period), scope = !period || period === 'ALL' ? null : period;
  var thr = config_().MASTERY_THRESHOLD;
  var students = activeRoster_().filter(function (r) { return !scope || r.period === scope; }).sort(byName_);
  var ids = {}; students.forEach(function (s) { ids[s.student_id] = s; });

  var sc = scores_().filter(function (s) { return s.lesson_id === lesson.lesson_id && ids[s.student_id]; });
  var growth = Stats.growthRows(sc.map(function (s) { return { student_id: s.student_id, lesson_id: s.lesson_id, phase: s.phase, pct: s.pct }; }));
  var gBy = {}; growth.forEach(function (g) { gBy[g.student_id] = g; });

  var rows = students.map(function (s) {
    var g = gBy[s.student_id];
    return { student_id: s.student_id, last: s.last, first: s.first, period: s.period,
             pre: g ? Stats.round(g.pre, 1) : null, post: g ? Stats.round(g.post, 1) : null,
             gain: g && g.gain !== null ? Stats.round(g.gain, 1) : null, g: g && g.g !== null ? Stats.round(g.g, 2) : null,
             status: g ? g.status : 'no data', ceiling: !!(g && g.ceiling), mastery: !!(g && g.post !== null && g.post >= thr) };
  });
  var sum = Stats.summarize(growth, thr);
  Object.keys(sum).forEach(function (k) { if (typeof sum[k] === 'number') sum[k] = Stats.round(sum[k], k === 'class_g' || k === 'mean_individual_g' || k === 'dz' ? 2 : 1); });
  sum.n_roster = students.length;
  sum.n_no_pre = rows.filter(function (r) { return r.pre === null; }).length;
  sum.n_no_post = rows.filter(function (r) { return r.post === null; }).length;
  sum.median_seconds = (function () {
    var s = sc.filter(function (x) { return x.seconds; }).map(function (x) { return x.seconds; }).sort(function (a, b) { return a - b; });
    return s.length ? s[Math.floor(s.length / 2)] : null;
  })();

  // criteria: matched students only, so absences do not distort the comparison
  var matched = {}; growth.forEach(function (g) { if (g.status === 'matched') matched[g.student_id] = true; });
  var resp = responses_().filter(function (r) { return r.lesson_id === lesson.lesson_id && ids[r.student_id]; });
  var cstats = Stats.criterionStats(resp.map(function (r) { return { student_id: r.student_id, phase: r.phase, criterion_id: r.criterion_id, points: r.points }; }), matched, thr);
  var criteria = table_('Criteria').filter(function (c) { return str_(c.lesson_id) === lesson.lesson_id; });
  var critOut = Object.keys(cstats).sort().map(function (cid) {
    var meta = criteria.filter(function (c) { return str_(c.criterion_id) === cid; })[0];
    var c = cstats[cid];
    return { criterion_id: cid, text: meta ? str_(meta.text) : (lesson.ticket_type === 'unit_review' ? '(from an earlier lesson)' : ''),
             observed: meta ? truthy_(meta.observed) : false, pre: Stats.round(c.pre, 1), post: Stats.round(c.post, 1),
             gain: Stats.round(c.gain, 1), n: c.n, reteach: c.reteach, already_known: c.already_known };
  });

  // item difficulty (share correct) per phase, all students in scope who answered it
  var bankBy = {}; bank_().forEach(function (b) { bankBy[b.item_id] = b; });
  var itemAcc = {};
  resp.forEach(function (r) {
    var k = pairKey_(r.item_id), a = itemAcc[k] || (itemAcc[k] = { item_id: k, criterion_id: r.criterion_id, pre: [], post: [] });
    a[r.phase].push(r.correct);
  });
  var items = Object.keys(itemAcc).sort().map(function (k) {
    var a = itemAcc[k], b = bankBy[k] || bankBy[k + 'B'] || {};
    return { item_id: k, criterion_id: a.criterion_id, stem: b.stem || '', pre_p: a.pre.length ? Stats.round(100 * Stats.mean(a.pre), 0) : null,
             post_p: a.post.length ? Stats.round(100 * Stats.mean(a.post), 0) : null, n_pre: a.pre.length, n_post: a.post.length };
  });

  return { ok: true, lesson: { lesson_id: lesson.lesson_id, title: lesson.title, unit_title: lesson.unit_title, day: lesson.day,
           ticket_type: lesson.ticket_type, objective: lesson.objective }, period: scope || 'ALL', mastery: thr,
           summary: sum, students: rows, criteria: critOut, items: items };
}

// ---------------------------------------------------------------------------------------------------------------------
// One student across the semester
// ---------------------------------------------------------------------------------------------------------------------
function t_student(req) {
  requireTeacher_(req);
  var sid = str_(req.student_id), thr = config_().MASTERY_THRESHOLD;
  var me = roster_().filter(function (r) { return r.student_id === sid; })[0];
  if (!me) throw new UserError('Student not found.');
  var sc = scores_().filter(function (s) { return s.student_id === sid; });
  var growth = Stats.growthRows(sc.map(function (s) { return { student_id: s.student_id, lesson_id: s.lesson_id, phase: s.phase, pct: s.pct }; }));
  var lessonRows = growth.map(function (g) {
    var l = lessonById_(g.lesson_id) || { sequence: 9999, unit: 0, day: 0, title: g.lesson_id, ticket_type: 'daily' };
    return { lesson_id: g.lesson_id, sequence: l.sequence, unit: l.unit, day: l.day, title: l.title, ticket_type: l.ticket_type,
             pre: Stats.round(g.pre, 1), post: Stats.round(g.post, 1), gain: Stats.round(g.gain, 1), g: Stats.round(g.g, 2),
             status: g.status, mastery: g.post !== null && g.post >= thr };
  }).sort(function (a, b) { return a.sequence - b.sequence; });

  var daily = growth.filter(function (g) { var l = lessonById_(g.lesson_id); return !l || l.ticket_type !== 'unit_review'; });
  var s = Stats.summarize(daily, thr);
  var summary = { lessons_with_pairs: s.n_matched, mean_pre: Stats.round(s.mean_pre, 1), mean_post: Stats.round(s.mean_post, 1),
                  mean_gain: Stats.round(s.mean_gain, 1), class_g: Stats.round(s.class_g, 2), pct_mastery: Stats.round(s.pct_mastery, 0),
                  n_post: s.n_post };

  // weakest criteria: share of exit-ticket points earned (daily tickets only)
  var acc = {};
  responses_().forEach(function (r) {
    if (r.student_id !== sid || r.phase !== 'post' || r.ticket_type === 'unit_review') return;
    (acc[r.criterion_id] = acc[r.criterion_id] || []).push(r.points);
  });
  var critText = {}; table_('Criteria').forEach(function (c) { critText[str_(c.criterion_id)] = str_(c.text); });
  var weakest = Object.keys(acc).map(function (cid) { return { criterion_id: cid, text: critText[cid] || '', post_pct: Stats.round(100 * Stats.mean(acc[cid]), 0), n: acc[cid].length }; })
    .sort(function (a, b) { return a.post_pct - b.post_pct || a.criterion_id.localeCompare(b.criterion_id); }).slice(0, 5);

  return { ok: true, student: { student_id: me.student_id, last: me.last, first: me.first, period: me.period }, mastery: thr,
           summary: summary, lessons: lessonRows, weakest: weakest };
}

/** The item-by-item view of one student on one lesson: what they answered at warm-up and at exit ticket. */
function t_student_lesson(req) {
  requireTeacher_(req);
  var sid = str_(req.student_id), lid = str_(req.lesson_id);
  var bankBy = {}; bank_().forEach(function (b) { bankBy[b.item_id] = b; });
  var rows = responses_().filter(function (r) { return r.student_id === sid && r.lesson_id === lid; });
  var groups = {}, order = [];
  rows.forEach(function (r) {
    var b = bankBy[r.item_id];
    if (!b) return;
    var k = pairKey_(r.item_id), g = groups[k];
    if (!g) { g = groups[k] = { key: k, criterion_id: r.criterion_id, pre: null, post: null }; order.push(k); }
    var ans = null;
    try { ans = JSON.parse(r.response); } catch (e) { /* leave null */ }
    g[r.phase] = { item_id: r.item_id, stem: b.stem, type: b.type, answer: Grading.describe(b, ans), correct_answer: Grading.describeKey(b), correct: !!r.correct };
  });
  return { ok: true, items: order.sort().map(function (k) { return groups[k]; }) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Summary tabs (nightly, or on demand from the teacher page)
// ---------------------------------------------------------------------------------------------------------------------
function computeAll_() {
  var thr = config_().MASTERY_THRESHOLD, ros = activeRoster_(), per = periods_().map(function (p) { return p.period; });
  var lessons = lessons_(), sc = scores_(), rs = responses_();
  var rosBy = {}; ros.forEach(function (r) { rosBy[r.student_id] = r; });

  var growthOut = [], classOut = [], critOut = [];
  var r1 = function (x) { return x === null || x === undefined ? '' : Stats.round(x, 1); };
  var r2 = function (x) { return x === null || x === undefined ? '' : Stats.round(x, 2); };

  lessons.forEach(function (l) {
    var lsc = sc.filter(function (s) { return s.lesson_id === l.lesson_id && rosBy[s.student_id]; });
    if (!lsc.length) return;
    var growth = Stats.growthRows(lsc.map(function (s) { return { student_id: s.student_id, lesson_id: s.lesson_id, phase: s.phase, pct: s.pct }; }));
    growth.forEach(function (g) {
      var st = rosBy[g.student_id];
      growthOut.push([g.student_id, st.last, st.first, st.period, l.lesson_id, l.ticket_type, l.sequence, r1(g.pre), r1(g.post), r1(g.gain),
                      r2(g.g), g.status, g.post !== null && g.post >= thr ? 'Y' : 'N', g.ceiling ? 'Y' : 'N']);
    });
    ['ALL'].concat(per).forEach(function (p) {
      var rows = growth.filter(function (g) { return p === 'ALL' || rosBy[g.student_id].period === p; });
      if (!rows.length) return;
      var s = Stats.summarize(rows, thr);
      classOut.push([l.lesson_id, l.ticket_type, p, s.n_matched, s.n_pre_only, s.n_post_only, r1(s.mean_pre), r1(s.mean_post), r1(s.mean_gain),
                     r2(s.class_g), r2(s.mean_individual_g), s.n_ceiling, r2(s.dz), r1(s.pct_mastery), r1(s.pct_gained), r1(s.pct_flat), r1(s.pct_declined)]);
    });
  });

  // Criterion mastery: daily pre/post for matched students, plus how the criterion held up on the unit-review warm-up.
  var matchedByLesson = {};
  lessons.forEach(function (l) {
    var g = Stats.growthRows(sc.filter(function (s) { return s.lesson_id === l.lesson_id; }).map(function (s) { return { student_id: s.student_id, lesson_id: s.lesson_id, phase: s.phase, pct: s.pct }; }));
    var m = {}; g.forEach(function (x) { if (x.status === 'matched') m[x.student_id] = true; });
    matchedByLesson[l.lesson_id] = m;
  });
  var reviewPre = {};   // criterion|period -> points[]
  rs.forEach(function (r) {
    if (r.ticket_type !== 'unit_review' || r.phase !== 'pre' || !rosBy[r.student_id]) return;
    ['ALL', rosBy[r.student_id].period].forEach(function (p) { (reviewPre[r.criterion_id + '|' + p] = reviewPre[r.criterion_id + '|' + p] || []).push(r.points); });
  });
  lessons.filter(function (l) { return l.ticket_type !== 'unit_review'; }).forEach(function (l) {
    var lrs = rs.filter(function (r) { return r.lesson_id === l.lesson_id && rosBy[r.student_id]; });
    if (!lrs.length) return;
    ['ALL'].concat(per).forEach(function (p) {
      var sub = lrs.filter(function (r) { return p === 'ALL' || rosBy[r.student_id].period === p; })
        .map(function (r) { return { student_id: r.student_id, phase: r.phase, criterion_id: r.criterion_id, points: r.points }; });
      var cs = Stats.criterionStats(sub, matchedByLesson[l.lesson_id], thr);
      Object.keys(cs).sort().forEach(function (cid) {
        var c = cs[cid], rv = reviewPre[cid + '|' + p];
        var rvPct = rv && rv.length ? 100 * Stats.mean(rv) : null;
        var drop = rvPct !== null && c.post !== null ? c.post - rvPct : null;
        critOut.push([cid, l.lesson_id, p, c.n, r1(c.pre), r1(c.post), r1(c.gain), c.reteach ? 'Y' : 'N', r1(rvPct), r1(drop),
                      drop !== null && drop >= 15 ? 'Y' : 'N']);
      });
    });
  });
  return { growth: growthOut, classSummary: classOut, critMastery: critOut };
}

/** Rewrites the Growth, ClassSummary, and CriterionMastery tabs. Runs nightly and from the teacher page. */
function recomputeSummaries() {
  ctx_ = {};
  var all = computeAll_();
  replaceBody_('Growth', all.growth);
  replaceBody_('ClassSummary', all.classSummary);
  replaceBody_('CriterionMastery', all.critMastery);
  return all.growth.length + all.classSummary.length + all.critMastery.length;
}
