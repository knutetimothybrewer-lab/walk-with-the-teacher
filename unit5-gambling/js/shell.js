// The assessment shell: top bar (chapter rail, points, tools, 90-minute timer), step runner, chapter transitions,
// review-and-submit, heartbeat and the time-up handler.  The server decides what is unlocked and when time is up.
import { h, md, mount, clear, add, $, announce, toast, store, fmt, reducedMotion, uid } from './util.js';
import { call, onStatus, serverNow } from './api.js';
import { S, payload, nav } from './state.js';
import { renderBlocks } from './blocks.js';
import { renderItem } from './items.js';
import { createTimer } from './timer.js';
import { chapterArt } from './art.js';
import { calculatorPanel, referencePanel } from './tools.js';
import { prefsPanel } from './prefs.js';
import { mountSim } from './sims/index.js';
import { endpoint } from './config.js';

let ui = null;          // live DOM references for the current assessment screen
let hbTimer = null, unsub = null, timer = null, hbSoon = null, mode = 'step';
const labs = {};        // cached lab instances for the "open the lab" drawer

const OUT = () => S.cfg.outline;
const unlocked = () => S.state.unlockedThrough || 1;
const chapterOf = (n) => S.content[n];
const itemStates = () => S.state.items;
function chapterTotals(ch) {
  let earned = 0, possible = 0, done = 0, total = 0;
  Object.entries(itemStates()).forEach(([id, s]) => { if (s.ch === ch) { earned += s.earned; possible += s.pts; total++; if (s.st !== 'open') done++; } });
  return { earned: Math.round(earned * 100) / 100, possible, done, total };
}
const chapterComplete = (ch) => { const t = chapterTotals(ch); return t.total > 0 && t.done === t.total; };
const firstOpenStep = (ch) => {
  const c = chapterOf(ch); if (!c) return 0;
  for (let i = 0; i < c.steps.length; i++) { const s = c.steps[i]; if (s.kind === 'item' && itemStates()[s.id].st === 'open') return i; if (s.kind === 'sim' && !simReady(s)) return i; }
  return c.steps.length - 1;
};
function simReady(step) { if (S.preview) return true; const need = step.need || {}; return Object.keys(need).every((k) => (S.sims[k] || 0) >= need[k]); }

// ------------------------------------------------------------------------------------------ build
export function renderAssessment(root) {
  teardown();
  const st = S.state;
  S.sims = Object.assign({}, st.sims || {}, S.sims);
  const rail = h('ol', { class: 'rail', 'aria-label': 'Case files' });
  const pts = h('div', { class: 'pts', 'aria-live': 'off' });
  const save = h('div', { class: 'save-state', role: 'status' }, 'Saved');
  const banner = h('div', { id: 'banner' });
  const stage = h('main', { id: 'main', class: 'stage', tabindex: '-1' });
  const back = h('button', { class: 'btn', type: 'button' }, '← Back');
  const status = h('div', { class: 'hint', 'aria-live': 'polite' });
  const next = h('button', { class: 'btn btn-primary btn-lg', type: 'button' }, 'Continue');
  const foot = h('footer', { class: 'foot' }, back, status, next);
  const tools = h('div', { class: 'tools' });
  timer = createTimer({ deadlineMs: Date.parse(st.deadline), preview: S.preview, onExpire: handleTimeUp, onBanner: (on, min) => { clear(banner); if (on) banner.append(h('div', { class: 'final-banner', role: 'status' }, `${min} minute${min === 1 ? '' : 's'} left. Finish the question you are on; unfinished work earns 0.`)); } });
  const bar = h('header', { class: 'bar' }, h('div', { class: 'brand' }, h('small', null, 'Unit 5'), 'Behind the Odds'), rail, h('div', { class: 'right' }, pts, save, tools, timer.el));
  ui = { root, rail, pts, save, banner, stage, back, status, next, foot, tools, bar };
  mount(root, bar, banner, S.preview ? h('div', { id: 'pvbar' }) : null, stage, foot);

  // tools
  const settings = st.settings || {};
  if (settings.referenceSheet !== false) tools.append(h('button', { class: 'tool', type: 'button', 'aria-label': 'Open formula reference', onclick: () => drawer('Reference', referencePanel()) }, '\u{1F4D0}', h('span', { class: 't' }, ' Formulas')));
  if (settings.calculator !== false) tools.append(h('button', { class: 'tool', type: 'button', 'aria-label': 'Open calculator', onclick: () => drawer('Calculator', calculatorPanel()) }, '\u{1F5A9}', h('span', { class: 't' }, ' Calculator')));
  tools.append(h('button', { class: 'tool', type: 'button', 'aria-label': 'Display settings', onclick: () => drawer('Settings', prefsPanel()) }, '⚙'));

  unsub = onStatus((s) => { save.textContent = s === 'saving' ? 'Saving…' : s === 'offline' ? 'Offline: retrying' : 'Saved ✓'; save.classList.toggle('bad', s === 'offline'); });
  hbTimer = setInterval(heartbeat, 30000);
  document.addEventListener('keydown', escClose);
  window.addEventListener('pagehide', sendPositionBeacon);

  back.addEventListener('click', goBack);
  next.addEventListener('click', goNext);
  buildRail(); updateHeader();
  if (S.preview) import('./teacher/preview.js').then((m) => m.mountPreviewBar($('#pvbar'), previewApi()));
  const p = st.position || { ch: 1, step: 0 };
  const ch = Math.min(Math.max(1, p.ch), unlocked());
  showStep(ch, Math.max(0, p.step | 0), { resume: true });
}

