// One question: prompt, widget, Check button, attempts, hints, feedback, explanation, and the teacher's answer-key overlay.
import { h, mount, announce, rich } from './util.js';
import { makeWidget } from './widgets.js';

export function keyLines(item, entry) {
  const k = entry.key, lines = [];
  const opt = (id) => ((item.options || []).find((o) => o.id === id) || {}).text || id;
  if (item.type === 'single') lines.push(opt(k.correct));
  else if (item.type === 'multi') k.correct.forEach((id) => lines.push('• ' + opt(id)));
  else if (item.type === 'order') { const t = (id) => (item.steps.find((s) => s.id === id) || {}).text; k.order.forEach((id, i) => lines.push((i + 1) + '. ' + t(id))); }
  else if (item.type === 'numeric') lines.push(k.value + (item.numeric.unit ? ' ' + item.numeric.unit : '') + (k.tolerance ? ' (±' + k.tolerance + ')' : ''));
  else if (item.type === 'assign') {
    const A = item.assign, card = (id) => (A.cards.find((c) => c.id === id) || {}).text, tgt = (id) => (A.targets.find((t) => t.id === id) || {}).label;
    if (A.mode === 'classify') Object.keys(k.map).forEach((cid) => lines.push(tgt(k.map[cid]) + '  <-  ' + card(cid)));
    else Object.keys(k.map).forEach((tid) => lines.push(tgt(tid) + '  =  ' + card(k.map[tid])));
    lines.sort();
  }
  return lines;
}

/**
 * env: {
 *   content, seedBase, number, preview,
 *   getState(id) -> {a,ok,l,c,hints,ex,fb}, setState(id, view),
 *   isUnlocked(item) -> bool, isGated() -> bool,
 *   submit(itemId, response, onStatus) -> Promise<serverResponse>,
 *   onResult(res), keys: () => entry|null (teacher overlay)
 * }
 */
