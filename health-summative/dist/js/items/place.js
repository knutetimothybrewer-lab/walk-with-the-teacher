/* place — one component for sorting, matching, ordering and tagging.
     mode 'sort'  : drag (or select + click) cards into category boxes
     mode 'match' : place a chip onto each target row (one chip per target)
     mode 'order' : place chips into numbered positions
     mode 'tag'   : each statement gets one label button (read in order)
   Always keyboard operable: Enter/Space on a card "picks it up", then Enter on
   a box/position puts it down. Escape drops it. Pointer drag also works.   */
import { h, rich, announce } from '../ui/dom.js';
import { setMark } from './common.js';

const stripMarks = (s) => String(s).replace(/\*\*/g, '');

export function mount(host, ctx) {
  const { item, view } = ctx;
  const mode = item.mode;
  if (mode === 'tag') return mountTag(host, ctx);

  const cap1 = mode === 'match' || mode === 'order';
  const map = {};               // tokenId -> slotId
  const locked = new Set();
  const tokEl = {};
  const slotBody = {};
  const slotBtn = {};
  let selected = null;
  let disabled = false;
  let justDragged = false;

  const tokById = Object.fromEntries(item.tokens.map(t => [t.id, t]));
  const root = h('div', { class: `place place-${mode} ${item.skin ? 'skin-' + item.skin : ''}` });

  /* ---- tray ---- */
  const trayBody = h('div', { class: 'tray-body', 'data-tray': '1' });
  const trayBtn = h('button', { type: 'button', class: 'tray-btn', 'aria-label': 'Put the picked card back in the tray' }, 'Back to tray');
  trayBtn.addEventListener('click', () => { if (selected && map[selected] !== undefined) put(selected, null); });
  const tray = h('div', { class: 'tray', 'data-tray': '1' },
    h('div', { class: 'tray-head' }, h('span', { class: 'tray-title' }, mode === 'order' ? 'Steps to put in order' : mode === 'match' ? 'Answers to match' : 'Cards to sort'), trayBtn),
    trayBody);

  /* ---- slots ---- */
  const slotsWrap = h('div', { class: 'slots' });
  item.slots.forEach((s, i) => {
    const body = h('div', { class: 'slot-body', 'data-slot': String(s.id) });
    const btn = h('button', { type: 'button', class: 'slot-btn', 'data-slot': String(s.id) },
      mode === 'order' ? h('span', { class: 'slot-num' }, String(i + 1)) : null,
      h('span', { class: 'slot-title' }, rich(s.t)),
      s.desc ? h('span', { class: 'slot-desc' }, s.desc) : null,
      h('span', { class: 'sr-only cnt' }));
    btn.addEventListener('click', () => { if (selected) put(selected, s.id); else announce('Pick a card first, then choose where it goes.'); updateLabels(); });
    const sec = h('section', { class: `slot ${s.cls || ''}`, 'data-slot': String(s.id), 'data-i': String(i) }, btn, body);
    slotBody[s.id] = body; slotBtn[s.id] = btn;
    slotsWrap.append(sec);
  });

  root.append(tray, slotsWrap);
  host.append(root);

  /* ---- tokens ---- */
  view.tokenOrder.forEach((ti) => {
    const t = item.tokens[ti];
    const el = h('button', { type: 'button', class: 'tok', 'data-tok': String(t.id), 'aria-pressed': 'false' }, h('span', { class: 'tok-text' }, rich(t.t)));
    el.addEventListener('click', () => { if (justDragged) { justDragged = false; return; } toggleSelect(t.id); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { select(null); } });
    el.addEventListener('pointerdown', (e) => startDrag(e, t.id));
    tokEl[t.id] = el;
    trayBody.append(el);
  });
  updateLabels();

  /* ---- selection ---- */
  function select(id) {
    selected = id;
    Object.entries(tokEl).forEach(([k, el]) => {
      const on = String(k) === String(id);
      el.classList.toggle('sel', on);
      el.setAttribute('aria-pressed', String(on));
    });
    root.classList.toggle('armed', id !== null);
    trayBtn.style.visibility = id !== null && map[id] !== undefined ? 'visible' : 'hidden';
    if (id !== null) announce(`Picked: ${stripMarks(tokById[id].t)}. Now choose where it goes.`);
    updateLabels();
  }
  function toggleSelect(id) {
    if (disabled || locked.has(id)) return;
    select(selected === id ? null : id);
  }

  function updateLabels() {
    // The button's name is its visible text plus a hidden status (keeps label-in-name).
    item.slots.forEach((s) => {
      const n = Object.keys(map).filter(k => map[k] === s.id).length;
      slotBtn[s.id].querySelector('.cnt').textContent = selected ? '. Press to put the picked card here' : `. ${n} ${n === 1 ? 'card' : 'cards'} placed`;
    });
    trayBtn.style.visibility = selected !== null && map[selected] !== undefined ? 'visible' : 'hidden';
  }

  /* ---- placing ---- */
  function put(id, slotId, { silent = false } = {}) {
    if (disabled || locked.has(id)) return;
    if (slotId === null) {
      delete map[id];
      trayBody.append(tokEl[id]);
    } else {
      if (cap1) {
        const occupant = Object.keys(map).find(k => map[k] === slotId && String(k) !== String(id));
        if (occupant !== undefined) {
          if (locked.has(occupant)) { announce('That spot is already filled and correct.'); return; }
          delete map[occupant]; trayBody.append(tokEl[occupant]);
        }
      }
      map[id] = slotId;
      slotBody[slotId].append(tokEl[id]);
    }
    if (tokEl[id].classList.contains('wrong')) { setMark(tokEl[id], null); tokEl[id].classList.remove('retry'); }
    if (!silent) {
      const where = slotId === null ? 'the tray' : stripMarks(item.slots.find(s => s.id === slotId).t);
      announce(`${stripMarks(tokById[id].t)} placed in ${where}.`);
    }
    selected = null;
    select(null);
    ctx.onChange();
  }

  /* ---- pointer drag ---- */
  function under(x, y, ghost) {
    if (ghost) ghost.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    if (ghost) ghost.style.display = '';
    return el ? el.closest('[data-slot],[data-tray]') : null;
  }
  function startDrag(e, id) {
    if (disabled || locked.has(id) || (e.button !== undefined && e.button !== 0)) return;
    const el = tokEl[id];
    const sx = e.clientX, sy = e.clientY;
    let started = false, ghost = null, over = null;
    const move = (ev) => {
      if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 7) {
        started = true;
        ghost = el.cloneNode(true);
        ghost.classList.add('ghost');
        ghost.style.width = el.offsetWidth + 'px';
        document.body.append(ghost);
        el.classList.add('dragging');
      }
      if (started) {
        ghost.style.transform = `translate(${ev.clientX + 6}px, ${ev.clientY + 6}px)`;
        const t = under(ev.clientX, ev.clientY, ghost);
        if (over !== t) { over && over.classList.remove('over'); over = t; over && over.classList.add('over'); }
        ev.preventDefault();
      }
    };
    const end = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (over) over.classList.remove('over');
      if (started) {
        justDragged = true;
        setTimeout(() => { justDragged = false; }, 60);
        ghost.remove();
        el.classList.remove('dragging');
        const t = ev.type === 'pointercancel' ? null : under(ev.clientX, ev.clientY);
        if (t) {
          if (t.hasAttribute('data-tray')) put(id, null);
          else put(id, t.dataset.slot);
        }
      }
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  /* ---- feedback ---- */
  function lockToken(id, kind) {
    locked.add(id);
    const el = tokEl[id];
    el.disabled = true; el.setAttribute('aria-disabled', 'true');
    setMark(el, kind);
  }

  return {
    getResponse: () => ({ map: { ...map } }),
    isComplete: () => item.tokens.every(t => map[t.id] !== undefined),
    showResult(res, { final, solved, restore }) {
      select(null);
      let bad = 0;
      item.tokens.forEach(t => {
        if (res.subs[t.id]) {
          if (map[t.id] === undefined && restore) put(t.id, t.slot, { silent: true });
          lockToken(t.id, 'right');
        } else {
          bad++;
          if (!final) {
            if (map[t.id] !== undefined) { put(t.id, null, { silent: true }); }
            setMark(tokEl[t.id], 'wrong');
            tokEl[t.id].classList.add('retry');
          }
        }
      });
      if (final && !solved) this.showCorrect();
      if (solved) disabled = true;
      void bad;
      updateLabels();
    },
    showCorrect() {
      item.tokens.forEach(t => {
        if (!locked.has(t.id)) {
          delete map[t.id];
          slotBody[t.slot].append(tokEl[t.id]);
          map[t.id] = t.slot;
          lockToken(t.id, 'reveal');
        }
      });
      disabled = true;
      updateLabels();
    },
    lockAll() { disabled = true; },
    focus() { const f = Object.values(tokEl).find(b => !b.disabled); if (f) f.focus(); },
  };
}

