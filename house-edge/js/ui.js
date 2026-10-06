/* THE HOUSE EDGE — UI helpers: DOM, sound, modal, toast, confetti, ambient background, cards. */
(function (root) {
  'use strict';
  var HE = root.HE = root.HE || {}, C = HE.CONFIG, P = HE.Progress;
  var UI = HE.UI = {};
  var doc = root.document;

  UI.$ = function (s, r) { return (r || doc).querySelector(s); };
  UI.$$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  UI.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  UI.el = function (html) { var t = doc.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  var mq = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  Object.defineProperty(UI, 'reduced', { get: function () { return mq.matches || doc.documentElement.classList.contains('reduce-motion'); } });
  UI.wait = function (ms) { return new Promise(function (r) { setTimeout(r, UI.reduced ? Math.min(ms, 30) : ms); }); };
  UI.nextFrame = function () { return new Promise(function (r) { requestAnimationFrame(r); }); };
  UI.live = function (msg) { var l = UI.$('#live'); if (l) { l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 30); } };
  UI.stepLabel = function (id) {
    for (var i = 0; i < C.zones.length; i++) { var s = P.zoneSteps(C.zones[i].id).filter(function (x) { return x[0] === id; })[0]; if (s) return s[1]; }
    return id;
  };

  /* animated number */
  UI.countTo = function (el, from, to, ms, fmt) {
    fmt = fmt || function (v) { return HE.Engine.fmt(v, 0); };
    if (UI.reduced || ms <= 0) { el.textContent = fmt(to); return; }
    var t0 = performance.now();
    (function tick(t) {
      var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  };

  /* ---------- Sound (generated locally with WebAudio; default OFF) ---------- */
  var ac = null;
  function ctx() { if (!ac) { try { ac = new (root.AudioContext || root.webkitAudioContext)(); } catch (e) {} } return ac; }
  function tone(f, d, type, vol, when) {
    var a = ctx(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (when || 0);
    o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  }
  UI.sound = function (name) {
    if (!P.pref('sound')) return;
    switch (name) {
      case 'click': tone(520, 0.06, 'triangle', 0.04); break;
      case 'tick': tone(300 + Math.random() * 60, 0.04, 'square', 0.02); break;
      case 'win': [523, 659, 784].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.05, i * 0.09); }); break;
      case 'big': [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.06, i * 0.09); }); break;
      case 'lose': tone(180, 0.25, 'sine', 0.05); break;
      case 'level': [392, 523, 659, 784].forEach(function (f, i) { tone(f, 0.25, 'sine', 0.05, i * 0.12); }); break;
      case 'xray': tone(120, 0.5, 'sawtooth', 0.025); tone(900, 0.4, 'sine', 0.02, 0.1); break;
      case 'wrong': tone(200, 0.15, 'square', 0.03); break;
      case 'right': tone(660, 0.1, 'triangle', 0.05); tone(880, 0.14, 'triangle', 0.05, 0.08); break;
    }
  };

  /* ---------- Toast ---------- */
  UI.toast = function (msg, ms) {
    var r = UI.$('#toasts'), t = UI.el('<div class="toast" role="status">' + UI.esc(msg) + '</div>');
    r.appendChild(t); setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, ms || 3200);
  };

  /* ---------- Modal (focus-trapped, ESC to close) ---------- */
  UI.modal = function (o) {
    var root_ = UI.$('#modalRoot'), prev = doc.activeElement, id = 'm' + Math.random().toString(36).slice(2, 7);
    var wrap = UI.el('<div class="modal-back"><div class="modal ' + (o.cls || '') + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="' + id + '"><h2 id="' + id + '">' + (o.titleHtml || UI.esc(o.title || '')) + '</h2><div class="modal-body"></div><div class="modal-actions"></div></div></div>');
    var body = UI.$('.modal-body', wrap), acts = UI.$('.modal-actions', wrap);
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    var api = { el: wrap, body: body, close: function () { wrap.remove(); doc.removeEventListener('keydown', key, true); if (prev && prev.focus) try { prev.focus(); } catch (e) {} if (o.onClose) o.onClose(); } };
    (o.actions || (o.persistent ? [] : [{ label: 'Close', primary: true }])).forEach(function (a) {
      var b = UI.el('<button class="btn ' + (a.primary ? 'primary' : '') + '">' + a.label + '</button>');
      b.addEventListener('click', function () { if (a.onClick) a.onClick(api); if (a.close !== false) api.close(); });
      acts.appendChild(b);
    });
    function key(e) {
      if (e.key === 'Escape' && !o.persistent) { e.stopPropagation(); api.close(); return; }
      if (e.key === 'Tab') {
        var f = UI.$$('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])', wrap).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
        if (!f.length) return; var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    doc.addEventListener('keydown', key, true);
    root_.appendChild(wrap);
    var f0 = UI.$('.modal-actions .btn.primary', wrap) || UI.$('button,input,textarea', wrap); if (f0) f0.focus();
    return api;
  };
  UI.confirm = function (title, msg, yes, onYes) {
    UI.modal({ title: title, body: '<p>' + msg + '</p>', actions: [{ label: 'Cancel' }, { label: yes, primary: true, onClick: onYes }] });
  };

  /* ---------- Confetti / particles ---------- */
  var fx = null, parts = [], fxRun = false;
  UI.confetti = function (n, opts) {
    if (UI.reduced) return;
    fx = fx || UI.$('#fx'); if (!fx) return;
    var w = fx.width = root.innerWidth, h = fx.height = root.innerHeight, cols = (opts && opts.colors) || ['#ffd43b', '#ff6b6b', '#4dabf7', '#51cf66', '#e599f7', '#ffffff'];
    for (var i = 0; i < n; i++) parts.push({ x: w / 2 + (Math.random() - .5) * w * .3, y: h * .45, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, g: .35, s: 4 + Math.random() * 6, c: cols[i % cols.length], r: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 120 + Math.random() * 60 });
    if (!fxRun) { fxRun = true; requestAnimationFrame(loop); }
    function loop() {
      var g = fx.getContext('2d'); g.clearRect(0, 0, fx.width, fx.height);
      parts = parts.filter(function (p) { return p.life-- > 0 && p.y < fx.height + 20; });
      parts.forEach(function (p) { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.min(1, p.life / 40); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); g.restore(); });
      if (parts.length) requestAnimationFrame(loop); else { fxRun = false; g.clearRect(0, 0, fx.width, fx.height); }
    }
  };

  /* ---------- Ambient background: floating glyphs that turn into math as you level up ---------- */
  var bg, bgg, glyphs = [], bgTimer;
  var SETS = [
    ['★', '◆', '●', '▲', '7', '$', '♣'],
    ['★', '◆', '1/2', '25%', '●', '1/6', '7'],
    ['1/2', '25%', '12.5%', 'P(A)', '◆', '1/36', '=', '★'],
    ['EV', 'p×x', '−1', '+8', '25%', 'P(A)', '1/6'],
    ['EV', 'RTP', '89.5%', 'edge', 'p×x', '−1.05'],
    ['Π p', '0.5ⁿ', '1.91ⁿ', 'EV', 'RTP', 'edge'],
    ['bias', 'EV', 'σ', 'Π p', 'RTP', 'p×x'],
    ['σ', 'μ', 'n=10,000', 'EV', 'edge', 'Σ p·x'],
    ['Σ p·x', 'σ', 'μ', 'n→∞', 'EV', 'RTP', 'Π p']
  ];
  UI.setLevel = function (n) {
    doc.body.setAttribute('data-level', n);
    var set = SETS[Math.min(n, SETS.length - 1)];
    glyphs = [];
    for (var i = 0; i < 26; i++) glyphs.push({ t: set[i % set.length], x: Math.random(), y: Math.random(), s: 14 + Math.random() * 30, v: .0003 + Math.random() * .0006, a: .05 + Math.random() * .12 });
    drawBg();
  };
  function drawBg() {
    bg = bg || UI.$('#bg'); if (!bg) return;
    var w = bg.width = root.innerWidth, h = bg.height = root.innerHeight; bgg = bg.getContext('2d');
    var lv = +doc.body.getAttribute('data-level') || 0;
    bgg.clearRect(0, 0, w, h);
    glyphs.forEach(function (g) {
      bgg.globalAlpha = g.a; bgg.fillStyle = lv >= 3 ? '#6ee7ff' : (lv >= 1 ? '#c9b6ff' : '#ffd43b');
      bgg.font = (lv >= 3 ? '600 ' : 'bold ') + g.s + 'px ' + (lv >= 3 ? 'ui-monospace,Consolas,monospace' : 'system-ui,sans-serif');
      bgg.fillText(g.t, g.x * w, g.y * h);
    });
  }
  UI.startBg = function () {
    clearInterval(bgTimer);
    root.addEventListener('resize', drawBg);
    if (UI.reduced) return;
    bgTimer = setInterval(function () {
      if (doc.hidden || doc.body.classList.contains('xray-on')) return;
      glyphs.forEach(function (g) { g.y -= g.v * 50; if (g.y < -.05) { g.y = 1.05; g.x = Math.random(); } });
      drawBg();
    }, 60);
  };

  /* ---------- Cards with locks ---------- */
  UI.card = function (o) {
    var c = UI.el('<section class="card ' + (o.cls || '') + '" ' + (o.id ? 'id="' + o.id + '"' : '') + '><header><span class="kicker">' + (o.kicker || '') + '</span><h3>' + o.title + '</h3>' +
      (o.step ? '<span class="done-badge" aria-hidden="true">✓</span>' : '') + '</header><div class="card-body"></div><div class="lock-msg" role="note"></div></section>');
    if (o.needs) c.dataset.needs = Array.isArray(o.needs) ? o.needs.join(',') : o.needs;
    if (o.step) c.dataset.step = o.step;
    var b = UI.$('.card-body', c);
    if (typeof o.body === 'string') b.innerHTML = o.body; else if (o.body) b.appendChild(o.body);
    return c;
  };
  UI.refreshLocks = function (scope) {
    UI.$$('.card', scope || doc).forEach(function (c) {
      var needs = c.dataset.needs ? c.dataset.needs.split(',') : [], missing = needs.filter(function (s) { return !P.isDone(s); });
      var locked = missing.length > 0;
      c.classList.toggle('locked', locked);
      var body = UI.$('.card-body', c);
      if (locked) { body.setAttribute('inert', ''); body.setAttribute('aria-hidden', 'true'); UI.$('.lock-msg', c).textContent = '🔒 Locked. First complete: ' + missing.map(UI.stepLabel).join(' + '); }
      else { body.removeAttribute('inert'); body.removeAttribute('aria-hidden'); }
      if (c.dataset.step) c.classList.toggle('done', P.isDone(c.dataset.step));
    });
  };

  /* helper: typewriter-ish reveal of lines with delays */
  UI.sequence = function (container, lines, gap) {
    return lines.reduce(function (p, ln) {
      return p.then(function () { var d = UI.el('<div class="seq-line">' + ln + '</div>'); container.appendChild(d); return UI.wait(gap || 700); });
    }, Promise.resolve());
  };
  UI.fmt = HE.Engine ? HE.Engine : null;
})(typeof window !== 'undefined' ? window : globalThis);
