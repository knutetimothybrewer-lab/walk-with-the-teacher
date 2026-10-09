// Sign-in, teacher entry, and the pre-assessment briefing.  The timer does NOT start until "Begin Assessment" is confirmed.
import { h, md, mount, store, sstore, announce, $ } from './util.js';
import { call, isConnected } from './api.js';
import { CONFIG } from './config.js';
import { S, nav } from './state.js';
import { prefsPanel } from './prefs.js';

const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');

function oddsBackground() {
  const words = ['−110', '+250', '52.4%', '5.26%', '1 in 292M', 'EV < 0', 'P = 1/2', '18/38', '0.95ⁿ', '−150', '+120', '1.909×', 'house edge', '3 of 8'];
  const bg = h('div', { class: 'odds-bg', 'aria-hidden': 'true' });
  words.forEach((w, i) => { const s = h('span', null, w); s.style.left = ((i * 37) % 92) + '%'; s.style.fontSize = (1.1 + ((i * 7) % 5) * 0.5) + 'rem'; s.style.animationDuration = (38 + (i * 5) % 30) + 's'; s.style.animationDelay = (-i * 4.7) + 's'; bg.append(s); });
  return bg;
}
function topLinks() {
  const pf = () => { const d = h('div', { class: 'scrim', onclick: (e) => { if (e.target === d) d.remove(); } }, h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, prefsPanel(), h('p', null, h('button', { class: 'btn', type: 'button', onclick: () => d.remove() }, 'Close')))); document.body.append(d); };
  return h('div', { class: 'row', style: 'justify-content:flex-end;padding:.6rem 1rem' }, h('button', { class: 'btn btn-sm', type: 'button', onclick: pf }, '⚙ Display settings'));
}

export function renderNotConnected(root, detail) {
  document.body.dataset.ch = '1';
  mount(root, topLinks(), h('main', { id: 'main', class: 'page narrow enter' }, h('div', { class: 'hero' }, h('div', { class: 'kicker' }, 'Grade 10 Health · Unit 5'), h('h1', null, CONFIG.title)),
    h('div', { class: 'card' }, h('h2', null, isConnected() ? 'We could not reach the grading server' : 'This site is not connected yet'),
      isConnected() ? h('p', null, 'Check your internet connection and try again. If it keeps happening, tell your teacher.') : h('p', null, 'The assessment is installed, but it has not been connected to its Google Sheets grading server. Teachers: follow README step 5, then paste the web app URL into js/config.js.'),
      detail ? h('p', { class: 'muted small' }, detail) : null,
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => location.reload() }, 'Try again'))));
}

