// Unit 7: Nutrition & Physical Activity. Application controller (screens, flow, persistence, submission).
import { CONFIG } from './config.js';
import { sha256, h, fmtDur } from './util.js';
import { makeStore, storageWorks } from './storage.js';
import { Session, newState, gradeLocal, buildSubmission, partsOf } from './engine.js';
import { canon } from './canon.js';
import { buildItem } from './items.js';
import { SCENES } from './sims.js';
import { setBackground, heroWave, icon } from './visuals.js';
import { send, hasBackend } from './transport.js';
import { renderResults } from './results.js';
import { setSound } from './sound.js';
import { SOURCES } from './sources.js';

const content = (await import(CONFIG.gradingMode === 'server' ? '../content/public.server.js' : '../content/public.js')).default;
const $main = document.getElementById('main'), $top = document.getElementById('topbar'), $trail = document.getElementById('trail'), $hud = document.getElementById('hud');
const params = new URLSearchParams(location.search);
let PREVIEW = false, store = makeStore(CONFIG.storagePrefix), session = null, current = null, resultsView = null, submitTimer = null, settings = {};
const api = {}; // exposed to Preview Mode only
const hashOf = (salt, v) => sha256(CONFIG.hashSalt + '|' + salt + '|' + String(v).trim());
export const codeHash = (kind, v) => hashOf(kind, v);

// ---------------------------------------------------------------------------------- settings, sources, toast
function applySettings() {
  const r = document.documentElement;
  r.dataset.motion = settings.motion === 'reduced' ? 'reduced' : settings.motion === 'full' ? 'full' : '';
  r.dataset.size = settings.large ? 'large' : ''; r.dataset.font = settings.dyslexic ? 'dyslexic' : '';
  setSound(!!settings.sound); document.getElementById('clockwrap').hidden = !settings.timer;
}
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3200); }
function openSettings() {
  const d = document.getElementById('dlg');
  const tog = (key, label, desc) => { const i = h('input.switch', { type: 'checkbox', id: 'st-' + key, checked: !!settings[key], 'aria-describedby': 'sd-' + key }); i.onchange = () => { settings[key] = i.checked; store.setSettings(settings); applySettings(); }; return h('div.toggle', h('label', { for: 'st-' + key }, h('strong', label), h('div.small.muted', { id: 'sd-' + key }, desc)), i); };
  const motion = h('select.input', { 'aria-label': 'Animation' }, ['', 'reduced', 'full'].map((v) => h('option', { value: v, selected: (settings.motion || '') === v }, v === '' ? 'Follow my device setting' : v === 'reduced' ? 'Reduce motion' : 'Full animation')));
  motion.onchange = () => { settings.motion = motion.value; store.setSettings(settings); applySettings(); };
  d.replaceChildren(h('h2', 'Display and sound'),
    tog('large', 'Larger text', 'Makes text bigger across the assessment.'), tog('dyslexic', 'Dyslexia-friendly font', 'Uses the OpenDyslexic typeface.'),
    h('div.toggle', h('label', h('strong', 'Animation'), h('div.small.muted', 'Motion never carries information that is not also in text.')), motion),
    tog('sound', 'Sound effects', 'Short tones after you check an answer. Off by default.'), tog('timer', 'Show timer', 'Shows time on task in the top bar. Off by default.'),
    storageWorks() ? '' : h('p.err', 'This browser is blocking saved progress. Do not close this tab.'),
    h('div.dlg-actions', h('button.btn.primary', { type: 'button', onclick: () => d.close() }, 'Done')));
  d.showModal();
}
function openSources() {
  const d = document.getElementById('dlg');
  d.replaceChildren(h('h2', 'Sources / Learn More'), h('p.small.muted', 'Statistics and guidelines in this assessment come from these public-health and research sources. Links open in a new tab; your progress here is saved.'),
    h('ul.src-list', { style: { paddingLeft: '1.1rem', maxHeight: '55vh', overflow: 'auto' } }, SOURCES.map((s) => h('li', h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.title), h('div.small', s.org + '. ' + s.used)))),
    h('div.dlg-actions', h('button.btn.primary', { type: 'button', onclick: () => d.close() }, 'Close')));
  d.showModal();
}
document.getElementById('btn-settings').onclick = openSettings;
document.getElementById('btn-sources').onclick = openSources;

