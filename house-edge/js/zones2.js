/* THE HOUSE EDGE — Zone 4 (House Edge & Variance), Zone 5 (Sportsbook & Parlays), Zone 6 (Brain vs Randomness + interface). */
(function (root) {
  'use strict';
  var HE = root.HE = root.HE || {}, C = HE.CONFIG, E = HE.Engine, P = HE.Progress, UI = HE.UI, Ch = HE.Charts, X = HE.XRay, QE = HE.QE, PL = HE.Parlay, Slot = HE.Slot;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, fmt = E.fmt, sg = E.signed, pc = E.pct, Z = HE.Zones;

  /* =====================================================================
     ZONE 4 — House edge, RTP, variance
     ===================================================================== */
  Z.z4 = { render: function (el, api) {
    var stack = UI.el('<div class="stack"></div>'); el.appendChild(stack); var g = E.game('slots'), w = C.sim.varianceWager;
    /* A. House edge X-ray */
    var A = UI.card({ id: 'cardEdge', title: 'X-ray the house edge', kicker: 'X-Ray it', step: 'z4.edge', body: '<p>You know the machine\'s expected value. Now compare what the <b>player</b> expects with what the <b>house</b> expects.</p><div class="btn-row"><button class="btn primary" id="edgeBtn">▶ X-RAY THE HOUSE EDGE</button></div><div id="edgeOut" class="xray-inline hidden"></div><div id="edgeQ"></div>' });
    stack.appendChild(A);
    $('#edgeBtn', A).addEventListener('click', function () {
      this.disabled = true; var out = $('#edgeOut', A); out.classList.remove('hidden'); out.innerHTML = '<div id="eO1"></div><hr><h4>RTP: return to player</h4><div id="eO2"></div>';
      X.layers.edge($('#eO1', out), { gameId: 'slots' }).then(function () { return X.layers.rtp($('#eO2', out), { gameId: 'slots' }); }).then(function () { var h = $('#edgeQ', A); if (!h.firstChild) { h.innerHTML = '<hr>'; QE.render(h, 'z4_edgenum', { onDone: function (r, rs) { if (!rs) api.complete('z4.edge'); } }); } });
    });
    if (P.qrec('z4_edgenum').correct) $('#edgeBtn', A).click();

    /* B. RTP lab */
    var rtpRuns = P.get('z4.rtp', {});
    var B = UI.card({ id: 'cardRTP', title: 'RTP Lab: what does ' + pc(g.rtp, 1) + ' really mean?', kicker: 'Simulate it', step: 'z4.rtp', needs: 'z4.edge', body: '<p>Each button plays ONE simulated player who wagers ' + w + ' tokens per spin on Neon Orchard, and measures the tokens returned per token wagered. Run all four sizes, more than once if you like.</p><div class="btn-row" id="rtpBtns"></div><canvas id="rtpChart" data-h="230" role="img" aria-label="Bars comparing observed return percentage for each session length against the expected RTP"></canvas><p class="note" id="rtpNote"></p><div id="rtpQ"></div>' });
    stack.appendChild(B);
    function drawRtp() {
      var items = [{ label: 'MATH (expected RTP)', value: g.rtp * 100, color: Ch.COL.a }];
      C.sim.rtpSizes.forEach(function (n) { var r = rtpRuns[n]; items.push({ label: fmt(n) + ' spins' + (r ? '' : ' (not run)'), value: r ? r.rtp * 100 : 0, color: r ? Ch.COL.b : '#555' }); });
      Ch.hbars($('#rtpChart', B), { items: items, fmt: function (v) { return v ? fmt(v, 1) + '%' : '—'; } });
      var done = C.sim.rtpSizes.every(function (n) { return rtpRuns[n]; });
      $('#rtpNote', B).innerHTML = done ? 'Short sessions can land far from ' + pc(g.rtp, 1) + '. Long sessions land close, but they are still random. <b>' + esc(C.text.longRunVsSession) + '</b>' : 'Run all four sizes to continue.';
      if (done) { var h = $('#rtpQ', B); if (!h.firstChild) { h.innerHTML = '<hr>'; QE.render(h, 'z4_rtp', { onDone: function (r, rs) { if (!rs) api.complete('z4.rtp'); } }); } }
    }
    C.sim.rtpSizes.forEach(function (n) {
      var b = UI.el('<button class="btn" type="button">' + fmt(n) + ' spins</button>'); $('#rtpBtns', B).appendChild(b);
      b.addEventListener('click', function () { UI.sound('click'); var t = E.playN('slots', w, n, E.makeRng()); rtpRuns[n] = { rtp: t.returned / t.wagered, net: t.net }; P.set('z4.rtp', rtpRuns); drawRtp(); });
    });
    setTimeout(drawRtp, 30);

    /* C. Variance */
    var vruns = P.get('z4.var', { sizes: {} }), runs = [];
    var Cc = UI.card({ id: 'cardVar', title: 'Short-term luck vs long-term math', kicker: 'Simulate it', step: 'z4.variance', needs: 'z4.rtp', body: '<p>One simulated player makes <b>N bets of ' + w + ' tokens</b>. The yellow dashed line is the mathematical expectation. The blue line is one random life. Try every size, and run each more than once.</p><div class="btn-row" id="varBtns"></div><canvas id="varChart" data-h="260" role="img" aria-label="Line chart of one simulated player balance change versus the expected path"></canvas><div id="varStats" class="statrow"></div><table class="vision" id="varTbl"></table><div id="varQ"></div>' });
    stack.appendChild(Cc);
    C.sim.varianceBets.forEach(function (n) {
      var b = UI.el('<button class="btn" type="button">' + fmt(n) + ' bets</button>'); $('#varBtns', Cc).appendChild(b);
      b.addEventListener('click', function () {
        UI.sound('click'); var t = E.playN('slots', w, n, E.makeRng(), true), exp = t.trace.map(function (_, i) { return g.ev * w * i; }), peak = Math.max.apply(null, t.trace), low = Math.min.apply(null, t.trace);
        Ch.lines($('#varChart', Cc), { series: [{ ys: exp, color: Ch.COL.a, dash: true, label: 'expected' }, { ys: t.trace, color: Ch.COL.b, label: 'one random player' }], zero: true, dec: 0, xlabel: 'bets →' });
        $('#varStats', Cc).innerHTML = '<div><small>AFTER ' + fmt(n) + ' BETS</small><b class="' + (t.net >= 0 ? 'pos' : 'neg') + '">' + sg(t.net) + '</b></div><div><small>EXPECTED</small><b>' + sg(g.ev * w * n, 0) + '</b></div><div><small>BEST POINT</small><b>' + sg(peak) + '</b></div><div><small>WORST POINT</small><b>' + sg(low) + '</b></div><div><small>LONGEST WIN STREAK</small><b>' + t.longW + '</b></div><div><small>LONGEST LOSING STREAK</small><b>' + t.longL + '</b></div>';
        vruns.sizes[n] = (vruns.sizes[n] || 0) + 1; P.set('z4.var', vruns); runs.unshift({ n: n, net: t.net, exp: g.ev * w * n, peak: peak });
        $('#varTbl', Cc).innerHTML = '<thead><tr><th>Bets</th><th>Final result</th><th>Expected</th><th>Best moment</th></tr></thead><tbody>' + runs.slice(0, 6).map(function (r) { return '<tr><td>' + fmt(r.n) + '</td><td>' + sg(r.net) + '</td><td>' + sg(r.exp, 0) + '</td><td>' + sg(r.peak) + '</td></tr>'; }).join('') + '</tbody>';
        var all = C.sim.varianceBets.every(function (m) { return vruns.sizes[m]; });
        if (all) { var h = $('#varQ', Cc); if (!h.firstChild) { h.innerHTML = '<hr><p class="note">Look for winning streaks, losing streaks, temporary profits and outliers. Even when the expected line slopes down, a single player\'s path can sit above zero for a while. That spread is called <b>variance</b>.</p>'; QE.render(h, 'z4_var', { onDone: function (r, rs) { if (!rs) api.complete('z4.variance'); } }); } }
      });
    });
    if (P.qrec('z4_var').correct) { var h2 = $('#varQ', Cc); h2.innerHTML = '<hr>'; QE.render(h2, 'z4_var', { onDone: function () {} }); }
    UI.refreshLocks(el);
  } };

  /* =====================================================================
     ZONE 5 — Fictional sportsbook & parlays
     ===================================================================== */
  function teamName(id) { return C.sports.teams[id].name; }
  function teamDot(id) { return '<span class="dot" style="background:' + C.sports.teams[id].color + '"></span>'; }

  X.meta.parlay = { n: 1, t: 'LAYER 1 · MULTIPLY THE PROBABILITIES', lv: 0 };
  X.meta.margin = { n: 2, t: 'LAYER 2 · FAIR PAYOUT vs OFFERED PAYOUT', lv: 0 };
  X.meta.seesaw = { n: 3, t: 'LAYER 3 · THE PARLAY SEESAW', lv: 0 };
  X.layers.parlay = function (el, ctx) {
    var ps = ctx.legs.map(PL.legP), st = PL.stats(ps), ref = [1, 2, 3, 4, 5, 6].map(PL.reference);
    var h = '<div class="mult-chain">';
    ctx.legs.forEach(function (l, i) { var g = PL.game(l.game), t = l.side === 'home' ? g.home : g.away; h += (i ? '<span class="mop">×</span>' : '') + '<div class="mpill" style="opacity:0"><small>Leg ' + (i + 1) + '</small><b>' + pc(ps[i], 0) + '</b><span>' + teamDot(t) + esc(teamName(t)) + '</span></div>'; });
    h += '<span class="mop">=</span><div class="mres" style="opacity:0"><small>PROBABILITY ALL LEGS SUCCEED</small><b>' + pc(st.prob, st.prob < .1 ? 2 : 1) + '</b></div></div>';
    h += '<p class="note"><b>' + C.labels.assumption + ':</b> ' + esc(C.text.independence) + '</p><h4>The simplified model: every leg an independent 50/50</h4><table class="vision"><thead><tr><th>Legs</th>' + ref.map(function (r) { return '<th' + (r.n === st.n ? ' class="hit"' : '') + '>' + r.n + '</th>'; }).join('') + '</tr></thead><tbody><tr><td>P(all win)</td>' + ref.map(function (r) { return '<td' + (r.n === st.n ? ' class="hit"' : '') + '>' + pc(r.prob, r.prob < .1 ? 3 : 1).replace(/\.?0+%/, '%') + '</td>'; }).join('') + '</tr></tbody></table>';
    el.innerHTML = h;
    var pills = $$('.mpill', el).concat($$('.mres', el));
    return pills.reduce(function (p, n) { return p.then(function () { n.style.opacity = 1; n.classList.add('flash'); UI.sound('tick'); return UI.wait(650); }); }, Promise.resolve());
  };
  X.layers.margin = function (el, ctx) {
    var ps = ctx.legs.map(PL.legP), st = PL.stats(ps), stake = ctx.stake || 10;
    el.innerHTML = '<div class="twocol"><div class="mini"><small>FAIR PAYOUT MULTIPLIER (1 ÷ probability)</small><b class="bigev">' + fmt(st.fairMult, 2) + '×</b><p>Stake ' + stake + ' → fair payout ' + fmt(stake * st.fairMult, 1) + ' tokens</p></div><div class="mini"><small>OFFERED PAYOUT MULTIPLIER</small><b class="bigev">' + fmt(st.offeredMult, 2) + '×</b><p>Stake ' + stake + ' → offered payout ' + fmt(stake * st.offeredMult, 1) + ' tokens</p></div></div>' +
      '<p class="note">Each leg is priced as (1 − ' + pc(C.sports.margin, 1) + ') ÷ probability, so the book keeps a small margin on every leg. <b>Margins multiply too.</b> Expected return per token: ' + pc(st.prob, 2) + ' × ' + fmt(st.offeredMult, 2) + ' = <b>' + fmt(st.rtp, 3) + '</b>, a house edge of <b>' + pc(st.edge, 1) + '</b> on this ticket.</p><p class="dim">' + C.labels.assumption + ': the sportsbook is fictional and its margin is set in the configuration.</p>';
    return Promise.resolve();
  };
  X.layers.seesaw = function (el, ctx) {
    el.innerHTML = '<p>Drag the slider from 1 to 6 legs (simplified: independent 50/50 legs offered at ' + fmt(PL.legOdds(.5), 2) + '× each).</p><div class="seesaw"><div class="plank" id="plank"><div class="sl left"><small>POTENTIAL PAYOUT</small><b id="ssPay">1.91×</b><i>▲</i></div><div class="sl right"><small>PROBABILITY ALL LEGS WIN</small><b id="ssProb">50%</b><i>▼</i></div></div><div class="pivot" aria-hidden="true"></div></div><label class="slider-l">Legs: <b id="ssN">1</b><input type="range" id="ssRange" min="1" max="6" value="1" aria-label="Number of parlay legs"></label><p class="note" id="ssNote"></p>';
    var rg = $('#ssRange', el), seen = false;
    function upd() {
      var n = +rg.value, r = PL.reference(n); $('#ssN', el).textContent = n; $('#ssPay', el).textContent = fmt(r.offeredMult, 2) + '×'; $('#ssProb', el).textContent = pc(r.prob, r.prob < .1 ? 2 : 1); $('#plank', el).style.transform = 'rotate(' + ((n - 1) / 5 * 13) + 'deg)';
      $('#ssNote', el).textContent = n === 6 ? 'Six legs: payout ' + fmt(r.offeredMult, 1) + '× but only a ' + pc(r.prob, 2) + ' chance. Payout ↑ while probability ↓.' : 'Add a leg and watch the seesaw tilt.';
      if (n === 6) seen = true; el.dataset.seen = seen ? '1' : '';
    }
    rg.addEventListener('input', upd); upd();
    return new Promise(function (res) { var iv = setInterval(function () { if (el.dataset.seen) { clearInterval(iv); res(); } else if (!document.body.contains(el)) clearInterval(iv); }, 300); });
  };

  Z.z5 = { render: function (el, api) {
    var S = C.sports, slip = [], stake = S.stakes[1], bank = P.get('z5.bank', 1000), stack = UI.el('<div class="stack"></div>'); el.appendChild(stack);
    var A = UI.card({ id: 'cardBoard', title: 'Fictional Sportsbook: Metro League', kicker: 'Experience it', step: 'z5.build', body:
      '<p>All teams are fictional. Pick a side by tapping an odds button. <b>Step 1:</b> place a single bet (1 leg). <b>Step 2:</b> build and place a parlay with 3 or more legs. Games are simulated; you cannot control them. <span class="dim">' + esc(C.tokenNotice) + '</span></p><div class="board-slip"><div class="board" id="board"></div><aside class="slip" aria-label="Bet slip"><h4>BET SLIP</h4><div class="slip-bank">Zone wallet <b id="bank">' + fmt(bank) + '</b> tokens</div><div class="stakes" role="group" aria-label="Stake"></div><ol id="legs" class="legs"></ol><div class="slip-tot"><small id="slipType">Add legs to build a bet</small><div>TOTAL ODDS <b id="totOdds">—</b></div><div class="payout">POTENTIAL PAYOUT <b id="payout">0</b></div><div class="chance">WIN CHANCE <b class="qq">???</b></div></div><button class="btn primary big" id="place" disabled>PLACE BET</button><button class="btn ghost" id="clear">Clear slip</button></aside></div><div id="betResult" class="betres" aria-live="polite"></div>' });
    stack.appendChild(A);
    var board = $('#board', A);
    S.slate.forEach(function (g) {
      var row = UI.el('<div class="game"><div class="gname">Game ' + g.id.slice(1) + '</div></div>');
      ['home', 'away'].forEach(function (side) {
        var tid = side === 'home' ? g.home : g.away, p = side === 'home' ? g.pHome : 1 - g.pHome, b = UI.el('<button type="button" class="odds" data-g="' + g.id + '" data-s="' + side + '" aria-pressed="false">' + teamDot(tid) + '<span class="tn">' + esc(teamName(tid)) + '</span><b>' + fmt(PL.legOdds(p), 2) + '×</b></button>');
        b.addEventListener('click', function () { toggle(g.id, side); }); row.appendChild(b);
      });
      board.appendChild(row);
    });
    var stk = $('.stakes', A); S.stakes.forEach(function (s) { var b = UI.el('<button type="button" class="bet-chip' + (s === stake ? ' on' : '') + '" aria-pressed="' + (s === stake) + '">' + s + '</button>'); b.addEventListener('click', function () { stake = s; $$('.bet-chip', stk).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); render(); }); stk.appendChild(b); });
    function toggle(gid, side) {
      var i = slip.findIndex(function (l) { return l.game === gid; });
      if (i >= 0 && slip[i].side === side) slip.splice(i, 1); else if (i >= 0) slip[i].side = side; else if (slip.length < S.maxLegs) slip.push({ game: gid, side: side }); else UI.toast('Maximum ' + S.maxLegs + ' legs.');
      UI.sound('click'); render();
    }
    var lastPay = 0;
    function render() {
      $$('.odds', A).forEach(function (b) { var on = slip.some(function (l) { return l.game === b.dataset.g && l.side === b.dataset.s; }); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      $('#legs', A).innerHTML = slip.map(function (l) { var g = PL.game(l.game), t = l.side === 'home' ? g.home : g.away, p = PL.legP(l); return '<li>' + teamDot(t) + esc(teamName(t)) + ' <b>' + fmt(PL.legOdds(p), 2) + '×</b></li>'; }).join('');
      var st = PL.stats(slip.map(PL.legP)), n = slip.length, pay = n ? stake * st.offeredMult : 0;
      $('#totOdds', A).textContent = n ? fmt(st.offeredMult, 2) + '×' : '—'; UI.countTo($('#payout', A), lastPay, pay, 450, function (v) { return fmt(v, 1); }); lastPay = pay;
      $('#slipType', A).textContent = !n ? 'Add legs to build a bet' : n === 1 ? 'SINGLE BET' : n + '-LEG PARLAY';
      $('#payout', A).parentNode.classList.toggle('big', n >= 4); $('#place', A).disabled = !n || bank < stake;
    }
    $('#clear', A).addEventListener('click', function () { slip = []; render(); });
    $('#place', A).addEventListener('click', function () {
      if (!slip.length || bank < stake) return; UI.sound('click');
      var legs = slip.slice(), st = PL.stats(legs.map(PL.legP)), results = legs.map(function (l) {
        var g = PL.game(l.game), winner = PL.resolveGame(l.game), ws = 20 + Math.floor(Math.random() * 20), ls = Math.max(3, ws - 1 - Math.floor(Math.random() * 12));
        return { l: l, g: g, winner: winner, hit: winner === l.side, hs: winner === 'home' ? ws : ls, as: winner === 'away' ? ws : ls };
      }), hits = results.filter(function (r) { return r.hit; }).length, won = hits === legs.length, pay = won ? stake * st.offeredMult : 0;
      bank += pay - stake; P.set('z5.bank', bank); $('#bank', A).textContent = fmt(bank);
      var out = $('#betResult', A);
      out.innerHTML = '<h4>' + (legs.length === 1 ? 'SINGLE BET RESULT' : legs.length + '-LEG PARLAY RESULT') + '</h4>' + results.map(function (r) { return '<div class="rrow ' + (r.hit ? 'ok' : 'miss') + '"><span>' + teamDot(r.g.home) + esc(teamName(r.g.home)) + ' ' + r.hs + ' – ' + r.as + ' ' + esc(teamName(r.g.away)) + teamDot(r.g.away) + '</span><b>' + (r.hit ? '✓ leg hit' : '✗ leg missed') + '</b></div>'; }).join('') +
        '<p class="rsum">' + (won ? 'Every leg hit! Returned <b>' + fmt(pay, 1) + '</b> on a ' + stake + '-token stake: net <b>' + sg(pay - stake, 1) + '</b>.' : (legs.length > 1 ? hits + ' of ' + legs.length + ' legs hit, but a parlay needs <b>every</b> leg. Returned 0: net <b>−' + stake + '</b>.' : 'Returned 0: net <b>−' + stake + '</b>.')) + '</p>';
      if (legs.length === 1) api.complete('z5.straight');
      if (legs.length >= 3) { P.set('z5.last', { legs: legs, stake: stake }); api.complete('z5.build'); }
      else if (legs.length === 1 || legs.length === 2) UI.toast(legs.length === 2 ? 'Nice. For this step, build a parlay with 3 or more legs.' : 'Single bet placed. Now build a parlay with 3+ legs.');
      slip = []; render(); refreshX(); UI.sound(won ? 'win' : 'lose');
    });
    render();

    /* X-ray card */
    var Bx = UI.card({ id: 'cardParX', title: 'X-ray the parlay', kicker: 'Question it → X-Ray it', step: 'z5.xray', needs: 'z5.build', body: '<p>The payout number on a parlay slip grows with every leg. But what happens to the chance of winning? <b>Predict first.</b></p><div id="parPred"></div><div id="parXBtn" class="hidden"><div class="btn-row"><button class="btn primary big" id="xParlay">🔬 X-RAY THE PARLAY</button></div><p class="dim">The X-ray uses the parlay you just built.</p></div>' });
    stack.appendChild(Bx);
    QE.render($('#parPred', Bx), 'z5_pred', { onDone: function () { $('#parXBtn', Bx).classList.remove('hidden'); } });
    function refreshX() { UI.refreshLocks(el); }
    $('#xParlay', Bx).addEventListener('click', function () {
      var last = P.get('z5.last'); if (!last) { UI.toast('Place a 3+ leg parlay first.'); return; }
      X.open({ title: 'X-RAY THE PARLAY', ctx: { legs: last.legs, stake: last.stake }, layers: ['parlay', 'margin', 'seesaw'], embedQ: { parlay: 'z5_ind', margin: 'z5_margin' }, onComplete: function () { api.complete('z5.xray'); }, finishLabel: 'Back to the sportsbook ▸' });
    });

    /* 10,000 parlays */
    var Cs = UI.card({ id: 'cardPar10k', title: '10,000 parlays', kicker: 'Simulate it', step: 'z5.sim', needs: 'z5.xray', body: '<div id="p10q"></div><div id="p10lab" class="hidden"><div class="btn-row"><label><input type="radio" name="p10" value="mine" checked> My last parlay</label><label><input type="radio" name="p10" value="ref"> Simplified: 6 independent 50/50 legs</label><button class="btn primary" id="p10go">10,000 BEGIN ▶</button></div><canvas id="p10cv" data-h="260" role="img" aria-label="Bars showing how many of 10,000 simulated players are still alive after each leg"></canvas><p class="note" id="p10note"></p><div id="p10why"></div></div>' });
    stack.appendChild(Cs);
    QE.render($('#p10q', Cs), 'z5_sim', { onDone: function () { $('#p10lab', Cs).classList.remove('hidden'); } });
    var ran = P.isDone('z5.sim');
    $('#p10go', Cs).addEventListener('click', function () {
      var which = ($$('input[name=p10]:checked', Cs)[0] || {}).value, last = P.get('z5.last'), ps = which === 'ref' || !last ? [.5, .5, .5, .5, .5, .5] : last.legs.map(PL.legP);
      var obs = PL.survivors(ps, 10000), th = [10000], acc = 10000; ps.forEach(function (p) { acc *= p; th.push(acc); }); this.disabled = true; var btn = this;
      var k = 0; (function step() { Ch.survivors($('#p10cv', Cs), { observed: obs, theory: th }, k); if (k < ps.length) { k++; setTimeout(step, UI.reduced ? 0 : C.timing.parlayStepMs); } else { btn.disabled = false; finish(); } })();
      function finish() {
        var n = ps.length; $('#p10note', Cs).innerHTML = 'Observed after all ' + n + ' legs: <b>' + fmt(obs[n]) + '</b> of 10,000 · Theoretical expectation: <b>' + fmt(th[n], 1) + '</b> (' + pc(th[n] / 10000, 2) + '). Real randomness lands <i>near</i> the theory, not exactly on it. Press again for a new, independent run.';
        ran = true; var h = $('#p10why', Cs); if (!h.firstChild) { h.innerHTML = '<hr>'; QE.render(h, 'z5_why', { onDone: function (r, rs) { if (!rs) api.complete('z5.sim'); } }); }
      }
    });
    if (P.qrec('z5_sim').correct) $('#p10lab', Cs).classList.remove('hidden');
    UI.refreshLocks(el);
  } };

  /* =====================================================================
     ZONE 6 — Brain vs randomness
     ===================================================================== */
  function brain(feels, math, extra) {
    var b = UI.el('<div class="brain"><button type="button" class="btn primary" aria-expanded="false">🧠 BRAIN X-RAY</button><div class="brain-out hidden"><div class="bx feels"><small>FEELS LIKE</small><p>' + feels + '</p></div><div class="bx math"><small>MATH SAYS</small><p>' + math + '</p></div></div>' + (extra || '') + '</div>');
    var btn = $('button', b), out = $('.brain-out', b); btn.addEventListener('click', function () { out.classList.remove('hidden'); btn.setAttribute('aria-expanded', 'true'); UI.sound('xray'); });
    return b;
  }
  function biasCard(o) { return UI.card({ id: 'bias_' + o.step.split('.')[1], title: o.title, kicker: o.tag + ' · ' + o.n + ' of 7', step: o.step, needs: o.needs, body: o.body || '' }); }

  Z.z6 = { render: function (el, api) {
    var stack = UI.el('<div class="stack"></div>'); el.appendChild(stack); var W = E.game('wheel');
    el.insertBefore(UI.el('<p class="intro-p">Seven thinking traps show up again and again around games of chance. For each one: <b>feel it → question it → BRAIN X-RAY it</b>. These activities are hypothetical. Nobody is asked about their own life.</p>'), stack);

    /* 1 Gambler's fallacy */
    var c1 = biasCard({ step: 'z6.gf', title: 'Gambler\'s Fallacy', tag: 'BIAS', n: 1 }); stack.appendChild(c1); var b1 = $('.card-body', c1);
    b1.innerHTML = '<div class="redrow" aria-label="Five reds in a row"><i class="r">RED</i><i class="r">RED</i><i class="r">RED</i><i class="r">RED</i><i class="r">RED</i><i class="q">?</i></div><div id="gfQ"></div><div id="gfBX"></div>';
    QE.render($('#gfQ', c1), 'z6_gf', { onDone: function () {
      var bx = brain('"Black is due."', 'Previous independent outcomes do not change the next independent probability.', '<div class="btn-row"><button class="btn" id="gfTest">▶ TEST IT: 400,000 simulated flips</button></div><p class="note" id="gfRes"></p>'); $('#gfBX', c1).appendChild(bx);
      $('#gfTest', bx).addEventListener('click', function () {
        var rng = E.makeRng(), run = 0, after = 0, red = 0; for (var i = 0; i < 400000; i++) { var r = rng() < .5; if (run >= 5) { after++; if (r) red++; } run = r ? run + 1 : 0; }
        $('#gfRes', bx).innerHTML = 'After 5 reds in a row happened <b>' + fmt(after) + '</b> times, the next flip was red <b>' + pc(red / after, 1) + '</b> of the time. About half, as the math says. ' + C.labels.assumption + ': a fair 50/50 process.'; api.complete('z6.gf');
      });
      if (P.isDone('z6.gf')) $('#gfTest', bx).click();
    } });

    /* 2 Hot hand */
    var c2 = biasCard({ step: 'z6.hot', title: 'Hot-Hand Thinking', tag: 'BIAS', n: 2 }); stack.appendChild(c2);
    $('.card-body', c2).innerHTML = '<p>Mia is guessing the results of fair coin flips. She has been right <b>6 times in a row</b>.</p><div class="redrow" aria-label="Six correct guesses"><i class="g">✓</i><i class="g">✓</i><i class="g">✓</i><i class="g">✓</i><i class="g">✓</i><i class="g">✓</i><i class="q">?</i></div><div id="hotQ"></div><div id="hotBX"></div>';
    QE.render($('#hotQ', c2), 'z6_hot', { onDone: function () {
      var bx = brain('"She\'s hot! She can\'t miss!"', 'Each fair flip is independent, so her next guess is still 50%. (In real sports, researchers still study whether hot hands exist. In a fair coin process there is none.)', '<div class="btn-row"><button class="btn" id="hotTest">▶ TEST IT: 200,000 simulated guessers</button></div><p class="note" id="hotRes"></p>'); $('#hotBX', c2).appendChild(bx);
      $('#hotTest', bx).addEventListener('click', function () {
        var rng = E.makeRng(), streak = 0, next = 0, ok = 0; for (var i = 0; i < 200000; i++) { var all = true; for (var k = 0; k < 6; k++) if (rng() >= .5) all = false; if (all) { streak++; if (rng() < .5) ok++; } }
        $('#hotRes', bx).innerHTML = 'Of 200,000 simulated guessers, <b>' + fmt(streak) + '</b> got 6 right in a row. Their 7th guess was right <b>' + pc(ok / streak, 1) + '</b> of the time.'; api.complete('z6.hot');
      });
      if (P.isDone('z6.hot')) $('#hotTest', bx).click();
    } });

    /* 3 Illusion of control */
    var c3 = biasCard({ step: 'z6.control', title: 'Illusion of Control', tag: 'BIAS', n: 3 }); stack.appendChild(c3);
    $('.card-body', c3).innerHTML = '<p>A random number from <b>1 to 10</b> will be drawn. <b>Pick your own number</b> and press DRAW.</p><div class="numpick" role="group" aria-label="Pick a number from 1 to 10"></div><div class="btn-row"><button class="btn primary" id="ocDraw" disabled>DRAW</button><span id="ocRes" class="note"></span></div><div id="ocQ" class="hidden"></div><div id="ocBX"></div>';
    var mine = null, np = $('.numpick', c3); for (var n = 1; n <= 10; n++) (function (n) { var b = UI.el('<button type="button" class="num-b" aria-pressed="false">' + n + '</button>'); b.addEventListener('click', function () { mine = n; $$('.num-b', np).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); $('#ocDraw', c3).disabled = false; }); np.appendChild(b); })(n);
    $('#ocDraw', c3).addEventListener('click', function () { var d = 1 + Math.floor(E.rand() * 10); $('#ocRes', c3).innerHTML = 'You picked <b>' + mine + '</b>. Drawn: <b>' + d + '</b>. ' + (d === mine ? 'A match!' : 'No match.') + ' Did choosing feel like it mattered?'; $('#ocQ', c3).classList.remove('hidden'); if (!$('#ocQ', c3).firstChild) QE.render($('#ocQ', c3), 'z6_control', { onDone: showOC }); });
    function showOC() {
      if ($('#ocBX', c3).firstChild) return;
      var bx = brain('"I chose it myself, so it\'s luckier."', 'A number you choose and a number you are given have the same chance in a random draw: 1 in 10.', '<div class="btn-row"><button class="btn" id="ocTest">▶ TEST IT: 100,000 rounds each</button></div><p class="note" id="ocT"></p><p class="dim">' + C.labels.research + ': Langer (1975) found that choice and other skill-like cues in a chance task made people feel more confident than the odds justified.</p>'); $('#ocBX', c3).appendChild(bx);
      $('#ocTest', bx).addEventListener('click', function () { var rng = E.makeRng(), a = 0, b = 0; for (var i = 0; i < 100000; i++) { if (Math.floor(rng() * 10) === Math.floor(rng() * 10)) a++; if (Math.floor(rng() * 10) === 4) b++; } $('#ocT', bx).innerHTML = '"I choose" win rate: <b>' + pc(a / 100000, 1) + '</b> · "Computer assigns" win rate: <b>' + pc(b / 100000, 1) + '</b>. Both about 10%.'; api.complete('z6.control'); });
      if (P.isDone('z6.control')) $('#ocTest', bx).click();
    }
    if (P.qrec('z6_control').correct) { mine = 1; $('#ocQ', c3).classList.remove('hidden'); QE.render($('#ocQ', c3), 'z6_control', { onDone: showOC }); }

    /* 4 Near miss */
    var c4 = biasCard({ step: 'z6.near', title: 'The Near-Miss Effect', tag: 'BIAS', n: 4 }); stack.appendChild(c4); var gs = E.game('slots');
    $('.card-body', c4).innerHTML = '<div class="nm-pair"><div class="nm"><small>RESULT A</small><div class="mini-reels"><span class="sy-star">★</span><span class="sy-star">★</span><span class="sy-berry">●</span></div><b>SO CLOSE!</b></div><div class="nm"><small>RESULT B</small><div class="mini-reels"><span class="sy-berry">●</span><span class="sy-leaf">▲</span><span class="sy-blossom">✿</span></div><b>No match</b></div></div><div id="nmPoll"></div><div id="nmX" class="hidden"></div>';
    QE.render($('#nmPoll', c4), 'z6_near_poll', { onDone: function () {
      var x = $('#nmX', c4); x.classList.remove('hidden'); if (x.firstChild) return;
      var near = gs.outcomes.filter(function (o) { return o.id === 'near'; })[0], loss = gs.outcomes.filter(function (o) { return o.id === 'loss'; })[0];
      x.innerHTML = '<div class="btn-row"><button class="btn primary" id="nmBtn">🔬 X-RAY THE OUTCOMES</button></div><div id="nmOut" class="hidden"><div class="nm-pair x"><div class="nm"><small>RESULT A (configured outcome: "' + esc(near.label) + '")</small><b class="lossbig">LOSS</b><span>returns ' + near.ret + ' tokens</span></div><div class="nm"><small>RESULT B (configured outcome: "' + esc(loss.label) + '")</small><b class="lossbig">LOSS</b><span>returns ' + loss.ret + ' tokens</span></div></div><p class="note">' + C.labels.research + ': in one lab study with adults (Clark et al., 2009), near-miss outcomes were rated as less pleasant than full misses but still increased the urge to keep playing, and activated some of the same brain regions as wins. This is one study of motivation, not proof of what any individual will do.</p><div id="nmQ"></div></div>';
      $('#nmBtn', x).addEventListener('click', function () { $('#nmOut', x).classList.remove('hidden'); UI.sound('xray'); QE.render($('#nmQ', x), 'z6_near', { onDone: function (r, rs) { if (!rs) api.complete('z6.near'); } }); this.disabled = true; });
      if (P.qrec('z6_near').correct) $('#nmBtn', x).click();
    } });
    if (P.qrec('z6_near_poll').correct) { /* onDone already fired via restore */ }

    /* 5 Loss chasing */
    var c5 = biasCard({ step: 'z6.chase', title: 'Loss Chasing', tag: 'BIAS', n: 5 }); stack.appendChild(c5);
    $('.card-body', c5).innerHTML = '<div class="scenario"><b>Scenario (fictional):</b> Sam has been betting on the Prism Wheel and is down <b class="neg">−300</b> tokens. Sam has 700 tokens left.</div><div id="lcPoll"></div><div id="lcX" class="hidden"></div>';
    QE.render($('#lcPoll', c5), 'z6_chase_poll', { onDone: function (r) {
      var x = $('#lcX', c5); x.classList.remove('hidden'); if (x.firstChild) return;
      var stakeN = 300, evn = W.ev * stakeN, pw = W.outcomes[0].p;
      x.innerHTML = '<p class="note">' + (r.last === 'chase' ? 'Wanting to win it back is a very human reaction, and nothing here is about blame.' : 'Stopping is a real option too.') + ' Let\'s run a <b>DECISION X-RAY</b> on the next bet either way.</p><div class="btn-row"><button class="btn primary" id="dxBtn">🔬 DECISION X-RAY</button></div><div id="dxOut" class="hidden"><div class="twocol"><div class="mini sunk"><small>PAST LOSS</small><b class="neg">−300</b><p>Already happened. It is a <b>sunk</b> result.</p></div><div class="mini"><small>NEXT BET EXPECTED VALUE</small><b class="neg">' + sg(evn, 1) + '</b><p>A ' + stakeN + '-token wager on one color: ' + pc(pw, 1) + ' to win, EV = ' + sg(W.ev, 4) + ' per token × ' + stakeN + '.</p></div></div><p class="note">If the bet wins (' + pc(pw, 1) + '), Sam is back to even. If it loses (' + pc(1 - pw, 1) + '), Sam is down −600. The expected value of this bet is calculated <b>separately</b> from the past loss. Past losses do not mathematically improve the expected value of the next independent wager. Feeling the need to recover them is <b>loss chasing</b>, closely related to <b>sunk-cost thinking</b>. Ideas like this are why help lines exist.</p><div id="lcQ"></div></div>';
      $('#dxBtn', x).addEventListener('click', function () { $('#dxOut', x).classList.remove('hidden'); this.disabled = true; UI.sound('xray'); QE.render($('#lcQ', x), 'z6_chase', { onDone: function (r2, rs) { if (!rs) api.complete('z6.chase'); } }); });
      if (P.qrec('z6_chase').correct) $('#dxBtn', x).click();
    } });

    /* 6 Selective memory */
    var c6 = biasCard({ step: 'z6.memory', title: 'Selective Memory', tag: 'BIAS', n: 6 }); stack.appendChild(c6);
    var LOG = [0, 0, 15, 0, 0, 0, 0, 15, 0, 0, 40, 0, 0, 0, 0, 0, 15, 0, 0, 0];
    $('.card-body', c6).innerHTML = '<p>Watch a fictional player\'s <b>20 wagers of 10 tokens</b> go by. ' + C.labels.example + '</p><div class="btn-row"><button class="btn primary" id="smGo">▶ WATCH THE 20 WAGERS</button></div><div id="smStage" class="smstage" aria-live="off"></div><div id="smQ" class="hidden"></div><div id="smRes" class="hidden"></div>';
    $('#smGo', c6).addEventListener('click', function () {
      this.disabled = true; var st = $('#smStage', c6); st.innerHTML = ''; var i = 0;
      (function nx() { if (i >= LOG.length) { $('#smQ', c6).classList.remove('hidden'); if (!$('#smQ', c6).firstChild) QE.render($('#smQ', c6), 'z6_mem', { onDone: reveal }); return; }
        var r = LOG[i++], d = UI.el(r > 10 ? '<div class="smw">WIN +' + (r - 10) + '!</div>' : '<div class="sml">−10</div>'); st.innerHTML = ''; st.appendChild(d); if (r > 10) { UI.sound('win'); UI.confetti(18); } setTimeout(nx, UI.reduced ? 20 : (r > 10 ? 900 : 380)); })();
    });
    function reveal() {
      var rs = $('#smRes', c6); rs.classList.remove('hidden'); if (rs.firstChild) return;
      var wins = LOG.filter(function (r) { return r > 10; }).length, ret = LOG.reduce(function (a, b) { return a + b; }, 0), net = ret - 200;
      rs.innerHTML = '<div class="twocol"><div class="mini"><small>WHAT YOU REMEMBER</small><p>Big flashy wins.</p></div><div class="mini"><small>FULL RECORD</small><p><b>' + wins + '</b> wins and <b>' + (20 - wins) + '</b> losses. Wagered 200, returned ' + ret + ', net <b class="neg">' + sg(net) + '</b>.</p></div></div>' + '<div class="smrec">' + LOG.map(function (r) { return '<i class="' + (r > 10 ? 'w' : 'l') + '">' + (r > 10 ? '+' + (r - 10) : '−10') + '</i>'; }).join('') + '</div><p class="note">Exciting wins are easier to remember and retell than ordinary losses, so memory alone is a poor record of how a game really performs. Keep the full record.</p><div class="btn-row"><button class="btn primary" id="smDone">Got it</button></div>';
      $('#smDone', rs).addEventListener('click', function () { api.complete('z6.memory'); this.disabled = true; }); if (P.isDone('z6.memory')) $('#smDone', rs).disabled = true;
    }
    if (P.qrec('z6_mem').correct) { $('#smQ', c6).classList.remove('hidden'); QE.render($('#smQ', c6), 'z6_mem', { onDone: reveal }); }

    /* 7 Sunk cost */
    var c7 = biasCard({ step: 'z6.sunk', title: 'Sunk-Cost Thinking', tag: 'BIAS', n: 7 }); stack.appendChild(c7);
    $('.card-body', c7).innerHTML = '<div class="twocol"><div class="mini sunk"><small>MACHINE A</small><p>You\'ve already put in <b>200 tokens</b>. "It has to pay out soon."</p></div><div class="mini"><small>MACHINE B</small><p>Brand new. Identical probabilities and payouts.</p></div></div><div id="skQ7"></div>';
    QE.render($('#skQ7', c7), 'z6_sunk', { onDone: function (r, rs) { if (!rs) api.complete('z6.sunk'); } });

    /* 8 Interface X-ray */
    var allBias = ['z6.gf', 'z6.hot', 'z6.control', 'z6.near', 'z6.chase', 'z6.memory', 'z6.sunk'];
    var c8 = UI.card({ id: 'cardIface', title: 'WHY DID WE MAKE THIS EXPERIENCE FLASHY?', kicker: 'X-Ray the interface', step: 'z6.interface', needs: allBias, body: '<p>Think about the machine you played in Zone 2. Then <b>X-RAY THE INTERFACE</b> and open every numbered hotspot.</p><div class="btn-row"><button class="btn primary" id="ifBtn">🔬 X-RAY THE INTERFACE</button></div><div id="ifOut" class="hidden"></div>' });
    stack.appendChild(c8);
    var HOT = [
      ['Animations', 'Motion draws the eye to the machine and turns every spin into an event.'], ['Sounds', 'Music and chimes can make outcomes feel more exciting. (Your Sound switch is OFF by default.)'],
      ['Large payout numbers', 'Big numbers spotlight possible gains. They say nothing about how likely those gains are.'], ['Rapid feedback', 'A spin resolves in seconds, so many wagers happen quickly and the "long run" arrives fast.'],
      ['Reel movement', 'Reels that slow and stop one by one build anticipation before the result is revealed.'], ['Token counters', 'A balance that ticks up and down in real time makes every small change feel immediate.'],
      ['Celebrations', 'Lights and sounds can accompany returns smaller than the wager ("losses disguised as wins"). ' + C.labels.research + ': in a lab study of novice players (Dixon et al., 2010), body arousal after these was similar to real wins.'],
      ['Near-miss presentation', '"SO CLOSE!" highlights how a loss resembles a win. Mathematically it is a loss. ' + C.labels.research + ': Clark et al. (2009), a lab study of adults.']
    ]; var hs = P.get('z6.hotspots', {});
    $('#ifBtn', c8).addEventListener('click', function () {
      this.disabled = true; var out = $('#ifOut', c8); out.classList.remove('hidden'); UI.sound('xray');
      out.innerHTML = '<div class="mock xr"><div class="mk-top">NEON ORCHARD</div><div class="mk-reels"><span class="sy-star">★</span><span class="sy-star">★</span><span class="sy-berry">●</span></div><div class="mk-msg">SO CLOSE!</div><div class="mk-bal">BALANCE 1,240</div><div class="mk-big">+500!</div><div class="mk-hot"></div></div><div class="hotlist"></div><div class="hotinfo note" aria-live="polite">Select each hotspot below to read the design note.</div><p class="dim">Researchers study how design features can influence attention and emotion. Effects vary from person to person and no single feature explains problem gambling. ' + esc(C.text.simNote) + '</p><p class="hot-count"><b id="hotN">0</b> / ' + HOT.length + ' hotspots opened</p>';
      var hl = $('.hotlist', out);
      HOT.forEach(function (h, i) { var b = UI.el('<button type="button" class="hotbtn" data-i="' + i + '"><span>' + (i + 1) + '</span>' + h[0] + '</button>'); if (hs[i]) b.classList.add('seen'); b.addEventListener('click', function () { hs[i] = 1; P.set('z6.hotspots', hs); b.classList.add('seen'); $('.hotinfo', out).innerHTML = '<b>' + (i + 1) + '. ' + h[0] + '.</b> ' + h[1]; var n = Object.keys(hs).length; $('#hotN', out).textContent = n; UI.sound('click'); if (n >= HOT.length) api.complete('z6.interface'); }); hl.appendChild(b); });
      $('#hotN', out).textContent = Object.keys(hs).length;
    });
    if (P.isDone('z6.interface')) $('#ifBtn', c8).click();

    /* 9 Remove the lights */
    var c9 = UI.card({ id: 'cardLights', title: 'REMOVE THE LIGHTS', kicker: 'Experiment', step: 'z6.lights', needs: 'z6.interface', body: '<p>Same game. Two presentations. Play <b>at least 5 rounds of each</b>, then tell us which felt more exciting.</p><div class="ab"><div><h4>GAME A</h4><div id="abA"></div></div><div><h4>GAME B</h4><div id="abB"></div></div></div><p class="dim" id="abCnt"></p><div id="abPoll"></div><div id="abReveal" class="hidden"></div>' });
    stack.appendChild(c9);
    var ab = P.get('z6.ab', { a: [], b: [] }), ctlA, ctlB, pollShown = false;
    function abCheck() { $('#abCnt', c9).textContent = 'Game A rounds: ' + ab.a.length + '/5 · Game B rounds: ' + ab.b.length + '/5'; if (ab.a.length >= 5 && ab.b.length >= 5 && !pollShown) { pollShown = true; QE.render($('#abPoll', c9), 'z6_lights_poll', { onDone: abReveal }); } }
    ctlA = Slot.mount($('#abA', c9), { mode: 'flashy', gameId: 'slots', maxSpins: 10, spins: ab.a, persist: function (s) { ab.a = s; P.set('z6.ab', ab); }, onSpin: abCheck });
    ctlB = Slot.mount($('#abB', c9), { mode: 'plain', gameId: 'slots', maxSpins: 10, spins: ab.b, persist: function (s) { ab.b = s; P.set('z6.ab', ab); }, onSpin: abCheck });
    function abReveal() {
      var r = $('#abReveal', c9); r.classList.remove('hidden'); if (r.firstChild) return;
      var json = g_cfg(), N = 10000, simA = HE.Sim.run(N, function (rng) { return E.playN('slots', 10, 10, rng); }), simB = HE.Sim.run(N, function (rng) { return E.playN('slots', 10, 10, rng); });
      var b = HE.Sim.bounds(simA, [simB.min, simB.max]), hA = HE.Sim.histogram(simA.nets, b.lo, b.hi, C.sim.bins), hB = HE.Sim.histogram(simB.nets, b.lo, b.hi, C.sim.bins);
      r.innerHTML = '<div class="reveal-banner">THE MATH WAS IDENTICAL.</div><p class="bigsay">The presentation changed. <b>The probabilities did not.</b></p><div class="twocol"><div class="mini"><small>GAME A (flashy) reads</small><code>' + esc(json) + '</code></div><div class="mini"><small>GAME B (plain) reads</small><code>' + esc(json) + '</code></div></div><p class="note">Both games call the same <code>E.draw("slots")</code> with the same outcome table (RTP ' + pc(E.game('slots').rtp, 1) + ', house edge ' + pc(E.game('slots').edge, 1) + '). Here are 10,000 simulated 10-spin sessions of each:</p><canvas id="abCv" data-h="220" role="img" aria-label="Two overlapping histograms for Game A and Game B that look the same"></canvas><p class="note">Game A average: <b>' + sg(simA.mean, 2) + '</b> · Game B average: <b>' + sg(simB.mean, 2) + '</b> · Expected: <b>' + sg(E.game('slots').ev * 100, 2) + '</b>. Any difference is randomness, not design.</p><div id="abQ"></div>';
      Ch.hist($('#abCv', r), { counts: hA.counts, lo: b.lo, hi: b.hi, color: Ch.COL.a, overlays: [{ counts: hB.counts, color: Ch.COL.b }], normalize: true, markers: [{ x: E.game('slots').ev * 100, label: 'expected', color: Ch.COL.d, dash: true }] });
      QE.render($('#abQ', r), 'z6_flash', { onDone: function (rr, rs) { if (!rs) { api.complete('z6.lights'); } } });
    }
    function g_cfg() { return JSON.stringify(E.game('slots').outcomes.map(function (o) { return o.id + ':p=' + o.p + ',ret=' + o.ret; })); }
    abCheck();
    UI.refreshLocks(el);
  } };
})(window);
