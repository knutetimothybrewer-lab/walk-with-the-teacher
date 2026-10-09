// Response widgets and the three-attempt item runner.  Every widget has a keyboard path; drag-and-drop is an enhancement.
import { h, md, announce, uid, clear, fmt, money } from './util.js';
import { renderBlocks } from './blocks.js';
import { call } from './api.js';
import { S, payload } from './state.js';

const MAXA = 3, CREDIT = [1, 0.85, 0.75];

// ------------------------------------------------------------------------------------------ widgets
function choiceWidget(part) {
  const name = uid(6), inputs = [];
  const list = h('div', { class: 'opts' }, part.options.map((o, i) => {
    const id = `${name}-${i}`, inp = h('input', { type: 'radio', name, value: o.id, id }); inputs.push(inp);
    return h('label', { class: 'opt', for: id }, inp, h('span', { class: 'mark', 'aria-hidden': 'true' }), h('span', { class: 'ot' }, md(o.text)));
  }));
  const el = h('fieldset', { class: 'part' }, h('legend', null, md(part.prompt || 'Choose one.')), list);
  return {
    el, kind: 'choice',
    get: () => { const c = inputs.find((i) => i.checked); return c ? { c: c.value } : null; },
    set: (r) => { if (r && r.c) inputs.forEach((i) => { i.checked = i.value === r.c; }); },
    disable: (b) => inputs.forEach((i) => { i.disabled = b; }),
    onChange: (cb) => inputs.forEach((i) => i.addEventListener('change', cb))
  };
}

function multiWidget(part) {
  const name = uid(6), inputs = [], min = part.min != null ? part.min : 1, max = part.max != null ? part.max : 99;
  const note = h('p', { class: 'muted small' }, max < part.options.length ? `Select between ${min} and ${max}.` : 'Select all that apply.');
  const list = h('div', { class: 'opts' }, part.options.map((o, i) => {
    const id = `${name}-${i}`, inp = h('input', { type: 'checkbox', value: o.id, id }); inputs.push(inp);
    return h('label', { class: 'opt check', for: id }, inp, h('span', { class: 'mark', 'aria-hidden': 'true' }), h('span', { class: 'ot' }, md(o.text)));
  }));
  const el = h('fieldset', { class: 'part' }, h('legend', null, md(part.prompt || 'Select all that apply.')), note, list);
  return {
    el, kind: 'multi',
    get: () => { const c = inputs.filter((i) => i.checked).map((i) => i.value); return c.length >= min && c.length <= max ? { c } : null; },
    set: (r) => { if (r && r.c) inputs.forEach((i) => { i.checked = r.c.includes(i.value); }); },
    disable: (b) => inputs.forEach((i) => { i.disabled = b; }),
    onChange: (cb) => inputs.forEach((i) => i.addEventListener('change', cb))
  };
}