// ---------------------------------------------------------------------------------- shell helpers
function clearCurrent() { if (current) { try { current.scene && current.scene.destroy && current.scene.destroy(); } catch { /* ignore */ } current = null; } }
function setScreen(node, { theme } = {}) { clearCurrent(); resultsView = null; if (theme) setBackground(theme); $main.replaceChildren(node); window.scrollTo(0, 0); $main.focus({ preventScroll: true }); }
function buildTrail() {
  const ol = h('ol');
  content.missions.forEach((m, i) => { const li = h('li', h('span.node', { 'aria-hidden': 'true' }, i + 1), h('span.tip', `${m.kicker.replace('MISSION ', 'M')} ${m.title}`), h('span.sr-only', `Mission ${i + 1}: ${m.title}`)); if (i < content.missions.length - 1) li.append(h('span.seg', h('i'))); ol.append(li); });
  $trail.replaceChildren(ol);
}
function updateTrail() {
  if (!session) return;
  const { m } = session.state.pos, items = $trail.querySelectorAll('li');
  items.forEach((li, i) => {
    const mission = session.plan.missions[i], real = mission.resolved.filter((st) => st.kind !== 'choice'), done = real.filter((st) => session.stageDone(st)).length, frac = real.length ? done / real.length : 0;
    li.classList.toggle('done', frac === 1 || i < m); li.classList.toggle('cur', i === m);
    li.setAttribute('aria-current', i === m ? 'step' : 'false');
    const seg = li.querySelector('.seg i'); if (seg) seg.style.width = (frac === 1 || i < m ? 100 : i === m ? frac * 100 : 0) + '%';
  });
  updateHud();
}
/** Progress only (never the grade). */
function updateHud() {
  if (!session) return;
  const s = session.state, pr = session.progress(), m = s.pos.m >= 0 ? session.plan.missions[s.pos.m] : null;
  document.body.classList.toggle('in-test', true);
  const pct = s.completedAt ? 100 : Math.round(pr.frac * 100);
  $hud.replaceChildren(h('span.cur', m ? `${m.kicker}: ${m.title}` : 'Getting started'), h('span.bar', { role: 'progressbar', 'aria-label': 'Assessment progress', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct }, h('i', { style: { width: pct + '%' } })), h('span.pct', pct + '% done'),
    m && s.pos.s >= 0 && !s.completedAt ? h('span.stepc', `Step ${Math.min(s.pos.s + 1, m.resolved.length)} of ${m.resolved.length}`) : '');
}
let clockIv = null;
function startClock() { clearInterval(clockIv); clockIv = setInterval(() => { if (!session || session.state.completedAt) return; session.tickActive(); const sec = Math.floor(session.state.activeMs / 1000); document.getElementById('clock').textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; if (sec % 10 === 0) session.save(); }, 1000); }

// ---------------------------------------------------------------------------------- grading
async function grade(q, resp, n) {
  if (CONFIG.gradingMode === 'server' || (!q.h && hasBackend())) {
    const r = await send('check', { sid: session.state.sid, qid: q.id, n, resp: canon(q.type, resp) });
    if (!r || !r.ok) { const e = new Error(r && r.error || 'network'); e.server = true; throw e; }
    if (r.explain) (session.serverExplain = session.serverExplain || {})[q.id] = r.explain;
    return !!r.correct;
  }
  const g = gradeLocal(content, q, resp);
  if (g === null) throw new Error('no-key');
  return g;
}