export function renderLogin(root, notice) {
  document.body.dataset.ch = '1';
  const f = {};
  const field = (key, label, el, hint) => { f[key] = el; return h('label', { class: 'field' }, h('span', null, label), el, hint ? h('small', { class: 'muted' }, hint) : null, h('div', { class: 'err', id: 'e-' + key, role: 'alert', hidden: true })); };
  const inp = (name, extra) => h('input', Object.assign({ class: 'input', name, autocomplete: 'off', required: true, maxlength: 40 }, extra));
  const sel = h('select', { class: 'input', name: 'block', required: true }, h('option', { value: '', disabled: true, selected: true }, 'Choose your block…'), (S.cfg ? S.cfg.blocks : CONFIG.blocks).map((b) => h('option', { value: b }, b)));
  const codeEl = inp('code', { autocapitalize: 'characters', maxlength: 24, spellcheck: 'false' });
  const form = h('form', { class: 'card login-card enter', novalidate: true },
    h('h2', null, 'Sign in'),
    h('div', { class: 'grid2' }, field('firstName', 'First name', inp('firstName', { autocomplete: 'given-name' })), field('lastName', 'Last name', inp('lastName', { autocomplete: 'family-name' }))),
    field('studentId', 'Student ID', inp('studentId', { maxlength: 20, inputmode: 'text' }), 'Use the same ID every time you sign in.'),
    field('block', 'Class block', sel, 'You cannot change this after you start.'),
    field('code', 'Class access code', codeEl, 'Your teacher gives you this code.'),
    h('div', { id: 'form-err', class: 'notice bad', role: 'alert', hidden: true }),
    notice ? h('div', { class: 'notice warn' }, notice) : null,
    h('button', { class: 'btn btn-primary btn-lg', type: 'submit', style: 'width:100%' }, 'Continue'),
    h('p', { class: 'muted small', style: 'margin-top:.9rem' }, 'We keep only your name, Student ID and block, to record your score. If your computer restarts or you close the tab, sign in again with the same information and your timer and answers will still be there.'));
  const shell = h('main', { id: 'main', class: 'page narrow' }, h('div', { class: 'hero enter' }, h('div', { class: 'kicker' }, 'Grade 10 Health · Unit 5 Summative'), h('h1', null, CONFIG.title), h('p', null, 'Investigate the math, the brain science, the marketing, and the decisions behind gambling. About 60 minutes of work; 90 minutes is the maximum.')), form);
  mount(root, oddsBackground(), topLinks(), shell);

  const showErr = (key, msg) => { const e = $('#e-' + key, form); if (!e) return; e.textContent = msg; e.hidden = !msg; if (f[key]) f[key].setAttribute('aria-invalid', msg ? 'true' : 'false'); };
  codeEl.addEventListener('input', () => { if (norm(codeEl.value) === norm(CONFIG.teacherShortcut)) renderTeacherAuth(root); });
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    ['firstName', 'lastName', 'studentId', 'block', 'code'].forEach((k) => showErr(k, ''));
    const v = { firstName: f.firstName.value.trim(), lastName: f.lastName.value.trim(), studentId: f.studentId.value.trim(), block: f.block.value, code: codeEl.value.trim() };
    const need = { firstName: 'Enter your first name.', lastName: 'Enter your last name.', studentId: 'Enter your Student ID.', block: 'Choose your class block.', code: 'Enter the class access code.' };
    const missing = Object.keys(need).filter((k) => !v[k]);
    if (missing.length) { missing.forEach((k) => showErr(k, need[k])); f[missing[0]].focus(); return; }
    const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Checking…';
    const res = await call('login', v);
    btn.disabled = false; btn.textContent = 'Continue';
    if (!res.ok) {
      const box = $('#form-err', form);
      if (res.field && f[res.field]) { showErr(res.field, res.message); f[res.field].focus(); box.hidden = true; } else { box.textContent = res.message || 'Sign-in failed.'; box.hidden = false; }
      announce(res.message || 'Sign-in failed', true); return;
    }
    S.sess = { sid: res.sessionId, token: res.token }; S.state = res.state; store.set('u5.sess', S.sess);
    nav.go(res.state.status === 'final' ? 'done' : res.state.status === 'active' ? 'assess' : 'brief');
  });
  setTimeout(() => f.firstName.focus(), 50);
}

export function renderTeacherAuth(root, msg) {
  document.body.dataset.ch = 't';
  const pw = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', 'aria-label': 'Teacher password', maxlength: 128 });
  const err = h('div', { class: 'notice bad', role: 'alert', hidden: !msg }, msg || '');
  const btn = h('button', { class: 'btn btn-primary btn-lg', type: 'submit', style: 'width:100%' }, 'Open Teacher Mode');
  const form = h('form', { class: 'card login-card enter' }, h('h2', null, 'Teacher Mode'),
    h('p', null, 'The teacher entry code was recognized. Enter your private teacher password. It is checked by the server, not by this page.'),
    h('label', { class: 'field' }, h('span', null, 'Teacher password'), pw), err, btn,
    h('p', { style: 'margin-top:1rem' }, h('button', { class: 'btn-link', type: 'button', onclick: () => nav.go('login') }, '← Back to student sign-in')));
  mount(root, h('main', { id: 'main', class: 'page narrow' }, h('div', { class: 'hero' }, h('div', { class: 'kicker' }, 'Teachers only'), h('h1', null, CONFIG.title)), form));
  setTimeout(() => pw.focus(), 50);
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); if (!pw.value) { err.textContent = 'Enter the password.'; err.hidden = false; return; }
    btn.disabled = true; btn.textContent = 'Checking…';
    const r = await call('teacherLogin', { password: pw.value });
    btn.disabled = false; btn.textContent = 'Open Teacher Mode';
    if (!r.ok) { err.textContent = r.message || 'Could not sign in.'; err.hidden = false; pw.value = ''; pw.focus(); return; }
    S.teacher = { token: r.teacherToken }; sstore.set('u5.teacher', r.teacherToken);
    nav.go('teacher');
  });
}