function numberWidget(part) {
  const inputs = {};
  const rows = part.fields.map((f) => {
    const lid = uid(6);
    if (f.kind === 'ratio') {
      const a = h('input', { class: 'input num', inputmode: 'decimal', autocomplete: 'off', 'aria-label': f.label + ' (first number)', id: lid }), b = h('input', { class: 'input num', inputmode: 'decimal', autocomplete: 'off', 'aria-label': f.label + ' (second number)' });
      inputs[f.id] = { ratio: true, a, b };
      return h('div', { class: 'numf' }, h('label', { for: lid }, md(f.label)), h('span', { class: 'inwrap ratio' }, a, h('b', { 'aria-hidden': 'true' }, ':'), b));
    }
    const inp = h('input', { class: 'input num', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', id: lid });
    inputs[f.id] = { ratio: false, inp };
    return h('div', { class: 'numf' }, h('label', { for: lid }, md(f.label)), h('span', { class: 'inwrap' }, f.unit === '$' ? h('span', { class: 'unit pre' }, '$') : null, inp, f.unit && f.unit !== '$' ? h('span', { class: 'unit' }, f.unit) : null), f.hint ? h('small', { class: 'muted' }, f.hint) : null);
  });
  const el = h('fieldset', { class: 'part' }, h('legend', null, md(part.prompt || 'Enter your answers.')), h('div', { class: 'numgrid' }, rows));
  const all = () => Object.values(inputs).flatMap((x) => (x.ratio ? [x.a, x.b] : [x.inp]));
  return {
    el, kind: 'number',
    get: () => {
      const v = {};
      for (const f of part.fields) {
        const x = inputs[f.id];
        if (x.ratio) { if (!window.U5.parseNum(x.a.value) || !window.U5.parseNum(x.b.value)) return null; v[f.id] = { a: x.a.value.trim(), b: x.b.value.trim() }; }
        else { if (!window.U5.parseNum(x.inp.value)) return null; v[f.id] = x.inp.value.trim(); }
      }
      return { v };
    },
    set: (r) => { if (r && r.v) for (const f of part.fields) { const x = inputs[f.id], val = r.v[f.id]; if (val == null) continue; if (x.ratio) { x.a.value = val.a; x.b.value = val.b; } else x.inp.value = val; } },
    disable: (b) => all().forEach((i) => { i.disabled = b; }),
    onChange: (cb) => all().forEach((i) => i.addEventListener('input', cb))
  };
}

function mapSelectWidget(part) {
  const sels = {};
  const rows = part.rows.map((r) => {
    const id = uid(6), sel = h('select', { class: 'input', id }, h('option', { value: '' }, 'Choose…'), part.options.map((o) => h('option', { value: o.id }, o.text)));
    sels[r.id] = sel;
    return h('div', { class: 'maprow' }, h('label', { for: id }, md(r.text)), sel);
  });
  const el = h('fieldset', { class: 'part' }, h('legend', null, md(part.prompt || 'Match each one.')), h('div', { class: 'mapgrid' }, rows));
  return {
    el, kind: 'map',
    get: () => { const m = {}; for (const r of part.rows) { if (!sels[r.id].value) return null; m[r.id] = sels[r.id].value; } return { m }; },
    set: (r) => { if (r && r.m) for (const k of Object.keys(r.m)) if (sels[k]) sels[k].value = r.m[k]; },
    disable: (b) => Object.values(sels).forEach((s) => { s.disabled = b; }),
    onChange: (cb) => Object.values(sels).forEach((s) => s.addEventListener('change', cb))
  };
}

/** Drag-and-drop sorting board. The <select> on every card is the accessible alternative (and the source of truth). */
function mapDragWidget(part) {
  const place = {}; part.rows.forEach((r) => { place[r.id] = ''; });
  const listeners = [];
  const cards = {}, sels = {};
  let picked = null;
  const tray = h('div', { class: 'tray', 'aria-label': 'Cards not yet placed' });
  const buckets = {};
  const board = h('div', { class: 'board', style: `--cols:${Math.min(part.options.length, 3)}` }, part.options.map((o) => {
    const body = h('div', { class: 'bucket-body' }); buckets[o.id] = body;
    const box = h('div', { class: 'bucket', role: 'group', 'aria-label': 'Category: ' + o.text, dataset: { opt: o.id } }, h('div', { class: 'bucket-h' }, md(o.text)), body);
    box.addEventListener('click', (e) => { if (picked && !e.target.closest('.dcard')) { move(picked, o.id); picked = null; render(); } });
    return box;
  }));
  part.rows.forEach((r) => {
    const sel = h('select', { class: 'input mini', 'aria-label': 'Place: ' + r.text.slice(0, 80) }, h('option', { value: '' }, 'Move to…'), part.options.map((o) => h('option', { value: o.id }, o.text)));
    sels[r.id] = sel;
    sel.addEventListener('change', () => { move(r.id, sel.value); });
    const card = h('div', { class: 'dcard', tabindex: '0', role: 'button', 'aria-pressed': 'false', dataset: { row: r.id } }, h('div', { class: 'dtext' }, md(r.text)), sel);
    card.addEventListener('click', (e) => { if (e.target === sel) return; picked = picked === r.id ? null : r.id; render(); });
    card.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); picked = picked === r.id ? null : r.id; render(); } });
    card.addEventListener('pointerdown', (e) => startDrag(e, r.id, card));
    cards[r.id] = card;
  });
  function move(rowId, optId) { place[rowId] = optId; picked = null; listeners.forEach((cb) => cb()); render(); }
  function render() {
    clear(tray); Object.values(buckets).forEach(clear);
    part.rows.forEach((r) => {
      const card = cards[r.id]; sels[r.id].value = place[r.id] || '';
      card.setAttribute('aria-pressed', picked === r.id ? 'true' : 'false'); card.classList.toggle('picked', picked === r.id);
      (place[r.id] ? buckets[place[r.id]] : tray).append(card);
    });
    tray.classList.toggle('empty', !tray.childNodes.length);
  }
  function startDrag(e, rowId, card) {
    if (e.target.closest('select') || e.button > 0 || card.closest('.locked')) return;
    const startX = e.clientX, startY = e.clientY; let ghost = null, active = false;
    const move_ = (ev) => {
      if (!active && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
      if (!active) { active = true; ghost = card.cloneNode(true); ghost.classList.add('ghost'); ghost.style.width = card.offsetWidth + 'px'; document.body.append(ghost); card.classList.add('dragging'); }
      ghost.style.transform = `translate(${ev.clientX - card.offsetWidth / 2}px, ${ev.clientY - 20}px)`;
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move_); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (!active) return;
      ghost.remove(); card.classList.remove('dragging');
      const t = document.elementFromPoint(ev.clientX, ev.clientY), b = t && t.closest('.bucket');
      if (b) move(rowId, b.dataset.opt); else if (t && t.closest('.tray')) move(rowId, '');
    };
    window.addEventListener('pointermove', move_); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  render();
  const el = h('fieldset', { class: 'part' }, h('legend', null, md(part.prompt || 'Sort each card.')),
    h('p', { class: 'muted small' }, 'Drag a card into a category, or select a card and then a category. Every card also has a “Move to…” menu for keyboard use.'), tray, board);
  return {
    el, kind: 'map',
    get: () => (part.rows.every((r) => place[r.id]) ? { m: Object.assign({}, place) } : null),
    set: (r) => { if (r && r.m) { Object.assign(place, r.m); render(); } },
    disable: (b) => { el.classList.toggle('locked', b); Object.values(sels).forEach((s) => { s.disabled = b; }); Object.values(cards).forEach((c) => { c.tabIndex = b ? -1 : 0; }); },
    onChange: (cb) => listeners.push(cb)
  };
}