// ---------------------------------------------------------------------------------- entry
const normName = (s) => s.trim().replace(/\s+/g, ' ');
const studentKey = (st) => [`${st.first} ${st.last}|${st.block}`, st.code];
function screenEntry(message, kind = 'err') {
  $top.hidden = true; $hud.hidden = true; document.body.classList.remove('in-test'); clearInterval(clockIv);
  setBackground('entry');
  const first = h('input.input#f-first', { type: 'text', autocomplete: 'off', required: true, maxlength: 40, 'aria-describedby': 'e-msg' });
  const last = h('input.input#f-last', { type: 'text', autocomplete: 'off', required: true, maxlength: 40, 'aria-describedby': 'e-msg' });
  const block = h('select.input#f-block', { required: true }, h('option', { value: '' }, 'Choose a block…'), CONFIG.blocks.map((b) => h('option', { value: b }, b)));
  const code = h('input.input#f-code', { type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', required: true, maxlength: 30, 'aria-describedby': 'e-msg' });
  const msg = h('div.err#e-msg', { role: 'alert' }, message || '');
  if (kind === 'ok') msg.style.color = 'var(--good)';
  const btn = h('button.btn.primary', { type: 'submit' }, 'Begin', icon('arrow', 20));
  let fails = 0, lockUntil = 0;
  const form = h('form.panel', { novalidate: true, 'aria-labelledby': 'f-h' },
    h('div.seal-note', h('span', { 'aria-hidden': 'true' }, '🔒'), 'Secure assessment portal'),
    h('h2#f-h', 'Sign in to begin'),
    h('div.grid2', h('div.field', h('label', { for: 'f-first' }, 'First name'), first), h('div.field', h('label', { for: 'f-last' }, 'Last name'), last)),
    h('div.grid2', h('div.field', h('label', { for: 'f-block' }, 'Class block'), block), h('div.field', h('label', { for: 'f-code' }, 'Class code'), code)),
    msg, h('div.row', btn, h('span.small.muted', 'About an hour. Your progress saves automatically if the page refreshes.')));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const f = normName(first.value), l = normName(last.value), cd = code.value.trim(), bl = block.value;
    msg.style.color = '';
    if (cd && hashOf('preview', cd) === CONFIG.previewPasscodeHash) { // teacher code: open the click-through walk-through
      try { sessionStorage.setItem('u7.previewOK', '1'); } catch { /* ignore */ }
      location.href = location.pathname + '?preview'; return;
    }
    if (!f) { msg.textContent = 'Please enter your first name.'; first.focus(); return; }
    if (!l) { msg.textContent = 'Please enter your last name.'; last.focus(); return; }
    if (!bl || !CONFIG.blocks.includes(bl)) { msg.textContent = 'Choose your class block from the list.'; block.focus(); return; }
    if (!cd) { msg.textContent = 'Enter the class code your teacher gave you.'; code.focus(); return; }
    if (Date.now() < lockUntil) { msg.textContent = `Too many tries. Wait ${Math.ceil((lockUntil - Date.now()) / 1000)} seconds.`; return; }
    btn.disabled = true; msg.textContent = 'Checking…';
    try {
      const r = await beginSession({ first: f, last: l, block: bl, code: cd });
      if (r !== true) { msg.textContent = r; if (/code/i.test(r)) { fails++; if (fails >= 5) { lockUntil = Date.now() + 15000; fails = 0; } } btn.disabled = false; }
    } catch (err) { msg.textContent = 'Something went wrong: ' + (err && err.message || err); btn.disabled = false; }
  };
  const teacherBtn = h('button', { type: 'button', onclick: teacherReset }, 'Teacher reset'), srcBtn = h('button', { type: 'button', onclick: openSources }, 'Sources / Learn More');
  const screen = h('section.screen', h('div.hero',
    h('div', h('div.kicker', 'Grade 10 Health • Digital Summative'), h('h1', h('span', 'Unit 7'), h('br'), 'Nutrition & Physical Activity'),
      h('p.lead', 'Seven missions. Read labels, move with purpose, spot manipulation, build goals and think about the food system. Show what you can do with what you learned.'),
      heroWave(), CONFIG.schoolName || CONFIG.teacherName ? h('p.small.muted', [CONFIG.schoolName, CONFIG.teacherName].filter(Boolean).join(' • ')) : ''),
    form), h('p.footlinks', srcBtn, ' • ', teacherBtn));
  setScreen(screen, { theme: 'entry' }); first.focus();
}

/** Teacher-only: clears the "already submitted" lock on THIS device (and asks the server to allow a retake). */
function teacherReset() {
  const d = document.getElementById('dlg');
  const pass = h('input.input', { type: 'password', autocomplete: 'off', 'aria-label': 'Teacher reset code' });
  const f = h('input.input', { placeholder: 'Student first name', 'aria-label': 'Student first name' }), l = h('input.input', { placeholder: 'Student last name', 'aria-label': 'Student last name' });
  const b = h('select.input', { 'aria-label': 'Class block' }, CONFIG.blocks.map((x) => h('option', { value: x }, x)));
  const out = h('div.err', { role: 'alert' });
  d.replaceChildren(h('h2', 'Teacher reset'), h('p.small.muted', 'Enter the teacher reset code, then the student to reset. This clears the lock on this device and, if a Google Sheet is connected, marks the earlier submission as superseded so a retake is allowed.'),
    h('div.field', h('label', 'Teacher reset code'), pass), h('div.grid2', h('div.field', f), h('div.field', l)), h('div.field', b), out,
    h('div.dlg-actions', h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), h('button.btn.primary', { type: 'button', onclick: async () => {
      if (hashOf('reset', pass.value) !== CONFIG.resetCodeHash) { out.textContent = 'That reset code is not correct.'; return; }
      const st = { first: normName(f.value), last: normName(l.value), block: b.value };
      if (!st.first || !st.last) { out.textContent = 'Enter the student\'s first and last name.'; return; }
      for (const code of CONFIG.classCodes) store.clearLock(...studentKey({ ...st, code: code.toUpperCase() }));
      const cur = store.loadSession(); if (cur && cur.student && cur.student.first === st.first && cur.student.last === st.last) store.clearSession();
      let server = '';
      if (hasBackend()) { const r = await send('reset_student', { resetCode: pass.value, ...st, assessmentId: CONFIG.assessmentId }); server = r && r.ok ? ' The Google Sheet was updated.' : ` (Sheet not updated: ${r && r.error || 'no reply'}.)`; }
      d.close(); toast('Reset complete for ' + st.first + ' ' + st.last + '.' + server);
    } }, 'Reset this student')));
  d.showModal();
}

