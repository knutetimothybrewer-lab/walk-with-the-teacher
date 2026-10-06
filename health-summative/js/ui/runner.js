/* runner.js — renders one question (or explorer card) and runs the
   check / hint / retry / reveal loop, including the chat-scene skin.        */
import { h, rich, plain, announce, sparkle, shake, listenButton } from './dom.js';
import { grade, isComplete } from '../engine/grade.js';
import * as mc from '../items/mc.js';
import * as multi from '../items/multi.js';
import * as place from '../items/place.js';
import * as yrbs from '../visuals/yrbs.js';
import * as brain from '../visuals/brain.js';
import * as gauges from '../visuals/gauges.js';
import * as stressDays from '../visuals/stressDays.js';
import * as thirdVar from '../visuals/thirdVar.js';
import * as poster from '../visuals/poster.js';

const COMP = { mc, multi, place };
const VIS = { yrbs, brain, gauges, stressDays, thirdVar, poster };

const pct = (x) => Math.round(x * 100);

export function instructionFor(item) {
  if (item.instruction) return item.instruction;
  if (item.type === 'mc') return 'Choose the best answer.';
  if (item.type === 'multi') return 'Select all that apply.';
  const m = item.mode;
  if (m === 'sort') return 'Tap a card, then tap the box where it belongs (or drag it there).';
  if (m === 'match') return 'Tap an answer, then tap the row it matches (or drag it there).';
  if (m === 'order') return 'Tap a step, then tap its position (or drag it there).';
  return 'Choose one label for each statement.';
}

function mountVisual(host, item, ctx) {
  if (!item.visual) return null;
  const v = typeof item.visual === 'string' ? { name: item.visual } : item.visual;
  const mod = VIS[v.name];
  if (!mod) return null;
  const box = h('div', { class: `visual v-${v.name}` });
  host.append(box);
  return mod.mount(box, { ...ctx, visual: v });
}

function passageEl(app, item) {
  if (!item.passage) return null;
  const p = app.plan.passages[item.passage];
  if (!p) return null;
  return h('aside', { class: 'passage', 'aria-label': `Reading: ${p.title}` },
    h('div', { class: 'passage-head' }, h('p', { class: 'passage-title' }, p.title), listenButton(() => `${p.title}. ${p.text}`, 'Listen')),
    ...p.text.split('\n\n').map(t => h('p', {}, rich(t))),
    p.cite ? h('p', { class: 'cite' }, p.cite) : null);
}

/* ---------------- chat helpers ---------------- */
function blockRecs(app, rec) {
  return rec.blockId ? app.plan.all.filter(r => r.blockId === rec.blockId).sort((a, b) => a.step - b.step) : [rec];
}
export function trustFor(app, rec) {
  let t = 40;
  blockRecs(app, rec).forEach(r => {
    const st = app.session.items[r.id];
    if (!st) return;
    const wrong = st.attempts.filter(a => a.fraction < 1).length;
    if (st.solved && !st.skipped) t += 15;
    t -= 7 * wrong;
  });
  return Math.max(5, Math.min(100, t));
}
function trustMeter(initial) {
  const fill = h('span', { class: 'trust-fill' });
  const label = h('span', { class: 'trust-label' }, 'Trust');
  const bar = h('div', { class: 'trust', role: 'img', 'aria-label': 'Trust meter' }, label, h('span', { class: 'trust-track' }, fill));
  const set = (v) => { fill.style.width = v + '%'; bar.setAttribute('aria-label', `Trust meter: ${v >= 70 ? 'high' : v >= 40 ? 'growing' : 'low'}`); };
  set(initial);
  return { el: bar, set };
}
const bubble = (who, text, cls = '') => h('div', { class: `bubble ${who} ${cls}` }, rich(text));

