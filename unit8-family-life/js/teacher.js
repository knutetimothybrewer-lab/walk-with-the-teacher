// Teacher mode. Opened by typing WALK-TEACHER in the class-code field. The password is checked on the SERVER;
// every action below carries a short-lived teacher token that the server re-checks on every call.
import { h, mount, $, trapFocus, announce, fmtClock, fmtTime, fmtMinutes, pct, toCsv, download, session } from './util.js';
import { call, clock } from './api.js';

const BLOCKS = ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9'];

function modal(nodes, opts) {
  const ov = h('div.overlay', { role: 'presentation' });
  const box = h('div.modal' + (opts && opts.wide ? '.wide' : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': (opts && opts.label) || 'Dialog' }, ...nodes);
  ov.appendChild(box); document.body.appendChild(ov);
  const release = trapFocus(box, () => close());
  function close() { release(); ov.remove(); if (opts && opts.onClose) opts.onClose(); }
  return close;
}

/* ------------------------------------------------------------------------------ login */
export function openTeacherLogin(app, onClose) {
  const err = h('div', { role: 'alert' });
  const pw = h('input.input', { id: 'tpw', type: 'password', autocomplete: 'current-password', 'aria-describedby': 'tpw-help' });
  const btn = h('button.btn', { type: 'submit' }, 'Sign in');
  let close;
  const form = h('form', { novalidate: true },
    h('h2', 'Teacher sign-in'),
    h('p.muted', 'No name, ID, or block is needed. Enter the teacher password.'),
    err,
    h('div.field', h('label', { for: 'tpw' }, 'Teacher password'), pw, h('span.help', { id: 'tpw-help' }, app.isDemo ? 'Demo password: ' + app.demoTeacherPassword : 'Set from the Unit 8 menu in your Google Sheet (see SETUP.md).')),
    h('div.modal-actions', h('button.btn.secondary', { type: 'button', onclick: () => close() }, 'Cancel'), btn));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true; btn.textContent = 'Checking…'; mount(err);
    try {
      const r = await call('teacherLogin', { password: pw.value });
      if (r.ok) { session.set('tt', { token: r.teacherToken, exp: r.expiresAt }); close(); app.showTeacher(r.teacherToken); return; }
      mount(err, h('div.banner.bad', h('div', r.error.message))); pw.value = ''; pw.focus();
    } catch (e2) { mount(err, h('div.banner.bad', h('div', 'Could not reach the server. Check your connection and the API address in js/config.js.'))); }
    btn.disabled = false; btn.textContent = 'Sign in';
  });
  close = modal([form], { label: 'Teacher sign-in', onClose });
  setTimeout(() => pw.focus(), 40);
}