const validLocalCode = (c) => CONFIG.classCodes.some((x) => x.trim().toUpperCase() === c.trim().toUpperCase());
async function beginSession({ first, last, block, code }) {
  const st0 = { first, last, block, code: code.trim().toUpperCase() };
  let label = '';
  if (store.isLocked(...studentKey(st0))) {
    const r = hasBackend() ? await send('validate', { code, first, last, block, assessmentId: CONFIG.assessmentId }) : null;
    if (!(r && r.ok && r.reset)) return 'This assessment was already submitted from this device. Ask your teacher if you need it reset.';
    store.clearLock(...studentKey(st0));
  }
  if (hasBackend()) {
    const r = await send('validate', { code, first, last, block, assessmentId: CONFIG.assessmentId });
    if (r && r.ok) { label = r.label || ''; if (r.reset) store.clearLock(...studentKey(st0)); }
    else if (r && r.error === 'invalid-code') return 'That class code is not valid. Check it and try again.';
    else if (r && r.error === 'invalid-block') return 'That class block is not recognized. Choose it again from the list.';
    else if (r && r.error === 'already-completed') return 'Our records show this assessment was already submitted. Ask your teacher if it needs to be reset.';
    else if (CONFIG.allowOfflineStart && validLocalCode(code)) toast('Could not reach the server. Starting offline; results will send when the connection returns.');
    else return 'Could not reach the server to check your class code. Check your connection and try again.';
  } else if (!validLocalCode(code)) return 'That class code is not valid. Check it and try again.';
  const state = newState({ student: { ...st0, label }, demo: false, content });
  session = new Session(state, content, store);
  if (hasBackend()) {
    const r = await send('start', { sid: state.sid, assessmentId: CONFIG.assessmentId, student: state.student, seed: state.seed, versionId: state.versionId, contentVersion: state.contentVersion, startedAt: state.startedAt, stageIds: state.stageIds });
    if (!r || !r.ok) {
      if (r && r.error === 'already-completed') return 'Our records show this assessment was already submitted. Ask your teacher if it needs to be reset.';
      if (CONFIG.gradingMode === 'server') return 'Could not start a secure session. Check your connection and try again.';
    }
  }
  session.save(); buildTrail(); afterStart(); return true;
}
function afterStart() { $top.hidden = false; $hud.hidden = false; applySettings(); startClock(); go(); }

// ---------------------------------------------------------------------------------- router
function go() {
  const s = session.state;
  if (s.completedAt) return screenResults();
  if (s.screen === 'orient') return screenOrient();
  if (s.screen === 'review') return screenReview();
  return renderStage();
}

