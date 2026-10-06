/*
 * viewsLab.js — the Probability Lab: Parlay Probability Visualizer, Monte Carlo, Luck vs Skill, Class Experiment.
 */
(function (root) {
  'use strict';
  var PL = root.PL, A = PL.App, UI = PL.UI, V = PL.Views, esc = UI.esc, Ch = PL.Charts;
  var fmtPct = PL.Prob.fmtPct, fmtTok = PL.Prob.fmtTokens;

  var LAB_TABS = [['viz', 'Parlay Visualizer'], ['mc', 'Monte Carlo (10,000 trials)'], ['luck', 'Luck vs. Skill'], ['class', 'Class Experiment']];

  function margin() { return A.cfg().houseMargin; }
  function lab() {
    if (!A.ui.lab) A.ui.lab = { viz: { legs: 5, p: 55 }, mc: { legs: 5, p: 55, result: null }, luck: { legs: 3, p: 50, stake: 5, run: null, stage: 0, answered: null }, cls: { students: 100, preds: 100, p: 50, stake: 10, result: null } };
    return A.ui.lab;
  }

  V.lab = function () {
    var h = '<main id="main" class="lab"><div class="lab-head"><h1>PROBABILITY LAB</h1><p class="muted">Run experiments instantly. Each one uses repeated yes/no events so the long-run pattern is easy to see. House margin: <b>' + (margin() * 100).toFixed(1) + '%</b> per leg.</p></div>' +
      '<div class="subtabs" role="tablist" aria-label="Lab experiments">' + LAB_TABS.map(function (t) {
        var on = A.ui.labTab === t[0];
        return '<button type="button" class="subtab' + (on ? ' on' : '') + '" role="tab" aria-selected="' + on + '" data-act="labTab" data-tab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div><div id="lab-body">' + labBody() + '</div></main>';
    return h;
  };
  PL.Actions.labTab = function (el) { A.ui.labTab = el.getAttribute('data-tab'); A.render(); };

  function labBody() {
    switch (A.ui.labTab) {
      case 'mc': return mcView();
      case 'luck': return luckView();
      case 'class': return classView();
      default: return vizView();
    }
  }

  // ------------------------------------------------------------------ visualizer
  function vizView() {
    var s = lab().viz;
    return '<section class="card"><h2>PARLAY PROBABILITY VISUALIZER</h2>' +
      '<p class="tagline"><span class="up">LEGS ↑</span> <span class="up">PAYOUT ↑</span> <span class="down">SUCCESS PROBABILITY ↓</span></p>' +
      '<div class="sliders"><label>NUMBER OF LEGS: <b id="viz-n">' + s.legs + '</b><input type="range" min="1" max="12" step="1" value="' + s.legs + '" data-in="vizLegs" aria-label="Number of legs"></label>' +
      '<label>Chance each leg is correct: <b id="viz-pp">' + s.p + '%</b><input type="range" min="30" max="80" step="1" value="' + s.p + '" data-in="vizP" aria-label="Probability of each leg"></label></div>' +
      '<div id="viz-out">' + vizOut() + '</div></section>';
  }
  function vizOut() {
    var s = lab().viz, p = s.p / 100, rows = PL.Sim.ladder(p, 12, margin()), cur = rows[s.legs - 1];
    var prob = Ch.lineChart([{ name: 'Probability', cls: 'c0', dots: true, points: rows.map(function (r) { return { x: r.n, y: r.prob * 100 }; }) }],
      { w: 520, h: 280, xMin: 1, xMax: 12, yMin: 0, yMax: 100, xTicks: rows.map(function (r) { return { v: r.n, t: r.n }; }), yTicks: [0, 25, 50, 75, 100].map(function (v) { return { v: v, t: v + '%' }; }),
        xLabel: 'Number of Legs', yLabel: 'Probability of Entire Parlay Winning', markers: [{ x: s.legs, y: cur.prob * 100, label: fmtPct(cur.prob) }],
        label: 'Line chart: probability that the whole parlay wins falls as the number of legs rises. At ' + s.legs + ' legs it is ' + fmtPct(cur.prob) });
    var maxR = Math.max.apply(null, rows.map(function (r) { return r.offered; }));
    var ret = Ch.barChart(rows.map(function (r) { return { label: String(r.n), value: r.offered, cls: r.n === s.legs ? 'c2' : 'c3' }; }),
      { w: 520, h: 280, yMax: Ch.niceMax(maxR), yFmt: function (v) { return '×' + (v >= 100 ? Math.round(v) : v.toFixed(v >= 10 ? 0 : 1)); }, valFmt: function (v) { return '×' + v.toFixed(2); }, xLabel: 'Number of Legs', yLabel: 'Potential Return per token (offered)',
        label: 'Bar chart: potential return per token rises as legs are added. At ' + s.legs + ' legs it is about ×' + cur.offered.toFixed(1) });
    var table = '<div class="tablewrap"><table class="stats"><thead><tr><th scope="col">Legs</th><th scope="col">Probability</th><th scope="col">How to compute</th><th scope="col">Fair return ×</th><th scope="col">Offered return ×</th><th scope="col">Expected value</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr' + (r.n === s.legs ? ' class="hl"' : '') + '><th scope="row">' + r.n + ' leg' + (r.n > 1 ? 's' : '') + '</th><td>' + (r.prob * 100 < 10 ? (r.prob * 100).toFixed(2) : (r.prob * 100).toFixed(2)) + '%</td><td class="muted">' + p.toFixed(2) + (r.n > 1 ? '<sup>' + r.n + '</sup>' : '') + '</td><td>×' + r.fair.toFixed(2) + '</td><td>×' + r.offered.toFixed(2) + '</td><td class="' + (r.ev < 0 ? 'neg' : 'pos') + '">' + (r.ev * 100).toFixed(1) + '%</td></tr>'; }).join('') + '</tbody></table></div>';
    return '<div class="vizbig"><div><small>' + s.legs + ' LEG' + (s.legs > 1 ? 'S' : '') + ' → SUCCESS PROBABILITY</small><b class="down">' + fmtPct(cur.prob) + ' ↓</b></div><div><small>POTENTIAL RETURN PER TOKEN</small><b class="up">×' + cur.offered.toFixed(2) + ' ↑</b></div><div><small>EXPECTED VALUE</small><b class="' + (cur.ev < 0 ? 'neg' : 'pos') + '">' + (cur.ev * 100).toFixed(1) + '% per token</b></div></div>' +
      '<div class="charts2"><figure>' + prob + '<figcaption>Probability that the ENTIRE parlay wins</figcaption></figure><figure>' + ret + '<figcaption>Potential return (what is offered)</figcaption></figure></div>' + table +
      '<p class="muted">Large potential payouts exist because increasingly unlikely combinations of events must <b>ALL</b> happen. The offered return is lower than the fair return, and the gap grows with every leg.</p>';
  }
  PL.Actions.vizLegs = function (el) { lab().viz.legs = parseInt(el.value, 10); document.getElementById('viz-n').textContent = el.value; document.getElementById('viz-out').innerHTML = vizOut(); };
  PL.Actions.vizP = function (el) { lab().viz.p = parseInt(el.value, 10); document.getElementById('viz-pp').textContent = el.value + '%'; document.getElementById('viz-out').innerHTML = vizOut(); };

  // ------------------------------------------------------------------ Monte Carlo
  function mcView() {
    var s = lab().mc;
    return '<section class="card"><h2>MONTE CARLO LAB</h2><p>Pick a parlay size, then run 10,000 simulated parlays. Each leg is correct with the chance below. Stake: 10 Lab Tokens per parlay.</p>' +
      '<div class="optrow" role="group" aria-label="Number of legs">' + [1, 2, 3, 5, 8, 10].map(function (n) { return '<button type="button" class="chip-btn' + (s.legs === n ? ' on' : '') + '" data-act="mcLegs" data-n="' + n + '" aria-pressed="' + (s.legs === n) + '">' + n + '-leg</button>'; }).join('') + '</div>' +
      '<div class="sliders"><label>Chance each leg is correct: <b id="mc-pp">' + s.p + '%</b><input type="range" min="30" max="80" value="' + s.p + '" data-in="mcP" aria-label="Probability of each leg"></label></div>' +
      '<button type="button" class="btn go lg" data-act="mcRun">▶ RUN 10,000 SIMULATIONS</button><div id="mc-out" aria-live="polite">' + (s.result ? mcOut(s.result) : '<p class="muted">Results will appear here.</p>') + '</div></section>';
  }
  PL.Actions.mcLegs = function (el) { lab().mc.legs = parseInt(el.getAttribute('data-n'), 10); lab().mc.result = null; A.render(); };
  PL.Actions.mcP = function (el) { lab().mc.p = parseInt(el.value, 10); document.getElementById('mc-pp').textContent = el.value + '%'; };
  PL.Actions.mcRun = function () {
    var s = lab().mc;
    s.result = PL.Sim.monteCarloParlay({ legs: s.legs, p: s.p / 100, margin: margin(), stake: 10, trials: 10000 });
    document.getElementById('mc-out').innerHTML = mcOut(s.result);
    document.getElementById('mc-out').scrollIntoView({ behavior: UI.reduced() ? 'auto' : 'smooth', block: 'nearest' });
  };
  function mcOut(r) {
    var felt = r.first10.map(function (w) { return '<span class="dotres ' + (w ? 'w' : 'l') + '" title="' + (w ? 'win' : 'loss') + '">' + (w ? '✓' : '✕') + '</span>'; }).join('');
    var cMin = Math.min(-100, Math.min.apply(null, r.convergence.map(function (c) { return c.avgNet * 100; })) - 5), cMax = Math.max(20, Math.max.apply(null, r.convergence.map(function (c) { return c.avgNet * 100; })) + 10);
    var conv = Ch.lineChart([{ name: 'Average net per token risked', cls: 'c0', points: r.convergence.map(function (c) { return { x: Math.log(c.t) / Math.LN10, y: c.avgNet * 100 }; }) }],
      { w: 520, h: 280, xMin: 0, xMax: 4, yMin: cMin, yMax: cMax,
        xTicks: [0, 1, 2, 3, 4].map(function (v) { return { v: v, t: Math.pow(10, v).toLocaleString('en-US') }; }), yTicks: [0, 0.25, 0.5, 0.75, 1].map(function (f) { var v = cMin + f * (cMax - cMin); return { v: v, t: Math.round(v) + '%' }; }), xLabel: 'Number of parlays (log scale)', yLabel: 'Average result (% of tokens risked)',
        hline: { v: r.evTheory * 100, label: 'Theory: ' + (r.evTheory * 100).toFixed(1) + '%' }, label: 'Line chart: average result per token settles near the theoretical expected value as the number of trials grows' });
    var hist = Ch.histogram(r.studentEnds, { w: 520, h: 260, bins: 18, min: 0, max: Math.max(1500, Math.max.apply(null, r.studentEnds) + 50), xLabel: 'Balance after ' + r.perStudent + ' parlays (Lab Tokens)', yLabel: 'Simulated students', markers: [{ x: 1000, label: 'start 1,000' }], xFmt: function (v) { return fmtTok(v); },
      label: 'Histogram of ending balances for ' + r.studentCount + ' simulated students who each made ' + r.perStudent + ' parlays' });
    var wl = Ch.barChart([{ label: 'Wins', value: r.wins, cls: 'c1' }, { label: 'Losses', value: r.losses, cls: 'c4' }], { w: 300, h: 240, yMax: r.trials, showValues: true, valFmt: function (v) { return fmtTok(v); }, yFmt: function (v) { return fmtTok(v); }, label: 'Wins ' + r.wins + ' and losses ' + r.losses });
    return '<div class="mc-grid">' +
      '<div class="felt card inner"><div class="felt-title">WHAT IT FELT LIKE</div><p class="muted small">The first 10 parlays</p><div class="dotsrow" role="img" aria-label="First ten results">' + felt + '</div>' +
      '<p>' + r.first10.filter(Boolean).length + ' win' + (r.first10.filter(Boolean).length === 1 ? '' : 's') + ' in 10. Balance: 1,000 → <b>' + fmtTok(r.balanceAfter10) + '</b>.</p>' +
      '<p>' + (r.firstWin === null ? 'No win at all in 10,000 trials.' : 'First win came on parlay #' + r.firstWin + '.') + '</p><p class="muted small">Short runs can look very different from the long run.</p></div>' +
      '<div class="felt card inner"><div class="felt-title">WHAT HAPPENED OVER 10,000 TRIALS</div><div class="tiles">' +
      '<div><small>WINS</small><b>' + fmtTok(r.wins) + '</b></div><div><small>LOSSES</small><b>' + fmtTok(r.losses) + '</b></div><div><small>WIN PERCENTAGE</small><b>' + (r.winPct * 100).toFixed(2) + '%</b><small>theory ' + (r.theoryP * 100).toFixed(2) + '%</small></div>' +
      '<div><small>AVERAGE RETURN</small><b>' + r.avgReturn.toFixed(2) + '</b><small>tokens per 10 risked</small></div><div><small>EXPECTED VALUE</small><b class="' + (r.evSim < 0 ? 'neg' : 'pos') + '">' + (r.evSim * 100).toFixed(1) + '%</b><small>theory ' + (r.evTheory * 100).toFixed(1) + '%</small></div><div><small>LONGEST LOSING STREAK</small><b>' + r.maxLoseStreak + '</b></div></div>' +
      '<p class="muted small">Payout when it wins: ' + fmtTok(r.payout) + ' tokens on a 10-token stake. Run ID: ' + r.runId + '</p></div></div>' +
      '<div class="charts2"><figure>' + conv + '<figcaption>The long-run average settles near the expected value</figcaption></figure><figure>' + hist + '<figcaption>Distribution of outcomes: ' + r.studentsAboveStart + ' of ' + r.studentCount + ' simulated students finished above 1,000</figcaption></figure></div>' +
      '<div class="charts2"><figure>' + wl + '<figcaption>Wins vs. losses across 10,000 parlays</figcaption></figure><div class="card inner insight"><b>What to notice</b><p>Some simulated students finish ahead purely by luck, even though the average result is negative. The more legs, the wider the spread — and the more the typical student trails the start.</p></div></div>';
  }

  // ------------------------------------------------------------------ luck vs skill
  var STAGES = [20, 100, 500, 1000];
  function luckView() {
    var s = lab().luck;
    var h = '<section class="card"><h2>LUCK VS. SKILL EXPERIMENT</h2><p>Five fictional participants each begin with <b>1,000 Lab Tokens</b> and make the same kind of parlay every round. Same rules. Same odds. Only the random outcomes differ.</p>' +
      '<div class="sliders"><label>Legs per parlay: <b id="lv-legs">' + s.legs + '</b><input type="range" min="1" max="8" value="' + s.legs + '" data-in="lvLegs" aria-label="Legs per parlay"></label>' +
      '<label>Chance each leg is correct: <b id="lv-pp">' + s.p + '%</b><input type="range" min="30" max="80" value="' + s.p + '" data-in="lvP" aria-label="Probability per leg"></label>' +
      '<label>Tokens per round: <b id="lv-stake">' + s.stake + '</b><input type="range" min="1" max="20" value="' + s.stake + '" data-in="lvStake" aria-label="Tokens per round"></label></div>' +
      '<button type="button" class="btn go lg" data-act="lvStart">▶ ' + (s.run ? 'RESTART EXPERIMENT' : 'START EXPERIMENT') + '</button>';
    if (s.run) h += '<div id="lv-out">' + luckOut() + '</div>';
    return h + '</section>';
  }
  PL.Actions.lvLegs = function (el) { lab().luck.legs = parseInt(el.value, 10); document.getElementById('lv-legs').textContent = el.value; };
  PL.Actions.lvP = function (el) { lab().luck.p = parseInt(el.value, 10); document.getElementById('lv-pp').textContent = el.value + '%'; };
  PL.Actions.lvStake = function (el) { lab().luck.stake = parseInt(el.value, 10); document.getElementById('lv-stake').textContent = el.value; };
  PL.Actions.lvStart = function () {
    var s = lab().luck;
    s.run = PL.Sim.luckVsSkill({ legs: s.legs, p: s.p / 100, margin: margin(), stake: s.stake, start: 1000, rounds: 1000 });
    s.stage = 0; s.answered = null; A.render();
  };
  PL.Actions.lvStage = function (el) { lab().luck.stage = parseInt(el.getAttribute('data-stage'), 10); document.getElementById('lv-out').innerHTML = luckOut(); };
  PL.Actions.lvAnswer = function (el) { lab().luck.answered = el.getAttribute('data-ans'); document.getElementById('lv-out').innerHTML = luckOut(); };
  function luckOut() {
    var s = lab().luck, run = s.run, rounds = STAGES[s.stage], colors = ['c0', 'c1', 'c2', 'c3', 'c4'];
    var series = run.names.map(function (nm, i) {
      var pts = [], step = Math.max(1, Math.floor(rounds / 200));
      for (var r = 0; r <= rounds; r += step) pts.push({ x: r, y: run.series[i][r] });
      if (pts[pts.length - 1].x !== rounds) pts.push({ x: rounds, y: run.series[i][rounds] });
      return { name: nm, cls: colors[i], points: pts };
    });
    var all = []; run.series.forEach(function (a) { for (var r = 0; r <= rounds; r++) all.push(a[r]); });
    var yMax = Ch.niceMax(Math.max(1200, Math.max.apply(null, all) * 1.05));
    var chart = Ch.lineChart(series, { w: 640, h: 320, xMin: 0, xMax: rounds, yMin: 0, yMax: yMax, xTicks: [0, 0.25, 0.5, 0.75, 1].map(function (f) { return { v: Math.round(rounds * f), t: Math.round(rounds * f) }; }),
      yTicks: [0, 0.25, 0.5, 0.75, 1].map(function (f) { return { v: yMax * f, t: fmtTok(yMax * f) }; }), xLabel: 'Rounds', yLabel: 'Lab Tokens', hline: { v: 1000, label: 'Starting balance' }, legend: run.names.map(function (n, i) { return { name: n.replace('Student ', ''), cls: colors[i] }; }),
      label: 'Line chart of five participants\' token balances over ' + rounds + ' rounds' });
    var final = run.names.map(function (nm, i) { return { name: nm, bal: run.series[i][rounds], cls: colors[i] }; });
    var ranked = final.slice().sort(function (a, b) { return b.bal - a.bal; });
    var h = '<div class="optrow stages" role="group" aria-label="How many rounds to show">' + STAGES.map(function (r, i) {
      return '<button type="button" class="chip-btn' + (s.stage === i ? ' on' : '') + '" data-act="lvStage" data-stage="' + i + '" aria-pressed="' + (s.stage === i) + '">' + r + ' rounds</button>';
    }).join('') + '</div><figure>' + chart + '</figure>' +
      '<div class="tablewrap"><table class="stats"><thead><tr><th>Rank</th><th>Participant</th><th>Balance after ' + rounds + ' rounds</th><th>vs. start</th></tr></thead><tbody>' +
      ranked.map(function (f, i) { return '<tr><td>' + (i + 1) + '</td><th scope="row">' + f.name + '</th><td>' + fmtTok(f.bal) + '</td><td class="' + (f.bal >= 1000 ? 'pos' : 'neg') + '">' + (f.bal >= 1000 ? '+' : '') + fmtTok(f.bal - 1000) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    if (s.stage === 0) {
      h += '<div class="card inner lesson"><p><b>Does being ahead after 20 predictions prove someone discovered a winning strategy?</b></p>';
      if (!s.answered) h += '<div class="optrow">' + ['Yes', 'No', 'Not sure'].map(function (o) { return '<button class="btn" data-act="lvAnswer" data-ans="' + o + '">' + o + '</button>'; }).join('') + '</div>';
      else h += '<p class="answered">Your answer: <b>' + esc(s.answered) + '</b></p><div class="explain"><p><b>No.</b> All five participants used the <b>identical</b> strategy (' + run.legs + '-leg parlays at ' + Math.round(run.p * 100) + '% per leg, ' + run.stake + ' tokens). Whoever leads after 20 rounds is ahead because of luck. Press the 100, 500 and 1,000-round buttons to watch what happens.</p></div>';
      h += '</div>';
    } else {
      var above = final.filter(function (f) { return f.bal > 1000; }).length;
      h += '<div class="card inner insight"><b>What to notice</b><p>' + (s.stage === 3 ? 'After 1,000 rounds, ' + above + ' of 5 are above the start. The expected change per round is ' + (run.evPerRound >= 0 ? '+' : '') + run.evPerRound.toFixed(2) + ' tokens, so the long-run drift is ' + (run.evPerRound * 1000 >= 0 ? '+' : '') + Math.round(run.evPerRound * 1000) + ' tokens. A small sample (20 rounds) can say almost nothing about the strategy; a larger one reveals the math.' :
        'Early leaders often change places. Small samples are dominated by luck. If you only looked at the current leader, you would be ignoring everyone else using the same rules — that is <b>survivorship bias</b>.') + '</p></div>';
    }
    return h;
  }

  // ------------------------------------------------------------------ class experiment
  function classView() {
    var s = lab().cls;
    return '<section class="card"><h2>CLASSROOM EXPERIMENT</h2><p>Simulate a big group. Every simulated student starts with 1,000 Lab Tokens and makes the same size parlay again and again. The experiment repeats for every parlay size from 1 to 10.</p>' +
      '<div class="sliders"><label>Simulated students: <b id="cl-st">' + s.students + '</b><input type="range" min="10" max="300" step="10" value="' + s.students + '" data-in="clStudents" aria-label="Simulated students"></label>' +
      '<label>Predictions each: <b id="cl-pr">' + s.preds + '</b><input type="range" min="10" max="300" step="10" value="' + s.preds + '" data-in="clPreds" aria-label="Predictions each"></label>' +
      '<label>Chance each leg is correct: <b id="cl-p">' + s.p + '%</b><input type="range" min="30" max="80" value="' + s.p + '" data-in="clP" aria-label="Probability per leg"></label>' +
      '<label>Tokens per prediction: <b id="cl-stake">' + s.stake + '</b><input type="range" min="1" max="20" value="' + s.stake + '" data-in="clStake" aria-label="Tokens per prediction"></label></div>' +
      '<button type="button" class="btn go lg" data-act="clRun">▶ RUN CLASS EXPERIMENT</button><div id="cl-out" aria-live="polite">' + (s.result ? classOut(s.result) : '') + '</div></section>';
  }
  PL.Actions.clStudents = function (el) { lab().cls.students = parseInt(el.value, 10); document.getElementById('cl-st').textContent = el.value; };
  PL.Actions.clPreds = function (el) { lab().cls.preds = parseInt(el.value, 10); document.getElementById('cl-pr').textContent = el.value; };
  PL.Actions.clP = function (el) { lab().cls.p = parseInt(el.value, 10); document.getElementById('cl-p').textContent = el.value + '%'; };
  PL.Actions.clStake = function (el) { lab().cls.stake = parseInt(el.value, 10); document.getElementById('cl-stake').textContent = el.value; };
  PL.Actions.clRun = function () {
    var s = lab().cls;
    s.result = PL.Sim.classExperiment({ students: s.students, predictions: s.preds, p: s.p / 100, margin: margin(), stake: s.stake, start: 1000 });
    document.getElementById('cl-out').innerHTML = classOut(s.result);
  };
  function classOut(r) {
    var yMax = Ch.niceMax(Math.max.apply(null, r.sizes.map(function (x) { return x.max; })) * 1.02);
    var bars = Ch.barChart(r.sizes.map(function (x) { return { label: String(x.size), value: x.avg, cls: x.avg >= r.start ? 'c1' : 'c4' }; }),
      { w: 620, h: 290, yMax: Ch.niceMax(Math.max(1200, Math.max.apply(null, r.sizes.map(function (x) { return x.avg; })) * 1.1)), yFmt: function (v) { return fmtTok(v); }, valFmt: function (v) { return fmtTok(v) + ' tokens'; }, showValues: true, xLabel: 'Legs per parlay', yLabel: 'Average ending balance', hline: { v: r.start, label: 'Start 1,000' },
        label: 'Bar chart: average ending balance by parlay size' });
    var dots = Ch.dotStrip(r.sizes.map(function (x) { return { label: String(x.size), values: x.balances, avg: x.avg }; }), { w: 620, h: 300, yMin: 0, yMax: Math.min(yMax, Ch.niceMax(Math.max(2500, r.sizes[0].max * 2))), yFmt: function (v) { return fmtTok(v); }, xLabel: 'Legs per parlay', yLabel: 'Ending balance (each dot = one student)', hline: { v: r.start, label: 'Start' }, label: 'Dot plot of every simulated student\'s ending balance, by parlay size' });
    var best = r.sizes.slice().sort(function (a, b) { return b.avg - a.avg; })[0], most = r.sizes.slice().sort(function (a, b) { return b.max - a.max; })[0];
    return '<div class="charts2"><figure>' + bars + '<figcaption>Average ending balance by parlay size</figcaption></figure><figure>' + dots + '<figcaption>Spread of individual outcomes (bars show the average; dots above the line finished ahead)</figcaption></figure></div>' +
      '<div class="tablewrap"><table class="stats"><thead><tr><th scope="col">Legs</th><th>Payout if it wins</th><th>Average end</th><th>Median</th><th>Best</th><th>Worst</th><th>Finished ahead</th><th>Out of tokens</th></tr></thead><tbody>' +
      r.sizes.map(function (x) { return '<tr><th scope="row">' + x.size + '</th><td>' + fmtTok(x.payout) + '</td><td>' + fmtTok(x.avg) + '</td><td>' + fmtTok(x.median) + '</td><td>' + fmtTok(x.max) + '</td><td>' + fmtTok(x.min) + '</td><td>' + Math.round(x.pctAbove * 100) + '%</td><td>' + Math.round(x.pctBust * 100) + '%</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="card inner insight"><b>What to notice</b><p>The highest <i>average</i> ending balance was with ' + best.size + '-leg parlays (' + fmtTok(best.avg) + '). The single best student, though, used ' + most.size + ' legs (' + fmtTok(most.max) + ') — big wins are possible with long shots, but they are rare and most students end lower. Run ID: ' + r.runId + '.</p></div>';
  }
})(typeof window !== 'undefined' ? window : globalThis);
