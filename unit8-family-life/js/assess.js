// The assessment screen: top bar (chapters, timer, save status), pages, navigation, question map, final review.
import { h, $, mount, announce, fmtClock, trapFocus, prefs, rich } from './util.js';
import { renderBlocks } from './blocks.js';
import { createItemView } from './item.js';
import { clock, onSaveState, call, bestEffort, submitAnswer } from './api.js';
import { levelFor, remainingMs, crossed, announceText, MIN } from './timer.js';

export function startAssessment(rootEl, ctx) {
  const { content } = ctx, S = ctx.state, preview = !!ctx.preview;
  const itemSet = new Set(S.itemIds);
  const chapters = content.chapters
    .map((ch) => ({ ...ch, units: ch.units.map((u) => ({ ...u, items: u.items.filter((i) => itemSet.has(i.id)) })).filter((u) => u.items.length) }))
    .filter((ch) => ch.units.length);
  const number = {}; S.itemIds.forEach((id, i) => { number[id] = i + 1; });
  const pages = [];
  chapters.forEach((ch) => { pages.push({ type: 'chapter', ch }); ch.units.forEach((u) => pages.push({ type: 'unit', ch, u })); });
  pages.push({ type: 'review' });
  const seen = new Set((S.ui && S.ui.ev) || []);
  const views = {}; // itemId -> view for the page on screen
  let pageIndex = 0, timersOn = true, keysMap = null, showKeys = false, closeModal = null, prevRem = null, expiring = false;
  const intervals = [];

  /* ---------- state helpers ---------- */
  const st = (id) => S.items[id];
  const done = (id) => { const x = st(id); return !!(x && (x.ok || x.l)); };
  const chapterProgress = (ch) => { const ids = ch.units.flatMap((u) => u.items.map((i) => i.id)); return { done: ids.filter(done).length, total: ids.length }; };
  const unitDone = (u) => u.items.every((i) => done(i.id));
  const allIds = S.itemIds;
  const isUnlocked = (item) => preview || !item.unlockAfter || done(item.unlockAfter);

  /* ---------- shell ---------- */
  const timerTime = h('span.time', '--:--');
  const timerBox = h('div.timer', { 'data-state': 'ok', role: 'group', 'aria-label': 'Time remaining' }, h('span.lbl', 'Time left'), timerTime);
  const saveInd = h('span.save-ind', { 'data-state': 'saved', role: 'status' }, 'Saved');
  const menuBtn = h('button.menu-btn', { type: 'button', 'aria-label': 'Menu', onclick: openMenu }, '⋯');
  const chapNav = h('ol.chapters-nav', { 'aria-label': 'Chapters' });
  const overall = h('div.overall', { role: 'progressbar', 'aria-label': 'Questions finished', 'aria-valuemin': '0', 'aria-valuemax': '100' }, h('i'));
  const banner = h('div.timer-banner', { hidden: true, role: 'alert' });
  const topbar = h('header.topbar', h('div.topbar-inner',
    h('div.brand', 'Life Decisions', h('small', 'Unit 8 · Family Life & Sexuality')),
    chapNav,
    h('div.topbar-right', saveInd, preview ? h('span.tag', 'Preview') : timerBox, menuBtn)), overall);
  const main = h('main.main', { id: 'main', tabindex: '-1' });
  const ribbon = preview ? previewRibbon() : null;
  mount(rootEl, banner, ribbon, topbar, main);
  const offSave = onSaveState((s, info) => {
    saveInd.dataset.state = s;
    saveInd.textContent = s === 'saved' ? 'Saved' : s === 'saving' ? 'Saving…' : 'Reconnecting…';
    if (s === 'offline') saveInd.title = 'Your answers are safe on the server. Unsent answers will be sent automatically.';
  });

  function renderChapNav() {
    const cur = pages[pageIndex].ch;
    chapNav.replaceChildren(...chapters.map((ch) => {
      const p = chapterProgress(ch);
      const chip = h('button.chap-chip' + (p.done === p.total ? '.done' : ''), {
        type: 'button', title: 'Chapter ' + ch.n + ': ' + ch.title, 'data-theme': ch.theme, 'aria-current': cur && cur.id === ch.id ? 'step' : null,
        'aria-label': 'Chapter ' + ch.n + ': ' + ch.title + '. ' + p.done + ' of ' + p.total + ' finished.',
        onclick: () => goChapter(ch)
      }, h('span.n', String(ch.n)), cur && cur.id === ch.id ? h('span.t', ch.title.split(' & ')[0]) : null, h('span.prog', h('i', { style: { width: (p.total ? p.done / p.total * 100 : 0) + '%' } })));
      return h('li', chip);
    }));
    const total = allIds.length, d = allIds.filter(done).length;
    overall.firstChild.style.width = (total ? d / total * 100 : 0) + '%';
    overall.setAttribute('aria-valuenow', String(Math.round(total ? d / total * 100 : 0)));
    overall.setAttribute('aria-valuetext', d + ' of ' + total + ' questions finished');
  }

  /* ---------- navigation ---------- */
  function goChapter(ch) {
    const firstUnfinished = ch.units.find((u) => !unitDone(u));
    const target = pages.findIndex((p) => p.type === 'unit' && p.u.id === (firstUnfinished || ch.units[0]).id);
    const allDone = !firstUnfinished;
    go(allDone ? pages.findIndex((p) => p.type === 'chapter' && p.ch.id === ch.id) : target);
  }
  function go(i, opts) {
    pageIndex = Math.max(0, Math.min(pages.length - 1, i));
    const p = pages[pageIndex];
    document.body.dataset.theme = p.ch ? p.ch.theme : 'lab';
    topbar.dataset.theme = p.ch ? p.ch.theme : 'lab';
    Object.keys(views).forEach((k) => delete views[k]);
    main.dataset.page = p.type;
    mount(main, p.type === 'chapter' ? chapterPage(p) : p.type === 'unit' ? unitPage(p) : reviewPage());
    renderChapNav();
    if (!(opts && opts.noScroll)) window.scrollTo(0, 0);
    const head = $('h1, h2', main); if (head) { head.setAttribute('tabindex', '-1'); if (!(opts && opts.noFocus)) head.focus({ preventScroll: true }); }
    announce(p.type === 'chapter' ? 'Chapter ' + p.ch.n + ' of ' + chapters.length + ': ' + p.ch.title : p.type === 'unit' ? p.u.title : 'Review and submit');
    savePosition(p);
  }
  let posTimer = null;
  function savePosition(p) {
    if (preview) return;
    clearTimeout(posTimer);
    posTimer = setTimeout(() => {
      const pos = p.type === 'unit' ? { ch: p.ch.id, unit: p.u.id, item: p.u.items[0].id } : p.type === 'chapter' ? { ch: p.ch.id, unit: '', item: '' } : { ch: 'review', unit: '', item: '' };
      S.pos = pos;
      bestEffort('position', { token: ctx.token, pos, ui: { ev: Array.from(seen) } });
    }, 400);
  }
  const nextLabel = () => (pageIndex >= pages.length - 2 ? 'Review & submit' : 'Next');
  function pager() {
    return h('nav.pager', { 'aria-label': 'Page navigation' },
      h('button.btn.secondary', { type: 'button', disabled: pageIndex === 0, onclick: () => go(pageIndex - 1) }, '← Back'),
      h('span.small.muted', 'Page ' + (pageIndex + 1) + ' of ' + pages.length),
      pages[pageIndex].type === 'review' ? h('span') : h('button.btn', { type: 'button', id: 'next-btn', onclick: () => go(pageIndex + 1) }, nextLabel() + ' →'));
  }

  /* ---------- pages ---------- */
  function chapterPage(p) {
    const ch = p.ch, prog = chapterProgress(ch);
    return h('div', { 'data-theme': ch.theme },
      h('section.hero',
        h('div.kicker', 'Chapter ' + ch.n + ' of ' + chapters.length), h('h1', ch.title), h('p', ch.intro),
        h('div.row', h('button.btn', { type: 'button', onclick: () => go(pageIndex + 1) }, prog.done ? 'Continue chapter' : 'Start chapter'),
          h('span', ch.units.reduce((a, u) => a + u.items.length, 0) + ' questions · about ' + ch.targetMinutes + ' minutes'))),
      ctx.content.decisionModel && ch.theme === 'paths' ? h('div.unit', h('h2', 'The ' + content.decisionModel.name + ' model'), h('p', content.decisionModel.note), renderBlocks([{ t: 'steps' }], bctx())) : null,
      pager());
  }
  function bctx(extra) { return Object.assign({ content, seen, gate: [], onEvidence: null, stopProgress: null }, extra || {}); }

  function unitPage(p) {
    const { ch, u } = p;
    const staged = u.items.some((i) => i.stage);
    const stopHolder = h('div');
    const unitEl = h('article.unit', { 'data-theme': ch.theme, 'aria-label': u.title });
    function stopProgress() { const pr = {}; u.items.forEach((i) => { if (i.stage) pr[i.stage] = done(i.id); }); return pr; }
    const gate = u.gate || [];
    const isGated = () => gate.length > 0 && !gate.every((g) => seen.has(g));
    const evOpen = (id) => { S.ui = Object.assign({}, S.ui, { ev: Array.from(seen) }); savePosition(p); refreshViews(); };
    const blockCtx = bctx({ gate: preview ? [] : gate, onEvidence: evOpen, stopProgress: staged ? stopProgress() : null });
    const stimNodes = renderBlocks(u.stimulus, blockCtx);
    // The STOP stepper lives in its own holder so it can redraw (and the tree can grow) as stages are finished.
    if (staged) {
      const idx = (u.stimulus || []).findIndex((b) => b.t === 'steps');
      if (idx >= 0) { stimNodes[idx] = stopHolder; stopHolder.replaceChildren(...renderBlocks([{ t: 'steps' }], blockCtx)); }
    }
    function refreshViews() {
      Object.values(views).forEach((v) => v.refresh());
      if (staged) stopHolder.replaceChildren(...renderBlocks([{ t: 'steps' }], bctx({ stopProgress: stopProgress() })));
      renderChapNav();
      const nb = $('#next-btn'); if (nb) nb.classList.toggle('pulse', unitDone(u));
    }
    const env = {
      content, preview, seedBase: S.session.studentId,
      getState: st, isUnlocked, isGated: () => (preview ? false : isGated()),
      setState(id, view) { S.items[id] = view; },
      submit: (itemId, response, onStatus) => submitAnswer({ token: ctx.token, itemId, response, pos: S.pos }, onStatus),
      onResult() { refreshViews(); },
      onFatal: (res) => ctx.onFatal(res),
      keys: null
    };
    const itemEls = u.items.map((it) => {
      const e = Object.assign({}, env, { number: number[it.id], keys: () => (showKeys && keysMap ? keysMap[it.id] : null) });
      const v = createItemView(it, e);
      views[it.id] = v;
      return v.el;
    });
    unitEl.append(
      h('div.unit-head', h('h2', u.title), h('span.where', 'Chapter ' + ch.n + ' · ' + ch.title)),
      h('div.stim', ...stimNodes), ...itemEls);
    return h('div', { 'data-theme': ch.theme }, unitEl, pager());
  }

  function unanswered() {
    const out = [];
    chapters.forEach((ch) => ch.units.forEach((u) => u.items.forEach((it) => { if (!done(it.id)) out.push({ ch, u, it }); })));
    return out;
  }
  function reviewPage() {
    const un = unanswered();
    return h('div', { 'data-theme': 'case' },
      h('article.unit',
        h('div.unit-head', h('h1', 'Review & submit')),
        h('p', un.length ? 'You have ' + un.length + ' question' + (un.length === 1 ? '' : 's') + ' that ' + (un.length === 1 ? 'is' : 'are') + ' not finished. You can go back to any of them before you submit.' : 'Every question is finished. When you submit, your work is locked and cannot be changed.'),
        un.length ? h('div.review-list', un.map((x) => h('div.row', h('button.btn.secondary.small', { type: 'button', onclick: () => jumpTo(x.u.id, x.it.id) }, 'Go to question ' + number[x.it.id]), h('span', x.ch.title + ' · ' + x.u.title)))) : null,
        h('div.banner.warn', { style: { marginTop: '16px' } }, h('div', h('strong', 'Submitting is final. '), 'After you submit you cannot change any answer. Your teacher can reset your progress if something went wrong.')),
        h('div.row', { style: { marginTop: '16px' } }, h('button.btn.big', { type: 'button', onclick: confirmSubmit }, 'Submit assessment'))),
      pager());
  }
  function jumpTo(unitId, itemId) {
    go(pages.findIndex((p) => p.type === 'unit' && p.u.id === unitId), { noScroll: true, noFocus: true });
    const el = document.getElementById('item-' + itemId); if (el) { el.scrollIntoView({ block: 'start' }); if (views[itemId]) views[itemId].focus(); }
  }

  /* ---------- modals ---------- */
  function modal(content, opts) {
    if (closeModal) closeModal();
    const ov = h('div.overlay', { role: 'presentation' });
    const box = h('div.modal' + (opts && opts.wide ? '.wide' : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': (opts && opts.label) || 'Dialog' }, ...content);
    ov.appendChild(box); document.body.appendChild(ov);
    const release = trapFocus(box, () => close());
    function close() { release(); ov.remove(); closeModal = null; }
    closeModal = close;
    return close;
  }
  function confirmSubmit() {
    const un = unanswered();
    const close = modal([
      h('h2', 'Submit your assessment?'),
      un.length ? h('div', h('p', h('strong', 'These ' + un.length + ' question' + (un.length === 1 ? ' is' : 's are') + ' not finished and will score 0:')),
        h('ul', un.map((x) => h('li', 'Question ' + number[x.it.id] + ' · ' + x.ch.title + ' · ' + x.u.title)))) : h('p', 'Every question is finished.'),
      h('p', 'After you submit, your answers are locked.'),
      h('div.modal-actions', h('button.btn.secondary', { type: 'button', onclick: () => close() }, 'Keep working'), h('button.btn', { type: 'button', id: 'confirm-submit', onclick: async (e) => { e.target.disabled = true; e.target.textContent = 'Submitting…'; const ok = await ctx.finish(); if (ok) close(); else { e.target.disabled = false; e.target.textContent = 'Submit now'; } } }, 'Submit now'))
    ], { label: 'Confirm submit' });
  }
  function openMap() {
    const rows = chapters.map((ch) => h('section.map-ch', { 'data-theme': ch.theme }, h('h3', 'Chapter ' + ch.n + ': ' + ch.title),
      h('ul.map-units', ch.units.map((u) => { const d = u.items.filter((i) => done(i.id)).length; const pi = pages.findIndex((x) => x.type === 'unit' && x.u.id === u.id);
        return h('li', h('button', { type: 'button', onclick: () => { closeModal && closeModal(); go(pi); } }, h('span.dot' + (d === u.items.length ? '.full' : d ? '.part' : ''), { 'aria-hidden': 'true' }), h('span', u.title), h('span.muted.small', { style: { marginLeft: 'auto' } }, d + '/' + u.items.length)), h('span.sr-only', d === u.items.length ? 'finished' : d ? 'partly finished' : 'not started')); }))));
    const close = modal([h('h2', 'Question map'), h('p.muted', 'Jump to any page. Green means finished.'), h('div.map', rows), h('div.modal-actions', h('button.btn.secondary', { type: 'button', onclick: () => close() }, 'Close'))], { wide: true, label: 'Question map' });
  }
  function openMenu() {
    const reduce = prefs.get('motion') === 'reduced';
    const cb = h('input', { type: 'checkbox', checked: reduce, onchange: (e) => { const v = e.target.checked ? 'reduced' : 'full'; prefs.set('motion', v); document.documentElement.dataset.motion = v === 'reduced' ? 'reduced' : ''; } });
    const close = modal([
      h('h2', 'Menu'),
      h('div.stack',
        h('button.btn.secondary', { type: 'button', style: { width: '100%' }, onclick: () => { close(); openMap(); } }, 'Question map'),
        h('div.options-row', h('label', cb, 'Reduce motion and animation')),
        h('p.small.muted', 'Your answers are saved on the server as you go. Signing out does not stop the timer.'),
        h('button.btn.secondary', { type: 'button', style: { width: '100%' }, onclick: () => { close(); ctx.signOut(); } }, preview ? 'Close preview' : 'Sign out')),
      h('div.modal-actions', h('button.btn', { type: 'button', onclick: () => close() }, 'Close'))
    ], { label: 'Menu' });
  }

  /* ---------- teacher preview ribbon ---------- */
  function previewRibbon() {
    const keyBtn = h('button.btn.secondary', { type: 'button', onclick: async () => {
      if (!keysMap) { const r = await call('tKeys', { tt: ctx.teacherToken }); if (!r.ok) { announce('Could not load the answer key.'); return; } keysMap = r.keys; }
      showKeys = !showKeys; keyBtn.textContent = showKeys ? 'Hide answer key' : 'Show answer key';
      Object.values(views).forEach((v) => v.refresh());
    } }, 'Show answer key');
    return h('div.preview-ribbon', h('span', 'TEACHER PREVIEW. Nothing here is recorded as a student score.'), keyBtn,
      h('button.btn.secondary', { type: 'button', onclick: async () => { if (!confirm('Clear all of your preview answers and start the preview over?')) return; await call('tPreviewReset', { tt: ctx.teacherToken }); ctx.restartPreview(); } }, 'Reset my preview progress'),
      h('button.btn.secondary', { type: 'button', onclick: () => ctx.signOut() }, 'Exit preview'));
  }

  /* ---------- timer + resync ---------- */
  function tick() {
    if (preview || !S.session.deadline) return;
    const rem = remainingMs(S.session.deadline, Date.now(), clock.offset);
    const lv = levelFor(rem);
    timerBox.dataset.state = lv.level;
    timerTime.textContent = fmtClock(rem);
    banner.hidden = !lv.banner || lv.expired;
    if (!banner.hidden) banner.textContent = Math.max(1, Math.ceil(rem / MIN)) + ' minutes or less left. Finish the question you are on, then submit.';
    crossed(prevRem, rem).forEach((t) => { const text = announceText(t); announce(text, t <= 5 * MIN ? 'assertive' : 'polite'); });
    prevRem = rem;
    if (lv.expired && !expiring) { expiring = true; ctx.onTimeUp(); }
  }
  async function resync() {
    if (preview || expiring) return;
    try {
      const r = await call('state', { token: ctx.token });
      if (!r.ok) { if (r.error && r.error.code === 'NO_SESSION') ctx.onFatal(r); return; }
      if (r.completion) { ctx.onFinish(r.completion, r); return; }
      if (r.session.deadline && r.session.deadline !== S.session.deadline) { S.session.deadline = r.session.deadline; announce('Your teacher changed your time. Check the timer.'); }
      itemSetMerge(r.items);
    } catch (e) { /* offline: the timer keeps counting from the last known server deadline */ }
  }
  function itemSetMerge(items) {
    let changed = false;
    Object.keys(items || {}).forEach((id) => { const a = items[id], b = S.items[id]; if (!b || a.a !== b.a || a.ok !== b.ok || a.l !== b.l) { S.items[id] = a; changed = true; } });
    if (changed) { Object.values(views).forEach((v) => v.refresh()); renderChapNav(); }
  }
  if (!preview) {
    tick(); intervals.push(setInterval(tick, 1000), setInterval(resync, 60000));
    const onVis = () => { if (document.visibilityState === 'visible') { tick(); resync(); } };
    document.addEventListener('visibilitychange', onVis); window.addEventListener('online', resync);
    intervals.push({ clear: () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', resync); } });
  }

  /* ---------- go ---------- */
  let startPage = 0;
  if (S.pos && S.pos.unit) { const i = pages.findIndex((p) => p.type === 'unit' && p.u.id === S.pos.unit); if (i >= 0) startPage = i; }
  else if (S.pos && S.pos.ch === 'review') startPage = pages.length - 1;
  go(startPage, { noFocus: true });
  if (ctx.resumed) announce('Welcome back. You are where you left off.');

  return {
    go, pages,
    destroy() { intervals.forEach((i) => (i.clear ? i.clear() : clearInterval(i))); offSave(); if (closeModal) closeModal(); clearTimeout(posTimer); }
  };
}
