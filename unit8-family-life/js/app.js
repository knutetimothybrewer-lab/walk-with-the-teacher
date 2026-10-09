// Bootstrap and routing: sign-in -> ready -> assessment -> done, plus teacher mode and preview.
import * as api from './api.js';
import { h, mount, session, prefs, announce, sleep } from './util.js';
import { loginScreen, readyScreen, doneScreen, timeUpScreen, loadingScreen, errorScreen } from './screens.js';
import { startAssessment } from './assess.js';
import { openTeacherLogin, teacherDashboard } from './teacher.js';

const root = document.getElementById('app');
const app = {
  isDemo: api.isDemo, content: null, ping: null, demoCodes: {}, demoTeacherPassword: '', assessment: null,
  token: null, notReady: false, mismatch: false
};

document.documentElement.dataset.motion = prefs.get('motion') === 'reduced' ? 'reduced' : '';

function destroyAssessment() { if (app.assessment) { app.assessment.destroy(); app.assessment = null; } }

/* ------------------------------------------------------------------ screens */
function showLogin(notice) {
  destroyAssessment(); app.token = null; session.del('s');
  document.body.dataset.theme = 'lab';
  loginScreen(root, {
    isDemo: app.isDemo, demoCodes: app.demoCodes, demoTeacherPassword: app.demoTeacherPassword,
    notice: notice || (app.notReady ? { kind: 'warn', text: 'This assessment is not set up yet. Tell your teacher.' } : app.mismatch ? { kind: 'warn', text: 'This page and the assessment server are out of sync. Tell your teacher.' } : null),
    closed: app.ping && app.ping.open === false,
    onLogin, openTeacher: (onClose) => openTeacherLogin(app, onClose)
  });
}

async function onLogin(vals) {
  if (app.notReady) return 'This assessment is not set up yet. Tell your teacher.';
  if (app.mismatch) return 'This page and the assessment server are out of sync. Tell your teacher.';
  let r;
  try { r = await api.call('login', vals); } catch (e) { return 'Could not reach the server. Check your Wi-Fi and try again.'; }
  if (!r.ok) return r.error.message;
  app.token = r.token; session.set('s', { token: r.token });
  route(r, r.resumed);
  return null;
}

function route(view, resumed) {
  destroyAssessment();
  const s = view.session;
  if (view.completion) { doneScreen(root, app, view.completion, app.content); return; }
  if (s.status === 'in_progress') { openAssessment(view, resumed); return; }
  readyScreen(root, app, view.bank ? view : Object.assign({ bank: app.ping.bank }, view));
}

function openAssessment(view, resumed) {
  const state = { session: view.session, items: view.items, itemIds: view.itemIds, pos: view.pos, ui: view.ui || {} };
  app.assessment = startAssessment(root, {
    content: app.content, token: app.token, preview: false, state, resumed,
    finish, onFinish: (completion) => { destroyAssessment(); doneScreen(root, app, completion, app.content); },
    onFatal: handleFatal, onTimeUp: timeUp, signOut: () => signOut(), restartPreview: () => {}
  });
}

async function finish() {
  let r;
  try { r = await api.call('finish', { token: app.token, confirm: true }); } catch (e) { alert('Could not reach the server. Your answers are saved. Check your connection and try again.'); return false; }
  if (!r.ok) { if (r.completion) { destroyAssessment(); doneScreen(root, app, r.completion, app.content); return true; } handleFatal(r); return false; }
  destroyAssessment(); doneScreen(root, app, r.completion, app.content);
  return true;
}

function handleFatal(res) {
  const c = res.error && res.error.code;
  if ((c === 'EXPIRED' || c === 'FINALIZED') && res.completion) { destroyAssessment(); doneScreen(root, app, res.completion, app.content); return; }
  showLogin({ kind: 'warn', text: (res.error && res.error.message) || 'Please sign in again.' });
}

async function timeUp() {
  timeUpScreen(root);
  for (;;) {
    try {
      const r = await api.call('state', { token: app.token });
      if (r.ok && r.completion) { destroyAssessment(); doneScreen(root, app, r.completion, app.content); return; }
      if (!r.ok && r.completion) { destroyAssessment(); doneScreen(root, app, r.completion, app.content); return; }
      if (!r.ok) { handleFatal(r); return; }
    } catch (e) { /* offline: keep trying */ }
    await sleep(2000);
  }
}

