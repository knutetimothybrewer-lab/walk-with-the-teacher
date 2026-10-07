// Question renderers and the CHECK-ANSWER flow (3 attempts, no answer reveal until locked).
import { h } from './util.js';
import { canon, isComplete } from './canon.js';
import { presentation } from './engine.js';
import { MAX_ATTEMPTS, creditFor } from './scoring.js';
import { brainDiagram, icon } from './visuals.js';
import { sfx } from './sound.js';

const TYPE_LABEL = { mc: 'Multiple choice', predict: 'Predict', multi: 'Select all that apply', sort: 'Sort', match: 'Match', seq: 'Sequence', pick: 'Build the response', slots: 'Build your reply', hotspot: 'Hotspot', run: 'Simulation' };

// ---------- stimulus ----------
export function renderStim(stim) {
  if (!stim) return null;
  const out = [];
  if (stim.ad) out.push(h('div.adstim', { role: 'group', 'aria-label': 'Fictional advertisement for analysis' }, h('div.brand', stim.ad.brand), stim.ad.lines.map((l) => h('p', l)), h('div.tag', stim.ad.note)));
  if (stim.chat) out.push(h('div.chatstim', { 'aria-label': 'Messages' }, stim.chat.map(([who, t]) => h('div.bubble', h('span.who', who), t))));
  if (stim.title || stim.paras || stim.quote || stim.table) {
    const box = h('div.stim');
    if (stim.title) box.append(h('h4', stim.title));
    (stim.paras || []).forEach((p) => box.append(h('p', p)));
    if (stim.quote) box.append(h('blockquote', h('cite', stim.quote.who), '“' + stim.quote.text + '”'));
    if (stim.table) box.append(h('table.data', h('caption', stim.table.cap), h('thead', h('tr', stim.table.cols.map((c) => h('th', c)))), h('tbody', stim.table.rows.map((r) => h('tr', r.map((c) => h('td', c)))))));
    out.push(box);
  }
  return out.length ? h('div', out) : null;
}

// ---------- shared drag helper (pointer events: mouse, touch and pen) ----------
function dragify(tile, { onDrop, zonesSel, root }) {
  let ghost = null, start = null, moved = false;
  tile.addEventListener('pointerdown', (e) => {
    if (tile.disabled || tile.hasAttribute('disabled') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    start = { x: e.clientX, y: e.clientY }; moved = false;
    const move = (ev) => {
      if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 8) return;
      if (!moved) { moved = true; const r = tile.getBoundingClientRect(); ghost = tile.cloneNode(true); ghost.classList.add('drag'); ghost.style.width = r.width + 'px'; document.body.appendChild(ghost); tile.style.opacity = '.35'; }
      ghost.style.left = ev.clientX - 20 + 'px'; ghost.style.top = ev.clientY - 20 + 'px';
      root.querySelectorAll(zonesSel).forEach((z) => z.classList.remove('hot'));
      const z = zoneAt(ev.clientX, ev.clientY); if (z) z.classList.add('hot');
    };
    const zoneAt = (x, y) => { const stack = document.elementsFromPoint(x, y); return stack.map((n) => n.closest && n.closest(zonesSel)).find((n) => n && root.contains(n)); };
    const up = (ev) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (moved) { const z = zoneAt(ev.clientX, ev.clientY); ghost.remove(); tile.style.opacity = ''; root.querySelectorAll(zonesSel).forEach((n) => n.classList.remove('hot')); tile._dragged = true; setTimeout(() => { tile._dragged = false; }, 0); if (z) onDrop(z); }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  });
}

// ---------- renderers: each returns { el, get, set, lock } ----------
const R = {};