export function teardown() {
  if (hbTimer) clearInterval(hbTimer); hbTimer = null;
  if (unsub) unsub(); unsub = null;
  if (timer) timer.destroy(); timer = null;
  document.removeEventListener('keydown', escClose);
  window.removeEventListener('pagehide', sendPositionBeacon);
  Object.keys(labs).forEach((k) => { try { labs[k].inst && labs[k].inst.destroy && labs[k].inst.destroy(); } catch { /* ignore */ } delete labs[k]; });
  ui = null;
}

function buildRail() {
  clear(ui.rail);
  OUT().forEach((c) => {
    const locked = c.id > unlocked(), done = chapterComplete(c.id), cur = S.pos.ch === c.id;
    const b = h('button', { type: 'button', class: done ? 'done' : '', 'aria-label': `Case file ${c.id}: ${c.title}${done ? ' (finished)' : locked ? ' (locked)' : ''}`, 'aria-current': cur ? 'step' : null, disabled: locked && !S.preview, title: c.title, onclick: () => { if (c.id !== S.pos.ch || mode !== 'step') showStep(c.id, 0, { back: true }); } }, done && !cur ? '✓' : String(c.id));
    ui.rail.append(h('li', null, b));
  });
}
function updateHeader() {
  const p = S.state.progress; let earned = 0, done = 0, total = 0;
  Object.values(itemStates()).forEach((s) => { earned += s.earned; total++; if (s.st !== 'open') done++; });
  ui.pts.replaceChildren(h('b', null, fmt(earned, 1)), h('small', null, ` pts · ${done}/${total} done`));
  buildRail();
}

// ------------------------------------------------------------------------------------------ steps
async function ensureChapter(ch) {
  if (S.content[ch]) return S.content[ch];
  ui.stage.setAttribute('aria-busy', 'true'); mount(ui.stage, h('div', { class: 'center muted', style: 'padding:4rem 0' }, 'Loading…'));
  const r = await call('content', payload({ chapter: ch }));
  ui.stage.removeAttribute('aria-busy');
  if (!r.ok) {
    if (r.code === 'NO_SESSION') { handleGone(); return null; }
    if (r.code === 'TIME_UP' || r.code === 'FINALIZED') { handleTimeUp(); return null; }
    mount(ui.stage, h('div', { class: 'card' }, h('h2', null, 'Could not load this chapter'), h('p', null, r.message || 'Check your connection.'), h('button', { class: 'btn btn-primary', type: 'button', onclick: () => showStep(ch, 0) }, 'Try again')));
    return null;
  }
  S.content[ch] = r.chapter; return r.chapter;
}

