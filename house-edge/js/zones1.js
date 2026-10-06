/* THE HOUSE EDGE — Intro, Zone 1 (Probability), Zone 2 (Slot Lab), Zone 3 (Expected Value). Also the reusable Slot component. */
(function (root) {
  'use strict';
  var HE = root.HE = root.HE || {}, C = HE.CONFIG, E = HE.Engine, P = HE.Progress, UI = HE.UI, Ch = HE.Charts, X = HE.XRay, QE = HE.QE;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, fmt = E.fmt, sg = E.signed, pc = E.pct, Z = HE.Zones = HE.Zones || {};

  /* =====================================================================
     SLOT COMPONENT — used by Zone 2, the A/B "Remove the Lights" lab and the Debrief.
     Outcome comes from E.draw(gameId); the reels are only decoration chosen to match it.
     ===================================================================== */
  var SYM = ['★', '◆', '●', '▲', '✿'], SYMC = ['sy-star', 'sy-gem', 'sy-berry', 'sy-leaf', 'sy-blossom'];
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function symbolsFor(show) {
    var r, a, b, c, i;
    switch (show) {
      case 'TRIPLE_STAR': return [0, 0, 0]; case 'TRIPLE_GEM': return [1, 1, 1]; case 'TRIPLE_BERRY': return [2, 2, 2];
      case 'PAIR': a = pick([1, 2, 3, 4]); do { b = pick([1, 2, 3, 4]); } while (b === a); r = [a, a, b]; return shuffle(r);
      case 'NEAR': b = pick([1, 2, 3, 4]); return [0, 0, b];
      default: r = [0, 1, 2, 3, 4]; shuffle(r); return r.slice(0, 3);
    }
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  HE.symbolsFor = symbolsFor; HE.SYM = SYM; HE.SYMC = SYMC;

  var Slot = HE.Slot = {};
  Slot.tally = function (spins, start) {
    var t = E.newTally(start == null ? C.slotSession.startBalance : start);
    spins.forEach(function (s) { E.record(t, s.w, s.ret); }); return E.finish(t);
  };
  Slot.mount = function (el, o) {
    var g = E.game(o.gameId || 'slots'), spins = o.spins || [], flashy = o.mode !== 'plain', wager = g.wagers[1] || g.wagers[0], busy = false, start = o.startBalance == null ? C.slotSession.startBalance : o.startBalance;
    var ctl = { spins: spins, el: el, tally: function () { return Slot.tally(spins, start); }, balance: function () { return start + spins.reduce(function (a, s) { return a + s.ret - s.w; }, 0); } };
    var html;
    if (flashy) html = '<div class="machine flashy"><div class="m-top"><span>' + esc(g.name.toUpperCase()) + '</span><span class="lamps" aria-hidden="true">● ● ● ● ●</span></div><div class="reels" role="img" aria-label="Reels: ready"><div class="reel"><span>★</span></div><div class="reel"><span>★</span></div><div class="reel"><span>★</span></div></div><div class="m-msg" aria-live="polite">Choose a wager, then SPIN.</div><div class="m-bet" role="group" aria-label="Wager size in tokens"></div><div class="m-bal">BALANCE <b class="bal">' + fmt(ctl.balance()) + '</b> tokens</div><button type="button" class="spin-btn">SPIN</button><div class="m-count dim"></div></div>';
    else html = '<div class="machine plain"><h4>' + esc(g.name) + ' (plain version)</h4><p>Balance: <b class="bal">' + fmt(ctl.balance()) + '</b> tokens</p><div class="m-bet" role="group" aria-label="Wager size in tokens"></div><button type="button" class="btn spin-btn">Play one round</button><ol class="plainlog" aria-live="polite"></ol><div class="m-count dim"></div></div>';
    el.innerHTML = html;
    var betEl = $('.m-bet', el), btn = $('.spin-btn', el), balEl = $('.bal', el), msg = $('.m-msg', el), reels = $$('.reel span', el), log = $('.plainlog', el), cnt = $('.m-count', el);
    g.wagers.forEach(function (w) {
      var b = UI.el('<button type="button" class="bet-chip' + (w === wager ? ' on' : '') + '" aria-pressed="' + (w === wager) + '">' + w + '</button>');
      b.addEventListener('click', function () { wager = w; $$('.bet-chip', betEl).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); UI.sound('click'); });
      betEl.appendChild(b);
    });
    function showSyms(arr) { arr.forEach(function (k, i) { reels[i].textContent = SYM[k]; reels[i].className = SYMC[k]; }); $('.reels', el).setAttribute('aria-label', 'Reels: ' + arr.map(function (k) { return SYM[k]; }).join(' ')); }
    function update() {
      var left = (o.maxSpins || 999) - spins.length, bal = ctl.balance();
      cnt.textContent = (o.maxSpins ? 'Spin ' + spins.length + ' of ' + o.maxSpins + ' · ' : spins.length + ' spins · ') + 'wager ' + wager + ' tokens';
      var dis = busy || left <= 0 || bal < wager; btn.disabled = dis;
      if (left <= 0) { btn.textContent = flashy ? 'SESSION COMPLETE' : 'Session complete'; }
      else if (bal < wager) btn.textContent = 'Wager too large for balance';
    }
    function describe(s) {
      var net = s.ret - s.w, oc = g.outcomes[s.i];
      if (flashy) return s.ret > s.w ? (s.ret / s.w >= (C.slotSession.bigWinMultiple) ? 'BIG WIN! ' : 'WIN! ') + oc.label + ' · +' + fmt(net) + '!' : oc.show === 'NEAR' ? 'SO CLOSE!  Try again…' : 'No match. Spin again!';
      return oc.label + '. Wager ' + s.w + ', return ' + fmt(s.ret) + ', net ' + sg(net) + '.';
    }
    ctl.spinOnce = function () {
      if (busy) return Promise.resolve(); var bal = ctl.balance(); if (bal < wager || (o.maxSpins && spins.length >= o.maxSpins)) return Promise.resolve();
      busy = true; update();
      var d = E.draw(g.id), spin = { r: d.r, i: d.index, w: wager, ret: d.outcome.ret * wager, lo: d.lo, hi: d.hi };
      spins.push(spin); if (o.persist) o.persist(spins);
      var fin = function () {
        var net = spin.ret - spin.w; UI.countTo(balEl, bal, ctl.balance(), 500);
        if (flashy) { msg.textContent = describe(spin); msg.className = 'm-msg ' + (net > 0 ? 'win' : ''); $('.reels', el).classList.toggle('winflash', net > 0); UI.sound(net > 0 ? (spin.ret / spin.w >= C.slotSession.bigWinMultiple ? 'big' : 'win') : 'lose'); }
        else { var li = UI.el('<li>' + esc(describe(spin)) + ' Balance ' + fmt(ctl.balance()) + '.</li>'); log.insertBefore(li, log.firstChild); while (log.children.length > 6) log.lastChild.remove(); }
        busy = false; update();
        if (o.onSpin) o.onSpin(spin, ctl);
      };
      if (!flashy) { fin(); return Promise.resolve(spin); }
      var fin_syms = symbolsFor(d.outcome.show); $('.reels', el).classList.remove('winflash'); msg.className = 'm-msg'; msg.textContent = 'Spinning…';
      return new Promise(function (res) {
        if (UI.reduced) { showSyms(fin_syms); fin(); res(spin); return; }
        var stops = [700, 1000, 1300], t0 = performance.now(), iv = setInterval(function () {
          var t = performance.now() - t0;
          reels.forEach(function (r, i) { if (t < stops[i]) { var k = Math.floor(Math.random() * 5); r.textContent = SYM[k]; r.className = SYMC[k] + ' spinning'; } else if (r.classList.contains('spinning') || !r.dataset.done) { r.dataset.done = '1'; r.className = SYMC[fin_syms[i]]; r.textContent = SYM[fin_syms[i]]; UI.sound('tick'); } });
          if (t > stops[2] + 30) { clearInterval(iv); reels.forEach(function (r) { delete r.dataset.done; }); showSyms(fin_syms); fin(); res(spin); }
        }, 70);
      });
    };
    btn.addEventListener('click', function () { UI.sound('click'); ctl.spinOnce(); });
    // restore existing spins
    if (spins.length && flashy) { var last = spins[spins.length - 1]; showSyms(symbolsFor(g.outcomes[last.i].show)); msg.textContent = 'Last spin: ' + describe(last); }
    if (spins.length && !flashy) spins.slice(-6).reverse().forEach(function (s) { log.appendChild(UI.el('<li>' + esc(describe(s)) + '</li>')); });
    ctl.setWager = function (w) { wager = w; update(); };
    ctl.update = update; update();
    return ctl;
  };

  /* =====================================================================
     ZONE 0 — Intro / cinematic opening
     ===================================================================== */
  Z.z0 = { render: function (el, api) {
    var seen = P.isDone('i.predict');
    el.innerHTML = '<section class="hero' + (seen ? ' seen' : '') + '"><div class="hero-glow" aria-hidden="true"></div><div class="hero-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '<h1 class="hero-title" aria-label="The House Edge"><span>THE</span> <span>HOUSE</span> <span>EDGE</span></h1><p class="hero-sub">Think You Can Beat the Game?</p>' +
      '<div class="hero-tokens"><div class="token-stack" aria-hidden="true"><i></i><i></i><i></i></div><div><b id="heroTok">0</b><small>FICTIONAL TOKENS</small></div></div><p class="hero-notice">' + esc(C.tokenNotice) + ' This is a classroom simulation. No real money, no real gambling.</p>' +
      '<div class="hero-case">Central question: <b>Why can gambling feel like you are winning even when the mathematics favors the house?</b></div></section>' +
      '<div id="introQs" class="stack"></div>';
    UI.countTo($('#heroTok', el), 0, C.startTokens, 1800);
    var qs = $('#introQs', el);
    var c1 = UI.card({ title: 'Make a prediction', kicker: 'Before you play', step: 'i.predict', body: '' }); qs.appendChild(c1);
    QE.render($('.card-body', c1), 'i_predict', { onDone: function (r, restored) { if (!restored) api.complete('i.predict'); P.state.prediction = r.last; P.save(); } });
    var c2 = UI.card({ title: 'A business question', kicker: 'Think about it', step: 'i.survive', needs: 'i.predict', body: '' }); qs.appendChild(c2);
    QE.render($('.card-body', c2), 'i_survive', { onDone: function (r, restored) { if (!restored) api.complete('i.survive'); } });
    var c3 = UI.card({ title: 'Your Analyst level', kicker: 'Status', needs: ['i.predict', 'i.survive'], cls: 'enter', body: '<div class="lvl-banner"><small>ANALYST LEVEL</small><b>LEVEL 0 — PLAYER</b><p>Right now you mostly see games, tokens, payouts, animations and results. Complete challenges to unlock the ability to see what is underneath. Your reward is not tokens. It is <b>understanding</b>.</p><button class="btn primary big" type="button" id="enterBtn">ENTER THE FLOOR ▸</button></div>' }); qs.appendChild(c3);
    $('#enterBtn', c3).addEventListener('click', function () { UI.sound('click'); HE.App.show('z1'); });
    UI.refreshLocks(el);
  } };

  /* =====================================================================
     ZONE 1 — Probability training
     ===================================================================== */
  var DICE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  Z.z1 = { render: function (el, api) {
    var stack = UI.el('<div class="stack"></div>'); el.appendChild(stack);

    /* --- A. Coin lab --- */
    var st = P.get('z1.flips', { h: 0, t: 0 }), ys = [];
    var A = UI.card({ id: 'cardCoin', title: 'Coin Lab: flip a fair coin', kicker: 'Experience it', step: 'z1.flip', body:
      '<p>A fair coin has two equally likely sides. Flip it a few times, then a lot. <b>Goal: flip 1,000 coins in total</b> and watch what happens to the percentage of heads.</p>' +
      '<div class="lab-row"><div class="coinbox"><div class="coin" id="coin" aria-hidden="true">H</div><div class="v1 badge-v">P(heads) = 1/2 = 50%</div></div>' +
      '<div class="lab-main"><div class="counter-row"><div><small>HEADS</small><b id="cH">0</b></div><div><small>TAILS</small><b id="cT">0</b></div><div><small>% HEADS</small><b id="cP">—</b></div><div><small>TOTAL FLIPS</small><b id="cN">0</b> <span class="dim">/ 1,000</span></div></div>' +
      '<div class="btn-row" role="group" aria-label="Flip buttons"><button class="btn" data-n="1">Flip 1</button><button class="btn" data-n="10">Flip 10</button><button class="btn" data-n="100">Flip 100</button><button class="btn primary" data-n="1000">Flip 1,000</button><button class="btn ghost" id="coinReset">Clear lab</button></div>' +
      '<canvas id="coinChart" data-h="220" role="img" aria-label="Line chart: running percent of heads moving toward 50 percent as flips increase"></canvas></div></div><div id="coinQ"></div>' });
    stack.appendChild(A);
    var coin = $('#coin', A);
    function drawCoin() {
      var n = st.h + st.t; $('#cH', A).textContent = fmt(st.h); $('#cT', A).textContent = fmt(st.t); $('#cN', A).textContent = fmt(n); $('#cP', A).textContent = n ? pc(st.h / n, 1) : '—';
      if (ys.length > 1) Ch.lines(coinCv, { series: [{ ys: ys, color: Ch.COL.b, label: '% heads so far' }, { ys: ys.map(function () { return 50; }), color: Ch.COL.a, dash: true, label: '50% (fair)' }], min: 0, max: 100, unit: '%', dec: 0, xlabel: 'number of flips →', animate: false });
      if (n >= 1000) showCoinQ();
    }
    var coinCv = $('#coinChart', A), qShown = false;
    function showCoinQ() { if (qShown) return; qShown = true; var h = $('#coinQ', A); h.innerHTML = '<hr>'; QE.render(h, 'z1_sample', { onDone: function (r, rs) { if (!rs) api.complete('z1.flip'); } }); }
    $$('button[data-n]', A).forEach(function (b) { b.addEventListener('click', function () {
      var n = +b.dataset.n, last; UI.sound('click');
      for (var i = 0; i < n; i++) { last = E.rand() < .5; if (last) st.h++; else st.t++; ys.push(st.h / (st.h + st.t) * 100); }
      coin.textContent = last ? 'H' : 'T'; coin.classList.remove('flip'); void coin.offsetWidth; coin.classList.add('flip');
      P.set('z1.flips', st); drawCoin();
    }); });
    $('#coinReset', A).addEventListener('click', function () { st = { h: 0, t: 0 }; ys = []; P.set('z1.flips', st); Ch.lines(coinCv, { series: [{ ys: [50, 50], color: Ch.COL.a, dash: true }], min: 0, max: 100, animate: false }); drawCoin(); });
    if (st.h + st.t >= 1000) { ys = [50, 50]; }
    setTimeout(function () { drawCoin(); }, 30);

    /* --- B. Dice lab --- */
    var dc = P.get('z1.dice', { c: new Array(11).fill(0), n: 0 });
    var B = UI.card({ id: 'cardDice', title: 'Dice Lab: two dice, 36 combinations', kicker: 'Predict it, then test it', step: 'z1.dice', needs: 'z1.flip', body:
      '<div id="diceQ1"></div><div id="diceLab" class="hidden"><div class="lab-row"><div class="dicebox"><span class="die" id="d1">⚀</span><span class="die" id="d2">⚀</span><div class="dtot">TOTAL <b id="dT">—</b></div><div class="v1 badge-v">P(total 7) = ?</div></div>' +
      '<div class="lab-main"><div class="btn-row"><button class="btn" data-r="1">Roll 1</button><button class="btn" data-r="10">Roll 10</button><button class="btn primary" data-r="100">Roll 100</button><button class="btn ghost" data-r="1000">Roll 1,000</button></div><p class="dim">Rolls so far: <b id="dN">0</b> / 100 needed</p><canvas id="diceChart" data-h="220" role="img" aria-label="Bar chart of how many times each total from 2 to 12 has been rolled"></canvas>' +
      '<div class="btn-row"><button class="btn ghost" id="showMath" disabled>Show the math (after 100 rolls)</button></div><div id="diceMath" class="hidden"></div></div></div><div id="diceQ2"></div></div>' });
    stack.appendChild(B);
    var dCv = $('#diceChart', B), ways = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
    function drawDice(theory) {
      Ch.vbars(dCv, { values: dc.c, labels: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], theory: theory ? ways.map(function (w) { return dc.n * w / 36; }) : null, theoryLabel: 'expected if the math is right', xlabel: 'total of two dice' });
      $('#dN', B).textContent = fmt(dc.n); $('#showMath', B).disabled = dc.n < 100; if (dc.n >= 100) $('#showMath', B).textContent = 'Show the math';
      if (dc.n >= 100) showDiceQ2();
    }
    var q2 = false; function showDiceQ2() { if (q2) return; q2 = true; var h = $('#diceQ2', B); h.innerHTML = '<hr>'; QE.render(h, 'z1_dice_num', { onDone: function (r, rs) { if (!rs) api.complete('z1.dice'); } }); }
    QE.render($('#diceQ1', B), 'z1_dice_predict', { onDone: function () { $('#diceLab', B).classList.remove('hidden'); drawDice(false); } });
    $$('button[data-r]', B).forEach(function (b) { b.addEventListener('click', function () {
      var n = +b.dataset.r, a, c; UI.sound('click');
      for (var i = 0; i < n; i++) { a = Math.floor(E.rand() * 6); c = Math.floor(E.rand() * 6); dc.c[a + c]++; dc.n++; }
      $('#d1', B).textContent = DICE[a]; $('#d2', B).textContent = DICE[c]; $('#dT', B).textContent = a + c + 2; $$('.die', B).forEach(function (d) { d.classList.remove('roll'); void d.offsetWidth; d.classList.add('roll'); });
      P.set('z1.dice', dc); drawDice($('#diceMath', B).childElementCount > 0);
    }); });
    $('#showMath', B).addEventListener('click', function () {
      var h = '<div class="mathgrid"><table class="vision"><thead><tr><th>Total</th>' + [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (t) { return '<th>' + t + '</th>'; }).join('') + '</tr></thead><tbody><tr><td>Ways (of 36)</td>' + ways.map(function (w) { return '<td' + (w === 6 ? ' class="hit"' : '') + '>' + w + '</td>'; }).join('') + '</tr><tr><td>Probability</td>' + ways.map(function (w) { return '<td>' + pc(w / 36, 1) + '</td>'; }).join('') + '</tr></tbody></table></div><p class="note">' + C.labels.fact.toLowerCase() + ': probability = favorable ways ÷ 36. The yellow lines on the chart show the counts the math expects for your number of rolls. Your real rolls wobble around them.</p>';
      $('#diceMath', B).innerHTML = h; $('#diceMath', B).classList.remove('hidden'); drawDice(true);
    });
    if (P.qrec('z1_dice_predict').correct) { $('#diceLab', B).classList.remove('hidden'); setTimeout(function () { drawDice(false); }, 40); }

    /* --- C. Streak detector --- */
    var sk = P.get('z1.streak', { batches: 0, longs: [] });
    var Cc = UI.card({ id: 'cardStreak', title: 'Streak Detector: does randomness look random?', kicker: 'Question it', step: 'z1.streak', needs: 'z1.dice', body:
      '<p>Each button flips a fair coin <b>100 times</b> and highlights the longest streak (same side in a row). <b>Run at least 5 batches.</b></p><div class="btn-row"><button class="btn primary" id="sk1">Flip 100 coins</button><button class="btn" id="sk20">Run 20 batches</button><span class="dim">Batches run: <b id="skN">0</b> / 5</span></div>' +
      '<div class="lab-row"><div class="grid100" id="grid100" aria-label="100 coin flips, H or T"></div><div class="lab-main"><p id="skMsg" class="note">Press the button to flip.</p><canvas id="skChart" data-h="200" role="img" aria-label="Bar chart of the longest streak found in each batch of 100 flips"></canvas></div></div><div id="skQ"></div>' });
    stack.appendChild(Cc);
    function drawSk() {
      var counts = new Array(14).fill(0); sk.longs.forEach(function (l) { counts[Math.min(13, l) - 1]++; });
      $('#skN', Cc).textContent = sk.batches;
      if (sk.batches) Ch.vbars($('#skChart', Cc), { values: counts.slice(1, 14), labels: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14+'], xlabel: 'longest streak in a 100-flip batch' });
      if (sk.batches >= 5) showSkQ();
    }
    var skq = false; function showSkQ() { if (skq) return; skq = true; var h = $('#skQ', Cc); h.innerHTML = '<hr><div class="note">' + C.labels.fact + ': in 100 fair flips, the chance of a streak of 5+ is about <b>' + pc(E.probRunAtLeast(100, 5), 0) + '</b>, and the typical longest streak is about <b>' + fmt(E.expectedLongestRun(100), 1) + '</b>.</div>'; QE.render(h, 'z1_streak', { onDone: function (r, rs) { if (!rs) api.complete('z1.streak'); } }); }
    function batch(show) {
      var arr = [], i; for (i = 0; i < 100; i++) arr.push(E.rand() < .5 ? 'H' : 'T');
      var lr = E.longestRun(arr); sk.batches++; sk.longs.push(lr.len);
      if (show) { var g = $('#grid100', Cc); g.innerHTML = arr.map(function (v, k) { return '<i class="' + (v === 'H' ? 'h' : 't') + (k >= lr.start && k < lr.start + lr.len ? ' streak' : '') + '">' + v + '</i>'; }).join(''); $('#skMsg', Cc).innerHTML = 'Longest streak in this batch: <b>' + lr.len + ' ' + (arr[lr.start] === 'H' ? 'heads' : 'tails') + '</b> (outlined). Is it unusual? Keep flipping and see.'; }
    }
    $('#sk1', Cc).addEventListener('click', function () { UI.sound('click'); batch(true); P.set('z1.streak', sk); drawSk(); });
    $('#sk20', Cc).addEventListener('click', function () { UI.sound('click'); for (var i = 0; i < 20; i++) batch(i === 19); P.set('z1.streak', sk); drawSk(); });
    if (sk.batches) setTimeout(drawSk, 40);
    UI.refreshLocks(el);
    api.onLevel(function () { /* vision badges are CSS-gated by body[data-level] */ });
  } };

  /* =====================================================================
     ZONE 2 — Slot machine lab
     ===================================================================== */
  Z.z2 = { render: function (el, api) {
    var sess = P.get('z2.session', { spins: [] }), g = E.game('slots'), S = C.slotSession, ctl, xrayOpen = false;
    var card = UI.card({ id: 'cardSlot', title: 'Neon Orchard: a fictional slot machine', kicker: 'Experience it', step: 'z2.spins', body:
      '<p>Each spin uses explicit probabilities and payouts. Play your session (at least <b>' + S.minSpins + '</b> spins, up to <b>' + S.maxSpins + '</b>). You start with <b>' + fmt(S.startBalance) + ' tokens</b>. <span class="dim">' + esc(C.tokenNotice) + '</span></p>' +
      '<div class="slot-layout"><div id="slotMount"></div><div class="slot-side"><div class="statbox" id="slotStats"></div><details class="paytable" open><summary>Pay table <span class="chipv">VISION</span></summary><div id="payTbl"></div></details><div id="xrayCta"></div></div></div><div id="spinLog" class="spinlog" aria-label="Recent spins"></div>' });
    el.appendChild(card);
    function stats() {
      var t = ctl.tally(); var h = '<div class="sg"><div><small>STARTING BALANCE</small><b>' + fmt(S.startBalance) + '</b></div><div><small>BALANCE NOW</small><b>' + fmt(ctl.balance()) + '</b></div><div><small>TOTAL WAGERED</small><b>' + fmt(t.wagered) + '</b></div><div><small>TOTAL RETURNED</small><b>' + fmt(t.returned) + '</b></div><div><small>NET RESULT</small><b class="' + (t.net > 0 ? 'pos' : t.net < 0 ? 'neg' : '') + '">' + sg(t.net) + '</b></div><div><small>SPINS</small><b>' + t.bets + '</b></div><div><small>WINS / LOSSES</small><b>' + t.wins + ' / ' + t.losses + '</b></div><div><small>LARGEST WIN</small><b>' + fmt(t.largestWin) + '</b></div></div>';
      $('#slotStats', card).innerHTML = h;
      $('#spinLog', card).innerHTML = ctl.spins.slice(-8).reverse().map(function (s, i) { var n = s.ret - s.w; return '<span class="lg ' + (n > 0 ? 'w' : 'l') + '" title="' + esc(g.outcomes[s.i].label) + '">' + sg(n) + '</span>'; }).join('');
    }
    function pay() { $('#payTbl', card).innerHTML = X.visionTable('slots', 10); }
    function cta() {
      var n = ctl.spins.length, h = '', done = P.isDone('z2.xray');
      if (n >= 1) h += '<button class="btn ' + (n >= S.minSpins && !done ? 'primary pulse' : '') + '" id="xrBtn" type="button">🔬 X-RAY THE MACHINE' + (done ? ' (again)' : '') + '</button>';
      if (n >= S.minSpins && !done) h += '<p class="note">' + (ctl.spins.some(bigWin) ? 'You hit a big win!' : 'No big win this session. That is allowed, and it is honest randomness.') + ' Now X-ray the machine to see what is under the hood. <b>Required.</b></p>';
      $('#xrayCta', card).innerHTML = h; var b = $('#xrBtn', card); if (b) b.addEventListener('click', function () { openXray(ctl.spins[ctl.spins.length - 1]); });
    }
    function bigWin(s) { return s.ret / s.w >= S.bigWinMultiple; }
    function openXray(spin) {
      X.open({ title: 'BEHIND THE MACHINE', ctx: { gameId: 'slots', spin: { r: spin.r, index: spin.i, lo: spin.lo, hi: spin.hi, outcome: g.outcomes[spin.i], wager: spin.w, ret: spin.ret }, wager: spin.w },
        layers: ['random', 'wager', 'ev', 'edge', 'rtp'], embedQ: { wager: 'z2_net' }, onLayerDone: function (n) { if (n === 'wager') { api.complete('z2.xray'); cta(); } }, finishLabel: 'Back to the machine ▸', onFinish: function () { cta(); } });
    }
    function celebrate(spin) {
      var first = !P.isDone('z2.xray'), ov = UI.el('<div class="celebrate" role="dialog" aria-modal="true" aria-label="Big win"><div class="cel-text">BIG WIN!</div><div class="cel-amt">+' + fmt(spin.ret - spin.w) + ' tokens</div></div>');
      document.body.appendChild(ov); UI.confetti(180); UI.sound('big');
      UI.wait(2300).then(function () {
        ov.className = 'celebrate frozen'; ov.innerHTML = '<div class="cel-wait">WAIT.</div><p class="cel-sub">That was a ' + fmt(spin.ret / spin.w, 1) + '× return. Was it a good bet, or just a good spin? Let\'s look underneath.</p><div class="btn-row center"><button class="btn primary big" type="button" id="xrWin">X-RAY THIS WIN</button>' + (first ? '' : '<button class="btn ghost" type="button" id="skipWin">Keep playing</button>') + '</div>';
        $('#xrWin', ov).focus(); $('#xrWin', ov).addEventListener('click', function () { ov.remove(); openXray(spin); }); var sk = $('#skipWin', ov); if (sk) sk.addEventListener('click', function () { ov.remove(); });
      });
    }
    ctl = Slot.mount($('#slotMount', card), { mode: 'flashy', gameId: 'slots', maxSpins: S.maxSpins, spins: sess.spins, persist: function (s) { sess.spins = s; P.set('z2.session', sess); }, onSpin: function (spin) {
      stats(); cta(); if (ctl.spins.length >= S.minSpins) { api.complete('z2.spins'); P.set('z2.stats', slotSnapshot(ctl)); }
      if (bigWin(spin)) celebrate(spin);
      if (ctl.spins.length >= S.maxSpins) UI.toast('Session complete. Your result is saved. You will compare it with 10,000 players later.');
    } });
    stats(); pay(); cta(); api.onLevel(pay);
    if (ctl.spins.length >= S.minSpins) api.complete('z2.spins');
    UI.refreshLocks(el);
  } };
  function slotSnapshot(ctl) { var t = ctl.tally(); return { start: t.start, end: t.end, net: t.net, wagered: t.wagered, returned: t.returned, bets: t.bets, wins: t.wins, losses: t.losses, largestWin: t.largestWin }; }
  Slot.snapshot = slotSnapshot;
  /* Ensures a slot session exists (teacher demo jumps). */
  Slot.ensureSession = function () {
    var s = P.get('z2.session', null);
    if (!s || !s.spins || s.spins.length < 1) {
      var g = E.game('slots'), spins = [], rng = E.rand;
      for (var i = 0; i < C.slotSession.minSpins; i++) { var d = E.draw('slots'); spins.push({ r: d.r, i: d.index, w: 10, ret: d.outcome.ret * 10, lo: d.lo, hi: d.hi }); }
      s = { spins: spins, demo: true }; P.set('z2.session', s);
    }
    return s;
  };

  /* =====================================================================
     ZONE 3 — Expected value lab
     ===================================================================== */
  Z.z3 = { render: function (el, api) {
    var stack = UI.el('<div class="stack"></div>'); el.appendChild(stack); var ev = C.evGame, W = ev.win.net, Lz = ev.lose.net;
    var truth = ev.win.p * W + ev.lose.p * Lz;
    var sizes = P.get('z3.sizes', {});
    var A = UI.card({ id: 'cardEV', title: 'The 50/50 bet: +8 or −10', kicker: 'Experience it → Calculate it', step: 'z3.coin', body:
      '<p>A hypothetical game: <b>' + pc(ev.win.p, 0) + ' chance to gain ' + W + ' tokens</b>, <b>' + pc(ev.lose.p, 0) + ' chance to lose ' + (-Lz) + ' tokens</b>.</p><div id="evPoll"></div>' +
      '<div id="evSim" class="hidden"><p><b>Simulate it.</b> Run all four sizes, then reveal the math.</p><div class="btn-row" id="evBtns"></div><div class="evres" id="evRes"></div><canvas id="evChart" data-h="220" role="img" aria-label="Line chart of the running average result per play moving toward the expected value"></canvas><div class="btn-row"><button class="btn primary" id="evReveal" disabled>REVEAL THE EXPECTED VALUE</button></div><div id="evEq" class="eqbox hidden"></div></div>' });
    stack.appendChild(A);
    QE.render($('#evPoll', A), 'z3_play', { onDone: function () { $('#evSim', A).classList.remove('hidden'); } });
    var res = $('#evRes', A);
    C.sim.sizes.forEach(function (n) {
      var b = UI.el('<button class="btn" type="button">' + fmt(n) + (n === 1 ? ' trial' : ' trials') + '</button>'); $('#evBtns', A).appendChild(b);
      b.addEventListener('click', function () {
        UI.sound('click'); var rng = E.makeRng(), tot = 0, run = [];
        for (var i = 1; i <= n; i++) { tot += rng() < ev.win.p ? W : Lz; run.push(tot / i); }
        sizes[n] = { avg: tot / n, total: tot }; P.set('z3.sizes', sizes); showRes();
        Ch.lines($('#evChart', A), { series: [{ ys: n === 1 ? [run[0], run[0]] : run, color: Ch.COL.b, label: 'running average per play' }], zero: true, min: -12, max: 10, dec: 0, xlabel: 'trials →' });
      });
    });
    function showRes() {
      res.innerHTML = C.sim.sizes.map(function (n) { var r = sizes[n]; return '<div class="evr ' + (r ? 'on' : '') + '"><small>' + fmt(n) + ' trial' + (n > 1 ? 's' : '') + '</small><b>' + (r ? sg(r.avg, 2) : '?') + '</b><span>avg per play</span></div>'; }).join('');
      var all = C.sim.sizes.every(function (n) { return sizes[n]; }); $('#evReveal', A).disabled = !all;
    }
    showRes();
    $('#evReveal', A).addEventListener('click', function () {
      var b = $('#evEq', A); b.classList.remove('hidden'); b.innerHTML = '';
      UI.sequence(b, ['<span class="dim">Expected value = Σ probability × outcome</span>', 'EV = ' + ev.win.p.toFixed(2) + ' (' + sg(W) + ') + ' + ev.lose.p.toFixed(2) + ' (' + sg(Lz) + ')', '= ' + fmt(ev.win.p * W, 0) + ' − ' + fmt(Math.abs(ev.lose.p * Lz), 0), '= <b class="bigev">' + sg(truth, 0) + ' token</b>', 'Across many repetitions, this hypothetical game costs approximately <b>' + fmt(-truth, 0) + ' token per play</b> on average. Look back at your 10,000-trial result. A few plays swing wildly. Many plays settle toward the expected value.'], 750).then(function () { api.complete('z3.coin'); });
    });
    if (P.isDone('z3.coin')) { $('#evSim', A).classList.remove('hidden'); $('#evReveal', A).disabled = false; }

    var Bq = UI.card({ id: 'cardEVc', title: 'EV challenges (unlimited retries)', kicker: 'Calculate it', step: 'z3.challenges', needs: 'z3.coin', body: '<div id="evQs" class="qlist"></div>' });
    stack.appendChild(Bq); var ids = ['z3_ev1', 'z3_ev2', 'z3_ev3', 'z3_big'];
    function chk() { if (ids.every(function (i) { return P.qrec(i).correct; })) api.complete('z3.challenges'); }
    ids.forEach(function (id) { QE.render($('#evQs', Bq), id, { onDone: function (r, rs) { if (!rs) chk(); } }); }); chk();

    var Cc = UI.card({ id: 'cardSlotEV', title: 'X-ray the slot machine\'s expected value', kicker: 'X-Ray it', step: 'z3.slotev', needs: 'z3.challenges', body:
      '<p>Now point the same math at <b>Neon Orchard</b>, the machine you played. This table is built from the same configuration that chose your spins.</p><div class="btn-row"><button class="btn primary" id="evSlotBtn">▶ ANIMATE EXPECTED VALUE (10-token wager)</button></div><div id="evSlotOut"></div><div id="evSlotQ"></div>' });
    stack.appendChild(Cc);
    $('#evSlotBtn', Cc).addEventListener('click', function () {
      var out = $('#evSlotOut', Cc); out.innerHTML = '<div class="xray-inline"></div>'; var inner = $('.xray-inline', out); this.disabled = true;
      X.layers.ev(inner, { gameId: 'slots', wager: 10 }).then(function () { var h = $('#evSlotQ', Cc); if (!h.firstChild) { h.innerHTML = '<hr>'; QE.render(h, 'z3_slot', { onDone: function (r, rs) { if (!rs) api.complete('z3.slotev'); } }); } });
    });
    if (P.qrec('z3_slot').correct) { $('#evSlotBtn', Cc).click(); }
    UI.refreshLocks(el);
  } };
})(window);