R.mc = (q, p, st) => {
  let val = st.initial ?? null; const btns = [];
  const list = h('div.opts', { role: 'radiogroup', 'aria-label': 'Answer choices' });
  (p.opts || q.opts).forEach(([k, t], i) => {
    const b = h('button.opt', { type: 'button', role: 'radio', 'aria-checked': val === k ? 'true' : 'false', 'data-k': k },
      h('span.mark', { 'aria-hidden': 'true' }, '✓'), h('span.t', t));
    b.addEventListener('click', () => { if (st.locked) return; val = k; btns.forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false')); st.onChange(); });
    b.addEventListener('keydown', (e) => { if (e.key.startsWith('Arrow')) { e.preventDefault(); const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1; btns[(i + d + btns.length) % btns.length].focus(); } });
    btns.push(b); list.appendChild(b);
  });
  return { el: list, get: () => val, lock: (v) => btns.forEach((b) => { b.disabled = v; }), set: (k) => { val = k; btns.forEach((b) => b.setAttribute('aria-checked', b.dataset.k === k ? 'true' : 'false')); } };
};
R.predict = R.mc;

R.multi = (q, p, st) => {
  const val = new Set(st.initial || []); const btns = [];
  const list = h('div.opts', { role: 'group', 'aria-label': 'Answer choices. Select all that apply.' });
  (p.opts || q.opts).forEach(([k, t]) => {
    const b = h('button.opt', { type: 'button', role: 'checkbox', 'aria-checked': val.has(k) ? 'true' : 'false', 'data-k': k }, h('span.mark', { 'aria-hidden': 'true' }, '✓'), h('span.t', t));
    b.addEventListener('click', () => { if (st.locked) return; val.has(k) ? val.delete(k) : val.add(k); b.setAttribute('aria-checked', val.has(k)); st.onChange(); });
    btns.push(b); list.appendChild(b);
  });
  return { el: list, get: () => [...val], lock: (v) => btns.forEach((b) => { b.disabled = v; }) };
};

R.match = (q, p, st) => {
  const val = { ...(st.initial || {}) }; const sels = [];
  const wrap = h('div.matchlist');
  (p.items || q.items).forEach(([k, t]) => {
    const sel = h('select.input', { 'aria-label': 'Match for ' + t },
      h('option', { value: '' }, 'Choose…'), (p.choices || q.choices).map(([ck, ct]) => h('option', { value: ck, selected: val[k] === ck }, ct)));
    sel.addEventListener('change', () => { if (sel.value) val[k] = sel.value; else delete val[k]; st.onChange(); });
    sels.push(sel); wrap.appendChild(h('div.matchrow', h('div.lbl', t), sel));
  });
  return { el: wrap, get: () => (Object.keys(val).length ? { ...val } : null), lock: (v) => sels.forEach((s) => { s.disabled = v; }) };
};

// sorter with optional capacity (timeline slots use capacity 1)
function makeSorter(q, p, st, { slotted = false } = {}) {
  const items = p.items || q.items || [], steps = p.steps;
  const things = slotted ? steps : items;
  const bins = slotted ? Array.from({ length: things.length }, (_, i) => [String(i), `${i + 1}`]) : q.bins;
  const place = {}; // key -> binKey
  if (st.initial) { if (slotted) st.initial.forEach((k, i) => { place[k] = String(i); }); else Object.assign(place, st.initial); }
  let selected = null;
  const live = h('div.sr-only', { 'aria-live': 'polite' });
  const root = h('div.sorter');
  const bank = h('div.bank', { role: 'group', 'aria-label': 'Items to place', 'data-bin': '' });
  const binEls = {};
  const grid = h(slotted ? 'div.timeline' : 'div.bins', { style: slotted ? { '--n': bins.length } : { '--cols': Math.min(bins.length, 4) } });
  bins.forEach(([bk, label], i) => {
    const zone = h('div.zone');
    const b = h(slotted ? 'div.slot' : 'div.bin', { tabindex: 0, role: 'button', 'aria-label': (slotted ? `Timeline position ${label}` : `Category: ${label}`) + '. Press Enter to place the selected item here.', 'data-bin': bk },
      slotted ? h('div.ord', i === 0 ? 'Earliest' : i === bins.length - 1 ? 'Most recent' : `Position ${label}`) : h('h4', label), zone);
    b._zone = zone; binEls[bk] = b; grid.appendChild(b);
    b.addEventListener('click', (e) => { if (e.target.closest('.tile')) return; if (selected) putSelected(bk); });
    b.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && selected) { e.preventDefault(); putSelected(bk); } });
  });
  bank.addEventListener('click', (e) => { if (e.target.closest('.tile')) return; if (selected) putSelected(''); });
  bank.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && selected && e.target === bank) { e.preventDefault(); putSelected(''); } });
  bank.tabIndex = 0;
  const tiles = {};
  things.forEach(([k, t]) => {
    const tile = h('button.tile', { type: 'button', 'data-k': k, 'aria-pressed': 'false' }, t);
    tile.addEventListener('click', () => { if (tile._dragged || st.locked) return; if (selected && selected !== k) { putSelected(place[k] === undefined ? '' : place[k]); return; } select(selected === k ? null : k); });
    dragify(tile, { root, zonesSel: '[data-bin]', onDrop: (z) => { if (st.locked) return; selected = k; putSelected(z.dataset.bin); } });
    tiles[k] = tile;
  });
  function select(k) { selected = k; Object.entries(tiles).forEach(([kk, t]) => { t.classList.toggle('sel', kk === k); t.setAttribute('aria-pressed', kk === k ? 'true' : 'false'); }); if (k) live.textContent = 'Selected: ' + tiles[k].textContent + '. Now choose a place.'; }
  function putSelected(bk) {
    const k = selected; if (!k) return;
    if (slotted && bk !== '') { const occupant = Object.keys(place).find((x) => place[x] === bk && x !== k); if (occupant) delete place[occupant]; }
    if (bk === '') delete place[k]; else place[k] = bk;
    selected = null; layout(); st.onChange();
    live.textContent = bk === '' ? 'Returned to the list.' : `Placed in ${slotted ? 'position ' : ''}${(bins.find((b) => b[0] === bk) || [])[1]}.`;
  }
  function layout() {
    bank.replaceChildren(); Object.values(binEls).forEach((b) => b._zone.replaceChildren());
    things.forEach(([k]) => { const t = tiles[k]; t.classList.toggle('sel', false); t.setAttribute('aria-pressed', 'false'); (place[k] !== undefined ? binEls[place[k]]._zone : bank).appendChild(t); });
  }
  layout();
  root.append(h('p.hint', slotted ? 'Drag each event onto the timeline, or tap an event and then tap a position.' : 'Drag each item into a category, or tap an item and then tap a category.'), bank, grid, live);
  return {
    el: root,
    get() {
      if (slotted) { const out = []; for (let i = 0; i < bins.length; i++) { const k = Object.keys(place).find((x) => place[x] === String(i)); if (!k) return null; out.push(k); } return out; }
      return Object.keys(place).length ? { ...place } : null;
    },
    lock: (v) => Object.values(tiles).forEach((t) => { t.disabled = v; })
  };
}
R.sort = (q, p, st) => makeSorter(q, p, st);

