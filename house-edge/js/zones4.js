/* THE HOUSE EDGE — Zone 9 (Mastery Challenge) and Zone 10 (X-Ray Everything, 10,000 reveal, prediction, reflection). */
(function (root) {
  'use strict';
  var HE = root.HE = root.HE || {}, C = HE.CONFIG, E = HE.Engine, P = HE.Progress, UI = HE.UI, Ch = HE.Charts, QE = HE.QE, Sim = HE.Sim, Slot = HE.Slot, PL = HE.Parlay;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, fmt = E.fmt, sg = E.signed, pc = E.pct, Z = HE.Zones;

  /* ---------------- ZONE 9: scenario mastery ---------------- */
  Z.z9 = { render: function (el, api) {
    var qs = HE.QUESTIONS.filter(function (q) { return q.zone === 'z9'; }), stack = UI.el('<div class="stack"></div>');
    el.appendChild(UI.el('<div class="escape"><p class="intro-p"><b>The doors are locked.</b> Each lock is a real-world scenario. Answer correctly to open it. Unlimited attempts, targeted feedback every time. Open all ' + qs.length + ' locks to reach <b>LEVEL 8: ANALYST</b>.</p><div class="locks" id="lockRow" aria-label="Lock progress"></div></div>')); el.appendChild(stack);
    function locks() { $('#lockRow', el).innerHTML = qs.map(function (q, i) { var d = P.isDone('q:' + q.id); return '<span class="padlock ' + (d ? 'open' : '') + '" title="Lock ' + (i + 1) + '"><span aria-hidden="true">' + (d ? '🔓' : '🔒') + '</span><span class="sr-only">Lock ' + (i + 1) + (d ? ' open' : ' closed') + '</span></span>'; }).join(''); }
    qs.forEach(function (q, i) {
      var c = UI.card({ title: 'Lock ' + (i + 1) + ' of ' + qs.length, kicker: q.short.toUpperCase(), step: 'q:' + q.id, body: '' }); stack.appendChild(c);
      QE.render($('.card-body', c), q.id, { onDone: function (r, rs) { api.complete('q:' + q.id); locks(); } });
    });
    locks(); UI.refreshLocks(el);
  } };

  /* ---------------- ZONE 10 ---------------- */
  function bestMine() { var m = P.get('z8.mine'); return m && m.result || null; }
  Z.z10 = { render: function (el, api) {
    var stack = UI.el('<div class="stack"></div>'); el.appendChild(stack); var g = E.game('slots');
    var sess = Slot.ensureSession(), wagers = sess.spins.map(function (s) { return s.w; }), me = Slot.tally(sess.spins);

    /* A. X-RAY EVERYTHING */
    var par = [.5, .5, .5], ps = PL.stats(par), sl = C.sports.slate[1], slp = sl.pHome, ev10 = g.ev * 10, sd = g.sd * 10;
    var STN = [
      ['slot', 'SLOT MACHINE', '<div class="st-art slotart">★ ★ ◆</div><b>BIG WIN!</b>', 'PROBABILITY TREE', '<div class="tree"><span class="tn0">spin</span>' + g.outcomes.map(function (o) { return '<span class="tn">' + esc(o.label.split('(')[0].trim()) + ' · ' + pc(o.p, 1) + '</span>'; }).join('') + '</div>'],
      ['sports', 'SPORTS BOARD', '<div class="st-art">Comets 1.74×</div><b>Raptors 2.23×</b>', 'PROBABILITY CALCULATIONS', '<code>P(Comets) = ' + slp.toFixed(2) + '<br>offered = (1 − ' + C.sports.margin + ') ÷ ' + slp.toFixed(2) + ' = ' + fmt(PL.legOdds(slp), 2) + '×<br>fair = 1 ÷ ' + slp.toFixed(2) + ' = ' + fmt(1 / slp, 2) + '×</code>'],
      ['tokens', 'TOKEN COUNTER', '<div class="st-art">1,240</div><b>TOKENS</b>', 'EXPECTED VALUE', '<code>EV = Σ p × net<br>= ' + sg(ev10, 2) + ' tokens<br>per 10-token spin</code>'],
      ['parlay', 'PARLAY SLIP', '<div class="st-art">3 LEGS<br>+572%</div><b>HUGE PAYOUT</b>', 'MULTIPLICATION TREE', '<code>0.5 × 0.5 × 0.5<br>= ' + pc(ps.prob, 1) + '<br>all three must win</code>'],
      ['streak', 'WINNING STREAK', '<div class="st-art">🔥 5 IN A ROW</div><b>I\'M ON A STREAK</b>', 'VARIANCE', '<code>Streaks of 5+ appear in<br>' + pc(E.probRunAtLeast(100, 5), 0) + ' of 100-flip sequences.<br>sd per 10-token spin ≈ ' + fmt(sd, 1) + '</code>'],
      ['results', 'PLAYER RESULTS', '<div class="st-art">+900!</div><b>"I WON"</b>', 'DISTRIBUTIONS', '<canvas class="st-cv" data-h="90" aria-label="Small distribution of simulated player results"></canvas>'],
      ['fx', 'INTERFACE EFFECTS', '<div class="st-art">♪ ✦ ✦ ✦ ♪</div><b>LIGHTS · SOUND · MOTION</b>', 'DESIGN ANNOTATIONS', '<code>animation → attention<br>sound → arousal<br>celebration → memory<br>none change the odds</code>']
    ];
    var A = UI.card({ id: 'cardEverything', title: 'Back on the casino floor', kicker: 'The final X-ray', step: 'z10.xray', body: '<p>This is where you started: lights, games, payouts. Now you have the vision to see through all of it.</p><div class="floor" id="floor">' +
      STN.map(function (s) { return '<div class="stn" data-k="' + s[0] + '"><div class="front"><small>' + s[1] + '</small>' + s[2] + '</div><div class="back"><small>' + s[3] + '</small>' + s[4] + '</div></div>'; }).join('') + '</div><div class="floor-words" id="fwords" aria-hidden="true"><span>PROBABILITY</span><span>RANDOMNESS</span><span>EXPECTED VALUE</span><span>VARIANCE</span><span>HOUSE EDGE</span><span>PSYCHOLOGY</span></div><div class="btn-row center"><button class="btn primary big xeverything" id="xEvery">🔬 X-RAY EVERYTHING</button></div><div id="fseq" class="finalseq" aria-live="polite"></div>' });
    stack.appendChild(A);
    $$('.st-cv', A).forEach(function (cv) { var s = Sim.run(2000, function (rng) { return E.playSeq('slots', wagers, rng); }), b = Sim.bounds(s, [me.net]), h = Sim.histogram(s.nets, b.lo, b.hi, 30); setTimeout(function () { Ch.hist(cv, { counts: h.counts, lo: b.lo, hi: b.hi, animate: false, markers: [], color: Ch.COL.b, leftLabel: '', rightLabel: '' }); }, 60); });
    $('#xEvery', A).addEventListener('click', function () {
      var btn = this; btn.disabled = true; document.body.classList.add('xray-on', 'xray-all'); UI.sound('xray');
      var stns = $$('.stn', A), fw = $('#fwords', A), seq = $('#fseq', A); seq.innerHTML = '';
      stns.reduce(function (p, s) { return p.then(function () { s.classList.add('flipped'); UI.sound('tick'); return UI.wait(550); }); }, Promise.resolve())
        .then(function () { fw.classList.add('on'); return UI.wait(900); })
        .then(function () { return UI.sequence(seq, ['<span class="l1">AT THE BEGINNING, YOU SAW THE GAMES.</span>'], 1800); })
        .then(function () { return UI.sequence(seq, ['<span class="l2">NOW YOU SEE THE SYSTEM.</span>'], 2000); })
        .then(function () { return UI.sequence(seq, ['<span class="l3">THE FLASHING LIGHTS DON\'T CHANGE THE MATH.</span>'], 1200); })
        .then(function () { document.body.classList.remove('xray-on', 'xray-all'); btn.disabled = false; btn.textContent = '🔬 X-RAY EVERYTHING (again)'; api.complete('z10.xray'); });
    });

    /* B. 10,000 player reveal */
    var B = UI.card({ id: 'cardReveal', title: 'ONE PLAYER… OR 10,000?', kicker: 'The final reveal', step: 'z10.reveal', needs: 'z10.xray', body: '<div class="btn-row center"><button class="btn primary big" id="rvGo">▶ PLAY THE REVEAL</button></div><div class="reveal-stage"><div id="rvTxt" class="rv-txt" aria-live="polite"></div><canvas id="rvCv" data-h="300" role="img" aria-label="Dot plot of simulated players that grows from 1 to 10,000"></canvas><div id="rvLine" class="rv-line"></div></div>' });
    stack.appendChild(B);
    $('#rvGo', B).addEventListener('click', function () {
      var btn = this; btn.disabled = true; var ref = Sim.run(10000, function (rng) { return E.playSeq('slots', wagers, rng); }), b = Sim.bounds(ref, [me.net]), exp = E.expectedSeq('slots', wagers).net;
      var stages = [[1, 'ONE PLAYER', '"Anything can happen."'], [10, '10 PLAYERS', ''], [100, '100 PLAYERS', ''], [1000, '1,000 PLAYERS', ''], [10000, '10,000 PLAYERS', '']], cv = $('#rvCv', B), txt = $('#rvTxt', B), line = $('#rvLine', B);
      line.innerHTML = '';
      stages.reduce(function (p, st) { return p.then(function () {
        var s = st[0] === 10000 ? ref : Sim.run(st[0], function (rng) { return E.playSeq('slots', wagers, rng); });
        txt.innerHTML = '<b>' + st[1] + '</b> ' + (st[2] ? '<i>' + st[2] + '</i>' : '<span class="dim">average ' + sg(s.mean, 1) + ' · finished ahead ' + pc(s.pctProfit, 1) + '</span>'); UI.sound('tick');
        Ch.dots(cv, { values: Array.prototype.slice.call(s.nets), lo: b.lo, hi: b.hi, marker: { x: me.net, label: 'YOU' } }); return UI.wait(st[0] === 1 ? 2200 : 1700);
      }); }, Promise.resolve()).then(function () { return UI.sequence(line, ['<span class="l1">DON\'T JUST WATCH THE WINNER.</span>'], 1700); })
        .then(function () { return UI.sequence(line, ['<span class="l3">LOOK AT THE MATH.</span>'], 1400); })
        .then(function () { line.insertAdjacentHTML('beforeend', '<p class="note">Across all 10,000 players the average result was <b>' + sg(ref.mean, 1) + '</b> and the mathematical expectation is <b>' + sg(exp, 1) + '</b>. <b>Gambling does not require every player to lose.</b> A game with a house advantage instead relies on mathematical rules that create an operator advantage across repeated wagering. Plenty of the dots above finished ahead, and the average still sits where the math says it will.</p>'); btn.disabled = false; btn.textContent = '↻ REPLAY'; api.complete('z10.reveal'); });
    });

    /* C. prediction vs reality */
    var pr = P.state.q.i_predict ? P.state.q.i_predict.last : null, PTXT = { more: 'MORE than 1,000 tokens', about: 'ABOUT 1,000 tokens', less: 'LESS than 1,000 tokens' };
    var mine = bestMine(), s8 = P.get('z8.sim10k');
    var Cc = UI.card({ id: 'cardPred', title: 'Return to your original prediction', kicker: 'Compare', step: 'z10.compare', needs: 'z10.reveal', body: '<div class="predgrid"><div class="mini"><small>AT THE BEGINNING, YOU PREDICTED YOU WOULD FINISH WITH…</small><b>' + (pr ? PTXT[pr] : '(no prediction saved)') + '</b></div><div class="mini"><small>YOUR ACTUAL RESULTS</small><p>Slot session (Zone 2): <b>' + fmt(me.start) + ' → ' + fmt(me.end) + '</b> (' + sg(me.net) + ')</p>' + (mine ? '<p>Strategy challenge (Zone 8): <b>' + fmt(mine.start) + ' → ' + fmt(mine.end) + '</b> (' + sg(mine.net) + ')</p>' : '<p class="dim">(Zone 8 not played.)</p>') + '</div><div class="mini"><small>10,000-PLAYER RESULT</small>' + (s8 ? '<p>Average: <b>' + sg(s8.mean, 1) + '</b> · mathematically expected: <b>' + sg(s8.expected, 1) + '</b> · finished ahead: <b>' + pc(s8.pctProfit, 1) + '</b></p>' : '<p class="dim">(Run Zone 8\'s simulation to see this.)</p>') + '</div></div><p><b>Compare them.</b> How did your actual challenge result compare with the 10,000-player average?</p><div class="choices" role="group" aria-label="Compare your result"><button class="choice" data-c="above"><span class="ltr">A</span><span>Above the average</span></button><button class="choice" data-c="near"><span class="ltr">B</span><span>Close to the average</span></button><button class="choice" data-c="below"><span class="ltr">C</span><span>Below the average</span></button></div><div class="q-fb" id="cmpFb" aria-live="polite"></div>' });
    stack.appendChild(Cc);
    $$('.choice', Cc).forEach(function (b) { b.addEventListener('click', function () {
      var ref = mine && s8 ? { net: mine.net, avg: s8.mean, sd: s8.sd } : { net: me.net, avg: E.expectedSeq('slots', wagers).net, sd: 100 };
      var truth = Math.abs(ref.net - ref.avg) <= 0.25 * ref.sd ? 'near' : (ref.net > ref.avg ? 'above' : 'below'), good = b.dataset.c === truth;
      $$('.choice', Cc).forEach(function (x) { x.classList.remove('right', 'picked'); }); b.classList.add(good ? 'right' : 'picked');
      $('#cmpFb', Cc).className = 'q-fb ' + (good ? 'ok' : 'no'); $('#cmpFb', Cc).innerHTML = (good ? '<b>Yes.</b> ' : '<b>Check the numbers:</b> ') + 'Your result was ' + sg(ref.net, 1) + ' versus an average of ' + sg(ref.avg, 1) + ', so it was <b>' + truth + '</b> the average. Whichever it was, the lesson is the same: <b>what happened to you</b> and <b>what the math predicts</b> are different questions. ' + (good ? '' : 'You can pick again.');
      if (good) api.complete('z10.compare');
    }); });

    /* D. reflection */
    var rf = P.state.reflection;
    var D = UI.card({ id: 'cardReflect', title: 'Final reflection', kicker: 'In your own words', step: 'z10.reflect', needs: 'z10.compare', body: '<p class="dim">Saved only on this device. Please do not include personal or private information.</p><label for="rf1"><b>What is the most important thing you learned about gambling today?</b></label><textarea id="rf1" rows="4" maxlength="800" placeholder="Write a few sentences…"></textarea><label for="rf2"><b>(Optional)</b> Why can someone win at gambling even when the game mathematically favors the house?</label><textarea id="rf2" rows="3" maxlength="800" placeholder="Write your thinking…"></textarea><div class="btn-row"><button class="btn primary big" id="rfSave" disabled>FINISH ▸ COMPLETE THE CHALLENGE</button><span class="dim" id="rfHint">Write at least a short sentence in the first box.</span></div>' });
    stack.appendChild(D); var r1 = $('#rf1', D), r2 = $('#rf2', D); r1.value = rf.best || ''; r2.value = rf.why || '';
    function upd() { rf.best = r1.value; rf.why = r2.value; P.save(); var ok = r1.value.trim().length >= 12; $('#rfSave', D).disabled = !ok; $('#rfHint', D).textContent = ok ? '' : 'Write at least a short sentence (12+ characters) in the first box.'; }
    r1.addEventListener('input', upd); r2.addEventListener('input', upd); upd();
    $('#rfSave', D).addEventListener('click', function () { upd(); api.complete('z10.reflect'); });
    UI.refreshLocks(el);
  } };
})(window);
