// Question renderers and the CHECK-ANSWER flow (3 attempts, no answer reveal until locked).
import { h } from './util.js';
import { canon, isComplete } from './canon.js';
import { presentation } from './engine.js';
import { MAX_ATTEMPTS, creditFor } from './scoring.js';
import { sfx } from './sound.js';
import { figureFor, plateFig, chartEl, CHARTS } from './figs.js';
import { ACTIVITY_BLOCKS, WEEK, evalPlan } from './plan.js';

const TYPE_LABEL = { mc: 'Multiple choice', multi: 'Select all that apply', sort: 'Sort', match: 'Match', seq: 'Rank / order', slots: 'Build your answer', hotspot: 'Click the answer', spots: 'Click all that apply', slider: 'Slider', num: 'Enter a number', plan: 'Plan builder' };

// ---------- stimulus ----------
export function renderStim(stim) {
  if (!stim) return null;
  const out = [], updates = [];
  if (stim.chart && CHARTS[stim.chart]) out.push(chartEl(CHARTS[stim.chart]));
  if (stim.fig) { const f = figureFor(stim); if (f) { out.push(f.el); if (f.update) updates.push(f.update); } }
  if (stim.title || stim.paras || stim.quote || stim.table) {
    const box = h('div.stim');
    if (stim.title) box.append(h('h4', stim.title));
    (stim.paras || []).forEach((p) => box.append(h('p', p)));
    if (stim.quote) box.append(h('blockquote', h('cite', stim.quote.who), '“' + stim.quote.text + '”'));
    if (stim.table) box.append(h('table.data', h('caption', stim.table.cap), h('thead', h('tr', stim.table.cols.map((c) => h('th', c)))), h('tbody', stim.table.rows.map((r) => h('tr', r.map((c, i) => h(i ? 'td' : 'th', { scope: i ? null : 'row' }, c)))))));
    out.push(box);
  }
  return out.length ? { el: h('div.stimwrap', out), updates } : null;
}

