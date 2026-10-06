/* THE HOUSE EDGE — X-Ray Mode: the whole interface transforms into the machinery underneath.
   Layer renderers read the SAME HE.CONFIG games used for gameplay and simulation. */
(function (root) {
  'use strict';
  var HE = root.HE = root.HE || {}, C = HE.CONFIG, E = HE.Engine, P = HE.Progress, UI = HE.UI;
  var X = HE.XRay = { layers: {} };
  var fmt = E.fmt, sg = E.signed, pc = E.pct, esc = UI.esc;

  /* ---------- Vision badges: what you can see depends on your Analyst level ---------- */
  X.visionTable = function (gameId, wager) {
    var lv = P.level(), g = E.game(gameId), t = E.evTable(gameId, wager || 10);
    var h = '<table class="vision"><thead><tr><th>Outcome</th><th>Pays (return)</th>' + (lv >= 1 ? '<th class="v1">Probability</th>' : '') + (lv >= 3 ? '<th class="v3">p × net</th>' : '') + '</tr></thead><tbody>';
    t.rows.forEach(function (r, i) {
      var o = g.outcomes[i];
      h += '<tr><td>' + esc(o.label) + '</td><td>' + (o.ret ? '×' + fmt(o.ret, o.ret % 1 ? 1 : 0) : '0') + '</td>' + (lv >= 1 ? '<td class="v1">' + pc(o.p, o.p < .01 ? 1 : 1) + '</td>' : '') + (lv >= 3 ? '<td class="v3">' + sg(r.contrib, 2) + '</td>' : '') + '</tr>';
    });
    h += '</tbody></table>';
    if (lv >= 3) h += '<p class="vision-sum v3">EXPECTED VALUE per ' + wager + '-token wager: <b>' + sg(t.ev, 2) + '</b></p>';
    if (lv >= 4) h += '<p class="vision-sum v4">RTP <b>' + pc(g.rtp, 1) + '</b> · HOUSE EDGE <b>' + pc(g.edge, 1) + '</b></p>';
    if (lv < 1) h += '<p class="vision-lock">🔒 Probabilities unlock at Level 1 · Odds Spotter</p>';
    return h;
  };

  /* ---------- Layer: random value -> outcome ---------- */
  X.layers.random = function (el, ctx) {
    var g = E.game(ctx.gameId), s = ctx.spin;
    el.innerHTML = '<p class="xl-lead">GENERATING RANDOM VALUE…</p><div class="rv" aria-live="polite">0.0000</div><div class="rbar" aria-label="Probability ranges"></div><div class="rres"></div><div class="rtbl"></div><p class="note small">' + esc(C.text.simNote) + '</p>';
    var bar = UI.$('.rbar', el), rv = UI.$('.rv', el), res = UI.$('.rres', el);
    g.outcomes.forEach(function (o, i) {
      var seg = UI.el('<div class="rseg s' + (i % 6) + '" style="flex:' + o.p + '" title="' + esc(o.label) + ' ' + pc(o.p, 1) + '"><span>' + (o.p > .08 ? esc(o.label.split('(')[0].trim()) : '') + '</span></div>'); seg.dataset.i = i; bar.appendChild(seg);
    });
    var tb = '<table class="vision"><thead><tr><th>Outcome</th><th>Range of random values</th><th>Probability</th></tr></thead><tbody>', lo = 0;
    g.outcomes.forEach(function (o) { tb += '<tr data-o="' + o.id + '"><td>' + esc(o.label) + '</td><td>' + lo.toFixed(4) + ' – ' + (lo + o.p).toFixed(4) + '</td><td>' + pc(o.p, 1) + '</td></tr>'; lo += o.p; });
    UI.$('.rtbl', el).innerHTML = tb + '</tbody></table>';
    var mk = UI.el('<div class="rmark" aria-hidden="true"><i></i><b>▼</b></div>'); bar.appendChild(mk);
    return new Promise(function (resolve) {
      var t0 = performance.now(), dur = UI.reduced ? 0 : 1400;
      (function tick(t) {
        var k = dur ? Math.min(1, (t - t0) / dur) : 1;
        if (k < 1) { rv.textContent = Math.random().toFixed(4); requestAnimationFrame(tick); return; }
        rv.textContent = s.r.toFixed(4);
        var seg = bar.children[s.index], bb = bar.getBoundingClientRect(), sb = seg.getBoundingClientRect(), frac = (s.r - s.lo) / (s.hi - s.lo);
        mk.style.left = (sb.left - bb.left + sb.width * frac) + 'px'; mk.classList.add('on'); seg.classList.add('hit');
        var tr = UI.$('tr[data-o="' + s.outcome.id + '"]', el); if (tr) tr.classList.add('hit');
        res.innerHTML = 'The random value <b>' + s.r.toFixed(4) + '</b> falls in the range <b>' + s.lo.toFixed(4) + ' – ' + s.hi.toFixed(4) + '</b>, which is configured as <b>' + esc(s.outcome.label) + '</b> (probability ' + pc(s.outcome.p, 1) + ').' +
          '<br><span class="dim">The reels you saw were only decoration chosen to match this result.</span>';
        UI.sound('xray'); resolve();
      })(t0);
    });
  };

  /* ---------- Layer: wager vs return vs net ---------- */
  X.layers.wager = function (el, ctx) {
    var s = ctx.spin, net = s.ret - s.wager;
    el.innerHTML = '<div class="wrn"><div class="wbox"><small>WAGER</small><b class="cw">0</b><span>tokens you staked</span></div><div class="wop">→</div><div class="wbox"><small>RETURN</small><b class="cr">0</b><span>tokens given back (stake included)</span></div><div class="wop">=</div><div class="wbox ' + (net > 0 ? 'pos' : net < 0 ? 'neg' : '') + '"><small>NET PROFIT</small><b class="cn">0</b><span>return − wager</span></div></div>' +
      '<p class="note">' + (s.ret > 0 && s.ret > s.wager ? 'A return of <b>' + fmt(s.ret) + '</b> after a wager of <b>' + s.wager + '</b> is <b>' + sg(net) + '</b> tokens of profit, not ' + fmt(s.ret) + '.' : s.ret > 0 ? 'Even a "win" can return less than you wagered.' : 'A loss returns nothing: net profit is −' + s.wager + '.') + '</p>';
    UI.countTo(UI.$('.cw', el), 0, s.wager, 600); UI.countTo(UI.$('.cr', el), 0, s.ret, 800, function (v) { return fmt(v); }); UI.countTo(UI.$('.cn', el), 0, net, 1000, function (v) { return sg(v); });
    return Promise.resolve();
  };

  /* ---------- Layer: expected value (animated probability × outcome) ---------- */
  X.layers.ev = function (el, ctx) {
    var t = E.evTable(ctx.gameId, ctx.wager || 10), g = E.game(ctx.gameId);
    var h = '<table class="vision evt"><thead><tr><th>Outcome</th><th>Probability</th><th>×</th><th>Net (tokens)</th><th>=</th><th>Contribution</th></tr></thead><tbody>';
    t.rows.forEach(function (r) { h += '<tr class="evrow" style="opacity:0"><td>' + esc(r.label) + '</td><td>' + pc(r.p, 1) + '</td><td>×</td><td>' + sg(r.net, 1) + '</td><td>=</td><td class="ct">' + sg(r.contrib, 3) + '</td></tr>'; });
    h += '<tr class="evsum" style="opacity:0"><td colspan="4"><b>EXPECTED VALUE</b> (add them all)</td><td>=</td><td><b class="evtot">' + sg(t.ev, 2) + '</b></td></tr></tbody></table><div class="evsent" style="opacity:0"></div>';
    el.innerHTML = h;
    var basis = 100, cost = -g.ev * basis;
    var sent = ctx.gameId === 'coin' || Math.abs(g.ev) < 1e-9 ? 'Across many repetitions, this game is expected to cost approximately <b>0</b> tokens per ' + basis + ' tokens wagered (a fair game).' :
      (g.ev < 0 ? 'Across many repetitions, this game is mathematically expected to <b>cost approximately ' + fmt(cost, 1) + ' tokens per ' + basis + ' tokens wagered</b>.' : 'Across many repetitions, this game is mathematically expected to <b>pay approximately ' + fmt(-cost, 1) + ' tokens per ' + basis + ' tokens wagered</b>.');
    var rows = UI.$$('.evrow', el), sum = UI.$('.evsum', el), ss = UI.$('.evsent', el);
    ss.innerHTML = sent + '<br><span class="dim">That is a long-run average. One session can land far above or below it.</span>';
    return rows.reduce(function (p, r) { return p.then(function () { r.style.opacity = 1; r.classList.add('flash'); UI.sound('tick'); return UI.wait(550); }); }, Promise.resolve())
      .then(function () { sum.style.opacity = 1; sum.classList.add('flash'); return UI.wait(700); }).then(function () { ss.style.opacity = 1; });
  };

  /* ---------- Layer: house edge ---------- */
  X.layers.edge = function (el, ctx) {
    var g = E.game(ctx.gameId), per = 100 * g.ev, mx = Math.max(Math.abs(per), 1);
    el.innerHTML = '<div class="edgeview"><div class="eside"><small>PLAYER EXPECTATION</small><div class="ebar"><i class="neg" style="width:' + Math.min(100, Math.abs(per) / mx * 100) + '%"></i></div><b>' + sg(per, 1) + '</b><span>tokens per 100 wagered</span></div>' +
      '<div class="eside"><small>HOUSE EXPECTATION</small><div class="ebar"><i class="pos" style="width:' + Math.min(100, Math.abs(per) / mx * 100) + '%"></i></div><b>' + sg(-per, 1) + '</b><span>tokens per 100 wagered</span></div></div>' +
      '<p class="note">House edge = <b>' + pc(g.edge, 1) + '</b> · Return to player (RTP) = <b>' + pc(g.rtp, 1) + '</b></p><div class="bigsay"><b>THE HOUSE DOES NOT NEED TO WIN EVERY BET.</b><br>IT NEEDS THE MATHEMATICS TO FAVOR IT ACROSS MANY WAGERS.</div>';
    return Promise.resolve();
  };
  X.layers.rtp = function (el, ctx) {
    var g = E.game(ctx.gameId);
    el.innerHTML = '<p class="note">With an RTP of <b>' + pc(g.rtp, 1) + '</b>, the long-run expectation is about <b>' + fmt(g.rtp * 100, 1) + ' tokens returned for every 100 tokens wagered</b>.</p><div class="twocol"><div class="mini"><small>LONG-RUN EXPECTATION</small><p>An average over a very large number of wagers.</p></div><div class="mini"><small>INDIVIDUAL SESSION</small><p>One short run of luck. It will usually miss that percentage, sometimes by a lot.</p></div></div>';
    return Promise.resolve();
  };

  X.meta = {
      random: { n: 1, t: 'LAYER 1 · RANDOM VALUE → OUTCOME', lv: 0 }, wager: { n: 2, t: 'LAYER 2 · WAGER vs RETURN vs NET PROFIT', lv: 0 },
      ev: { n: 3, t: 'LAYER 3 · EXPECTED VALUE', lv: 3, lock: 'Unlocks at LEVEL 3 · VALUE DETECTIVE (Zone 3)' },
      edge: { n: 4, t: 'LAYER 4 · HOUSE EDGE', lv: 4, lock: 'Unlocks at LEVEL 4 · HOUSE EDGE HUNTER (Zone 4)' }, rtp: { n: 5, t: 'LAYER 5 · RTP', lv: 4, lock: 'Unlocks at LEVEL 4 · HOUSE EDGE HUNTER (Zone 4)' }
    };
  /* ---------- Overlay controller ---------- */
  var overlay = null, prevFocus = null;
  X.close = function () {
    if (!overlay) return; overlay.classList.add('closing'); var o = overlay; overlay = null;
    document.body.classList.remove('xray-on'); setTimeout(function () { o.remove(); }, UI.reduced ? 0 : 350);
    document.removeEventListener('keydown', escKey, true); if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {}
  };
  function escKey(e) { if (e.key === 'Escape') { e.stopPropagation(); X.close(); } }
  /* cfg: {title, ctx:{gameId, spin, wager}, layers:[names], embedQ:{layerName: qid}, onComplete} */
  X.open = function (cfg) {
    X.close(); prevFocus = document.activeElement; UI.sound('xray');
    var lv = P.level(), ctx = cfg.ctx;
    overlay = UI.el('<div class="xray-overlay" role="dialog" aria-modal="true" aria-label="X-Ray mode"><div class="xscan" aria-hidden="true"></div><div class="xhead"><div><span class="xtag">X-RAY MODE</span><h2>' + esc(cfg.title || 'BEHIND THE MACHINE') + '</h2></div><button class="btn xclose" type="button">Exit X-Ray ✕</button></div><div class="xbody"></div></div>');
    document.body.appendChild(overlay); document.body.classList.add('xray-on');
    UI.$('.xclose', overlay).addEventListener('click', X.close); document.addEventListener('keydown', escKey, true);
    var body = UI.$('.xbody', overlay), meta = X.meta, queue = cfg.layers.slice(), idx = 0;
    function next() {
      if (!overlay) return;
      if (idx >= queue.length) { var fin = UI.el('<div class="xfinish"><button class="btn primary big" type="button">' + (cfg.finishLabel || 'Done: back to the machine') + '</button></div>'); body.appendChild(fin); UI.$('button', fin).addEventListener('click', function () { X.close(); if (cfg.onFinish) cfg.onFinish(); }); UI.$('button', fin).focus(); if (cfg.onComplete) cfg.onComplete(); return; }
      var name = queue[idx++], m = meta[name], sec = UI.el('<section class="xlayer"><h3><span>' + m.n + '</span>' + m.t + '</h3><div class="xl-body"></div></section>'); body.appendChild(sec);
      var el = UI.$('.xl-body', sec); sec.scrollIntoView({ behavior: UI.reduced ? 'auto' : 'smooth', block: 'start' });
      if (lv < m.lv) { el.innerHTML = '<p class="locked-teaser">🔒 ' + m.lock + '</p>'; sec.classList.add('locked'); return next(); }
      X.layers[name](el, ctx).then(function () {
        var qid = cfg.embedQ && cfg.embedQ[name];
        var cont = function () { if (cfg.onLayerDone) cfg.onLayerDone(name); var b = UI.el('<div class="xnext"><button class="btn primary" type="button">' + (idx >= queue.length ? 'Finish X-Ray ▸' : 'NEXT LAYER ▸') + '</button></div>'); sec.appendChild(b); var bb = UI.$('button', b); bb.addEventListener('click', function () { b.remove(); next(); }); bb.focus({ preventScroll: true }); };
        if (qid) { var qh = UI.el('<div class="xq"></div>'); sec.appendChild(qh); HE.QE.render(qh, qid, { onDone: cont }); } else cont();
      });
    }
    next();
    return overlay;
  };
})(typeof window !== 'undefined' ? window : globalThis);
