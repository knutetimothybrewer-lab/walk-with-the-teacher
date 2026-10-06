/*
 * ui.js — small UI helpers shared by every screen: escaping, animated counters, modals, toasts,
 * tooltips, and the event-delegation hub (data-act="…" on any element runs PL.Actions.<name>).
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};
  var UI = PL.UI = {};
  PL.Actions = PL.Actions || {};
  PL.Views = PL.Views || {};

  UI.esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  UI.reduced = function () { try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  UI.$ = function (sel, el) { return (el || document).querySelector(sel); };
  UI.$$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  // ---- number formats ----
  var FMT = {
    tok: function (v) { return PL.Prob.fmtTokens(v); },
    pct: function (v) { return PL.Prob.fmtPct(v); },
    int: function (v) { return String(Math.round(v)); },
    mult: function (v) { return '×' + v.toFixed(2); },
    signed: function (v) { return (v > 0 ? '+' : '') + Math.round(v); }
  };
  UI.fmt = FMT;

  /** <span data-count="key" data-to="…" data-fmt="tok">…</span> — animates from its previous value. */
  UI.counter = function (key, value, fmt, cls) {
    return '<span class="num ' + (cls || '') + '" data-count="' + UI.esc(key) + '" data-to="' + value + '" data-fmt="' + (fmt || 'tok') + '">' + FMT[fmt || 'tok'](value) + '</span>';
  };
  var prevVals = {};
  UI.runCounters = function (scope) {
    UI.$$('[data-count]', scope).forEach(function (el) {
      var key = el.getAttribute('data-count'), to = parseFloat(el.getAttribute('data-to')), fmt = FMT[el.getAttribute('data-fmt')] || FMT.tok;
      var from = prevVals[key];
      prevVals[key] = to;
      if (from === undefined || from === to || UI.reduced() || !isFinite(from)) { el.textContent = fmt(to); return; }
      var dir = to > from ? 'up' : 'down';
      el.classList.remove('flash-up', 'flash-down'); void el.offsetWidth; el.classList.add('flash-' + dir);
      var t0 = null, dur = 520;
      if (el._raf) cancelAnimationFrame(el._raf);
      (function step(ts) {
        if (t0 === null) t0 = ts;
        var f = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - f, 3);
        el.textContent = fmt(from + (to - from) * e);
        if (f < 1) el._raf = requestAnimationFrame(step); else el.textContent = fmt(to);
      })(performance.now());
    });
  };
  UI.resetCounters = function () { prevVals = {}; };

  // ---- tooltips that work with keyboard, touch and mouse ----
  var tipN = 0;
  UI.tip = function (text, label) {
    var id = 'tip' + (++tipN);
    return '<span class="tipwrap"><button type="button" class="tip" aria-label="' + UI.esc(label || 'What does this mean?') + '" aria-describedby="' + id + '" data-act="tipToggle">?</button>' +
      '<span class="tiptext" role="tooltip" id="' + id + '">' + text + '</span></span>';
  };
  PL.Actions.tipToggle = function (el) { el.parentNode.classList.toggle('open'); };
  document.addEventListener('click', function (e) {
    if (!e.target.closest || e.target.closest('.tipwrap')) return;
    UI.$$('.tipwrap.open').forEach(function (n) { n.classList.remove('open'); });
  });

  // ---- toast ----
  var toastTimer = 0;
  UI.toast = function (msg, kind) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.className = 'toast show ' + (kind || '');
    el.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3200);
  };

  // ---- modal dialog ----
  var modalStack = [];
  /** opts: {title, html, actions:[{label, act, cls, id, data}], wide, onClose, dismissible} */
  UI.modal = function (opts) {
    UI.closeModal(true);
    var root_ = document.getElementById('modal-root');
    var acts = (opts.actions || []).map(function (a) {
      var data = a.data ? Object.keys(a.data).map(function (k) { return ' data-' + k + '="' + UI.esc(a.data[k]) + '"'; }).join('') : '';
      return '<button type="button" class="btn ' + (a.cls || '') + '" data-act="' + a.act + '"' + data + '>' + UI.esc(a.label) + '</button>';
    }).join('');
    root_.innerHTML = '<div class="modal-backdrop" data-act="' + (opts.dismissible === false ? 'noop' : 'closeModal') + '"></div>' +
      '<div class="modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">' +
      '<div class="modal-head"><h2 id="modal-title">' + opts.title + '</h2>' + (opts.dismissible === false ? '' : '<button type="button" class="iconbtn" aria-label="Close dialog" data-act="closeModal">✕</button>') + '</div>' +
      '<div class="modal-body">' + opts.html + '</div>' + (acts ? '<div class="modal-actions">' + acts + '</div>' : '') + '</div>';
    root_.classList.add('open');
    modalStack.push({ opener: document.activeElement, onClose: opts.onClose, dismissible: opts.dismissible !== false });
    var dlg = root_.querySelector('.modal');
    var first = dlg.querySelector('.btn.primary') || dlg.querySelector('button, input, select, textarea') || dlg;
    setTimeout(function () { first.focus(); }, 30);
    UI.runCounters(dlg);
    return dlg;
  };
  UI.closeModal = function (silent) {
    var root_ = document.getElementById('modal-root');
    if (!root_ || !root_.classList.contains('open')) return;
    root_.classList.remove('open'); root_.innerHTML = '';
    var m = modalStack.pop();
    if (m && !silent) { if (m.onClose) m.onClose(); try { if (m.opener && m.opener.focus) m.opener.focus(); } catch (e) { /* ignore */ } }
  };
  PL.Actions.closeModal = function () { UI.closeModal(); };
  PL.Actions.noop = function () {};
  document.addEventListener('keydown', function (e) {
    var root_ = document.getElementById('modal-root');
    if (!root_ || !root_.classList.contains('open')) return;
    if (e.key === 'Escape') { var m = modalStack[modalStack.length - 1]; if (m && m.dismissible) UI.closeModal(); }
    if (e.key === 'Tab') { // keep focus inside the dialog
      var f = UI.$$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', root_.querySelector('.modal')).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });

  // ---- event delegation hub ----
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el || el.disabled) return;
    var fn = PL.Actions[el.getAttribute('data-act')];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('input', function (e) {
    var el = e.target.closest ? e.target.closest('[data-in]') : null;
    if (!el) return;
    var fn = PL.Actions[el.getAttribute('data-in')];
    if (fn) fn(el, e);
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest ? e.target.closest('[data-change]') : null;
    if (!el) return;
    var fn = PL.Actions[el.getAttribute('data-change')];
    if (fn) fn(el, e);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var el = e.target.closest ? e.target.closest('[data-enter]') : null;
    if (el) { var fn = PL.Actions[el.getAttribute('data-enter')]; if (fn) { e.preventDefault(); fn(el, e); } }
  });

  /** Copy text; falls back to a selectable prompt if the clipboard API is blocked. */
  UI.copy = function (text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) UI.toast(okMsg || 'Copied!', 'ok');
      else UI.modal({ title: 'Copy this text', html: '<textarea class="copybox" readonly rows="10">' + UI.esc(text) + '</textarea><p class="muted">Select all (Ctrl+A) and copy (Ctrl+C).</p>', actions: [{ label: 'Close', act: 'closeModal', cls: 'primary' }] });
    }
    if (root.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { UI.toast(okMsg || 'Copied!', 'ok'); }, fallback);
    } else fallback();
  };

  /** Probability meter bar. */
  UI.meter = function (p, cls) {
    return '<div class="meter ' + (cls || '') + '" role="img" aria-label="Probability ' + PL.Prob.fmtPct(p) + '"><span style="width:' + Math.max(0.5, Math.min(100, p * 100)).toFixed(1) + '%"></span></div>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