// ---------- shared drag helper (pointer events: mouse, touch and pen) ----------
function dragify(tile, { onDrop, zonesSel, root }) {
  let ghost = null, start = null, moved = false;
  tile.addEventListener('pointerdown', (e) => {
    if (tile.disabled || tile.hasAttribute('disabled') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    start = { x: e.clientX, y: e.clientY }; moved = false;
    const zoneAt = (x, y) => { const stack = document.elementsFromPoint(x, y); return stack.map((n) => n.closest && n.closest(zonesSel)).find((n) => n && root.contains(n)); };
    const move = (ev) => {
      if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 8) return;
      if (!moved) { moved = true; const r = tile.getBoundingClientRect(); ghost = tile.cloneNode(true); ghost.classList.add('drag'); ghost.style.width = r.width + 'px'; document.body.appendChild(ghost); tile.style.opacity = '.35'; }
      ghost.style.left = ev.clientX - 20 + 'px'; ghost.style.top = ev.clientY - 20 + 'px';
      root.querySelectorAll(zonesSel).forEach((z) => z.classList.remove('hot'));
      const z = zoneAt(ev.clientX, ev.clientY); if (z) z.classList.add('hot');
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (moved) { const z = zoneAt(ev.clientX, ev.clientY); ghost.remove(); tile.style.opacity = ''; root.querySelectorAll(zonesSel).forEach((n) => n.classList.remove('hot')); tile._dragged = true; setTimeout(() => { tile._dragged = false; }, 0); if (z) onDrop(z); }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  });
}

// ---------- renderers: each returns { el, get, lock } ----------
const R = {};
const optBtn = (role, checked, k, t) => h('button.opt', { type: 'button', role, 'aria-checked': checked ? 'true' : 'false', 'data-k': k }, h('span.mark', { 'aria-hidden': 'true' }, '✓'), h('span.t', t));

R.mc = (q, p, st) => {
  let val = st.initial ?? null; const btns = [];
  const list = h('div.opts', { role: 'radiogroup', 'aria-label': 'Answer choices' });
  (p.opts || q.opts).forEach(([k, t], i) => {
    const b = optBtn('radio', val === k, k, t);
    b.addEventListener('click', () => { if (st.locked) return; val = k; btns.forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false')); st.onChange(); });
    b.addEventListener('keydown', (e) => { if (e.key.startsWith('Arrow')) { e.preventDefault(); const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1; btns[(i + d + btns.length) % btns.length].focus(); } });
    btns.push(b); list.appendChild(b);
  });
  return { el: list, get: () => val, lock: (v) => btns.forEach((b) => { b.disabled = v; }) };
};

R.multi = (q, p, st) => {
  const val = new Set(st.initial || []); const btns = [];
  const list = h('div.opts', { role: 'group', 'aria-label': 'Answer choices. Select all that apply.' });
  (p.opts || q.opts).forEach(([k, t]) => {
    const b = optBtn('checkbox', val.has(k), k, t);
    b.addEventListener('click', () => { if (st.locked) return; val.has(k) ? val.delete(k) : val.add(k); b.setAttribute('aria-checked', val.has(k)); st.onChange(); });
    btns.push(b); list.appendChild(b);
  });
  return { el: list, get: () => [...val], lock: (v) => btns.forEach((b) => { b.disabled = v; }) };
};

R.match = (q, p, st) => {
  const val = { ...(st.initial || {}) }; const sels = [];
  const wrap = h('div.matchlist');
  (p.items || q.items).forEach(([k, t]) => {
    const sel = h('select.input', { 'aria-label': 'Match for ' + t }, h('option', { value: '' }, 'Choose…'), (p.choices || q.choices).map(([ck, ct]) => h('option', { value: ck, selected: val[k] === ck }, ct)));
    sel.addEventListener('change', () => { if (sel.value) val[k] = sel.value; else delete val[k]; st.onChange(); });
    sels.push(sel); wrap.appendChild(h('div.matchrow', h('div.lbl', t), sel));
  });
  return { el: wrap, get: () => (Object.keys(val).length ? { ...val } : null), lock: (v) => sels.forEach((s) => { s.disabled = v; }) };
};

function makeSorter(q, p, st) {
  const items = p.items || q.items || [];
  const bins = q.bins;
  const place = { ...(st.initial || {}) };
  let selected = null;
  const live = h('div.sr-only', { 'aria-live': 'polite' });
  const root = h('div.sorter');
  const bank = h('div.bank', { role: 'group', 'aria-label': 'Items to place', 'data-bin': '' });
  const binEls = {};
  const grid = h('div.bins', { style: { '--cols': Math.min(bins.length, 4) } });
  bins.forEach(([bk, label]) => {
    const zone = h('div.zone');
    const b = h('div.bin', { tabindex: 0, role: 'button', 'aria-label': `Category: ${label}. Press Enter to place the selected item here.`, 'data-bin': bk }, h('h4', label), zone);
    b._zone = zone; binEls[bk] = b; grid.appendChild(b);
    b.addEventListener('click', (e) => { if (e.target.closest('.tile')) return; if (selected) putSelected(bk); });
    b.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && selected) { e.preventDefault(); putSelected(bk); } });
  });
  bank.addEventListener('click', (e) => { if (e.target.closest('.tile')) return; if (selected) putSelected(''); });
  bank.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && selected && e.target === bank) { e.preventDefault(); putSelected(''); } });
  bank.tabIndex = 0;
  const tiles = {};
  items.forEach(([k, t]) => {
    const tile = h('button.tile', { type: 'button', 'data-k': k, 'aria-pressed': 'false' }, t);
    tile.addEventListener('click', () => { if (tile._dragged || st.locked) return; if (selected && selected !== k) { putSelected(place[k] === undefined ? '' : place[k]); return; } select(selected === k ? null : k); });
    dragify(tile, { root, zonesSel: '[data-bin]', onDrop: (z) => { if (st.locked) return; selected = k; putSelected(z.dataset.bin); } });
    tiles[k] = tile;
  });
  function select(k) { selected = k; Object.entries(tiles).forEach(([kk, t]) => { t.classList.toggle('sel', kk === k); t.setAttribute('aria-pressed', kk === k ? 'true' : 'false'); }); if (k) live.textContent = 'Selected: ' + tiles[k].textContent + '. Now choose a category.'; }
  function putSelected(bk) {
    const k = selected; if (!k) return;
    if (bk === '') delete place[k]; else place[k] = bk;
    selected = null; layout(); st.onChange();
    live.textContent = bk === '' ? 'Returned to the list.' : `Placed in ${(bins.find((b) => b[0] === bk) || [])[1]}.`;
  }
  function layout() {
    bank.replaceChildren(); Object.values(binEls).forEach((b) => b._zone.replaceChildren());
    items.forEach(([k]) => { const t = tiles[k]; t.classList.toggle('sel', false); t.setAttribute('aria-pressed', 'false'); (place[k] !== undefined ? binEls[place[k]]._zone : bank).appendChild(t); });
  }
  layout();
  root.append(h('p.hint', 'Drag each item into a category, or tap an item and then tap a category.'), bank, grid, live);
  return { el: root, get: () => (Object.keys(place).length ? { ...place } : null), lock: (v) => Object.values(tiles).forEach((t) => { t.disabled = v; }) };
}
R.sort = (q, p, st) => makeSorter(q, p, st);