R.seq = (q, p, st) => {
  if (q.layout === 'timeline') return makeSorter(q, p, st, { slotted: true });
  let order = st.initial ? [...st.initial] : (p.steps || q.steps).map((s) => s[0]);
  const label = Object.fromEntries(q.steps);
  const ol = h('ol.seq', { 'aria-label': 'Ordered list. Use the up and down buttons or drag to reorder.' });
  const live = h('div.sr-only', { 'aria-live': 'polite' });
  const wrap = h('div', ol, live);
  function paint() {
    ol.replaceChildren();
    order.forEach((k, i) => {
      const up = h('button.mvbtn', { type: 'button', 'aria-label': `Move up: ${label[k]}`, disabled: i === 0 || st.locked }, '▲');
      const dn = h('button.mvbtn', { type: 'button', 'aria-label': `Move down: ${label[k]}`, disabled: i === order.length - 1 || st.locked }, '▼');
      const grip = h('span.grip', { 'aria-hidden': 'true' }, '⋮⋮');
      const li = h('li', { 'data-k': k }, h('span.n', i + 1), grip, h('span.t', label[k]), h('span.mv', up, dn));
      const mv = (d) => { const j = i + d; [order[i], order[j]] = [order[j], order[i]]; paint(); st.onChange(); live.textContent = `Moved to position ${j + 1}.`; const nb = ol.children[j].querySelectorAll('.mvbtn')[d < 0 ? 0 : 1]; if (nb && !nb.disabled) nb.focus(); };
      up.addEventListener('click', () => mv(-1)); dn.addEventListener('click', () => mv(1));
      grip.addEventListener('pointerdown', (e) => {
        if (st.locked) return; e.preventDefault(); li.classList.add('dragging');
        const move = (ev) => { const sibs = [...ol.children].filter((x) => x !== li); const after = sibs.find((s) => { const r = s.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; }); after ? ol.insertBefore(li, after) : ol.appendChild(li); };
        const upf = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', upf); li.classList.remove('dragging'); order = [...ol.children].map((x) => x.dataset.k); paint(); st.onChange(); };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', upf);
      });
      ol.appendChild(li);
    });
  }
  paint();
  let ll = null;
  return { el: wrap, get: () => [...order], lock: (v) => { if (ll === v) return; ll = v; st.locked = v; paint(); } };
};

