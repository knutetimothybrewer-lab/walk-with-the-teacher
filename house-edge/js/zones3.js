/* THE HOUSE EDGE — Zone 7 (10,000 Players Lab) and Zone 8 (Can You Beat the House?). */
(function (root) {
  'use strict';
  var HE = root.HE = root.HE || {}, C = HE.CONFIG, E = HE.Engine, P = HE.Progress, UI = HE.UI, Ch = HE.Charts, QE = HE.QE, Sim = HE.Sim, Slot = HE.Slot;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, fmt = E.fmt, sg = E.signed, pc = E.pct, Z = HE.Zones;

  /* Shared: describe where a value sits in a distribution (never hard-coded; always computed). */
  HE.describePosition = function (pos, net) {
    var p = pos.percentile, better = pos.below, worse = pos.above;
    var line = p >= 90 ? 'Your session produced an <b>unusually strong result</b>.' : p <= 10 ? 'Your session produced an <b>unusually rough result</b>. That is not a judgment of you. Variance creates unusually good <i>and</i> unusually bad outcomes.' : 'Your session landed <b>fairly close to the middle</b> of the simulated players.';
    return line + ' You did better than <b>' + pc(pos.below, 1) + '</b> of simulated players and worse than <b>' + pc(pos.above, 1) + '</b> (percentile ' + fmt(p, 0) + ').';
  };
  function statGrid(s, pos, mine) {
    return '<div class="statrow"><div><small>AVERAGE (SIMULATED)</small><b>' + sg(s.mean, 1) + '</b></div><div><small>MEDIAN</small><b>' + sg(s.median, 0) + '</b></div><div><small>WORST / BEST</small><b>' + sg(s.min, 0) + ' / ' + sg(s.max, 0) + '</b></div><div><small>FINISHED AHEAD</small><b>' + pc(s.pctProfit, 1) + '</b></div><div><small>FINISHED BEHIND</small><b>' + pc(s.pctLoss, 1) + '</b></div><div><small>NEAR BREAK-EVEN (±' + pc(C.sim.breakEvenBandPct, 0) + ' of wagers)</small><b>' + pc(s.pctBreakEven, 1) + '</b></div>' + (pos ? '<div class="you"><small>YOUR PERCENTILE</small><b>' + fmt(pos.percentile, 0) + '</b></div>' : '') + '</div>';
  }
  HE.statGrid = statGrid;

  /* =====================================================================
     ZONE 7 — The 10,000 Players Lab
     ===================================================================== */
  Z.z7 = { render: function (el, api) {
    var sess = Slot.ensureSession(), spins = sess.spins, wagers = spins.map(function (s) { return s.w; }), me = Slot.tally(spins), g = E.game('slots');
    var exp = E.expectedSeq('slots', wagers); me.expected = exp.net; P.set('z7.mine', { start: me.start, end: me.end, net: me.net, wagered: me.wagered, returned: me.returned, bets: me.bets, expected: exp.net, demo: !!sess.demo });
    var stack = UI.el('<div class="stack"></div>'); el.appendChild(stack);
    var last = null, prev = null, sizes = P.get('z7.sizes', {}), lastN = 0;
    function simPlayers(n) { return Sim.run(n, function (rng) { return E.playSeq('slots', wagers, rng); }); }
    function draw(cv, sum, extra, o) {
      var b = Sim.bounds(sum, [me.net].concat(extra || [])), h = Sim.histogram(sum.nets, b.lo, b.hi, C.sim.bins), pos = Sim.position(sum, me.net);
      var mk = [{ x: me.net, label: 'YOU ARE HERE ↓', color: Ch.COL.a }, { x: exp.net, label: 'expected', color: Ch.COL.d, dash: true }]; if (sum.n >= 100) mk.push({ x: sum.mean, label: 'average', color: Ch.COL.c, dash: true });
      var oh = o && o.overlay ? { counts: Sim.histogram(o.overlay.nets, b.lo, b.hi, C.sim.bins).counts, color: Ch.COL.e } : null;
      Ch.hist(cv, { counts: h.counts, lo: b.lo, hi: b.hi, markers: mk, overlays: oh ? [oh] : [], normalize: !!oh, color: Ch.COL.b, alt: 'Distribution of net results of ' + sum.n + ' simulated players with your result marked' });
      return pos;
    }

    /* A. one outcome vs many */
    var A = UI.card({ id: 'cardLab', title: 'YOU EXPERIENCED ONE POSSIBLE OUTCOME.', kicker: 'Simulate it', step: 'z7.run', body:
      '<div class="statrow mine"><div><small>YOUR STARTING TOKENS</small><b>' + fmt(me.start) + '</b></div><div><small>YOUR ENDING TOKENS</small><b>' + fmt(me.end) + '</b></div><div><small>YOUR NET</small><b class="' + (me.net >= 0 ? 'pos' : 'neg') + '">' + sg(me.net) + '</b></div><div><small>WAGERED / RETURNED</small><b>' + fmt(me.wagered) + ' / ' + fmt(me.returned) + '</b></div></div>' +
      (sess.demo ? '<p class="note">(Teacher demo: no Zone 2 session found, so a sample 12-spin session was generated.)</p>' : '') +
      '<h3 class="big-q">WHAT IF 10,000 PEOPLE PLAYED THE SAME GAME?</h3><p>Every simulated player makes the <b>same ' + me.bets + ' wagers you did</b> on Neon Orchard, using the identical probabilities and payouts. <span class="dim">' + esc(C.text.simNote) + '</span></p><div class="btn-row" id="simBtns"></div><canvas id="distCv" data-h="300" role="img" aria-label="Distribution of simulated players with your result marked"></canvas><div id="simStats"></div><table class="vision" id="sizeTbl"></table><div id="lln"></div>' });
    stack.appendChild(A);
    function sizeTbl() { var rows = C.sim.sizes.filter(function (n) { return sizes[n]; }); $('#sizeTbl', A).innerHTML = rows.length ? '<thead><tr><th>Players</th><th>Average result</th><th>Expected</th><th>Gap</th></tr></thead><tbody>' + rows.map(function (n) { var r = sizes[n]; return '<tr><td>' + fmt(n) + '</td><td>' + sg(r.mean, 1) + '</td><td>' + sg(exp.net, 1) + '</td><td>' + fmt(Math.abs(r.mean - exp.net), 1) + '</td></tr>'; }).join('') + '</tbody>' : ''; }
    C.sim.sizes.forEach(function (n) {
      var b = UI.el('<button class="btn ' + (n === 10000 ? 'primary' : '') + '" type="button">' + (n === 10000 ? 'SIMULATE 10,000 PLAYERS' : fmt(n) + ' players') + '</button>'); $('#simBtns', A).appendChild(b);
      b.addEventListener('click', function () {
        UI.sound('click'); var t0 = performance.now(); var sum = simPlayers(n); prev = last; last = sum; lastN = n; sizes[n] = { mean: sum.mean }; P.set('z7.sizes', sizes);
        var pos = draw($('#distCv', A), sum); $('#simStats', A).innerHTML = statGrid(sum, pos) + '<p class="dim">Simulated ' + fmt(n) + ' players in ' + Math.round(performance.now() - t0) + ' ms. Look at the average as the number of players grows.</p>'; sizeTbl();
        if (n === 10000) { P.set('z7.sim10k', Sim.compact(sum, { include: [me.net], expected: exp.net, mine: me.net, pos: pos, houseNet: sum.houseNet, totalWagered: sum.totalWagered, totalReturned: sum.totalReturned })); unlockBC(); }
        if (C.sim.sizes.every(function (m) { return sizes[m]; }) && !$('#lln', A).firstChild) { $('#lln', A).innerHTML = '<hr><p><b>What happens as the number of simulated players increases?</b></p>'; QE.render($('#lln', A), 'z7_lln', { onDone: function (r, rs) { if (!rs) api.complete('z7.run'); } }); }
      });
    });
    sizeTbl();

    /* B. interpret */
    var B = UI.card({ id: 'cardCmp', title: 'Your result vs the math', kicker: 'Question it', step: 'z7.compare', needs: 'z7.run', body: '<div id="cmpBody"><p class="dim">Run the 10,000-player simulation above first.</p></div>' });
    stack.appendChild(B);
    function unlockBC() {
      var s = last.n === 10000 ? last : null; if (!s) return; var pos = Sim.position(s, me.net);
      $('#cmpBody', B).innerHTML = '<p class="bigmsg">' + HE.describePosition(pos, me.net) + '</p><div class="cmpwrap"><canvas id="cmpCv" data-h="150" role="img" aria-label="Bars comparing your result, the simulated average and the mathematically expected result"></canvas></div><p class="ones">ONE RESULT IS ONE SAMPLE.</p><p>' + (me.net >= 0 ? 'You experienced a profitable simulated session. That can happen even in a negative-expectation game.' : 'Your simulated loss is one possible outcome. Individual losses alone do not establish the mathematical expectation either.') + ' Compare the three bars: your result, the average of 10,000 simulated players, and the mathematically expected result (' + C.labels.fact.toLowerCase() + '). They are close relatives, not twins.</p><div id="proveQ"></div>';
      Ch.hbars($('#cmpCv', B), { items: [{ label: 'YOUR RESULT', value: me.net, color: Ch.COL.a }, { label: '10,000-PLAYER AVERAGE', value: s.mean, color: Ch.COL.b }, { label: 'MATHEMATICALLY EXPECTED', value: exp.net, color: Ch.COL.d }], fmt: function (v) { return sg(v, 1); } });
      QE.render($('#proveQ', B), 'z7_prove', { onDone: function (r, rs) { if (!rs) api.complete('z7.compare'); } });
      unlockHouse(); unlockRerun();
    }

    /* C. house view */
    var Cc = UI.card({ id: 'cardHouse', title: 'PLAYER VIEW → HOUSE VIEW', kicker: 'Change perspective', step: 'z7.house', needs: 'z7.run', body: '<div id="hBody"><p class="dim">Run 10,000 players first.</p></div>' });
    stack.appendChild(Cc);
    function unlockHouse() {
      var s = last.n === 10000 ? last : null; if (!s) return;
      $('#hBody', Cc).innerHTML = '<div class="btn-row"><button class="btn primary big" id="hvBtn">SWITCH TO HOUSE VIEW 🏠</button></div><div id="hvOut" class="hidden"></div>';
      $('#hvBtn', Cc).addEventListener('click', function () {
        this.disabled = true; var out = $('#hvOut', Cc); out.classList.remove('hidden'); UI.sound('xray'); var expEdge = g.edge;
        out.innerHTML = '<div class="houseview"><div><small>TOTAL WAGERED</small><b id="hv1">0</b></div><div><small>TOTAL RETURNED</small><b id="hv2">0</b></div><div><small>PLAYER NET (all players)</small><b class="neg" id="hv3">0</b></div><div class="hn"><small>HOUSE / GAME NET</small><b class="pos" id="hv4">0</b></div></div><p class="note">The house kept <b>' + pc(s.houseNet / s.totalWagered, 2) + '</b> of everything wagered. The configured house edge is <b>' + pc(expEdge, 2) + '</b>. Individual players were wildly unpredictable (' + sg(s.min, 0) + ' to ' + sg(s.max, 0) + '), but the <b>combined</b> result sits close to the mathematics.</p><div class="bigsay"><b>THE HOUSE DOES NOT NEED TO WIN EVERY BET.</b><br>IT NEEDS THE MATHEMATICS TO FAVOR IT ACROSS MANY WAGERS.</div><div id="hvQ"></div>';
        UI.countTo($('#hv1', out), 0, s.totalWagered, 1200); UI.countTo($('#hv2', out), 0, s.totalReturned, 1200); UI.countTo($('#hv3', out), 0, s.playerNet, 1200, function (v) { return sg(v, 0); }); UI.countTo($('#hv4', out), 0, s.houseNet, 1200, function (v) { return sg(v, 0); });
        QE.render($('#hvQ', out), 'z7_house', { onDone: function (r, rs) { if (!rs) api.complete('z7.house'); } });
      });
      if (P.qrec('z7_house').correct) $('#hvBtn', Cc).click();
    }

    /* D. run again */
    var D = UI.card({ id: 'cardRerun', title: 'RUN ANOTHER 10,000', kicker: 'Simulate it again', step: 'z7.rerun', needs: 'z7.run', body: '<div id="rrBody"><p class="dim">Run 10,000 players first.</p></div>' });
    stack.appendChild(D);
    function unlockRerun() {
      var s = last.n === 10000 ? last : null; if (!s) return; if ($('#rrBody', D).dataset.on) return; $('#rrBody', D).dataset.on = 1; var first = s;
      $('#rrBody', D).innerHTML = '<div class="btn-row"><button class="btn primary" id="rrBtn">RUN ANOTHER 10,000</button></div><canvas id="rrCv" data-h="260" role="img" aria-label="Two overlapping distributions from two independent 10,000-player runs"></canvas><div id="rrOut"></div><div id="rrQ"></div>';
      $('#rrBtn', D).addEventListener('click', function () {
        UI.sound('click'); var second = simPlayers(10000), b = Sim.bounds(first, [me.net, second.min, second.max]), h1 = Sim.histogram(first.nets, b.lo, b.hi, C.sim.bins), h2 = Sim.histogram(second.nets, b.lo, b.hi, C.sim.bins);
        Ch.hist($('#rrCv', D), { counts: h1.counts, lo: b.lo, hi: b.hi, color: Ch.COL.b, overlays: [{ counts: h2.counts, color: Ch.COL.c }], normalize: true, markers: [{ x: me.net, label: 'YOU', color: Ch.COL.a }, { x: exp.net, label: 'expected', color: Ch.COL.d, dash: true }] });
        $('#rrOut', D).innerHTML = '<table class="vision"><thead><tr><th></th><th style="color:#4dd0ff">Run 1</th><th style="color:#ff6b81">Run 2</th></tr></thead><tbody><tr><td>Average result</td><td>' + sg(first.mean, 1) + '</td><td>' + sg(second.mean, 1) + '</td></tr><tr><td>Finished ahead</td><td>' + pc(first.pctProfit, 1) + '</td><td>' + pc(second.pctProfit, 1) + '</td></tr><tr><td>Best / worst</td><td>' + sg(first.max, 0) + ' / ' + sg(first.min, 0) + '</td><td>' + sg(second.max, 0) + ' / ' + sg(second.min, 0) + '</td></tr><tr><td>Expected (math)</td><td colspan="2">' + sg(exp.net, 1) + '</td></tr></tbody></table><p class="note">Not identical, but similar. Two questions:</p>';
        if (!$('#rrQ', D).firstChild) { QE.render($('#rrQ', D), 'z7_rerun1', { onDone: chk }); QE.render($('#rrQ', D), 'z7_rerun2', { onDone: chk }); }
      });
      function chk() { if (P.qrec('z7_rerun1').correct && P.qrec('z7_rerun2').correct) api.complete('z7.rerun'); }
    }
    if (P.get('z7.sim10k')) { /* previous 10k exists: let the student re-run quickly to re-enable the lower cards */ $('#cmpBody', B).innerHTML = '<p class="dim">Press <b>SIMULATE 10,000 PLAYERS</b> above to refresh your comparison. (Results are random, so a fresh run is slightly different from your last one.)</p>'; }

    /* E. House edge experiment */
    var ed = C.edgeLab, edRes = {}, E5 = UI.card({ id: 'cardEdgeLab', title: 'THE HOUSE EDGE EXPERIMENT', kicker: C.labels.example + ' · EDUCATIONAL SIMULATIONS', step: 'z7.edgelab', needs: 'z7.run', body: '<p>Four <b>hypothetical</b> even-money games that differ only in house edge: <b>0%, 2%, 5% and 10%</b>. In each, 10,000 players make ' + ed.betsPerPlayer + ' bets of ' + ed.wager + ' tokens (' + fmt(ed.betsPerPlayer * ed.wager) + ' wagered per player). These are not real games. Run all four.</p><div class="btn-row" id="edBtns"></div><canvas id="edCv" data-h="280" role="img" aria-label="Overlapping distributions for 0, 2, 5 and 10 percent house edge games"></canvas><table class="vision" id="edTbl"></table><div id="edQ"></div>' });
    stack.appendChild(E5); var edCols = [Ch.COL.d, Ch.COL.b, Ch.COL.a, Ch.COL.c], LO = -(ed.betsPerPlayer * ed.wager) * .45, HI = -LO;
    function edDraw() {
      var keys = ed.edges.filter(function (e) { return edRes[e]; }); if (!keys.length) return;
      var series = keys.map(function (e) { return { counts: Sim.histogram(edRes[e].nets, LO, HI, C.sim.bins).counts, color: edCols[ed.edges.indexOf(e)] }; });
      Ch.hist($('#edCv', E5), { counts: series[0].counts, color: series[0].color, overlays: series.slice(1), lo: LO, hi: HI, normalize: true, animate: false, markers: keys.map(function (e) { return { x: -e * ed.betsPerPlayer * ed.wager, label: pc(e, 0), color: edCols[ed.edges.indexOf(e)], dash: true }; }) });
      $('#edTbl', E5).innerHTML = '<thead><tr><th>House edge</th><th>Expected net / player</th><th>Simulated average</th><th>Finished ahead</th></tr></thead><tbody>' + ed.edges.map(function (e) { var r = edRes[e]; return '<tr><td style="color:' + edCols[ed.edges.indexOf(e)] + '">' + pc(e, 0) + '</td><td>' + sg(-e * ed.betsPerPlayer * ed.wager, 0) + '</td><td>' + (r ? sg(r.mean, 1) : '—') + '</td><td>' + (r ? pc(r.pctProfit, 1) : '—') + '</td></tr>'; }).join('') + '</tbody>';
      if (ed.edges.every(function (e) { return edRes[e]; }) && !$('#edQ', E5).firstChild) { $('#edQ', E5).innerHTML = '<hr>'; QE.render($('#edQ', E5), 'z7_edge', { onDone: function (r, rs) { if (!rs) api.complete('z7.edgelab'); } }); }
    }
    ed.edges.forEach(function (e) { var b = UI.el('<button class="btn" type="button">' + pc(e, 0) + ' house edge</button>'); $('#edBtns', E5).appendChild(b); b.addEventListener('click', function () { UI.sound('click'); var gm = E.edgeGame(e); edRes[e] = Sim.run(10000, function (rng) { return E.playN(gm, ed.wager, ed.betsPerPlayer, rng); }); edDraw(); }); });
    UI.refreshLocks(el);
  } };

  /* =====================================================================
     ZONE 8 — Can you beat the house?
     ===================================================================== */
  var GAMENAMES = { slots: 'Neon Orchard slots', wheel: 'Prism Wheel (color bet)', dice: 'Twin Dice (doubles)', rotate: 'Switch games every bet (slots → wheel → dice)' };
  function stratText(s) { return GAMENAMES[s.game] + ', base wager ' + s.wager + ', ' + (s.afterLoss === 'double' ? 'DOUBLE the wager after each loss (cap ' + C.beat.doubleCap + ')' : 'same wager every bet') + ', ' + (s.stopWin ? 'stop at +' + s.stopWin : 'no stop-win') + ', ' + (s.stopLoss ? 'stop at −' + s.stopLoss : 'no stop-loss') + ', up to ' + C.beat.maxBets + ' bets'; }
  HE.stratText = stratText;

  Z.z8 = { render: function (el, api) {
    var B = C.beat, stack = UI.el('<div class="stack"></div>'); el.appendChild(stack);
    var saved = P.get('z8.mine', null), strat = saved ? saved.strategy : { game: 'slots', wager: 10, afterLoss: 'same', stopWin: 0, stopLoss: 0, maxBets: B.maxBets }, mine = saved ? saved.result : null, attempts = saved ? saved.attempts : 0;
    function sel(id, label, opts) { return '<label class="field"><span>' + label + '</span><select id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join('') + '</select></label>'; }
    var A = UI.card({ id: 'cardBeat', title: 'INCREASE YOUR BALANCE', kicker: 'Challenge · fresh ' + fmt(B.bankroll) + ' tokens', step: 'z8.play', body: '<p>Design a strategy and play it. Then we will send the <b>same strategy</b> through 10,000 simulated players. Possible ideas: small repeated wagers, large wagers, switching games, stopping after wins, increasing wagers after losses. <b>Nothing is rigged.</b> Some players finish ahead. <span class="dim">' + esc(C.tokenNotice) + '</span></p><div class="form-grid">' +
      sel('sGame', 'Game', B.games.map(function (g) { return [g, GAMENAMES[g]]; })) + sel('sWager', 'Base wager (tokens)', B.baseWagers.map(function (w) { return [w, w]; })) + sel('sLoss', 'After a loss', [['same', 'Keep the same wager'], ['double', 'Double the wager (up to ' + B.doubleCap + ')']]) + sel('sWin', 'Stop when I am up', B.stopWin.map(function (w) { return [w, w ? '+' + w + ' tokens' : 'Never stop']; })) + sel('sStop', 'Stop when I am down', B.stopLoss.map(function (w) { return [w, w ? '−' + w + ' tokens' : 'Never stop']; })) +
      '</div><div class="btn-row"><button class="btn primary big" id="bPlay">▶ PLAY MY STRATEGY</button><button class="btn" id="bSkip" disabled>Skip to end</button><span class="dim" id="bAtt"></span></div><canvas id="bCv" data-h="240" role="img" aria-label="Line chart of your balance over your bets"></canvas><div id="bRes"></div>' });
    stack.appendChild(A);
    var ids = { game: 'sGame', wager: 'sWager', afterLoss: 'sLoss', stopWin: 'sWin', stopLoss: 'sStop' };
    function applyStrat() { for (var k in ids) { var e = $('#' + ids[k], A); e.value = strat[k]; } }
    function readStrat() { return { game: $('#sGame', A).value, wager: +$('#sWager', A).value, afterLoss: $('#sLoss', A).value, stopWin: +$('#sWin', A).value, stopLoss: +$('#sStop', A).value, maxBets: B.maxBets }; }
    applyStrat(); $('#bAtt', A).textContent = attempts ? 'Attempts so far: ' + attempts + ' (your latest attempt counts)' : '';
    function report(t) {
      var net = t.net;
      $('#bRes', A).innerHTML = '<h4>PERFORMANCE REPORT</h4><div class="statrow"><div><small>STARTING BALANCE</small><b>' + fmt(t.start) + '</b></div><div><small>ENDING BALANCE</small><b>' + fmt(t.end) + '</b></div><div><small>NET RESULT</small><b class="' + (net >= 0 ? 'pos' : 'neg') + '">' + sg(net) + '</b></div><div><small>TOTAL WAGERED</small><b>' + fmt(t.wagered) + '</b></div><div><small>TOTAL RETURNED</small><b>' + fmt(t.returned) + '</b></div><div><small>NUMBER OF BETS</small><b>' + t.bets + '</b></div><div><small>LARGEST WIN</small><b>' + fmt(t.largestWin) + '</b></div><div><small>LONGEST WIN STREAK</small><b>' + t.longW + '</b></div><div><small>LONGEST LOSING STREAK</small><b>' + t.longL + '</b></div></div><p class="note">' + (t.bust ? 'Your balance reached 0, so this session ended. ' : '') + (t.stopped ? 'You hit your ' + t.stopped + ' rule. ' : '') + 'Strategy: ' + esc(stratText(strat)) + '.</p><h3 class="big-q">DID YOUR STRATEGY BEAT THE MATHEMATICS?</h3><p>You may have finished ahead or behind. Either way, that is one sample. Ready to test it?</p>';
    }
    function finishSession(t) { mine = { start: t.start, end: t.end, net: t.net, wagered: t.wagered, returned: t.returned, bets: t.bets, largestWin: t.largestWin, longW: t.longW, longL: t.longL, bust: !!t.bust, stopped: t.stopped }; attempts++; P.set('z8.mine', { strategy: strat, result: mine, attempts: attempts }); P.set('z8.sim10k', null); report(mine); api.complete('z8.play'); unlockSim(); if (P.isDone('z8.sim')) setTimeout(function () { var b = $('#bsBtn', Bc); if (b) b.click(); }, 50); $('#bAtt', A).textContent = 'Attempts so far: ' + attempts + ' (your latest attempt counts)'; $('#bPlay', A).textContent = '↻ TRY ANOTHER ATTEMPT'; $('#bPlay', A).disabled = false; }
    var timer = null;
    $('#bPlay', A).addEventListener('click', function () {
      UI.sound('click'); strat = readStrat(); var t = E.runStrategy(strat, E.makeRng(), true), i = 0, btn = this; btn.disabled = true; $('#bSkip', A).disabled = false; $('#bRes', A).innerHTML = '';
      var ys = [t.start]; function show() { Ch.lines($('#bCv', A), { series: [{ ys: ys.length > 1 ? ys : [t.start, t.start], color: Ch.COL.b, label: 'balance' }, { ys: [t.start, t.start], color: Ch.COL.a, dash: true, label: 'start' }], min: 0, max: t.start * 1.2, dec: 0, animate: false, xlabel: 'bets →' }); }
      function done() { clearInterval(timer); ys = t.trace; show(); $('#bSkip', A).disabled = true; finishSession(t); }
      $('#bSkip', A).onclick = done;
      if (UI.reduced || !t.log.length) { done(); return; }
      timer = setInterval(function () { if (i >= t.log.length) { done(); return; } ys.push(t.log[i].bal); i++; if (t.log[i - 1].ret > t.log[i - 1].wager) UI.sound('win'); show(); }, C.timing.strategyStepMs);
    });
    if (mine) { show0(); report(mine); }
    function show0() { Ch.lines($('#bCv', A), { series: [{ ys: [mine.start, mine.end], color: Ch.COL.b, label: 'start → end' }], min: 0, max: Math.max(mine.start * 1.2, mine.end), dec: 0, animate: false }); $('#bPlay', A).textContent = '↻ TRY ANOTHER ATTEMPT'; }

    /* B. send through 10,000 */
    var Bc = UI.card({ id: 'cardBeatSim', title: 'SEND YOUR STRATEGY THROUGH 10,000 PLAYERS', kicker: 'Compare personal result to the long-run distribution', step: 'z8.sim', needs: 'z8.play', body: '<div id="bsBody"></div>' });
    stack.appendChild(Bc);
    function unlockSim() {
      $('#bsBody', Bc).innerHTML = '<div class="btn-row"><button class="btn primary big" id="bsBtn">SIMULATE 10,000 PLAYERS WITH MY STRATEGY</button></div><canvas id="bsCv" data-h="300" role="img" aria-label="Distribution of 10,000 simulated players using your strategy with your result marked"></canvas><div id="bsOut"></div><div id="bsQ"></div>';
      $('#bsBtn', Bc).addEventListener('click', function () {
        UI.sound('click'); var agg = {}; var s = Sim.run(10000, function (rng) { var t = E.runStrategy(strat, rng, false); for (var k in t.byGame) agg[k] = (agg[k] || 0) + t.byGame[k]; return t; });
        var expNet = 0, wtot = 0; for (var k in agg) { expNet += E.game(k).ev * agg[k] / 10000; wtot += agg[k] / 10000; }
        var b = Sim.bounds(s, [mine.net]), h = Sim.histogram(s.nets, b.lo, b.hi, C.sim.bins), pos = Sim.position(s, mine.net);
        Ch.hist($('#bsCv', Bc), { counts: h.counts, lo: b.lo, hi: b.hi, markers: [{ x: mine.net, label: 'YOU ARE HERE ↓', color: Ch.COL.a }, { x: expNet, label: 'expected', color: Ch.COL.d, dash: true }, { x: s.mean, label: 'average', color: Ch.COL.c, dash: true }], color: Ch.COL.b });
        $('#bsOut', Bc).innerHTML = '<p class="bigmsg">' + HE.describePosition(pos, mine.net) + '</p>' + statGrid(s, pos) + '<div class="cmpwrap"><canvas id="bsCmp" data-h="150" role="img" aria-label="Your result versus the simulated average versus the mathematically expected result"></canvas></div><p class="note">Expected return per token wagered for these games: <b>' + pc(1 + expNet / wtot, 1) + '</b>. Simulated: <b>' + pc(s.totalReturned / s.totalWagered, 1) + '</b>. A strategy can change <i>how often you finish ahead</i> (here: <b>' + pc(s.pctProfit, 1) + '</b>) and how much you wager in total, but not the expected return per token wagered. <span class="dim">' + C.labels.fact + ' (independent bets).</span></p><p class="ones">ONE RESULT IS ONE SAMPLE.</p>';
        Ch.hbars($('#bsCmp', Bc), { items: [{ label: 'YOUR RESULT', value: mine.net, color: Ch.COL.a }, { label: 'AVERAGE OF 10,000', value: s.mean, color: Ch.COL.b }, { label: 'MATHEMATICALLY EXPECTED', value: expNet, color: Ch.COL.d }], fmt: function (v) { return sg(v, 1); } });
        P.set('z8.sim10k', Sim.compact(s, { include: [mine.net], expected: expNet, mine: mine.net, pos: pos, bust: 0 }));
        if (!$('#bsQ', Bc).firstChild) { $('#bsQ', Bc).innerHTML = '<hr>'; QE.render($('#bsQ', Bc), 'z8_strategy', { onDone: function (r, rs) { if (!rs) api.complete('z8.sim'); } }); }
      });
      if (P.qrec('z8_strategy').correct) $('#bsBtn', Bc).click();
    }
    if (mine) unlockSim();

    /* C. But I won */
    var cl = C.sim.claim, Cc = UI.card({ id: 'cardClaim', title: '"BUT I WON!"', kicker: 'Evaluate the claim', step: 'z8.claim', needs: 'z8.sim', body: '<div class="chat"><div class="bubble"><b>Jordan</b> (fictional): "I turned <b>' + cl.start + '</b> tokens into <b>' + fmt(cl.end) + '</b> playing Neon Orchard: ' + cl.spins + ' spins of ' + cl.wager + ' tokens. <b>Obviously this works.</b>"</div></div><div id="clQ"></div><div id="clSim" class="hidden"></div>' });
    stack.appendChild(Cc);
    QE.render($('#clQ', Cc), 'z8_claim', { onDone: function (r, rs) {
      var out = $('#clSim', Cc); out.classList.remove('hidden'); if (out.firstChild) return;
      var wag = []; for (var i = 0; i < cl.spins; i++) wag.push(cl.wager); var s = Sim.run(10000, function (rng) { return E.playSeq(cl.game, wag, rng, cl.start); }), target = cl.end - cl.start;
      var reach = 0; for (var j = 0; j < s.n; j++) if (s.nets[j] >= target) reach++;
      var b = Sim.bounds(s, [target]), h = Sim.histogram(s.nets, b.lo, b.hi, C.sim.bins);
      out.innerHTML = '<p class="note">Here are 10,000 simulated players with the <b>same bankroll, wagers and game</b> as Jordan\'s story. ' + C.labels.example + '</p><canvas id="clCv" data-h="260" role="img" aria-label="Distribution of 10,000 simulated players with Jordan\'s result marked"></canvas><p class="bigmsg"><b>' + fmt(reach) + '</b> of 10,000 (' + pc(reach / 10000, 2) + ') reached +' + fmt(target) + ' or more. Average result: <b>' + sg(s.mean, 1) + '</b>; expected: <b>' + sg(E.game(cl.game).ev * cl.wager * cl.spins, 1) + '</b>. Jordan\'s result is possible, and still just one sample.</p>';
      Ch.hist($('#clCv', out), { counts: h.counts, lo: b.lo, hi: b.hi, markers: [{ x: target, label: 'JORDAN ↓', color: Ch.COL.a }, { x: E.game(cl.game).ev * cl.wager * cl.spins, label: 'expected', color: Ch.COL.d, dash: true }], color: Ch.COL.b });
      if (!rs) api.complete('z8.claim');
    } });
    UI.refreshLocks(el);
  } };
})(window);
