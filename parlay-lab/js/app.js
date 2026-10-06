/*
 * app.js — the controller: owns app state, routing between screens, session start/restore,
 * saving to localStorage, and the page shell (header, tabs, banner).
 *
 *   A.state     = STUDENT STATE (predictions, tokens, answers, history)  — saved in localStorage
 *   A.prepared  = GAME STATE built from the class code (matchup, timeline, probabilities) — rebuilt from the seed
 */
(function (root) {
  'use strict';
  var PL = root.PL;
  var UI = PL.UI, esc = UI.esc;

  var A = PL.App = {
    view: 'join',            // join | loading | main | teacher | replay
    tab: 'game',             // game | lab | learn | report | discuss
    state: null,
    prepared: null,
    saved: null,             // an existing saved session found at startup
    link: null,              // class link parameters from the URL
    teacher: null,           // teacher dashboard settings
    replay: null,
    loadingText: '',
    loadingProgress: 0,
    ui: { marketTab: 'matchup', playerStat: 'pts', expanded: {}, revealProb: false, lastDelta: null, slipMsg: '', labTab: 'viz',
          joinError: '', joinMode: 'guided', reportTab: 'history' }
  };

  var TABS = [
    { id: 'game', label: 'Game', icon: '🏀' },
    { id: 'lab', label: 'Probability Lab', icon: '🧪' },
    { id: 'learn', label: 'Learn', icon: '💡' },
    { id: 'report', label: 'My Session', icon: '📊' },
    { id: 'discuss', label: 'Discussion', icon: '💬' }
  ];

  A.cfg = function () { return A.state ? A.state.config : (A.teacher ? A.teacher.config : PL.Classroom.DEFAULT_CONFIG); };
  A.probMode = function () { return PL.Classroom.probabilityMode(A.cfg(), A.state ? A.state.mode : A.ui.joinMode); };
  /** Is probability currently visible in the builder? */
  A.probVisible = function () {
    var m = A.probMode();
    if (m === 'visible') return true;
    if (m === 'on-request') return !!A.ui.revealProb;
    return false; // after-lock: hidden while building
  };
  A.isTeacher = function () { return !!(A.state && A.state.teacher) || A.view === 'replay'; };

  // ------------------------------------------------------------------ persistence
  var saveTimer = 0;
  A.save = function (immediate) {
    if (!A.state || A.labOnly) return;
    function doSave() { PL.Storage.saveSession({ state: A.state, tab: A.tab, savedAt: Date.now() }); }
    if (immediate) { clearTimeout(saveTimer); doSave(); return; }
    clearTimeout(saveTimer); saveTimer = setTimeout(doSave, 250);
  };
  root.addEventListener('beforeunload', function () { if (A.state && !A.labOnly) { try { PL.Storage.saveSession({ state: A.state, tab: A.tab, savedAt: Date.now() }); } catch (e) { /* ignore */ } } });
  root.addEventListener('pagehide', function () { A.save(true); });

  // ------------------------------------------------------------------ loading a game
  A.loadGame = function (opts) {
    A.view = 'loading';
    A.loadingText = opts.text || 'Building the matchup…';
    A.loadingProgress = 0;
    A.render();
    return PL.Classroom.prepareGame(opts.code, opts.gameNo, opts.config, function (f) {
      A.loadingProgress = f;
      var bar = document.getElementById('load-bar'); if (bar) bar.style.width = Math.round(f * 100) + '%';
      var lbl = document.getElementById('load-pct'); if (lbl) lbl.textContent = Math.round(f * 100) + '%';
    });
  };

  A.startSession = function (o) {
    var cfg = PL.Classroom.sanitizeConfig(o.config);
    A.state = PL.Classroom.createSession({ classCode: o.code, practice: o.practice, mode: o.mode, config: cfg, teacher: o.teacher });
    A.labOnly = false; A.tab = 'game'; A.ui.revealProb = false; A.ui.lastDelta = null; A.ui.slipMsg = ''; A.ui.marketTab = 'matchup';
    PL.UI.resetCounters();
    return A.loadGame({ code: o.code, gameNo: 1, config: cfg, text: 'Building tonight\'s matchup…' }).then(function (prep) {
      A.prepared = prep;
      A.view = 'main';
      A.save(true);
      A.render();
    });
  };

  A.restoreSession = function () {
    var sv = A.saved; if (!sv || !sv.state) return;
    A.state = sv.state; A.tab = sv.tab || 'game';
    A.state.config = PL.Classroom.sanitizeConfig(A.state.config);
    A.saved = null; PL.UI.resetCounters();
    return A.loadGame({ code: A.state.classCode, gameNo: A.state.gameNo, config: A.state.config, text: 'Restoring your session…' }).then(function (prep) {
      A.prepared = prep; A.view = 'main';
      if (A.state.phase === 'live' && A.state.playback && A.state.playback.index >= prep.game.events.length) {
        // finished while refreshing: settle now
        PL.Classroom.settleGame(A.state, prep);
      }
      A.render();
    });
  };

  A.nextGame = function () {
    PL.Classroom.startNextGame(A.state);
    A.ui.lastDelta = null; A.ui.revealProb = false; A.ui.slipMsg = ''; A.ui.marketTab = 'matchup';
    return A.loadGame({ code: A.state.classCode, gameNo: A.state.gameNo, config: A.state.config, text: 'Building the next matchup…' }).then(function (prep) {
      A.prepared = prep; A.view = 'main'; A.tab = 'game'; A.save(true); A.render();
    });
  };

  A.leaveSession = function (clear) {
    if (PL.Live) PL.Live.unmount();
    if (clear) PL.Storage.clearSession(); else A.save(true);
    A.saved = clear ? null : PL.Storage.loadSession();
    A.state = null; A.prepared = null; A.view = 'join'; A.tab = 'game'; A.replay = null; PL.UI.resetCounters();
    A.render();
  };

  // ------------------------------------------------------------------ shell rendering
  function headerHtml() {
    var s = A.state;
    var tabs = TABS.map(function (t) {
      var on = A.tab === t.id && A.view === 'main';
      return '<button type="button" class="tab' + (on ? ' on' : '') + '" role="tab" aria-selected="' + on + '" data-act="goTab" data-tab="' + t.id + '"><span aria-hidden="true">' + t.icon + '</span> ' + t.label + '</button>';
    }).join('');
    var right = '';
    if (s) {
      right = '<div class="chip"><small>CLASS CODE</small><b>' + esc(s.classCode) + '</b>' + (s.practice ? '<small class="pill">practice</small>' : '') + '</div>' +
        '<div class="chip tokens" aria-live="polite"><small>LAB TOKENS</small><b>' + UI.counter('balance', s.balance, 'tok') + '</b></div>' +
        '<button type="button" class="btn ghost sm" data-act="menu" aria-haspopup="dialog">Menu</button>';
    }
    if (A.view === 'teacher' || A.view === 'replay') {
      right = (s && !A.labOnly ? '<button type="button" class="btn ghost sm" data-act="backToSession">← Back to session</button>' : '') +
        '<button type="button" class="btn ghost sm" data-act="leaveSession">⌂ Home</button>';
    }
    return '<header class="topbar"><div class="brand" data-act="noop"><svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="#0e1830"/><path d="M8 28 L16 18 L22 24 L32 11" stroke="#22d3ee" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="11" r="3" fill="#fbbf24"/></svg>' +
      '<div class="brandtxt"><b>PARLAY LAB</b><small>Risk • Probability • Psychology</small></div></div>' +
      (s && A.view === 'main' ? '<nav class="tabs" role="tablist" aria-label="Sections">' + tabs + '</nav>' : '<div class="tabs-spacer"></div>') +
      '<div class="topright">' + right + '</div></header>' +
      '<div class="edu-banner" role="note"><b>EDUCATIONAL SIMULATION</b><span>LAB TOKENS HAVE NO REAL-WORLD VALUE</span><span class="hide-sm">No real money • No real teams • Nothing here can be bought, won or cashed out</span></div>';
  }

  function loadingHtml() {
    return '<main id="main" class="center-screen"><div class="loadcard card" role="status" aria-live="polite"><div class="spinner" aria-hidden="true"></div><h2>' + esc(A.loadingText) + '</h2>' +
      '<p class="muted">Replaying this matchup hundreds of times so the probabilities are based on the same game engine students will watch.</p>' +
      '<div class="loadbar"><span id="load-bar" style="width:' + Math.round(A.loadingProgress * 100) + '%"></span></div><div class="muted" id="load-pct">' + Math.round(A.loadingProgress * 100) + '%</div></div></main>';
  }

  A.render = function () {
    var app = document.getElementById('app');
    if (!app) return;
    if (PL.Live) PL.Live.unmount();
    var body = '';
    var V = PL.Views;
    if (A.view === 'join') body = V.join(A);
    else if (A.view === 'loading') body = loadingHtml();
    else if (A.view === 'teacher') body = V.teacher(A);
    else if (A.view === 'replay') body = V.replay(A);
    else if (A.view === 'main') {
      if (A.tab === 'game') body = V.game(A);
      else if (A.tab === 'lab') body = V.lab(A);
      else if (A.tab === 'learn') body = V.learn(A);
      else if (A.tab === 'report') body = V.report(A);
      else if (A.tab === 'discuss') body = V.discuss(A);
    }
    app.innerHTML = headerHtml() + body +
      '<footer class="foot">PARLAY LAB is a classroom teaching tool about probability and risk. Lab Tokens are pretend and cannot be bought, won, sold or cashed out. All teams and players are fictional. If gambling worries you or someone you know, talk to a trusted adult or counselor.</footer>';
    UI.runCounters(app);
    if (PL.Live && PL.Live.needsMount) PL.Live.mount(A);
    var focusEl = app.querySelector('[data-autofocus]'); if (focusEl) focusEl.focus();
  };

  /** Re-render only the slip panel + market selection (keeps scroll position and focus). */
  A.refreshBuilder = function () { if (PL.Views.refreshBuilder) PL.Views.refreshBuilder(A); };
  A.refreshBalance = function () {
    var el = document.querySelector('.chip.tokens b');
    if (el && A.state) { el.innerHTML = UI.counter('balance', A.state.balance, 'tok'); UI.runCounters(el); }
  };

  // ------------------------------------------------------------------ general actions
  PL.Actions.goTab = function (el) {
    var t = el.getAttribute('data-tab');
    if (A.view !== 'main') return;
    A.tab = t; A.save();
    A.render();
    root.scrollTo(0, 0);
  };

  PL.Actions.menu = function () {
    var s = A.state;
    var html = '<div class="menu-list">' +
      '<button class="btn block" data-act="openTeacher">🧑‍🏫 Teacher Mode</button>' +
      '<button class="btn block" data-act="copyResults">📋 Copy results summary</button>' +
      '<button class="btn block" data-act="copySession">📋 Copy session summary</button>' +
      '<button class="btn block danger" data-act="confirmLeave">⟲ Leave / start over</button></div>' +
      '<p class="muted small">Your progress is saved only in this browser tab\'s storage on this computer.</p>';
    UI.modal({ title: 'Menu', html: html, actions: [{ label: 'Close', act: 'closeModal' }] });
  };
  PL.Actions.confirmLeave = function () {
    UI.modal({ title: 'Leave this session?', html: '<p>Your Lab Tokens, predictions and history for this session will be erased from this computer. The class code still works if you join again.</p>',
      actions: [{ label: 'Keep playing', act: 'closeModal' }, { label: 'Erase and leave', act: 'doLeave', cls: 'danger' }] });
  };
  PL.Actions.doLeave = function () { UI.closeModal(true); A.leaveSession(true); };
  PL.Actions.openTeacher = function () { UI.closeModal(true); if (PL.Live) PL.Live.unmount(); A.save(true); A.view = 'teacher'; A.render(); };
  PL.Actions.backToSession = function () { A.view = 'main'; A.render(); };
  PL.Actions.leaveSession = function () { A.labOnly = false; A.leaveSession(false); };
  PL.Actions.copyResults = function () { UI.closeModal(true); UI.copy(PL.Analytics.resultsSummaryText(A.state), 'Results summary copied'); };
  PL.Actions.copySession = function () { UI.closeModal(true); UI.copy(PL.Analytics.sessionSummaryText(A.state), 'Session summary copied'); };

  // ------------------------------------------------------------------ boot
  A.boot = function () {
    A.teacher = PL.Storage.loadTeacher() || { config: PL.Classroom.sanitizeConfig({}), code: '', mode: 'guided' };
    A.teacher.config = PL.Classroom.sanitizeConfig(A.teacher.config);
    A.link = PL.Classroom.parseLink(root.location.hash);
    var sv = PL.Storage.loadSession();
    if (sv && sv.state && sv.state.version === 1 && sv.state.classCode) A.saved = sv;
    if (A.link && A.link.mode) A.ui.joinMode = A.link.mode;
    if (root.location.hash === '#selftest') {
      A.render();
      setTimeout(function () { PL.Actions.runSelfTest(); }, 50);
      return;
    }
    A.render();
  };

  document.addEventListener('DOMContentLoaded', A.boot);
})(typeof window !== 'undefined' ? window : globalThis);