// ---- Mission 0: orientation with an unscored practice question
function practiceStub() {
  const holder = { rec: null };
  const stub = {
    state: { seed: 'practice' }, rec: () => holder.rec,
    beginAttempt(q, resp) { const rec = holder.rec || (holder.rec = { attempts: [], status: 'open' }); const a = { n: rec.attempts.length + 1, resp, c: canon(q.type, resp), t: Date.now(), correct: null }; rec.attempts.push(a); return { rec, a }; },
    finishAttempt(q, pend, ok) { pend.a.correct = ok; if (ok) pend.rec.status = 'correct'; else if (pend.a.n >= 3) pend.rec.status = 'locked'; return pend.rec.status; },
    cancelAttempt() {}, explanation: () => 'Apples and bananas are fruits. Carrots and broccoli are vegetables. (This practice question does not count.)'
  };
  const q = { id: 'practice', type: 'sort', pts: 0, prompt: 'Practice: drag each item to a category, or tap an item and then tap a category. Then press Check answer.', bins: [['f', 'Fruit'], ['v', 'Vegetable']], items: [['a', 'Apple'], ['b', 'Carrot'], ['c', 'Banana'], ['d', 'Broccoli']], hints: ['Think about which plant part each food is.'] };
  const ans = { a: 'f', b: 'v', c: 'f', d: 'v' };
  return buildItem(q, { session: stub, seed: 'practice', grade: async (qq, resp) => canon('sort', resp) === canon('sort', ans) });
}
function screenOrient() {
  $top.hidden = false; $hud.hidden = false; updateTrail();
  const pi = practiceStub(); pi.el.querySelector('.pts').textContent = 'Practice • not scored';
  const cont = h('button.btn.primary', { type: 'button', onclick: () => { session.state.screen = 'mission'; session.save(); startMission(0); } }, 'Start Mission 1', icon('arrow', 20));
  const screen = h('section.screen', h('div.kicker', 'System check'), h('h1', 'Welcome, ', session.state.student.first + '.'),
    h('p.lead', 'This is an assessment built like a journey. You will move through seven missions: some are readings, some are models you can play with, and some are decisions.'),
    h('div.steps3',
      h('div.panel', h('h3', '1. Answer, then check'), h('p', 'Choose or build your answer, then press Check answer. Changing your answer before you check does not use an attempt.')),
      h('div.panel', h('h3', '2. Three attempts'), h('div.credit-table', h('div', h('b', '100%'), 'Attempt 1'), h('div', h('b', '85%'), 'Attempt 2'), h('div', h('b', '75%'), 'Attempt 3'), h('div', h('b', '0'), 'Not solved')), h('p.small.muted', { style: { marginTop: '.5rem' } }, 'After a wrong answer you get a hint, not the answer. After the third wrong attempt the question locks and you see a short explanation.')),
      h('div.panel', h('h3', '3. Your progress is saved'), h('p', 'If the page refreshes or closes, reopen this link and sign in again with the same name and block. You will return to where you were, and used attempts stay used. Your grade is shown only after you submit.'))),
    h('div.panel', h('h3', 'Try it: practice question'), pi.el),
    h('div.panel', h('div.row.spread', h('div', h('strong', 'Need larger text, a different font, or less motion?'), h('div.small.muted', 'Open Settings (the gear in the top bar) at any time. Sources for the data are under the book icon.')), h('button.btn', { type: 'button', onclick: openSettings }, 'Open settings'))),
    h('div.navrow', h('span.status', 'About 50 to 60 minutes. Take your time with the simulations.'), cont));
  setScreen(screen, { theme: 'entry' }); updateTrail();
}

