// SIGNAL: Substance Use Summative. Application controller (screens, flow, persistence, submission).
import { CONFIG } from './config.js';
import content from '../content/public.js';
import { sha256, h, fmtDur, uid, sleep } from './util.js';
import { makeStore, storageWorks } from './storage.js';
import { Session, newState, gradeLocal, buildSubmission, partsOf, stageKey } from './engine.js';
import { canon } from './canon.js';
import { buildItem, renderStim } from './items.js';
import { SCENES } from './sims.js';
import { setBackground, heroWave, icon } from './visuals.js';
import { send, hasBackend } from './transport.js';
import { renderResults } from './results.js';
import { setSound, soundOn } from './sound.js';
import { DOMAIN_NAME } from './scoring.js';

const $main = document.getElementById('main'), $top = document.getElementById('topbar'), $trail = document.getElementById('trail');
const params = new URLSearchParams(location.search);
let PREVIEW = false, store = makeStore(CONFIG.storagePrefix), session = null, current = null, resultsView = null, submitTimer = null;
const api = {}; // exposed to Preview Mode only
const BUILD = 'build 2026-10-08c (start-over fix)';

// ---------------------------------------------------------------------------------- settings
let settings = {};
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
  const motion = h('select.input', { 'aria-label': 'Animation' }, ['', 'reduced', 'full'].map((v) => h('option', { value: v, selected: (settings.motion || '') === v }, v === '' ? 'Follow my device setting' : v === 'reduced' ? 'Reduce motion (recommended if animation bothers you)' : 'Full animation')));
  motion.onchange = () => { settings.motion = motion.value; store.setSettings(settings); applySettings(); };
  d.replaceChildren(h('h2', 'Display and sound'),
    tog('large', 'Larger text', 'Makes text bigger across the assessment.'), tog('dyslexic', 'Dyslexia-friendly font', 'Uses the OpenDyslexic typeface.'),
    h('div.toggle', h('label', h('strong', 'Animation'), h('div.small.muted', 'Motion never carries information that is not also in text.')), motion),
    tog('sound', 'Sound effects', 'Short tones after you check an answer. Off by default.'), tog('timer', 'Show timer', 'Shows time on task in the top bar. Off by default.'),
    storageWorks() ? '' : h('p.err', 'This browser is blocking saved progress. Do not close this tab.'),
    // Demo sessions only (DEMO2026): lets a teacher test again without clearing browser data. Real sessions can never be restarted by the student.
    session && session.state.demo ? h('div.toggle', h('div', h('strong', 'Start over (demo only)'), h('div.small.muted', 'Erases this DEMO session and returns to sign-in.')), h('button.btn.small.warn', { type: 'button', onclick: () => { const st = session.state; clearInterval(clockIv); session = null; /* so pagehide cannot re-save it */ store.clearSession(); store.clearLock(st.student.name, st.student.code); location.reload(); } }, 'Start over')) : '',
    h('p.small.muted', { style: { marginTop: '.6rem' } }, `Page version: ${BUILD}`),
    h('div.dlg-actions', h('button.btn.primary', { type: 'button', onclick: () => d.close() }, 'Done')));
  d.showModal();
}
document.getElementById('btn-settings').onclick = openSettings;