R.seq = (q, p, st) => {
  let order = st.initial ? [...st.initial] : (p.steps || q.steps).map((s) => s[0]);
  const label = Object.fromEntries(q.steps);
  const ol = h('ol.seq', { 'aria-label': 'Ordered list. Use the up and down buttons or drag the handle to reorder.' });
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

R.slots = (q, p, st) => {
  const val = { ...(st.initial || {}) }; const groups = [];
  const wrap = h('div.slots');
  let plate = null;
  if (q.plate) { plate = plateFig(); wrap.append(h('div.platewrap', plate.el)); }
  const preview = q.goalPreview ? h('div.preview-bubble', { 'aria-live': 'polite' }) : null;
  const txt = (s, k) => { const o = s.opts.find((x) => x[0] === k); return o ? o[1] : ''; };
  const rows = h('div.slotrows');
  (p.slots || q.slots).forEach((s) => {
    const row = h('div.opts', { role: 'radiogroup', 'aria-label': s.label });
    const btns = s.opts.map(([k, t]) => {
      const b = optBtn('radio', val[s.k] === k, k, t); b.classList.add('compact');
      b.addEventListener('click', () => { if (st.locked) return; val[s.k] = k; btns.forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false')); paint(); st.onChange(); });
      return b;
    });
    groups.push(...btns);
    row.append(...btns); rows.appendChild(h('div.slot-g', h('h4', s.label), row));
  });
  wrap.append(rows);
  function paint() {
    if (plate) { const labels = {}; for (const s of q.slots) labels[s.k] = txt(s, val[s.k]); plate.update(val, labels); }
    if (preview) {
      const parts = q.slots.map((s) => (val[s.k] ? txt(s, val[s.k]) : null));
      preview.replaceChildren(h('span.who', 'Your goal so far'), parts.some(Boolean) ? parts.filter(Boolean).join(' ') + '.' : 'Choose an option for each part.');
    }
  }
  if (preview) wrap.append(preview);
  paint();
  return { el: wrap, get: () => (Object.keys(val).length ? { ...val } : null), lock: (v) => groups.forEach((b) => { b.disabled = v; }) };
};

// ---- clickable figure regions (hotspot = pick one, spots = pick several) -------------------------------------
function regionPicker(q, st, multi) {
  const sel = new Set(multi ? (st.initial || []) : st.initial ? [st.initial] : []);
  const wrap = h('div.regionpick');
  const targets = () => [...((st.stimEl && st.stimEl.querySelectorAll('[data-region]')) || [])].filter((n) => q.regions.some((r) => r[0] === n.dataset.region));
  const list = h('div.opts', { role: multi ? 'group' : 'radiogroup', 'aria-label': 'Choices (same as clicking the picture)' });
  const btns = {};
  q.regions.forEach(([k, t]) => {
    const b = optBtn(multi ? 'checkbox' : 'radio', sel.has(k), k, t); b.classList.add('compact');
    b.addEventListener('click', () => toggle(k)); btns[k] = b; list.appendChild(b);
  });
  function sync() {
    for (const [k, b] of Object.entries(btns)) b.setAttribute('aria-checked', sel.has(k) ? 'true' : 'false');
    for (const n of targets()) { const on = sel.has(n.dataset.region); n.classList.toggle('picked', on); n.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  }
  function toggle(k) {
    if (st.locked) return;
    if (multi) { sel.has(k) ? sel.delete(k) : sel.add(k); } else { sel.clear(); sel.add(k); }
    sync(); st.onChange();
  }
  setTimeout(() => {
    for (const n of targets()) {
      const k = n.dataset.region, lab = (q.regions.find((r) => r[0] === k) || [])[1] || k;
      n.setAttribute('role', 'button'); n.setAttribute('tabindex', '0'); n.setAttribute('aria-label', lab); n.setAttribute('aria-pressed', 'false');
      n.addEventListener('click', (e) => { e.stopPropagation(); toggle(k); });
      n.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(k); } });
    }
    sync();
  }, 0);
  wrap.append(h('p.hint', multi ? 'Click parts of the picture to select them (click again to deselect), or use the list below.' : 'Click a part of the picture, or choose from the list below.'), list);
  return { el: wrap, get: () => (multi ? [...sel] : [...sel][0] ?? null), lock: (v) => { Object.values(btns).forEach((b) => { b.disabled = v; }); st.locked = v; targets().forEach((n) => n.classList.toggle('locked', v)); } };
}
R.hotspot = (q, p, st) => regionPicker(q, st, false);
R.spots = (q, p, st) => regionPicker(q, st, true);

// ---- slider / number --------------------------------------------------------------------------------------
R.slider = (q, p, st) => {
  const [lo, hi, step] = q.range; let val = st.initial ?? null;
  const out = h('output.sliderval', { 'aria-live': 'polite' }, val == null ? 'Move the marker' : `${val} ${q.unit || ''}`);
  const input = h('input.range', { type: 'range', min: lo, max: hi, step, value: val ?? lo, 'aria-label': q.prompt.slice(0, 120) });
  const ticks = h('div.ticks', { 'aria-hidden': 'true' });
  const nT = Math.round((hi - lo) / step); const every = nT > 12 ? Math.ceil(nT / 10) : 1;
  for (let i = 0; i <= nT; i++) ticks.append(h('span', i % every === 0 ? String(Math.round((lo + i * step) * 100) / 100) : ''));
  const set = () => { val = Number(input.value); out.textContent = `${val} ${q.unit || ''}`; out.classList.add('set'); st.onChange(); };
  input.addEventListener('input', () => { if (!st.locked) set(); });
  input.addEventListener('pointerdown', () => { if (val == null && !st.locked) set(); });
  input.addEventListener('focus', () => { /* keyboard users: arrow keys fire input */ });
  return { el: h('div.sliderwrap', out, input, ticks), get: () => val, lock: (v) => { input.disabled = v; } };
};
R.num = (q, p, st) => {
  let val = st.initial ?? '';
  const input = h('input.input.numin', { type: 'text', inputmode: 'decimal', autocomplete: 'off', value: val, 'aria-label': 'Your numeric answer', placeholder: 'Type a number' });
  input.addEventListener('input', () => { input.value = input.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); val = input.value === '' ? '' : Number(input.value); st.onChange(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); st.submit && st.submit(); } });
  return { el: h('div.numwrap', input, q.unit ? h('span.muted', q.unit) : ''), get: () => (val === '' || !Number.isFinite(val) ? null : val), lock: (v) => { input.disabled = v; } };
};

