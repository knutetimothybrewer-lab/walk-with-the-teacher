// Answer widgets. Every widget returns the same small interface:
//   { el, getResponse(), isComplete(), setDisabled(bool), onChange(fn), reshuffle(attempt), focus() }
// Drag-and-drop is an enhancement only: every interaction also works by click/tap and by keyboard.
import { h, shuffleSeeded, announce } from './util.js';
import { bubble } from './blocks.js';

function base(el) {
  const listeners = [];
  return { el, onChange(fn) { listeners.push(fn); }, _emit() { listeners.forEach((f) => f()); } };
}

/* ======================================================================= single / multi */
function makeChoice(item, ctx, multi) {
  const name = 'q-' + item.id;
  let order = shuffleSeeded(item.options, ctx.seed + ':' + ctx.attempt);
  const sel = new Set();
  let disabled = false;
  const list = h('div.opts', { role: multi ? 'group' : 'radiogroup', 'aria-label': 'Answer choices' });
  const wrap = h('div', multi ? h('p.select-note', 'Select all that apply.') : null, list);
  const w = base(wrap);
  function render() {
    list.replaceChildren(...order.map((o) => {
      const input = h('input', { type: multi ? 'checkbox' : 'radio', name, value: o.id, checked: sel.has(o.id), disabled });
      const label = h('label.opt' + (sel.has(o.id) ? '.on' : ''), input, h('span', o.text));
      input.addEventListener('change', () => {
        if (multi) { input.checked ? sel.add(o.id) : sel.delete(o.id); }
        else { sel.clear(); sel.add(o.id); list.querySelectorAll('.opt').forEach((x) => x.classList.remove('on')); }
        label.classList.toggle('on', sel.has(o.id));
        w._emit();
      });
      return label;
    }));
    list.dataset.disabled = String(disabled);
  }
  render();
  Object.assign(w, {
    getResponse: () => (multi ? { choices: Array.from(sel) } : { choice: Array.from(sel)[0] }),
    isComplete: () => sel.size > 0,
    setDisabled(b) { disabled = b; render(); },
    reshuffle(attempt) { order = shuffleSeeded(item.options, ctx.seed + ':' + attempt); sel.clear(); render(); w._emit(); },
    focus() { const f = list.querySelector('input'); if (f) f.focus(); }
  });
  return w;
}

