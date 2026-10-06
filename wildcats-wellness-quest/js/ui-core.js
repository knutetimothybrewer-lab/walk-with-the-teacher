/* UI helpers: toasts, modals, live announcements, motion/text settings, downloads, focus-preserving re-render. */
(function (root) {
  'use strict';
  var W = root.WWQ, U = W.U, h = U.h, A = W.Art;
  var UI = W.UI = { modalStack: [] };

  UI.icon = function (n, c) { return A.iconEl(n, c); };
  UI.btn = function (label, opts) {
    opts = opts || {};
    var b = h('button.btn' + (opts.cls ? '.' + opts.cls.split(' ').join('.') : ''), { type: 'button', onclick: opts.onclick, disabled: opts.disabled, 'aria-label': opts['aria-label'], title: opts.title, id: opts.id, 'data-fk': opts.fk, 'aria-describedby': opts.describedby });
    if (opts.icon) b.appendChild(A.iconEl(opts.icon));
    if (label !== null && label !== undefined && label !== '') b.appendChild(h('span', label));
    return b;
  };
  UI.chip = function (text, kind, icon) { var c = h('span.chip' + (kind ? '.' + kind : '')); if (icon) c.appendChild(A.iconEl(icon)); c.appendChild(document.createTextNode(text)); return c; };
  UI.callout = function (kind, icon, content) { return h('div.callout.' + kind, { role: kind === 'bad' || kind === 'warn' ? 'alert' : null }, A.iconEl(icon), h('div', content)); };

  /* ---------- announcements + toasts ---------- */
  UI.announce = function (msg) { var el = document.getElementById('sr-live'); if (!el) return; el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 30); };
  UI.toast = function (msg, kind, ms) {
    var box = document.getElementById('toasts'); if (!box) return;
    var t = h('div.toast' + (kind ? '.' + kind : ''), { role: 'status' }, h('span', msg));
    box.appendChild(t); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 4200);
  };

  /* ---------- modal (focus trap, Esc closes unless locked) ---------- */
  UI.modal = function (opts) {
    var root_ = document.getElementById('modal-root'), prev = document.activeElement;
    UI._mid = (UI._mid || 0) + 1; var mid = 'mtitle' + UI._mid, title = h('h2#' + mid, opts.title || '');
    var body = h('div.mbody'); [].concat(opts.body || []).forEach(function (n) { if (n) body.appendChild(typeof n === 'string' ? h('p', n) : n); });
    var actions = h('div.actions'); (opts.actions || []).forEach(function (a) { actions.appendChild(a); });
    var box = h('div.modal' + (opts.wide ? '.wide' : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': mid, tabindex: '-1' }, title, body, actions);
    var back = h('div.modal-back', { onmousedown: function (e) { if (e.target === back && !opts.locked) api.close(); } }, box);
    var api = {
      el: box, body: body, actions: actions,
      close: function () { if (back.parentNode) back.parentNode.removeChild(back); document.removeEventListener('keydown', onKey, true); UI.modalStack = UI.modalStack.filter(function (m) { return m !== api; }); if (prev && prev.focus && document.contains(prev)) { try { prev.focus(); } catch (e) { /* ignore */ } } if (opts.onClose) opts.onClose(); },
      setTitle: function (t) { title.textContent = t; }
    };
    function onKey(e) {
      if (UI.modalStack[UI.modalStack.length - 1] !== api) return;
      if (e.key === 'Escape' && !opts.locked) { e.stopPropagation(); api.close(); return; }
      if (e.key === 'Tab') {
        var f = box.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!f.length) return; var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey, true);
    root_.appendChild(back); UI.modalStack.push(api);
    setTimeout(function () { var f = box.querySelector(opts.focus || 'input, select, textarea, .btn.primary, .btn') || box; f.focus(); }, 20);
    return api;
  };
  UI.confirm = function (o) {
    var m;
    var yes = UI.btn(o.yes || 'Yes', { cls: o.danger ? 'danger' : 'primary', onclick: function () { m.close(); o.onYes && o.onYes(); } });
    var no = UI.btn(o.no || 'Cancel', { onclick: function () { m.close(); o.onNo && o.onNo(); } });
    m = UI.modal({ title: o.title, body: o.body, actions: [no, yes], focus: '.btn' }); return m;
  };

  /* ---------- settings ---------- */
  UI.motionOn = function () {
    var s = W.App && W.App.state ? W.App.state.settings.motion : W.CONFIG.motion, pref = '';
    if (!s || s === 'auto') s = W.CONFIG.motion || 'auto';
    if (s === 'auto') { try { return !root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } }
    return s === 'on';
  };
  UI.applyMotion = function () {
    var on = UI.motionOn(); document.documentElement.setAttribute('data-motion', on ? 'on' : 'off');
  };
  UI.applyText = function () { var t = W.App && W.App.state ? W.App.state.settings.textScale : 1; document.documentElement.setAttribute('data-text', String(t)); };
  document.addEventListener('visibilitychange', function () { document.documentElement.classList.toggle('paused', document.hidden); });

  /* ---------- downloads ---------- */
  UI.download = function (filename, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || 'application/json' }), url = URL.createObjectURL(blob);
      var a = h('a', { href: url, download: filename, style: { display: 'none' } }); document.body.appendChild(a); a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500); return true;
    } catch (e) { return false; }
  };
  UI.safeName = function (s) { return String(s || 'student').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 30) || 'student'; };

  /* ---------- re-render that preserves focus and scroll ---------- */
  UI.keepFocus = function (fn) {
    var ae = document.activeElement, key = ae && ae.getAttribute && ae.getAttribute('data-fk'), y = root.scrollY, sel = null;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && typeof ae.selectionStart === 'number') sel = [ae.selectionStart, ae.selectionEnd];
    fn();
    if (key) { var n = document.querySelector('[data-fk="' + key.replace(/"/g, '\\"') + '"]'); if (n) { try { n.focus({ preventScroll: true }); if (sel && n.setSelectionRange) n.setSelectionRange(sel[0], sel[1]); } catch (e) { /* ignore */ } } }
    root.scrollTo(0, y);
  };

  UI.count = function (el, to, ms, fmt) {
    el.setAttribute('data-final', fmt(to));
    if (!UI.motionOn()) { el.textContent = fmt(to); return; }
    var t0 = null; function step(t) { if (t0 === null) t0 = t; var p = Math.min(1, (t - t0) / (ms || 700)); el.textContent = fmt(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to); } requestAnimationFrame(step);
  };

  UI.shuffled = function (arr, part, variant, session) { return U.shuffle(arr, session + '|' + variant + '|' + part); };
})(typeof window !== 'undefined' ? window : globalThis);
