// Teacher preview: a toolbar above the real student interface plus an answer-key panel under every question.
// The preview is a separate server-side session ("PV-MAIN"); it can never read or write a student's record.
import { h, clear, store, toast, announce } from '../util.js';
import { S, nav } from '../state.js';
import { tcall, confirmDialog } from './tapi.js';

let keyPromise = null;
function ensureKey() {
  if (S.key) return Promise.resolve(S.key);
  if (!keyPromise) keyPromise = tcall('answerKey', { preview: true }).then((r) => { keyPromise = null; if (r.ok) { const map = {}; r.chapters.forEach((c) => c.steps.forEach((st) => { if (st.kind === 'item') map[st.id] = st; })); S.key = { map, chapters: r.chapters, totalPts: r.totalPts }; } return S.key; });
  return keyPromise;
}
export function invalidateKey() { S.key = null; keyPromise = null; }
export const showKey = () => store.get('u5.showkey', true) !== false;

const LV = { R: 'Remember', U: 'Understand', P: 'Apply', N: 'Analyze', E: 'Evaluate' };
/** Node placed under a question while previewing.  Fills in when the key arrives. */
export function keyPanel(itemId) {
  const wrap = h('div', { class: 'keypanel-wrap' });
  ensureKey().then((k) => {
    const st = k && k.map[itemId]; if (!st) { wrap.append(h('p', { class: 'muted small' }, 'Answer key unavailable.')); return; }
    const LO = window.U5_LO || {};
    wrap.append(h('details', { class: 'keypanel', open: true },
      h('summary', null, 'Teacher view: answer key, hints and explanation', h('span', { class: 'tag' }, `${st.pts} pts`)),
      h('div', { class: 'kp-body' },
        h('h4', null, 'Correct answer'), st.key.map((p) => h('p', { class: 'kp-key' }, p.text)),
        st.levels && st.levels.length ? h('p', { class: 'small muted' }, 'Cognitive level: ' + st.levels.map((l) => LV[l] || l).join(', ') + (st.variant ? ' · numbers differ for each student' : '')) : null,
        st.hints.length ? [h('h4', null, 'Hints (shown after a miss)'), h('ol', null, st.hints.map((x) => h('li', null, x)))] : null,
        h('h4', null, 'Explanation (shown after the question locks)'), h('p', null, st.explain),
        st.lo.length ? [h('h4', null, 'Learning objectives'), h('ul', { class: 'kp-lo' }, st.lo.map((id) => h('li', null, h('b', null, id + ': '), LO[id] ? LO[id].t : '')))] : null)));
  });
  return wrap;
}