/* ======================================================================= assign: classify / match / label */
function makeBoard(item, ctx) {
  const A = item.assign, classify = A.mode === 'classify', label = A.mode === 'label';
  const cards = A.cards, byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  const tById = Object.fromEntries(A.targets.map((t) => [t.id, t]));
  const where = {}; cards.forEach((c) => { where[c.id] = null; });
  let trayOrder = shuffleSeeded(cards.map((c) => c.id), ctx.seed + ':' + ctx.attempt);
  let selected = null, disabled = false;
  const fig = label ? (ctx.content.figures || {})[A.figure] : null;

  const status = h('p.select-note', { role: 'status', 'aria-live': 'polite' });
  const tray = h('div.tray', { 'data-zone': 'tray' });
  const trayBlock = h('div', h('div.tray-label', classify ? 'Cards to sort' : 'Choices'), tray);
  const returnBtn = h('button.btn.secondary.small', { type: 'button', hidden: true, onclick: () => { if (selected) { where[selected] = null; announceMsg(byId[selected].text + ' returned to the tray.'); selected = null; render(); w._emit(); } } }, 'Return selected card to the tray');
  const body = h('div.board');
  const root = h('div.assign-root');
  const w = base(root);
  const slotEls = {};
  const markerEls = {};

  function announceMsg(m) { announce(m); }
  function occupant(tid) { return cards.find((c) => where[c.id] === tid); }

  function place(cardId, tid) {
    if (disabled) return;
    if (!classify) { const o = occupant(tid); if (o && o.id !== cardId) where[o.id] = null; }
    where[cardId] = tid;
    announceMsg(byId[cardId].text + ' placed in ' + (tById[tid].label || '') + '.');
    selected = null; render(); w._emit();
  }
  function unplace(cardId) { where[cardId] = null; selected = null; render(); w._emit(); }
  function toggle(cardId) {
    if (disabled) return;
    selected = selected === cardId ? null : cardId;
    announceMsg(selected ? 'Selected: ' + byId[cardId].text + '. Now choose where it goes.' : 'Selection cleared.');
    render();
    const f = root.querySelector('[data-card="' + cardId + '"]'); if (f) f.focus();
  }

  function chip(cardId) {
    const c = byId[cardId];
    const btn = h('button.cardchip', {
      type: 'button', draggable: !disabled, 'data-card': cardId, 'aria-pressed': String(selected === cardId), disabled,
      onclick: () => toggle(cardId),
      ondragstart: (e) => { e.dataTransfer.setData('text/plain', cardId); e.dataTransfer.effectAllowed = 'move'; btn.classList.add('dragging'); },
      ondragend: () => btn.classList.remove('dragging')
    }, h('span', c.text), c.sub ? h('span.sub', c.sub) : null, c.meta ? h('span.meta', c.meta.map((m) => h('span', m))) : null);
    return btn;
  }
  function zone(el, onDrop) {
    el.addEventListener('dragover', (e) => { if (disabled) return; e.preventDefault(); el.dataset.over = 'true'; });
    el.addEventListener('dragleave', () => { el.dataset.over = 'false'; });
    el.addEventListener('drop', (e) => { e.preventDefault(); el.dataset.over = 'false'; const id = e.dataTransfer.getData('text/plain'); if (byId[id]) onDrop(id); });
  }
  function placeBtn(tid, lbl) {
    return h('button.place-btn', { type: 'button', hidden: !selected || disabled, 'aria-label': selected ? 'Place "' + byId[selected].text + '" in ' + lbl : 'Place here', onclick: () => place(selected, tid) }, 'Place here');
  }

  function render() {
    // tray
    const inTray = trayOrder.filter((id) => where[id] === null);
    tray.replaceChildren(...inTray.map(chip));
    const selPlaced = selected && where[selected] !== null;
    returnBtn.hidden = !selPlaced || disabled;
    status.textContent = selected ? 'Selected: "' + byId[selected].text + '". Choose a place for it below, or press the card again to cancel.' : (disabled ? '' : 'Tap or press a card, then choose where it goes. You can also drag cards.');

    if (classify) {
      body.replaceChildren(h('div.buckets', A.targets.map((t) => {
        const list = h('div.bucket-list', cards.filter((c) => where[c.id] === t.id).map((c) => chip(c.id)));
        const b = h('section.bucket', { 'aria-label': t.label }, h('div.bucket-head', h('h4', t.label), placeBtn(t.id, t.label)), list);
        zone(b, (id) => place(id, t.id));
        return b;
      })));
    } else {
      const slots = h('div.slots', A.targets.map((t) => {
        const occ = occupant(t.id);
        const mk = fig ? fig.markers.find((m) => m.id === t.id) : null;
        const drop = h('div.slot-drop', occ ? chip(occ.id) : null, placeBtn(t.id, t.label));
        const row = h('div.slot', { 'data-target': t.id }, h('div.slot-text', mk ? h('span.mk', { 'aria-hidden': 'true' }, String(mk.n)) : null, h('span', mk ? (occ ? 'Marker ' + mk.n + ': ' + occ.text : 'Marker ' + mk.n) : t.label)), drop);
        zone(row, (id) => place(id, t.id));
        slotEls[t.id] = row;
        return row;
      }));
      body.replaceChildren(slots);
    }
    // figure markers
    if (fig) Object.keys(markerEls).forEach((id) => markerEls[id].classList.toggle('filled', !!occupant(id)));
    root.querySelectorAll('.cardchip[disabled]').forEach((b) => { b.draggable = false; });
  }

  zone(tray, (id) => { if (where[id] !== null) unplace(id); }); // attached once; render() only swaps the children
  const boardWrap = h('div', status, trayBlock, returnBtn, body);
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && selected) { selected = null; announceMsg('Selection cleared.'); render(); } });
  if (fig) {
    const stage = h('div.figure-stage', h('img', { src: fig.src, alt: fig.alt, width: fig.w, height: fig.h }));
    fig.markers.filter((m) => tById[m.id]).forEach((m) => {
      const b = h('button.marker', { type: 'button', 'aria-label': 'Marker ' + m.n, onclick: () => { if (selected && !disabled) place(selected, m.id); else { const r = slotEls[m.id]; if (r) { const f = r.querySelector('button'); (f || r).focus && (f || r).focus(); } } } }, String(m.n));
      b.style.left = (m.x / fig.w * 100) + '%'; b.style.top = (m.y / fig.h * 100) + '%';
      markerEls[m.id] = b; stage.appendChild(b);
    });
    root.appendChild(h('div.figure-wrap', h('figure.figure', stage, h('details', h('summary', 'Text description of this diagram'), h('p', fig.desc))), boardWrap));
  } else root.appendChild(boardWrap);
  render();

  Object.assign(w, {
    getResponse() {
      const map = {};
      if (classify) cards.forEach((c) => { if (where[c.id] !== null) map[c.id] = where[c.id]; });
      else cards.forEach((c) => { if (where[c.id] !== null) map[where[c.id]] = c.id; });
      return { map };
    },
    isComplete() { return classify ? cards.every((c) => where[c.id] !== null) : A.targets.every((t) => !!occupant(t.id)); },
    setDisabled(b) { disabled = b; selected = null; render(); },
    reshuffle(attempt) { trayOrder = shuffleSeeded(cards.map((c) => c.id), ctx.seed + ':' + attempt); render(); },
    focus() { const f = root.querySelector('.cardchip'); if (f) f.focus(); }
  });
  return w;
}

