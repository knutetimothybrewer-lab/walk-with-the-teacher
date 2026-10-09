// Entry point and router.
import { $, mount, h, store, sstore } from './util.js';
import { call, isConnected } from './api.js';
import { S, nav, payload } from './state.js';
import { applyPrefs } from './prefs.js';
import { renderLogin, renderTeacherAuth, renderBriefing, renderNotConnected } from './login.js';
import { renderAssessment, teardown } from './shell.js';
import { renderDone } from './done.js';

const root = () => $('#app');
function go(screen) {
  const r = root();
  if (screen !== 'assess') teardown();
  if (screen !== 'assess' && screen !== 'done') document.body.dataset.ch = screen === 'teacher' ? 't' : '1';
  if (screen === 'login') { S.preview = false; renderLogin(r); }
  else if (screen === 'teacher-auth') renderTeacherAuth(r);
  else if (screen === 'brief') renderBriefing(r);
  else if (screen === 'assess') renderAssessment(r);
  else if (screen === 'done') renderDone(r);
  else if (screen === 'teacher') { document.body.dataset.ch = 't'; import('./teacher/dashboard.js').then((m) => m.renderTeacher(r)); }
  window.scrollTo(0, 0);
}
nav.go = go;

async function boot() {
  applyPrefs();
  const r = root();
  mount(r, h('main', { id: 'main', class: 'page narrow center', style: 'padding-top:20vh' }, h('h1', null, 'Behind the Odds'), h('p', { class: 'muted' }, 'Loading…')));
  if (!isConnected()) return renderNotConnected(r);
  const cfg = await call('config', {}, { tries: 3 });
  if (!cfg.ok) return renderNotConnected(r, cfg.message);
  S.cfg = cfg;
  // a teacher who refreshes while signed in goes straight back to Teacher Mode
  const tt = sstore.get('u5.teacher');
  if (tt && location.hash === '#teacher') { S.teacher = { token: tt }; const t = await call('teacherPing', { teacherToken: tt }); if (t.ok) return go('teacher'); sstore.del('u5.teacher'); }
  const saved = store.get('u5.sess');
  if (saved && saved.sid && saved.token) {
    S.sess = saved;
    const st = await call('state', payload(), { tries: 3 });
    if (st.ok) { S.state = st.state; return go(st.state.status === 'final' ? 'done' : st.state.status === 'active' ? 'assess' : 'brief'); }
    if (st.code === 'NO_SESSION') { store.del('u5.sess'); S.sess = null; return renderLogin(r, 'You were signed out. This can happen if your teacher reset your assessment. Sign in again to continue.'); }
    return renderNotConnected(r, st.message);
  }
  go('login');
}
boot();