/** Toolbar.  `api` comes from shell.js: goto, reload, reset, setDeadline, refresh, position. */
export function mountPreviewBar(el, api) {
  invalidateKey(); ensureKey();
  document.body.classList.toggle('hide-key', !showKey());
  const outline = (S.cfg && S.cfg.outline) || [];
  const chSel = h('select', { class: 'input', 'aria-label': 'Chapter' }, outline.map((c) => h('option', { value: c.id }, `${c.id}. ${c.title}`)));
  const stepSel = h('select', { class: 'input', 'aria-label': 'Step' });
  async function fillSteps() {
    const ch = Number(chSel.value), c = S.content[ch];
    clear(stepSel);
    if (!c) { stepSel.append(h('option', { value: 0 }, 'Start of chapter')); return; }
    c.steps.forEach((s, i) => stepSel.append(h('option', { value: i }, `${i + 1}. ${s.kind === 'item' ? s.item.title : s.title || s.kind}`)));
    stepSel.value = String(S.pos.ch === ch ? S.pos.step : 0);
  }
  chSel.addEventListener('change', async () => {
    const ch = Number(chSel.value);
    if (!S.content[ch]) { const { call } = await import('../api.js'); const { payload } = await import('../state.js'); const r = await call('content', payload({ chapter: ch })); if (r.ok) S.content[ch] = r.chapter; }
    fillSteps();
  });
  const go = h('button', { class: 'btn btn-sm', type: 'button', onclick: () => api.goto(Number(chSel.value), Number(stepSel.value) || 0) }, 'Go');
  const keyChk = h('input', { type: 'checkbox', id: 'pv-key' }); keyChk.checked = showKey();
  keyChk.addEventListener('change', () => { store.set('u5.showkey', keyChk.checked); document.body.classList.toggle('hide-key', !keyChk.checked); });

  const clockSel = h('select', { class: 'input', 'aria-label': 'Set preview timer to' }, [[20, '0:20'], [60, '1:00'], [300, '5:00'], [600, '10:00'], [1500, '25:00'], [1800, '30:00'], [5400, '90:00']].map((x) => h('option', { value: x[0] }, x[1])));
  clockSel.value = '60';
  const setClock = h('button', { class: 'btn btn-sm', type: 'button', onclick: async () => { const r = await tcall('previewSetClock', { seconds: Number(clockSel.value) }); if (!r.ok) return toast(r.message || 'Could not change the timer.'); S.state = r.state; api.setDeadline(r.state.deadline); api.refresh(); toast('Preview timer set. The student timer behaves exactly as it will for students.'); } }, 'Set timer');
  const scen = h('select', { class: 'input', 'aria-label': 'Fill scenario' }, [['first', 'Every question right on attempt 1'], ['second', 'Every question right on attempt 2'], ['third', 'Every question right on attempt 3'], ['wrong', 'Every question wrong (locked)']].map((x) => h('option', { value: x[0] }, x[1])));
  const fill = h('button', { class: 'btn btn-sm', type: 'button', onclick: async () => {
    const ok = await confirmDialog({ title: 'Fill the preview with answers?', body: h('p', null, 'This overwrites your preview answers only (never a student). Use it to test scoring, locking and the completion screen.'), confirmLabel: 'Fill preview' });
    if (!ok) return; const r = await tcall('previewScenario', { mode: scen.value });
    if (!r.ok) return toast(r.message || 'Could not fill the preview.'); S.state = r.state; await api.reload(); toast('Preview filled.');
  } }, 'Fill');
  const reset = h('button', { class: 'btn btn-sm btn-danger', type: 'button', onclick: async () => {
    const ok = await confirmDialog({ title: 'Reset My Preview Progress?', body: h('div', null, h('p', null, 'Clears every preview answer, attempt and simulation result and restarts the 90-minute preview timer. No student record is touched.')), confirmLabel: 'Reset my preview' });
    if (!ok) return; invalidateKey(); const r = await api.reset(); if (r && r.ok === false) toast(r.message || 'Could not reset.');
  } }, 'Reset My Preview Progress');
  const exit = h('button', { class: 'btn btn-sm btn-primary', type: 'button', onclick: () => { S.preview = false; S.sess = null; S.content = {}; invalidateKey(); nav.go('teacher'); } }, 'Exit preview');

  clear(el);
  el.append(h('div', { class: 'pvbar', role: 'region', 'aria-label': 'Teacher preview tools' },
    h('div', { class: 'pv-title' }, h('strong', null, 'TEACHER PREVIEW'), h('span', { class: 'small' }, ' Separate from the gradebook. Chapters are unlocked.')),
    h('div', { class: 'pv-row' }, h('label', { class: 'pv-f' }, h('span', null, 'Jump to'), chSel), h('label', { class: 'pv-f' }, h('span', null, 'Step'), stepSel), go,
      h('label', { class: 'pv-f' }, h('span', null, 'Timer test'), clockSel), setClock,
      h('label', { class: 'pv-f' }, h('span', null, 'Scenario'), scen), fill,
      h('label', { class: 'check-line' }, keyChk, ' Show answer key'), reset, exit)));
  const cur = () => api.position();
  chSel.value = String(cur().ch);
  fillSteps();
  // keep the menus in step with where the preview actually is, but only when the position CHANGED (never overwrite a choice being made)
  let synced = { ch: cur().ch, step: cur().step };
  const tick = setInterval(() => {
    if (!el.isConnected) return clearInterval(tick);
    const p = cur(); if (p.ch === synced.ch && p.step === synced.step) return;
    synced = { ch: p.ch, step: p.step }; chSel.value = String(p.ch); fillSteps();
  }, 800);
  announce('Teacher preview. Use the toolbar to jump to any chapter.');
}
