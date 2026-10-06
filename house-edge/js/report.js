/* THE HOUSE EDGE — completion screen, My Gambling Literacy Report, Exit Ticket, print sheet, Help & Sources. */
(function (root) {
  'use strict';
  var HE = root.HE = root.HE || {}, C = HE.CONFIG, E = HE.Engine, P = HE.Progress, UI = HE.UI, Ch = HE.Charts, QE = HE.QE, Slot = HE.Slot;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, fmt = E.fmt, sg = E.signed, pc = E.pct;
  var R = HE.Report = {};
  var PTXT = { more: 'more than 1,000 tokens', about: 'about 1,000 tokens', less: 'less than 1,000 tokens' };
  var BADGES = ['ODDS SPOTTER', 'PATTERN BREAKER', 'VALUE DETECTIVE', 'HOUSE EDGE HUNTER', 'PARLAY DECODER', 'BIAS BREAKER', 'SIMULATION SCIENTIST', 'ANALYST'];
  var CONCEPT_SHOW = [['probability', 'PROBABILITY'], ['randomness', 'RANDOMNESS'], ['ev', 'EXPECTED VALUE'], ['houseEdge', 'HOUSE EDGE'], ['rtp', 'RTP'], ['variance', 'VARIANCE'], ['parlays', 'PARLAYS'], ['biases', 'COGNITIVE BIASES'], ['longRun', 'LONG-RUN THINKING']];

  /* ---------------- data gatherers (all from localStorage) ---------------- */
  R.data = function () {
    var m8 = P.get('z8.mine'), mine = m8 && m8.result, z2 = P.get('z2.session'), slotT = z2 && z2.spins && z2.spins.length ? Slot.tally(z2.spins) : null;
    var sim = P.get('z8.sim10k'), pr = P.state.q.i_predict && P.state.q.i_predict.last;
    var personal = mine ? { start: mine.start, end: mine.end, net: mine.net, wagered: mine.wagered, returned: mine.returned, label: 'Strategy challenge' } : slotT ? { start: slotT.start, end: slotT.end, net: slotT.net, wagered: slotT.wagered, returned: slotT.returned, label: 'Slot session' } : null;
    if (!sim || !mine) { sim = P.get('z7.sim10k'); if (slotT) personal = { start: slotT.start, end: slotT.end, net: slotT.net, wagered: slotT.wagered, returned: slotT.returned, label: 'Slot session' }; }
    return { personal: personal, sim: sim, prediction: pr };
  };
  function choiceText(qid, id) { var q = HE.QMAP[qid]; if (!q || !q.choices) return ''; var c = q.choices.filter(function (x) { return x.id === id; })[0]; return c ? c.text : ''; }
  function outcomeWord(net, band) { return Math.abs(net) <= band ? 'ABOUT EVEN' : net > 0 ? 'AHEAD' : 'BEHIND'; }

  /* ---------------- Completion screen ---------------- */
  R.renderComplete = function (main) {
    var lvl = P.level();
    main.innerHTML = '<section class="complete"><div class="comp-glow" aria-hidden="true"></div><div class="comp-badge" aria-hidden="true"><b>' + lvl + '</b><small>LEVEL</small></div><h1>GAMBLING LITERACY CHALLENGE COMPLETE</h1><p class="comp-pct">100% MASTERY</p><p class="comp-lvl">LEVEL ' + lvl + ' — ' + esc(C.levels[lvl].name) + '</p>' +
      '<div class="comp-concepts" aria-label="Concepts mastered"><small>CONCEPTS MASTERED</small>' + CONCEPT_SHOW.map(function (c) { return '<span class="cchip">✓ ' + (c[0] === 'longRun' ? 'LONG-TERM RISK' : c[1]) + '</span>'; }).join('') + '</div>' +
      '<div class="finalseq big" id="finalSeq" aria-live="polite"></div><div class="btn-row center comp-btns"><button class="btn primary big" id="cReport">My Gambling Literacy Report ▸</button><button class="btn" id="cExit">Exit Ticket</button><button class="btn" id="cDebrief">Classroom Debrief</button><button class="btn ghost" id="cReplay">↻ Replay the ending</button><button class="btn ghost" id="cBack">Review zones</button></div><p class="dim center">Your reward was never the tokens. It was the ability to see how the games work.</p></section>';
    $('#cReport', main).addEventListener('click', function () { HE.App.show('report'); });
    $('#cExit', main).addEventListener('click', function () { HE.App.show('exit'); });
    $('#cDebrief', main).addEventListener('click', function () { HE.App.show('debrief'); });
    $('#cBack', main).addEventListener('click', function () { HE.App.show('z10'); });
    function play() {
      var s = $('#finalSeq', main); s.innerHTML = ''; var L = ['AT FIRST, YOU SAW THE GAME.', 'THEN YOU SAW THE ODDS.', 'THEN YOU SAW THE MATH.', 'NOW YOU SEE THE SYSTEM.', 'DON\'T JUST WATCH THE WINNER.<br>LOOK AT THE MATH.', 'UNDERSTAND THE GAME<br>BEFORE THE GAME PLAYS YOU.'];
      L.reduce(function (p, t, i) { return p.then(function () { s.innerHTML = '<div class="fs-line k' + Math.min(i, 5) + '">' + t + '</div>'; return UI.wait(i >= 4 ? 3000 : 1900); }); }, Promise.resolve());
    }
    $('#cReplay', main).addEventListener('click', play);
    UI.confetti(240); UI.sound('level'); play();
  };

  /* ---------------- My Gambling Literacy Report ---------------- */
  function profileHtml() {
    var h = '<div class="skills">' + CONCEPT_SHOW.map(function (c) { var s = P.conceptStatus(c[0]); return '<div class="skill ' + (s.mastered ? 'ok' : '') + '"><span>' + c[1] + '</span><b>' + (s.mastered ? '✓ MASTERED' : 'in progress') + '</b><small>' + s.firstTry + ' of ' + s.total + ' right on the first try</small></div>'; }).join('') + '</div>';
    var lv = P.level();
    h += '<div class="badges" aria-label="Educational badges">' + BADGES.map(function (b, i) { return '<span class="badge ' + (lv >= i + 1 ? 'on' : '') + '">' + b + '</span>'; }).join('') + '</div><p class="lvl-final">OVERALL: <b>LEVEL ' + lv + ' — ' + esc(C.levels[lv].name) + '</b></p>';
    return h;
  }
  R.render = function (main) {
    var d = R.data(), p = d.personal, s = d.sim, sur = QE.surprises().slice(0, 2), cor = QE.corrected();
    var nameLine = P.pref('nameLine') ? '<label class="namefield">Name (optional): <input id="stuName" type="text" maxlength="40" value="' + esc(P.state.studentName || '') + '"></label>' : '';
    var band = s ? C.sim.breakEvenBandPct * (p ? p.wagered : 0) : 0, word = p ? outcomeWord(p.net, band) : null;
    var b = '<article class="report" id="reportDoc"><header class="rep-head"><div><small>MY</small><h1>GAMBLING LITERACY REPORT</h1><p class="dim">Generated in your browser. Nothing was sent anywhere. ' + new Date().toLocaleDateString() + '</p></div><div class="rep-lvl"><b>LEVEL ' + P.level() + '</b><span>' + esc(C.levels[P.level()].name) + '</span></div></header>' + nameLine;
    /* Before vs after */
    b += '<section class="rep-sec"><h2>WHAT I THOUGHT <span>vs.</span> WHAT I DISCOVERED</h2><div class="ba"><div class="ba-b"><small>BEFORE</small><p>' + (d.prediction ? 'I predicted I would finish with <b>' + PTXT[d.prediction] + '</b>.' : 'No starting prediction was saved.') + '</p></div><div class="ba-a"><small>AFTER</small>' + (p ? '<p><b>Actual result (' + esc(p.label) + '):</b> ' + fmt(p.start) + ' → <b>' + fmt(p.end) + '</b> tokens (' + sg(p.net) + ').</p>' : '<p>No session result saved.</p>') + (s ? '<p><b>10,000-player average:</b> ' + sg(s.mean, 1) + ' · <b>Mathematically expected:</b> ' + sg(s.expected, 1) + '</p>' : '') + '</div></div>';
    if (p && word) b += '<p class="rep-big">YOU FINISHED ' + word + '.</p><p><b>' + (p.net >= 0 ? 'Does your personal result prove the game favored you mathematically?' : 'Does your personal result prove the game was mathematically stacked against you?') + '</b></p><p class="rep-ans">Your mastery answer: <b>' + esc(choiceText('z7_prove', P.qrec('z7_prove').last) || 'NOT ENOUGH INFORMATION') + '</b>. One result is one sample. ' + (p.net >= 0 ? 'A profitable session can happen even in a negative-expectation game.' : 'A losing session is one possible outcome; it does not by itself establish the expectation either.') + ' What matters is whether you can <i>interpret</i> what happened.</p>';
    b += '</section>';
    /* Surprise */
    b += '<section class="rep-sec"><h2>MY BIGGEST SURPRISE</h2>';
    if (sur.length) b += sur.map(function (x) { return '<div class="surp"><small>YOU PREDICTED</small><p>“' + esc(x.predicted) + '”</p><small>YOU DISCOVERED</small><p>“' + esc(x.discovered) + '”</p><span class="concept">CONCEPT: ' + esc(x.label) + '</span></div>'; }).join('');
    else b += '<p>Your predictions matched the math every time you were asked. Nice instincts! The ideas that most often surprise people are <b>streaks of five or more being common in random data</b> and <b>how fast a parlay\'s win chance shrinks</b>.</p>';
    b += '</section>';
    /* Result vs 10,000 */
    b += '<section class="rep-sec"><h2>MY RESULT VS 10,000 PLAYERS</h2>';
    if (p && s) {
      b += '<div class="statrow"><div><small>STARTING TOKENS</small><b>' + fmt(p.start) + '</b></div><div><small>ENDING TOKENS</small><b>' + fmt(p.end) + '</b></div><div><small>NET RESULT</small><b>' + sg(p.net) + '</b></div><div><small>TOTAL WAGERED</small><b>' + fmt(p.wagered) + '</b></div><div><small>TOTAL RETURNED</small><b>' + fmt(p.returned) + '</b></div></div><div class="statrow"><div><small>10,000-PLAYER AVERAGE</small><b>' + sg(s.mean, 1) + '</b></div><div><small>MATHEMATICALLY EXPECTED</small><b>' + sg(s.expected, 1) + '</b></div><div><small>MY PERCENTILE</small><b>' + (s.pos ? fmt(s.pos.percentile, 0) : '—') + '</b></div></div><canvas id="repCv" data-h="280" role="img" aria-label="Distribution of 10,000 simulated players with your result marked YOU"></canvas>';
      b += '<p class="ones">ONE RESULT IS ONE SAMPLE.</p><p class="ones sm">10,000 RESULTS REVEAL THE PATTERN.</p><p>' + (p.net >= 0 ? 'You experienced a profitable simulated session. That can happen even in a negative-expectation game.' : 'Your simulated loss is one possible outcome. Individual losses alone do not establish the mathematical expectation either.') + ' Always return to the mathematics: the average of 10,000 players (' + sg(s.mean, 1) + ') sits near the expected value (' + sg(s.expected, 1) + '), while individual results ranged from ' + sg(s.min, 0) + ' to ' + sg(s.max, 0) + '.</p>';
    } else b += '<p class="dim">Complete Zone 7 and Zone 8 to see your comparison.</p>';
    b += '</section>';
    b += '<section class="rep-sec"><h2>ANALYST PROFILE</h2>' + profileHtml() + '</section>';
    b += '<section class="rep-sec"><h2>MISCONCEPTIONS I CORRECTED</h2>' + (cor.length ? '<ul class="corr">' + cor.map(function (q) { return '<li>' + esc(q.learn) + '</li>'; }).join('') + '</ul>' : '<p>You answered every required question correctly on the first try.</p>') + '</section>';
    b += '<section class="rep-sec"><h2>MY REFLECTION</h2><p><b>Most important thing I learned:</b></p><blockquote>' + esc(P.state.reflection.best || '(not written)') + '</blockquote>' + (P.state.reflection.why ? '<p><b>Why can someone win even when the game favors the house?</b></p><blockquote>' + esc(P.state.reflection.why) + '</blockquote>' : '') + '</section>';
    b += '<div class="btn-row center noprint"><button class="btn primary" id="rExit">Exit Ticket ▸</button><button class="btn" id="rPrint">PRINT / SAVE RESULTS</button><button class="btn" id="rDebrief">Classroom Debrief</button><button class="btn ghost" id="rBack">Back</button></div></article>';
    main.innerHTML = b;
    $('#rExit', main).addEventListener('click', function () { HE.App.show('exit'); }); $('#rPrint', main).addEventListener('click', R.print); $('#rDebrief', main).addEventListener('click', function () { HE.App.show('debrief'); }); $('#rBack', main).addEventListener('click', function () { HE.App.show('complete'); });
    var nm = $('#stuName', main); if (nm) nm.addEventListener('input', function () { P.state.studentName = nm.value; P.save(); });
    if (p && s && s.hist) setTimeout(function () { Ch.hist($('#repCv', main), { counts: s.hist.counts, lo: s.hist.lo, hi: s.hist.hi, color: Ch.COL.b, markers: [{ x: p.net, label: 'YOU ARE HERE ↓', color: Ch.COL.a }, { x: s.expected, label: 'expected', color: Ch.COL.d, dash: true }, { x: s.mean, label: 'average', color: Ch.COL.c, dash: true }] }); }, 50);
  };

  /* ---------------- Exit ticket ---------------- */
  var EXIT = ['Explain how someone can win money even when a game has negative expected value.', 'Why does adding more legs to a parlay generally make winning the entire parlay less likely?', 'What does house edge tell us?', 'Why can a large gambling win posted online be misleading?', 'What is one thing you understand differently now?'];
  R.EXIT = EXIT;
  R.renderExit = function (main) {
    var ex = P.state.exit, nameLine = P.pref('nameLine') ? '<label class="namefield">Name (optional): <input id="stuName2" type="text" maxlength="40" value="' + esc(P.state.studentName || '') + '"></label>' : '';
    main.innerHTML = '<article class="report"><header class="rep-head"><div><small>OPTIONAL</small><h1>EXIT TICKET</h1><p class="dim">Short answers, in your own words. Saved only on this device.</p></div></header>' + nameLine + EXIT.map(function (q, i) { return '<div class="exit-q"><label for="ex' + i + '"><b>' + (i + 1) + '.</b> ' + esc(q) + '</label><textarea id="ex' + i + '" rows="3" maxlength="900">' + esc(ex['q' + (i + 1)] || '') + '</textarea></div>'; }).join('') + '<div class="btn-row center noprint"><button class="btn primary" id="exPrint">PRINT / SAVE RESULTS</button><button class="btn" id="exReport">My Report</button><button class="btn" id="exDeb">Classroom Debrief</button><button class="btn ghost" id="exBack">Back</button></div><p class="dim center">PRINT / SAVE opens your browser\'s print window. Choose "Save as PDF" to keep a copy. Do not include private information.</p></article>';
    EXIT.forEach(function (q, i) { $('#ex' + i, main).addEventListener('input', function () { ex['q' + (i + 1)] = this.value; P.save(); }); });
    var nm = $('#stuName2', main); if (nm) nm.addEventListener('input', function () { P.state.studentName = nm.value; P.save(); });
    $('#exPrint', main).addEventListener('click', R.print); $('#exReport', main).addEventListener('click', function () { HE.App.show('report'); }); $('#exDeb', main).addEventListener('click', function () { HE.App.show('debrief'); }); $('#exBack', main).addEventListener('click', function () { HE.App.show('complete'); });
  };

  /* ---------------- Print sheet (emphasizes understanding, not winnings) ---------------- */
  R.print = function () {
    var d = R.data(), sur = QE.surprises().slice(0, 2), cor = QE.corrected(), ex = P.state.exit, sheet = $('#printSheet');
    if (!sheet) { sheet = document.createElement('div'); sheet.id = 'printSheet'; document.body.appendChild(sheet); }
    var nm = P.pref('nameLine') || C.printNameLine ? '<p class="pn">Name: ' + (P.state.studentName ? esc(P.state.studentName) : '______________________________') + '</p>' : '';
    sheet.innerHTML = '<h1>The House Edge: My Gambling Literacy Report</h1>' + nm + '<p>Date: ' + new Date().toLocaleDateString() + ' · Analyst level: <b>' + P.level() + ' — ' + esc(C.levels[P.level()].name) + '</b> · Completion: <b>' + P.percent() + '%</b></p>' +
      '<h2>Concepts mastered</h2><ul class="two">' + CONCEPT_SHOW.map(function (c) { var s = P.conceptStatus(c[0]); return '<li>' + (s.mastered ? '✓ ' : '○ ') + c[1] + '</li>'; }).join('') + '</ul>' +
      '<h2>What I thought vs. what I discovered</h2><p>' + (d.prediction ? 'At the start I predicted I would finish with ' + PTXT[d.prediction] + '.' : '') + ' ' + (d.sim ? 'Across 10,000 simulated players the average result was ' + sg(d.sim.mean, 1) + ' tokens and the mathematically expected result was ' + sg(d.sim.expected, 1) + '. My own session was a single sample among them.' : '') + '</p>' +
      '<h2>My biggest surprise</h2>' + (sur.length ? sur.map(function (x) { return '<p><i>I predicted:</i> ' + esc(x.predicted) + '<br><i>I discovered:</i> ' + esc(x.discovered) + ' (' + esc(x.label) + ')</p>'; }).join('') : '<p>My predictions matched the math.</p>') +
      '<h2>Misconceptions I corrected</h2>' + (cor.length ? '<ul>' + cor.map(function (q) { return '<li>' + esc(q.learn) + '</li>'; }).join('') + '</ul>' : '<p>None. I answered correctly the first time.</p>') +
      '<h2>My reflection</h2><p>' + esc(P.state.reflection.best || '') + '</p>' + (P.state.reflection.why ? '<p><i>Why someone can win when the game favors the house:</i> ' + esc(P.state.reflection.why) + '</p>' : '') +
      '<h2>Exit ticket</h2>' + EXIT.map(function (q, i) { return '<p><b>' + (i + 1) + '. ' + esc(q) + '</b><br>' + (esc(ex['q' + (i + 1)] || '') || '<span class="blank">&nbsp;</span>') + '</p>'; }).join('') + '<p class="foot">Tokens have no monetary value. All games were fictional classroom simulations. One result is one sample.</p>';
    setTimeout(function () { root.print(); }, 60);
  };

  /* ---------------- Help & Sources ---------------- */
  R.helpModal = function (tab) {
    var tags = { fact: C.labels.fact, assumption: C.labels.assumption, research: C.labels.research, example: C.labels.example };
    var body = '<div class="tabs" role="tablist"><button role="tab" class="tab on" data-t="help" aria-selected="true">Help &amp; support</button><button role="tab" class="tab" data-t="src" aria-selected="false">Sources &amp; learn more</button><button role="tab" class="tab" data-t="about" aria-selected="false">About &amp; privacy</button></div>' +
      '<div class="tabpane" data-p="help"><p><b>Gambling-related problems can affect people of any age, and so can the people around them.</b> If you or someone you know is worried about gambling, help is available, and it is free and confidential.</p><ul><li>Talk with a school counselor, a parent or caregiver, or another adult you trust.</li><li>In the United States, the National Problem Gambling Helpline offers call, text and chat support 24/7: <b>1-800-522-4700</b>, and the National Council on Problem Gambling site: <a href="https://ncpgambling.org/help-treatment/national-helpline-1-800-522-4700/" target="_blank" rel="noopener">ncpgambling.org/help-treatment</a>.</li><li>Your state may also have its own problem-gambling resources.</li></ul><p class="dim">This activity never asks about your own or your family\'s gambling. Everything here is hypothetical. In most places, gambling is age-restricted, and nothing in this site links to real gambling.</p></div>' +
      '<div class="tabpane hidden" data-p="src"><p class="dim">Claims in this activity are labeled: <b>' + tags.fact + '</b> (math that is true by definition), <b>' + tags.assumption + '</b> (a modeling choice in this classroom simulation), <b>' + tags.research + '</b> (a published study, with limits) and <b>' + tags.example + '</b> (made up to teach).</p><ol class="srcs">' + C.sources.map(function (s) { return '<li><span class="tag ' + s.tag + '">' + tags[s.tag] + '</span> ' + esc(s.title) + ' <a href="' + s.url + '" target="_blank" rel="noopener">open ↗</a><br><small>' + esc(s.use) + '<br><i>Status: ' + esc(s.verified) + '</i></small></li>'; }).join('') + '</ol></div>' +
      '<div class="tabpane hidden" data-p="about"><p><b>' + esc(C.tokenNotice) + '</b> This is a classroom simulation. Every team, game, machine and company is fictional.</p><p><b>Privacy:</b> your answers, predictions, simulation results and reflections are saved only in this browser\'s local storage on this device. Nothing is sent to any server, and there is no tracking or analytics.</p><p>' + esc(C.text.simNote) + '</p></div>';
    var m = UI.modal({ title: 'HELP, SUPPORT & SOURCES', body: body, wide: true });
    $$('.tab', m.el).forEach(function (t) { t.addEventListener('click', function () { $$('.tab', m.el).forEach(function (x) { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t); }); $$('.tabpane', m.el).forEach(function (p) { p.classList.toggle('hidden', p.dataset.p !== t.dataset.t); }); }); });
    if (tab) { var t = $('.tab[data-t="' + tab + '"]', m.el); if (t) t.click(); }
  };
})(window);