// ---- missions
async function startMission(mi) {
  const s = session.state, mission = session.plan.missions[mi];
  s.pos = { m: mi, s: -1 }; session.save(); setBackground(mission.theme); updateTrail();
  const reduced = document.documentElement.dataset.motion === 'reduced' || (matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.motion !== 'full');
  const wipe = h('div.wipe', { role: 'dialog', 'aria-label': `${mission.kicker}: ${mission.title}`, tabindex: 0 }, h('div.wipe-inner', h('div.kicker', mission.kicker), h('div.num', { 'aria-hidden': 'true' }, mi === 6 ? '★' : String(mi + 1)), h('div.ttl', mission.title), h('p.sub', mission.blurb), h('div.conn', h('i')), h('p.small.muted', { style: { marginTop: '.8rem' } }, 'Click or press any key to continue')));
  document.body.appendChild(wipe); wipe.focus();
  const finish = () => { if (wipe._done) return; wipe._done = true; wipe.classList.add('out'); setTimeout(() => wipe.remove(), 650); s.pos = { m: mi, s: 0 }; session.save(); renderStage(); };
  wipe.onclick = finish; wipe.onkeydown = finish;
  setTimeout(finish, reduced ? 900 : 3600);
}
function renderStage() {
  const s = session.state, mi = s.pos.m, mission = session.plan.missions[mi];
  if (s.pos.s < 0) return startMission(mi);
  const stages = mission.resolved, si = Math.min(s.pos.s, stages.length - 1), stage = stages[si];
  clearCurrent(); $top.hidden = false; $hud.hidden = false; setBackground(mission.theme); updateTrail();
  const nextBtn = h('button.btn.primary', { type: 'button' }), status = h('span.status');
  const lastMission = mi === content.missions.length - 1;
  const backBtn = h('button.btn.ghost', { type: 'button', onclick: () => { if (si > 0) { s.pos.s = si - 1; session.save(); renderStage(); } } }, icon('back', 20), 'Previous step');
  backBtn.hidden = si === 0;
  const advance = () => {
    if (si < stages.length - 1) { s.pos.s = si + 1; session.save(); renderStage(); }
    else if (mi < content.missions.length - 1) startMission(mi + 1);
    else { s.screen = 'review'; session.save(); screenReview(); }
  };
  const label = (done) => nextBtn.replaceChildren(si === stages.length - 1 ? (lastMission ? 'Finish and review' : 'Complete mission') : 'Continue', icon('arrow', 20));
  nextBtn.onclick = () => { if (PREVIEW || session.stageDone(stage)) advance(); };

  if (stage.kind === 'choice') {
    const chosen = () => session.state.choices && session.state.choices[stage.id];
    const cards = h('div.opts', { role: 'radiogroup', 'aria-label': stage.prompt }, stage.opts.map(([k, t]) => {
      const b = h('button.opt', { type: 'button', role: 'radio', 'aria-checked': chosen() === k ? 'true' : 'false' }, h('span.mark', { 'aria-hidden': 'true' }, '✓'), h('span.t', t));
      b.onclick = () => { session.setChoice(stage.id, k); cards.querySelectorAll('.opt').forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false')); apply(); toast('Choice saved. You can continue.'); };
      return b;
    }));
    const apply = () => { nextBtn.disabled = !chosen() && !PREVIEW; status.textContent = chosen() ? 'Choice made.' : 'Make a choice to continue.'; updateHud(); };
    const screen = h('section.screen.narrow', h('div.stagehead', h('div', h('div.kicker', `${mission.kicker} • ${mission.title}`), h('h2', stage.title)), h('div.count', `Step ${si + 1} of ${stages.length}`)),
      h('div.panel', stage.paras.map((p) => h('p', p)), h('p', h('strong', stage.prompt)), cards), h('div.navrow', h('div.row', backBtn, status), nextBtn));
    setScreen(screen, { theme: mission.theme }); label(); apply(); current = { stage };
    return;
  }

  const items = {}, parts = partsOf(stage), isScene = stage.kind === 'scene';
  const ictx = { session, seed: s.seed, grade, onChange: (q, st) => afterChange(q, st) };
  const list = h('div.itemlist');
  parts.forEach((q) => { const it = buildItem(q, ictx); items[q.id] = it; list.append(it.el); });
  const sim = isScene ? (s.sims[stage.id] = s.sims[stage.id] || {}) : null;
  const hostEl = h('div.simhost');
  function applyGates() {
    parts.forEach((q) => { const ok = session.partAvailable(q, stage.id); items[q.id].setGated(!ok && !PREVIEW, q.after === '@sim' ? 'Finish exploring the activity above to unlock this question.' : 'Answer the question above first.'); });
    const done = session.stageDone(stage);
    nextBtn.disabled = !done && !PREVIEW; status.textContent = done ? 'Step complete.' : PREVIEW ? 'Teacher walk-through: you can continue without answering.' : `Complete ${parts.length > 1 ? 'every question' : 'this question'} to continue.`;
    label(); updateTrail();
  }
  function afterChange(q, st) {
    session.save();
    applyGates();
    if (session.stageDone(stage)) setTimeout(() => { nextBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); nextBtn.focus({ preventScroll: true }); }, 350);
    else { const nx = parts.find((p) => !session.isDone(p.id) && session.partAvailable(p, stage.id)); if (nx && (st === 'correct' || st === 'locked')) setTimeout(() => items[nx.id].el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300); }
  }
  const head = h('div.stagehead', h('div', h('div.kicker', `${mission.kicker} • ${mission.title}`), isScene ? h('h2', stage.title) : ''), h('div.count', `Step ${si + 1} of ${stages.length}`));
  const body = isScene ? h('div.scene-stack', h('p.lead.small', stage.lead), hostEl, list) : h('div.scene-layout.solo', list);
  const screen = h('section.screen', head, body, h('div.navrow', h('div.row', backBtn, status), nextBtn));
  setScreen(screen, { theme: mission.theme });
  current = { stage, items };
  if (isScene) {
    const ctx = { stage, session, content, sim, items, save: () => session.save(), markReady: () => { session.save(); applyGates(); }, isDone: (id) => session.isDone(id) };
    hostEl.className = 'simhost';
    current.scene = SCENES[stage.scene](hostEl, ctx);
    if (sim.ready === undefined) sim.ready = false;
  }
  applyGates();
  api.refresh = renderStage;
}

