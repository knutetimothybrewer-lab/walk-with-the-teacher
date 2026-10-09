// Teacher-side helpers.  Every privileged call carries the teacher token; the SERVER decides whether it is valid.
import { call } from '../api.js';
import { S, nav } from '../state.js';
import { sstore, h, toast } from '../util.js';

export async function tcall(action, extra, opts) {
  if (!S.teacher || !S.teacher.token) { signOut('Please sign in again.'); return { ok: false, code: 'FORBIDDEN', message: 'Teacher sign-in required.' }; }
  const r = await call(action, Object.assign({ teacherToken: S.teacher.token }, extra || {}), opts || { tries: 3 });
  if (r && !r.ok && r.code === 'FORBIDDEN') { signOut('Your teacher session ended. Sign in again.'); }
  return r;
}
export async function signOut(msg) {
  const tok = S.teacher && S.teacher.token;
  S.teacher = null; S.preview = false; S.sess = null; S.content = {}; S.key = null; sstore.del('u5.teacher');
  if (tok) { try { await call('teacherLogout', { teacherToken: tok }, { tries: 1 }); } catch { /* ignore */ } }
  history.replaceState(null, '', location.pathname);
  if (msg) toast(msg, 3500);
  nav.go('login');
}

/** A confirm dialog that returns a promise.  `body` is a Node; `fields` lets the caller read inputs before closing. */
export function confirmDialog({ title, body, confirmLabel = 'Confirm', danger = false, needCheck = null }) {
  return new Promise((resolve) => {
    const ok = h('button', { class: 'btn ' + (danger ? 'btn-danger-solid' : 'btn-primary'), type: 'button' }, confirmLabel);
    const cancel = h('button', { class: 'btn', type: 'button' }, 'Cancel');
    let box = null;
    if (needCheck) { box = h('input', { type: 'checkbox', id: 'cd-check' }); ok.disabled = true; box.addEventListener('change', () => { ok.disabled = !box.checked; }); }
    const d = h('div', { class: 'scrim', style: 'z-index:150' }, h('div', { class: 'modal', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'cd-t' }, h('h2', { id: 'cd-t' }, title), body,
      needCheck ? h('label', { class: 'check-line', for: 'cd-check' }, box, ' ', needCheck) : null, h('div', { class: 'row', style: 'margin-top:1rem' }, ok, cancel)));
    const done = (v) => { d.remove(); document.removeEventListener('keydown', esc); resolve(v); };
    const esc = (e) => { if (e.key === 'Escape') done(false); };
    document.addEventListener('keydown', esc);
    ok.addEventListener('click', () => done(true)); cancel.addEventListener('click', () => done(false));
    document.body.append(d); (needCheck ? box : cancel).focus();
  });
}
export const fmtTime = (iso) => (iso ? String(iso).replace('T', ' ').slice(0, 16) + ' UTC' : '');
export const minLabel = (m) => (m == null ? '' : m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`);