/* ---------------- main ---------------- */
export function renderItem(app, rec, host) {
  const { session, cfg, plan } = app;
  const item = rec.item;
  const state = session.itemState(rec.id);
  const total = rec.total;
  const attemptsMax = cfg.maxAttempts;
  const credit = (n) => { const m = cfg.attemptCredit[n - 1]; return typeof m === 'number' ? pct(m) : 0; };

  const card = h('article', { class: `card item t-${item.type} ${item.mode ? 'm-' + item.mode : ''} ${item.chat ? 'chat' : ''} ${item.alert ? 'alert-zone' : ''}`, 'data-item': rec.id });
  const attemptChip = h('span', { class: 'chip attempt' });
  const stationTitle = (plan.stations[rec.stationIndex] || {}).title || '';
  const listen = listenButton(() => [plain(item.friendSays || ''), plain(item.prompt), ...(item.options || []).map(o => plain(o.t))].join('. '), 'Listen');
  card.append(h('h1', { class: 'sr-only' }, `${stationTitle}, question ${rec.num} of ${total}`));
  card.append(h('div', { class: 'item-head' },
    h('span', { class: 'chip' }, `Question ${rec.num} of ${total}`), attemptChip, listen));

  /* chat header + transcript */
  let trust = null, log = null;
  if (item.chat) {
    trust = trustMeter(trustFor(app, rec));
    card.append(h('div', { class: 'chat-head' },
      h('span', { class: 'avatar', 'aria-hidden': 'true', style: `--av:${item.chat.color || '#7a6bd6'}` }, item.chat.who[0]),
      h('div', {}, h('strong', {}, item.chat.who), h('small', {}, item.chat.scene)), trust.el));
    log = h('div', { class: 'chat-log', 'aria-label': 'Conversation so far', role: 'log' });
    blockRecs(app, rec).filter(r => r.blockIndex < rec.blockIndex).forEach(r => {
      const it = r.item, st = session.items[r.id];
      if (it.friendSays) log.append(bubble('friend', it.friendSays));
      if (st && st.skipped) return;
      const good = it.options.find(o => o.ok);
      log.append(bubble('you', good.t), bubble('friend', good.react || ''));
    });
    card.append(log);
  }

  if (item.note) card.append(h('p', { class: 'note calm' }, item.note));
  if (item.chat && item.friendSays) { log.append(bubble('friend', item.friendSays, 'new')); }
  else card.append(passageEl(app, item) || '');
  if (!item.chat) card.append(h('h2', { class: 'prompt', tabindex: '-1', id: 'prompt' }, rich(item.prompt)));
  else card.append(h('p', { class: 'chat-step' }, item.chat.step ? h('span', { class: 'step-tag' }, item.chat.step) : null, h('span', { class: 'prompt', id: 'prompt', tabindex: '-1' }, rich(item.prompt))));
  card.append(h('p', { class: 'instr' }, instructionFor(item)));

  const vhost = h('div', { class: 'visuals' });
  card.append(vhost);
  const ihost = h('div', { class: 'interaction' });
  card.append(ihost);
  const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  card.append(fb);
  const foot = h('div', { class: 'item-foot' });
  card.append(foot);
  host.append(card);

  let vis = null;
  const vctx = { item, session, plan, app };
  vis = mountVisual(vhost, item, vctx);

  const comp = COMP[item.type].mount(ihost, {
    item, view: rec.view, state, rec,
    onChange() {
      check.disabled = !ctrl.isComplete();
      if (vis && vis.update) vis.update(ctrl.getResponse());
    },
  });
  const ctrl = comp;

  const check = h('button', { type: 'button', class: 'btn-primary', disabled: true }, 'Check answer');
  const next = h('button', { type: 'button', class: 'btn-primary', hidden: true }, rec.step === rec.stationLast ? 'Finish station →' : 'Next →');
  const skip = item.sensitive || rec.sensitiveScene
    ? h('button', { type: 'button', class: 'btn-quiet', title: 'You can skip any scenario. It will not lower your score.' }, rec.sensitiveScene ? 'Skip this scene' : 'Skip this question')
    : null;
  foot.append(skip || h('span'), h('span', { class: 'foot-right' }, check, next));

  const attemptsLeft = () => attemptsMax - state.attempts.length;
  function refreshAttemptChip() {
    if (state.done) { attemptChip.textContent = ''; attemptChip.hidden = true; return; }
    const n = state.attempts.length + 1;
    attemptChip.hidden = false;
    attemptChip.textContent = `Try ${n} of ${attemptsMax} · ${credit(n) === 100 ? 'full credit' : credit(n) + '% credit'}`;
  }

  function feedback(kind, title, body, extra) {
    fb.className = `feedback ${kind}`;
    fb.replaceChildren(h('p', { class: 'fb-title' }, h('span', { 'aria-hidden': 'true', class: 'fb-ic' }, kind === 'good' ? '✓' : kind === 'try' ? '↺' : 'ℹ'), ' ', title),
      body ? h('p', { class: 'fb-body' }, rich(body)) : null, extra || null);
    announce(`${title}. ${plain(body || '')}`);
  }

  function explainBlock(final) {
    const lines = [];
    if (item.explain) lines.push(h('p', { class: 'fb-explain' }, h('strong', {}, 'Why: '), rich(item.explain)));
    if (final && item.type === 'place' && item.mode !== 'tag') {
      // show the correct answer set compactly for screen-reader / review
    }
    return h('div', {}, lines);
  }

  function finish(solved, res) {
    refreshAttemptChip();
    check.hidden = true; next.hidden = false;
    const earned = state.earned;
    const frac = earned / rec.points;
    if (solved) {
      const n = state.attempts.length;
      feedback('good', n === 1 ? 'Correct — full credit.' : `Correct on try ${n} — ${credit(n)}% credit.`, null, explainBlock(false));
      sparkle(card);
      card.classList.add('glow'); setTimeout(() => card.classList.remove('glow'), 900);
    } else {
      const partial = frac > 0 ? ` You earned ${pct(frac)}% for the parts you got right.` : '';
      feedback('info', 'Let\'s look at this one together.', 'The correct answer is now shown above.' + partial, explainBlock(true));
    }
    if (item.chat) chatAfter(true, res);
    app.afterAnswer(rec);
    next.focus();
  }

  function chatAfter(done, res, pickedIdx) {
    const idx = pickedIdx !== undefined ? pickedIdx : null;
    if (idx === null) { trust.set(trustFor(app, rec)); return; }
    const o = item.options[idx];
    log.append(bubble('you', o.t, 'new'));
    if (o.react) log.append(bubble('friend', o.react, 'new'));
    trust.set(trustFor(app, rec));
    log.scrollTop = log.scrollHeight;
  }

  function onCheck() {
    if (!ctrl.isComplete() || state.done) return;
    const resp = ctrl.getResponse();
    const res = grade(item, resp);
    const picked = resp.pick;
    session.recordAttempt(rec, { fraction: res.fraction, resp, wrongSummary: res.wrong });
    ctrl.showResult(res, { final: state.done, solved: state.solved });
    // Re-enable Check if everything still selected is already locked in (e.g. all right options picked, one wrong one removed).
    check.disabled = state.done || !ctrl.isComplete();
    if (item.chat && picked !== undefined) chatAfter(false, res, picked);
    if (state.done) { finish(state.solved, res); return; }
    // wrong, attempts remain
    let hint = item.hint || 'Look again at the clue words in the question.';
    if (item.type === 'mc' && item.options[picked] && item.options[picked].hint) hint = item.options[picked].hint;
    let lead = 'Not quite. Here\'s a hint:';
    if (item.type !== 'mc') {
      const good = Object.values(res.subs).filter(Boolean).length;
      const tot = item.type === 'multi' ? item.options.filter(o => o.ok).length : item.tokens.length;
      lead = item.type === 'multi' ? `Not quite — ${good} right so far. The right ones are locked in.` : `Not quite — ${good} of ${tot} are in the right place. Those are locked in.`;
    }
    feedback('try', lead, hint + ` (You have ${attemptsLeft()} ${attemptsLeft() === 1 ? 'try' : 'tries'} left.)`);
    shake(card);
    refreshAttemptChip();
    app.afterAttempt(rec);
    if (ctrl.focus) setTimeout(() => ctrl.focus(), 50);
  }
  check.addEventListener('click', onCheck);
  next.addEventListener('click', () => app.next());
  if (skip) skip.addEventListener('click', () => {
    blockRecs(app, rec).filter(r => r.blockIndex >= rec.blockIndex && !session.itemState(r.id).done).forEach(r => session.skip(r));
    app.afterAnswer(rec);
    app.skipPast(rec);
  });

  /* restore after refresh */
  if (state.attempts.length) {
    const res = grade(item, state.resp || (item.type === 'mc' ? { pick: -1 } : item.type === 'multi' ? { picks: [] } : { map: {} }));
    if (item.type === 'mc' && !(state.resp && state.resp.pick >= 0)) { /* nothing */ }
    else ctrl.showResult(res, { final: state.done, solved: state.solved, restore: true });
    if (state.done) { check.hidden = true; next.hidden = false; feedback(state.solved ? 'good' : 'info', state.solved ? 'Already answered — nice work.' : 'Already answered.', null, explainBlock(!state.solved)); }
    else feedback('try', 'Welcome back.', 'Pick up where you left off. ' + (item.hint || ''));
    refreshAttemptChip();
  } else refreshAttemptChip();
  if (vis && vis.update) vis.update(ctrl.getResponse());
  return { focus: () => { const p = card.querySelector('#prompt'); if (p) p.focus({ preventScroll: false }); } };
}