/* ======================================================================= thread tagging (the conversation analyzer) */
function makeThread(item, ctx) {
  const A = item.assign, where = {};
  let disabled = false;
  const targets = A.targets;
  const nodes = [];
  const root = h('div.thread', { role: 'group', 'aria-label': 'Text thread. Tag each message that has a menu.' });
  const w = base(root);
  A.thread.forEach((m) => {
    if (!m.id) { root.appendChild(bubble(m, A.people)); return; }
    const name = 'tag-' + item.id + '-' + m.id;
    const group = h('div.tagger', { role: 'radiogroup', 'aria-label': 'Tag this message' }, h('span.tagger-label', 'Tag:'));
    const msg = bubble(m, A.people, { after: group });
    targets.forEach((t, i) => {
      const input = h('input', { type: 'radio', name, value: t.id });
      const seg = h('label.seg', input, h('span', t.label));
      input.addEventListener('change', () => {
        where[m.id] = t.id; msg.dataset.tag = String(i);
        group.querySelectorAll('.seg').forEach((s) => s.classList.remove('on')); seg.classList.add('on'); w._emit();
      });
      group.appendChild(seg);
    });
    nodes.push({ group, input: () => group.querySelectorAll('input') });
    root.appendChild(msg);
  });
  Object.assign(w, {
    getResponse: () => ({ map: Object.assign({}, where) }),
    isComplete: () => A.cards.every((c) => where[c.id]),
    setDisabled(b) { disabled = b; root.querySelectorAll('input').forEach((i) => { i.disabled = b; }); root.querySelectorAll('.tagger').forEach((g) => { g.dataset.disabled = String(b); }); },
    reshuffle() { /* a thread keeps its chronological order; tags stay so a student can adjust them */ },
    focus() { const f = root.querySelector('input'); if (f) f.focus(); }
  });
  return w;
}

