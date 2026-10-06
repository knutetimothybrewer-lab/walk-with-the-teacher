/* Item rendering and the submit / retry / keep flow shared by every graded task.
 * One Submit per stage. Blank or incomplete parts never consume an attempt. Hints never reveal the key while attempts remain.
 */
(function (root) {
  'use strict';
  var W = root.WWQ, U = W.U, h = U.h, P = W.Policy, St = W.Store, A = W.Art, UI = W.UI, V = W.Vis;
  var IU = W.ItemsUI = { reconsider: {} };
  var GROUPS = { S: 'State the decision', T: 'Think of options', O: 'Observe consequences', P: 'Pick a responsible choice' };

  function pctTxt(x) { return Math.round(x * 100) + '%'; }
  function pts(x) { return U.fmt2(x); }
  IU.limit = function (item) { return P.limitFor(item); };

  /* ---------- draft helpers ---------- */
  IU.draftOf = function (rec, partId) { return rec.draft ? rec.draft[partId] : undefined; };
  IU.parseNum = function (s) { var t = String(s).replace(/−/g, '-').replace(/\s+/g, ''); return /^-?\d+$/.test(t) ? Number(t) : null; };
  IU.responseOf = function (item, rec) {
    var v = P.currentVariant(item, rec), out = {};
    v.parts.forEach(function (p) {
      var x = rec.draft[p.id];
      if (p.type === 'num') { if (x !== undefined && x !== '' && x !== null) out[p.id] = x; }
      else if (x !== undefined && x !== null && !(Array.isArray(x) && !x.length)) out[p.id] = x;
    });
    return out;
  };
  IU.status = function (item, rec) {
    // 'untouched' | 'incomplete' | 'ready'
    if (P.mode(item, rec) !== 'draft') return 'none';
    var v = P.variantAt(item, rec.attempts.length), r = IU.responseOf(item, rec), keys = Object.keys(r);
    if (!keys.length) return 'untouched';
    return P.scoreResponse(v, r).valid ? 'ready' : 'incomplete';
  };

  /* ---------- submission (stage-level) ---------- */
  IU.submitAll = function (items, env) {
    if (env.busy || env.readOnly) return null;
    env.busy = true;
    var summary = { submitted: 0, incomplete: [], untouched: 0, results: [] };
    try {
      items.forEach(function (it) {
        var rec = St.ensureItem(env.state, it.id), st = IU.status(it, rec);
        if (st === 'untouched') { summary.untouched++; return; }
        if (st === 'incomplete') { summary.incomplete.push(it.id); return; }
        if (st !== 'ready') return;
        var r = P.submit(it, rec, IU.responseOf(it, rec));
        if (r.ok) { summary.submitted++; summary.results.push({ id: it.id, attempt: r.attempt, finalized: r.finalized }); }
      });
      if (summary.submitted) { env.save(true); }
    } finally { env.busy = false; }
    return summary;
  };

  /* ---------- option rendering ---------- */
  function orderOpts(part, variant, env) {
    var opts = part.opts.slice();
    if (part.fixed || part.type === 'num') return opts;
    var keep = opts.filter(function (o) { return o.id === 'keep'; }), rest = opts.filter(function (o) { return o.id !== 'keep'; });
    return keep.concat(U.shuffle(rest, env.state.session.id + '|' + variant.id + '|' + part.id));
  }
  function checkSvg() { return A.iconEl('check'); }

  function partEl(item, rec, variant, part, env, mode) {
    var fs = h('fieldset.part'), locked = mode !== 'draft' || env.readOnly, last = rec.attempts[rec.attempts.length - 1];
    var legendKids = [part.group ? part.label.replace(/^[STOP] \u00b7 /, '') : part.label];
    var resp = locked ? (last ? last.response : {}) : rec.draft;
    var credit = null;
    if (locked && last) { var pr = last.parts.filter(function (x) { return x.id === part.id; })[0]; credit = pr ? pr.credit : null; }
    if (locked && credit !== null) {
      var kind = credit >= 1 - 1e-9 ? 'full' : credit > 0 ? 'part' : 'none', txt = kind === 'full' ? '✓ Full credit' : kind === 'part' ? '◐ Partial credit' : '✗ Not yet';
      legendKids.push(' ', h('span.partmark.' + kind, txt));
    }
    fs.appendChild(h('legend', legendKids));
    var name = item.id + '|' + variant.id + '|' + part.id, finalNow = mode === 'final';
    var bestIds = {};
    if (finalNow && part.type !== 'num') {
      var mx = 0; part.opts.forEach(function (o) { mx = Math.max(mx, P.optionCredit(part, o.id, last ? last.response : {})); });
      part.opts.forEach(function (o) { var c = P.optionCredit(part, o.id, last ? last.response : {}); if (mx > 0 && c >= mx - 1e-9) bestIds[o.id] = 'best'; else if (c > 0) bestIds[o.id] = 'some'; });
    }
    if (part.type === 'num') {
      var val = resp[part.id]; var inp = h('input.txt', { type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-label': part.label, 'data-fk': 'n-' + name, value: val === undefined || val === null ? '' : String(val), disabled: locked || null,
        oninput: function (e) { var t = e.target.value.trim(); if (t === '') delete rec.draft[part.id]; else { var n = IU.parseNum(t); if (n !== null) rec.draft[part.id] = n; else rec.draft[part.id] = t; } env.save(); env.refresh(); } });
      fs.appendChild(h('div.numrow', inp, h('span.hint-line', locked ? '' : 'Type a whole number. Use − or - for negatives.')));
      if (finalNow) fs.appendChild(h('p.hint-line', h('b', 'Correct value: '), U.fmtSigned(part.key)));
      return fs;
    }
    if (part.type === 'select') {
      var sel = h('select.sel', { 'aria-label': part.label, 'data-fk': 's-' + name, disabled: locked || null, onchange: function (e) { var v = e.target.value; if (v) rec.draft[part.id] = v; else delete rec.draft[part.id]; env.save(); env.rerender(); } }, h('option', { value: '' }, 'Choose…'));
      orderOpts(part, variant, env).forEach(function (o) { sel.appendChild(h('option', { value: o.id, selected: resp[part.id] === o.id || null }, o.t)); });
      fs.appendChild(sel);
      if (finalNow) { var bs = part.opts.filter(function (o) { return bestIds[o.id] === 'best'; }); fs.appendChild(h('p.hint-line', h('b', 'Best-supported: '), bs.map(function (o) { return o.t; }).join(' / '))); }
      return fs;
    }
    var multi = part.type === 'multi', cur = multi ? (resp[part.id] || []) : resp[part.id];
    var allShort = part.opts.every(function (o) { return o.t.length <= 28; }) && part.opts.length <= 7;
    var list = h('div.opts' + (allShort ? '.chips' : ''), { role: multi ? 'group' : 'radiogroup', 'aria-label': part.label });
    orderOpts(part, variant, env).forEach(function (o) {
      var checked = multi ? cur.indexOf(o.id) >= 0 : cur === o.id;
      var disabledNow = locked || (multi && !checked && cur.length >= part.pick);
      var input = h('input', { type: multi ? 'checkbox' : 'radio', name: name, value: o.id, checked: checked, disabled: disabledNow || null, 'data-fk': 'o-' + name + '-' + o.id,
        onchange: function (e) {
          if (multi) { var arr = (rec.draft[part.id] || []).slice(); var i = arr.indexOf(o.id); if (e.target.checked && i < 0) arr.push(o.id); else if (!e.target.checked && i >= 0) arr.splice(i, 1); rec.draft[part.id] = arr; }
          else rec.draft[part.id] = o.id;
          env.save(); env.rerender();
        } });
      var cls = 'opt' + (locked ? '.locked' : '') + (locked && checked ? '.picked' : '') + (disabledNow && !locked ? '.disabled' : '') + (finalNow && bestIds[o.id] === 'best' ? '.best' : '');
      var lab = h('label.' + cls.replace(/^opt/, 'opt').split('.').filter(Boolean).join('.'), input, h('span.mark', checkSvg()), h('span.txt', o.t));
      if (finalNow && bestIds[o.id] === 'best') lab.appendChild(h('span.chip.ok.tag', A.iconEl('check'), 'Best-supported'));
      else if (finalNow && bestIds[o.id] === 'some') lab.appendChild(h('span.chip.warn.tag', 'Partly supported'));
      if (locked && checked && !(finalNow && bestIds[o.id])) lab.appendChild(h('span.chip.brand.tag', 'Your answer'));
      else if (locked && checked) lab.appendChild(h('span.chip.brand.tag', 'Your answer'));
      list.appendChild(lab);
    });
    fs.appendChild(list);
    if (multi && !locked) fs.appendChild(h('p.hint-line', 'Picked ' + cur.length + ' of ' + part.pick));
    return fs;
  }

  /* ---------- review panel: hint + reconsider + keep/retry ---------- */
  IU.reviewPanel = function (item, rec, env, opts) {
    opts = opts || {};
    var last = rec.attempts[rec.attempts.length - 1], left = P.attemptsLeft(item, rec), nextCap = P.capFor(rec.attempts.length + 1), box = h('div');
    var hints = P.hintsFor(item, rec), hb = h('div.hintbox', h('b', 'Hint (no answers revealed): '), hints.general);
    var ul = h('ul'); hints.parts.forEach(function (p) { if (p.hint) ul.appendChild(h('li', h('b', p.label.replace(/^Part \d · /, '') + ': '), p.hint)); });
    if (ul.children.length) hb.appendChild(ul);
    box.appendChild(hb);
    if (!env.readOnly) {
      var rid = 'rc-' + item.id.replace(/\./g, '-'), checked = !!IU.reconsider[item.id];
      var cb = h('input', { type: 'checkbox', id: rid, checked: checked, 'data-fk': rid, onchange: function (e) { IU.reconsider[item.id] = e.target.checked; env.rerender(); } });
      var maxNext = pts(item.pts * nextCap);
      box.appendChild(h('div.stack-sm', { style: { marginTop: '12px' } },
        h('label', { 'for': rid, style: { display: 'flex', gap: '8px', alignItems: 'flex-start', fontWeight: '600' } }, cb, h('span', 'I re-read the evidence and the hint above and I am ready to reconsider.')),
        h('div.row', UI.btn('Retry with a similar question (up to ' + pctTxt(nextCap) + ' · max ' + maxNext + ' pts)', { cls: 'primary', disabled: !checked, fk: 'retry-' + item.id, onclick: function () { if (P.startRetry(item, rec)) { IU.reconsider[item.id] = false; env.save(true); env.rerender(); UI.announce('Attempt ' + (rec.attempts.length + 1) + ' started with a similar question.'); } } }),
          UI.btn('Keep my score (' + pts(rec.best) + ' of ' + item.pts + ' pts) and move on', { onclick: function () { P.keep(item, rec); env.save(true); env.rerender(); UI.announce('Score kept for this item.'); } })),
        h('p.hint-line', left + ' attempt' + (left === 1 ? '' : 's') + ' left. A retry uses a similar but different question. Your best score is always kept, so a weaker retry cannot lower it.')));
    }
    return box;
  };

  function resultBox(item, rec, mode) {
    var a = rec.attempts[rec.attempts.length - 1]; if (!a) return null;
    var kind = a.raw >= 1 - 1e-9 ? 'full' : a.raw > 0 ? 'partial' : 'none';
    var head = a.raw >= 1 - 1e-9 ? 'Full credit for this attempt' : a.raw > 0 ? 'Partial credit for this attempt' : 'No credit yet for this attempt';
    return h('div.result.' + kind, { role: 'status' },
      h('div.big', head),
      h('p', 'Attempt ' + a.n + ': ' + Math.round(a.raw * 100) + '% correct × ' + pts(item.pts) + ' pts × ' + pctTxt(a.cap) + ' attempt cap = ', h('b', pts(a.awarded) + ' pts'), '. Best so far: ', h('b', pts(rec.best) + ' of ' + item.pts + ' pts'), '.'));
  }
  function attemptsTable(item, rec) {
    var t = h('table.attempts', h('caption.sr-only', 'Attempt history'), h('thead', h('tr', h('th', 'Attempt'), h('th', 'Question version'), h('th', 'Correct'), h('th', 'Cap'), h('th', 'Points'))));
    var tb = h('tbody'); rec.attempts.forEach(function (a) { tb.appendChild(h('tr', h('td', String(a.n)), h('td', a.variantId.split('.').pop().toUpperCase()), h('td', Math.round(a.raw * 100) + '%'), h('td', pctTxt(a.cap)), h('td', pts(a.awarded)))); });
    t.appendChild(tb); return t;
  }
  var REASON = { full: 'Full credit on the first try.', 'full-on-retry': 'Full credit on a retry (a further retry could not earn more).', 'no-gain': 'No retry could earn more than your best score, so this item is finished.', exhausted: 'All attempts used. Your best score is kept and you can keep going.', kept: 'You chose to keep your score.' };

  /* ---------- the item card ---------- */
  IU.renderItem = function (item, env, opts) {
    opts = opts || {};
    var rec = St.ensureItem(env.state, item.id), mode = P.mode(item, rec), variant = P.currentVariant(item, rec), limit = P.limitFor(item), n = rec.attempts.length;
    var card = h('section.item' + (opts.compact ? '.compact' : ''), { 'aria-labelledby': 'h-' + item.id.replace(/\./g, '-'), 'data-item': item.id });
    var meta = h('div.item-meta', UI.chip(item.pts + ' pt' + (item.pts === 1 ? '' : 's'), 'brand'), UI.chip('up to ' + limit + ' attempts', 'info'));
    if (mode === 'final') meta.appendChild(UI.chip('Submitted · ' + pts(rec.best) + ' / ' + item.pts, rec.best >= item.pts - 1e-9 ? 'ok' : 'gold', 'check'));
    else if (mode === 'review') meta.appendChild(UI.chip('Submitted · not final', 'warn'));
    card.appendChild(h('div.item-head', h('h2#h-' + item.id.replace(/\./g, '-'), opts.title || item.topic), meta));
    var ctx = h('div.item-ctx'); if (variant.ctx) ctx.appendChild(U.rich(variant.ctx));
    var vctx = { variant: variant, item: item, rec: rec, state: env.state, mode: mode, readOnly: env.readOnly, rerender: env.rerender, draftOf: function (pid) { var r = mode === 'draft' ? rec.draft : (rec.attempts[rec.attempts.length - 1] || {}).response || {}; return r[pid]; } };
    if (variant.vis) { var vv = V.render(variant.vis, vctx); if (vv) ctx.appendChild(vv); }
    card.appendChild(ctx);
    var lastGroup = null;
    variant.parts.forEach(function (p) {
      if (p.group && p.group !== lastGroup) { card.appendChild(h('div.groupHead', h('span.letter', p.group), GROUPS[p.group] || p.group)); lastGroup = p.group; }
      card.appendChild(partEl(item, rec, variant, p, env, mode));
    });
    if (mode === 'draft') {
      card.appendChild(h('p.policyline', 'Attempt ' + (n + 1) + ' of ' + limit + ' · up to ' + pctTxt(P.capFor(n + 1)) + ' credit (max ' + pts(item.pts * P.capFor(n + 1)) + ' pts)' + (n + 1 < limit ? ' · next attempt would be capped at ' + pctTxt(P.capFor(n + 2)) : ' · this is your last attempt')));
      if (n > 0) card.appendChild(h('div.callout.info', { style: { marginTop: '12px' } }, A.iconEl('info'), h('div', 'This is a ', h('b', 'similar new question'), ' with the same goal. Your best score so far (' + pts(rec.best) + ') is kept.')));
    } else {
      var rb = resultBox(item, rec, mode); if (rb) card.appendChild(rb);
      if (mode === 'review') card.appendChild(IU.reviewPanel(item, rec, env));
      if (mode === 'final') {
        var ex = h('div.explain', h('h3', 'Why this works'), U.rich(item.why), h('p.small', h('b', 'Status: '), REASON[rec.finalizedReason] || 'Finalized.'), attemptsTable(item, rec));
        var av = rec.attempts[rec.attempts.length - 1]; var lv = P.variantAt(item, av.n - 1);
        if (lv.branches && lv.branches[av.response.p]) ex.appendChild(h('p', h('b', 'Your path: '), lv.branches[av.response.p]));
        card.appendChild(ex);
      }
    }
    return card;
  };

  /* ---------- stage-level action bar ---------- */
  IU.actionBar = function (items, env, extra) {
    var counts = { ready: 0, incomplete: 0, untouched: 0, review: 0, final: 0 };
    items.forEach(function (it) { var rec = St.ensureItem(env.state, it.id), m = P.mode(it, rec); if (m === 'final') counts.final++; else if (m === 'review') counts.review++; else counts[IU.status(it, rec)]++; });
    var many = items.length > 1;
    var msg;
    if (counts.final === items.length) msg = 'All answers in this step are submitted and finished.';
    else if (counts.review && !counts.ready) msg = 'Review the hint, then retry or keep your score for each item above.';
    else if (counts.ready) msg = 'Submit records this attempt for ' + counts.ready + (many ? ' answers' : ' answer') + '. ' + (counts.untouched ? counts.untouched + ' untouched ' + (counts.untouched === 1 ? 'item' : 'items') + ' will not use an attempt. ' : '') + 'You can then keep your score or retry with a similar question.';
    else if (counts.incomplete) msg = 'Finish every part of an item before you submit it. Unfinished items do not use an attempt.';
    else msg = 'Answer, then press Submit. Blank answers never use an attempt.';
    var btn = UI.btn(counts.ready > 1 ? 'Submit ' + counts.ready + ' answers' : many ? 'Submit answers' : 'Submit answer', { cls: 'primary big', id: 'btn-submit', fk: 'submit', disabled: !counts.ready || env.readOnly,
      onclick: function () { var s = IU.submitAll(items, env); if (!s) return; env.afterSubmit(s); } });
    return h('div.actionbar', { role: 'region', 'aria-label': 'Submit' }, h('div.info', { id: 'action-info', 'aria-live': 'polite' }, msg), h('div.row', extra || null, btn));
  };
})(typeof window !== 'undefined' ? window : globalThis);