R.pick = (q, p, st) => {
  const label = Object.fromEntries(q.steps);
  let chosen = st.initial ? [...st.initial] : [];
  const bank = h('ul.picklist'), ans = h('ol.seq.answerlist', { 'aria-label': 'Your response, in order' });
  const live = h('div.sr-only', { 'aria-live': 'polite' });
  const counter = h('p.hint');
  const wrap = h('div.pickwrap', h('div.pickcol', h('h4', 'Possible actions'), bank), h('div.pickcol', h('h4', `Your response (choose ${q.need}, in order)`), counter, ans), live);
  function paint() {
    bank.replaceChildren(); ans.replaceChildren();
    (p.steps || q.steps).forEach(([k, t]) => {
      const used = chosen.includes(k);
      const b = h('button.pickbtn', { type: 'button', disabled: used || st.locked || chosen.length >= q.need, 'aria-label': (used ? 'Already chosen: ' : 'Add to response: ') + t }, t);
      b.addEventListener('click', () => { chosen.push(k); paint(); st.onChange(); live.textContent = `Added as step ${chosen.length}.`; });
      bank.appendChild(h('li', b));
    });
    chosen.forEach((k, i) => {
      const up = h('button.mvbtn', { type: 'button', 'aria-label': 'Move up', disabled: i === 0 || st.locked }, '▲');
      const dn = h('button.mvbtn', { type: 'button', 'aria-label': 'Move down', disabled: i === chosen.length - 1 || st.locked }, '▼');
      const rm = h('button.mvbtn', { type: 'button', 'aria-label': 'Remove: ' + label[k], disabled: st.locked }, '×');
      up.addEventListener('click', () => { [chosen[i - 1], chosen[i]] = [chosen[i], chosen[i - 1]]; paint(); st.onChange(); });
      dn.addEventListener('click', () => { [chosen[i + 1], chosen[i]] = [chosen[i], chosen[i + 1]]; paint(); st.onChange(); });
      rm.addEventListener('click', () => { chosen.splice(i, 1); paint(); st.onChange(); });
      ans.appendChild(h('li', h('span.n', i + 1), h('span.t', label[k]), h('span.mv', up, dn, rm)));
    });
    counter.textContent = `${chosen.length} of ${q.need} chosen.`;
  }
  paint();
  let ll = null;
  return { el: wrap, get: () => [...chosen], lock: (v) => { if (ll === v) return; ll = v; st.locked = v; paint(); } };
};

