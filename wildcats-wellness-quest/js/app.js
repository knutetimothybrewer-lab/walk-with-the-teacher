/* App controller: boot, routing, autosave, rendering. */
(function (root) {
  'use strict';
  var W = root.WWQ, U = W.U, h = U.h, P = W.Policy, St = W.Store, A = W.Art, UI = W.UI, Views = W.Views, Sh = W.Shell;
  var App = W.App = { state: null, saveStatus: { at: null }, submitting: false, mode: 'new', notices: [], _timer: null };

  var HOOK = {
    0: 'Welcome to Wildcat High! I’m Jordan. Pounce is our guide. Let’s walk the campus together.',
    1: 'My health teacher says wellness is more than not being sick. Can you help me figure out what is what?',
    2: 'My uncle showed me his check-up numbers and I had no idea what they meant. Can you help me read some?',
    3: 'I keep starting habits and dropping them. Why does that happen, and what actually helps?',
    4: 'My feed is full of health claims. How do I tell what is real?',
    5: 'Sometimes I am stuck between two choices that both feel okay. Is there a way to think it through?',
    6: 'My week felt like a blur. Can we look at how my choices add up?',
    7: 'Big one: a new case that brings everything together. You’ve got this.'
  };

  /* ---------- access rules ---------- */
  App.ro = function () { return !!App.state && App.state.session.status === 'SUBMITTED'; };
  App.unlocked = function (m) {
    var st = App.state; if (!st) return false; if (App.ro() || W.Teacher.active) return true;
    if (m === 0) return true; if (m === 1) return !!st.progress.activities.tutorial && !!st.progress.started;
    return P.missionStatus(st, m - 1).complete;
  };
  App.canReview = function () { return App.ro() || W.Teacher.active || St.canSubmit(App.state).ok; };
  App.openMission = function (m) {
    var st = App.state;
    if (!App.unlocked(m)) { UI.toast(m === 1 ? 'Finish the welcome practice first.' : 'Submit all the work in Mission ' + (m - 1) + ' first.', 'bad'); return; }
    var mi = W.MISSION[m], stage = null;
    if (st.progress.pos.m === m) stage = mi.stages.filter(function (s) { return s.id === st.progress.pos.s; })[0];
    if (!stage) stage = mi.stages.filter(function (s) { return !Views.stageDone(s, st); })[0] || mi.stages[0];
    App.go({ m: m, s: stage.id });
  };
  App.go = function (to) {
    var st = App.state, pr = st.progress;
    if (to.view) { pr.view = to.view === 'results' && !App.ro() ? 'review' : to.view === 'review' && App.ro() ? 'results' : to.view; }
    else {
      if (!App.unlocked(to.m)) { UI.toast('That mission is locked until the earlier work is submitted.', 'bad'); return; }
      pr.view = 'stage'; pr.pos = { m: to.m, s: to.s };
      var tm = st.timing.missions[to.m] = st.timing.missions[to.m] || { first: U.nowISO(), last: '' }; tm.last = U.nowISO();
    }
    App.save(true); App.render(true);
  };

  /* ---------- saving ---------- */
  App.save = function (now) {
    if (App.ro() && !now) return;
    clearTimeout(App._timer);
    var flush = function () { if (App.ro() && App.state.final) { /* locked: the submitted marker is the source of truth; refresh only the active copy */ } var ok = St.save(App.state); App.saveStatus.at = ok ? new Date() : App.saveStatus.at; App.refreshChip(); };
    if (now) flush(); else App._timer = setTimeout(flush, 350);
  };
  App.refreshChip = function () {
    var old = document.querySelector('.hud'); if (!old) return;
    var neu = Sh.hud(App.state, App.ro()); old.parentNode.replaceChild(neu, old);
  };

  /* ---------- rendering ---------- */
  App.makeEnv = function () {
    var env = { state: App.state, readOnly: App.ro(), busy: false,
      rerender: function () { UI.keepFocus(function () { App.renderMain(false); }); },
      save: function (now) { App.save(now); },
      afterSubmit: function (s) {
        if (s.submitted) { UI.announce('Submitted ' + s.submitted + ' answer' + (s.submitted === 1 ? '' : 's') + '. Review the result below.'); }
        if (s.incomplete.length) UI.toast(s.incomplete.length + ' item' + (s.incomplete.length === 1 ? ' still needs' : 's still need') + ' every part answered. Nothing was used.', 'bad');
        App.renderMain(false); App.refreshChip();
        var r = document.querySelector('.result'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'center', behavior: UI.motionOn() ? 'smooth' : 'auto' });
      } };
    env.refresh = function () { if (env.refreshStart) env.refreshStart(); else env.rerender(); };
    return env;
  };
  App.renderMain = function (nav) {
    var st = App.state, main = document.getElementById('main'), env = App.makeEnv(), pr = st.progress, page;
    UI.applyMotion(); UI.applyText();
    var view = pr.view; if (App.ro() && view === 'review') view = pr.view = 'results'; if (!App.ro() && view === 'results') view = pr.view = 'review';
    U.clear(main);
    if (view === 'map') { page = Sh.map(st, env.readOnly); document.title = 'Campus map — Wildcats Wellness Quest'; }
    else if (view === 'review') { page = Sh.review(st, env.readOnly); document.title = 'Review and submit — Wildcats Wellness Quest'; }
    else if (view === 'results') { page = Sh.results(st); document.title = 'Your results — Wildcats Wellness Quest'; }
    else {
      var m = W.MISSION[pr.pos.m], stage = m.stages.filter(function (s) { return s.id === pr.pos.s; })[0] || m.stages[0], idx = m.stages.indexOf(stage);
      var body = Views[stage.kind] ? Views[stage.kind](m, stage, env) : Views.form(m, stage, env);
      var say = idx === 0 ? HOOK[m.id] : m.guide, who = idx === 0 ? 'Jordan' : 'Pounce';
      if (stage.kind === 'howto' || stage.kind === 'practice') { say = stage.kind === 'howto' ? 'Here’s how the quest works. Short and simple.' : 'Go ahead and try the practice question. Nothing here counts.'; who = 'Pounce'; }
      page = h('div.page', Views.banner(m, env, say, who), Views.header(m, stage, env, idx === 0 && m.id ? m.intro : null));
      if (stage.example) { var ex = Views.example(stage.example, stage, env); if (ex) page.appendChild(ex); }
      page.appendChild(body); page.appendChild(Views.nav(m, stage, env));
      var cel = idx === m.stages.length - 1 ? Views.celebrate(m, env) : null; if (cel) page.appendChild(cel);
      page.appendChild(Sh.footnote(st));
      document.title = stage.title + ' — ' + (m.id ? 'Mission ' + m.id : 'Welcome') + ' — Wildcats Wellness Quest';
    }
    main.appendChild(page); W.Teacher.bar();
    var hud = document.querySelector('.hud'), strip = document.querySelector('.strip'), bar = document.getElementById('hudslot');
    var neuHud = Sh.hud(st, App.ro()), neuStrip = Sh.strip(st, App.ro());
    if (hud) hud.parentNode.replaceChild(neuHud, hud); else bar.appendChild(neuHud);
    if (strip) strip.parentNode.replaceChild(neuStrip, strip); else bar.appendChild(neuStrip);
    if (nav !== false) { window.scrollTo(0, 0); var t = document.getElementById('stage-title'); if (t) { try { t.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } UI.announce(document.title); }
  };
  App.render = function (nav) { App.renderMain(nav !== false); };

  /* ---------- boot ---------- */
  App.boot = function () {
    var storage = W.Teacher.boot(); if (!storage) { try { storage = root.localStorage; } catch (e) { storage = null; } }
    St.useStorage(storage);
    var init = St.init(); App.state = init.state; App.mode = init.mode; App.notices = init.notices;
    var st = App.state, pr = st.progress;
    W.Teacher.prepare(st);
    if (!pr.started) { pr.pos = { m: 0, s: '0.1' }; pr.view = 'stage'; }
    if (App.ro()) pr.view = 'results';
    UI.applyMotion(); UI.applyText();
    try { var mq = root.matchMedia('(prefers-reduced-motion: reduce)'); mq.addEventListener && mq.addEventListener('change', UI.applyMotion); } catch (e) { /* ignore */ }
    if (!App.ro()) St.save(st);
    App.render(true);
    if (App.ro() && W.Sync.enabled() && W.Sync.pending()) W.Shell.startSync();
    if (init.mode === 'resumed' && pr.started) UI.toast('Welcome back. Your saved work was restored.', 'ok');
    if (init.notices.indexOf('active-inconsistent') >= 0 || init.notices.indexOf('marker-inconsistent') >= 0) {
      var mm = UI.modal({ title: 'Saved data needs attention', body: [h('div.callout.warn', A.iconEl('alert'), h('div', 'Your saved data on this device looked inconsistent, so it was not loaded. Nothing was deleted. Ask your teacher for help, or load a recovery file from Settings.'))], actions: [UI.btn('OK', { cls: 'primary', onclick: function () { mm.close(); } })] });
    }
    root.addEventListener('pagehide', function () { clearTimeout(App._timer); if (App.state && !App.ro()) St.save(App.state); });
    root.addEventListener('beforeunload', function () { clearTimeout(App._timer); if (App.state && !App.ro()) St.save(App.state); });
  };
  /* Print / Save as PDF: open every collapsed section so the report is complete, then restore. */
  var _opened = [];
  root.addEventListener && root.addEventListener('beforeprint', function () { document.querySelectorAll('[data-final]').forEach(function (e) { e.textContent = e.getAttribute('data-final'); }); _opened = []; document.querySelectorAll('details:not([open])').forEach(function (d) { d.setAttribute('open', ''); _opened.push(d); }); });
  root.addEventListener && root.addEventListener('afterprint', function () { _opened.forEach(function (d) { d.removeAttribute('open'); }); _opened = []; });
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.boot); else App.boot(); }
})(typeof window !== 'undefined' ? window : globalThis);