/* ------------------------------------------------------------------------------ dashboard */
export function teacherDashboard(root, app, token) {
  const T = async (action, payload) => {
    const r = await call(action, Object.assign({ tt: token }, payload || {}));
    if (!r.ok && r.error && r.error.code === 'TEACHER_AUTH') { session.del('tt'); app.signOut('Your teacher session expired. Sign in again.'); throw new Error('auth'); }
    return r;
  };
  const timers = [];
  const clearTimers = () => timers.splice(0).forEach((t) => clearInterval(t));
  const tabs = [
    ['preview', 'Preview', previewTab], ['monitor', 'Monitor', monitorTab], ['reset', 'Reset student', resetTab],
    ['settings', 'Settings', settingsTab], ['analytics', 'Analytics', analyticsTab], ['reference', 'Reference', referenceTab]
  ];
  const panel = h('div', { role: 'tabpanel', id: 'tpanel', tabindex: '-1' });
  const tablist = h('div.ttabs', { role: 'tablist', 'aria-label': 'Teacher tools' });
  let current = 'preview';

  function select(id) {
    current = id; clearTimers();
    tablist.querySelectorAll('.ttab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
    const t = tabs.find((x) => x[0] === id);
    mount(panel, h('div.spinner', { style: { margin: '40px auto' } }));
    t[2](panel).catch((e) => { if (e.message !== 'auth') mount(panel, h('div.banner.bad', h('div', 'Something went wrong loading this tab. ' + (e && e.message ? e.message : '')))); });
  }
  tabs.forEach(([id, label]) => tablist.appendChild(h('button.ttab', { type: 'button', role: 'tab', 'data-tab': id, 'aria-selected': 'false', 'aria-controls': 'tpanel', onclick: () => select(id) }, label)));

  mount(root,
    h('header.topbar', h('div.topbar-inner', h('div.brand', 'Teacher mode', h('small', 'Unit 8 · Family Life & Sexuality')), h('span'),
      h('div.topbar-right', app.isDemo ? h('span.tag', 'Demo') : null, h('button.btn.secondary.small', { type: 'button', onclick: async () => { try { await T('tLogout'); } catch (e) { /* already signed out */ } session.del('tt'); app.signOut(); } }, 'Sign out')))),
    h('main.tdash', { id: 'main' }, tablist, panel));
  select('preview');

  /* ----- helpers ----- */
  const statusPill = (r) => h('span.pill.' + ({ in_progress: 'prog', submitted: 'done', auto_submitted: 'auto' }[r.status] || 'none'), r.statusLabel);
  function table(headers, rows, cls) {
    return h('div.ttable-wrap', h('table.ttable' + (cls ? '.' + cls : ''), h('thead', h('tr', headers.map((x) => h('th', { scope: 'col' }, x)))), h('tbody', rows)));
  }
  function ask(title, fields, confirmLabel, body) {
    return new Promise((resolve) => {
      const inputs = fields.map((f) => f.type === 'select'
        ? h('select.input', { id: 'ask-' + f.k }, f.options.map((o) => h('option', { value: o }, o)))
        : h('input.input', { id: 'ask-' + f.k, type: f.type || 'text', value: f.value || '', min: f.min, max: f.max, autocomplete: 'off' }));
      const err = h('div', { role: 'alert' });
      let close;
      const done = (v) => { resolve(v); close(); }; // resolve FIRST: close() fires onClose, which resolves null, and a promise settles only once
      const form = h('form', { novalidate: true }, h('h2', title), body || null, err,
        fields.map((f, i) => h('div.field', h('label', { for: 'ask-' + f.k }, f.label), inputs[i], f.help ? h('span.help', f.help) : null)),
        h('div.modal-actions', h('button.btn.secondary', { type: 'button', onclick: () => done(null) }, 'Cancel'), h('button.btn' + (opts_danger(confirmLabel) ? '.danger' : ''), { type: 'submit' }, confirmLabel)));
      form.addEventListener('submit', (e) => { e.preventDefault(); const v = {}; fields.forEach((f, i) => { v[f.k] = inputs[i].value; }); if (fields[0] && fields[0].required && !String(v[fields[0].k]).trim()) { mount(err, h('div.banner.bad', h('div', 'Please fill this in.'))); return; } done(v); });
      close = modal([form], { label: title, onClose: () => resolve(null) });
    });
  }
  const opts_danger = (l) => /reset/i.test(l);
  const toast = (el, kind, text) => { mount(el, h('div.banner.' + kind, { role: 'status' }, h('div', text))); };

  /* ================================================================ preview */
  async function previewTab(p) {
    const msg = h('div');
    mount(p, h('div.tcard', h('h3', 'Preview the whole assessment'),
      h('p', 'Walk through every chapter exactly as a student sees it, with free navigation, every simulation playable, and an optional answer-key overlay with hints and explanations.'),
      h('ul', h('li', 'Preview answers are stored separately. They never appear in student records, the Master Dashboard, the roster, analytics, or exports.'),
        h('li', 'There is no timer in preview. Question order and stage locks are open.'),
        h('li', 'Items you have turned off in Settings still appear here so you can review them.')),
      msg,
      h('div.row', h('button.btn.big', { type: 'button', id: 'open-preview', onclick: async () => { const r = await T('tPreviewStart'); if (!r.ok) return toast(msg, 'bad', r.error.message); app.startPreview(token, r); } }, 'Open preview'),
        h('button.btn.secondary', { type: 'button', onclick: async () => { const r = await T('tPreviewReset'); toast(msg, r.ok ? 'ok' : 'bad', r.ok ? 'Your preview progress was cleared. Student records were not touched.' : r.error.message); } }, 'Reset my preview progress'))));
  }

  /* ================================================================ monitor */
  async function monitorTab(p) {
    let blockFilter = '', query = '', rows = [], serverNow = 0, fetchedAt = 0;
    const tbody = h('tbody');
    const summary = h('div.row.small.muted');
    const sel = h('select.input', { 'aria-label': 'Filter by block', style: { maxWidth: '200px' }, onchange: (e) => { blockFilter = e.target.value; load(); } }, h('option', { value: '' }, 'All blocks'), BLOCKS.map((b) => h('option', { value: b }, b)));
    const search = h('input.input', { type: 'search', placeholder: 'Search name or ID', 'aria-label': 'Search students', style: { maxWidth: '240px' }, oninput: (e) => { query = e.target.value.toLowerCase(); draw(); } });
    const heads = ['Student', 'ID', 'Block', 'Status', 'Time left', 'Chapter', 'Score so far', 'Tries', 'Allowed', 'Resets', ''];
    const tbl = h('div.ttable-wrap', h('table.ttable', h('thead', h('tr', heads.map((x) => h('th', { scope: 'col' }, x)))), tbody));
    mount(p, h('div.tcard', h('div.row', h('h3', { style: { margin: 0 } }, 'Class monitor'), h('span.grow'), sel, search, h('button.btn.secondary.small', { type: 'button', onclick: () => load() }, 'Refresh')), summary,
      h('p.small.muted', 'Shows students who have signed in. Refreshes every 15 seconds.'), tbl));
    async function load() {
      const r = await T('tRoster', { block: blockFilter || undefined });
      if (!r.ok) return;
      rows = r.rows; serverNow = r.serverNow; fetchedAt = Date.now(); draw();
    }
    const remain = (r) => (r.deadline && r.status === 'in_progress' ? r.deadline - (Date.now() + clock.offset) : null);
    function draw() {
      const list = rows.filter((r) => !query || (r.firstName + ' ' + r.lastName + ' ' + r.studentId).toLowerCase().includes(query))
        .sort((a, b) => (a.block + a.lastName).localeCompare(b.block + b.lastName));
      const c = { 'in progress': 0, 'not started': 0, submitted: 0, 'auto-submitted': 0 }; list.forEach((r) => { c[r.statusLabel]++; });
      mount(summary, h('span', list.length + ' students'), h('span', '· ' + c['in progress'] + ' in progress'), h('span', '· ' + c.submitted + ' submitted'), h('span', '· ' + c['auto-submitted'] + ' auto-submitted'), h('span', '· ' + c['not started'] + ' not started'));
      tbody.replaceChildren(...list.map((r) => {
        const tl = h('td.num', { 'data-sid': r.studentId }, r.status === 'in_progress' ? fmtClock(remain(r)) : r.submittedAt ? 'done ' + fmtTime(r.submittedAt) : '—');
        return h('tr', h('td', h('strong', r.lastName + ', ' + r.firstName)), h('td', r.studentId), h('td', r.block), h('td', statusPill(r)), tl,
          h('td', r.chapter || '—'), h('td.num', r.status === 'registered' || r.status === 'reset' ? '—' : r.points + '/' + r.possible + ' (' + pct(r.percent) + ')'), h('td.num', String(r.attempts)),
          h('td.num', r.allowedMinutes + ' min'), h('td.num', String(r.resetCount || 0)),
          h('td', h('div.row', { style: { gap: '4px', flexWrap: 'nowrap' } },
            h('button.btn.secondary.small', { type: 'button', onclick: () => detail(r) }, 'Details'),
            r.status !== 'submitted' && r.status !== 'auto_submitted' ? h('button.btn.secondary.small', { type: 'button', onclick: () => timeDialog(r) }, 'Time') : null)));
      }));
    }
    async function timeDialog(r) {
      const v = await ask('Time for ' + r.firstName + ' ' + r.lastName, [{ k: 'mode', label: 'What do you want to do?', type: 'select', options: ['Add minutes to this student', 'Set total minutes (accommodation, e.g. 135 = 1.5x)'] }, { k: 'n', label: 'Minutes', type: 'number', value: '15', min: '1', max: '600', help: 'Allowed: ' + r.allowedMinutes + ' min now. Total can be 10 to 600 minutes.' }], 'Save time');
      if (!v) return;
      const payload = v.mode.startsWith('Add') ? { addMinutes: Number(v.n) } : { allowedMinutes: Number(v.n) };
      const res = await T('tSetTime', Object.assign({ studentId: r.studentId }, payload));
      if (!res.ok) { modal([h('h2', 'Could not change the time'), h('p', res.error.message), h('div.modal-actions', h('button.btn', { type: 'button', onclick: (e) => e.target.closest('.overlay').remove() }, 'OK'))]); return; }
      load();
    }
    async function detail(r) {
      const d = await T('tStudent', { studentId: r.studentId });
      if (!d.ok) return;
      const rows2 = d.items.map((i) => h('tr', h('td', i.id), h('td', i.chapter), h('td.num', String(i.a)), h('td', i.ok ? 'correct' : i.l ? 'locked' : i.a ? 'in progress' : '—'), h('td.num', i.ok || i.l ? Math.round(i.c * 100) + '%' : '—'), h('td.num', i.earned + '/' + i.points)));
      const close = modal([h('h2', d.row.firstName + ' ' + d.row.lastName + ' · ' + d.row.studentId),
        h('p', d.row.block + ' · ' + d.row.statusLabel + ' · ' + d.result.points + '/' + d.result.possible + ' points (' + pct(d.result.percent) + ') · ' + d.result.answered + '/' + d.result.total + ' items finished'),
        d.history.length ? h('p.small.muted', d.history.length + ' earlier record(s) in History from resets.') : null,
        table(['Item', 'Chapter', 'Tries', 'State', 'Credit', 'Points'], rows2),
        h('div.modal-actions', h('button.btn', { type: 'button', onclick: () => close() }, 'Close'))], { wide: true, label: 'Student details' });
    }
    await load();
    timers.push(setInterval(load, 15000), setInterval(() => { document.querySelectorAll('td[data-sid]').forEach((td) => { const r = rows.find((x) => x.studentId === td.dataset.sid); if (r && r.status === 'in_progress') td.textContent = fmtClock(remain(r)); }); }, 1000));
  }

  /* ================================================================ reset */
  async function resetTab(p) {
    const out = h('div'), detailBox = h('div');
    let block = '', list = [];
    const sel = h('select.input', { id: 'rs-block', onchange: async (e) => { block = e.target.value; detailBox.replaceChildren(); await loadList(); } }, h('option', { value: '' }, 'Choose a block first'), BLOCKS.map((b) => h('option', { value: b }, b)));
    const search = h('input.input', { id: 'rs-search', type: 'search', placeholder: 'Search by name or ID', disabled: true, oninput: () => drawList() });
    const listEl = h('div.stack');
    mount(p, h('div.tcard', h('h3', 'Reset student progress'),
      h('p', 'A reset gives one student a fresh start. Their old record is copied to the History tab first. It is never deleted.'),
      h('div.grid.two', h('div.field', h('label', { for: 'rs-block' }, 'Block'), sel), h('div.field', h('label', { for: 'rs-search' }, 'Student'), search)), listEl, detailBox, out));
    async function loadList() {
      search.disabled = !block; search.value = '';
      if (!block) { listEl.replaceChildren(); return; }
      const r = await T('tRoster', { block }); list = r.ok ? r.rows : []; drawList();
    }
    function drawList() {
      const q = search.value.toLowerCase();
      const m = list.filter((r) => !q || (r.firstName + ' ' + r.lastName + ' ' + r.studentId).toLowerCase().includes(q));
      listEl.replaceChildren(m.length ? table(['Student', 'ID', 'Status', 'Score', ''], m.map((r) => h('tr', h('td', h('strong', r.lastName + ', ' + r.firstName)), h('td', r.studentId), h('td', statusPill(r)), h('td.num', r.status === 'registered' || r.status === 'reset' ? '—' : pct(r.percent)), h('td', h('button.btn.secondary.small', { type: 'button', onclick: () => show(r) }, 'View progress'))))) : h('p.muted', block ? 'No students match.' : ''));
    }
    async function show(r) {
      const d = await T('tStudent', { studentId: r.studentId }); if (!d.ok) return;
      mount(detailBox, h('div.tcard', { style: { background: 'var(--surface-2)' } }, h('h3', d.row.firstName + ' ' + d.row.lastName),
        h('div.tgrid', h('div.tstat', h('b', d.row.statusLabel), h('span', 'Status')), h('div.tstat', h('b', d.result.points + '/' + d.result.possible), h('span', 'Points so far (' + pct(d.result.percent) + ')')), h('div.tstat', h('b', d.result.answered + '/' + d.result.total), h('span', 'Items finished')), h('div.tstat', h('b', String(d.row.attempts)), h('span', 'Attempts used')), h('div.tstat', h('b', String(d.row.resetCount)), h('span', 'Earlier resets'))),
        h('div.row', { style: { marginTop: '12px' } }, h('button.btn.danger', { type: 'button', onclick: () => confirmReset(d.row) }, 'Reset Student Progress…'))));
    }
    async function confirmReset(row) {
      const v = await ask('Reset ' + row.firstName + ' ' + row.lastName + '?', [
        { k: 'lastName', label: 'Type the student’s last name to confirm', required: true, help: 'Type exactly: ' + row.lastName },
        { k: 'reason', label: 'Reason', type: 'select', options: ['Technical problem', 'Student was absent or interrupted', 'Teacher decision', 'Other'] }],
      'Reset progress', h('div', h('div.banner.warn', h('div', h('strong', 'This clears their answers and restores all attempts and a fresh time window. '), 'Their current record (', row.statusLabel, ', ', pct(row.percent), ') is copied to History first.'))));
      if (!v) return;
      const r = await T('tReset', { studentId: row.studentId, lastName: v.lastName, reason: v.reason });
      if (!r.ok) { toast(out, 'bad', r.error.message); return; }
      toast(out, 'ok', row.firstName + ' ' + row.lastName + ' was reset. Previous record saved to History (' + (r.previous.status || '') + ', ' + pct(r.previous.percent) + '). They can sign in and press Begin for a fresh attempt.');
      detailBox.replaceChildren(); loadList();
    }
  }

  /* ================================================================ settings */
  async function settingsTab(p) {
    const g = await T('tGetSettings'); if (!g.ok) return;
    const s = g.settings, msg = h('div');
    const codeIn = {}; BLOCKS.forEach((b) => { codeIn[b] = h('input.input', { id: 'code-' + b, value: s.classCodes[b] || '', maxlength: 24, autocapitalize: 'characters' }); });
    const minutes = h('input.input', { id: 'dmin', type: 'number', min: '10', max: '600', value: String(s.defaultMinutes), style: { maxWidth: '140px' } });
    const open = h('input', { type: 'checkbox', id: 'open', checked: s.open });
    const showScore = h('input', { type: 'checkbox', id: 'showscore', checked: s.showScore });
    const off = new Set(s.disabledItems);
    const byCh = {}; g.items.forEach((i) => { (byCh[i.chapter] = byCh[i.chapter] || []).push(i); });
    const totalEl = h('strong');
    function updTotal() { const on = g.items.filter((i) => !off.has(i.id)); totalEl.textContent = on.length + ' items on, ' + on.reduce((a, i) => a + i.points, 0) + ' points. Scores are shown out of 100%.'; }
    const itemRows = Object.keys(byCh).map((ch) => h('div', h('h4', ch.toUpperCase()), byCh[ch].map((i) => { const cb = h('input', { type: 'checkbox', checked: !off.has(i.id), id: 'it-' + i.id, onchange: (e) => { e.target.checked ? off.delete(i.id) : off.add(i.id); updTotal(); } }); return h('label.itoggle', { for: 'it-' + i.id }, cb, h('strong', i.id), h('span.muted', i.type + ' · ' + i.points + ' pts'), h('span')); })));
    updTotal();
    const gen = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let o = ''; const u = crypto.getRandomValues(new Uint8Array(6)); u.forEach((x) => { o += a[x % a.length]; }); return o; };
    const test = h('div');
    const pwBox = h('div');
    mount(p, h('div.tcard', h('h3', 'Assessment'),
      h('div.stack',
        h('label.options-row', open, h('span', h('strong', 'Assessment is open. '), 'Turn off to stop new students from signing in. Students already in progress can finish.')),
        h('label.options-row', showScore, h('span', h('strong', 'Show the score on the completion page. '), 'Turn off to hide it. Scores are always recorded for you.')),
        h('div.field', h('label', { for: 'dmin' }, 'Default time limit (minutes, counted from Begin)'), minutes, h('span.help', 'For one student, use Monitor > Time to set an accommodation such as 135 minutes.')))),
    h('div.tcard', h('h3', 'Class codes'), h('p.muted', 'One code per block. Students must pick the matching block and enter its code.'),
      h('div.codes', BLOCKS.map((b) => h('div.field', h('label', { for: 'code-' + b }, b), codeIn[b], h('button.btn.ghost.small', { type: 'button', onclick: () => { codeIn[b].value = gen(); } }, 'Generate new'))))),
    h('div.tcard', h('h3', 'Questions to include'), h('p.muted', 'Turn off any question you did not teach. Scores are re-scaled to 100%. Changes apply to students who press Begin after you save.'), h('p', totalEl), h('div.stack', itemRows)),
    h('div.tcard', msg, h('button.btn.big', { type: 'button', id: 'save-settings', onclick: async () => {
      const settings = { open: open.checked, showScore: showScore.checked, defaultMinutes: Number(minutes.value), classCodes: {}, disabledItems: Array.from(off) };
      BLOCKS.forEach((b) => { if (codeIn[b].value.trim()) settings.classCodes[b] = codeIn[b].value.trim(); });
      const r = await T('tSetSettings', { settings });
      toast(msg, r.ok ? 'ok' : 'bad', r.ok ? 'Settings saved.' : r.error.message);
    } }, 'Save settings')),
    h('div.tcard', h('h3', 'Change teacher password'), pwBox,
      h('div.row', h('input.input', { id: 'newpw', type: 'password', placeholder: 'New password (8+ characters)', autocomplete: 'new-password', style: { maxWidth: '320px' } }), h('button.btn.secondary', { type: 'button', onclick: async () => { const v = $('#newpw').value; const r = await T('tSetPassword', { newPassword: v }); toast(pwBox, r.ok ? 'ok' : 'bad', r.ok ? 'Password changed.' : r.error.message); if (r.ok) $('#newpw').value = ''; } }, 'Change password'))),
    h('div.tcard', h('h3', 'Test connection'), h('p.muted', 'Checks the password, class codes, item bank, and that this page and the server have the same version of the assessment.'),
      h('button.btn.secondary', { type: 'button', id: 'test-conn', onclick: async () => {
        mount(test, h('div.spinner'));
        const t0 = Date.now(); const r = await T('tTest'); const ms = Date.now() - t0;
        if (!r.ok) return mount(test, h('div.banner.bad', h('div', r.error.message)));
        const checks = r.checks.slice(); checks.push({ name: 'Round trip to the server', ok: true, detail: ms + ' ms' });
        const hashOk = !r.bank || r.bank.structureHash === app.content.structureHash;
        checks.push({ name: 'This page and the server have the same assessment version', ok: hashOk, detail: hashOk ? '' : 'The page content and the server item bank were built from different versions. Re-seed the item bank (SETUP.md step 6) or re-publish the site.' });
        mount(test, h('div', checks.map((c) => h('div.check-row', h('span', { class: c.ok ? 'ok' : 'no', 'aria-hidden': 'true' }, c.ok ? '✓' : '✗'), h('span', h('strong', c.name), c.detail ? h('span.muted', ' — ' + c.detail) : null), h('span.sr-only', c.ok ? 'passed' : 'failed')))));
      } }, 'Test Connection'), test));
  }

  /* ================================================================ analytics */
  async function analyticsTab(p) {
    const r = await T('tAnalytics'); if (!r.ok) return;
    const a = r.analytics;
    const align = await fetch('content/alignment.json').then((x) => x.json()).catch(() => ({ items: [] }));
    const topic = Object.fromEntries((align.items || []).map((i) => [i.id, i.topic]));
    const bars = (vals) => vals.map(([l, v]) => h('div.hbar', h('span', l), h('div.tr', h('i', { style: { width: (v || 0) + '%' } })), h('span.num', pct(v))));
    const totals = BLOCKS.reduce((t, b) => { const x = a.byBlock[b]; t.students += x.students; t.final += x.final; t.inProg += x.inProgress; return t; }, { students: 0, final: 0, inProg: 0 });
    mount(p,
      h('div.tgrid', h('div.tstat', h('b', String(totals.students)), h('span', 'Students signed in')), h('div.tstat', h('b', String(totals.final)), h('span', 'Submitted')), h('div.tstat', h('b', String(totals.inProg)), h('span', 'In progress')), h('div.tstat', h('b', String(a.autoSubmitCount)), h('span', 'Auto-submitted (time expired)')),
        h('div.tstat', h('b', a.completion.mean != null ? a.completion.mean + ' min' : '—'), h('span', 'Average time used' + (a.completion.median != null ? ' (median ' + a.completion.median + ')' : '')))),
      h('div.tcard', h('h3', 'Average by block'), table(['Block', 'Students', 'Submitted', 'In progress', 'Auto-submitted', 'Average %', 'Avg minutes'], BLOCKS.map((b) => { const x = a.byBlock[b]; return h('tr', h('td', b), h('td.num', String(x.students)), h('td.num', String(x.final)), h('td.num', String(x.inProgress)), h('td.num', String(x.auto)), h('td.num', pct(x.avgPercent)), h('td.num', x.avgMinutes == null ? '—' : String(x.avgMinutes))); }))),
      h('div.tcard', h('h3', 'Average by chapter (submitted students)'), h('div.tgrid', BLOCKS.map((b) => h('div', h('h4', b), a.byBlock[b].final ? bars(a.chapters.map((c) => [c.toUpperCase(), a.byBlock[b].chapterPercent[c]])) : h('p.muted', 'No submissions yet.'))))),
      h('div.tcard', h('h3', 'Most-missed questions'), a.mostMissed.length ? table(['Item', 'Topic', 'Avg credit', 'First try', 'Avg tries', 'Locked'], a.mostMissed.map((i) => h('tr', h('td', h('strong', i.id)), h('td', topic[i.id] || ''), h('td.num', pct(i.avgCreditPct)), h('td.num', pct(i.firstTryPct)), h('td.num', String(i.avgAttempts)), h('td.num', pct(i.lockedPct))))) : h('p.muted', 'Appears after the first submission.')),
      h('div.tcard', h('h3', 'Average attempts per item'), a.items.some((i) => i.n) ? table(['Item', 'Chapter', 'Students', 'Avg tries', 'First-try %'], a.items.filter((i) => i.n).map((i) => h('tr', h('td', i.id), h('td', i.chapter), h('td.num', String(i.n)), h('td.num', String(i.avgAttempts)), h('td.num', pct(i.firstTryPct))))) : h('p.muted', 'Appears after the first submission.')),
      h('div.tcard', h('h3', 'Within 10 minutes of the deadline'), a.nearDeadline.length ? table(['Student', 'Block', 'Time left'], a.nearDeadline.map((n) => h('tr', h('td', n.name), h('td', n.block), h('td.num', fmtMinutes(n.remainingMs))))) : h('p.muted', 'No one right now.')),
      h('div.tcard', h('h3', 'Reset history'), a.resets.length ? table(['When', 'Student', 'Block', 'Was', 'Score then', 'Reason'], a.resets.map((x) => h('tr', h('td', fmtTime(x.resetAt)), h('td', x.name + ' (' + x.studentId + ')'), h('td', x.block), h('td', x.previousStatus), h('td.num', pct(x.previousPercent)), h('td', x.reason || '')))) : h('p.muted', 'No resets.')),
      h('div.tcard', h('h3', 'Export'), h('p.muted', 'CSV opens in Excel or Google Sheets. You can also download the Google Sheet itself as .xlsx.'),
        h('div.row', h('button.btn.secondary', { type: 'button', onclick: async () => { const e = await T('tExport'); if (e.ok) download('unit8-roster.csv', toCsv(e.roster)); } }, 'Download roster and scores (CSV)'),
          h('button.btn.secondary', { type: 'button', onclick: async () => { const e = await T('tExport'); if (e.ok) download('unit8-items.csv', toCsv(e.items)); } }, 'Download per-item attempts (CSV)'))));
  }

  /* ================================================================ reference */
  async function referenceTab(p) {
    const [src, align] = await Promise.all([fetch('content/sources.json').then((x) => x.json()).catch(() => null), fetch('content/alignment.json').then((x) => x.json()).catch(() => null)]);
    const basisLabel = { district: 'District overview', standard: 'Course standard', blueprint: 'Blueprint only (confirm)' };
    mount(p,
      h('div.tcard', h('h3', 'Read this first'), h('div.banner.warn', h('div', h('strong', 'This assessment is provisional. '), 'The Unit 8 slides and notes were not available when it was built, so every question must be checked against your own materials. See docs/TEACHER_REVIEW.md in the repository. Use Settings to turn off anything you did not teach.'))),
      h('div.tcard', h('h3', 'Sources'), src ? h('div', h('p', src.status), src.sources.length ? h('ul', src.sources.map((s) => h('li', s.title + ' — ' + s.publisher + ' (' + s.url + ', accessed ' + s.accessed + ')'))) : h('p.muted', 'No web pages were opened (the build environment could not reach the web), so none are cited. Claims to verify:'),
        h('ul', (src.claims || []).map((c) => h('li', h('strong', c.id + ': '), c.claim, h('span.muted', ' [' + c.status + '; check: ' + c.check + ']'))))) : h('p.muted', 'sources.json not found.')),
      h('div.tcard', h('h3', 'Alignment matrix'), align ? h('div', h('h4', 'Objectives'), table(['ID', 'Basis', 'Objective', 'Items'], Object.keys(align.objectives).map((id) => h('tr', h('td', h('strong', id)), h('td', basisLabel[align.objectives[id].basis]), h('td', align.objectives[id].text), h('td', align.items.filter((i) => i.obj.includes(id)).map((i) => i.id).join(', '))))),
        h('h4', { style: { marginTop: '16px' } }, 'Items'), table(['Item', 'Chapter', 'Topic', 'Type', 'Pts', 'Level', 'Basis', 'Objectives'], align.items.map((i) => h('tr', h('td', h('strong', i.id)), h('td', i.chapter), h('td', i.topic), h('td', i.type), h('td.num', String(i.points)), h('td', i.cog), h('td', basisLabel[i.basis]), h('td', i.obj.join(', ')))), 'matrix')) : h('p.muted', 'alignment.json not found.')));
  }
}