// ---- weekly activity plan -----------------------------------------------------------------------------------
R.plan = (q, p, st) => {
  const spec = q.plan, fixed = spec.fixed || {}, max = spec.max;
  const days = st.initial && st.initial.days ? st.initial.days.map((d) => d.slice()) : WEEK.map((d) => (fixed[d] || []).slice());
  let touched = !!(st.initial && st.initial.touched);
  const grid = h('div.planGrid'), cols = [];
  const live = h('div.sr-only', { 'aria-live': 'polite' });
  const opts = spec.blocks.map((k) => [k, ACTIVITY_BLOCKS[k]]);
  WEEK.forEach((d, di) => {
    const mins = h('div.mins'), body = h('div.daybody');
    const col = h('div.dayCol', { role: 'group', 'aria-label': d }, h('h4', d), mins, body);
    cols.push({ d, mins, body });
    grid.append(col);
  });
  function paint() {
    const ev = evalPlan(days);
    cols.forEach((c, di) => {
      c.mins.textContent = `${ev.perDay[di]} min moderate-to-vigorous`;
      c.body.replaceChildren();
      const fx = (fixed[c.d] || []).length;
      days[di].forEach((k, i) => {
        const isFixed = i < fx; const blk = ACTIVITY_BLOCKS[k];
        const chip = h('div.chip' + (isFixed ? '.fixed' : ''), h('span', blk[0]), h('small', `${blk[1]} min • ${blk[2] === 'mod' ? 'moderate' : blk[2] === 'vig' ? 'vigorous' : 'light'}`));
        if (isFixed) chip.append(h('em', 'set'));
        else chip.append(h('button.x', { type: 'button', 'aria-label': `Remove ${blk[0]} from ${c.d}`, disabled: st.locked, onclick: () => { days[di].splice(i, 1); touched = true; paint(); st.onChange(); } }, '×'));
        c.body.append(chip);
      });
      if (days[di].length < max) {
        const sel = h('select.input.addsel', { 'aria-label': `Add an activity to ${c.d}`, disabled: st.locked }, h('option', { value: '' }, '+ Add activity'), opts.map(([k, b]) => h('option', { value: k }, `${b[0]} (${b[1]} min, ${b[2] === 'mod' ? 'moderate' : b[2] === 'vig' ? 'vigorous' : 'light'})`)));
        sel.addEventListener('change', () => { if (!sel.value) return; days[di].push(sel.value); touched = true; live.textContent = `Added to ${c.d}.`; paint(); st.onChange(); });
        c.body.append(sel);
      }
    });
  }
  paint();
  const wrap = h('div.planwrap', h('p.hint', 'Up to three activity blocks per day. Blocks marked "set" are already scheduled. The number under each day counts only moderate and vigorous minutes.'), grid, live);
  let lk = null;
  return { el: wrap, get: () => { const ev = evalPlan(days); return { flags: ev.flags, met: ev.met, days: days.map((d) => d.slice()), touched }; }, lock: (v) => { if (lk === v) return; lk = v; st.locked = v; paint(); } };
};