export function createItemView(item, env) {
  let busy = false, offline = false, lastWrong = false, errorMsg = '';
  const st0 = () => env.getState(item.id) || { a: 0, ok: 0, l: 0, c: null };
  const widget = makeWidget(item, { seed: env.seedBase + '|' + item.id, attempt: st0().a, content: env.content });

  const checkBtn = h('button.btn', { type: 'button', onclick: onCheck }, 'Check answer');
  const pips = h('span.pips', { 'aria-hidden': 'true' });
  const pipsText = h('span.sr-only');
  const status = h('span.small.muted', { role: 'status' });
  const feedback = h('div.feedback', { 'aria-live': 'polite' });
  const keyBox = h('div');
  const headTags = h('div.item-head');
  const zone = h('div.widget-zone', widget.el);
  const actions = h('div.actions', checkBtn, pips, pipsText, status);
  const lockedBox = h('div.stage-lock', h('span', { 'aria-hidden': 'true' }, '🔒'), h('span', 'This step opens when you finish the step above.'));
  const gateBox = h('div.gate-cover', 'Open and read all of the documents above to unlock this question.');
  const sceneBox = item.scene ? h('div.scene', item.sceneTitle ? h('div.scene-title', item.sceneTitle) : null, [].concat(item.scene).map((p) => h('p', rich(p)))) : null;
  const root = h('section.item', { id: 'item-' + item.id, 'aria-labelledby': 'prompt-' + item.id },
    headTags, sceneBox, h('h3.prompt', { id: 'prompt-' + item.id }, item.prompt), lockedBox, gateBox, zone, actions, feedback, keyBox);

  widget.onChange(() => { errorMsg = ''; updateButtons(); });

  function updateButtons() {
    const st = st0(), done = !!(st.ok || st.l);
    const locked = !env.isUnlocked(item), gated = env.isGated() && !env.preview;
    checkBtn.disabled = busy || done || locked || gated || !widget.isComplete();
    checkBtn.textContent = busy ? 'Checking…' : 'Check answer';
  }

  function render() {
    const st = st0(), done = !!(st.ok || st.l);
    const locked = !env.isUnlocked(item), gated = env.isGated() && !env.preview;
    root.dataset.state = done ? (st.ok ? 'done' : 'locked') : 'idle';
    root.dataset.busy = String(busy);
    root.dataset.gated = String(gated && !locked);
    root.classList.toggle('locked-stage', locked);
    lockedBox.hidden = !locked; gateBox.hidden = locked || !gated; zone.hidden = locked; actions.hidden = locked || done;
    mount(headTags,
      h('span.tag', 'Question ' + env.number), h('span.tag', item.points + (item.points === 1 ? ' point' : ' points')),
      item.stage ? h('span.tag.stage', 'Step ' + item.stage) : null,
      done ? (st.ok ? h('span.tag.done', st.c === 1 ? 'Correct · full credit' : 'Correct · ' + Math.round(st.c * 100) + '% credit') : h('span.tag.lock', 'Locked · no credit')) : null,
      env.preview ? h('span.tag', 'Preview') : null);
    const left = Math.max(0, 3 - (st.a || 0));
    pips.replaceChildren(...[0, 1, 2].map((i) => h('i', { class: i < st.a ? 'used' : '' })));
    pipsText.textContent = left + ' attempts left';
    if (!done) { pips.setAttribute('aria-hidden', 'false'); pips.title = left + ' of 3 attempts left'; }
    const visible = !done ? [h('span', 'Attempts left: ' + left)] : [];
    status.replaceChildren(...visible);
    widget.setDisabled(done || busy || locked);
    updateButtons();
    renderFeedback(st, done);
    renderKey();
  }

  function renderFeedback(st, done) {
    const kids = [];
    (st.hints || []).forEach((t, i) => kids.push(h('div.fb.hint', h('strong', 'Hint ' + (i + 1)), t)));
    if (st.fb) kids.push(h('div.fb.narr', st.fb));
    if (lastWrong && !done) kids.unshift(h('div.fb.try', h('strong', 'Not quite.'), (3 - st.a) + (3 - st.a === 1 ? ' attempt' : ' attempts') + ' left. Read the hint, then change your answer and check again.'));
    if (offline) kids.unshift(h('div.fb.try', h('strong', 'Reconnecting…'), 'Your answer will be sent automatically as soon as the connection is back. Your attempt has not been used.'));
    if (errorMsg) kids.unshift(h('div.fb.try', h('strong', 'Check this first'), errorMsg));
    if (done) {
      kids.unshift(st.ok
        ? h('div.fb.ok', h('strong', st.c === 1 ? 'Correct. Full credit.' : 'Correct. ' + Math.round(st.c * 100) + '% credit.'), 'You answered on attempt ' + st.a + '.')
        : h('div.fb.lock', h('strong', 'No attempts left. This question is locked.'), 'Read the explanation below, then move on. You are not stuck: the next step opens.'));
      if (st.ex) kids.push(h('div.fb.explain', h('strong', 'Explanation'), st.ex));
    }
    feedback.replaceChildren(...kids);
  }

  function renderKey() {
    const entry = env.keys ? env.keys() : null;
    if (!entry) { keyBox.replaceChildren(); return; }
    keyBox.replaceChildren(h('div.key-overlay',
      h('h4', 'Answer key (teacher preview only)'),
      h('pre', keyLines(item, entry).join('\n')),
      h('pre', 'Hint 1: ' + entry.hints[0]), h('pre', 'Hint 2: ' + entry.hints[1]),
      h('pre', 'Explanation: ' + entry.explanation)));
  }

  async function onCheck() {
    if (busy || checkBtn.disabled) return;
    busy = true; errorMsg = ''; offline = false; lastWrong = false; render();
    let res;
    try { res = await env.submit(item.id, widget.getResponse(), (s) => { offline = !!s.offline; renderFeedback(st0(), false); }); }
    catch (e) { res = { ok: false, error: { code: 'CLIENT', message: 'Something went wrong. Try again.' } }; }
    busy = false; offline = false;
    if (res.ok) {
      if (res.state) env.setState(item.id, res.state);
      const st = st0();
      lastWrong = res.correct === false && !st.l;
      if (!res.alreadyDone && (res.correct || res.locked)) { widget.setDisabled(true); }
      else if (!res.alreadyDone && res.correct === false) { widget.reshuffle(st.a); }
      render();
      announce(res.alreadyDone ? 'This question was already finished.' : res.correct ? 'Correct.' : res.locked ? 'Locked. See the explanation.' : 'Not quite. ' + (3 - st.a) + ' attempts left. ' + (res.hint || ''));
      env.onResult(res);
    } else {
      const c = res.error && res.error.code;
      if (c === 'BAD_RESPONSE') errorMsg = res.error.message;
      else if (c === 'STAGE_LOCKED') { errorMsg = res.error.message; }
      else if (['EXPIRED', 'FINALIZED', 'NO_SESSION'].includes(c)) { env.onFatal(res); return; }
      else errorMsg = (res.error && res.error.message) || 'Something went wrong. Try again.';
      render();
    }
  }

  render();
  return { el: root, refresh: render, focus: () => widget.focus(), id: item.id };
}
