// Completion screen.  Shown whenever the server says the assessment is final (submitted, or time expired and auto-submitted).
import { h, md, mount, store, sstore, fmt, reducedMotion, $ } from './util.js';
import { S, nav } from './state.js';
import { svg } from './charts.js';
import { teardown } from './shell.js';

function ring(pct) {
  const R = 64, C = 2 * Math.PI * R;
  const arc = svg('circle', { cx: 80, cy: 80, r: R, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 14, 'stroke-linecap': 'round', 'stroke-dasharray': C, 'stroke-dashoffset': C, transform: 'rotate(-90 80 80)' });
  const label = svg('text', { x: 80, y: 90, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': 34, 'font-weight': 800 }, '0%');
  const root = svg('svg', { viewBox: '0 0 160 160', class: 'score-ring', role: 'img', 'aria-label': `Score ${fmt(pct, 1)} percent` }, svg('circle', { cx: 80, cy: 80, r: R, fill: 'none', stroke: 'var(--line)', 'stroke-width': 14 }), arc, label);
  const target = C * (1 - Math.min(100, pct) / 100), t0 = performance.now(), dur = reducedMotion() ? 1 : 1100;
  (function step(t) { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); arc.setAttribute('stroke-dashoffset', C + (target - C) * e); label.textContent = fmt(pct * e, 1) + '%'; if (k < 1) requestAnimationFrame(step); })(t0);
  return root;
}

export function renderDone(root) {
  teardown();
  document.body.dataset.ch = '7';
  const st = S.state, f = st.final, expired = f.type === 'expired';
  const kids = [];
  kids.push(h('div', { class: 'hero enter' }, h('div', { class: 'kicker' }, S.preview ? 'Teacher preview' : 'Assessment locked'),
    h('h1', { id: 'done-title', tabindex: '-1' }, expired ? 'Time expired' : 'Submitted'),
    h('p', null, expired ? 'Your finished answers were submitted automatically and the assessment is now locked. Any unanswered questions earn 0 points.' : 'Your answers are submitted and the assessment is locked. Thank you for your careful work.')));
  const card = h('div', { class: 'card enter' });
  card.append(h('div', { class: 'row between' }, h('div', null, h('strong', null, f.typeLabel), h('div', { class: 'muted small' }, `Student: ${st.student.first} ${st.student.last} · ${st.student.block}`)), h('div', { class: 'muted small mono', style: 'text-align:right' }, `Receipt ${f.receipt}`, h('br'), `Time used: ${fmt(f.timeUsedMin, 1)} min`)));
  if (f.resultsShown !== 'hidden' && f.pct != null) {
    card.append(h('div', { style: 'margin:1rem 0' }, ring(f.pct)), h('p', { class: 'center' }, h('strong', null, `${fmt(f.earned, 1)} of ${f.possible} points`)));
    if (f.chapters) card.append(h('div', { class: 'chapter-bars' }, f.chapters.map((c) => h('div', { class: 'bar-row' }, h('span', null, `${c.id}. ${c.title}`), h('span', { class: 'track', role: 'img', 'aria-label': `${fmt(c.earned, 1)} of ${c.possible} points` }, h('i', { style: `width:${c.possible ? Math.round(100 * c.earned / c.possible) : 0}%` })), h('span', { class: 'mono' }, `${fmt(c.earned, 1)}/${c.possible}`)))));
  } else card.append(h('p', { class: 'notice' }, 'Your teacher will share your results.'));
  kids.push(card);
  kids.push(h('div', { class: 'card enter muted small' }, h('p', null, S.preview ? 'This was a teacher preview. No grade was recorded and no student record was changed.' : 'Your score is recorded in your teacher’s gradebook. You cannot change your answers. If you think something went wrong, tell your teacher; only a teacher can reopen the assessment.'),
    h('p', null, md('If anything in this unit worried you, talk with your school counselor or another trusted adult. The National Problem Gambling Helpline is free, confidential and open 24/7: **1-800-GAMBLER** (1-800-426-2537) or **1-800-522-4700**, or visit ncpgambling.org.'))));
  const actions = h('div', { class: 'row', style: 'justify-content:center;margin-top:1rem' });
  if (S.preview) {
    actions.append(h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => { const { call } = await import('./api.js'); const r = await call('previewReset', { teacherToken: S.teacher.token }); if (r.ok) { S.sess = { sid: r.sessionId, token: r.token }; S.state = r.state; S.content = {}; S.sims = {}; S.pos = { ch: 1, step: 0 }; nav.go('assess'); } } }, 'Reset My Preview Progress'),
      h('button', { class: 'btn', type: 'button', onclick: () => { S.preview = false; S.sess = null; S.content = {}; nav.go('teacher'); } }, 'Back to Teacher Mode'));
  } else actions.append(h('button', { class: 'btn', type: 'button', onclick: () => { store.del('u5.sess'); S.sess = null; S.state = null; S.content = {}; S.sims = {}; nav.go('login'); } }, 'Sign out on this computer'));
  kids.push(actions);
  mount(root, h('main', { id: 'main', class: 'page narrow' }, kids));
  const t = $('#done-title'); if (t) t.focus();
}
