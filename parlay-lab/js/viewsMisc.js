/*
 * viewsMisc.js — Join screen, Teacher dashboard + replay + reveal, Learn, My Session (history/report), Discussion.
 */
(function (root) {
  'use strict';
  var PL = root.PL, A = PL.App, UI = PL.UI, V = PL.Views, esc = UI.esc, L = PL.Lessons, Ch = PL.Charts;
  var fmtPct = PL.Prob.fmtPct, fmtTok = PL.Prob.fmtTokens;

  // =====================================================================================================
  // JOIN
  // =====================================================================================================
  var MODES = [
    ['guided', 'GUIDED MODE', 'Probabilities and explanations are visible throughout. Best for introducing concepts.'],
    ['experience', 'EXPERIENCE FIRST', 'Make decisions before detailed probabilities are revealed. Afterward, see the mathematics.'],
    ['stats', 'STATISTICS LAB', 'Focus on probability, expected value, simulation and long-run results.']
  ];

  V.join = function () {
    var link = A.link, saved = A.saved;
    var h = '<main id="main" class="join">';
    if (saved && saved.state) {
      var st = saved.state;
      h += '<section class="card existing" role="alertdialog" aria-labelledby="ex-t"><h2 id="ex-t">EXISTING SESSION FOUND</h2><p>Class code <b>' + esc(st.classCode) + '</b> • Game ' + st.gameNo + ' • <b>' + fmtTok(st.balance) + '</b> Lab Tokens • ' + st.history.length + ' parlay' + (st.history.length === 1 ? '' : 's') + ' completed.</p>' +
        '<div class="btnrow"><button class="btn go lg" data-act="restoreSession" data-autofocus>RESTORE SESSION</button><button class="btn" data-act="startOver">START OVER</button></div></section>';
    }
    h += '<section class="hero card"><div class="hero-tag">EDUCATIONAL SIMULATION</div><h1>PARLAY LAB</h1><p class="sub">Risk • Probability • Psychology</p>' +
      '<p class="nomoney"><b>No real money.</b> Lab Tokens have no monetary value.</p>' +
      '<div class="join-form"><label for="code-input">ENTER CLASS CODE</label>' +
      '<div class="join-row"><input id="code-input" class="codeinput" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="80" placeholder="e.g. H7K4P2" value="' + esc(link ? link.code : '') + '" data-enter="joinClass" aria-describedby="join-err">' +
      '<button class="btn go lg" data-act="joinClass">JOIN CLASS</button></div>' +
      '<div class="joinerr" id="join-err" role="alert">' + esc(A.ui.joinError || '') + '</div></div>' +
      '<div class="modes" role="radiogroup" aria-label="Learning mode">' + MODES.map(function (m) {
        var on = A.ui.joinMode === m[0];
        return '<button type="button" class="modecard' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-act="pickMode" data-mode="' + m[0] + '"><b>' + m[1] + '</b><span>' + m[2] + '</span></button>';
      }).join('') + '</div>' +
      '<div class="join-alt"><button class="btn" data-act="practice">INDIVIDUAL PRACTICE</button><button class="btn ghost" data-act="openTeacher">🧑‍🏫 Teacher Mode</button></div>' +
      (link ? '<p class="muted small">Class link detected: settings from your teacher will be used.</p>' : '') +
      '</section>' +
      '<section class="how"><div class="card step-card"><b>1</b><p>Study a fictional basketball matchup.</p></div><div class="card step-card"><b>2</b><p>Build predictions and parlays with Lab Tokens.</p></div><div class="card step-card"><b>3</b><p>Watch the simulated game unfold.</p></div><div class="card step-card"><b>4</b><p>See the mathematics behind the results.</p></div></section></main>';
    return h;
  };
  PL.Actions.pickMode = function (el) { A.ui.joinMode = el.getAttribute('data-mode'); UI.$$('.modecard').forEach(function (b) { var on = b.getAttribute('data-mode') === A.ui.joinMode; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); };
  PL.Actions.joinClass = function () {
    var inp = document.getElementById('code-input'), r = PL.normalizeSeed(inp ? inp.value : '');
    var err = document.getElementById('join-err');
    if (!r.ok) { A.ui.joinError = r.error; if (err) err.textContent = r.error; if (inp) inp.focus(); return; }
    A.ui.joinError = '';
    if (r.truncated) UI.toast('Long code shortened to ' + PL.MAX_SEED_LENGTH + ' characters.', 'warn');
    var cfg = A.link && A.link.code === r.seed ? A.link.config : (A.link ? A.link.config : PL.Classroom.sanitizeConfig({}));
    A.startSession({ code: r.seed, practice: false, mode: A.ui.joinMode, config: cfg });
  };
  PL.Actions.practice = function () {
    var cfg = A.link ? A.link.config : PL.Classroom.sanitizeConfig({});
    A.startSession({ code: PL.generateClassCode(6), practice: true, mode: A.ui.joinMode, config: cfg });
  };
  PL.Actions.restoreSession = function () { A.restoreSession(); };
  PL.Actions.startOver = function () { PL.Storage.clearSession(); A.saved = null; A.render(); };

  // =====================================================================================================
  // TEACHER DASHBOARD
  // =====================================================================================================
  V.teacher = function () {
    var t = A.teacher, c = t.config, code = t.code || '';
    function sel(id, v, opts) { return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; }
    function num(id, v, min, max, step) { return '<input id="' + id + '" type="number" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + v + '">'; }
    var link = code ? PL.Classroom.buildStudentLink(root.location.href, code, c, t.mode) : '';
    var h = '<main id="main" class="teacher"><h1>TEACHER DASHBOARD</h1><p class="muted">No login required. Settings are saved on this computer and travel to students inside the class link.</p>' +
      '<div class="tgrid"><section class="card"><h2>1 · Class session</h2>' +
      '<label for="t-code">Class code or seed</label><div class="join-row"><input id="t-code" class="codeinput" type="text" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="80" value="' + esc(code) + '" placeholder="HEALTH101, PERIOD3, OCTOBER6, PARLAYLAB…" data-in="tCode"><button class="btn" data-act="tGenerate">GENERATE CLASS CODE</button></div>' +
      '<div class="codebig" id="t-codebig" aria-live="polite">' + (code ? '<small>CLASSROOM CODE</small><b>' + esc(code) + '</b><button class="btn" data-act="tCopyCode">COPY CODE</button>' : '<small>Enter or generate a code</small>') + '</div>' +
      '<label for="t-mode">Default mode for the student link</label>' + sel('t-mode', t.mode || 'guided', [['guided', 'Guided Mode'], ['experience', 'Experience First'], ['stats', 'Statistics Lab']]) +
      '<div class="linkbox" id="t-link">' + (link ? '<small>Student link (carries your settings)</small><input type="text" readonly value="' + esc(link) + '" aria-label="Student link" onfocus="this.select()"><button class="btn" data-act="tCopyLink">COPY STUDENT LINK</button>' : '') + '</div>' +
      '<div class="btnrow"><button class="btn primary" data-act="tCreate">CREATE CLASS SESSION (preview as student)</button></div>' +
      '<p class="muted small">Everyone who enters the same code gets the exact same simulated game. Students who type just the code get default settings; share the link above if you changed settings.</p></section>' +
      '<section class="card"><h2>2 · Settings</h2><div class="fgrid">' +
      '<label>Starting Tokens' + num('c-start', c.startTokens, 100, 100000, 50) + '</label>' +
      '<label>Maximum Tokens Per Prediction' + num('c-stake', c.maxStake, 1, 100000, 5) + '</label>' +
      '<label>Maximum Parlay Legs' + num('c-legs', c.maxLegs, 1, 12) + '</label>' +
      '<label>House Margin (% per leg)' + num('c-margin', Math.round(c.houseMargin * 1000) / 10, 0, 25, 0.5) + '</label>' +
      '<label>Simulation Speed' + sel('c-speed', c.speed, [[1, '1X'], [2, '2X'], [4, '4X']]) + '</label>' +
      '<label>Game Length' + sel('c-len', c.quarterMinutes, [[6, 'Short (6-min quarters)'], [9, 'Medium (9-min quarters)'], [12, 'Full (12-min quarters)']]) + '</label>' +
      '<label>Reflection Frequency' + sel('c-refl', c.reflectionFreq, [['off', 'Off'], ['sometimes', 'Sometimes'], ['often', 'Often'], ['always', 'Every time']]) + '</label>' +
      '<label>Difficulty' + sel('c-diff', c.difficulty, [['intro', 'Introductory (fewer predictions)'], ['standard', 'Standard'], ['advanced', 'Advanced (all lines + EV)']]) + '</label>' +
      '<label>Probability Visibility' + sel('c-vis', c.probVisibility, [['auto', 'Follow the learning mode'], ['visible', 'Always visible'], ['on-request', 'Hidden until revealed'], ['after-lock', 'Hidden until locking in']]) + '</label>' +
      '<label>Model replays (probability accuracy)' + num('c-n', c.modelSamples, 200, 1500, 100) + '</label></div>' +
      '<div class="btnrow"><button class="btn primary" data-act="tSave">Save settings</button><button class="btn ghost" data-act="tDefaults">Restore defaults</button></div>' +
      '<p class="muted small">Difficulty and visibility change what students see — never the game itself. House margin and token limits change payouts and limits — never the game.</p></section></div>' +
      '<section class="card"><h2>3 · Run the class activity</h2><div class="tools">' +
      '<div class="tool"><b>REPLAY CLASSROOM GAME</b><p>Reconstruct the identical simulation from a code.</p><label>Class code<input id="r-code" class="codeinput small" value="' + esc(code) + '" autocapitalize="characters" spellcheck="false" maxlength="80"></label><label>Game number<input id="r-game" type="number" min="1" max="99" value="1"></label><button class="btn go" data-act="tReplay">REPLAY GAME</button></div>' +
      '<div class="tool"><b>REVEAL SIMULATION MATHEMATICS</b><p>Underlying probabilities, fair vs offered values, house margin, correlations, parlay ladder and actual outcomes for a code.</p><button class="btn" data-act="tReveal">REVEAL MATH</button></div>' +
      '<div class="tool"><b>RUN CLASS EXPERIMENT</b><p>Simulate 100 students × 100 predictions at parlay sizes 1–10.</p><button class="btn" data-act="tClassExp">RUN CLASS EXPERIMENT</button></div>' +
      '<div class="tool"><b>OPEN PROBABILITY LAB</b><p>Visualizer, Monte Carlo and luck-vs-skill for live demos.</p><button class="btn" data-act="tLab">OPEN PROBABILITY LAB</button></div>' +
      '<div class="tool"><b>RESET SESSION</b><p>Erases the saved student session on <i>this</i> computer.</p><button class="btn danger" data-act="tReset">RESET SESSION</button></div>' +
      '<div class="tool"><b>SELF-TEST</b><p>Checks reproducibility, math and token rules (takes a few seconds).</p><button class="btn" data-act="runSelfTest">Run self-test</button></div></div><div id="t-out"></div></section></main>';
    return h;
  };
  function readNum(id, d) { var el = document.getElementById(id); var v = el ? parseFloat(el.value) : d; return isFinite(v) ? v : d; }
  function readSel(id, d) { var el = document.getElementById(id); return el ? el.value : d; }
  function collectConfig() {
    return PL.Classroom.sanitizeConfig({
      startTokens: readNum('c-start', 1000), maxStake: readNum('c-stake', 100), maxLegs: readNum('c-legs', 8), houseMargin: readNum('c-margin', 5) / 100,
      speed: parseInt(readSel('c-speed', 1), 10), quarterMinutes: parseInt(readSel('c-len', 12), 10), reflectionFreq: readSel('c-refl', 'sometimes'),
      difficulty: readSel('c-diff', 'standard'), probVisibility: readSel('c-vis', 'auto'), modelSamples: readNum('c-n', 500)
    });
  }
  function updateLink() {
    var t = A.teacher, box = document.getElementById('t-link'), big = document.getElementById('t-codebig');
    if (!box) return;
    var code = PL.normalizeSeed(t.code).ok ? PL.normalizeSeed(t.code).seed : '';
    if (big) big.innerHTML = code ? '<small>CLASSROOM CODE</small><b>' + esc(code) + '</b><button class="btn" data-act="tCopyCode">COPY CODE</button>' : '<small>Enter or generate a code</small>';
    box.innerHTML = code ? '<small>Student link (carries your settings)</small><input type="text" readonly value="' + esc(PL.Classroom.buildStudentLink(root.location.href, code, t.config, t.mode)) + '" aria-label="Student link" onfocus="this.select()"><button class="btn" data-act="tCopyLink">COPY STUDENT LINK</button>' : '';
  }
  function persistTeacher() { PL.Storage.saveTeacher(A.teacher); }
  PL.Actions.tCode = function (el) { A.teacher.code = el.value.toUpperCase(); persistTeacher(); updateLink(); var r = document.getElementById('r-code'); if (r) r.value = A.teacher.code; };
  PL.Actions.tGenerate = function () { A.teacher.code = PL.generateClassCode(6); persistTeacher(); A.render(); };
  PL.Actions.tCopyCode = function () { UI.copy(A.teacher.code, 'Class code copied'); };
  PL.Actions.tCopyLink = function () {
    var code = PL.normalizeSeed(A.teacher.code).seed;
    UI.copy(PL.Classroom.buildStudentLink(root.location.href, code, A.teacher.config, A.teacher.mode), 'Student link copied');
  };
  PL.Actions.tSave = function () {
    A.teacher.config = collectConfig(); A.teacher.mode = readSel('t-mode', 'guided'); persistTeacher(); A.render(); UI.toast('Settings saved.', 'ok');
  };
  PL.Actions.tDefaults = function () { A.teacher.config = PL.Classroom.sanitizeConfig({}); persistTeacher(); A.render(); };
  PL.Actions.tCreate = function () {
    var r = PL.normalizeSeed(A.teacher.code);
    if (!r.ok) { UI.toast(r.error, 'warn'); return; }
    A.teacher.config = collectConfig(); A.teacher.mode = readSel('t-mode', 'guided'); persistTeacher();
    A.startSession({ code: r.seed, practice: false, mode: A.teacher.mode, config: A.teacher.config, teacher: true });
  };
  PL.Actions.tReset = function () {
    UI.modal({ title: 'Reset session?', html: '<p>This erases the saved student session (tokens, slips, answers and history) on this computer. The class code is not affected.</p>', actions: [{ label: 'Cancel', act: 'closeModal' }, { label: 'Reset session', act: 'doReset', cls: 'danger' }] });
  };
  PL.Actions.doReset = function () { UI.closeModal(true); PL.Storage.clearSession(); A.state = null; A.saved = null; A.prepared = null; UI.toast('Session erased.', 'ok'); A.view = 'teacher'; A.render(); };
  PL.Actions.tLab = function () {
    if (!A.state) { A.state = PL.Classroom.createSession({ classCode: 'LAB', practice: true, mode: 'stats', config: A.teacher.config, teacher: true }); A.labOnly = true; }
    A.view = 'main'; A.tab = 'lab'; A.render();
  };
  PL.Actions.tClassExp = function () { A.ui.labTab = 'class'; PL.Actions.tLab(); setTimeout(function () { var b = document.querySelector('[data-act="clRun"]'); if (b) b.click(); }, 50); };

  PL.Actions.runSelfTest = function () {
    var out = document.getElementById('t-out');
    UI.modal({ title: 'Self-test running…', html: '<div class="spinner" aria-hidden="true"></div><p class="muted">Generating games and checking the math…</p>', dismissible: false });
    setTimeout(function () {
      var r = PL.SelfTest.run({ samples: 150 });
      var html = '<p><b>' + r.passed + ' of ' + r.total + ' checks passed.</b> Game fingerprint (HEALTH101): <code>' + r.fingerprint + '</code></p><ul class="testlist">' +
        r.results.map(function (x) { return '<li class="' + (x.ok ? 'ok' : 'bad') + '">' + (x.ok ? '✓' : '✕') + ' ' + esc(x.name) + (x.detail ? '<br><small>' + esc(x.detail) + '</small>' : '') + '</li>'; }).join('') + '</ul>' +
        '<p class="muted small">The fingerprint should be identical on every computer and browser. If two Chromebooks show different fingerprints, tell the developer.</p>';
      UI.modal({ title: 'Self-test results', html: html, wide: true, actions: [{ label: 'Close', act: 'closeModal', cls: 'primary' }] });
    }, 60);
  };

  // ---- replay & reveal ----
  function readReplayCode() {
    var r = PL.normalizeSeed(readSel('r-code', A.teacher.code)); if (!r.ok) { UI.toast(r.error, 'warn'); return null; }
    var g = Math.max(1, Math.min(99, parseInt(readSel('r-game', 1), 10) || 1));
    return { code: r.seed, gameNo: g };
  }
  function openReplay(code, gameNo, reveal) {
    A.teacher.config = A.teacher.config || PL.Classroom.sanitizeConfig({});
    var cfg = A.teacher.config;
    A.view = 'loading'; A.render();
    A.loadGame({ code: code, gameNo: gameNo, config: cfg, text: 'Reconstructing the classroom game…' }).then(function (prep) {
      A.prepared = prep; A.replay = { code: code, gameNo: gameNo, index: 0, playback: { speed: cfg.speed }, step: reveal ? 3 : 0 };
      A.view = 'replay'; A.render(); root.scrollTo(0, 0);
    });
  }
  PL.Actions.tReplay = function () { var r = readReplayCode(); if (r) openReplay(r.code, r.gameNo, false); };
  PL.Actions.tReveal = function () { var r = readReplayCode(); if (r) openReplay(r.code, r.gameNo, true); };

  V.replay = function () {
    PL.Live.needsMount = (A.replay.step === 1 || A.replay.step === 2);
    var prep = A.prepared, g = prep.game, steps = L.revealSequence, r = A.replay;
    var h = '<main id="main" class="live replay"><div class="replay-head card"><div><small>TEACHER REPLAY</small><h2>Class code ' + esc(r.code) + ' · Game ' + r.gameNo + '</h2><p class="muted small">Seed <code>' + esc(prep.seed) + '</code> — identical for every student with this code. ' +
      'Fingerprint: <code>' + PL.hashString(JSON.stringify([g.result.score, g.result.qScores, g.result.stats])).join('').slice(0, 10) + '</code></p></div><div class="btnrow"><button class="btn" data-act="replayBack">← Teacher dashboard</button></div></div>' +
      '<div class="stepper card" role="tablist" aria-label="Discussion sequence">' + steps.map(function (s, i) {
        return '<button class="stepbtn' + (r.step === i ? ' on' : '') + '" role="tab" aria-selected="' + (r.step === i) + '" data-act="replayStep" data-i="' + i + '"><small>' + s.stage + '</small><b>“' + s.ask + '”</b></button>';
      }).join('') + '</div><p class="muted">' + steps[r.step].hint + '</p>';
    if (r.step === 0) h += '<div id="replay-body">' + replayPregame() + '</div>';
    else if (r.step === 3) h += '<div id="replay-body">' + revealHtml() + '</div>';
    else h += V.scoreboardHtml(g) + V.controlsHtml(true) + '<div class="live-grid"><section class="live-left"><div class="court-wrap card" id="court-wrap"></div><div class="card">' + V.lineScoreHtml(g) + '</div><div class="runline" id="runline"></div><div class="card plays"><h3>RECENT PLAYS</h3><ol id="plays"></ol></div></section><section class="live-right"><div id="tracker"></div><div class="card keyplayers"><h3>KEY PLAYERS</h3><div id="keystats"></div></div><div id="live-end"></div></section></div>' +
      (r.step === 2 ? '<div class="card"><h3>FINAL BOX SCORE</h3>' + V.boxScoreHtml(g) + '</div>' : '');
    return h + '</main>';
  };
  PL.Actions.replayBack = function () { PL.Live.unmount(); A.view = 'teacher'; A.render(); };
  PL.Actions.replayStep = function (el) {
    var i = parseInt(el.getAttribute('data-i'), 10);
    PL.Live.unmount(); A.replay.step = i;
    if (i === 2) A.replay.index = A.prepared.game.events.length;
    A.render();
  };
  PL.Actions.replayRevealOpen = function () { PL.Live.unmount(); A.replay.step = 3; A.render(); };

  function replayPregame() {
    var pre = A.prepared.pregame, m = A.prepared.game.matchup, tA = pre.teams[1], tH = pre.teams[0], f = function (v) { return v.toFixed(1); };
    return '<div class="card"><h3>' + esc(m.away.name) + ' @ ' + esc(m.home.name) + '</h3><table class="cmp"><thead><tr><th class="r">' + esc(m.away.name) + '</th><th></th><th>' + esc(m.home.name) + '</th></tr></thead><tbody>' +
      [['Record', tA.record, tH.record], ['Last 5', tA.last5, tH.last5], ['Points per game', f(tA.ppg), f(tH.ppg)], ['Points allowed', f(tA.papg), f(tH.papg)], ['Offensive rating', f(tA.ortg), f(tH.ortg)], ['Defensive rating', f(tA.drtg), f(tH.drtg)]].map(function (r) { return '<tr><td class="r">' + r[1] + '</td><th scope="row">' + r[0] + '</th><td>' + r[2] + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="card"><h3>Star players</h3><div class="tablewrap"><table class="stats"><thead><tr><th>Player</th><th>PTS</th><th>REB</th><th>AST</th><th>3PM</th></tr></thead><tbody>' +
      pre.players.filter(function (p) { return p.starter; }).map(function (p) { return '<tr><th scope="row">' + esc(p.name) + '</th><td>' + p.ppg.toFixed(1) + '</td><td>' + p.rpg.toFixed(1) + '</td><td>' + p.apg.toFixed(1) + '</td><td>' + p.tpg.toFixed(1) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  }

  // ---- REVEAL SIMULATION MATHEMATICS ----
  function revealHtml() {
    var prep = A.prepared, mk = prep.market, g = prep.game, m = g.matchup, cfg = A.teacher.config, stats = g.result.stats, N = prep.model.N;
    var h = '<div class="card"><h2>REVEAL SIMULATION MATHEMATICS</h2><p>Probabilities below come from <b>' + N + '</b> replays of this exact matchup. The game students watched is a separate draw from the same engine. Fair return = 1 ÷ probability; offered return multiplies in the ' + (cfg.houseMargin * 100).toFixed(1) + '% house margin.</p></div>';
    // team probabilities
    var ml = mk.byId['ML:H'], mla = mk.byId['ML:A'];
    h += '<div class="card"><h3>Team probabilities</h3><div class="tiles"><div><small>' + esc(m.home.name) + ' win</small><b>' + fmtPct(ml.p) + '</b></div><div><small>' + esc(m.away.name) + ' win</small><b>' + fmtPct(mla.p) + '</b></div>' +
      '<div><small>Expected margin (home)</small><b>' + (prep.model.mean('margin') >= 0 ? '+' : '') + prep.model.mean('margin').toFixed(1) + '</b></div><div><small>Expected total</small><b>' + prep.model.mean('total').toFixed(1) + '</b></div><div><small>Overtime chance</small><b>' + fmtPct(mk.byId['EV:OT:Y'].p) + '</b></div><div><small>Actual</small><b>' + g.result.score[1] + '–' + g.result.score[0] + (g.result.ot ? ' OT' : '') + '</b></div></div></div>';
    // player table: expectation vs actual
    h += '<div class="card"><h3>Players: expected vs. actual</h3><div class="tablewrap"><table class="stats"><thead><tr><th scope="col">Player</th><th>Exp MIN</th><th>Exp PTS</th><th>PTS sd</th><th>Actual PTS</th><th>Exp REB</th><th>Actual REB</th><th>Exp AST</th><th>Actual AST</th><th>Exp 3PM</th><th>Actual 3PM</th></tr></thead><tbody>' +
      g.players.map(function (p, gid) {
        var id = p.id;
        return '<tr><th scope="row">' + esc(p.name) + '</th><td>' + (prep.model.sumMin[gid] / N).toFixed(0) + '</td><td>' + prep.model.mean('pts:' + id).toFixed(1) + '</td><td>' + prep.model.sd('pts:' + id).toFixed(1) + '</td><td><b>' + stats['pts:' + id] + '</b></td><td>' + prep.model.mean('reb:' + id).toFixed(1) + '</td><td><b>' + stats['reb:' + id] + '</b></td><td>' + prep.model.mean('ast:' + id).toFixed(1) + '</td><td><b>' + stats['ast:' + id] + '</b></td><td>' + prep.model.mean('tpm:' + id).toFixed(1) + '</td><td><b>' + stats['tpm:' + id] + '</b></td></tr>';
      }).join('') + '</tbody></table></div><p class="muted small">Some players finish far above or below their average even though the model is working exactly as designed.</p></div>';
    // prices table
    h += '<div class="card"><h3>Every main prediction: probability, fair vs offered return, and what happened</h3><div class="tablewrap"><table class="stats"><thead><tr><th scope="col">Prediction</th><th>Probability</th><th>Fair ×</th><th>Offered ×</th><th>Margin cost</th><th>Outcome</th></tr></thead><tbody>' +
      mk.props.filter(function (p) { return (p.main || p.cat === 'winner' || p.cat === 'events') && p.cat !== 'player'; }).map(function (p) {
        var hit = PL.Props.resolveFinal(p, stats), fair = 1 / p.p, off = (1 - cfg.houseMargin) / p.p;
        return '<tr><th scope="row">' + esc(p.label) + '</th><td>' + fmtPct(p.p) + '</td><td>×' + fair.toFixed(2) + '</td><td>×' + off.toFixed(2) + '</td><td>' + (fair - off).toFixed(2) + '</td><td class="' + (hit ? 'pos' : 'neg') + '">' + (hit ? '✓ correct' : '✕ not met') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
    // correlations
    var star = mk.props.filter(function (p) { return p.cat === 'player' && p.statType === 'pts' && p.main && p.side === 'over' && p.gid < 8; }).sort(function (a, b) { return b.line - a.line; })[0];
    var pairs = [['ML:H', star && star.id], ['TOT:O:' + mk.props.filter(function (p) { return p.cat === 'total' && p.main; })[0].line.toFixed(1), star && star.id]];
    var starA = mk.props.filter(function (p) { return p.cat === 'player' && p.statType === 'pts' && p.main && p.side === 'over' && p.gid >= 8; }).sort(function (a, b) { return b.line - a.line; })[0];
    pairs.push(['ML:A', starA && starA.id]);
    h += '<div class="card"><h3>Correlation: independent estimate vs. simulation</h3><div class="tablewrap"><table class="stats"><thead><tr><th scope="col">Two predictions</th><th>P(A)</th><th>P(B)</th><th>If independent (A×B)</th><th>With correlation</th><th>Difference</th></tr></thead><tbody>' +
      pairs.filter(function (pr) { return pr[0] && pr[1] && mk.byId[pr[0]] && mk.byId[pr[1]]; }).map(function (pr) {
        var a = mk.byId[pr[0]], b = mk.byId[pr[1]], ev = PL.Parlay.evaluateSlip([a.id, b.id], 10, mk, cfg);
        return '<tr><th scope="row">' + esc(a.short) + ' + ' + esc(b.short) + '</th><td>' + fmtPct(a.p) + '</td><td>' + fmtPct(b.p) + '</td><td>' + fmtPct(ev.pInd) + '</td><td>' + fmtPct(ev.p) + '</td><td>' + (ev.p - ev.pInd >= 0 ? '+' : '') + ((ev.p - ev.pInd) * 100).toFixed(1) + ' pts</td></tr>';
      }).join('') + '</tbody></table></div><p class="muted small">When a team wins, its best players usually had good games — so these events travel together.</p></div>';
    // parlay ladder from a set of near-50% legs
    var ladderLegs = mk.props.filter(function (p) { return p.main && p.side !== 'under' && p.cat !== 'spread' && p.cat !== 'winner' && PL.Props.isOffered(p, cfg.houseMargin); }).slice(0, Math.min(8, cfg.maxLegs));
    var ids = [];
    h += '<div class="card"><h3>Parlay ladder: adding one leg at a time (10-token stake)</h3><div class="tablewrap"><table class="stats"><thead><tr><th scope="col">Legs</th><th>Added leg</th><th>Probability</th><th>Fair return</th><th>Offered return</th><th>Expected value</th><th>Would have…</th></tr></thead><tbody>' +
      ladderLegs.map(function (p, i) {
        ids.push(p.id);
        var ev = PL.Parlay.evaluateSlip(ids, 10, mk, cfg), won = ids.every(function (id) { return PL.Props.resolveFinal(mk.byId[id], stats); });
        return '<tr><th scope="row">' + (i + 1) + '</th><td>' + esc(p.label) + '</td><td>' + fmtPct(ev.p) + '</td><td>' + fmtTok(ev.fairReturn) + '</td><td>' + fmtTok(ev.potentialReturn) + '</td><td class="' + (ev.expectedValue < 0 ? 'neg' : 'pos') + '">' + ev.expectedValue.toFixed(1) + '</td><td>' + (won ? '✓ won' : '✕ lost') + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="muted small">Probability falls and potential return rises with each leg. Expected value gets worse because the margin is applied to every leg.</p></div>';
    h += '<div class="card"><h3>Team ratings used by the engine</h3><div class="tablewrap"><table class="stats"><thead><tr><th>Player</th><th>Team</th><th>Quality</th><th>Finishing</th><th>3PT</th><th>Rebound</th><th>Playmaking</th><th>Defense</th><th>Stamina</th><th>Usage</th></tr></thead><tbody>' +
      g.players.map(function (p) { var r = p.rating; return '<tr><th scope="row">' + esc(p.name) + '</th><td>' + (p.teamIdx ? m.away.id : m.home.id) + '</td><td>' + p.quality + '</td><td>' + r.finishing + '</td><td>' + r.three + '</td><td>' + r.reb + '</td><td>' + r.play + '</td><td>' + r.def + '</td><td>' + r.stamina + '</td><td>' + r.usage.toFixed(2) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    return h;
  }
  V.revealHtml = revealHtml;

  // =====================================================================================================
  // LEARN
  // =====================================================================================================
  V.learn = function () {
    var h = '<main id="main" class="learn"><h1>LEARN</h1><p class="muted">Short interactive ideas. Try each one.</p><div class="learn-grid">';
    h += '<section class="card" id="corr-card"><h2>Independent vs. correlated events</h2>' + corrBody() + '</section>';
    h += '<section class="card"><h2>Gambler\'s fallacy: the coin demo</h2>' + coinBody() + '</section>';
    h += '<section class="card"><h2>House advantage grows with every leg</h2>' + houseBody() + '</section>';
    h += '<section class="card"><h2>Near misses</h2><div class="nearmiss big">YOU PREDICTED 5 EVENTS. 4 WERE CORRECT. YOUR PARLAY STILL LOST.</div>' + L.nearMiss.explanation + '</section>';
    h += '<section class="card"><h2>Words to know</h2><dl class="gloss">' + L.glossary.map(function (g) { return '<dt>' + g[0] + '</dt><dd>' + g[1] + '</dd>'; }).join('') + '</dl></section></div></main>';
    return h;
  };

  // correlated explorer: uses the actual simulated replays of THIS matchup
  function corrOptions() {
    var mk = A.prepared ? A.prepared.market : null; if (!mk) return [];
    var list = [mk.byId['ML:H'], mk.byId['ML:A']];
    mk.props.forEach(function (p) {
      if ((p.cat === 'total' && p.main && p.side === 'over') || (p.cat === 'player' && p.main && p.side === 'over' && (p.statType === 'pts' || p.statType === 'reb') && p.gid % 8 < 3)) list.push(p);
    });
    return list;
  }
  function corrBody() {
    if (!A.prepared) return '<p class="muted">Join a game first — this demo uses the 500 simulated replays of your matchup.</p>';
    var opts = corrOptions(), ui = A.ui.corr = A.ui.corr || { a: opts[0].id, b: opts[Math.min(2, opts.length - 1)].id };
    function sel(id, v) { return '<select id="' + id + '" data-change="corrChange" aria-label="Prediction ' + id.slice(-1).toUpperCase() + '">' + opts.map(function (o) { return '<option value="' + esc(o.id) + '"' + (o.id === v ? ' selected' : '') + '>' + esc(o.label) + '</option>'; }).join('') + '</select>'; }
    return '<p>Some events are connected. Pick two predictions and see how often they happen <i>together</i> in the simulated replays.</p><div class="corrsel"><label>Prediction A ' + sel('corr-a', ui.a) + '</label><label>Prediction B ' + sel('corr-b', ui.b) + '</label></div><div id="corr-out">' + corrOut() + '</div>';
  }
  function corrOut() {
    var mk = A.prepared.market, ui = A.ui.corr, a = mk.byId[ui.a], b = mk.byId[ui.b];
    if (a.id === b.id) return '<p class="muted">Choose two different predictions.</p>';
    if (PL.Props.conflictBetween(a, b)) return '<p class="muted">These selections conflict — they can never both happen.</p>';
    var ia = mk.model.indicator(a.stat, a.lo, a.hi), ib = mk.model.indicator(b.stat, b.lo, b.hi), N = ia.length, both = 0, onlyA = 0, onlyB = 0;
    for (var i = 0; i < N; i++) { if (ia[i] && ib[i]) both++; else if (ia[i]) onlyA++; else if (ib[i]) onlyB++; }
    var pa = (both + onlyA) / N, pb = (both + onlyB) / N, pj = both / N, ind = pa * pb;
    var cells = '';
    for (var k = 0; k < 100; k++) {
      var cls = ia[k] && ib[k] ? 'both' : ia[k] ? 'a' : ib[k] ? 'b' : 'none', sym = ia[k] && ib[k] ? '◆' : ia[k] ? 'A' : ib[k] ? 'B' : '·';
      cells += '<span class="gcell ' + cls + '" title="Game ' + (k + 1) + '">' + sym + '</span>';
    }
    var rel = pj > ind + 0.03 ? 'tend to happen together (positively correlated)' : pj < ind - 0.03 ? 'tend NOT to happen together (negatively correlated)' : 'are close to independent';
    return '<div class="grid100" role="img" aria-label="100 simulated games coded by which predictions happened">' + cells + '</div><div class="legend"><span><i class="gcell both">◆</i> both</span><span><i class="gcell a">A</i> only A</span><span><i class="gcell b">B</i> only B</span><span><i class="gcell none">·</i> neither</span></div>' +
      '<div class="tiles"><div><small>P(A)</small><b>' + fmtPct(pa) + '</b></div><div><small>P(B)</small><b>' + fmtPct(pb) + '</b></div><div><small>If independent: A × B</small><b>' + fmtPct(ind) + '</b></div><div><small>Actually both (all ' + N + ' replays)</small><b>' + fmtPct(pj) + '</b></div></div>' +
      '<p>These two events ' + rel + '. When events are linked, multiplying their probabilities gives the wrong answer — the parlay builder uses the simulation instead.</p>';
  }
  PL.Actions.corrChange = function () {
    var ui = A.ui.corr; ui.a = document.getElementById('corr-a').value; ui.b = document.getElementById('corr-b').value;
    document.getElementById('corr-out').innerHTML = corrOut();
  };

  function coinBody() {
    var s = A.ui.coin = A.ui.coin || { streak: 4, res: null };
    var r = s.res;
    return '<p>A fair coin lands heads 4 times in a row. Is tails now "due"? Let\'s test it with 200,000 flips.</p><div class="sliders"><label>Streak length: <b id="coin-s">' + s.streak + '</b><input type="range" min="2" max="8" value="' + s.streak + '" data-in="coinStreak" aria-label="Streak length"></label></div>' +
      '<button class="btn primary" data-act="coinRun">FLIP 200,000 COINS</button><div id="coin-out" aria-live="polite">' + (r ? '<div class="tiles"><div><small>Times we saw ' + r.streak + ' heads in a row</small><b>' + fmtTok(r.cases) + '</b></div><div><small>Next flip was heads</small><b>' + (r.pct * 100).toFixed(1) + '%</b></div><div><small>Next flip was tails</small><b>' + ((1 - r.pct) * 100).toFixed(1) + '%</b></div></div><p>After a streak of ' + r.streak + ', the next flip is still about 50/50. The coin has no memory. “Due” is a feeling, not a force.</p>' : '') + '</div>';
  }
  PL.Actions.coinStreak = function (el) { A.ui.coin.streak = parseInt(el.value, 10); document.getElementById('coin-s').textContent = el.value; };
  PL.Actions.coinRun = function () {
    A.ui.coin.res = PL.Sim.streakTest(A.ui.coin.streak, 200000, PL.generateClassCode(5));
    A.render();
  };

  function houseBody() {
    var m = A.ui.houseM === undefined ? 5 : A.ui.houseM;
    var rows = PL.Sim.ladder(0.5, 10, m / 100);
    return '<p>The simulated house margin applies to <b>each leg</b>. Move the slider and watch what it does to the average result of a parlay of 50% legs.</p><div class="sliders"><label>House margin per leg: <b id="hm-v">' + m + '%</b><input type="range" min="0" max="15" step="0.5" value="' + m + '" data-in="houseSlider" aria-label="House margin"></label></div><div id="hm-out">' + houseOut(rows) + '</div>';
  }
  function houseOut(rows) {
    var chart = Ch.barChart(rows.map(function (r) { return { label: String(r.n), value: r.ev * 100, cls: r.ev < 0 ? 'c4' : 'c1' }; }), { w: 520, h: 240, yMin: -100, yMax: 20, yTicks: [-100, -75, -50, -25, 0].map(function (v) { return { v: v, t: v + '%' }; }), yFmt: function (v) { return Math.round(v) + '%'; }, valFmt: function (v) { return v.toFixed(1) + '%'; }, xLabel: 'Legs', yLabel: 'Average result per token', label: 'Expected value by number of legs' });
    return chart + '<p class="muted small">Even with 0% margin the average result is exactly 0 (fair). With any margin, the average loss gets bigger with more legs: the margin is charged again for every leg.</p>';
  }
  PL.Actions.houseSlider = function (el) {
    A.ui.houseM = parseFloat(el.value); document.getElementById('hm-v').textContent = el.value + '%';
    document.getElementById('hm-out').innerHTML = houseOut(PL.Sim.ladder(0.5, 10, A.ui.houseM / 100));
  };

  // =====================================================================================================
  // MY SESSION (history + report)
  // =====================================================================================================
  V.report = function () {
    var s = A.state, st = PL.Analytics.sessionStats(s), tab = A.ui.reportTab;
    var h = '<main id="main" class="report"><div class="subtabs" role="tablist"><button class="subtab' + (tab === 'history' ? ' on' : '') + '" role="tab" aria-selected="' + (tab === 'history') + '" data-act="reportTab" data-tab="history">Session History</button><button class="subtab' + (tab === 'report' ? ' on' : '') + '" role="tab" aria-selected="' + (tab === 'report') + '" data-act="reportTab" data-tab="report">Final Report</button></div>';
    h += tab === 'history' ? historyBody(s, st) : reportBody(s, st);
    return h + '</main>';
  };
  PL.Actions.reportTab = function (el) { A.ui.reportTab = el.getAttribute('data-tab'); A.render(); };
  function statTiles(st) {
    var items = [['Total Predictions', st.totalPredictions], ['Total Parlays', st.totalParlays], ['Parlays Won', st.parlaysWon], ['Parlays Lost', st.parlaysLost], ['Total Tokens Risked', fmtTok(st.totalRisked)], ['Total Tokens Returned', fmtTok(st.totalReturned)], ['Net Tokens', (st.net >= 0 ? '+' : '') + fmtTok(st.net)], ['Average Number of Legs', st.avgLegs.toFixed(1)], ['Largest Potential Payout', fmtTok(st.largestPotential)], ['Largest Actual Return', fmtTok(st.largestActual)]];
    return '<div class="tiles">' + items.map(function (i) { return '<div><small>' + i[0] + '</small><b>' + i[1] + '</b></div>'; }).join('') + '</div>';
  }
  function historyBody(s, st) {
    var h = '<section class="card"><h2>SESSION HISTORY</h2>' + statTiles(st);
    if (!s.history.length) return h + '<p class="muted">No completed parlays yet.</p></section>';
    h += '<div class="tablewrap"><table class="stats hist"><thead><tr><th scope="col">Round</th><th>Number of Legs</th><th>Tokens Risked</th><th>Potential Return</th><th>Estimated Probability</th><th>Result</th><th>Tokens Returned</th><th>Ending Balance</th></tr></thead><tbody>' +
      s.history.map(function (r) { return '<tr><th scope="row">' + r.round + '</th><td>' + r.legs + '</td><td>' + fmtTok(r.stake) + '</td><td>' + fmtTok(r.potentialReturn) + '</td><td>' + fmtPct(r.p) + '</td><td class="' + (r.result === 'WIN' ? 'pos' : 'neg') + '">' + (r.result === 'WIN' ? '✓ WIN' : '✕ LOSS') + ' <small>(' + r.hits + '/' + r.legs + ')</small></td><td>' + fmtTok(r.returned) + '</td><td>' + fmtTok(r.endBalance) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="muted small">Round = game number.slip number. Ending balance is after that game\'s tokens are settled.</p>' +
      '<div class="btnrow"><button class="btn" data-act="copyResults">📋 Copy results summary</button><button class="btn" data-act="copySession">📋 Copy session summary</button></div></section>';
    return h;
  }
  function reportBody(s, st) {
    var obs = PL.Analytics.observations(s);
    var h = '<section class="card reportcard"><div class="rep-title">PARLAY LAB<br><small>SESSION REPORT</small></div><div class="tiles">' +
      [['Starting Balance', fmtTok(st.startBalance) + ' Tokens'], ['Ending Balance', fmtTok(st.endBalance) + ' Tokens'], ['Games Watched', st.gamesPlayed], ['Predictions', st.totalPredictions], ['Parlays', st.totalParlays], ['Average Parlay', st.avgLegs.toFixed(1) + ' Legs'], ['Parlays Won', st.parlaysWon], ['Parlays Lost', st.parlaysLost], ['Largest Potential Return', fmtTok(st.largestPotential) + ' Tokens'], ['Largest Actual Return', fmtTok(st.largestActual) + ' Tokens'], ['Average Initial Probability', fmtPct(st.avgInitialProb)], ['Average Final Parlay Probability', fmtPct(st.avgFinalProb)]].map(function (i) { return '<div><small>' + i[0] + '</small><b>' + i[1] + '</b></div>'; }).join('') + '</div>' +
      '<h3>Observations about your decisions</h3><ul class="obs">' + obs.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>';
    var ref = s.answers.reflections;
    if (ref.length) h += '<h3>Your reflections</h3><ul class="obs">' + ref.map(function (r) { return '<li><b>' + esc(r.q) + '</b><br>' + esc(r.text) + '</li>'; }).join('') + '</ul>';
    var al = s.answers.addLeg; if (al.length) h += '<h3>“What influenced your decision?”</h3><p>' + al.map(function (a) { return (a.added ? 'Added a leg' : 'Kept the parlay') + ': ' + esc(a.influence); }).join(' • ') + '</p>';
    h += '<div class="btnrow"><button class="btn primary" data-act="copySession">📋 COPY SESSION SUMMARY</button><button class="btn" data-act="copyResults">📋 COPY RESULTS</button><button class="btn" data-act="printReport">🖨 Print / Save as PDF</button></div>' +
      '<p class="muted small">Lab Tokens have no real-world value. Nothing is uploaded: summaries are copied as plain text for your LMS if your teacher asks.</p></section>';
    return h;
  }
  PL.Actions.printReport = function () { root.print(); };

  // =====================================================================================================
  // DISCUSSION
  // =====================================================================================================
  V.discuss = function () {
    var s = A.state, st = PL.Analytics.sessionStats(s), h = '<main id="main" class="discuss"><section class="card"><h1>CLASS DISCUSSION</h1><p class="muted">Use these as discussion prompts, not graded answers. Your own numbers are shown so you can compare with classmates.</p>';
    h += '<div class="tiles"><div><small>My largest parlay</small><b>' + st.largestParlay + ' leg' + (st.largestParlay === 1 ? '' : 's') + '</b></div><div><small>My highest potential return</small><b>' + fmtTok(st.largestPotential) + '</b></div><div><small>My average probability</small><b>' + (st.totalParlays ? fmtPct(st.avgFinalProb) : '—') + '</b></div><div><small>My near misses</small><b>' + st.nearMisses + '</b></div></div>';
    var big = s.history.slice().sort(function (a, b) { return b.potentialReturn - a.potentialReturn; })[0];
    if (big) h += '<p class="callout2">Your slip with the highest potential return (' + fmtTok(big.potentialReturn) + ') had an estimated probability of <b>' + fmtPct(big.p) + '</b>' + (big.result === 'WIN' ? ' — and it won.' : ' — and it did not win.') + ' Compare it with your slip that was most likely to win.</p>';
    h += '<ol class="qlist big">' + L.discussion.map(function (q) { return '<li>' + q + '</li>'; }).join('') + '</ol></section>';
    h += '<section class="card sgdd"><div class="sgdd-title">SAME GAME. DIFFERENT DECISIONS.</div><ul class="qlist">' + L.sameGame.map(function (q) { return '<li>' + q + '</li>'; }).join('') + '</ul><div class="btnrow"><button class="btn" data-act="copyResults">📋 COPY RESULTS</button></div></section>';
    h += '<section class="card"><h2>Reflection questions</h2><ul class="qlist">' + L.reflections.map(function (q) { return '<li>' + q + '</li>'; }).join('') + '</ul></section></main>';
    return h;
  };
})(typeof window !== 'undefined' ? window : globalThis);