// ---------- item card ----------
const pctText = (n) => Math.round(creditFor(n) * 100) + '%';
export function buildItem(q, ctx) {
  const { session, seed } = ctx;
  const rec = () => session.rec(q.id);
  const pres = presentation(q, seed);
  const last = rec() && rec().attempts.at(-1);
  const st = { initial: last ? last.resp : null, locked: false, onChange: () => refresh(), submit: () => attempt(rend.get()) };
  const stimRes = renderStim(q.stim);
  st.stimEl = stimRes && stimRes.el;
  const rend = (R[q.type] || R.mc)(q, pres, st);
  const card = h('article.item', { 'data-qid': q.id, 'aria-label': 'Question', tabindex: '-1' });
  const pips = h('span.pips', { role: 'img' });
  const fbBox = h('div', { 'aria-live': 'polite' });
  const check = h('button.btn.primary', { type: 'button', onclick: () => attempt(rend.get()) }, 'Check answer');
  const hint = h('span.hintline');
  card.append(
    h('header', h('span.qtype', TYPE_LABEL[q.type] || ''), h('span.pts', `${q.pts} point${q.pts > 1 ? 's' : ''}`)),
    stimRes ? stimRes.el : '', h('p.prompt', q.prompt), rend.el,
    h('div.itemfoot', pips, check, hint), fbBox
  );
  const updateFigs = () => { if (stimRes) stimRes.updates.forEach((u) => u(rend.get() || [])); };
  let busy = false, gated = false;
  const status = () => (rec() ? rec().status : 'open');
  const lastCanon = () => { const a = rec() && rec().attempts.at(-1); return a ? a.c : null; };

  function paintPips() {
    const r = rec(), used = r ? r.attempts.length : 0, hit = r && r.attempts.find((a) => a.correct);
    pips.replaceChildren(h('span.lbl', 'Attempts'), ...[1, 2, 3].map((n) => h('span.pip' + (hit && hit.n === n ? '.ok' : n <= used ? '.used' : ''))));
    pips.setAttribute('aria-label', `${Math.min(used, 3)} of 3 attempts used`);
  }
  function feedbackFor() {
    const r = rec(); if (!r || !r.attempts.length) return null;
    const hit = r.attempts.find((a) => a.correct), n = r.attempts.length;
    if (hit) return h('div.fb.right', h('span.ico', { 'aria-hidden': 'true' }, '✓'), h('div.msg', h('strong', 'Correct.'), ' ', `Attempt ${hit.n}: ${pctText(hit.n)} of the points (${Math.round(q.pts * creditFor(hit.n) * 100) / 100} of ${q.pts}).`));
    if (r.status === 'locked') return h('div.fb.out', h('span.ico', { 'aria-hidden': 'true' }, '!'), h('div.msg', h('strong', 'Maximum attempts reached.'), ' ', 'This question is now locked (0 points).', h('div.why', h('b', 'Explanation: '), session.explanation(q) || 'See your teacher for a review of this question.')));
    const left = MAX_ATTEMPTS - n, next = creditFor(n + 1);
    const hints = q.hints || [], hintText = hints[Math.min(n - 1, hints.length - 1)];
    const lastResp = r.attempts.at(-1).resp;
    const planNote = q.type === 'plan' && lastResp && typeof lastResp.met === 'number' ? ` Your plan meets ${lastResp.met} of 4 recommendations.` : '';
    return h('div.fb.wrong', h('span.ico', { 'aria-hidden': 'true' }, '×'), h('div.msg', h('strong', 'Not correct.'), planNote, ' ', `${left} attempt${left === 1 ? '' : 's'} remaining. Maximum available credit: ${Math.round(next * 100)}%.`, hintText ? h('div.hintbox', h('b', 'Hint: '), hintText) : ''));
  }
  function refresh() {
    const s = status(), done = s !== 'open';
    card.classList.toggle('is-done', done); card.classList.toggle('locked-out', s === 'locked'); card.classList.toggle('gated', gated);
    st.locked = done || gated; rend.lock(done || gated);
    paintPips(); updateFigs();
    const resp = rend.get();
    const complete = isComplete(q, resp);
    check.hidden = done;
    check.disabled = gated || busy || !complete || (rec() && lastCanon() === (complete ? canon(q.type, resp) : null));
    hint.textContent = done || gated ? '' : !complete ? (q.type === 'seq' ? '' : 'Finish your answer to enable Check answer.') : (rec() && lastCanon() === canon(q.type, resp) ? 'Change your answer to try again.' : '');
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
    card.classList.remove('shake', 'pop'); void card.offsetWidth; card.classList.add(correct ? 'pop' : 'shake');
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