export async function showStep(ch, idx, opts = {}) {
  if (!ui) return;
  const c = await ensureChapter(ch); if (!c || !ui) return;
  idx = Math.max(0, Math.min(idx, c.steps.length - 1));
  if (!S.preview && !opts.back) { idx = Math.min(idx, firstOpenStep(ch)); if (opts.jump && ch === S.pos.ch) idx = Math.min(idx, firstOpenStep(ch)); }
  S.pos = { ch, step: idx }; mode = 'step';
  document.body.dataset.ch = String(ch);
  const step = c.steps[idx];
  clear(ui.stage);
  const view = h('div', { class: 'view', 'data-kind': step.kind, 'data-step': step.id || '', 'data-sim': step.sim || '', 'data-ch': ch });
  ui.stage.append(view);
  if (step.kind === 'intro') renderIntro(view, c, step);
  else if (step.kind === 'brief') renderBrief(view, step);
  else if (step.kind === 'sim') renderSimStep(view, step);
  else if (step.kind === 'item') renderItemStep(view, step);
  buildRail(); updateFooter(); window.scrollTo(0, 0);
  const hd = $('#step-title', ui.stage); if (hd) hd.focus({ preventScroll: true });
  scheduleHeartbeat();
}

function renderIntro(view, c, step) {
  const meta = OUT()[c.id - 1];
  view.append(h('section', { class: 'enter' }, chapterArt(c.id), h('div', { class: 'step-head' }, h('div', { class: 'kicker' }, `Case file ${c.id} of 6 · about ${c.minutes} min · ${meta.points} points`), h('h1', { id: 'step-title', tabindex: '-1' }, step.title)), h('p', { class: 'lead muted' }, c.subtitle), renderBlocks(step.blocks)));
}
function renderBrief(view, step) {
  view.append(h('section', { class: 'enter' }, h('div', { class: 'step-head' }, h('div', { class: 'kicker' }, 'Briefing'), h('h2', { id: 'step-title', tabindex: '-1' }, step.title)), renderBlocks(step.blocks)));
}
function simCtx(id) {
  return { labs: S.state.labs, progress: S.sims, reduced: reducedMotion(), report(key, value) { const v = Math.max(S.sims[key] || 0, value); if (v !== S.sims[key]) { S.sims[key] = v; if (ui) updateFooter(); scheduleHeartbeat(3500); } } };
}
function renderSimStep(view, step) {
  const holder = h('div', { class: 'simhost', 'aria-busy': 'true' }, h('p', { class: 'muted' }, 'Loading the lab…'));
  const need = Object.entries(step.need || {}).map(([k, v]) => `${v.toLocaleString('en-US')}`).join(', ');
  view.append(h('section', { class: 'enter' }, h('div', { class: 'step-head' }, h('div', { class: 'kicker' }, 'Simulation'), h('h2', { id: 'step-title', tabindex: '-1' }, step.title)), h('div', { class: 'prompt' }, md(step.goal)), holder));
  const ctxObj = simCtx(step.sim);
  mountSim(step.sim, holder, ctxObj).then((inst) => { holder.removeAttribute('aria-busy'); if (holder.firstChild && holder.firstChild.nodeType === 3) holder.firstChild.remove(); view.__sim = inst; })
    .catch((e) => { holder.textContent = 'The lab could not load. ' + (e && e.message ? e.message : ''); });
}
function renderItemStep(view, step) {
  renderItem(view, step.item, {
    onChange: () => { updateHeader(); updateFooter(); },
    onDone: () => { announce('You can continue.'); setTimeout(() => ui && ui.next.focus({ preventScroll: true }), 400); },
    onTimeUp: () => handleTimeUp(),
    onGone: () => handleGone(),
    openLab,
    extra: S.preview ? (it) => { let node = null; const holder = h('div'); import('./teacher/preview.js').then((m) => { node = m.keyPanel(it.id); if (node) holder.append(node); }); return holder; } : null
  });
}

