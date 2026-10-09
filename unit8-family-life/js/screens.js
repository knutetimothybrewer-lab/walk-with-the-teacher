// Full-page screens: loading, sign-in, ready (before Begin), completion, errors.
import { h, svg, mount, announce, normCode, prefs, rich } from './util.js';

// Move focus to the first control only if the user has not already started interacting (never steal focus from typing).
function focusIfIdle(el) { setTimeout(() => { const a = document.activeElement; if (!a || a === document.body || a === document.documentElement) el.focus(); }, 50); }

const BLOCKS = ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9'];

export function loadingScreen(root, text) {
  mount(root, h('div.center-screen', h('div.big-card', { role: 'status', style: { textAlign: 'center' } }, h('div.spinner', { style: { margin: '0 auto 16px' } }), h('p', text || 'Loading…'))));
}

export function errorScreen(root, title, message, actions) {
  mount(root, h('div.center-screen', h('div.big-card', { role: 'alert', style: { maxWidth: '560px' } }, h('h1', title), h('p', message), h('div.row', actions || []))));
}

/* ------------------------------------------------------------------------------------------ sign in */
export function loginScreen(root, app) {
  const err = h('div', { role: 'alert' });
  const mk = (id, label, extra) => { const input = h('input.input', Object.assign({ id, name: id, type: 'text', autocomplete: 'off', required: true }, extra || {})); return { input, field: h('div.field', h('label', { for: id }, label), input) }; };
  const first = mk('first', 'First name', { autocomplete: 'given-name', maxlength: 40 });
  const last = mk('last', 'Last name', { autocomplete: 'family-name', maxlength: 40 });
  const sid = mk('sid', 'Student ID', { maxlength: 20, inputmode: 'text', 'aria-describedby': 'sid-help' });
  const block = h('select.input', { id: 'block', name: 'block', required: true }, h('option', { value: '' }, 'Choose your class block'), BLOCKS.map((b) => h('option', { value: b }, b)));
  const code = mk('code', 'Class code', { maxlength: 24, autocapitalize: 'characters', spellcheck: 'false', 'aria-describedby': 'code-help' });
  const btn = h('button.btn.big', { type: 'submit' }, 'Continue');
  let teacherOpened = false;

  code.input.addEventListener('input', () => {
    if (normCode(code.input.value).replace(/[^A-Z0-9]/g, '') === 'WALKTEACHER' && !teacherOpened) { teacherOpened = true; code.input.value = ''; app.openTeacher(() => { teacherOpened = false; }); }
  });

  const form = h('form.form', { novalidate: true, 'aria-labelledby': 'signin-h' },
    h('h2', { id: 'signin-h' }, 'Sign in'),
    h('p.muted', 'Enter your details to begin. Your timer does not start until you press Begin on the next screen.'),
    err, first.field, last.field,
    h('div.field', h('label', { for: 'sid' }, 'Student ID'), sid.input, h('span.help', { id: 'sid-help' }, 'The ID number your school gave you (3 to 20 letters or numbers).')),
    h('div.field', h('label', { for: 'block' }, 'Class block'), block),
    h('div.field', h('label', { for: 'code' }, 'Class code'), code.input, h('span.help', { id: 'code-help' }, 'Your teacher will tell you the code for your block.')),
    btn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const vals = { firstName: first.input.value.trim(), lastName: last.input.value.trim(), studentId: sid.input.value.trim(), block: block.value, classCode: code.input.value.trim() };
    const missing = [[first.input, vals.firstName, 'first name'], [last.input, vals.lastName, 'last name'], [sid.input, vals.studentId, 'student ID'], [block, vals.block, 'class block'], [code.input, vals.classCode, 'class code']].filter((x) => !x[1]);
    [first.input, last.input, sid.input, block, code.input].forEach((i) => i.removeAttribute('aria-invalid'));
    if (missing.length) { missing.forEach((m) => m[0].setAttribute('aria-invalid', 'true')); mount(err, h('div.banner.bad.form-error', h('div', 'Please fill in your ' + missing.map((m) => m[2]).join(', ') + '.'))); missing[0][0].focus(); return; }
    btn.disabled = true; btn.textContent = 'Signing in…'; mount(err);
    const msg = await app.onLogin(vals);
    btn.disabled = false; btn.textContent = 'Continue';
    if (msg) { mount(err, h('div.banner.bad.form-error', h('div', msg))); announce(msg, 'assertive'); }
  });

  mount(root, h('div.center-screen', h('div.panel',
    h('aside.side', h('div.kicker', 'Unit 8 · Family Life & Sexuality'), h('h1', 'Life Decisions: The Health & Relationships Investigation'),
      h('ul',
        h('li', h('b', '1'), h('span', 'Six short chapters. About an hour of real work. You have up to 90 minutes once you press Begin.')),
        h('li', h('b', '2'), h('span', 'You pick, sort, order, or enter a number. There is nothing to write.')),
        h('li', h('b', '3'), h('span', 'Every person and place is fictional. No question asks about you.')),
        h('li', h('b', '4'), h('span', 'If a topic is hard for you, tell your teacher or a school counselor. That is always okay.'))),
      app.isDemo ? h('div.banner.warn', h('div', h('strong', 'Demo mode. '), 'This is a practice run. Nothing is recorded. Class codes: ', Object.entries(app.demoCodes).map(([b, c]) => b + ' = ' + c).join(', '), '. Teacher password: ', h('code', app.demoTeacherPassword), '.')) : null),
    form)));
  if (app.notice) { mount(err, h('div.banner.' + (app.notice.kind || 'warn') + '.form-error', h('div', app.notice.text))); }
  if (app.closed) mount(err, h('div.banner.warn.form-error', h('div', 'This assessment is not open right now. If you already started, you can still sign in to continue.')));
  focusIfIdle(first.input);
}