/* ======================================================================= order */
function makeOrder(item, ctx) {
  let order = item.steps.map((s) => s.id);
  const byId = Object.fromEntries(item.steps.map((s) => [s.id, s]));
  let disabled = false, dragId = null;
  const list = h('ol.order-list', { 'aria-label': 'Steps. Use the arrow buttons to change the order.' });
  const note = h('p.select-note', 'Use the up and down buttons, or drag a step, to put the steps in order.');
  const root = h('div', note, list);
  const w = base(root);
  function move(id, delta, focusDir) {
    const i = order.indexOf(id), j = i + delta;
    if (j < 0 || j >= order.length) return;
    order.splice(i, 1); order.splice(j, 0, id);
    announce(byId[id].text + ' is now step ' + (j + 1) + ' of ' + order.length + '.');
    render(); const b = list.querySelector('[data-id="' + id + '"] [data-dir="' + focusDir + '"]'); if (b && !b.disabled) b.focus(); else { const o = list.querySelector('[data-id="' + id + '"] .mv:not([disabled])'); if (o) o.focus(); }
    w._emit();
  }
  function render() {
    list.replaceChildren(...order.map((id, i) => {
      const s = byId[id];
      const up = h('button.mv', { type: 'button', 'data-dir': 'up', disabled: disabled || i === 0, 'aria-label': 'Move up: ' + s.text, onclick: () => move(id, -1, 'up') }, '↑');
      const dn = h('button.mv', { type: 'button', 'data-dir': 'down', disabled: disabled || i === order.length - 1, 'aria-label': 'Move down: ' + s.text, onclick: () => move(id, 1, 'down') }, '↓');
      const row = h('li.order-row', { 'data-id': id, draggable: !disabled }, h('span', s.text), h('span.mv-group', up, dn));
      row.addEventListener('dragstart', (e) => { dragId = id; e.dataTransfer.setData('text/plain', id); row.classList.add('dragging'); });
      row.addEventListener('dragend', () => { dragId = null; row.classList.remove('dragging'); });
      row.addEventListener('dragover', (e) => { if (disabled || !dragId) return; e.preventDefault(); row.dataset.over = 'true'; });
      row.addEventListener('dragleave', () => { row.dataset.over = 'false'; });
      row.addEventListener('drop', (e) => { e.preventDefault(); row.dataset.over = 'false'; if (!dragId || dragId === id) return; const from = order.indexOf(dragId), to = order.indexOf(id); order.splice(from, 1); order.splice(to, 0, dragId); render(); w._emit(); });
      return row;
    }));
  }
  render();
  Object.assign(w, {
    getResponse: () => ({ order: order.slice() }),
    isComplete: () => true,
    setDisabled(b) { disabled = b; render(); },
    reshuffle() { /* keep the student's current arrangement so they can adjust it */ },
    focus() { const f = list.querySelector('.mv:not([disabled])'); if (f) f.focus(); }
  });
  return w;
}

/* ======================================================================= numeric */
function makeNumeric(item) {
  const N = item.numeric;
  const input = h('input.input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', id: 'num-' + item.id, 'aria-describedby': 'numhelp-' + item.id });
  const root = h('div', h('div.numeric', h('label.label', { for: 'num-' + item.id }, N.label || 'Your answer'), input, N.unit ? h('span.unit-label', N.unit) : null),
    h('p.help', { id: 'numhelp-' + item.id }, 'Type a number between ' + N.range[0] + ' and ' + N.range[1] + '.'));
  const w = base(root);
  const val = () => { const t = input.value.trim().replace(/,/g, ''); if (t === '' || !/^-?\d*\.?\d+$/.test(t)) return null; const n = Number(t); return isFinite(n) && n >= N.range[0] && n <= N.range[1] ? n : null; };
  input.addEventListener('input', () => { input.setAttribute('aria-invalid', input.value.trim() && val() === null ? 'true' : 'false'); w._emit(); });
  Object.assign(w, {
    getResponse: () => ({ value: val() }),
    isComplete: () => val() !== null,
    setDisabled(b) { input.disabled = b; },
    reshuffle() { input.select(); },
    focus() { input.focus(); }
  });
  return w;
}

/** ctx: { seed, attempt, content } */
export function makeWidget(item, ctx) {
  switch (item.type) {
    case 'single': return makeChoice(item, ctx, false);
    case 'multi': return makeChoice(item, ctx, true);
    case 'assign': return item.assign.layout === 'thread' ? makeThread(item, ctx) : makeBoard(item, ctx);
    case 'order': return makeOrder(item, ctx);
    case 'numeric': return makeNumeric(item);
    default: throw new Error('unknown item type ' + item.type);
  }
}