R.slots = (q, p, st) => {
  const val = { ...(st.initial || {}) }; const groups = [];
  const preview = h('div.preview-bubble', { 'aria-live': 'polite' });
  const wrap = h('div.slots');
  (p.slots || q.slots).forEach((s) => {
    const row = h('div.opts', { role: 'radiogroup', 'aria-label': s.label });
    const btns = s.opts.map(([k, t]) => {
      const b = h('button.opt.compact', { type: 'button', role: 'radio', 'aria-checked': val[s.k] === k ? 'true' : 'false' }, h('span.mark', { 'aria-hidden': 'true' }, '✓'), h('span.t', t));
      b.addEventListener('click', () => { if (st.locked) return; val[s.k] = k; btns.forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false')); paint(); st.onChange(); });
      return b;
    });
    groups.push(...btns);
    row.append(...btns); wrap.appendChild(h('div.slot-g', h('h4', s.label), row));
  });
  function paint() {
    const parts = q.slots.map((s) => { const k = val[s.k]; const o = k && s.opts.find((x) => x[0] === k); return o ? o[1] : null; }).filter(Boolean);
    preview.replaceChildren(h('span.who', 'Your reply, as you would send it'), parts.length ? parts.join(' → ') : 'Choose an option for each part.');
  }
  paint(); wrap.appendChild(preview);
  return { el: wrap, get: () => (Object.keys(val).length ? { ...val } : null), lock: (v) => groups.forEach((b) => { b.disabled = v; }) };
};

R.hotspot = (q, p, st) => {
  let val = st.initial ?? null;
  const d = brainDiagram(q.regions, { selected: val, locked: () => st.locked, onPick: (k) => { val = k; st.onChange(); } });
  return { el: d, get: () => val, lock: (v) => { d.querySelectorAll('.hs').forEach((g) => g.setAttribute('tabindex', v ? '-1' : '0')); } };
};

R.run = (q, p, st) => ({ el: h('p.hintline', 'Complete the conversation in the simulation panel. Each completed run uses one attempt.'), get: () => st.initial || null, lock() {} });

// ---------- item card ----------
const pctText = (n) => Math.round(creditFor(n) * 100) + '%';
export function buildItem(q, ctx) {
  const { session, seed } = ctx;
  const rec = () => session.rec(q.id);
  const pres = presentation(q, seed);
  const last = rec() && rec().attempts.at(-1);
  const st = { initial: last ? last.resp : null, locked: false, onChange: () => refresh() };
  const rend = (R[q.type] || R.mc)(q, pres, st);
  const card = h('article.item', { 'data-qid': q.id, 'aria-label': 'Question', tabindex: '-1' });
  const stim = renderStim(q.stim);
  const pips = h('span.pips', { role: 'img' });
  const fbBox = h('div', { 'aria-live': 'polite' });
  const check = h('button.btn.primary', { type: 'button', onclick: () => attempt(rend.get()) }, 'Check answer');
  const hint = h('span.hintline');
  card.append(
    h('header', h('span.qtype', TYPE_LABEL[q.type] || ''), h('span.pts', `${q.pts} point${q.pts > 1 ? 's' : ''}`)),
    stim || '', h('p.prompt', q.prompt), rend.el,
    h('div.itemfoot', pips, q.type === 'run' ? '' : check, hint), fbBox
  );
  let busy = false, gated = false;
  const status = () => (rec() ? rec().status : 'open');
  const lastCanon = () => { const a = rec() && rec().attempts.at(-1); return a ? a.c : null; };

  function paintPips() {
    const r = rec(), used = r ? r.attempts.length : 0, hit = r && r.attempts.find((a) => a.correct);
    pips.replaceChildren(h('span.lbl', 'Attempts'), ...[1, 2, 3].map((n) => h('span.pip' + (hit && hit.n === n ? '.ok' : n <= used ? '.used' : ''))));
    pips.setAttribute('aria-label', `${Math.min(used, 3)} of 3 attempts used`);
  }
  function feedbackFor(final = false) {
    const r = rec(); if (!r || !r.attempts.length) return null;
    const hit = r.attempts.find((a) => a.correct), n = r.attempts.length;
    if (hit) return h('div.fb.right', h('span.ico', { 'aria-hidden': 'true' }, '✓'), h('div.msg', h('strong', 'Correct.'), ' ', `Attempt ${hit.n}: ${pctText(hit.n)} of the points (${Math.round(q.pts * creditFor(hit.n) * 100) / 100} of ${q.pts}).`));
    if (r.status === 'locked') return h('div.fb.out', h('span.ico', { 'aria-hidden': 'true' }, '!'), h('div.msg', h('strong', 'Maximum attempts reached.'), ' ', 'This question is now locked (0 points).', h('div.why', h('b', 'Explanation: '), session.explanation(q) || 'See your teacher for a review of this question.')));
    const left = MAX_ATTEMPTS - n, next = creditFor(n + 1);
    return h('div.fb.wrong', h('span.ico', { 'aria-hidden': 'true' }, '×'), h('div.msg', h('strong', 'Not correct.'), ' ', n === 1 ? `Review the evidence and try again. ${left} attempts remaining. Maximum available credit: ${Math.round(next * 100)}%.` : `${left} attempt remaining. Maximum available credit: ${Math.round(next * 100)}%.`));
  }
  function refresh() {
    const s = status(), done = s !== 'open';
    card.classList.toggle('is-done', done); card.classList.toggle('locked-out', s === 'locked'); card.classList.toggle('gated', gated);
    st.locked = done || gated; rend.lock(done || gated);
    paintPips();
    const resp = rend.get();
    const complete = isComplete(q, resp);
    check.hidden = done || q.type === 'run';
    check.disabled = gated || busy || !complete || (rec() && lastCanon() === (complete ? canon(q.type, resp) : null));
    hint.textContent = done || gated ? '' : !complete ? (q.type === 'seq' || q.type === 'pick' ? '' : 'Finish your answer to enable Check answer.') : (rec() && lastCanon() === canon(q.type, resp) ? 'Change your answer to try again.' : '');
    if (!fbBox.firstChild || done) { const f = feedbackFor(); fbBox.replaceChildren(f || ''); }
  }
  async function attempt(resp) {
    if (busy || status() !== 'open' || !isComplete(q, resp)) return;
    busy = true; check.disabled = true; check.textContent = 'Checking…';
    const pend = session.beginAttempt(q, resp);
    if (!pend) { busy = false; return; }
    let correct;
    try { correct = await ctx.grade(q, resp, pend.a.n); }
    catch (e) {
      session.cancelAttempt(q, pend); busy = false; check.textContent = 'Check answer';
      fbBox.replaceChildren(h('div.fb.out', h('span.ico', '!'), h('div.msg', h('strong', 'Could not reach the server.'), ' ', 'Your attempt was not counted. Check your connection and press Check answer again.'))); refresh(); return;
    }
    const s = session.finishAttempt(q, pend, correct);
    busy = false; check.textContent = 'Check answer';
    fbBox.replaceChildren(feedbackFor()); (correct ? sfx.ok : s === 'locked' ? sfx.lock : sfx.bad)();
    refresh(); ctx.onChange && ctx.onChange(q, s);
  }
  refresh();
  if (rec() && rec().attempts.length) fbBox.replaceChildren(feedbackFor() || '');
  return {
    el: card, q, attempt, refresh,
    setGated(v, note) { gated = v; refresh(); const g = card.querySelector('.gate-note'); if (v && !g) card.insertBefore(h('p.gate-note', note || 'Complete the activity above to unlock this question.'), card.querySelector('.prompt')); if (!v && g) g.remove(); },
    focus() { card.focus({ preventScroll: false }); }
  };
}