function orderWidget(part) {
  let order = part.options.map((o) => o.id);
  const byId = Object.fromEntries(part.options.map((o) => [o.id, o])), listeners = [];
  const ol = h('ol', { class: 'orderlist' });
  let locked = false;
  function render(focusId) {
    clear(ol);
    order.forEach((id, i) => {
      const up = h('button', { type: 'button', class: 'mv', 'aria-label': 'Move up: ' + byId[id].text.slice(0, 60), disabled: i === 0 || locked, onclick: () => shift(id, -1) }, '▲');
      const down = h('button', { type: 'button', class: 'mv', 'aria-label': 'Move down: ' + byId[id].text.slice(0, 60), disabled: i === order.length - 1 || locked, onclick: () => shift(id, 1) }, '▼');
      const li = h('li', { class: 'oitem', dataset: { id }, tabindex: locked ? '-1' : '0', 'aria-label': `Step ${i + 1} of ${order.length}: ${byId[id].text}. Use arrow keys to move.` }, h('span', { class: 'onum', 'aria-hidden': 'true' }, String(i + 1)), h('span', { class: 'ot' }, md(byId[id].text)), h('span', { class: 'omv' }, up, down));
      li.addEventListener('keydown', (e) => { if (e.key === 'ArrowUp' && !locked) { e.preventDefault(); shift(id, -1, true); } if (e.key === 'ArrowDown' && !locked) { e.preventDefault(); shift(id, 1, true); } });
      li.addEventListener('pointerdown', (e) => startDrag(e, id, li));
      ol.append(li);
    });
    if (focusId) { const f = ol.querySelector(`[data-id="${focusId}"]`); if (f) f.focus(); }
  }
  function shift(id, d, keepFocus) {
    const i = order.indexOf(id), j = i + d; if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]]; render(keepFocus ? id : null); listeners.forEach((cb) => cb());
    announce(`Moved to position ${j + 1} of ${order.length}`);
  }
  function startDrag(e, id, li) {
    if (locked || e.target.closest('button') || e.button > 0) return;
    const startY = e.clientY; let active = false, ghost = null;
    const mv = (ev) => {
      if (!active && Math.abs(ev.clientY - startY) < 6) return;
      if (!active) { active = true; ghost = li.cloneNode(true); ghost.classList.add('ghost'); ghost.style.width = li.offsetWidth + 'px'; document.body.append(ghost); li.classList.add('dragging'); }
      ghost.style.transform = `translate(${li.getBoundingClientRect().left}px, ${ev.clientY - 20}px)`;
      const items = Array.from(ol.children);
      for (let k = 0; k < items.length; k++) { const r = items[k].getBoundingClientRect(); if (ev.clientY > r.top && ev.clientY < r.bottom && items[k] !== li) { const to = order.indexOf(items[k].dataset.id), from = order.indexOf(id); if (to !== from) { order.splice(to, 0, order.splice(from, 1)[0]); render(); const nl = ol.querySelector(`[data-id="${id}"]`); nl.classList.add('dragging'); li = nl; listeners.forEach((cb) => cb()); } break; } }
    };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); if (ghost) ghost.remove(); li.classList.remove('dragging'); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  render();
  const el = h('fieldset', { class: 'part' }, h('legend', null, md(part.prompt || 'Put in order.')), h('p', { class: 'muted small' }, 'Drag to reorder, or use the ▲ ▼ buttons (or the arrow keys on a focused step).'), ol);
  return {
    el, kind: 'order',
    get: () => ({ o: order.slice() }),
    set: (r) => { if (r && r.o) { order = r.o.slice(); render(); } },
    disable: (b) => { locked = b; render(); },
    onChange: (cb) => listeners.push(cb)
  };
}