// ---------------------------------------------------------------------------------- shell helpers
const hashCode = (c) => sha256(CONFIG.codeSalt + '|' + c.trim().toUpperCase());
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
    const mission = session.plan.missions[i], done = mission.resolved.filter((st) => session.stageDone(st)).length, frac = done / mission.resolved.length;
    li.classList.toggle('done', frac === 1 || i < m); li.classList.toggle('cur', i === m);
    li.setAttribute('aria-current', i === m ? 'step' : 'false');
    const seg = li.querySelector('.seg i'); if (seg) seg.style.width = (frac === 1 || i < m ? 100 : i === m ? frac * 100 : 0) + '%';
  });
}
let clockIv = null;
function startClock() { clearInterval(clockIv); clockIv = setInterval(() => { if (!session || session.state.completedAt) return; session.tickActive(); const s = Math.floor(session.state.activeMs / 1000); document.getElementById('clock').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (s % 10 === 0) session.save(); }, 1000); }

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
function screenEntry(message, kind = 'err') {
  $top.hidden = true; clearInterval(clockIv);
  setBackground('entry');
  const name = h('input.input#f-name', { type: 'text', autocomplete: 'off', required: true, placeholder: 'First and last name', maxlength: 60, 'aria-describedby': 'e-msg' });
  const period = h('select.input#f-period', { required: true });
  const fillPeriods = (list) => { period.replaceChildren(h('option', { value: '' }, 'Choose…'), ...list.map((c) => h('option', { value: c.value }, c.label))); };
  fillPeriods(CONFIG.periods.map((p) => ({ value: p, label: 'Period ' + p })));
  if (hasBackend() && CONFIG.backendKind === 'apps-script') send('classes', {}).then((r) => { if (r && r.ok && r.classes && r.classes.length) fillPeriods(r.classes); });
  const code = h('input.input#f-code', { type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', required: true, placeholder: 'Class code', maxlength: 24, 'aria-describedby': 'e-msg' });
  const msg = h('div.err#e-msg', { role: 'alert' }, message || '');
  if (kind === 'ok') msg.style.color = 'var(--good)';
  const btn = h('button.btn.primary', { type: 'submit' }, 'Begin', icon('arrow', 20));
  let fails = 0, lockUntil = 0;
  const form = h('form.panel', { novalidate: true, 'aria-labelledby': 'f-h' },
    h('h2#f-h', 'Sign in to begin'),
    h('div.field', h('label', { for: 'f-name' }, 'Student name'), name),
    h('div.grid2', h('div.field', h('label', { for: 'f-period' }, 'Class / period'), period), h('div.field', h('label', { for: 'f-code' }, 'Class code'), code)),
    msg, h('div.row', btn, h('span.small.muted', 'This takes about an hour. Your progress is saved if the page refreshes.')));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const nm = name.value.trim().replace(/\s+/g, ' '), cd = code.value.trim(), pd = period.value;
    msg.style.color = ''; if (nm.length < 3 || !/\s|\./.test(nm) && nm.length < 4) { msg.textContent = 'Please enter your first and last name.'; name.focus(); return; }
    if (!pd) { msg.textContent = 'Choose your class period.'; period.focus(); return; }
    if (!cd) { msg.textContent = 'Enter the class code your teacher gave you.'; code.focus(); return; }
    if (Date.now() < lockUntil) { msg.textContent = `Too many tries. Wait ${Math.ceil((lockUntil - Date.now()) / 1000)} seconds.`; return; }
    btn.disabled = true; msg.textContent = 'Checking…';
    try {
      const r = await beginSession({ name: nm, period: pd, code: cd });
      if (r !== true) { msg.textContent = r; if (/code/i.test(r)) { fails++; if (fails >= 5) { lockUntil = Date.now() + 15000; fails = 0; } } btn.disabled = false; }
    } catch (err) { msg.textContent = 'Something went wrong: ' + (err && err.message || err); btn.disabled = false; }
  };
  const screen = h('section.screen', h('div.hero',
    h('div', h('div.kicker', 'Grade 10 Health'), h('h1', CONFIG.appName),
      h('p.lead', CONFIG.assessmentTitle + '. Eight missions on brain science, nicotine, alcohol, medications, emergencies, pressure and evidence.'),
      heroWave(), CONFIG.schoolName || CONFIG.teacherName ? h('p.small.muted', [CONFIG.schoolName, CONFIG.teacherName].filter(Boolean).join(' • ')) : ''),
    form));
  setScreen(screen, { theme: 'entry' }); name.focus();
}

async function beginSession({ name, period, code }) {  // the Sheet's period for this class code wins over the dropdown
  const hash = hashCode(code);
  const localOk = CONFIG.classCodeHashes.includes(hash), localDemo = hash === CONFIG.demoCodeHash;
  let demo = localDemo, label = '';
  if (store.isLocked(name, code)) {
    const r = hasBackend() ? await send('validate', { code, name, period }) : null;
    if (!(r && r.ok && r.reset)) return 'This assessment was already submitted from this device. Ask your teacher if you need it reset.';
    store.clearLock(name, code);
  }
  if (hasBackend() && CONFIG.backendKind === 'apps-script') {
    const r = await send('validate', { code, name, period });
    if (r && r.ok) { demo = !!r.demo || localDemo; label = r.label || ''; if (r.period) period = String(r.period); if (r.reset) store.clearLock(name, code); }
    else if (r && r.error === 'invalid-code') return 'That class code is not valid. Check it and try again.';
    else if (r && r.error === 'already-completed') return 'Our records show this assessment was already submitted. Ask your teacher if it needs to be reset.';
    else if (CONFIG.allowOfflineStart && (localOk || localDemo)) toast('Could not reach the server. Starting offline; results will send when the connection returns.');
    else return 'Could not reach the server to check your class code. Check your connection and try again.';
  } else if (!(localOk || localDemo)) return 'That class code is not valid. Check it and try again.';
  const st = newState({ student: { name, period, code: code.trim().toUpperCase(), label }, demo, content });
  session = new Session(st, content, store);
  if (hasBackend() && CONFIG.backendKind === 'apps-script') {
    const r = await send('start', { sid: st.sid, student: st.student, demo: st.demo, versionId: st.versionId, contentVersion: st.contentVersion, startedAt: st.startedAt, stageIds: st.stageIds });
    if (!r || !r.ok) {
      if (r && r.error === 'already-completed') return 'Our records show this assessment was already submitted. Ask your teacher if it needs to be reset.';
      if (CONFIG.gradingMode === 'server') return 'Could not start a secure session. Check your connection and try again.';
    }
  }
  session.save(); buildTrail(); afterStart(); return true;
}
function afterStart() { $top.hidden = false; applySettings(); startClock(); go(); }

// ---------------------------------------------------------------------------------- router
function go() {
  const s = session.state;
  if (s.completedAt) return screenResults();
  if (s.screen === 'orient') return screenOrient();
  if (s.screen === 'review') return screenReview();
  return renderStage();
}

// ---- Mission 0: entry / system check (unscored practice)
function practiceStub() {
  const store0 = { rec: null };
  const stubSession = {
    state: { seed: 'practice' }, rec: () => store0.rec,
    beginAttempt(q, resp) { const rec = store0.rec || (store0.rec = { attempts: [], status: 'open' }); const a = { n: rec.attempts.length + 1, resp, c: canon(q.type, resp), t: Date.now(), correct: null }; rec.attempts.push(a); return { rec, a }; },
    finishAttempt(q, pend, ok) { pend.a.correct = ok; if (ok) pend.rec.status = 'correct'; else if (pend.a.n >= 3) pend.rec.status = 'locked'; return pend.rec.status; },
    cancelAttempt() {}, explanation: () => 'Apples and bananas are fruits. Carrots and broccoli are vegetables. (This practice question does not count.)'
  };
  const q = { id: 'practice', type: 'sort', pts: 0, prompt: 'Practice: drag each item to a category, or tap an item and then tap a category. Then press Check answer.', bins: [['f', 'Fruit'], ['v', 'Vegetable']], items: [['a', 'Apple'], ['b', 'Carrot'], ['c', 'Banana'], ['d', 'Broccoli']], steps: undefined };
  const ans = { a: 'f', b: 'v', c: 'f', d: 'v' };
  return buildItem(q, { session: stubSession, seed: 'practice', grade: async (qq, resp) => canon('sort', resp) === canon('sort', ans) });
}
function screenOrient() {
  $top.hidden = false; updateTrail();
  const pi = practiceStub(); pi.el.querySelector('.pts').textContent = 'Practice • not scored';
  const cont = h('button.btn.primary', { type: 'button', onclick: () => { session.state.screen = 'mission'; session.save(); startMission(0); } }, 'Start Mission 1', icon('arrow', 20));
  const screen = h('section.screen', h('div.kicker', 'Mission 0 • System check'), h('h1', 'Welcome, ', session.state.student.name.split(' ')[0] + '.'),
    h('p.lead', 'This is an assessment, but it is built like an investigation. You will move through eight missions. Some are readings, some are models you can play with, and some are decisions.'),
    h('div.steps3',
      h('div.panel', h('h3', '1. Answer, then check'), h('p', 'Choose or build your answer, then press Check answer. Changing your answer before you check does not use an attempt.')),
      h('div.panel', h('h3', '2. Three attempts'), h('div.credit-table', h('div', h('b', '100%'), 'Attempt 1'), h('div', h('b', '85%'), 'Attempt 2'), h('div', h('b', '75%'), 'Attempt 3'), h('div', h('b', '0'), 'Not solved')), h('p.small.muted', { style: { marginTop: '.5rem' } }, 'After a wrong answer you will not be told the answer. After the third wrong attempt the question locks and you will see a short explanation.')),
      h('div.panel', h('h3', '3. Your progress is saved'), h('p', 'If the page refreshes or closes, reopen this link and sign in again. You will return to where you were, and used attempts stay used.'))),
    h('div.panel', h('h3', 'Try it: practice question'), pi.el),
    h('div.panel', h('div.row.spread', h('div', h('strong', 'Need larger text, a different font, or less motion?'), h('div.small.muted', 'Open Settings (the gear in the top bar) at any time.')), h('button.btn', { type: 'button', onclick: openSettings }, 'Open settings'))),
    h('div.navrow', h('span.status', 'About 50 to 60 minutes. Take your time with the simulations.'), cont));
  setScreen(screen, { theme: 'entry' }); updateTrail();
}

// ---- missions
async function startMission(mi) {
  const s = session.state, mission = session.plan.missions[mi];
  s.pos = { m: mi, s: -1 }; session.save(); setBackground(mission.theme); updateTrail();
  const reduced = document.documentElement.dataset.motion === 'reduced' || (matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.motion !== 'full');
  const wipe = h('div.wipe', { role: 'dialog', 'aria-label': `${mission.kicker}: ${mission.title}`, tabindex: 0 }, h('div.wipe-inner', h('div.kicker', mission.kicker), h('div.num', { 'aria-hidden': 'true' }, mi === 7 ? '★' : String(mi + 1)), h('div.ttl', mission.title), h('p.sub', mission.blurb), h('div.conn', h('i')), h('p.small.muted', { style: { marginTop: '.8rem' } }, 'Click or press any key to continue')));
  document.body.appendChild(wipe); wipe.focus();
  const finish = () => { if (wipe._done) return; wipe._done = true; wipe.classList.add('out'); setTimeout(() => wipe.remove(), 650); s.pos = { m: mi, s: 0 }; session.save(); renderStage(); };
  wipe.onclick = finish; wipe.onkeydown = finish;
  setTimeout(finish, reduced ? 900 : 4200);
}
function stageList() { return session.plan.missions[session.state.pos.m].resolved; }
function renderStage() {
  const s = session.state, mi = s.pos.m, mission = session.plan.missions[mi];
  if (s.pos.s < 0) return startMission(mi);
  const stages = mission.resolved, si = Math.min(s.pos.s, stages.length - 1), stage = stages[si];
  clearCurrent(); $top.hidden = false; setBackground(mission.theme); updateTrail();
  const items = {}, parts = partsOf(stage), isScene = stage.kind === 'scene';
  const ictx = { session, seed: s.seed, grade, onChange: (q, status) => afterChange(q, status) };
  const list = h('div.itemlist');
  parts.forEach((q) => { const it = buildItem(q, ictx); items[q.id] = it; list.append(it.el); });
  const sim = isScene ? (s.sims[stage.id] = s.sims[stage.id] || {}) : null;
  const hostEl = h('div.simhost');
  const nextBtn = h('button.btn.primary', { type: 'button' });
  const status = h('span.status');
  function applyGates() {
    parts.forEach((q) => { const ok = session.partAvailable(q, stage.id); items[q.id].setGated(!ok, q.after === '@sim' ? 'Complete the activity on the left to unlock this question.' : 'Answer the question above first.'); });
    const done = session.stageDone(stage), last = si === stages.length - 1;
    nextBtn.disabled = !done && !PREVIEW; status.textContent = done ? 'Step complete.' : PREVIEW ? 'Preview: Continue is open without answering.' : `Complete ${parts.length > 1 ? 'every question' : 'this question'} to continue.`;
    nextBtn.replaceChildren(last ? (mi === content.missions.length - 1 ? 'Finish and review' : 'Complete mission') : 'Continue', icon('arrow', 20));
    updateTrail();
  }
  function afterChange(q, st) {
    session.save();
    if (current && current.scene && current.scene.onPartDone && (st === 'correct' || st === 'locked')) current.scene.onPartDone(q.id, st);
    applyGates();
    if (session.stageDone(stage)) setTimeout(() => { nextBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); nextBtn.focus({ preventScroll: true }); }, 350);
    else { const nx = parts.find((p) => !session.isDone(p.id) && session.partAvailable(p, stage.id)); if (nx && (st === 'correct' || st === 'locked')) setTimeout(() => items[nx.id].el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300); }
  }
  nextBtn.onclick = () => {
    if (!session.stageDone(stage) && !PREVIEW) return;
    if (si < stages.length - 1) { s.pos.s = si + 1; session.save(); renderStage(); }
    else if (mi < content.missions.length - 1) { startMission(mi + 1); }
    else { s.screen = 'review'; session.save(); screenReview(); }
  };
  const backBtn = h('button.btn.ghost', { type: 'button', onclick: () => { if (si > 0) { s.pos.s = si - 1; session.save(); renderStage(); } } }, icon('back', 20), 'Previous step');
  backBtn.hidden = si === 0;
  const head = h('div.stagehead', h('div', h('div.kicker', `${mission.kicker} • ${mission.title}`), isScene ? h('h2', stage.title) : ''), h('div.count', `Step ${si + 1} of ${stages.length}`));
  const body = isScene ? h('div.scene-layout', hostEl, list) : h('div.scene-layout.solo', list);
  const screen = h('section.screen', head, body, h('div.navrow', h('div.row', backBtn, status), nextBtn));
  setScreen(screen, { theme: mission.theme });
  current = { stage, items };
  if (isScene) {
    const ctx = { stage, session, content, sim, items, save: () => session.save(), markReady: () => { applyGates(); }, isDone: (id) => session.isDone(id) };
    hostEl.className = 'simhost sim-wrap';
    const sc = SCENES[stage.scene](hostEl, ctx); current.scene = sc;
    if (sim && sim.ready === undefined) sim.ready = false;
    // The scene's own title/lead already render inside the panel; hide the duplicate heading.
    const dup = head.querySelector('h2'); if (dup) dup.remove();
  }
  applyGates();
  if (parts.length && !isScene) $main.focus({ preventScroll: true });
  api.refresh = renderStage;
}