async function onBegin() {
  let r;
  try { r = await api.call('begin', { token: app.token }); } catch (e) { return 'Could not reach the server. Check your connection and try again.'; }
  if (!r.ok) { if (r.error.code === 'NO_SESSION') { showLogin({ kind: 'warn', text: r.error.message }); return null; } return r.error.message; }
  route(r, false);
  return null;
}

function signOut(msg) {
  destroyAssessment();
  if (msg) { showLogin({ kind: 'warn', text: msg }); return; }
  showLogin();
}

/* ------------------------------------------------------------------ teacher + preview */
app.onBegin = onBegin; app.signOut = (m) => signOut(m);
app.showTeacher = (tt) => { destroyAssessment(); document.body.dataset.theme = 'lab'; teacherDashboard(root, app, tt); };
app.startPreview = (tt, view) => {
  destroyAssessment();
  const state = { session: view.session, items: view.items, itemIds: view.itemIds, pos: view.pos, ui: view.ui || {} };
  const ctx = {
    content: app.content, token: view.token, preview: true, teacherToken: tt, state,
    finish: async () => true, onFinish() {}, onFatal: () => app.showTeacher(tt), onTimeUp() {},
    signOut: () => app.showTeacher(tt),
    restartPreview: async () => { const r = await api.call('tPreviewStart', { tt }); if (r.ok) app.startPreview(tt, r); }
  };
  app.assessment = startAssessment(root, ctx);
};

/* ------------------------------------------------------------------ boot */
async function boot() {
  loadingScreen(root, 'Loading…');
  try { await api.init(); } catch (e) { errorScreen(root, 'Could not start', 'This page could not load all of its files. Reload the page. If it keeps happening, tell your teacher.', [h('button.btn', { onclick: () => location.reload() }, 'Reload')]); return; }
  if (app.isDemo) {
    const m = await import('./mock-api.js');
    app.demoCodes = m.DEMO.codes; app.demoTeacherPassword = m.DEMO.teacherPassword;
    document.body.appendChild(h('div.demo-ribbon', { role: 'note' }, 'DEMO MODE: a practice run with sample questions. Nothing is recorded. ', h('button.btn.ghost.small', { type: 'button', style: { display: 'inline-flex' }, onclick: () => m.resetDemo() }, 'Reset demo')));
  }
  let ping;
  try { ping = await api.call('ping'); } catch (e) {
    errorScreen(root, 'No connection', 'The page could not reach the assessment server. Check your Wi-Fi, then try again.', [h('button.btn', { onclick: () => location.reload() }, 'Try again')]); return;
  }
  if (!ping.ok) { errorScreen(root, 'Server problem', ping.error ? ping.error.message : 'The server did not answer correctly.', [h('button.btn', { onclick: () => location.reload() }, 'Try again')]); return; }
  app.ping = ping;
  if (!ping.bank) app.notReady = true;
  else {
    const url = ping.bank.contentSet === 'demo' ? 'content/demo/items.json' : 'content/items.json';
    try { app.content = await (await fetch(url, { cache: 'no-cache' })).json(); } catch (e) { errorScreen(root, 'Could not load the questions', 'The question file did not load. Reload the page.', [h('button.btn', { onclick: () => location.reload() }, 'Reload')]); return; }
    if (app.content.structureHash !== ping.bank.structureHash) app.mismatch = true;
  }
  // teacher already signed in this tab?
  const tt = session.get('tt');
  if (tt && tt.token && tt.exp > Date.now() + clockSkew()) { app.showTeacher(tt.token); return; }
  // student resuming in this tab (refresh)?
  const saved = session.get('s');
  if (saved && saved.token && !app.notReady && !app.mismatch) {
    try {
      const r = await api.call('state', { token: saved.token });
      if (r.ok) { app.token = saved.token; route(r, r.session.status === 'in_progress'); return; }
    } catch (e) { /* offline during a refresh: fall through to sign-in; the timer kept running on the server */ }
    session.del('s');
  }
  showLogin();
}
const clockSkew = () => api.clock.offset || 0;

boot();