/* ---------------- tag mode ---------------- */
function mountTag(host, ctx) {
  const { item, view } = ctx;
  const map = {};
  const rows = {};
  const dead = {};       // tokenId -> Set(slotId) eliminated
  const locked = new Set();
  const list = h('div', { class: `place place-tag ${item.skin ? 'skin-' + item.skin : ''}`, role: 'list' });
  const order = item.keepTokenOrder === false ? view.tokenOrder : item.tokens.map((_, i) => i);

  order.forEach((ti, n) => {
    const t = item.tokens[ti];
    dead[t.id] = new Set();
    const grp = h('div', { class: 'tag-opts', role: 'radiogroup', 'aria-label': `Label for statement ${n + 1}` });
    const btns = {};
    item.slots.forEach(s => {
      const b = h('button', { type: 'button', class: `tagbtn ${s.cls || ''}`, role: 'radio', 'aria-checked': 'false', 'data-slot': String(s.id) }, s.short || s.t);
      b.addEventListener('click', () => choose(t.id, s.id));
      btns[s.id] = b; grp.append(b);
    });
    const row = h('div', { class: 'tag-row', role: 'listitem', 'data-tok': String(t.id) },
      h('p', { class: 'tag-text' }, h('span', { class: 'tag-n' }, String(n + 1)), ' ', rich(t.t)), grp);
    rows[t.id] = { row, btns };
    list.append(row);
  });
  if (item.slotKey) list.prepend(h('p', { class: 'tag-key' }, rich(item.slotKey)));
  host.append(list);

  function choose(tid, sid) {
    if (locked.has(tid) || dead[tid].has(sid)) return;
    map[tid] = sid;
    Object.entries(rows[tid].btns).forEach(([k, b]) => {
      const on = String(k) === String(sid);
      b.setAttribute('aria-checked', String(on)); b.classList.toggle('picked', on);
    });
    ctx.onChange();
  }
  const slotKey = (sid) => String(sid);

  function mark(tid, sid, kind) {
    const b = rows[tid].btns[slotKey(sid)];
    if (b) setMark(b, kind);
  }

  return {
    getResponse: () => ({ map: { ...map } }),
    isComplete: () => item.tokens.every(t => map[t.id] !== undefined),
    showResult(res, { final, solved, restore }) {
      item.tokens.forEach(t => {
        if (restore && map[t.id] === undefined && res.subs[t.id]) map[t.id] = t.slot;
        if (res.subs[t.id]) {
          locked.add(t.id);
          rows[t.id].row.classList.add('done');
          Object.entries(rows[t.id].btns).forEach(([k, b]) => { b.disabled = true; b.setAttribute('aria-checked', String(String(k) === String(t.slot))); b.classList.toggle('picked', String(k) === String(t.slot)); });
          mark(t.id, t.slot, 'right');
        } else if (map[t.id] !== undefined) {
          const bad = map[t.id];
          dead[t.id].add(bad);
          const b = rows[t.id].btns[slotKey(bad)];
          b.disabled = true; b.setAttribute('aria-checked', 'false'); b.classList.remove('picked');
          setMark(b, 'wrong');
          delete map[t.id];
        }
      });
      if (final && !solved) this.showCorrect();
    },
    showCorrect() {
      item.tokens.forEach(t => {
        if (!locked.has(t.id)) {
          locked.add(t.id); map[t.id] = t.slot;
          Object.entries(rows[t.id].btns).forEach(([k, b]) => { b.disabled = true; b.classList.remove('picked'); });
          mark(t.id, t.slot, 'reveal');
          rows[t.id].row.classList.add('done');
        }
      });
    },
    lockAll() { Object.values(rows).forEach(r => Object.values(r.btns).forEach(b => { b.disabled = true; })); },
    focus() { const f = list.querySelector('button:not([disabled])'); if (f) f.focus(); },
  };
}