// ---- review + final submission
function screenReview() {
  $top.hidden = false; $hud.hidden = false; updateTrail();
  const screen = h('section.screen.narrow', h('div.kicker', 'Final step'), h('h1', 'Ready to submit?'),
    h('p.lead', `You have finished all ${session.parts.length} questions. When you submit, your answers are final and this attempt is locked.`),
    h('div.panel', h('p', 'Your results will be shown after you submit. You will not be able to change any answers.'),
      h('div.row', h('button.btn.ghost', { type: 'button', onclick: () => { session.state.screen = 'mission'; const mi = session.plan.missions.length - 1; session.state.pos = { m: mi, s: session.plan.missions[mi].resolved.length - 1 }; session.save(); renderStage(); } }, icon('back', 20), 'Go back'),
        h('button.btn.primary#final-btn', { type: 'button', onclick: confirmSubmit }, 'FINAL SUBMISSION'))));
  setScreen(screen, { theme: 'final' });
}
function confirmSubmit() {
  const d = document.getElementById('dlg');
  d.replaceChildren(h('h2', 'Final submission'), h('p', 'You are about to submit your Unit 7 assessment. You will not be able to change your answers after submission.'),
    h('div.dlg-actions', h('button.btn', { type: 'button', onclick: () => d.close() }, 'Not yet'), h('button.btn.primary#confirm-submit', { type: 'button', onclick: () => { d.close(); finalize(); } }, 'Yes, submit')));
  d.showModal();
}
async function finalize() {
  const s = session.state;
  if (s.completedAt) return;
  session.settlePending(); s.completedAt = Date.now(); s.submit = { status: 'sending', confirm: 'PENDING-' + s.sid.slice(2, 8) };
  session.save(); store.setLock(...studentKey(s.student), { sid: s.sid, t: s.completedAt });
  screenResults(); await trySubmit();
}
async function trySubmit() {
  const s = session.state; if (s.submit.status === 'done') return;
  if (!hasBackend() || PREVIEW) { s.submit = { status: 'nobackend', confirm: 'LOCAL-' + s.sid.slice(2, 10) }; session.save(); resultsView && resultsView.paintStatus(s.submit); return; }
  s.submit.status = 'sending'; resultsView && resultsView.paintStatus(s.submit);
  const r = await send('submit', buildSubmission(session, CONFIG.assessmentId));
  if (r && r.ok) { s.submit = { status: 'done', confirm: r.confirmationId, duplicate: !!r.duplicateFlag, mismatch: !!r.mismatch }; if (r.score && typeof r.score.earned === 'number') s.serverScore = r.score; }
  else if (r && (r.error === 'already-completed' || r.error === 'duplicate')) { s.submit = { status: 'done', confirm: r.confirmationId || 'ALREADY-SUBMITTED' }; }
  else { s.submit = { status: 'error', confirm: s.submit.confirm }; clearTimeout(submitTimer); submitTimer = setTimeout(trySubmit, 20000); }
  session.save(); if (resultsView) { resultsView.paintStatus(s.submit); if (s.serverScore && s.submit.status === 'done') screenResults(); }
}
window.addEventListener('online', () => { if (session && session.state.completedAt && session.state.submit.status !== 'done') trySubmit(); });