function canContinue() {
  const c = chapterOf(S.pos.ch); if (!c) return false;
  const step = c.steps[S.pos.step];
  if (S.preview) return true;
  if (step.kind === 'item') return itemStates()[step.id].st !== 'open';
  if (step.kind === 'sim') return simReady(step);
  return true;
}
function updateFooter() {
  if (!ui) return;
  const c = chapterOf(S.pos.ch); if (!c) return;
  const step = c.steps[S.pos.step], last = S.pos.step === c.steps.length - 1;
  ui.back.disabled = S.pos.ch === 1 && S.pos.step === 0;
  ui.next.textContent = last ? (S.pos.ch === 6 ? 'Finish and review' : 'Finish this case file') : 'Continue';
  const ok = canContinue(); ui.next.disabled = !ok;
  let msg = '';
  if (!ok && step.kind === 'item') msg = 'Check your answer to continue. A question finishes when it is correct or its attempts are used.';
  if (!ok && step.kind === 'sim') { const need = step.need || {}; msg = 'To continue: ' + Object.keys(need).map((k) => `${Math.min(S.sims[k] || 0, need[k]).toLocaleString('en-US')} / ${need[k].toLocaleString('en-US')} ${simUnit(k)}`).join('; '); }
  ui.status.textContent = msg;
}
const simUnit = (k) => ({ coin: 'flips', house: 'rounds', sports: 'lab actions', brain: 'stations visited', adlab: 'ads opened', decide: 'activities done' }[k] || '');

function goNext() {
  const c = chapterOf(S.pos.ch);
  if (S.pos.step < c.steps.length - 1) showStep(S.pos.ch, S.pos.step + 1, { fwd: true });
  else showChapterEnd(S.pos.ch);
}
async function goBack() {
  if (mode === 'end') { const c0 = chapterOf(S.pos.ch); return showStep(S.pos.ch, c0.steps.length - 1, { back: true }); }
  if (mode === 'review') { const c6 = chapterOf(6); return showStep(6, c6.steps.length - 1, { back: true }); }
  if (S.pos.step > 0) return showStep(S.pos.ch, S.pos.step - 1, { back: true });
  if (S.pos.ch > 1) { const ch = S.pos.ch - 1, c = await ensureChapter(ch); if (c) showStep(ch, c.steps.length - 1, { back: true }); }
}

function showChapterEnd(ch) {
  mode = 'end';
  const t = chapterTotals(ch), meta = OUT()[ch - 1], nextMeta = OUT()[ch];
  clear(ui.stage);
  const btn = h('button', { class: 'btn btn-primary btn-lg', type: 'button' }, ch < 6 ? `Enter Case File ${ch + 1}: ${nextMeta.title}` : 'Review and submit');
  btn.addEventListener('click', () => (ch < 6 ? transitionTo(ch + 1) : showReview()));
  ui.stage.append(h('section', { class: 'interstitial enter' }, chapterArt(ch), h('div', { class: 'big' }, `Case File ${ch} closed`), h('h2', { id: 'step-title', tabindex: '-1' }, meta.title), h('p', { class: 'muted' }, `${t.done} of ${t.total} questions finished · ${fmt(t.earned, 1)} of ${t.possible} points`), btn));
  ui.next.disabled = true; ui.back.disabled = false; ui.status.textContent = '';
  ui.next.textContent = 'Continue';
  $('#step-title', ui.stage).focus({ preventScroll: true });
  announce(`Case file ${ch} finished.`);
  if (ch < 6) S.state.unlockedThrough = Math.max(S.state.unlockedThrough, ch + 1);
  updateHeader();
}
function transitionTo(ch) {
  if (reducedMotion()) return showStep(ch, 0);
  const wipe = h('div', { class: 'wipe go' }); document.body.append(wipe);
  setTimeout(() => showStep(ch, 0), 430); setTimeout(() => wipe.remove(), 950);
}