/* ------------------------------------------------------------------------------------------ ready (before Begin) */
export function readyScreen(root, app, view) {
  const s = view.session, total = view.bank ? view.bank.itemCount : null;
  const mins = s.allowedMinutes || 90;
  const reduce = prefs.get('motion') === 'reduced';
  const cb = h('input', { type: 'checkbox', checked: reduce, onchange: (e) => { const v = e.target.checked ? 'reduced' : 'full'; prefs.set('motion', v); document.documentElement.dataset.motion = v === 'reduced' ? 'reduced' : ''; } });
  const err = h('div', { role: 'alert' });
  const begin = h('button.btn.big', { type: 'button', id: 'begin-btn', onclick: async () => { begin.disabled = true; begin.textContent = 'Starting…'; const m = await app.onBegin(); if (m) { begin.disabled = false; begin.textContent = 'Begin Assessment'; mount(err, h('div.banner.bad', h('div', m))); } } }, 'Begin Assessment');
  mount(root, h('div.center-screen', h('div.big-card', { style: { width: 'min(820px,100%)' } },
    h('div.kicker.small.muted', 'Ready, ' + s.firstName),
    h('h1', 'Before you begin'),
    s.status === 'reset' ? h('div.banner.ok', { style: { marginBottom: '12px' } }, h('div', 'Your teacher reset your progress. You have a fresh start and a fresh time window.')) : null,
    h('p', 'You are signed in as ', h('strong', s.firstName + ' ' + s.lastName), ' in ', h('strong', s.block), '.'),
    h('div.ready-grid',
      h('div.fact', h('b', mins + ' min'), h('span', 'Starts when you press Begin and keeps running if you leave, refresh, or lose Wi-Fi.')),
      h('div.fact', h('b', '3 tries'), h('span', 'Per question: full credit on try 1, 85% on try 2, 75% on try 3. After three misses the question locks and shows an explanation.')),
      h('div.fact', h('b', total ? total + ' questions' : '6 chapters'), h('span', 'Six chapters. You can move between pages freely and finish in any order.'))),
    h('ul',
      h('li', 'Your answers save as you go. Look for “Saved” at the top.'),
      h('li', 'All questions are choices, sorting, ordering, or a number. There is nothing to type.'),
      h('li', 'Hints appear after a miss. They help you think; they do not give the answer.'),
      h('li', 'Submit at the end from the Review page. If time runs out, your work is submitted automatically and anything unanswered scores 0.')),
    h('div.options-row', h('label', cb, 'Reduce motion and animation')),
    err,
    h('div.row', { style: { marginTop: '20px' } }, begin, h('button.btn.ghost', { type: 'button', onclick: () => app.signOut() }, 'Sign out')))));
  focusIfIdle(begin);
}