function receipt() {
  const s = session.state, t = session.totals();
  const blob = new Blob([JSON.stringify({ student: `${s.student.first} ${s.student.last}`, block: s.student.block, version: s.versionId, completed: new Date(s.completedAt).toISOString(), confirmation: s.submit.confirm, session: s.sid, ...(CONFIG.studentResults === 'hidden' ? {} : { pointsEarned: t.earned, pointsPossible: t.possible, percent: t.pct }) }, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `unit7-receipt-${s.student.last}-${s.student.first}.json` }); document.body.append(a); a.click(); a.remove();
}
function screenResults() {
  $top.hidden = false; $hud.hidden = false; updateTrail(); setBackground('results');
  const s = session.state; let t = session.totals();
  if (s.serverScore && s.serverScore.possible) t = { ...t, earned: s.serverScore.earned, possible: s.serverScore.possible, pct: Math.round(s.serverScore.earned / s.serverScore.possible * 1000) / 10 };
  const host = document.createElement('div'); setScreen(host, { theme: 'results' });
  resultsView = renderResults(host, { session, totals: t, submit: s.submit, onRetry: trySubmit, onDownload: receipt, previewNote: PREVIEW, mode: CONFIG.studentResults, scoring: CONFIG.scoring });
  $trail.querySelectorAll('li').forEach((li) => { li.classList.add('done'); li.classList.remove('cur'); const seg = li.querySelector('.seg i'); if (seg) seg.style.width = '100%'; });
  updateHud();
  if (s.submit.status !== 'done' && s.submit.status !== 'nobackend' && s.submit.status !== 'sending') trySubmit();
}

// ---------------------------------------------------------------------------------- boot
async function boot() {
  if (params.has('preview')) {
    let verified = false; try { verified = sessionStorage.getItem('u7.previewOK') === '1'; } catch { /* ignore */ }
    // In-page passcode form (a pop-up box can be blocked by the browser). A wrong code says so instead of silently leaving.
    $top.hidden = true; setBackground('entry');
    if (!verified) await new Promise((resolve) => {
      const inp = h('input.input#pv-pass', { type: 'password', autocomplete: 'off', 'aria-label': 'Preview Mode passcode', placeholder: 'Preview Mode passcode' });
      const msg = h('div.err', { role: 'alert' });
      const form = h('form.panel', { onsubmit: (e) => { e.preventDefault(); if (hashOf('preview', inp.value) === CONFIG.previewPasscodeHash) { try { sessionStorage.setItem('u7.previewOK', '1'); } catch { /* ignore */ } resolve(); } else { msg.textContent = 'That passcode is not correct. Check for typos and try again.'; inp.select(); } } },
        h('h2', 'Preview Mode (teacher)'), h('p.muted', 'Enter the teacher passcode to preview the assessment. This is not a student attempt.'), h('div.field', inp), msg,
        h('div.row', h('button.btn.primary#pv-go', { type: 'submit' }, 'Open Preview Mode'), h('a.btn.ghost', { href: location.pathname }, 'Back to student sign-in')));
      $main.replaceChildren(h('section.screen.narrow', h('div.kicker', 'Teacher only'), form)); inp.focus();
    });
    PREVIEW = true; store = makeStore(CONFIG.storagePrefix + 'p'); document.body.classList.add('preview');
  }
  settings = store.getSettings(); applySettings(); buildTrail();
  window.addEventListener('pagehide', () => session && session.save());
  document.addEventListener('visibilitychange', () => session && session.save());
  const saved = store.loadSession();
  if (saved && saved.contentVersion === content.version) {
    session = new Session(saved, content, store); session.settlePending();
    if (saved.completedAt && hasBackend()) {
      const r = await send('status', { sid: saved.sid, first: saved.student.first, last: saved.student.last, block: saved.student.block, assessmentId: CONFIG.assessmentId });
      if (r && r.ok && r.reset) { store.clearSession(); store.clearLock(...studentKey(saved.student)); session = null; screenEntry('Your teacher reset this assessment. You can start again.', 'ok'); return; }
    }
    afterStart(); toast('Welcome back. Your progress was restored.');
  } else if (PREVIEW) {
    session = new Session(newState({ student: { first: 'Preview', last: 'Teacher', block: CONFIG.blocks[0], code: 'PREVIEW', label: 'Preview' }, demo: true, content }), content, store);
    session.state.screen = 'mission'; session.state.pos = { m: 0, s: 0 }; session.save(); afterStart();
  } else { if (saved) store.clearSession(); screenEntry(); }
  if (PREVIEW) {
    const m = await import('./preview.js');
    const pv = { content, store, go, renderStage, startMission, screenResults, screenReview, screenEntry, screenOrient, finalize, trySubmit, send, hasBackend, resetAll() { store.clearSession(); location.reload(); }, setSession(x) { session = x; }, buildTrail, afterStart, toast, hashOf };
    Object.defineProperties(pv, { session: { get: () => session }, current: { get: () => current } });
    m.mountPreview({ api: pv });
  }
}
boot();