// ---- review + submit
function screenReview() {
  $top.hidden = false; updateTrail();
  const t = session.totals();
  const screen = h('section.screen.narrow', h('div.kicker', 'Final step'), h('h1', 'Ready to submit?'),
    h('p.lead', `You answered all ${session.parts.length} questions. When you submit, your answers are final and this attempt is locked.`),
    h('div.panel', h('p', 'Your score will be shown after you submit. You will not be able to change any answers.'),
      h('div.row', h('button.btn.ghost', { type: 'button', onclick: () => { session.state.screen = 'mission'; const mi = session.plan.missions.length - 1; session.state.pos = { m: mi, s: session.plan.missions[mi].resolved.length - 1 }; session.save(); renderStage(); } }, icon('back', 20), 'Go back'),
        h('button.btn.primary', { type: 'button', onclick: confirmSubmit }, 'Submit final answers'))));
  setScreen(screen, { theme: 'final' });
}
function confirmSubmit() {
  const d = document.getElementById('dlg');
  d.replaceChildren(h('h2', 'Submit final answers?'), h('p', 'This cannot be undone. Your answers will be sent to your teacher and the assessment will be locked.'),
    h('div.dlg-actions', h('button.btn', { type: 'button', onclick: () => d.close() }, 'Not yet'), h('button.btn.primary', { type: 'button', onclick: () => { d.close(); finalize(); } }, 'Yes, submit')));
  d.showModal();
}
async function finalize() {
  const s = session.state;
  if (s.completedAt) return;
  session.settlePending(); s.completedAt = Date.now(); s.submit = { status: 'sending', confirm: 'PENDING-' + s.sid.slice(2, 8) };
  session.save(); store.setLock(s.student.name, s.student.code, { sid: s.sid, t: s.completedAt });
  screenResults(); await trySubmit();
}
async function trySubmit() {
  const s = session.state; if (s.submit.status === 'done') return;
  if (!hasBackend()) { s.submit = { status: 'nobackend', confirm: 'LOCAL-' + s.sid.slice(2, 10) }; session.save(); resultsView && resultsView.paintStatus(s.submit); return; }
  s.submit.status = 'sending'; resultsView && resultsView.paintStatus(s.submit);
  const r = await send('submit', buildSubmission(session));
  if (r && r.ok) { s.submit = { status: 'done', confirm: r.confirmationId, serverScore: r.score, mismatch: !!r.mismatch }; if (r.score && typeof r.score.earned === 'number') s.serverScore = r.score; }
  else if (r && (r.error === 'already-completed' || r.error === 'duplicate')) { s.submit = { status: 'done', confirm: r.confirmationId || 'ALREADY-SUBMITTED' }; }
  else { s.submit = { status: 'error', confirm: s.submit.confirm }; clearTimeout(submitTimer); submitTimer = setTimeout(trySubmit, 20000); }
  session.save(); if (resultsView) { resultsView.paintStatus(s.submit); if (s.serverScore && s.submit.status === 'done') screenResults(); }
}
window.addEventListener('online', () => { if (session && session.state.completedAt && session.state.submit.status !== 'done') trySubmit(); });