/* ------------------------------------------------------------------------------------------ completion */
export function doneScreen(root, app, completion, content) {
  const auto = completion.submissionType && completion.submissionType.indexOf('Expired') >= 0;
  const chaptersById = Object.fromEntries((content ? content.chapters : []).map((c) => [c.id, c]));
  let scoreBlock = null;
  if (completion.showScore !== false && completion.percent != null) {
    const pct = completion.percent, to = 440 * (1 - Math.max(0, Math.min(100, pct)) / 100);
    const ring = svg('svg', { class: 'ring', viewBox: '0 0 200 200', role: 'img', 'aria-label': 'Score ' + pct + ' percent' },
      svg('circle', { class: 'track', cx: 100, cy: 100, r: 70, fill: 'none', 'stroke-width': 16 }),
      svg('circle', { class: 'val', cx: 100, cy: 100, r: 70, fill: 'none', 'stroke-width': 16, transform: 'rotate(-90 100 100)' }),
      svg('text', { x: 100, y: 108, 'font-size': 38, 'font-weight': 800 }, pct + '%'),
      svg('text', { x: 100, y: 134, 'font-size': 14 }, completion.points + ' / ' + completion.possible + ' points'));
    ring.querySelector('.val').style.setProperty('--to', String(to));
    const bars = Object.keys(completion.chapters || {}).map((id) => { const c = completion.chapters[id], p = c.possible ? c.earned / c.possible * 100 : 0, ch = chaptersById[id];
      const i = h('i'); setTimeout(() => { i.style.width = p + '%'; }, 80);
      return h('div.chbar', { 'data-theme': ch ? ch.theme : 'lab' }, h('span', ch ? 'Ch. ' + ch.n + ' ' + ch.title : id), h('div.track', i), h('span.num', c.earned + '/' + c.possible)); });
    scoreBlock = h('div.score-wrap', ring, h('div.chbars', h('h3', 'By chapter'), bars));
  }
  mount(root, h('div.center-screen', h('div.big-card', { style: { width: 'min(860px,100%)' }, role: 'status' },
    h('div.kicker.small.muted', auto ? 'Time expired' : 'Submitted'),
    h('h1', auto ? 'Time is up. Your work was submitted.' : 'Your assessment is submitted.'),
    h('p', auto ? 'The 90-minute limit ended, so everything you finished was saved and submitted automatically. Questions you did not finish score 0.' : 'Your answers are locked. Thank you for your careful work.'),
    completion.answered != null ? h('p.muted', completion.answered + ' of ' + completion.total + ' questions finished.') : null,
    scoreBlock || h('div.banner', h('div', 'Your teacher will share your results.')),
    h('div.row', { style: { marginTop: '20px' } }, h('button.btn.secondary', { type: 'button', onclick: () => app.signOut() }, 'Sign out')))));
  announce(auto ? 'Time is up. Your work was submitted.' : 'Your assessment is submitted.');
}

export function timeUpScreen(root) {
  mount(root, h('div.center-screen', h('div.big-card', { role: 'alert', style: { textAlign: 'center', maxWidth: '520px' } }, h('h1', 'Time is up'), h('p', 'Submitting your work…'), h('div.spinner', { style: { margin: '0 auto' } }), h('p.small.muted', { id: 'timeup-status' }, 'If your connection dropped, this page keeps trying. Your saved answers are safe.'))));
  announce('Time is up. Submitting your work.', 'assertive');
}
