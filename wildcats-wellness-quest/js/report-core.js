/* Report building (DOM-free). Builds the three distinct displays:
 *   1. Completion        = required activities finalized / all required activities (independent of correctness)
 *   2. First-attempt evidence = initial responses and points (preserved separately)
 *   3. Grade-bearing score = all 100 auto-scored points, retry-adjusted (best earned value per item retained)
 * Practice and optional post-completion practice never enter any of these.
 */
(function (root) {
  'use strict';
  var W = root.WWQ, U = W.U, P = W.Policy;
  var R = W.Report = {};

  R.GROUPS = [
    { re: /^m1\.c/, g: 'Primary dimension in context', step: 'Revisit the five dimensions and ask which one is MOST directly involved in an action.' },
    { re: /^m1\.ripple/, g: 'Connections between dimensions', step: 'Practice naming a second dimension and the mechanism that links it, such as sleep affecting focus and mood.' },
    { re: /^m2\.match/, g: 'What each metric measures', step: 'Review what blood pressure, resting heart rate, BMI, fasting glucose and total cholesterol each measure.' },
    { re: /^m2\.read/, g: 'Interpreting readings in context', step: 'Re-read the reference panel: compare to the range, check the conditions, and treat unusual readings as a reason for follow-up, not a diagnosis.' },
    { re: /^m2\.life/, g: 'Habits and health measures', step: 'Practice stating habit-to-outcome links with supported, non-guaranteed language.' },
    { re: /^m2\.intake/, g: 'Intake and follow-up questions', step: 'Review what makes an intake or follow-up question useful: context, history and repeat measurements.' },
    { re: /^m3\.ratings/, g: 'Self-assessment', step: 'Practice using both a rating and the notes to choose a strength and one realistic next step.' },
    { re: /^m3\.(loop|strat)/, g: 'Habit loop and roadblocks', step: 'Review cue → routine → reward, habit stacking, environment design and why a missed day does not erase progress.' },
    { re: /^m3\.smart/, g: 'SMART goals', step: 'Check each SMART letter separately and make sure tracking, amount and purpose fit the action and the case limits.' },
    { re: /^m4\.c/, g: 'Evaluating health claims', step: 'Use author, evidence, purpose and independent verification. Remember polish and sales motive alone do not decide credibility.' },
    { re: /^m4\.check/, g: 'Credibility checklist', step: 'Apply each checklist question using only what the post actually shows.' },
    { re: /^m5\.(a|b)/, g: 'STOP decision-making', step: 'Practice State, Think, Observe (right away and repeated), Pick for a new situation.' },
    { re: /^m5\.j/, g: 'Justifying a choice', step: 'Practice choosing the case fact that most directly supports a choice and explaining the link.' },
    { re: /^m6\.calc/, g: 'Calculating with the model', step: 'Review subtotal, daily total and running total calculations with positive and negative points.' },
    { re: /^m6\.(traj|pm1)/, g: 'Trends and accumulation', step: 'Practice reading a running-total graph and explaining how small repeated choices add up.' },
    { re: /^m6\.over/, g: 'Whole-person balance', step: 'Compare each domain to its own maximum before deciding which one is most overlooked.' },
    { re: /^m6\.stop/, g: 'Applying STOP to data', step: 'Check feasibility first, then the weaker domain, then compute the predicted effect with the category weight.' },
    { re: /^m7\./, g: 'Integrated transfer', step: 'Connect two dimensions, cite a fact that is in the case, and justify a feasible STOP or SMART action.' }
  ];
  R.groupOf = function (id) { for (var i = 0; i < R.GROUPS.length; i++) if (R.GROUPS[i].re.test(id)) return R.GROUPS[i]; return { g: 'Other', step: '' }; };

  function sumBy(arr, fn) { return arr.reduce(function (s, x) { return s + fn(x); }, 0); }

  R.build = function (state, opts) {
    opts = opts || {};
    var tot = P.totals(state), comp = P.completion(state), C = W.CONFIG;
    var earned = tot.earned;                       // UNROUNDED; used for grade boundaries
    var percent = earned / tot.max * 100;
    var items = W.ITEMS.map(function (it) {
      var rec = state.items[it.id] || P.newRec(), f = rec.attempts[0];
      var d = it.variants[0].parts.reduce(function (o, p) { var tw = it.variants[0].parts.reduce(function (s, q) { return s + q.w; }, 0); var k = p.d || it.d; o[k] = (o[k] || 0) + it.pts * p.w / tw; return o; }, {});
      return {
        id: it.id, mission: it.m, stage: it.st, topic: it.topic, group: R.groupOf(it.id).g, pts: it.pts, class: it.cls, attemptLimit: P.limitFor(it), demand: d,
        finalized: !!rec.finalized, finalizedReason: rec.finalizedReason || '', best: rec.best,
        attempts: rec.attempts.map(function (a) { return { n: a.n, variantId: a.variantId, response: a.response, rawFraction: a.raw, rawPoints: a.rawPoints, cap: a.cap, awarded: a.awarded, hintShown: !!a.hintShown, at: a.at, parts: a.parts }; }),
        firstAttempt: f ? { response: f.response, rawFraction: f.raw, points: f.awarded, variantId: f.variantId } : null
      };
    });
    var missions = W.MISSIONS.filter(function (m) { return m.id >= 1; }).map(function (m) {
      var b = tot.byMission[m.id], st = P.missionStatus(state, m.id);
      return { id: m.id, title: m.title, earned: b.earned, max: b.max, firstAttempt: b.first, items: b.items, finalized: b.finalized, activitiesDone: st.done, activitiesTotal: st.total };
    });
    var groups = {};
    items.forEach(function (i) { var g = groups[i.group] || (groups[i.group] = { group: i.group, earned: 0, max: 0, step: R.groupOf(i.id).step }); g.earned += i.best; g.max += i.pts; });
    var topics = Object.keys(groups).map(function (k) { return groups[k]; });
    var strengths = topics.filter(function (t) { return t.earned / t.max >= 0.85; }).map(function (t) { return t.group; });
    var next = topics.filter(function (t) { return t.earned / t.max < 0.7; }).sort(function (a, b) { return a.earned / a.max - b.earned / b.max; }).slice(0, 4).map(function (t) { return { group: t.group, step: t.step }; });
    var letter = P.letter(earned);
    var s = state.session, firstEarned = tot.first;
    return {
      format: 'wwq-report', schema: 1, assessmentVersion: state.assessmentVersion, app: W.CONFIG.appName + ' — ' + W.CONFIG.subtitle,
      student: { identifier: state.student.alias, period: state.student.period },
      session: { id: s.id, createdAt: s.createdAt, submittedAt: s.submittedAt || opts.submittedAt || null, status: s.status, timedOut: !!s.timedOut, teacherAuthorizedReset: s.reset || null, resetCount: s.resetCount || 0, exportedAt: U.nowISO() },
      scores: { earnedPoints: earned, earnedDisplay: U.fmt1(earned), maxPoints: tot.max, percent: percent, percentDisplay: U.fmt1(percent), letter: letter, autoScoredPoints: tot.max, manualReviewPoints: 0, pendingPoints: 0,
        rounding: 'Displayed to one decimal place. Grade boundaries use the unrounded total.' },
      completion: { done: comp.done, total: comp.total, percent: comp.pct, note: 'Completion counts required activities finalized, independent of correctness. It is separate from the earned grade.' },
      firstAttemptEvidence: { points: firstEarned, maxPoints: tot.max, percent: firstEarned / tot.max * 100, note: 'Points earned from initial responses only (attempt 1, full-credit cap), before any retries.' },
      attemptUsage: { attemptsUsed: tot.attemptsUsed, attemptsAllowed: tot.attemptsAllowed, itemsFinalizedWithUnusedRetries: tot.unusedRetryItems.length },
      policy: { caps: W.CONFIG.caps, limits: W.CONFIG.attemptLimits, rule: 'earned = rubric fraction x item points x attempt cap; the greatest earned value across attempts is retained; only the final total is rounded.' },
      missions: missions, topics: topics, strengths: strengths, nextSteps: next, items: items,
      simulation: { picks: state.sim.picks || {}, note: 'The unscored week Jordan played. Simulation points are fictional teaching weights and never convert into assessment points.' },
      reflections: state.reflections && state.reflections.share ? { m3: state.reflections.m3 || '', m7: state.reflections.m7 || '', note: 'Optional, ungraded; included because the student chose to share.' } : null,
      timing: state.timing || {},
      notes: ['This is a client-side record. It is not independently verified and can be altered by a technically capable user.', 'Optional practice is never part of this record’s scores.']
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