function receipt() {
  const s = session.state, t = session.totals();
  const blob = new Blob([JSON.stringify({ student: s.student.name, period: s.student.period, classCode: s.student.code, version: s.versionId, completed: new Date(s.completedAt).toISOString(), pointsEarned: t.earned, pointsPossible: t.possible, percent: t.pct, confirmation: s.submit.confirm, session: s.sid }, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `receipt-${s.student.name.replace(/\W+/g, '-')}.json` }); document.body.append(a); a.click(); a.remove();
}
function screenResults() {
  $top.hidden = false; updateTrail(); setBackground('results');
  const s = session.state; let t = session.totals();
  if (s.serverScore && s.serverScore.possible) t = { ...t, earned: s.serverScore.earned, possible: s.serverScore.possible, pct: Math.round(s.serverScore.earned / s.serverScore.possible * 1000) / 10 };
  const host = document.createElement('div'); setScreen(host, { theme: 'results' });
  resultsView = renderResults(host, { session, totals: t, submit: s.submit, onRetry: trySubmit, onDownload: receipt, previewNote: PREVIEW });
  $trail.querySelectorAll('li').forEach((li) => { li.classList.add('done'); li.classList.remove('cur'); const seg = li.querySelector('.seg i'); if (seg) seg.style.width = '100%'; });
  if (s.submit.status !== 'done' && s.submit.status !== 'nobackend' && s.submit.status !== 'sending') trySubmit();
}

// ---------------------------------------------------------------------------------- boot
async function boot() {
  const pv = params.has('preview');
  if (pv) {
    const code = window.prompt('Preview Mode passcode');
    if (!code || sha256(CONFIG.previewSalt + '|' + code) !== CONFIG.previewPasscodeHash) { location.replace(location.pathname); return; }
    PREVIEW = true; store = makeStore('sigp');
  }
  settings = store.getSettings(); applySettings(); buildTrail();
  document.getElementById('brand-name').textContent = CONFIG.appName; document.title = CONFIG.appName;
  window.addEventListener('pagehide', () => session && session.save());
  document.addEventListener('visibilitychange', () => session && session.save());
  const saved = store.loadSession();
  if (saved && saved.contentVersion === content.version) {
    session = new Session(saved, content, store); session.settlePending();
    if (saved.completedAt && hasBackend() && CONFIG.backendKind === 'apps-script') {
      const r = await send('status', { sid: saved.sid, code: saved.student.code, name: saved.student.name });
      if (r && r.ok && r.reset) { store.clearSession(); store.clearLock(saved.student.name, saved.student.code); session = null; screenEntry('Your teacher reset this assessment. You can start again.', 'ok'); return; }
    }
    afterStart(); toast('Welcome back. Your progress was restored.');
  } else if (PREVIEW) {
    session = new Session(newState({ student: { name: 'Preview Teacher', period: '0', code: 'DEMO2026', label: 'Preview' }, demo: true, content }), content, store);
    session.state.screen = 'mission'; session.state.pos = { m: 0, s: 0 }; session.save(); afterStart();
  } else { if (saved) store.clearSession(); screenEntry(); }
  if (PREVIEW) { const m = await import('./preview.js'); m.mountPreview({ api: Object.assign(api, { get session() { return session; }, content, store, go, renderStage, startMission, screenResults, screenReview, screenEntry, screenOrient, finalize, trySubmit, send, hasBackend, resetAll() { clearInterval(clockIv); session = null; store.clearSession(); location.reload(); }, setSession(s) { session = s; }, buildTrail, afterStart, toast }) }); }
}
boot();