export function renderBriefing(root) {
  document.body.dataset.ch = '1';
  const st = S.state, s = st.student;
  const beginBtn = h('button', { class: 'btn btn-primary btn-lg', type: 'button' }, 'Begin Assessment');
  beginBtn.addEventListener('click', () => confirmBegin(beginBtn));
  mount(root, oddsBackground(), topLinks(), h('main', { id: 'main', class: 'page narrow enter' },
    h('div', { class: 'hero' }, h('div', { class: 'kicker' }, 'You are signed in'), h('h1', null, `Ready, ${s.first}?`), h('p', null, `${s.first} ${s.last} · ID ${s.studentId} · ${s.block}`)),
    h('div', { class: 'card briefing' }, h('h2', null, 'Before you begin'),
      h('ul', null,
        h('li', null, md(`**You have a maximum of 90 minutes.** The clock starts only when you press *Begin Assessment*. Most students need about an hour. The timer is kept by the server, so refreshing, closing the tab, or switching tabs does not pause or reset it.`)),
        h('li', null, md('**Six case files** (chapters) with six short simulations. Each question is worth points and every simulation feeds real questions.')),
        h('li', null, md('**Three attempts per question.** Press *Check answer* to submit an attempt. Incomplete answers never use an attempt. You get a hint after a miss, and an explanation if a question locks.')),
        h('li', null, md('**Your work saves automatically** after every answer. If something goes wrong, sign in again with the same information and carry on.')),
        h('li', null, md('**At 0:00** your finished answers are submitted automatically and the assessment locks. Unanswered questions earn 0.')),
        h('li', null, md('Everything with a **FICTIONAL** label is invented. Tokens are pretend. A calculator and a formula sheet are in the top bar.'))),
      h('table', { class: 'credit-table', 'aria-label': 'Credit for each attempt' }, h('thead', null, h('tr', null, h('th', null, 'Correct on'), h('th', null, 'Credit'))),
        h('tbody', null, [['1st attempt', '100%'], ['2nd attempt', '85%'], ['3rd attempt', '75%'], ['Not correct after 3', '0%']].map((r) => h('tr', null, h('td', null, r[0]), h('td', null, h('strong', null, r[1])))))),
      h('p', { class: 'muted small' }, 'Questions with several parts give partial credit using the same 100 / 85 / 75 scale.'),
      h('div', { class: 'row', style: 'margin-top:1rem' }, beginBtn, h('button', { class: 'btn-link', type: 'button', onclick: () => { store.del('u5.sess'); S.sess = null; nav.go('login'); } }, 'Not you? Sign out')))));
}

function confirmBegin(btn) {
  const close = () => d.remove();
  const go = h('button', { class: 'btn btn-primary btn-lg', type: 'button' }, 'Start the 90-minute timer');
  const d = h('div', { class: 'scrim' }, h('div', { class: 'modal', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'cb-t' }, h('h2', { id: 'cb-t' }, 'Start now?'), h('p', null, 'The 90-minute clock starts the moment you press the button below and cannot be paused.'), h('div', { class: 'row' }, go, h('button', { class: 'btn', type: 'button', onclick: close }, 'Not yet'))));
  document.body.append(d); go.focus();
  go.addEventListener('click', async () => {
    go.disabled = true; go.textContent = 'Starting…';
    const { payload } = await import('./state.js');
    const r = await call('begin', payload());
    close();
    if (!r.ok) { if (r.state) S.state = r.state; const n = h('div', { class: 'notice bad', role: 'alert' }, r.message || 'Could not start.'); btn.after(n); return; }
    S.state = r.state; nav.go('assess');
  });
}
