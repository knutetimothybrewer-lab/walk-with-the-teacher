'use strict';
// Teacher panel + private preview. Everything here requires a server-issued teacher token; hiding UI is NOT the control.
(function () {
  var answerView = null, viewMode = 'student', tab = 'preview';
  try { CHM.teacherToken = sessionStorage.getItem('chm.tt') || null; } catch (e) { CHM.teacherToken = null; }

  function tapi(action, payload, opts) { return CHM.transport.call(action, Object.assign({ teacherToken: CHM.teacherToken }, payload || {}), opts); }
  function loginErr(res) { if (res && res.code === 'FORBIDDEN') { CHM.teacherToken = null; try { sessionStorage.removeItem('chm.tt'); } catch (e) { /* ignore */ } } }

  CHM.renderTeacher = function () {
    if (!CHM.teacherToken) return login();
    var content = h('div.tcontent');
    var tabs = [['preview', 'Preview'], ['answers', 'Answers and scoring'], ['coverage', 'Coverage checklist'], ['results', 'Classes and results'], ['delivery', 'Delivery test']];
    var bar = h('div.tablist', { role: 'tablist' }, tabs.map(function (t) { return h('button.tab', { type: 'button', role: 'tab', 'aria-selected': String(tab === t[0]), onclick: function () { tab = t[0]; CHM.go('teacher'); } }, t[1]); }));
    var views = { preview: tPreview, answers: tAnswers, coverage: tCoverage, results: tResults, delivery: tDelivery };
    CHM.mountShell(h('div.teacher', h('h1', 'Teacher panel'), h('div.row', h('span.chip2.warn', 'Teacher mode · not a student session'), h('button.btn.sm.ghost', { type: 'button', onclick: function () { CHM.teacherToken = null; try { sessionStorage.removeItem('chm.tt'); } catch (e) { /* */ } CHM.session = null; CHM.go('login'); } }, 'Sign out of teacher mode')), bar, content), 'Teacher panel', { noNav: !CHM.session });
    views[tab](content);
  };

  function login() {
    var err = h('p.error', { role: 'alert' }), pass = h('input', { type: 'password', required: true, autocomplete: 'current-password', 'aria-label': 'Teacher passcode' });
    var form = h('form.card.loginform', { onsubmit: function (e) {
      e.preventDefault(); err.textContent = '';
      CHM.transport.call('teacherLogin', { passcode: pass.value, useAccount: false }, { retries: 2 }).then(function (r) {
        if (!r.ok) { err.textContent = r.message; return; }
        CHM.teacherToken = r.teacherToken; try { sessionStorage.setItem('chm.tt', r.teacherToken); } catch (x) { /* */ } CHM.go('teacher');
      }, function () { err.textContent = 'Could not reach the server.'; });
    } }, h('h2', 'Teacher sign-in'), h('p.small', 'Enter the teacher passcode you set up in the spreadsheet menu. The server checks it. Students cannot open the answer key or preview with a class code.'), h('label.fl', 'Passcode', pass), err, h('button.btn.primary', { type: 'submit' }, 'Sign in'), h('button.linkbtn', { type: 'button', onclick: function () { CHM.go('login'); } }, '← Back to student sign-in'));
    CHM.mountShell(h('div.login', form), 'Teacher sign-in', { noNav: true });
  }

  function tPreview(host) {
    var revealSel = h('select', { 'aria-label': 'Explanation timing' }, h('option', { value: 'final' }, 'Explanations at final review (default)'), h('option', { value: 'onLock' }, 'Explanations when each question locks'));
    host.appendChild(h('section.card', h('h2', 'Open the private preview'),
      h('ol', h('li', 'Press “Start preview”. A separate preview session is created. It never touches student sessions, attempts or the gradebook.'), h('li', 'Use the bar at the top of the preview to jump to any location, switch between Student View and Answer and Scoring View, replay simulations, and reset responses freely.'),
        h('li', 'Use the outcome buttons to test: all first-attempt correct, all second-attempt, all third-attempt, or every question exhausted. Then open the final results screen.'), h('li', 'Press “Teacher panel” in the bar to return here, or “Sign out of teacher mode”.')),
      h('label.fl', 'Explanation timing for this preview', revealSel),
      h('div.row', h('button.btn.primary', { type: 'button', onclick: function () { tapi('previewStart', { revealMode: revealSel.value }).then(function (r) { if (!r.ok) { loginErr(r); return CHM.go('teacher'); } viewMode = 'student'; CHM.session = null; CHM.afterJoin(r); }); } }, 'Start preview'),
        h('button.btn.ghost', { type: 'button', onclick: function () { CHM.signOutPreview(); } }, 'Return to normal student sign-in'))));
  }

  // Settings > Teacher reset. The SERVER checks the passcode (teacherLogin) and records the reset (teacherReset); then the device is wiped
  // and the student is returned to the sign-in screen.
  CHM.openSettings = function () {
    var s = CHM.session; if (!s || s.preview) return;
    var old = document.getElementById('settings-dlg'); if (old) old.remove();
    var pass = h('input', { type: 'password', id: 'reset-code', autocomplete: 'off', 'aria-label': 'Teacher reset code', placeholder: 'Teacher code' });
    var msg = h('p.small', { id: 'reset-msg', role: 'status' }, 'Teacher only: enter the teacher code to wipe the current attempt and return to the sign-in screen.');
    var go = h('button.btn.sm', { type: 'button', id: 'reset-go' }, 'Reset this attempt');
    var dlg = h('div.card', { id: 'settings-dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Settings', style: { position: 'fixed', top: '70px', right: '12px', zIndex: '50', maxWidth: '340px', boxShadow: '0 8px 30px rgba(0,0,0,.25)' } },
      h('h2', 'Settings'), h('label.fl', 'Teacher reset', pass), msg,
      h('div.row', go, h('button.btn.sm.ghost', { type: 'button', onclick: function () { dlg.remove(); } }, 'Close')));
    function run() {
      if (!pass.value.trim()) { msg.textContent = 'Enter the teacher code.'; return; }
      go.disabled = true; msg.textContent = 'Checking…';
      CHM.transport.call('teacherLogin', { passcode: pass.value.trim(), useAccount: false }, { retries: 2 }).then(function (t) {
        if (!t.ok) { go.disabled = false; msg.textContent = t.message || 'That teacher code is not correct.'; return null; }
        return CHM.transport.call('teacherReset', { teacherToken: t.teacherToken, sessionId: s.sessionId, reason: 'Reset from the student Settings page with the teacher code' }, { retries: 2 }).then(function (r) {
          if (!r.ok) { go.disabled = false; msg.textContent = r.message || 'Could not reset.'; return; }
          CHM.outbox.clear(); CHM.drafts = {}; CHM.shared = {}; CHM.state = null; dlg.remove(); CHM.signOut();
        });
      }, function () { go.disabled = false; msg.textContent = 'We could not reach the server. Check your connection and try again.'; });
    }
    go.onclick = run; pass.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } };
    document.body.appendChild(dlg); pass.focus();
  };
  CHM.signOutPreview = function () { CHM.session = null; CHM.state = null; CHM.go('login'); };
  CHM.previewInit = function () { viewMode = 'student'; CHM.viewMode = 'student'; };

  CHM.previewBar = function () {
    var mods = CHM.content.modules, jump = h('select', { 'aria-label': 'Jump to a question', onchange: function (e) { var v = e.target.value; if (!v) return; var p = v.split('.'); CHM.go('module', { id: Number(p[0]), unit: Number(p[1]) }); } },
      [h('option', { value: '' }, 'Jump to…')].concat(mods.reduce(function (a, m) { return a.concat(m.units.map(function (u, i) { return h('option', { value: m.id + '.' + i }, u.id + ' · ' + u.title); })); }, [])));
    function scenario(mode, label) { return h('button.btn.sm', { type: 'button', onclick: function () { CHM.api('previewScenario', { mode: mode }).then(function (r) { if (r.ok) { CHM.state = Object.assign(r.state, { activity: CHM.state.activity }); CHM.go('review'); } else CHM.announce(r.message); }); } }, label); }
    return h('div.previewbar', { role: 'region', 'aria-label': 'Teacher preview controls' }, h('strong.previewlabel', 'Teacher Preview — No Student Grade Recorded'),
      h('div.row', h('div.seg', { role: 'group', 'aria-label': 'View' }, h('button.segbtn', { type: 'button', 'aria-pressed': String(viewMode === 'student'), onclick: function () { viewMode = CHM.viewMode = 'student'; CHM.rerender(); } }, 'Student View'), h('button.segbtn', { type: 'button', 'aria-pressed': String(viewMode === 'answer'), onclick: function () { viewMode = CHM.viewMode = 'answer'; CHM.rerender(); } }, 'Answer and Scoring View')),
        jump, h('button.btn.sm', { type: 'button', onclick: function () { CHM.go('map'); } }, 'Map'),
        h('button.btn.sm', { type: 'button', onclick: function () { CHM.api('previewReset', {}).then(function (r) { if (r.ok) { CHM.state = Object.assign(r.state, { activity: {} }); CHM.drafts = {}; CHM.shared = {}; CHM.go('map'); } }); } }, 'Reset all preview responses'),
        h('button.btn.sm', { type: 'button', onclick: function () { CHM.go('teacher'); } }, 'Teacher panel')),
      h('div.row', h('span.small', 'Test outcomes:'), scenario('first', 'All correct on attempt 1'), scenario('second', 'All correct on attempt 2'), scenario('third', 'All correct on attempt 3'), scenario('exhaust', 'All exhausted (0 credit)'),
        h('button.btn.sm', { type: 'button', onclick: function () { CHM.go('review'); } }, 'Final review')));
  };

  function loadAnswers() {
    if (answerView) return Promise.resolve(answerView);
    return tapi('teacherAnswerView', {}).then(function (r) { if (!r.ok) { loginErr(r); throw new Error(r.message); } answerView = r; return r; });
  }
  CHM.answerPanel = function (u) {
    if (viewMode !== 'answer') return h('span');
    var host = h('section.answerpanel', h('h3', 'Answer and Scoring View (teacher only)'), h('p.small', 'Loading…'));
    loadAnswers().then(function (v) {
      var x = null; v.modules.forEach(function (m) { m.units.forEach(function (y) { if (y.id === u.id) x = y; }); });
      CHM.clear(host); host.appendChild(h('h3', 'Answer and Scoring View (teacher only)'));
      if (!x) return;
      host.appendChild(unitAnswer(x));
    }, function (e) { host.textContent = 'Could not load answers: ' + e.message; });
    return host;
  };
  function unitAnswer(x) {
    return h('div.ansbox', h('dl.plan', h('dt', 'Max points'), h('dd', x.points + ' (credit by attempt: ' + x.credit.slice(0, 3).join(' / ') + ' / 0 if never correct)'), h('dt', 'Learning target'), h('dd', x.target + ' · DOK ' + x.dok + ' · ' + x.cog + (x.needsGraph ? ' · graph/table' : '')),
      h('dt', 'Source alignment'), h('dd', x.src.map(function (s) { return s.f + ' — ' + s.loc; }).join('; ')), h('dt', 'Scoring rubric'), h('dd', x.rubric), h('dt', 'Hint after attempt 1'), h('dd', x.hints[0]), h('dt', 'Hint after attempt 2'), h('dd', x.hints[1] || x.hints[0]), h('dt', 'Explanation (shown at lock/final review)'), h('dd', x.explain)),
      h('h4', 'Accepted answer(s) and tolerances'), x.answer.map(function (a) { return h('pre.answer', a.text); }));
  }

  function tAnswers(host) {
    host.appendChild(h('p', 'Loading answer key from the server…'));
    loadAnswers().then(function (v) {
      CHM.clear(host); host.appendChild(h('p.small', 'Assessment version ' + v.version + ' · ' + v.totalPoints + ' points. Visible only with a valid teacher token.'));
      v.modules.forEach(function (m) { host.appendChild(h('h2', m.id + '. ' + m.title + ' (' + m.points + ' pts)')); m.units.forEach(function (u) { host.appendChild(h('details.rvd', h('summary', u.id + ' · ' + u.title + ' · ' + u.points + ' pts'), unitAnswer(u))); }); });
    }, function (e) { CHM.clear(host); host.appendChild(h('p.error', e.message)); });
  }

  function tCoverage(host) {
    loadAnswers().then(function (v) {
      var tot = 0, rows = [], byCog = {}, graph = 0, formats = {};
      CHM.content.modules.forEach(function (m) { m.units.forEach(function (u) { var a = null; v.modules.forEach(function (mm) { mm.units.forEach(function (y) { if (y.id === u.id) a = y; }); }); tot += u.points; byCog[a.cog] = (byCog[a.cog] || 0) + u.points; if (a.needsGraph) graph++; u.fields.forEach(function (f) { formats[f.type] = 1; });
        rows.push(h('tr', h('td', h('input', { type: 'checkbox', 'aria-label': 'Reviewed ' + u.id })), h('th', { scope: 'row' }, u.id), h('td', u.title), h('td', m.title), h('td.n', u.points), h('td', a.target), h('td', 'DOK ' + a.dok + ' · ' + a.cog), h('td', u.fields.map(function (f) { return f.type; }).join(', ')), h('td', a.needsGraph ? 'yes' : ''))); }); });
      var apply = (byCog.apply || 0) + (byCog.analyze || 0) + (byCog.evaluate || 0) + (byCog.create || 0);
      CHM.clear(host);
      host.appendChild(h('div.card', h('h2', 'Coverage'), h('ul', h('li', 'Scored units: ' + rows.length + ' · Total points: ' + tot), h('li', 'Application/analysis or higher: ' + apply + ' points (' + Math.round(apply / tot * 100) + '%)'), h('li', 'Units requiring graph/table interpretation: ' + graph), h('li', 'Interaction formats used: ' + Object.keys(formats).join(', ')),
        h('li', 'Points by location: ' + CHM.content.modules.map(function (m) { return m.id + '=' + m.points; }).join(', ')))));
      host.appendChild(h('table.dt', h('caption', 'Checklist (ticks are for your own use and are not saved)'), h('thead', h('tr', ['Reviewed', 'ID', 'Title', 'Location', 'Pts', 'Target', 'Demand', 'Formats', 'Graph'].map(function (x) { return h('th', { scope: 'col' }, x); }))), h('tbody', rows)));
    }, function (e) { host.textContent = e.message; });
  }

  function tResults(host) {
    var cur = null;
    function draw() {
      CHM.clear(host);
      tapi('teacherClasses', {}).then(function (r) {
        if (!r.ok) { loginErr(r); host.appendChild(h('p.error', r.message)); return; }
        var form = classForm(r.classes);
        host.appendChild(h('section.card', h('h2', 'Class codes'), h('table.dt', h('caption', 'Classes (a code only routes access; it does not prove identity)'), h('thead', h('tr', ['Code', 'Name', 'Status', 'Window', 'Roster', 'Reveal', ''].map(function (x) { return h('th', { scope: 'col' }, x); }))),
          h('tbody', r.classes.map(function (c) { return h('tr', h('th', { scope: 'row' }, c.code), h('td', c.name), h('td', c.status), h('td', (c.opensAt || 'any') + ' → ' + (c.closesAt || 'any')), h('td', c.requireRoster ? 'token' : 'open'), h('td', c.revealMode), h('td', h('button.btn.sm', { type: 'button', onclick: function () { cur = c.code; draw(); } }, 'Results'), ' ', h('button.btn.sm', { type: 'button', onclick: function () { form.load(c); } }, 'Edit'))); }))), form.el));
        if (cur) results(host, cur);
      });
    }
    function classForm(list) {
      var f = { code: '', name: '', section: '', status: 'open', opensAt: '', closesAt: '', requireRoster: false, revealMode: 'final', pacingFactor: 1 }, msg = h('p', { role: 'status' });
      var els = {};
      function inp(k, label, type) { var i = h('input', { type: type || 'text', value: f[k], onchange: function (e) { f[k] = type === 'checkbox' ? e.target.checked : e.target.value; } }); els[k] = i; return h('label.fl', label, i); }
      var el = h('form.card', { onsubmit: function (e) { e.preventDefault(); tapi('teacherSaveClass', { cls: f }).then(function (r) { msg.textContent = r.ok ? 'Saved ' + r.cls.code : r.message; if (r.ok) draw(); }); } }, h('h3', 'Add or edit a class code'), inp('code', 'Class code (4-24 letters/numbers)'), inp('name', 'Class name'), inp('section', 'Section'),
        h('label.fl', 'Status', h('select', { onchange: function (e) { f.status = e.target.value; } }, h('option', { value: 'open' }, 'open'), h('option', { value: 'closed' }, 'closed'))), inp('opensAt', 'Opens at (ISO date/time, optional)'), inp('closesAt', 'Closes at (optional)'),
        h('label.fl', 'Explanations', h('select', { onchange: function (e) { f.revealMode = e.target.value; } }, h('option', { value: 'final' }, 'At final review (default)'), h('option', { value: 'onLock' }, 'When each question locks'))), inp('pacingFactor', 'Pacing accommodation factor (1 = standard; 1.5 = 50% more suggested time)', 'number'), h('label.chk', h('input', { type: 'checkbox', onchange: function (e) { f.requireRoster = e.target.checked; } }), ' Require roster ID + personal access token (Roster tab)'), h('button.btn.primary', { type: 'submit' }, 'Save class'), msg);
      return { el: el, load: function (c) { Object.assign(f, c); Array.prototype.forEach.call(el.querySelectorAll('input[type=text],input[type=number]'), function (i, n) { }); Object.keys(els).forEach(function (k) { if (els[k].type !== 'checkbox') els[k].value = f[k]; }); msg.textContent = 'Loaded ' + c.code + '. Adjust and press Save.'; } };
    }
    draw();
  }
  function results(host, code) {
    var box = h('section.card', h('h2', 'Results: ' + code), h('p.small', 'Loading…')); host.appendChild(box);
    Promise.all([tapi('teacherSessions', { classCode: code }), tapi('teacherSummary', { classCode: code })]).then(function (a) {
      var rs = a[0], sm = a[1]; CHM.clear(box); box.appendChild(h('h2', 'Results: ' + code));
      if (!rs.ok) { box.appendChild(h('p.error', rs.message)); return; }
      var s = sm.summary;
      box.appendChild(h('p', s.students + ' joined · ' + s.finalized + ' finalized · average ' + (s.avgPct == null ? '—' : s.avgPct.toFixed(1) + '%')));
      box.appendChild(h('div.row', h('button.btn', { type: 'button', onclick: function () { tapi('teacherExport', { classCode: code }).then(function (r) { if (r.ok) CHM.download(r.filename, r.csv, 'text/csv;charset=utf-8'); }); } }, '⬇ Download CSV (opens in Excel)')));
      if (s.commonMissed.length) box.appendChild(h('div', h('h3', 'Common missed concepts (lowest first-attempt accuracy)'), h('ul', s.commonMissed.map(function (i) { return h('li', i.id + ' ' + i.title + ' · ' + i.concept + ' · ' + (i.firstTryAcc == null ? '' : Math.round(i.firstTryAcc * 100) + '% first-try')); }))));
      box.appendChild(h('table.dt', h('caption', 'Student sessions'), h('thead', h('tr', ['Name', 'Roster ID', 'Status', 'Done', 'Earned', '%', 'Gradebook', 'Receipt', 'Reset'].map(function (x) { return h('th', { scope: 'col' }, x); }))),
        h('tbody', rs.sessions.filter(function (x) { return x.status !== 'reset'; }).map(function (x) {
          var reason = h('input', { placeholder: 'Reason for reset', 'aria-label': 'Reason for resetting ' + x.name, size: 16 });
          return h('tr', h('th', { scope: 'row' }, x.name), h('td', x.rosterId), h('td', x.status), h('td.n', x.completed + '/29'), h('td.n', x.earned), h('td.n', x.pct), h('td', x.gradebook || '—'), h('td.mono', x.receiptId || '—'),
            h('td', reason, h('button.btn.sm', { type: 'button', onclick: function () { tapi('teacherReset', { sessionId: x.sessionId, reason: reason.value }).then(function (r) { if (r.ok) results(host.parentNode ? host : host, code); else reason.setAttribute('placeholder', r.message); }); } }, 'Reset')));
        }))));
    });
  }

  function tDelivery(host) {
    var out = h('div', { role: 'status' });
    host.appendChild(h('section.card', h('h2', 'Gradebook delivery test'), h('p', 'This writes ONE isolated test record to a separate “DeliveryTest” area and reads it back. It is excluded from Sessions, Responses, Summary, exports and class reports.'),
      h('p.callout', h('strong', 'Preview submissions are simulated. '), 'A normal preview never writes to the gradebook, so it proves nothing about live delivery. To verify the real path: open the deployed link (not a local copy) in your own browser, sign in as teacher there, and press the button below. That exercises the real browser → Apps Script → Sheet route. Then sign in as a test student with a test class code you create for this purpose, and finish a session, and delete or ignore the test class afterward.'),
      h('div.row', h('button.btn.primary', { type: 'button', onclick: function () { CHM.clear(out).appendChild(h('p', 'Testing…')); tapi('previewDeliveryTest', {}).then(function (r) { CHM.clear(out); out.appendChild(r.ok ? h('p.fbox.ok', '✓ Test record ' + r.id + ' written and read back at: ' + r.destination + '. Transport mode: ' + CHM.transport.mode() + '.') : h('p.fbox.bad', '✕ ' + r.message)); }, function () { CHM.clear(out).appendChild(h('p.fbox.bad', '✕ Could not reach the server.')); }); } }, 'Run delivery test')), out));
  }
})();