// ------------------------------------------------------------------------------------------ review and submit
function showReview() {
  mode = 'review';
  clear(ui.stage);
  const unresolved = Object.entries(itemStates()).filter(([, s]) => s.st === 'open');
  const rows = OUT().map((c) => { const t = chapterTotals(c.id); return h('tr', null, h('th', { scope: 'row' }, `${c.id}. ${c.title}`), h('td', { class: 'num' }, `${t.done}/${t.total}`), h('td', { class: 'num' }, `${fmt(t.earned, 1)} / ${t.possible}`)); });
  const submit = h('button', { class: 'btn btn-primary btn-lg', type: 'button' }, 'Submit assessment');
  submit.addEventListener('click', () => confirmSubmit(unresolved.length));
  ui.stage.append(h('section', { class: 'enter page narrow', style: 'padding:0' }, h('div', { class: 'step-head' }, h('div', { class: 'kicker' }, 'Final step'), h('h1', { id: 'step-title', tabindex: '-1' }, 'Review and submit')),
    h('div', { class: 'b-tablewrap' }, h('table', { class: 'b-table' }, h('thead', null, h('tr', null, h('th', null, 'Case file'), h('th', null, 'Finished'), h('th', null, 'Points'))), h('tbody', null, rows))),
    unresolved.length ? h('div', { class: 'notice warn' }, `${unresolved.length} question${unresolved.length === 1 ? ' is' : 's are'} not finished. You can go back and finish ${unresolved.length === 1 ? 'it' : 'them'} while time remains; unfinished questions earn 0 points.`) : h('div', { class: 'notice good' }, 'Every question is finished. Your answers are already saved; submitting locks the assessment.'),
    h('p', { style: 'margin-top:1rem' }, submit)));
  ui.next.disabled = true; ui.next.textContent = 'Continue'; ui.status.textContent = ''; ui.back.disabled = false;
  $('#step-title', ui.stage).focus({ preventScroll: true });
}
function confirmSubmit(openCount) {
  const go = h('button', { class: 'btn btn-primary', type: 'button' }, 'Yes, submit now');
  const d = h('div', { class: 'scrim' }, h('div', { class: 'modal', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'cs-t' }, h('h2', { id: 'cs-t' }, 'Submit your assessment?'),
    h('p', null, openCount ? `${openCount} question${openCount === 1 ? ' is' : 's are'} unfinished and will earn 0. ` : '', 'After you submit, nothing can be changed.'), h('div', { class: 'row' }, go, h('button', { class: 'btn', type: 'button', onclick: () => d.remove() }, 'Keep working'))));
  document.body.append(d); go.focus();
  go.addEventListener('click', async () => {
    go.disabled = true; go.textContent = 'Submitting…';
    const r = await call('finalize', payload({ requestId: uid(20), confirm: true, confirmIncomplete: openCount > 0 }));
    d.remove();
    if (r.ok) { S.state = r.state; nav.go('done'); return; }
    if (r.code === 'NO_SESSION') return handleGone();
    toast(r.message || 'Could not submit. Try again.');
  });
}

// ------------------------------------------------------------------------------------------ drawers, labs
let drawerEl = null;
function escClose(e) { if (e.key === 'Escape' && drawerEl) closeDrawer(); }
function closeDrawer() { if (drawerEl) { drawerEl.remove(); drawerEl = null; } }
function drawer(title, node, wide) {
  closeDrawer();
  drawerEl = h('aside', { class: 'drawer' + (wide ? ' wide' : ''), role: 'dialog', 'aria-label': title }, h('div', { class: 'row between' }, h('h2', { style: 'margin:0' }, title), h('button', { class: 'btn btn-sm', type: 'button', onclick: closeDrawer }, 'Close ✕')), h('div', { style: 'margin-top:.8rem' }, node));
  document.body.append(drawerEl); $('.btn', drawerEl).focus();
}
async function openLab(simId) {
  const host = h('div', { class: 'simhost' }, h('p', { class: 'muted' }, 'Loading the lab…'));
  drawer('Lab: ' + ({ coin: 'Probability Laboratory', house: 'House Edge Investigation', sports: 'Sports Analytics Desk', brain: 'Neuroscience Lab', adlab: 'Ad Investigation Lab', decide: 'Story Studio and Decision Lab' }[simId] || simId), host, true);
  try { clear(host); await mountSim(simId, host, simCtx(simId)); } catch (e) { host.textContent = 'The lab could not load.'; }
}

