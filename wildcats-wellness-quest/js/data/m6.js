/* Mission 6 — Thousand Choices Simulator (16 scored points)
 *  calc 3 + trajectory 4 + overlooked domain 3 + repeated +/-1 choices 2 + STOP revision 4.
 * Scored questions use FIXED case weeks (Jordan / Maya / Eli) so they stay valid however the student plays the unscored week.
 * Every key below is COMPUTED from js/sim.js + the case week, never typed by hand.
 * Simulation points are fictional worksheet weights and are never converted into assessment points.
 */
(function (root) {
  'use strict';
  var W = root.WWQ, P = W.P, V = W.V, S = W.Sim, U = W.U;
  var M = U.fmtSigned;
  W.defActivity({ id: 'playWeek', m: 6, title: 'Play Jordan’s week (unscored)' });

  function wk(id) { return S.makeWeek(W.CASEWEEKS[id].rows); }
  var ORDER = ['jordan', 'maya', 'eli'];
  function vis(ds, show) { return { type: 'caseweek', ds: ds, show: show }; }
  function pts(n) { return M(n) + (Math.abs(n) === 1 ? ' point' : ' points'); }

  /* ---------- 6.2 calculations (3 pts) ---------- */
  var CALC = { jordan: { dom: 'phys', domDay: 1, totalDay: 2, runThrough: 3 }, maya: { dom: 'ment', domDay: 2, totalDay: 3, runThrough: 4 }, eli: { dom: 'env', domDay: 0, totalDay: 1, runThrough: 2 } };
  var calcVariants = ORDER.map(function (id) {
    var c = CALC[id], w = wk(id), dom = S.DOM[c.dom];
    var cells = S.catsOf(c.dom).map(function (ct) { return { n: ct.n, v: S.cellPoints(w, ct.id, c.domDay) }; });
    var subs = S.DOMAINS.map(function (d) { return { n: d.n, v: S.domainDay(w, d.id, c.totalDay) }; });
    var totals = []; for (var i = 0; i <= c.runThrough; i++) totals.push({ d: S.DAY_NAMES[i], v: S.dayTotal(w, i) });
    var name = W.CASEWEEKS[id].name;
    return V('m6.calc.' + id.charAt(0), name + '’s case week (fictional). Add the numbers; keep the signs.', [
      P('sub', dom.n + ' subtotal, ' + S.DAYS[c.domDay], 'num', [], { key: S.domainDay(w, c.dom, c.domDay), w: 1, d: 'F', hint: 'Add all four category points for that day, keeping the signs.' }),
      P('day', 'Daily total, ' + S.DAYS[c.totalDay], 'num', [], { key: S.dayTotal(w, c.totalDay), w: 1, d: 'F', hint: 'A daily total is the sum of the five domain subtotals.' }),
      P('run', 'Running total through ' + S.DAYS[c.runThrough], 'num', [], { key: totals.reduce(function (s, t) { return s + t.v; }, 0), w: 1, d: 'F', hint: 'A running total adds each day’s total to everything before it.' })
    ], { vis: { type: 'calc', name: name, domName: dom.n, domDay: S.DAY_NAMES[c.domDay], cells: cells, totalDay: S.DAY_NAMES[c.totalDay], subs: subs, throughDay: S.DAY_NAMES[c.runThrough], totals: totals } });
  });
  W.defItem({ id: 'm6.calc', m: 6, st: '6.2', pts: 3, cls: 'complex', d: 'F', topic: 'Calculate a domain subtotal, a daily total and a running total', src: 'Health_by_a_Thousand_Choices_Worksheet (scoring rules)', kind: 'form',
    hint: 'Subtotal = sum of the category points in one domain on one day. Daily total = sum of the five domain subtotals. Running total = all daily totals added so far.',
    why: 'Worksheet scoring rule: A = +weight, B = 0, C = −weight. A domain subtotal adds that domain’s categories for a day, the daily total adds the five domain subtotals, and the running total accumulates the daily totals. These are fictional teaching weights, not a validated health score.',
    variants: calcVariants });

  /* ---------- 6.3 trajectory and greatest daily effect (4 pts) ---------- */
  var TRAJ_T1 = {
    jordan: [['a', 'Falls Mon–Fri (the low), then rises on the weekend but stays below zero.', 1], ['b', 'Rises steadily all week.', 0], ['c', 'Stays almost flat near zero.', 0], ['d', 'Falls every day, including the weekend.', 0]],
    maya: [['a', 'Rises on most days, ends positive, one flat day.', 1], ['b', 'Falls all week.', 0], ['c', 'Zig-zags around zero and ends negative.', 0], ['d', 'Stays flat all week.', 0]],
    eli: [['a', 'Rises Monday, then falls most days; ends well below zero.', 1], ['b', 'Rises every day.', 0], ['c', 'Stays flat all week.', 0], ['d', 'Falls Monday, then rises all week.', 0]]
  };
  var TRAJ_T4 = {
    jordan: [['a', 'A rough stretch can be followed by recovery; a setback is not permanent.', 1], ['b', 'A negative total proves the person is unhealthy.', 0], ['c', 'After a bad day, later choices stop mattering.', 0], ['d', 'The running total shows which domain is weakest.', 0]],
    maya: [['a', 'A positive total can hide weak domains; check domain subtotals.', 1], ['b', 'A positive total means every domain is thriving.', 0], ['c', 'The total makes domain subtotals unnecessary.', 0], ['d', 'A positive total means no change is possible.', 0]],
    eli: [['a', 'Small negative days add up; several small changes can matter over a week.', 1], ['b', 'Small negative days never add up.', 0], ['c', 'The total shows exactly which choice caused each change.', 0], ['d', 'A negative total proves the person failed.', 0]]
  };
  var trajVariants = ORDER.map(function (id) {
    var w = wk(id), g = S.greatestDay(w), day = g.days[0], x = S.compute(w);
    var cats = S.CATS.map(function (c) { return { id: c.id, n: c.n, v: Math.abs(S.cellPoints(w, c.id, day)) }; }).sort(function (a, b) { return b.v - a.v; });
    var key = cats[0].id, decoys = cats.slice(1, 5);
    var t3 = [[key, cats[0].n, 1]].concat(decoys.map(function (c) { return [c.id, c.n, 0]; }));
    var dayOpts = S.DAY_NAMES.map(function (n, i) { return [String(i), n, i === day ? 1 : 0]; });
    return V('m6.traj.' + id.charAt(0), W.CASEWEEKS[id].name + '’s case week (fictional). Use the graph and table.', [
      P('t1', 'Best description of the running total?', 'radio', TRAJ_T1[id], { w: 1, d: 'A', hint: 'Look at the direction of the line each day, then how it ends.' }),
      P('t2', 'Part 2 · Greatest single-day effect (largest change either way)?', 'select', dayOpts, { fixed: true, w: 1, d: 'A', hint: 'Greatest daily effect = the largest daily total in size, whether positive or negative. Use the daily totals row.' }),
      P('t3', 'Part 3 · Which category changed most that day?', 'radio', t3, { w: 1, d: 'A', hint: 'Open the log for that day and find the category with the biggest points.' }),
      P('t4', 'Part 4 · Best-supported conclusion?', 'radio', TRAJ_T4[id], { w: 1, d: 'A', hint: 'Choose the statement that is supported by what a running total can and cannot show.' })
    ], { vis: vis(id, ['run', 'daily', 'log']) });
  });
  W.defItem({ id: 'm6.traj', m: 6, st: '6.3', pts: 4, cls: 'complex', d: 'A', topic: 'Interpret the trajectory and the greatest daily effect', src: 'Health_by_a_Thousand_Choices_Worksheet (running total, daily totals)', kind: 'form',
    hint: 'Use the graph for direction, the daily totals row for the biggest day, and the log for what drove it.',
    why: 'The running total shows accumulation: each day’s total moves it up or down. The greatest daily effect is the day with the largest daily total in size. The running total alone cannot show which domains are weak.',
    variants: trajVariants });

  /* ---------- 6.4 overlooked domain (3 pts) ---------- */
  function pct1(v) { return (v < 0 ? '\u2212' : '') + Math.abs(Math.round(v * 1000) / 10).toFixed(1) + '%'; }
  var OVER_T3 = [['a', 'Maximums differ, so compare each domain to its own; a total can hide a weak domain.', 1], ['b', 'Raw points compare fairly: every domain has the same maximum.', 0], ['c', 'A positive or small-negative total means every domain is fine.', 0], ['d', 'Only the largest raw number matters.', 0]];
  var overVariants = ORDER.map(function (id) {
    var w = wk(id), c = S.compute(w), weak = S.weakestDomain(w).ids[0], raw = S.lowestRawDomain(w).ids[0], nm = W.CASEWEEKS[id].name;
    var fmt = function (d) { return S.DOM[d].n + ' is ' + M(c.domainWeek[d]) + ' out of a possible ±' + S.domWeekMax(d) + ' (' + pct1(c.normalized[d]) + ' of its own maximum).'; };
    var strongest = S.DOMAINS.map(function (d) { return d.id; }).sort(function (a, b) { return c.normalized[b] - c.normalized[a]; })[0];
    var o2 = [['x1', fmt(weak), 1], ['x2', raw === weak ? S.DOM[raw].n + ' also has the lowest raw subtotal (' + M(c.domainWeek[raw]) + ').' : S.DOM[raw].n + ' has the lowest raw subtotal (' + M(c.domainWeek[raw]) + ').', raw === weak ? 1 : 0], ['x3', 'The overall total is ' + M(c.total) + ', so the week is mostly fine.', 0], ['x4', 'The strongest domain, ' + S.DOM[strongest].n + ', is ' + M(c.domainWeek[strongest]) + ', so it needs the most attention.', 0]];
    return V('m6.over.' + id.charAt(0), nm + '’s case week (fictional). Maximums differ by domain: use raw points AND percent of each domain’s own maximum.', [
      P('o1', 'Part 1 · Most overlooked domain, compared to its own maximum?', 'radio', S.DOMAINS.map(function (d) { return [d.id, d.n, d.id === weak ? 1 : 0]; }), { fixed: true, w: 1, d: 'A', hint: 'Compare each domain’s weekly subtotal to that domain’s own weekly maximum, not to the other domains’ raw numbers.' }),
      P('o2', 'Part 2 · Which data best supports it?', 'radio', o2, { w: 1, d: 'A', hint: 'Pick data that compares the domain to its own maximum and says how far below it is.' }),
      P('o3', 'Part 3 · What does this show about domains and totals?', 'radio', OVER_T3, { w: 1, d: 'D', hint: 'Think about what a total or a raw number hides when maximums differ.' })
    ], { vis: vis(id, ['domain', 'run']) });
  });
  W.defItem({ id: 'm6.over', m: 6, st: '6.4', pts: 3, cls: 'complex', d: 'A', topic: 'Identify an overlooked domain using supporting data', src: 'Health_by_a_Thousand_Choices_Worksheet (domain ranges)', kind: 'form',
    hint: 'Weekly maximums differ: Physical ±56, Mental ±49, Emotional ±49, Social ±56, Environmental ±35. Compare each domain to ITS OWN maximum.',
    why: 'Domains have different maximum weights, so raw comparisons can mislead. A domain that looks small in raw points can be the weakest relative to its own maximum. A positive overall total can also hide a weak domain.',
    variants: overVariants });

  /* ---------- 6.5 repeated +/-1 choices (2 pts) ---------- */
  var PM = { jordan: 'hydration', maya: 'rest', eli: 'space' };
  var pmVariants = ORDER.map(function (id) {
    var cat = PM[id], w = wk(id), ct = S.CAT[cat], g = S.gradeCount(w, cat), tot = S.catWeek(w, cat), nm = W.CASEWEEKS[id].name;
    var change = g.C * (S.points(cat, 'B') - S.points(cat, 'C'));  // change if every C day became B
    var o = [['k', M(change) + ' points: small ±1 choices repeated daily add up over a week.', 1], ['w1', M(1) + ' point: only one day would change.', 0], ['w2', M(change * 2) + ' points, because B days count double.', 0], ['w3', 'No change, because ±1 is too small to matter.', 0]];
    return V('m6.pm1.' + id.charAt(0), nm + '’s case week (fictional). **' + ct.n + '** is worth ±1 per day. This week: ' + g.A + ' A day(s), ' + g.B + ' B day(s), ' + g.C + ' C day(s). (A = +1, B = 0, C = −1.)', [
      P('n1', 'Weekly ' + ct.n + ' total?', 'num', [], { key: tot, w: 1, d: 'A', hint: 'Count A days as +1 and C days as −1, then add.' }),
      P('n2', 'If every C day were a B day, the weekly total would change by…', 'radio', o, { w: 1, d: 'A', hint: 'Each C changed to B is worth +1. Multiply by the number of C days, then think about what small repeated choices do.' })
    ], { vis: vis(id, ['log']), cat: cat });
  });
  W.defItem({ id: 'm6.pm1', m: 6, st: '6.5', pts: 2, cls: 'complex', d: 'A', topic: 'Repeated ±1 choices accumulate', src: 'Health_by_a_Thousand_Choices_Worksheet (A/B/C rules; weights)', kind: 'form',
    hint: 'A ±1 category changes the total by 1 per day. Count the days that change and multiply.',
    why: 'Small repeated choices accumulate: a ±1 choice repeated across several days changes the weekly total by several points. The points are fictional teaching weights; the lesson is accumulation, not prediction of real health.',
    variants: pmVariants });

  /* ---------- 6.6 STOP revision (4 pts) ---------- */
  function revDelta(w, r) { return r.days.reduce(function (s, d) { return s + S.points(r.cat, r.to) - S.cellPoints(w, r.cat, d); }, 0); }
  var stopVariants = ORDER.map(function (id) {
    var ds = W.CASEWEEKS[id], w = wk(id), c = S.compute(w), weak = S.weakestDomain(w).ids[0], nm = ds.name;
    var revs = ds.revisions.map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { o[k] = r[k]; }); o.delta = revDelta(w, r); o.domName = S.DOM[S.CAT[r.cat].dom].n; return o; });
    var rawLow = S.lowestRawDomain(w).ids[0];
    var r1 = revs[0], r2 = revs[1], r3 = revs[2], r4 = revs[3];
    var catData = function (cat) { var g = S.gradeCount(w, cat); return S.CAT[cat].n + ': C on ' + g.C + ' of 7 days (' + M(-g.C * S.CAT[cat].w) + ').'; };
    // distinct categories among the two weak-domain revisions
    var cats = [r1.cat]; if (r2.cat !== r1.cat) cats.push(r2.cat);
    var s3 = [];
    cats.forEach(function (ct, i) { s3.push(['dc' + i, catData(ct), 0]); });
    s3.push(['d2', S.DOM[weak].n + ': ' + M(c.domainWeek[weak]) + ' of ±' + S.domWeekMax(weak) + ' (' + pct1(c.normalized[weak]) + ' of its maximum).', 0]);
    s3.push(['d3', S.DOM[rawLow].n + (rawLow === weak ? ' also has' : ' has') + ' the lowest raw subtotal (' + M(c.domainWeek[rawLow]) + ').', 0]);
    var d4day = r3.days[0];
    s3.push(['d4', S.CAT[r3.cat].n + ': ' + S.grade(w, r3.cat, d4day) + ' on ' + S.DAYS[d4day] + ' (' + M(S.cellPoints(w, r3.cat, d4day)) + ').', 0]);
    s3.push(['d5', 'Overall total: ' + M(c.total) + '.', 0]);
    var idOf = function (cat) { return 'dc' + cats.indexOf(cat); };
    var m3 = {};
    revs.forEach(function (r) {
      var row = {};
      if (r.targets === weak) {
        cats.forEach(function (ct) { row[idOf(ct)] = ct === r.cat ? 1 : 0.5; });
        row.d2 = 1; if (rawLow === weak) row.d3 = 0.5;
      } else { row.d4 = 1; }
      m3[r.id] = row;
    });
    var eff = function (r) { return M(r.delta) + ' in ' + S.CAT[r.cat].n + ' (raises ' + r.domName + ' only).'; };
    var s4 = [['e1', eff(r1), 0], ['e2', eff(r2), 0], ['e3', eff(r3), 0], ['e4', M(r1.days.length) + ': each changed day is worth 1 (ignores weights).', 0], ['e5', M(r1.delta) + ' added to every domain.', 0]];
    var m4 = { r1: { e1: 1, e2: r1.cat === r2.cat ? 0.5 : 0 }, r2: { e2: 1, e1: r1.cat === r2.cat ? 0.5 : 0 }, r3: { e3: 1 }, r4: {} };
    if (r4.cat === r1.cat) m4.r4.e1 = r4.delta === r1.delta ? 1 : 0.5;
    else if (r4.cat === r2.cat) m4.r4.e2 = r4.delta === r2.delta ? 1 : 0.5;
    return V('m6.stop.' + id.charAt(0), '**' + nm + '’s case week (fictional).** ' + ds.bio + ' Limits: ' + ds.constraints.join('; ') + '. Apply STOP to revise ONE decision.', [
      P('s1', 'S · State the decision', 'radio', [['c', ds.state, 1]].concat(ds.wrongState.map(function (t, i) { return ['w' + i, t, 0]; })), { w: 1, d: 'D', hint: 'State the decision as a problem the person can actually solve, using the case limits.' }),
      P('s2', 'T/P · Best revision (feasible, aimed at the weaker domain)', 'radio', revs.map(function (r) { return [r.id, r.t, r.feasible ? (r.targets === weak ? 1 : 0.5) : 0]; }), { w: 1, d: 'D', hint: 'A good revision fits the case limits (time, money, transport) AND addresses the domain that is lowest compared to its own maximum. More than one revision can work.' }),
      P('s3', 'O · Best supporting data?', 'radio', s3, { w: 1, d: 'D', dep: 's2', matrix: m3, depCap: 0.5, hint: 'Choose data about the same category or domain your revision targets.' }),
      P('s4', 'O · Justified predicted effect?', 'radio', s4, { w: 1, d: 'D', dep: 's2', matrix: m4, depCap: 0.5, hint: 'Predicted effect = (new points − old points) for each changed day, using that category’s weight.' })
    ], { vis: vis(id, ['log', 'domain']), revs: revs.map(function (r) { return { id: r.id, delta: r.delta }; }) });
  });
  W.defItem({ id: 'm6.stop', m: 6, st: '6.6', pts: 4, cls: 'complex', d: 'D', topic: 'Apply STOP to a feasible revision and justify the predicted effect', src: 'Health_by_a_Thousand_Choices_Worksheet + Wildcats_Personal_Responsibility deck', kind: 'form',
    hint: 'Check feasibility first (limits), then which domain is weakest compared to its own maximum, then compute the effect with the category weight.',
    why: 'A strong revision fits the case constraints, targets the part of the week that most needs it, and has a predicted effect computed with the category weight. Several feasible revisions can be valid; simulation points are fictional and never convert into assessment points.',
    variants: stopVariants });
})(typeof window !== 'undefined' ? window : globalThis);