/* ---------------- explorer (unscored) ---------------- */
export function renderExplore(app, rec, host) {
  const item = rec.item;
  const card = h('article', { class: 'card item explore', 'data-item': rec.id });
  card.append(h('h1', { class: 'sr-only' }, `${(app.plan.stations[rec.stationIndex] || {}).title || ''}: explorer`));
  card.append(h('div', { class: 'item-head' }, h('span', { class: 'chip soft' }, 'Explore · not scored')));
  card.append(h('h2', { class: 'prompt', tabindex: '-1', id: 'prompt' }, rich(item.title)));
  if (item.text) card.append(h('p', { class: 'lead' }, rich(item.text)));
  const vhost = h('div', { class: 'visuals' });
  card.append(vhost);
  mountVisual(vhost, item, { item, session: app.session, plan: app.plan, app });
  const go = h('button', { type: 'button', class: 'btn-primary' }, 'Continue →');
  go.addEventListener('click', () => app.next());
  card.append(h('div', { class: 'item-foot' }, h('span'), go));
  host.append(card);
  return { focus: () => card.querySelector('#prompt').focus() };
}

/* ---------------- review (finished stations; no credit) ---------------- */
export function renderReviewCard(app, rec) {
  const item = rec.item;
  const st = app.session.items[rec.id] || { attempts: [], earned: 0 };
  const box = h('article', { class: 'card review-card' });
  const status = st.skipped ? 'Skipped' : st.solved ? (st.attempts.length === 1 ? 'Got it on the first try' : `Got it on try ${st.attempts.length}`) : 'Reviewed';
  box.append(h('div', { class: 'item-head' }, h('span', { class: 'chip' }, `Question ${rec.num}`), h('span', { class: 'chip soft' }, status)));
  box.append(passageEl(app, item) || '');
  if (item.chat && item.friendSays) box.append(h('p', { class: 'bubble friend' }, rich(item.friendSays)));
  box.append(h('h3', { class: 'prompt' }, rich(item.prompt)));
  const ihost = h('div', { class: 'interaction' });
  box.append(ihost);
  const c = COMP[item.type].mount(ihost, { item, view: rec.view, state: st, rec, onChange() {} });
  c.showCorrect();
  if (item.explain) box.append(h('p', { class: 'fb-explain' }, h('strong', {}, 'Why: '), rich(item.explain)));
  return box;
}