export function makeWidget(part) {
  if (part.type === 'choice') return choiceWidget(part);
  if (part.type === 'multi') return multiWidget(part);
  if (part.type === 'number') return numberWidget(part);
  if (part.type === 'map') return part.ui === 'drag' ? mapDragWidget(part) : mapSelectWidget(part);
  if (part.type === 'order') return orderWidget(part);
  return { el: h('p', null, 'Unsupported question part.'), get: () => null, set() {}, disable() {}, onChange() {} };
}

// ------------------------------------------------------------------------------------------ item runner
/**
 * renderItem(root, item, hooks)
 * hooks: { onChange(), openLab(simId), extra(item) -> Node|null, onTimeUp(), onDone(res) }
 */
export function renderItem(root, item, hooks) {
  const rec = () => S.state.items[item.id];
  const widgets = item.parts.map((p) => ({ part: p, w: makeWidget(p) }));
  const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const attemptLine = h('div', { class: 'attempt-line' });
  const btn = h('button', { class: 'btn btn-primary btn-lg', type: 'button' }, 'Check answer');
  const bar = h('div', { class: 'checkbar' }, attemptLine, btn);
  const pending = { rid: null, sig: null };

  const left = h('div', { class: 'item-left' },
    h('div', { class: 'step-head' }, h('div', { class: 'kicker' }, `Question · ${item.pts} point${item.pts === 1 ? '' : 's'}`), h('h2', { id: 'step-title', tabindex: '-1' }, item.title)),
    item.sim && hooks.openLab ? h('p', null, h('button', { class: 'btn btn-sm', type: 'button', onclick: () => hooks.openLab(item.sim) }, '\u{1F52C} Open the lab for this question')) : null,
    renderBlocks(item.stim),
    item.prompt ? h('div', { class: 'prompt' }, md(item.prompt)) : null);
  const right = h('div', { class: 'item-right' }, widgets.map((x) => x.w.el), feedback, bar, hooks.extra ? hooks.extra(item) : null);
  root.append(h('section', { class: 'item enter', 'aria-labelledby': 'step-title' }, h('div', { class: 'item-grid' }, left, right)));

  function setBusy(b) { btn.disabled = b || !complete(); btn.classList.toggle('busy', b); }
  function complete() { return widgets.every((x) => x.w.get()); }
  function responseObj() { const parts = {}; widgets.forEach((x) => { parts[x.part.id] = x.w.get(); }); return { parts }; }
  function refresh() {
    const r = rec();
    if (r.st !== 'open') { btn.hidden = true; attemptLine.hidden = true; widgets.forEach((x) => x.w.disable(true)); return; }
    btn.hidden = false; attemptLine.hidden = false;
    const n = r.n + 1;
    attemptLine.textContent = `Attempt ${n} of ${MAXA} · worth up to ${fmt(r.next.maxCredit, 2)} of ${item.pts} points`;
    btn.disabled = !complete();
  }
  widgets.forEach((x) => x.w.onChange(() => { pending.rid = null; refresh(); }));

  function showFeedback(kind, lines, extraNode) {
    clear(feedback);
    feedback.className = 'feedback ' + kind;
    feedback.append(...lines.map((l) => h('p', null, l)));
    if (extraNode) feedback.append(extraNode);
  }
  function applyState() {
    const r = rec();
    if (r.st === 'correct') showFeedback('good', [`✅ Correct. You earned ${fmt(r.earned, 2)} of ${item.pts} points (attempt ${r.n}).`]);
    else if (r.st === 'locked') showFeedback('bad', [`\u{1F512} This question is finished. You earned ${fmt(r.earned, 2)} of ${item.pts} points.`], r.explain ? h('div', { class: 'explain' }, h('strong', null, 'Explanation'), h('div', null, md(r.explain))) : null);
    else if (r.hint || r.detail) showFeedback('warn', hintLines(r));
    else clear(feedback);
    refresh();
  }
  function hintLines(r) {
    const lines = [];
    if (r.detail && r.detail.length > 1 || (r.detail && r.detail[0] && r.detail[0].total > 1)) {
      const got = r.detail.reduce((a, d) => a + d.got, 0), tot = r.detail.reduce((a, d) => a + d.total, 0);
      lines.push(`Partly right: about ${Math.round(got)} of ${tot} parts are correct. Try again.`);
    } else lines.push('Not quite. Try again.');
    if (r.hint) lines.push('\u{1F4A1} Hint: ' + r.hint);
    return lines;
  }
  // restore the previous answer after a refresh
  const r0 = rec();
  if (r0.st === 'open' && r0.last && r0.last.parts) widgets.forEach((x) => x.w.set(r0.last.parts[x.part.id]));
  applyState();

  btn.addEventListener('click', async () => {
    const resp = responseObj();
    if (!widgets.every((x) => resp.parts[x.part.id])) { showFeedback('warn', ['Answer every part before checking. This does not use up an attempt.']); return; }
    const sig = JSON.stringify(resp);
    if (pending.sig !== sig || !pending.rid) { pending.sig = sig; pending.rid = uid(20); }
    setBusy(true); showFeedback('info', ['Checking…']);
    const res = await call('submit', payload({ itemId: item.id, response: resp, requestId: pending.rid, expectedAttempt: rec().n + 1 }));
    setBusy(false);
    if (!res.ok) {
      if (res.state) { S.state = res.state; }
      if (res.code === 'TIME_UP' || res.code === 'FINALIZED') { hooks.onTimeUp && hooks.onTimeUp(res); return; }
      if (res.code === 'NO_SESSION') { hooks.onGone && hooks.onGone(res); return; }
      if (res.code === 'STALE' || res.code === 'ITEM_DONE') { applyState(); hooks.onChange && hooks.onChange(); showFeedback('warn', [res.message]); return; }
      if (res.code === 'NETWORK') { showFeedback('bad', ['Could not reach the server, so this answer was NOT counted. Check the connection and press Check answer again. Your attempt has not been used.']); refresh(); return; }
      showFeedback('warn', [res.message || 'That answer could not be checked.']); refresh(); return;
    }
    S.state = res.state; pending.rid = null;
    announce(res.correct ? 'Correct' : res.locked ? 'Question finished' : 'Not correct yet');
    applyState();
    hooks.onChange && hooks.onChange();
    if (res.status !== 'open') { hooks.onDone && hooks.onDone(res); try { right.querySelector('.feedback').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch { /* ignore */ } }
  });
  return { refresh: applyState };
}

/** A read-only summary shown when the student revisits a finished item (answers are not re-displayed). */
export function renderFinishedNote(item) {
  const r = S.state.items[item.id];
  return h('p', { class: 'muted' }, r && r.st === 'correct' ? `Finished: ${fmt(r.earned, 2)} of ${item.pts} points.` : `Finished: ${fmt(r ? r.earned : 0, 2)} of ${item.pts} points.`);
}