// ------------------------------------------------------------------------------------------ heartbeat, time-up, session loss
function scheduleHeartbeat(ms) { clearTimeout(hbSoon); hbSoon = setTimeout(heartbeat, ms || 1500); }
// If the student refreshes or closes the tab right after moving, still tell the server where they were so they resume in the right place.
function sendPositionBeacon() {
  if (!ui || S.preview || !S.sess || !navigator.sendBeacon) return;
  try { navigator.sendBeacon(endpoint(), new Blob([JSON.stringify({ action: 'heartbeat', payload: payload({ pos: S.pos, sims: S.sims }) })], { type: 'text/plain;charset=utf-8' })); } catch { /* best effort */ }
}
async function heartbeat() {
  if (!ui) return;
  const r = await call('heartbeat', payload({ pos: S.pos, sims: S.sims }), { tries: 1, timeout: 15000 });
  if (!ui) return;
  if (r.code === 'NO_SESSION') return handleGone();
  if (r.state && r.state.status === 'final') { S.state = r.state; nav.go('done'); }
  if (r.deadline && timer) { const d = Date.parse(r.deadline); if (isFinite(d)) timer.setDeadline(d); }
}
let timeUpRunning = false;
export async function handleTimeUp() {
  if (timeUpRunning || !ui) return; timeUpRunning = true;
  const veil = h('div', { class: 'scrim', style: 'z-index:120' }, h('div', { class: 'modal', role: 'alertdialog', 'aria-live': 'assertive' }, h('h2', null, 'Time is up'), h('p', { id: 'tu-msg' }, 'Submitting your finished answers and locking the assessment…')));
  document.body.append(veil); announce('Time is up. Submitting your assessment.', true);
  for (let i = 0; i < 40; i++) {
    const r = await call('state', payload(), { tries: 1, timeout: 15000 });
    if (r.ok && r.state && r.state.status === 'final') { S.state = r.state; veil.remove(); timeUpRunning = false; nav.go('done'); return; }
    if (r.code === 'NO_SESSION') { veil.remove(); timeUpRunning = false; return handleGone(); }
    $('#tu-msg', veil).textContent = 'Reconnecting to submit your work. Your answers are safe on the server and will be submitted automatically at the deadline even if this computer stays offline…';
    await new Promise((res) => setTimeout(res, 4000));
  }
  timeUpRunning = false;
}
function handleGone() {
  if (!ui) return;
  const go = h('button', { class: 'btn btn-primary', type: 'button' }, 'Sign in again');
  const d = h('div', { class: 'scrim', style: 'z-index:120' }, h('div', { class: 'modal', role: 'alertdialog' }, h('h2', null, 'Please sign in again'), h('p', null, 'This session is no longer active. This can happen if your teacher reset your assessment or you signed in on another computer. Nothing you finished was lost unless your teacher reset it.'), go));
  document.body.append(d); go.focus();
  go.addEventListener('click', () => { d.remove(); store.del('u5.sess'); S.sess = null; S.content = {}; nav.go('login'); });
}

// ------------------------------------------------------------------------------------------ API for the teacher's preview toolbar
function previewApi() {
  return {
    goto: (ch, step) => { S.state.unlockedThrough = 6; return showStep(ch, step || 0, { back: true }); },
    reload: async () => { S.content = {}; const r = await call('state', payload()); if (r.ok) { S.state = r.state; } buildRail(); updateHeader(); return showStep(S.pos.ch, S.pos.step, { back: true }); },
    reset: async () => { S.content = {}; S.sims = {}; const r = await call('previewReset', { teacherToken: S.teacher.token }); if (!r.ok) return r; S.sess = { sid: r.sessionId, token: r.token }; S.state = r.state; S.pos = { ch: 1, step: 0 }; nav.go('assess'); return r; },
    setDeadline: (iso) => { const d = Date.parse(iso); if (timer && isFinite(d)) timer.setDeadline(d); },
    refresh: () => { updateHeader(); updateFooter(); },
    position: () => S.pos
  };
}
