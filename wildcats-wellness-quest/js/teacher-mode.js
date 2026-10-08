/* Teacher mode: lets the teacher click through the whole assessment without answering anything.
 *
 *   - Unlocked from Teacher reset (footer) with the SAME teacher passcode. No separate code to remember.
 *   - Runs in this tab's sessionStorage, so a real student's saved record in localStorage is never read or changed.
 *   - Every mission is open, and a bar at the bottom can fill in the current step, mission or the whole assessment
 *     (best answers, full marks) so the Review and Results pages can be viewed.
 *   - Nothing is sent to a Google Sheet. Closing the tab, or "Exit teacher mode", ends it.
 */
(function (root) {
  'use strict';
  var W = root.WWQ, U = W.U, h = U.h, P = W.Policy, St = W.Store, UI = W.UI;
  var T = W.Teacher = { active: false };
  var FLAG = 'wwq:teacher-mode';

  function ss() { try { var s = root.sessionStorage; s.setItem('wwq:probe', '1'); s.removeItem('wwq:probe'); return s; } catch (e) { return null; } }
  function memStorage() { var m = {}; return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, removeItem: function (k) { delete m[k]; } }; }
  var _mem = null;

  /* Called by App.boot before storage is chosen. Returns the storage to use in teacher mode, or null for a normal session. */
  T.boot = function () {
    var s = ss(); if (!s) return null;
    if (s.getItem(FLAG) !== '1') return null;
    T.active = true; return s;
  };
  /* Called after the teacher passcode was accepted. The page reloads into teacher mode. */
  T.enter = function () {
    var s = ss() || null;
    if (!s) { UI.toast('Teacher mode needs session storage, which this browser has turned off.', 'bad'); return; }
    if (W.App.state && !W.App.ro()) W.App.save(true);
    clearTeacherKeys(s); s.setItem(FLAG, '1');
    root.location.reload();
  };
  T.exit = function () {
    var s = ss(); if (s) { clearTeacherKeys(s); s.removeItem(FLAG); }
    root.location.reload();
  };
  function clearTeacherKeys(s) { var del = []; for (var i = 0; i < s.length; i++) { var k = s.key(i); if (k && k.indexOf('wwq:') === 0) del.push(k); } del.forEach(function (k) { s.removeItem(k); }); }

  /* Prepare a brand-new teacher state so the quest opens on the campus map with the welcome work done. */
  T.prepare = function (state) {
    if (!T.active || state.progress.started) return;
    state.student.alias = 'Teacher preview'; state.student.period = 'n/a';
    state.progress.started = true; state.progress.howto = true; state.progress.activities.tutorial = true;
    state.progress.view = 'map';
  };

  /* ---------- answering for the teacher (always the best response, full marks) ---------- */
  function bestResponse(v) {
    var r = {}, order = v.parts.slice().sort(function (a, b) { return (a.dep ? 1 : 0) - (b.dep ? 1 : 0); });
    order.forEach(function (p) {
      if (p.type === 'num') { r[p.id] = p.key; return; }
      var credit = function (o) { return P.optionCredit(p, o.id, r); };
      var sorted = p.opts.slice().sort(function (a, b) { return credit(b) - credit(a); });
      r[p.id] = p.type === 'multi' ? sorted.slice(0, p.pick).map(function (o) { return o.id; }) : sorted[0].id;
    });
    return r;
  }
  function doItem(state, it) {
    var rec = St.ensureItem(state, it.id), guard = 0;
    while (!rec.finalized && guard++ < 6) {
      if (rec.attempts.length && !rec.retryReady) P.startRetry(it, rec);
      P.submit(it, rec, bestResponse(P.currentVariant(it, rec)));
    }
  }
  function doActivities(state, pred) {
    W.ACTIVITIES.forEach(function (a) { if (pred(a)) state.progress.activities[a.id] = true; });
    if (W.ACTIVITIES.some(function (a) { return a.id === 'playWeek' && pred(a); })) {
      W.DECISIONS.forEach(function (d) { if (!state.sim.picks[d.id]) state.sim.picks[d.id] = 'A'; });
      state.sim.finished = true;
    }
  }
  T.fillStage = function (state, stage) {
    W.itemsForStage(stage.id).forEach(function (it) { doItem(state, it); });
    if (stage.kind === 'overlap') doActivities(state, function (a) { return a.id === 'overlap'; });
    if (stage.kind === 'play') doActivities(state, function (a) { return a.id === 'playWeek'; });
  };
  T.fillMission = function (state, m) {
    W.ITEMS.filter(function (i) { return i.m === m; }).forEach(function (it) { doItem(state, it); });
    doActivities(state, function (a) { return a.m === m; });
  };
  T.fillAll = function (state) {
    W.ITEMS.forEach(function (it) { doItem(state, it); });
    doActivities(state, function () { return true; });
  };

  /* ---------- the bar ---------- */
  function refresh(goView) {
    var A = W.App; A.save(true);
    if (goView) A.go({ view: goView }); else A.render(false);
  }
  T.bar = function () {
    var old = document.getElementById('teacher-bar');
    if (!T.active) { if (old) old.remove(); return; }
    var A = W.App;
    var bar = old || h('div#teacher-bar.teacher-bar.noprint', { role: 'region', 'aria-label': 'Teacher mode controls' });
    U.clear(bar);
    var st = A.state, pr = st.progress, view = pr.view;
    bar.appendChild(h('b', 'Teacher mode'));
    bar.appendChild(h('span.tm-note', st.session.status === 'SUBMITTED' ? 'Nothing was saved or sent. Exit to return to the normal assessment.' : 'Every mission is open. Nothing is saved to a student record or sent.'));
    if (st.session.status !== 'SUBMITTED') {
      if (view === 'stage') {
        var m = W.MISSION[pr.pos.m], stage = m.stages.filter(function (s) { return s.id === pr.pos.s; })[0] || m.stages[0];
        bar.appendChild(UI.btn('Fill this step', { cls: 'sm', id: 'tm-step', onclick: function () { T.fillStage(A.state, stage); refresh(); } }));
        bar.appendChild(UI.btn('Fill this mission', { cls: 'sm', id: 'tm-mission', onclick: function () { T.fillMission(A.state, m.id); refresh(); } }));
      }
      bar.appendChild(UI.btn('Fill everything and review', { cls: 'sm', id: 'tm-all', onclick: function () { T.fillAll(A.state); refresh('review'); } }));
    }
    bar.appendChild(UI.btn('Exit teacher mode', { cls: 'sm', id: 'tm-exit', onclick: function () { T.exit(); } }));
    if (!old) document.body.appendChild(bar);
  };
})(typeof window !== 'undefined' ? window : globalThis);
