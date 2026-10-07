'use strict';
// Application shell: login, tutorial, map hub, module scenes, question cards.
(function () {
  var root = function () { return document.getElementById('app'); };
  var drafts = CHM.drafts = CHM.drafts || {};
  var savingTimer = null, saveStatus = 'saved', answerCache = null, viewMode = 'student', lastSaveAt = null;

  // ------------------------------------------------------------------------------------ API helpers
  CHM.api = function (action, payload, opts) {
    var s = CHM.session || {};
    var p = Object.assign({ sessionId: s.sessionId, token: s.token }, payload || {});
    if (s.preview && CHM.teacherToken) p.teacherToken = CHM.teacherToken;
    return CHM.transport.call(action, p, opts);
  };
  function setStatus(st, msg) {
    saveStatus = st; var el = document.getElementById('savestat');
    if (el) { el.className = 'savestat ' + st; el.textContent = msg || ({ saved: '✓ Progress saved', saving: '… Saving', offline: '⚠ Offline: not saved yet' })[st]; }
  }
  function checkpointNow(position) {
    var s = CHM.session; if (!s) return Promise.resolve();
    var act = {}; Object.keys(CHM.dirty || {}).forEach(function (k) { act[k] = CHM.dirty[k]; }); CHM.dirty = {};
    setStatus('saving');
    return CHM.api('checkpoint', { requestId: CHM.uid(), position: position || CHM.position || { module: 0, unit: 0 }, activity: act }, { retries: 2 }).then(function (r) { setStatus(r.ok ? 'saved' : 'offline'); lastSaveAt = new Date(); }, function () { setStatus('offline'); Object.assign(CHM.dirty = CHM.dirty || {}, act); });
  }
  var checkpointSoon = CHM.debounce(function () { checkpointNow(); }, 3500);
  CHM.markDirty = function (key, val) { CHM.dirty = CHM.dirty || {}; CHM.dirty[key] = val; CHM.state.activity[key] = val; CHM.ls.set('act.' + CHM.session.sessionId + '.' + key, val); checkpointSoon(); };

  // ------------------------------------------------------------------------------------ shell
  function mount(view, title, opts) {
    opts = opts || {};
    var r = CHM.clear(root());
    r.appendChild(topbar(opts));
    if (CHM.session && CHM.session.preview) r.appendChild(CHM.previewBar());
    if (CHM.config.transport === 'demo') r.appendChild(h('div.demobar', { role: 'note' }, 'DEMO MODE: sample questions only. Nothing here is graded or delivered to a teacher.'));
    var main = h('main#main', { tabindex: -1 }, view);
    r.appendChild(main);
    document.title = (title ? title + ' · ' : '') + 'Community Health Mission';
    main.focus({ preventScroll: true }); window.scrollTo(0, 0);
    CHM.announce(title || '');
  }
  CHM.mountShell = mount;
  function topbar(opts) {
    var s = CHM.session, motion = CHM.motionOn();
    var left = h('div.tb-l', h('button.brand', { type: 'button', onclick: function () { if (s) CHM.go('map'); }, 'aria-label': 'Community Health Mission, go to map' }, h('span.logo', { 'aria-hidden': 'true' }, '✚'), h('span', 'Community Health Mission')));
    var right = h('div.tb-r');
    if (s) { right.appendChild(h('span.who', s.student.name + (s.preview ? '' : ''))); right.appendChild(h('span#savestat.savestat ' + saveStatus, { role: 'status' }, saveStatus === 'saved' ? '✓ Progress saved' : saveStatus === 'offline' ? '⚠ Offline: not saved yet' : '… Saving')); }
    right.appendChild(h('button.btn.sm.ghost', { type: 'button', 'aria-pressed': String(!motion), onclick: function () { CHM.setMotion(!CHM.motionOn()); CHM.rerender(); } }, motion ? 'Motion: on' : 'Motion: off'));
    if (s && !opts.noNav) right.appendChild(h('button.btn.sm.ghost', { type: 'button', onclick: function () { CHM.go('map'); } }, '🗺 Map'));
    return h('header.topbar', left, right);
  }
  CHM.rerender = function () { if (CHM.view) CHM.go(CHM.view.name, CHM.view.arg); };
  CHM.go = function (name, arg) {
    CHM.view = { name: name, arg: arg };
    ({ login: renderLogin, tutorial: renderTutorial, map: renderMap, module: renderModule, review: CHM.renderReview, results: CHM.renderResults, teacher: CHM.renderTeacher })[name](arg);
  };

  // ------------------------------------------------------------------------------------ login
  function renderLogin(msg) {
    var f = { classCode: '', rosterId: '', name: '', period: '', studentToken: '' }, err = h('p.error', { role: 'alert' }, msg || '');
    var tokenRow = h('label.fl', 'Access token (only if your teacher gave you one)', h('input', { name: 'tok', autocomplete: 'off', oninput: function (e) { f.studentToken = e.target.value; } }));
    var go = h('button.btn.primary', { type: 'submit' }, 'Start the mission');
    var form = h('form.card.loginform', { onsubmit: function (e) {
      e.preventDefault(); go.disabled = true; err.textContent = '';
      CHM.transport.call('join', f, { retries: 3 }).then(function (r) {
        go.disabled = false;
        if (!r.ok) { err.textContent = r.message; return; }
        CHM.afterJoin(r);
      }, function () { go.disabled = false; err.textContent = 'We could not reach the server. Check your connection and try again.'; });
    } },
      h('h2', 'Join your class'),
      h('label.fl', 'Class code', h('input', { name: 'code', required: true, autocomplete: 'off', autocapitalize: 'characters', oninput: function (e) { f.classCode = e.target.value; } })),
      h('label.fl', 'Roster ID (from your teacher)', h('input', { name: 'roster', required: true, autocomplete: 'off', oninput: function (e) { f.rosterId = e.target.value; } })),
      h('label.fl', 'Display name', h('input', { name: 'name', required: true, autocomplete: 'off', oninput: function (e) { f.name = e.target.value; } })),
      h('label.fl', 'Class period', h('input', { name: 'period', autocomplete: 'off', oninput: function (e) { f.period = e.target.value; } })), tokenRow, err, go,
      h('p.small', 'Privacy: use only the roster ID and name your teacher asked for. Do not type health information about yourself or anyone else. Every scenario in this assessment is fictional.'));
    var intro = h('section.hero', h('div.hero-art', CHM.guideSvg(84)), h('h1', 'Community Health Mission'),
      h('p.lead', 'Join the youth advisory team. Investigate a fictional county, make evidence-based decisions, and present a plan to the community.'),
      h('ul.facts', h('li', 'About 45–60 minutes. This is a guide, not a timer.'), h('li', 'Every graded question gives you 3 submitted attempts.'), h('li', 'Exploring is free; only pressing Submit uses an attempt.')),
      h('p.small', h('button.linkbtn', { type: 'button', onclick: function () { CHM.go('teacher'); } }, 'Teacher sign-in')));
    mount(h('div.login', intro, form), 'Sign in', { noNav: true });
  }

  CHM.afterJoin = function (r) {
    CHM.session = { sessionId: r.sessionId, token: r.token, student: r.student, cls: r.cls, version: r.version, preview: !!r.preview };
    CHM.state = r.state; CHM.state.activity = CHM.state.activity || {};
    if (CHM.session.preview) CHM.previewInit(r); else CHM.ls.set('session', { sessionId: r.sessionId, token: r.token, student: r.student, cls: r.cls, version: r.version });
    if (r.version !== CHM.content.version) { CHM.session = null; return renderLogin('This page has a different assessment version than your class. Ask your teacher.'); }
    // restore drafts cached locally if newer than server
    Object.keys(CHM.state.activity).forEach(function (k) { if (/^d\d$/.test(k)) Object.assign(drafts, CHM.state.activity[k]); });
    resendOutbox().then(function () {
      var done = CHM.state.activity.t || CHM.session.preview;
      if (CHM.state.status === 'finalized') CHM.go('results'); else CHM.go(done ? 'map' : 'tutorial');
    });
  };
  function resendOutbox() {
    var pend = CHM.outbox.get();
    if (!pend) return Promise.resolve();
    return CHM.transport.call(pend.action, pend.payload, { retries: 2 }).then(function (res) {
      CHM.outbox.clear();
      if (res && res.state) CHM.state = res.state;
    }, function () { /* keep it for the next try; same requestId */ });
  }

  // ------------------------------------------------------------------------------------ tutorial
  function renderTutorial() {
    var T = CHM.content.tutorial, picked = null, fb = h('p.fb', { 'aria-live': 'polite' });
    var prac = h('fieldset.fld', h('legend', T.practice.prompt), T.practice.options.map(function (o) {
      return h('label.opt', h('input', { type: 'radio', name: 'prac', value: o.id, onchange: function () { picked = o.id; fb.textContent = picked === T.practice.correct ? '✓ ' + T.practice.feedback : 'Not quite. Try again; practice questions never use real attempts.'; fb.className = 'fb ' + (picked === T.practice.correct ? 'ok' : 'warn'); } }), h('span.opt-t', o.t));
    }), fb);
    var view = h('section.card.tut', h('h2', 'Entry briefing (ungraded, about ' + T.minutes + ' minutes)'), h('ol.tsteps', T.steps.map(function (s) { return h('li', s); })),
      h('div.cards3', h('div.keycard', h('strong', 'Keyboard'), h('p', 'Tab moves between controls. Arrow keys change tabs and options. Space/Enter selects.')), h('div.keycard', h('strong', 'Credit'), h('p', 'Attempt 1 = 100% · Attempt 2 = 85% · Attempt 3 = 75% · Never correct = 0%.')), h('div.keycard', h('strong', 'Nothing is a trap'), h('p', 'After three attempts a question locks, and you move on. You can always finish.'))),
      prac, h('div.row', h('button.btn.primary', { type: 'button', onclick: function () { CHM.markDirty('t', 1); checkpointNow(); CHM.go('map'); } }, 'Begin the mission'), h('span.small', 'You can reopen this briefing from the map.')));
    mount(view, 'Entry briefing');
  }

  // ------------------------------------------------------------------------------------ progress helpers
  CHM.modProgress = function (m) {
    var done = 0, correct = 0; m.units.forEach(function (u) { var s = CHM.state.units[u.id]; if (s.status !== 'open') done++; if (s.status === 'correct') correct++; });
    return { done: done, total: m.units.length, correct: correct };
  };
  CHM.allDone = function () { return CHM.content.modules.every(function (m) { var p = CHM.modProgress(m); return p.done === p.total; }); };
  function pacingText(m) { var f = (CHM.session.cls && CHM.session.cls.pacing) || 1; return '≈ ' + Math.round(m.minutes * f) + ' min'; }

  // ------------------------------------------------------------------------------------ map hub
  function renderMap() {
    var mods = CHM.content.modules, prog = {}; mods.forEach(function (m) { prog[m.id] = CHM.modProgress(m); });
    var last = (CHM.state.position && CHM.state.position.module) || firstOpen() || 1;
    var cm = CHM.countyMap({ progress: prog, current: last, onGo: function (id) { travel(id); } });
    var total = CHM.content.totalPoints, doneCount = mods.reduce(function (a, m) { return a + prog[m.id].done; }, 0), nUnits = mods.reduce(function (a, m) { return a + m.units.length; }, 0);
    var list = h('ol.missions', mods.map(function (m) {
      var p = prog[m.id], st = p.done === p.total ? 'Complete' : p.done ? 'In progress' : 'Not started';
      return h('li', h('button.mission', { type: 'button', style: { '--c': m.colors.a }, onclick: function () { travel(m.id); } },
        h('span.mnum', m.id), h('span.mt', h('strong', m.title), h('span.small', m.points + ' pts · ' + pacingText(m) + ' · ' + p.done + '/' + p.total + ' finished')), h('span.mstat ' + (p.done === p.total ? 'ok' : ''), (p.done === p.total ? '✓ ' : '') + st)));
    }));
    var fin = h('button.btn.primary', { type: 'button', onclick: function () { CHM.go('review'); } }, CHM.allDone() ? 'Final review and submit' : 'Final review (' + (nUnits - doneCount) + ' questions left)');
    var view = h('div.hub',
      h('div.hub-map', h('h1.sr-h', 'County map'), cm.svg, h('p.small', 'Click a glowing place, or use the mission list. You may visit places in any order; the numbers suggest a route.')),
      h('aside.hub-side', h('h2', 'Your mission'), h('p', 'Investigate the county, then present an evidence-based plan. ' + doneCount + ' of ' + nUnits + ' questions finished.'), list,
        h('p.small', 'Suggested pacing is a guide only (about 45–60 minutes in all). There is no countdown and nothing locks because of time.'),
        fin, h('p.small', h('button.linkbtn', { type: 'button', onclick: function () { CHM.go('tutorial'); } }, 'Reopen the briefing'))));
    mount(view, 'County map');
    CHM.hubMap = cm;
  }
  function firstOpen() { var m = CHM.content.modules.filter(function (x) { var p = CHM.modProgress(x); return p.done < p.total; })[0]; return m && m.id; }
  var traveling = false;
  function travel(id) {
    if (traveling) return;
    var go = function () { traveling = false; CHM.go('module', { id: id }); };
    if (CHM.view.name !== 'map' || !CHM.hubMap || !CHM.motionOn()) return go();
    traveling = true; CHM.hubMap.moveGuide(id);
    var skip = function () { document.removeEventListener('keydown', skip); document.removeEventListener('pointerdown', skip); go(); };
    setTimeout(function () { document.addEventListener('keydown', skip, { once: true }); document.addEventListener('pointerdown', skip, { once: true }); }, 50);
    setTimeout(function () { if (traveling) skip(); }, 850);
    CHM.announce('Traveling to ' + CHM.content.modules[id - 1].place + '. Press any key to skip.');
  }

  // ------------------------------------------------------------------------------------ module scene
  function renderModule(arg) {
    var m = CHM.content.modules[arg.id - 1], p = CHM.modProgress(m);
    var ui = arg.unit != null ? arg.unit : Math.max(0, m.units.findIndex(function (u) { return CHM.state.units[u.id].status === 'open'; }));
    ui = Math.min(ui, m.units.length - 1);
    CHM.position = { module: m.id, unit: ui };
    document.documentElement.style.setProperty('--mod-a', m.colors.a); document.documentElement.style.setProperty('--mod-b', m.colors.b);
    var u = m.units[ui];
    var save = function (obj) { var k = 'x' + m.id; CHM.markDirty(k, Object.assign({}, CHM.state.activity[k] || {}, obj)); };
    var ex = CHM.explorers[m.explorer.kind](m.explorer.data, { moduleId: m.id, saved: CHM.state.activity['x' + m.id], save: save, currentUnit: u.id });
    var stepper = h('nav.stepper', { 'aria-label': 'Questions in this location' }, m.units.map(function (x, i) {
      var s = CHM.state.units[x.id], cls = s.status === 'correct' ? 'ok' : s.status === 'exhausted' ? 'bad' : s.attempts ? 'prog' : '';
      var label = 'Question ' + (i + 1) + ': ' + (s.status === 'correct' ? 'completed, correct' : s.status === 'exhausted' ? 'completed, not correct' : s.attempts ? 'in progress, attempt ' + (s.attempts + 1) + ' of 3' : 'not started');
      return h('button.step ' + cls + (i === ui ? ' cur' : ''), { type: 'button', 'aria-label': label, 'aria-current': i === ui ? 'step' : null, onclick: function () { CHM.go('module', { id: m.id, unit: i }); } }, h('span', { 'aria-hidden': 'true' }, s.status === 'correct' ? '✓' : s.status === 'exhausted' ? '✕' : String(i + 1)), h('span.sl', s.status === 'correct' ? 'Correct' : s.status === 'exhausted' ? 'Done, not correct' : s.attempts ? 'Attempt ' + (s.attempts + 1) : 'Open'));
    }));
    var head = h('section.mhead', { style: { '--mod-a': m.colors.a, '--mod-b': m.colors.b } }, h('div.mh-guide', CHM.guideSvg(54)), h('div.mh-t', h('h1', m.id + '. ' + m.title), h('div.small', m.place + ' · ' + m.points + ' points · ' + pacingText(m) + ' (guide only) · ' + p.done + '/' + p.total + ' finished'), h('p.mission', m.mission)));
    var view = h('div.module', head, h('div.mgrid', h('section.explore', { 'aria-label': 'Investigation tools' }, h('h2.sec', 'Investigate'), ex), h('section.qcol', { 'aria-label': 'Question' }, stepper, CHM.unitCard(u, m, ui))));
    mount(view, m.title);
    CHM.emit('unit', u.id);
    checkpointSoon();
  }

  // ------------------------------------------------------------------------------------ question card
  function requirement(u) {
    var t = u.fields.map(function (f) { return ({ single: 'choose an answer', multi: 'select every correct option', match: 'assign every row', order: 'order every item', num: 'enter a number', mapselect: 'select your evidence', budget: 'choose exactly two within budget', simplan: 'choose an option for every part of the plan' })[f.type]; });
    return 'To submit: ' + t.filter(function (x, i) { return t.indexOf(x) === i; }).join('; ') + '. Incomplete answers are not accepted and do not use an attempt.';
  }
  CHM.unitCard = function (u, m, ui) {
    var st = CHM.state.units[u.id], open = st.status === 'open', fields = [], card = h('article.qcard', { 'aria-labelledby': 'q-' + u.id });
    var fb = h('div.feedback', { 'aria-live': 'polite' }), err = h('p.error', { role: 'alert' });
    var saved = (drafts[u.id]) || st.last || {};
    var fsWrap = h('fieldset.qfields', { disabled: !open });
    u.fields.forEach(function (f) {
      var ctl = CHM.fields.render(f, { initial: saved[f.id], onChange: function () {
        err.textContent = '';
        var v = {}; fields.forEach(function (x) { v[x.id] = x.ctl.get(); }); drafts[u.id] = v; CHM.drafts = drafts;
        CHM.markDirty('d' + m.id, Object.assign({}, CHM.state.activity['d' + m.id] || {}, (function () { var o = {}; o[u.id] = v; return o; })()));
        CHM.emit('draft', { unit: u.id, values: v });
      } });
      fields.push({ id: f.id, ctl: ctl }); fsWrap.appendChild(ctl.el);
    });
    var maxLine = open ? 'Attempt ' + st.next.attempt + ' of 3 · maximum credit if correct: ' + Math.round(st.next.maxCredit / u.points * 100) + '% (' + CHM.pts(st.next.maxCredit) + ' of ' + u.points + ' pts)' : null;
    var chip = statusChip(st, u);
    var submit = h('button.btn.primary', { type: 'button', disabled: !open, onclick: function () { doSubmit(); } }, open ? 'Submit attempt ' + st.next.attempt + ' of 3' : 'Finished');
    var pendingBox = h('div.pending', { role: 'status', hidden: true });
    var pend = null;
    function collect() { var r = {}; fields.forEach(function (x) { r[x.id] = x.ctl.get(); }); return r; }
    function doSubmit() {
      err.textContent = '';
      var response = collect(), bad = CHM_grading.validateUnit(CHM.content, u, response);
      if (bad) { err.textContent = bad; CHM.announce(bad); return; }
      if (!pend) pend = { requestId: CHM.uid(), response: response, attempt: st.next.attempt };
      else pend.response = response === undefined ? pend.response : pend.response; // same request id while unresolved
      var payload = { requestId: pend.requestId, unitId: u.id, response: pend.response, expectedAttempt: pend.attempt };
      submit.disabled = true; submit.textContent = 'Submitting…'; setStatus('saving');
      CHM.outbox.put({ action: 'submitUnit', payload: Object.assign({ sessionId: CHM.session.sessionId, token: CHM.session.token }, payload) });
      CHM.api('submitUnit', payload, { retries: 4, onRetry: function () { submit.textContent = 'Reconnecting…'; } }).then(function (res) {
        CHM.outbox.clear(); pend = null;
        if (!res.ok) {
          submit.disabled = false; submit.textContent = 'Submit attempt ' + st.next.attempt + ' of 3';
          if (res.state) { CHM.state = Object.assign(res.state, { activity: CHM.state.activity }); err.textContent = res.message; return CHM.go('module', { id: m.id, unit: ui }); }
          err.textContent = res.message; setStatus('saved'); return;
        }
        CHM.state = Object.assign(res.state, { activity: CHM.state.activity }); setStatus('saved');
        CHM.announce(res.correct ? 'Correct.' : res.locked ? 'Question finished, not correct.' : 'Not correct yet. ' + (res.hint || ''));
        CHM.go('module', { id: m.id, unit: ui });
        var host = document.querySelector('.feedback'); if (host) { CHM.resultBox(host, res, u); host.scrollIntoView({ block: 'nearest' }); }
      }, function () {
        submit.disabled = false; submit.textContent = 'Try sending again';
        pendingBox.hidden = false; CHM.clear(pendingBox).appendChild(h('div.fbox.warn', h('strong', 'We could not reach the server.'), ' Your answer is kept on this device and has NOT been used as an attempt. Check your connection, then press “Try sending again”. The same request is re-sent, so you will not lose or double-use an attempt.'));
        setStatus('offline');
      });
    }
    var nav = h('div.qnav', ui > 0 ? h('button.btn.ghost', { type: 'button', onclick: function () { CHM.go('module', { id: m.id, unit: ui - 1 }); } }, '← Previous') : h('span'),
      ui < m.units.length - 1 ? h('button.btn.ghost', { type: 'button', onclick: function () { CHM.go('module', { id: m.id, unit: ui + 1 }); } }, 'Next →') : h('button.btn', { type: 'button', onclick: function () { CHM.go(m.id < CHM.content.modules.length ? 'map' : 'review'); } }, m.id < CHM.content.modules.length ? 'Back to map' : 'To final review'));
    // initial persisted feedback
    if (!open) {
      if (st.status === 'correct') fb.appendChild(h('div.fbox.ok', h('strong', '✓ Completed and correct'), ' on attempt ' + st.correctOn + '. Credit: ' + CHM.pts(st.earned) + ' of ' + u.points + ' points.'));
      else fb.appendChild(h('div.fbox.bad', h('strong', 'Completed, not correct.'), ' Credit: 0 of ' + u.points + ' points. Explanations are shown in the final review.'));
    } else if (st.hint) fb.appendChild(h('div.fbox.warn', h('strong', 'Hint: '), st.hint));
    card.appendChild(h('header.qh', h('div', h('span.small', 'Question ' + (ui + 1) + ' of ' + m.units.length + ' · ' + u.points + ' points' + (u.needsGraph ? ' · uses a graph or table' : '')), h('h2', { id: 'q-' + u.id }, u.title)), chip));
    card.appendChild(h('p.prompt', u.prompt)); card.appendChild(fsWrap);
    if (open) { card.appendChild(h('p.attline', { 'aria-live': 'polite' }, maxLine)); card.appendChild(h('p.small', requirement(u))); }
    card.appendChild(err); card.appendChild(pendingBox); card.appendChild(h('div.row', submit)); card.appendChild(fb); card.appendChild(nav);
    if (CHM.session.preview) card.appendChild(CHM.answerPanel(u));
    return card;
  };
  CHM.resultBox = function (host, res, u) {
    CHM.clear(host);
    if (res.correct) host.appendChild(h('div.fbox.ok', h('strong', '✓ Correct on attempt ' + res.attempt + '.'), ' Credit: ' + CHM.pts(res.earned) + ' of ' + u.points + ' points (' + Math.round(res.earned / u.points * 100) + '%).'));
    else if (res.locked) host.appendChild(h('div.fbox.bad', h('strong', 'This question is now finished.'), ' It was not answered correctly in 3 attempts, so it earns 0 of ' + u.points + ' points. The explanation is in your final review. Move on to the next question.'));
    else host.appendChild(h('div.fbox.warn', h('strong', 'Not correct yet. '), res.hint, h('div.small', 'Attempt ' + res.next.attempt + ' of 3 is available. Maximum credit is now ' + Math.round(res.next.maxCredit / u.points * 100) + '%.')));
  };
  function statusChip(st, u) {
    var done = st.status !== 'open';
    return h('div.chips', h('span.chip ' + (done ? 'done' : ''), done ? '✓ Completed' : st.attempts ? '◐ In progress' : '○ Not started'),
      done ? h('span.chip ' + (st.status === 'correct' ? 'ok' : 'bad'), st.status === 'correct' ? '✓ Correct' : '✕ Not correct') : null);
  }

  // ------------------------------------------------------------------------------------ boot
  CHM.boot = function () {
    var m = CHM.ls.get('motion'); document.documentElement.setAttribute('data-motion', m === 'off' ? 'off' : m === 'on' ? 'on' : 'auto');
    var cached = CHM.ls.get('session');
    if (cached && CHM.config.transport !== 'demo') {
      CHM.session = cached;
      CHM.api('getState', {}, { retries: 2 }).then(function (r) {
        if (r.ok && cached.version === CHM.content.version) { CHM.state = r.state; CHM.state.activity = r.state.activity || {}; CHM.afterJoin({ sessionId: cached.sessionId, token: cached.token, student: cached.student, cls: cached.cls, version: cached.version, state: r.state }); }
        else { CHM.session = null; CHM.ls.del('session'); renderLogin(r.message && r.code === 'RESET' ? r.message : ''); }
      }, function () { CHM.session = null; renderLogin('Could not reach the server to resume. You can sign in again with the same class code and roster ID.'); });
    } else renderLogin();
  };
  CHM.signOut = function () { CHM.ls.del('session'); CHM.session = null; CHM.teacherToken = null; renderLogin(); };
})();
