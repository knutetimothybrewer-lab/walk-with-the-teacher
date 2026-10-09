/* Shell: HUD, mission strip, campus map, My Work, settings, import/export, review-and-submit, results, optional practice, teacher reset. */
(function (root) {
  'use strict';
  var W = root.WWQ, U = W.U, h = U.h, S = W.Sim, P = W.Policy, St = W.Store, A = W.Art, UI = W.UI, IU = W.ItemsUI, Views = W.Views;
  var Sh = W.Shell = {};
  function App() { return W.App; }

  /* ---------- HUD + mission strip ---------- */
  Sh.hud = function (state, ro) {
    var comp = P.completion(state), pos = state.progress.pos, m = W.MISSION[pos.m], view = state.progress.view;
    var where = view === 'map' ? 'Campus map' : view === 'review' ? 'Review and submit' : view === 'results' ? 'Final results' : (m.id ? 'Mission ' + m.id + ' · ' + m.title : m.title);
    var save = App().saveStatus, chip;
    if (!St.storageOK) chip = h('span.savechip.warn', { role: 'status' }, h('i'), 'Not saved on this device. Download a recovery file');
    else chip = h('span.savechip', { role: 'status' }, h('i'), save.at ? 'Saved ' + save.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Saved here');
    var pct = comp.pct;
    var pctNum = h('span.pct', pct.toFixed(0) + '%');
    var hud = h('header.hud', { role: 'banner' },
      h('button.hud-brand', { type: 'button', 'aria-label': 'Wildcats Wellness Quest, go to the campus map', onclick: function () { App().go({ view: 'map' }); } }, U.svg(A.logo()), h('span', h('b', 'Wildcats Wellness Quest'), h('small', 'Small Choices, Whole Health'))),
      h('div.hud-mid', h('div.where', where), h('div.progrow', h('div.bar', { role: 'progressbar', 'aria-label': 'Completion of required work', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(pct)) }, h('i', { style: { width: pct + '%' } })), pctNum, h('span.xs', { style: { opacity: '.85' } }, 'complete'))),
      h('div.hud-right', App().timeChip(), chip,
        UI.btn('Map', { icon: 'map', onclick: function () { App().go({ view: 'map' }); } }),
        UI.btn('My work', { icon: 'list', onclick: function () { Sh.myWork(); } }),
        UI.btn('Settings', { icon: 'gear', onclick: function () { Sh.settings(); } })));
    if (state.settings.pacing) {
      var mins = Math.max(0, Math.round((Date.now() - Date.parse(state.timing.startedAt || U.nowISO())) / 60000)), tg = W.CONFIG.timeGuidance, target = Math.round(tg.targetMinutes * (tg.extendedTime ? tg.extendedMultiplier : 1));
      hud.appendChild(h('div.xs', { style: { width: '100%', opacity: '.9' } }, 'Pacing guide only (it does not change your time limit): about ' + mins + ' min since you started; the design estimate is about ' + target + ' min. Take the time you need.'));
    }
    return hud;
  };
  Sh.strip = function (state, ro) {
    var cur = state.progress.pos.m, ol = h('ol');
    W.MISSIONS.forEach(function (m) {
      var st = P.missionStatus(state, m.id), unlocked = App().unlocked(m.id), done = m.id === 0 ? !!state.progress.activities.tutorial : st.complete;
      ol.appendChild(h('li', h('button.pip' + (m.id === cur && state.progress.view === 'stage' ? '.cur' : '') + (done ? '.done' : '') + (unlocked ? '' : '.lock'), { type: 'button', 'aria-disabled': unlocked ? null : 'true', 'aria-label': (m.id ? 'Mission ' + m.id + ': ' : '') + m.title + (done ? ', submitted' : unlocked ? '' : ', locked'), onclick: function () { App().openMission(m.id); } },
        h('span.n', done ? A.iconEl('check') : unlocked ? String(m.id) : A.iconEl('lock')), h('span', m.short || m.title))));
    });
    ol.appendChild(h('li', h('button.pip' + (state.progress.view === 'review' || state.progress.view === 'results' ? '.cur' : '') + (state.session.status === 'SUBMITTED' ? '.done' : App().canReview() ? '' : '.lock'), { type: 'button', onclick: function () { App().go({ view: state.session.status === 'SUBMITTED' ? 'results' : 'review' }); } }, h('span.n', A.iconEl('flag')), h('span', state.session.status === 'SUBMITTED' ? 'Results' : 'Submit'))));
    return h('nav.strip', { 'aria-label': 'Missions' }, ol);
  };

  /* ---------- campus map ---------- */
  Sh.map = function (state, ro) {
    var wrap = h('div.page'), cur = state.progress.pos.m, comp = P.completion(state);
    wrap.appendChild(h('div.stagehead', h('div', h('div.crumb', 'Wildcat High'), h('h1#stage-title', { tabindex: '-1' }, 'Campus map')), h('div.chip.brand', comp.done + ' of ' + comp.total + ' required activities submitted')));
    wrap.appendChild(h('p.lead', ro ? 'Your assessment is submitted. You can still open any mission to read your work and the explanations.' : 'Pick your next mission. A mission opens once the one before it is submitted, whether or not every answer was right.'));
    var mw = h('div.mapwrap'); mw.appendChild(U.svg(A.campus()));
    var walkerEl;
    for (var k = 0; k <= 7; k++) (function (k) {
      var m = W.MISSION[k], node = A.NODES[k], st = P.missionStatus(state, k), unlocked = App().unlocked(k), done = k === 0 ? !!state.progress.activities.tutorial : st.complete;
      if (k === 0) return;
      var b = h('button.nodebtn' + (done ? '.done' : '') + (!unlocked ? '.lock' : '') + (k === cur && !done ? '.cur' : ''), { type: 'button', style: { left: node.x + '%', top: node.y + '%' }, 'aria-disabled': unlocked ? null : 'true', 'aria-label': 'Mission ' + k + ': ' + m.title + ' at the ' + m.placeName + (done ? ', submitted' : unlocked ? '' : ', locked'),
        onclick: function () { if (!unlocked) { UI.toast('Submit all the work in Mission ' + (k - 1) + ' first.', 'bad'); return; } Sh.walkTo(mw, walkerEl, k); } }, done ? A.iconEl('check') : unlocked ? String(k) : A.iconEl('lock'));
      mw.appendChild(b);
      mw.appendChild(h('div.nodelabel', { style: { left: node.x + '%', top: 'calc(' + node.y + '% + 34px)' }, 'aria-hidden': 'true' }, m.placeName));
    })(k);
    var a0 = A.NODES[Math.max(0, Math.min(7, cur))];
    walkerEl = h('div.walker.walking', { style: { left: (a0.x + 3.2) + '%', top: 'calc(' + a0.y + '% + 4px)' }, 'aria-hidden': 'true' }, U.svg(A.walker(A.avatarById(state.student.avatar))));
    mw.appendChild(walkerEl); wrap.appendChild(mw);
    var list = h('div.maplist');
    W.MISSIONS.forEach(function (m) {
      if (!m.id) return; var st = P.missionStatus(state, m.id), unlocked = App().unlocked(m.id), done = st.complete;
      list.appendChild(h('div.maprow' + (done ? '.done' : '') + (m.id === cur && !done ? '.cur' : '') + (!unlocked ? '.lock' : ''), h('div.num', done ? A.iconEl('check') : String(m.id)),
        h('div', h('b', m.title), h('div.small.muted', m.placeName + ' · about ' + m.est + ' min · ' + st.done + ' of ' + st.total + ' steps submitted')),
        UI.btn(done ? (ro ? 'Review' : 'Revisit') : unlocked ? (st.done ? 'Continue' : 'Start') : 'Locked', { cls: unlocked && !done ? 'primary' : '', disabled: !unlocked, icon: unlocked ? 'right' : 'lock', onclick: function () { App().openMission(m.id); } })));
    });
    wrap.appendChild(list);
    wrap.appendChild(Sh.footnote(state));
    return wrap;
  };
  Sh.walkTo = function (mw, walker, k) {
    var go = function () { App().openMission(k); };
    if (!UI.motionOn()) { go(); return; }
    var n = A.NODES[k], done = false;
    function finish() { if (done) return; done = true; document.removeEventListener('pointerdown', finish, true); document.removeEventListener('keydown', finish, true); go(); }
    walker.style.left = (n.x + 3.2) + '%'; walker.style.top = 'calc(' + n.y + '% + 4px)';
    document.addEventListener('pointerdown', finish, true); document.addEventListener('keydown', finish, true);
    setTimeout(finish, 1000);
  };

  /* ---------- footer note ---------- */
  Sh.footnote = function (state) {
    return h('div.footnote.noprint', h('span', 'Saved only in this browser on this device. Clearing site data can erase it, so download a recovery file now and then. ' + (W.Sync.enabled() ? 'Only your final result is sent to your teacher, when you submit.' : 'Nothing is sent anywhere.')),
      h('span', h('button', { type: 'button', onclick: function () { Sh.teacher(); } }, 'Teacher reset')));
  };

  /* ---------- My Work ---------- */
  Sh.myWork = function () {
    var st = App().state, body = h('div.stack-sm');
    W.MISSIONS.forEach(function (m) {
      if (!m.id) return; var items = W.ITEMS.filter(function (i) { return i.m === m.id; }), b = P.totals(st).byMission[m.id];
      var box = h('div.card.flat', h('div.row.between', h('h3', 'Mission ' + m.id + ' · ' + m.title), h('span.chip.brand', U.fmt1(b.earned) + ' / ' + b.max + ' pts so far')));
      var ul = h('ul', { style: { listStyle: 'none', padding: 0, margin: '8px 0 0' } });
      items.forEach(function (it) {
        var rec = st.items[it.id], status = !rec || !rec.attempts.length ? ['Not started', ''] : rec.finalized ? ['Submitted · ' + U.fmt1(rec.best) + '/' + it.pts, 'ok'] : ['In review', 'warn'];
        ul.appendChild(h('li', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '4px 0', borderBottom: '1px solid var(--line)', alignItems: 'center' } }, h('span.small', it.topic + ' (' + it.id.replace('m', '').split('.').slice(1).join('.') + ')'), h('span.row', UI.chip(status[0], status[1]), UI.btn('Open', { cls: 'sm', onclick: function () { modal.close(); App().go({ m: it.m, s: it.st }); } }))));
      });
      box.appendChild(ul); body.appendChild(box);
    });
    var modal = UI.modal({ title: 'My work', wide: true, body: [h('p.small.muted', 'Everything you have submitted, with the points each item has earned so far. Open an item to read your answer and, once it is finished, the explanation.'), body], actions: [UI.btn('Close', { cls: 'primary', onclick: function () { modal.close(); } })] });
  };

  /* ---------- settings + recovery files ---------- */
  Sh.settings = function () {
    var st = App().state, ro = st.session.status === 'SUBMITTED', body = h('div.stack');
    var mot = h('fieldset.part', h('legend', 'Animation'), h('div.opts.chips', { role: 'radiogroup', 'aria-label': 'Animation' }, [['auto', 'Follow my device'], ['on', 'On'], ['off', 'Off']].map(function (o) {
      return h('label.opt', h('input', { type: 'radio', name: 'mot', value: o[0], checked: st.settings.motion === o[0], onchange: function () { st.settings.motion = o[0]; UI.applyMotion(); App().save(true); } }), h('span.mark', A.iconEl('check')), o[1]); })), h('p.hint-line', 'Turning animation off keeps every number, label and table. Nothing flashes.'));
    var txt = h('fieldset.part', h('legend', 'Text size'), h('div.opts.chips', { role: 'radiogroup', 'aria-label': 'Text size' }, [[1, 'Normal'], [1.125, 'Large'], [1.25, 'Extra large']].map(function (o) {
      return h('label.opt', h('input', { type: 'radio', name: 'txt', value: String(o[0]), checked: st.settings.textScale === o[0], onchange: function () { st.settings.textScale = o[0]; UI.applyText(); App().save(true); } }), h('span.mark', A.iconEl('check')), o[1]); })));
    var pace = h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center', fontWeight: '600' } }, h('input', { type: 'checkbox', checked: st.settings.pacing, onchange: function (e) { st.settings.pacing = e.target.checked; App().save(true); App().render(); } }), 'Show a pacing guide (guidance only)');
    var file = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' }, id: 'import-file', onchange: function (e) { var f = e.target.files && e.target.files[0]; if (f) { var r = new FileReader(); r.onload = function () { Sh.importText(String(r.result)); }; r.onerror = function () { Sh.importText(''); }; r.readAsText(f); } e.target.value = ''; } });
    body.appendChild(mot); body.appendChild(txt); body.appendChild(pace);
    body.appendChild(h('div.card.flat', h('h3', 'Recovery file'), h('p.small', 'A recovery file lets you restore your work if this browser’s saved data is cleared. It is for recovery only. It can never start you over or lower your attempt counts.'),
      h('div.row', UI.btn('Download recovery file', { icon: 'download', onclick: function () { Sh.downloadRecord(); } }), UI.btn('Load a recovery file', { icon: 'upload', onclick: function () { file.click(); } }), file)));
    if (St.passcodeConfigured() && !W.Teacher.active) {
      var rpw = h('input.txt', { type: 'password', id: 'set-reset-code', autocomplete: 'off', 'aria-label': 'Teacher reset code', placeholder: 'Teacher code', 'data-fk': 'set-reset-code' });
      var rmsg = h('p.small', { id: 'set-reset-msg', role: 'status' }, 'Teacher only: enter the teacher code to wipe the current attempt and return to the start screen.');
      var rgo = UI.btn('Reset this attempt', { cls: 'danger', icon: 'undo', id: 'set-reset-go', onclick: function () {
        var r = St.attemptPasscode(rpw.value); rpw.value = '';
        if (r.locked) { rmsg.textContent = 'Too many wrong entries. Try again in ' + r.wait + ' seconds.'; UI.announce(rmsg.textContent); return; }
        if (!r.ok) { rmsg.textContent = 'That teacher code is not correct.'; UI.announce(rmsg.textContent); return; }
        var ns = St.teacherReset(App().state); App().state = ns; Views.sel = null; W.Vis.openTab = {}; W.Vis.seenTabs = {}; IU.reconsider = {}; Sh.pdraft = {}; Sh.pchecked = {};
        modal.close(); UI.applyMotion(); UI.applyText(); App().go({ m: 0, s: '0.1' }); UI.toast('Attempt reset. Back to the start.', 'ok', 6000);
      } });
      rpw.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); rgo.click(); } });
      body.appendChild(h('div.card.flat', h('h3', 'Teacher reset'), rmsg, h('div.row', rpw, rgo)));
    }
    body.appendChild(h('p.small.muted', St.storageOK ? 'Saving: working. Your progress is stored in this browser on this device only.' : 'Saving: NOT available in this browser. The one-session lock cannot be protected on this device. Please download a recovery file often.'));
    var modal = UI.modal({ title: 'Settings', body: [body], actions: [UI.btn('Done', { cls: 'primary', onclick: function () { modal.close(); } })] });
  };
  Sh.downloadRecord = function () {
    var st = App().state, text = St.exportRecord(st), name = 'wildcats-wellness-quest_' + UI.safeName(st.student.alias) + '_' + st.session.id + (st.session.status === 'SUBMITTED' ? '_FINAL' : '_recovery') + '.json';
    if (UI.download(name, text)) UI.toast('Downloaded ' + name, 'ok'); else { UI.modal({ title: 'Download did not start', body: ['Select all of the text below and save it in a file ending in .json.', h('textarea.txt', { readonly: true, style: { minHeight: '220px' } }, text)], actions: [] }); }
  };
  Sh.importText = function (text) {
    var res = St.importRecord(text, App().state);
    var m;
    if (!res.ok) { m = UI.modal({ title: 'Could not use that file', body: [h('div.callout.bad', A.iconEl('alert'), h('div', res.message)), res.problems && res.problems.length ? h('details', h('summary', 'Technical details for your teacher'), h('ul.small', res.problems.slice(0, 8).map(function (p) { return h('li', p); }))) : null], actions: [UI.btn('OK', { cls: 'primary', onclick: function () { m.close(); } })] }); return; }
    if (!res.noChange) { App().state = res.state; App().save(true); }
    App().render();
    m = UI.modal({ title: res.readOnly ? 'Loaded as read-only' : 'Recovery file loaded', body: [h('div.callout.ok', A.iconEl('check'), h('div', res.message))], actions: [UI.btn('OK', { cls: 'primary', onclick: function () { m.close(); } })] });
  };

  /* ---------- review + final submission ---------- */
  Sh.review = function (state, ro) {
    var wrap = h('div.page.narrow'), can = St.canSubmit(state), comp = P.completion(state), tot = P.totals(state);
    wrap.appendChild(h('div.stagehead', h('div', h('div.crumb', 'Final step'), h('h1#stage-title', { tabindex: '-1' }, 'Review and submit'))));
    wrap.appendChild(h('p.lead', 'Check that every required activity is submitted. You can still go back and change anything that is not finished.'));
    var list = h('div.card.stack-sm', h('div.row.between', h('h2', 'Required work'), h('span.chip.' + (can.ok ? 'ok' : 'warn'), comp.done + ' of ' + comp.total + ' submitted')));
    W.MISSIONS.forEach(function (m) { var s = P.missionStatus(state, m.id); if (!s.total) return; list.appendChild(h('div.row.between', { style: { borderBottom: '1px solid var(--line)', padding: '6px 0' } }, h('span', (m.id ? 'Mission ' + m.id + ' · ' : '') + m.title), h('span.row', UI.chip(s.done + ' / ' + s.total, s.complete ? 'ok' : 'warn'), s.complete ? null : UI.btn('Go', { cls: 'sm', onclick: function () { var first = m.stages.filter(function (x) { return !Views.stageDone(x, state); })[0] || m.stages[0]; App().go({ m: m.id, s: first.id }); } })))); });
    wrap.appendChild(list);
    var open = can.openItems || [];
    if (open.length) wrap.appendChild(h('div.callout.warn', { style: { marginTop: '16px' } }, A.iconEl('alert'), h('div', h('b', open.length + ' item' + (open.length === 1 ? ' is' : 's are') + ' not finished yet. '), 'Submitting is available after every required item is submitted and finished (you may finish an item at any time by keeping your score).')));
    // unused retries (kept items)
    var unused = W.ITEMS.filter(function (it) { var r = state.items[it.id]; return r && P.canReopen(it, r); });
    if (unused.length) {
      var ul = h('ul', { style: { margin: '8px 0 0', paddingLeft: '20px' } }); unused.forEach(function (it) { var r = state.items[it.id]; ul.appendChild(h('li', h('span', it.topic + ' (' + P.attemptsLeft(it, r) + ' attempt' + (P.attemptsLeft(it, r) === 1 ? '' : 's') + ' left, best ' + U.fmt1(r.best) + '/' + it.pts + ') '), UI.btn('Reopen to retry', { cls: 'sm', onclick: function () { P.reopen(it, r); App().save(true); App().go({ m: it.m, s: it.st }); } }))); });
      wrap.appendChild(h('div.callout.info', { style: { marginTop: '16px' } }, A.iconEl('info'), h('div', h('b', 'Unused retry opportunities (' + unused.length + '). '), 'You chose to keep these scores. You may reopen any of them now. After you submit, they can no longer be changed.', ul)));
    }
    wrap.appendChild(h('div.callout.bad', { style: { marginTop: '16px' } }, A.iconEl('lock'), h('div', h('b', 'Submitting locks your assessment. You will not be able to change answers or start over without a teacher reset.'), h('p.small', 'Your score is calculated from your recorded answers, you see your results right away, and a locked record is saved on this device.'))));
    var ack = h('input', { type: 'checkbox', id: 'ack', 'data-fk': 'ack', onchange: function () { btn.disabled = !(can.ok && ack.checked) || App().submitting; } });
    var btn = UI.btn('Submit my assessment', { cls: 'danger big', icon: 'lock', disabled: true, id: 'btn-final', onclick: function () { Sh.confirmSubmit(btn); } });
    wrap.appendChild(h('div.card.stack', h('label', { 'for': 'ack', style: { display: 'flex', gap: '8px', fontWeight: '700', alignItems: 'flex-start' } }, ack, 'I understand that submitting locks my assessment.'),
      h('div.row', UI.btn('Download a recovery file first', { icon: 'download', onclick: function () { Sh.downloadRecord(); } }), btn)));
    wrap.appendChild(Sh.footnote(state));
    return wrap;
  };
  Sh.confirmSubmit = function (btn) {
    var m;
    var yes = UI.btn('Yes, submit and lock', { cls: 'danger', onclick: function () {
      if (App().submitting) return; App().submitting = true; yes.disabled = true; btn.disabled = true;
      var res = St.submitFinal(App().state); m.close();
      App().submitting = false;
      if (!res.ok) { UI.modal({ title: 'Cannot submit yet', body: ['Some required work is not finished.'], actions: [] }); return; }
      App().state = res.state; if (!res.persisted && !res.already) { UI.toast('Submitted. Browser saving is unavailable, so download your final report now.', 'bad', 8000); }
      if (!res.already && W.Sync.enabled() && !W.Teacher.active) { W.Sync.queue(W.Sync.payload(res.state, res.state.final.report)); Sh.startSync(); }
      App().go({ view: 'results' });
    } });
    m = UI.modal({ title: 'Submit and lock?', body: [h('p', h('b', 'This cannot be undone by you.'), ' Only a teacher can reset it. You will see your results immediately.'), h('p.small.muted', 'Tip: if you are not sure about an item, press Cancel and go back first.')], actions: [UI.btn('Cancel', { onclick: function () { m.close(); } }), yes], focus: '.btn' });
  };

  /* ---------- sending results to the teacher's Google Sheet (only when config.backend.url is set) ---------- */
  Sh.syncCard = function () {
    var box = h('div.card.flat.noprint#sync-card', { style: { marginBottom: '16px' }, role: 'status' }), retry = null;
    function paint(r) {
      U.clear(box); var pend = W.Sync.pending();
      if (r && r.rejected) box.appendChild(UI.callout('bad', 'alert', [h('b', 'Your teacher could not accept the class code. '), 'Your work is saved here. Show your teacher this screen and use Download results (JSON) below.']));
      else if (!pend) box.appendChild(UI.callout('ok', 'check', [h('b', 'Sent to your teacher. '), r && r.duplicate ? 'Your teacher already had a result under this ID, so this one was saved separately for them to review.' : 'You do not need to do anything else.']));
      else { retry = UI.btn('Try sending again', { icon: 'right', onclick: function () { retry.disabled = true; Sh._sync.now().then(function () { retry.disabled = false; }); } });
        box.appendChild(UI.callout('warn', 'alert', [h('b', 'Not sent yet. '), 'Your score is saved on this device and the page keeps trying. If it stays red, press the button or tell your teacher.', h('div', { style: { marginTop: '8px' } }, retry)])); }
    }
    Sh._paint = paint; paint(null); return box;
  };
  Sh.startSync = function () {
    if (!W.Sync.enabled() || Sh._sync) { if (Sh._sync) Sh._sync.now(); return; }
    Sh._sync = W.Sync.retryLoop(function (r) { if (Sh._paint && document.getElementById('sync-card')) Sh._paint(r); });
    Sh._sync.now();
  };

  /* ---------- results (read-only) ---------- */
  Sh.results = function (state) {
    var rep = (state.final && state.final.report) || W.Report.build(state), wrap = h('div.page'), C = W.CONFIG;
    wrap.appendChild(h('div.lockbanner.noprint', A.iconEl('lock'), h('div', h('b', 'Submitted and locked. '), 'This report is read-only. You can view explanations and download your results, but answers cannot be changed.')));
    wrap.appendChild(h('div.stagehead', h('div', h('div.crumb', 'Wildcats Wellness Quest · Final results'), h('h1#stage-title', { tabindex: '-1' }, 'Your results')),
      h('div.row.noprint', UI.btn('Download results (JSON)', { icon: 'download', cls: 'primary', onclick: Sh.downloadRecord }), UI.btn('Print / Save as PDF', { icon: 'print', onclick: function () { root.print(); } }), UI.btn('Review my answers', { icon: 'eye', onclick: function () { App().go({ m: 1, s: '1.1' }); } }))));
    if (state.session.timedOut) wrap.appendChild(h('div.callout.warn', { style: { marginBottom: '16px' } }, A.iconEl('alert'), h('div', h('b', 'Time limit reached. '), 'Your time ran out, so the answers you had submitted were locked and sent automatically. Anything unanswered counts as 0.')));
    if (W.Sync.enabled() && !W.Teacher.active) wrap.appendChild(Sh.syncCard());
    wrap.appendChild(h('div.card.flat', { style: { marginBottom: '16px' } }, h('div.grid.c3', h('div', h('div.xs.muted', C.identifierLabel), h('b', rep.student.identifier || '(not entered)')), h('div', h('div.xs.muted', 'Class period'), h('b', rep.student.period || '—')), h('div', h('div.xs.muted', 'Submitted'), h('b', rep.session.submittedAt ? new Date(rep.session.submittedAt).toLocaleString() : '—'))),
      h('div.grid.c3', { style: { marginTop: '8px' } }, h('div', h('div.xs.muted', 'Session ID'), h('b', rep.session.id)), h('div', h('div.xs.muted', 'Assessment version'), h('b', rep.assessmentVersion)), h('div', h('div.xs.muted', 'Record type'), h('b', rep.session.teacherAuthorizedReset ? 'Teacher-authorized new attempt (local, unverified)' : 'Original session')))));
    var scoreNum = h('div.num', h('span', rep.scores.earnedDisplay), h('small', ' / 100'));
    var letter = rep.scores.letter ? h('div.sub', 'Letter grade (teacher-configured): ', h('b', rep.scores.letter)) : null;
    wrap.appendChild(h('div.score-hero.stagger',
      h('div.card', h('div.lbl', 'Assessment score'), scoreNum, h('div.sub', h('b', rep.scores.percentDisplay + '%'), ' of 100 automatically scored points'), letter, h('div.xs.muted', { style: { marginTop: '6px' } }, rep.scores.rounding + ' No points are pending or reviewed by hand.')),
      h('div.card', h('div.lbl', 'Completion'), h('div.num', rep.completion.percent.toFixed(0), h('small', '%')), h('div.sub', rep.completion.done + ' of ' + rep.completion.total + ' required activities submitted. Completion is separate from the grade.')),
      h('div.card', h('div.lbl', 'First-attempt evidence'), h('div.num', U.fmt1(rep.firstAttemptEvidence.points), h('small', ' / 100')), h('div.sub', 'What your first answers earned, before any retries. Kept separately in your report.'))));
    var nums = scoreNum.firstChild; UI.count(nums, rep.scores.earnedPoints, 900, U.fmt1);
    // missions
    var mb = h('div.card', h('h2', 'Mission breakdown'));
    rep.missions.forEach(function (m) { mb.appendChild(h('div.mrow', h('div', h('b', 'Mission ' + m.id), h('div.small.muted', m.title)), h('div.bar', { role: 'img', 'aria-label': m.title + ' ' + U.fmt1(m.earned) + ' of ' + m.max }, h('i', { style: { width: (m.earned / m.max * 100) + '%' } })), h('div.nums', U.fmt1(m.earned) + ' / ' + m.max))); });
    wrap.appendChild(mb);
    var col = h('div.twocol', { style: { marginTop: '16px' } },
      h('div.card', h('h2', 'Strengths'), rep.strengths.length ? h('ul', rep.strengths.map(function (s) { return h('li', s); })) : h('p.small', 'Your strongest areas will show here when a topic reaches 85% or more of its points.')),
      h('div.card', h('h2', 'Targeted next steps'), rep.nextSteps.length ? h('ul', rep.nextSteps.map(function (n) { return h('li', h('b', n.group + ': '), n.step); })) : h('p.small', 'No topic is below 70%. Keep applying evidence and STOP in real situations.')));
    wrap.appendChild(col);
    wrap.appendChild(h('div.card', { style: { marginTop: '16px' } }, h('h2', 'Attempt usage'), h('p', 'You used ', h('b', rep.attemptUsage.attemptsUsed + ' of ' + rep.attemptUsage.attemptsAllowed), ' permitted attempts. ' + rep.attemptUsage.itemsFinalizedWithUnusedRetries + ' item(s) were finished with retries unused. Retry caps: ' + rep.policy.caps.map(function (c) { return Math.round(c * 100) + '%'; }).join(' / ') + '. Your best score on each item was kept.')));
    // topics
    var tb = h('table.itemtable', h('thead', h('tr', h('th', 'Topic'), h('th', 'Points'), h('th', 'Share'))), h('tbody', rep.topics.map(function (t) { return h('tr', h('td', t.group), h('td', U.fmt1(t.earned) + ' / ' + t.max), h('td', Math.round(t.earned / t.max * 100) + '%')); })));
    wrap.appendChild(h('details.card', { style: { marginTop: '16px' } }, h('summary', { style: { cursor: 'pointer', fontWeight: '800' } }, 'Breakdown by topic'), tb));
    var it = h('table.itemtable', h('thead', h('tr', h('th', 'Item'), h('th', 'Attempts'), h('th', 'First try'), h('th', 'Final'))), h('tbody', rep.items.map(function (i) { return h('tr', h('td', i.id + ' · ' + i.topic), h('td', i.attempts.length + ' / ' + i.attemptLimit), h('td', i.firstAttempt ? U.fmt1(i.firstAttempt.points) : '—'), h('td', U.fmt1(i.best) + ' / ' + i.pts)); })));
    wrap.appendChild(h('details.card', { style: { marginTop: '16px' } }, h('summary', { style: { cursor: 'pointer', fontWeight: '800' } }, 'Every item: attempts, first try and final points'), it));
    if (state.session.reset) wrap.appendChild(h('div.callout.info', { style: { marginTop: '16px' } }, A.iconEl('key'), h('div', h('b', 'Teacher-authorized new attempt. '), 'This session began after a teacher reset on ' + new Date(state.session.reset.at).toLocaleString() + '. This note is recorded locally and is not independently verified.')));
    wrap.appendChild(Sh.practiceSection(state));
    wrap.appendChild(h('div.card.flat', { style: { marginTop: '16px' } }, h('h3', 'How to hand this in'), h('p.small', W.Sync.enabled() ? 'Your result is sent to your teacher automatically (see the box at the top). If it says “Not sent yet,” or your teacher asks for it, press “Download results (JSON)” and hand in that file the way they told you. The printed report can also be saved as a PDF.' : 'Press “Download results (JSON)” and give that file to your teacher the way they told you (for example, upload it to your class assignment). The printed report can also be saved as a PDF. Nothing is sent automatically.')));
    wrap.appendChild(h('p.xs.muted', 'Simulation points in Mission 6 are fictional teaching weights and never count toward your score. Practice questions never change your grade. This is a client-side record that can’t be independently verified.'));
    wrap.appendChild(Sh.footnote(state));
    return wrap;
  };

  /* ---------- optional practice (after submission; never scored) ---------- */
  Sh.pdraft = {}; Sh.pchecked = {};
  Sh.practiceSection = function (state) {
    var box = h('details.card.noprint', { style: { marginTop: '16px' } }, h('summary', { style: { cursor: 'pointer', fontWeight: '800' } }, 'Optional practice (does not change your grade)'));
    box.appendChild(h('p.small.muted', { style: { marginTop: '8px' } }, 'Extra practice you can do anytime. You may try as often as you like. It is separate from your assessment and can never change your score or your record.'));
    W.PRACTICE.opt.forEach(function (it) {
      var v = it.variants[0], draft = Sh.pdraft[it.id] = Sh.pdraft[it.id] || {}, checked = Sh.pchecked[it.id];
      var card = h('div.card.flat', { style: { marginTop: '12px' } }, h('h3', it.title), v.ctx ? h('div', U.rich(v.ctx)) : null);
      var res = checked ? P.scoreResponse(v, draft) : null;
      v.parts.forEach(function (p) {
        var fs = h('fieldset.part', h('legend', p.label)), list = h('div.opts' + (p.opts.every(function (o) { return o.t.length <= 28; }) ? '.chips' : ''));
        p.opts.forEach(function (o) {
          var isBest = checked && o.c >= 1; list.appendChild(h('label.opt' + (isBest ? '.best' : '') + (checked && draft[p.id] === o.id ? '.picked' : ''), h('input', { type: 'radio', name: it.id + p.id, value: o.id, checked: draft[p.id] === o.id, 'data-fk': 'po-' + it.id + p.id + o.id, onchange: function () { draft[p.id] = o.id; Sh.pchecked[it.id] = false; App().render(); } }), h('span.mark', A.iconEl('check')), h('span.txt', o.t), isBest ? h('span.chip.ok.tag', 'Best-supported') : null));
        });
        fs.appendChild(list); card.appendChild(fs);
      });
      var ready = v.parts.every(function (p) { return draft[p.id]; });
      card.appendChild(h('div.row', UI.btn('Check my answer', { cls: 'primary', disabled: !ready, onclick: function () { Sh.pchecked[it.id] = true; App().render(); } }), UI.btn('Clear', { onclick: function () { Sh.pdraft[it.id] = {}; Sh.pchecked[it.id] = false; App().render(); } })));
      if (checked && res && res.valid) card.appendChild(h('div.result.' + (res.raw >= 1 ? 'full' : 'partial'), { role: 'status' }, h('b', Math.round(res.raw * 100) + '% (practice only). '), it.why));
      box.appendChild(card);
    });
    return box;
  };

  /* ---------- teacher reset ---------- */
  Sh.teacher = function () {
    var st = App().state, m, step = 'gate', wait = 0, timer = null;
    var body = h('div.stack');
    function paint() {
      U.clear(body); U.clear(m.actions);
      if (!St.passcodeConfigured()) {
        body.appendChild(h('div.callout.warn', A.iconEl('key'), h('div', h('b', 'No teacher passcode is set up on this copy. '), 'The reset control stays disabled until a teacher sets one (README, “Teacher setup”). There is no default passcode.')));
        m.actions.appendChild(UI.btn('Close', { cls: 'primary', onclick: function () { m.close(); } })); return;
      }
      if (step === 'gate') {
        var pw = h('input.txt', { type: 'password', id: 'tpw', autocomplete: 'off', 'aria-describedby': 'tpw-help', 'data-fk': 'tpw' });
        var msg = h('p.small', { id: 'tpw-help', role: 'status' }, wait ? 'Too many wrong entries. Try again in ' + wait + ' seconds. (An interface deterrent only.)' : 'Enter the teacher passcode to open teacher options.');
        var go = UI.btn('Unlock', { cls: 'primary', onclick: function () { attempt(); } });
        function attempt() {
          var r = St.attemptPasscode(pw.value); pw.value = '';
          if (r.ok) { step = 'menu'; paint(); return; }
          if (r.locked) { wait = r.wait; msg.textContent = 'Too many wrong entries. Try again in ' + r.wait + ' seconds. (An interface deterrent only.)'; startTimer(); }
          else msg.textContent = 'That passcode did not work. ' + r.remaining + (r.remaining === 1 ? ' try' : ' tries') + ' left before a short pause. Nothing was changed.';
          UI.announce(msg.textContent);
        }
        pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); attempt(); } });
        body.appendChild(h('div', h('label.field', { 'for': 'tpw' }, 'Teacher passcode'), pw, msg));
        m.actions.appendChild(UI.btn('Cancel', { onclick: function () { m.close(); } })); m.actions.appendChild(go);
      } else if (step === 'menu') {
        var comp = P.completion(st);
        body.appendChild(h('div.callout.info', A.iconEl('info'), h('div', h('b', 'Current device record: '), (st.student.alias || '(no alias)') + ' · ' + st.session.status + ' · ' + comp.pct.toFixed(0) + '% complete · ' + U.fmt1(P.totals(st).earned) + ' / 100 pts')));
        body.appendChild(h('p', 'Export this student’s report first, then reset the device for the next student. The reset creates a new session and records that a teacher authorized it through this dialog. That record is local and not independently verified.'));
        body.appendChild(h('div.row', UI.btn('Download this report (JSON)', { icon: 'download', onclick: function () { Sh.downloadRecord(); exported = true; paint(); } }), UI.btn('Print report', { icon: 'print', onclick: function () { m.close(); if (st.session.status === 'SUBMITTED') { App().go({ view: 'results' }); setTimeout(function () { root.print(); }, 200); } else root.print(); } })));
        body.appendChild(h('div.callout.info', A.iconEl('eye'), h('div', h('b', 'Teacher mode: '), 'click through every mission without answering, and fill in answers with one button to preview the review and results pages. It runs only in this browser tab, never touches this device’s student record and sends nothing to the Sheet.', h('div', { style: { marginTop: '8px' } }, UI.btn('Open teacher mode', { cls: 'primary', id: 'btn-teacher-mode', icon: 'right', onclick: function () { m.close(); W.Teacher.enter(); } })))));
        m.actions.appendChild(UI.btn('Close', { onclick: function () { m.close(); } }));
        m.actions.appendChild(UI.btn('Reset this device for a new student…', { cls: 'danger', icon: 'undo', onclick: function () { step = 'confirm'; paint(); } }));
      } else if (step === 'confirm') {
        var sk = h('input', { type: 'checkbox', id: 'skipx', checked: exported, 'data-fk': 'skipx', onchange: function () { go2.disabled = !(sk.checked); } });
        body.appendChild(h('div.callout.bad', A.iconEl('alert'), h('div', h('b', 'This permanently clears the saved assessment on this device. '), 'The next person starts a brand-new session. Exported files are unaffected.')));
        body.appendChild(h('label', { 'for': 'skipx', style: { display: 'flex', gap: '8px', fontWeight: '700' } }, sk, exported ? 'I downloaded the report (or do not need it).' : 'I understand I have NOT exported this report and do not need it.'));
        var go2 = UI.btn('Yes, reset and start a new session', { cls: 'danger', disabled: !sk.checked, onclick: function () { var ns = St.teacherReset(st); App().state = ns; Views.sel = null; W.Vis.openTab = {}; W.Vis.seenTabs = {}; IU.reconsider = {}; Sh.pdraft = {}; Sh.pchecked = {}; m.close(); UI.applyMotion(); UI.applyText(); App().go({ m: 0, s: '0.1' }); UI.toast('Device reset. A new session was started and recorded as teacher-authorized.', 'ok', 6000); } });
        m.actions.appendChild(UI.btn('Back', { onclick: function () { step = 'menu'; paint(); } })); m.actions.appendChild(go2);
      }
    }
    var exported = false;
    function startTimer() { if (timer) clearInterval(timer); timer = setInterval(function () { wait = Math.max(0, wait - 1); var el = document.getElementById('tpw-help'); if (el && step === 'gate') el.textContent = wait ? 'Too many wrong entries. Try again in ' + wait + ' seconds. (An interface deterrent only.)' : 'You can try again.'; if (!wait) { clearInterval(timer); timer = null; } }, 1000); }
    m = UI.modal({ title: 'Teacher reset', body: [body], actions: [], locked: false, onClose: function () { if (timer) clearInterval(timer); } });
    paint();
  };
})(typeof window !== 'undefined' ? window : globalThis);
