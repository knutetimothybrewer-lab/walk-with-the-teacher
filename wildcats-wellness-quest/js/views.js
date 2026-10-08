/* Stage views for every mission. Each view returns DOM; state changes go through env (save / rerender / afterSubmit). */
(function (root) {
  'use strict';
  var W = root.WWQ, U = W.U, h = U.h, S = W.Sim, P = W.Policy, St = W.Store, A = W.Art, UI = W.UI, IU = W.ItemsUI, V = W.Vis;
  var Views = W.Views = { sel: null, overlapSeen: {}, showExtreme: null };
  var M = U.fmtSigned;

  /* ---------- shared pieces ---------- */
  Views.banner = function (m, env, say, who, mood) {
    var av = A.avatarById(env.state.student.avatar), speakerJ = who === 'Jordan';
    var chars = h('div.chars', { 'aria-hidden': 'true' }, h('div.bob', U.svg(A.avatar(av, mood || 'happy'))), h('div.bob', U.svg(speakerJ ? A.jordan(mood || 'happy') : A.guide(mood || 'happy'))));
    var b = h('div.banner', { role: 'group', 'aria-label': m.placeName }, U.svg(A.scene(m.place)), chars, h('span.placetag', m.placeName));
    var out = h('div', b);
    if (say) out.appendChild(h('div.say.rise', h('div.sayav', { 'aria-hidden': 'true' }, U.svg(speakerJ ? A.jordan(mood || 'happy') : A.guide(mood || 'happy'))), h('div', h('span.who', who || 'Pounce'), h('span.txt', say))));
    return out;
  };
  Views.example = function (n, stage, env) {
    var ex = W.EXAMPLES[n]; if (!ex) return null;
    var items = W.itemsForStage(stage.id), started = items.some(function (i) { return (env.state.items[i.id] || { attempts: [] }).attempts.length; });
    return h('details.example', { open: started ? null : true },
      h('summary', A.iconEl('bulb'), ex.title + ' — ' + (stage.title)),
      h('div.body', U.rich(ex.scenario), h('ol', ex.steps.map(function (s) { return h('li', s); })), h('div.ans', h('b', 'Example answer: '), ex.answer + '. ', ex.reasoning), h('p.hint-line', 'This example uses different content from the graded questions and is never scored.')));
  };
  Views.stepper = function (m, stage, env) {
    var ol = h('ol.stepper', { 'aria-label': 'Steps in this mission' });
    m.stages.forEach(function (s, i) {
      var done = Views.stageDone(s, env.state), cur = s.id === stage.id;
      ol.appendChild(h('li', h('button.step' + (cur ? '.cur' : '') + (done ? '.done' : ''), { type: 'button', 'aria-current': cur ? 'step' : null, 'aria-label': 'Step ' + (i + 1) + ': ' + s.title + (done ? ' (submitted)' : ''), onclick: function () { W.App.go({ m: m.id, s: s.id }); } },
        h('span.n', done ? A.iconEl('check') : String(i + 1)), s.title)));
    });
    return ol;
  };
  Views.stageDone = function (stage, state) {
    var items = W.itemsForStage(stage.id), ok = items.every(function (i) { return (state.items[i.id] || {}).finalized; });
    if (stage.kind === 'overlap') return !!state.progress.activities.overlap;
    if (stage.kind === 'play') return !!state.progress.activities.playWeek;
    if (stage.kind === 'practice') return !!state.progress.activities.tutorial;
    if (stage.kind === 'setup') return !!state.progress.started;
    if (stage.kind === 'howto') return !!state.progress.started && !!state.progress.howto;
    return items.length ? ok : false;
  };
  Views.header = function (m, stage, env, lead) {
    return h('div', h('div.stagehead', h('div', h('div.crumb', m.id ? 'Mission ' + m.id + ' · ' + m.title : m.title), h('h1', { id: 'stage-title', tabindex: '-1' }, stage.title)), Views.stepper(m, stage, env)), lead ? h('p.lead', lead) : null);
  };
  Views.nav = function (m, stage, env) {
    var idx = m.stages.indexOf(stage), prev = m.stages[idx - 1], next = m.stages[idx + 1], row = h('div.stagenav');
    row.appendChild(UI.btn(prev ? 'Back: ' + prev.title : 'Back to map', { icon: 'left', onclick: function () { prev ? W.App.go({ m: m.id, s: prev.id }) : W.App.go({ view: 'map' }); } }));
    var mdone = P.missionStatus(env.state, m.id).complete || m.id === 0 && Views.stageDone(stage, env.state);
    if (next) row.appendChild(UI.btn('Next: ' + next.title, { icon: 'right', cls: Views.stageDone(stage, env.state) ? 'primary' : '', onclick: function () { W.App.go({ m: m.id, s: next.id }); } }));
    else row.appendChild(UI.btn(m.id === 7 && mdone ? 'Review and submit my assessment' : mdone ? 'Mission done: back to the map' : 'Back to the map', { icon: 'map', cls: mdone ? 'primary' : '', onclick: function () { m.id === 7 && mdone ? W.App.go({ view: 'review' }) : W.App.go({ view: 'map' }); } }));
    return row;
  };
  Views.celebrate = function (m, env) {
    if (!P.missionStatus(env.state, m.id).complete || m.id === 0) return null;
    return h('div.celebrate.pop', { role: 'status' }, A.iconEl('flag'), h('h2', 'Mission ' + m.id + ' submitted'), h('p', 'Completion badge earned: you finished all the required work in this mission. This badge shows completion only. It is not your grade, and your points are shown separately.'));
  };
  Views.reflection = function (m, key, env, label) {
    var st = env.state.reflections;
    var ta = h('textarea.txt', { id: 'refl-' + key, maxlength: '1200', 'aria-describedby': 'refl-note-' + key, disabled: env.readOnly || null, 'data-fk': 'refl-' + key, placeholder: 'Optional. You can write about a fictional person instead of yourself.', oninput: function (e) { st[key] = e.target.value; env.save(); } }); ta.value = st[key] || '';
    var share = h('input', { type: 'checkbox', checked: !!st.share, disabled: env.readOnly || null, onchange: function (e) { st.share = e.target.checked; env.save(); } });
    return h('details.card.flat', { style: { marginTop: '16px' } }, h('summary', { style: { cursor: 'pointer', fontWeight: '800' } }, 'Optional private reflection (not graded)'),
      h('div.stack-sm', { style: { marginTop: '12px' } }, h('label.field', { 'for': 'refl-' + key }, label), ta,
        h('p.hint-line#refl-note-' + key, 'Never graded and never required. Fictional work is just as valid. Please do not include private health information. It stays on this device unless you tick the box below.'),
        h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, share, 'Include my reflections in the report file I give my teacher')));
  };
  Views.refPanel = function (open) {
    var R = W.REFERENCE, d = h('details.card.flat', { open: open ? true : null, style: { marginBottom: '16px', borderColor: '#bcd0f3', background: '#f7faff' } }, h('summary.refsum', { style: { cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' } }, A.iconEl('doc'), 'Reference panel: general ADULT (age 20+) examples. Use it to answer.'));
    d.appendChild(h('p.small.muted', { style: { marginTop: '8px' } }, R.note + ' These values are screening information, never a diagnosis.'));
    var g = h('div.grid.c2', { style: { gap: '12px' } });
    R.rows.forEach(function (r) { g.appendChild(h('div.card.flat', { style: { padding: '12px' } }, h('h2', { style: { fontSize: 'var(--t-base)' } }, r.name + ' (' + r.unit + ')'), h('p.small', r.what), h('ul.small', { style: { margin: '4px 0', paddingLeft: '20px' } }, r.ranges.map(function (x) { return h('li', x); })), h('p.xs.muted', h('b', 'Conditions: '), r.cond), h('p.xs.muted', 'Source label: ' + r.src))); });
    d.appendChild(g);
    d.appendChild(h('p.small', h('b', 'Also measured at check-ups: '), R.measurements.join(', ') + '. For teens, BMI uses age- and sex-specific percentiles, so adult BMI cutoffs are never applied to them.'));
    return d;
  };

  /* ---------- 0.1 setup ---------- */
  Views.setup = function (m, stage, env) {
    var st = env.state, C = W.CONFIG, started = st.progress.started, ro = env.readOnly;
    var alias = h('input.txt#alias', { type: 'text', maxlength: '60', autocomplete: 'off', 'data-fk': 'alias', value: st.student.alias, disabled: ro || null, 'aria-describedby': 'alias-help', oninput: function (e) { st.student.alias = e.target.value.slice(0, 60); env.save(); env.refresh(); } });
    var BLOCKS = C.blocks || ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9'];
    var period = h('select.txt#period', { 'data-fk': 'period', disabled: ro || null, onchange: function (e) { st.student.period = e.target.value.slice(0, 20); env.save(); } }, h('option', { value: '' }, 'Choose your block\u2026'), BLOCKS.map(function (b) { return h('option', { value: b, selected: st.student.period === b ? true : null }, b); }));
    var useCode = W.Sync.enabled(), codeMsg = h('p.hint-line#code-msg', { role: 'status' }, 'Your teacher will give you the class code.');
    var code = h('input.txt#classcode', { type: 'text', maxlength: '40', autocomplete: 'off', autocapitalize: 'characters', 'data-fk': 'code', value: st.student.code || '', disabled: ro || started || null, 'aria-describedby': 'code-msg', oninput: function (e) { st.student.code = e.target.value.slice(0, 40); env.save(); env.refresh(); } });
    var needsCode = function () { return useCode && !started && (st.student.code || '').trim().length < 2; };
    var avs = h('div.avatars', { role: 'radiogroup', 'aria-label': 'Choose your avatar' });
    W.AVATARS.forEach(function (a) { avs.appendChild(h('label.opt', h('input', { type: 'radio', name: 'avatar', value: a.id, checked: st.student.avatar === a.id, disabled: ro || null, 'data-fk': 'av-' + a.id, onchange: function () { st.student.avatar = a.id; env.save(); env.rerender(); } }), h('span.mark', A.iconEl('check')), U.svg(A.avatar(a)), h('span.small', { style: { fontWeight: '700' } }, a.name))); });
    var begin = function () { st.student.alias = st.student.alias.trim(); st.student.code = (st.student.code || '').trim(); st.progress.started = true; if (!st.timing.startedAt) st.timing.startedAt = U.nowISO(); env.save(true); W.App.go({ m: 0, s: '0.2' }); };
    var startBtn = UI.btn(started ? 'Continue to How it works' : 'Start my quest', { cls: 'primary big pulse', id: 'btn-start', icon: 'right', disabled: (C.requireIdentifier && st.student.alias.trim().length < 2) || needsCode(),
      onclick: function () {
        if (!useCode || started) { begin(); return; }
        st.student.alias = st.student.alias.trim(); st.student.code = st.student.code.trim(); startBtn.disabled = true; codeMsg.textContent = 'Checking your class code\u2026';
        W.Sync.checkCode(st.student).then(function (r) {
          if (r.ok) { begin(); return; }
          startBtn.disabled = false; codeMsg.textContent = r.reason === 'network' ? 'Could not reach the server to check your class code. Check your connection and try again.' : 'That class code was not recognized. Check it with your teacher.'; UI.announce(codeMsg.textContent);
          try { code.focus(); } catch (e) { /* ignore */ }
        });
      } });
    env.refreshStart = function () { startBtn.disabled = (C.requireIdentifier && alias.value.trim().length < 2) || needsCode(); };
    var left = h('div.stack', h('div.display', 'Wildcats Wellness Quest', h('br'), h('span', { style: { color: 'var(--brand)' } }, 'Small Choices, Whole Health')),
      h('p.lead', 'Walk the Wildcat High campus with Pounce and Jordan, a fictional classmate. Investigate situations, play a simulation, and show what you understand about wellness.'),
      h('div.callout.info', A.iconEl('clock'), h('div', h('b', 'Designed for about ' + C.timeGuidance.rangeMinutes[0] + '\u2013' + C.timeGuidance.rangeMinutes[1] + ' minutes. '), 'Some students need more. No timers, no speed points. Progress saves as you go.')));
    var form = h('div.card.stack', h('div', h('label.field', { 'for': 'alias' }, C.identifierLabel), alias, h('p.hint-line#alias-help', 'Use the alias or ID your teacher gave you. This is typed text, not a verified identity. Do not enter private health information.')),
      h('div', h('label.field', { 'for': 'period' }, 'Class period (optional)'), period),
      useCode ? h('div', h('label.field', { 'for': 'classcode' }, 'Class code'), code, codeMsg) : null,
      h('div', h('b', 'Choose your avatar'), avs), startBtn);
    var page = h('div', h('div.hero', left, ro ? h('div.card', h('p', 'Your assessment is submitted. Your alias and avatar cannot be changed.'), U.svg(A.avatar(A.avatarById(st.student.avatar)))) : form));
    if (!St.passcodeConfigured()) page.appendChild(h('div.callout.warn', { style: { marginTop: '16px' } }, A.iconEl('key'), h('div', h('b', 'Teacher setup not finished. '), 'No reset passcode is configured, so this copy is in preview mode. See README, “Teacher setup,” before using it for a class. Students can ignore this message.')));
    if (!St.storageOK) page.appendChild(h('div.callout.warn', { style: { marginTop: '16px' } }, A.iconEl('alert'), h('div', h('b', 'This browser is not allowing saving. '), 'You can still work, but progress and the one-session lock cannot be protected on this device. Use “Download recovery file” often.')));
    return page;
  };

  /* ---------- 0.2 how it works ---------- */
  Views.howto = function (m, stage, env) {
    var caps = W.CONFIG.caps, lim = W.CONFIG.attemptLimits;
    var tbl = h('table.tbl-policy', h('caption.sr-only', 'How attempts change credit for a 5-point item'), h('thead', h('tr', h('th', 'Attempt'), h('th', 'Highest credit'), h('th', 'Example: 5-point item answered fully correct on this attempt'))),
      h('tbody', caps.map(function (c, i) { return h('tr', h('td', String(i + 1)), h('td', Math.round(c * 100) + '%'), h('td', U.fmt2(5 * c) + ' points')); })));
    var cards = h('div.howgrid.stagger',
      h('div.how', A.iconEl('map'), h('h2', 'Walk the campus'), h('p', 'Seven missions. The next one opens when you have submitted the work in the one before, right or wrong.')),
      h('div.how', A.iconEl('search'), h('h2', 'Investigate, then submit'), h('p', 'Nothing counts until you press Submit. Opening tabs earns no points.')),
      h('div.how', A.iconEl('undo'), h('h2', 'Hints and retries'), h('p', 'Short questions allow ' + lim.short + ' attempts, complex ones ' + lim.complex + '. A retry is a similar new question. Your best score stays.')),
      h('div.how', A.iconEl('save'), h('h2', 'Saved on this device'), h('p', 'Progress saves in this browser. Download a recovery file now and then.')),
      h('div.how', A.iconEl('eye'), h('h2', 'Comfortable to use'), h('p', 'Works with a keyboard. Settings can turn animation off or enlarge text.')),
      h('div.how', A.iconEl('shield'), h('h2', 'Submit once'), h('p', 'When everything is submitted you lock your assessment and see your results.')));
    var page = h('div.stack', cards,
      h('div.card', h('h2', 'How credit works'), h('p', 'Your score for an item is ', h('b', 'how correct you are × the item’s points × the attempt cap'), '. The best value across your attempts is kept, and only the final total is rounded.'), tbl,
        h('p.hint-line', 'These caps are a teacher-chosen grading policy. When attempts run out, your best score is kept and you move on.')),
      h('div.card', h('h2', 'Three different numbers'), h('div.grid.c3', h('div', h('b', 'Completion'), h('p.small', 'How much required work you have submitted. It does not depend on being correct.')), h('div', h('b', 'First-attempt evidence'), h('p.small', 'What your first answers earned, kept separately in your report.')), h('div', h('b', 'Assessment score'), h('p.small', 'All 100 automatically scored points, with the attempt caps applied.')))));
    if (!env.readOnly) page.appendChild(h('div.row', UI.btn('Next: try a practice question', { cls: 'primary big', icon: 'right', onclick: function () { env.state.progress.howto = true; env.save(true); W.App.go({ m: 0, s: '0.3' }); } })));
    return page;
  };

  /* ---------- 0.3 practice (ungraded; uses the real attempt engine) ---------- */
  Views.practice = function (m, stage, env) {
    var item = W.PRACTICE.tut, rec = env.state.practice.tut, wrap = h('div.stack');
    wrap.appendChild(h('div.callout.gold', A.iconEl('sparkle'), h('div', h('b', 'Practice only: this does not count. '), 'Try an answer you are not sure about, read the hint, and try a retry to see how credit changes. This practice item is pretend-worth 5 points.')));
    var penv = Object.assign({}, env, { state: env.state });
    wrap.appendChild(IU.renderItem(item, penv, { title: 'Practice question (not graded)' }));
    wrap.appendChild(IU.actionBar([item], penv));
    if (rec.finalized) { if (!env.state.progress.activities.tutorial && !env.readOnly) { env.state.progress.activities.tutorial = true; env.save(true); } wrap.appendChild(h('div.callout.ok', A.iconEl('check'), h('div', h('b', 'Practice complete. '), 'Now you know how attempts, hints and caps work. Walk to the map to start Mission 1.'))); }
    return wrap;
  };

  /* ---------- 1.1 sort board ---------- */
  Views.sort = function (m, stage, env) {
    var items = W.itemsForStage(stage.id), ro = env.readOnly, wrap = h('div.stack');
    var DOM = S.DOMAINS;
    var cardData = items.map(function (it) {
      var rec = St.ensureItem(env.state, it.id), mode = P.mode(it, rec), v = P.currentVariant(it, rec), last = rec.attempts[rec.attempts.length - 1];
      var dom = mode === 'draft' ? rec.draft.dom : last && last.response.dom;
      return { it: it, rec: rec, mode: mode, v: v, dom: dom, last: last };
    });
    var selCard = cardData.filter(function (c) { return c.it.id === Views.sel && c.mode === 'draft'; })[0];
    if (!selCard) Views.sel = null;
    var live = h('div.sr-only', { 'aria-live': 'polite', id: 'sort-live' }, selCard ? 'Selected: ' + selCard.v.ctx + '. Now choose a dimension.' : '');
    function place(c, dom) { c.rec.draft.dom = dom; Views.sel = null; env.save(); env.rerender(); UI.announce('Placed in ' + S.DOM[dom].n + '.'); }
    function cardEl(c, inTray) {
      var cls = 'sortcard' + (c.it.id === Views.sel ? '.sel' : '') + (c.mode === 'final' ? '.final' : '') + (c.last && c.mode !== 'draft' ? (c.last.raw >= 1 ? '.ok' : '.bad') : '');
      var status = null;
      if (c.mode !== 'draft' && c.last) status = c.last.raw >= 1 - 1e-9 ? h('span.st', A.iconEl('check'), 'Correct · ' + U.fmt2(c.last.awarded) + ' pt') : c.mode === 'final' ? h('span.st', A.iconEl('x'), 'Not matched · ' + U.fmt2(c.rec.best) + ' pt · answer: ' + S.DOM[c.v.key].n) : h('span.st', A.iconEl('x'), 'Try again after the hint');
      var b = h('button.' + cls.replace('sortcard', 'sortcard'), { type: 'button', 'data-fk': 'card-' + c.it.id, draggable: c.mode === 'draft' && !ro ? 'true' : null, 'aria-pressed': c.mode === 'draft' ? String(c.it.id === Views.sel) : null, disabled: (c.mode !== 'draft' || ro) ? true : null,
        'aria-label': c.v.ctx + (c.mode === 'draft' ? (inTray ? ' (unplaced)' : ' (placed in ' + S.DOM[c.dom].n + ', press to move back)') : ''),
        onclick: function () { if (c.mode !== 'draft') return; if (!inTray) { delete c.rec.draft.dom; Views.sel = c.it.id; env.save(); env.rerender(); return; } Views.sel = Views.sel === c.it.id ? null : c.it.id; env.rerender(); },
        ondragstart: function (e) { e.dataTransfer.setData('text/plain', c.it.id); e.dataTransfer.effectAllowed = 'move'; b.classList.add('dragging'); }, ondragend: function () { b.classList.remove('dragging'); } }, c.v.ctx, status);
      return b;
    }
    var bins = h('div.bins');
    DOM.forEach(function (d) {
      var drop = h('div.bin-drop'); cardData.filter(function (c) { return c.dom === d.id; }).forEach(function (c) { drop.appendChild(cardEl(c, false)); });
      var place_ = h('div.place', UI.btn('Place here', { cls: 'sm', icon: 'right', disabled: !selCard || ro, 'aria-label': 'Place selected card in ' + d.n, fk: 'bin-' + d.id, onclick: function () { if (selCard) place(selCard, d.id); } }));
      var bin = h('div.bin.dom-' + d.id, { role: 'group', 'aria-label': d.n + ' dimension', ondragover: function (e) { if (!ro) { e.preventDefault(); bin.classList.add('over'); } }, ondragleave: function () { bin.classList.remove('over'); },
        ondrop: function (e) { e.preventDefault(); bin.classList.remove('over'); var id = e.dataTransfer.getData('text/plain'); var c = cardData.filter(function (x) { return x.it.id === id && x.mode === 'draft'; })[0]; if (c) place(c, d.id); } },
        h('div.bin-head', A.iconEl(d.ico), d.n), drop, place_);
      bins.appendChild(bin);
    });
    var tray = h('div.tray', { 'aria-label': 'Situations to sort' }), grid = h('div.tray-grid');
    var unplaced = cardData.filter(function (c) { return c.mode === 'draft' && !c.dom; });
    unplaced.forEach(function (c) { grid.appendChild(cardEl(c, true)); });
    tray.appendChild(h('div.row.between', h('b', unplaced.length ? 'Situations to sort (' + unplaced.length + ')' : 'All situations are placed or submitted'), h('span.hint-line', ro ? '' : 'Click a card, then “Place here” (or drag it). Keyboard: Tab to a card, Enter, then Tab to a dimension and Enter.')));
    tray.appendChild(grid);
    wrap.appendChild(h('div.callout.info', A.iconEl('info'), h('div', 'Pick the dimension that is ', h('b', 'MOST directly involved'), ' in what the person is doing. Other dimensions may also be touched. ', h('b', 'Only cards you place are submitted. '), 'Untouched cards never use an attempt. Each card is its own 1-point question with 2 attempts.')));
    wrap.appendChild(live); wrap.appendChild(h('div.board', tray, bins));
    // review panel for submitted-but-not-final cards
    var review = cardData.filter(function (c) { return c.mode === 'review'; });
    if (review.length) {
      var left = Math.min.apply(null, review.map(function (c) { return P.attemptsLeft(c.it, c.rec); })), nextCap = P.capFor(2);
      var hb = h('div.hintbox', h('b', 'Hints (no answers revealed):'), h('ul', review.map(function (c) { return h('li', h('b', 'Card “' + c.v.ctx.slice(0, 48) + (c.v.ctx.length > 48 ? '…' : '') + '”: '), c.it.hint); })));
      var rid = 'rc-sort', cb = h('input', { type: 'checkbox', id: rid, checked: !!IU.reconsider.sort, 'data-fk': rid, disabled: ro || null, onchange: function (e) { IU.reconsider.sort = e.target.checked; env.rerender(); } });
      wrap.appendChild(h('div.result.partial', h('div.big', review.length + ' card' + (review.length === 1 ? '' : 's') + ' did not match yet'), hb,
        ro ? null : h('div.stack-sm', { style: { marginTop: '12px' } }, h('label', { 'for': rid, style: { display: 'flex', gap: '8px', fontWeight: '600' } }, cb, h('span', 'I re-read these situations and the hints and I am ready to reconsider.')),
          h('div.row', UI.btn('Retry ' + review.length + ' card' + (review.length === 1 ? '' : 's') + ' with similar new situations (up to ' + Math.round(nextCap * 100) + '%)', { cls: 'primary', disabled: !IU.reconsider.sort, onclick: function () { review.forEach(function (c) { P.startRetry(c.it, c.rec); }); IU.reconsider.sort = false; env.save(true); env.rerender(); UI.announce('Retry started with similar new situations.'); } }),
            UI.btn('Keep these scores and move on', { onclick: function () { review.forEach(function (c) { P.keep(c.it, c.rec); }); env.save(true); env.rerender(); } })),
          h('p.hint-line', 'Retries use similar new situations in the same dimensions. Your best score for each card is kept.'))));
    }
    var fin = cardData.filter(function (c) { return c.mode === 'final'; });
    if (fin.length === items.length) wrap.appendChild(h('div.explain', h('h4', 'Why classification asks for the primary dimension'), U.rich(items[0].why), h('p.small', h('b', 'Cards: '), fin.map(function (c) { return U.fmt2(c.rec.best) + '/1'; }).join(' · '))));
    wrap.appendChild(IU.actionBar(items, env));
    return wrap;
  };

  /* ---------- 1.2 overlap lab (unscored, required) ---------- */
  Views.overlap = function (m, stage, env) {
    var done = !!env.state.progress.activities.overlap, seenN = Object.keys(Views.overlapSeen).length, wrap = h('div.stack');
    wrap.appendChild(h('div.callout.info', A.iconEl('info'), h('div', h('b', 'Unscored exploration. '), 'Pick a situation, then open the five “lenses” to see how one choice can touch several dimensions. There are no points here; it just helps with the next question.')));
    W.OVERLAP.forEach(function (ex) {
      var lenses = h('div.opts.chips', { role: 'group', 'aria-label': 'Dimensions for ' + ex.card });
      var shown = h('div.stack-sm', { 'aria-live': 'polite' });
      S.DOMAINS.forEach(function (d) {
        var key = ex.id + ':' + d.id, on = !!Views.overlapSeen[key];
        lenses.appendChild(h('button.btn.sm' + (on ? '.primary' : ''), { type: 'button', 'aria-pressed': String(on), 'data-fk': 'lens-' + key, onclick: function () { if (Views.overlapSeen[key]) delete Views.overlapSeen[key]; else Views.overlapSeen[key] = true; env.rerender(); } }, A.iconEl(d.ico), d.n + (d.id === ex.main ? ' (main)' : '')));
        if (on) shown.appendChild(h('div.callout.dom-' + d.id, { style: { background: 'var(--ds)', borderColor: 'var(--dc)' } }, A.iconEl(d.ico), h('div', h('b', d.n + ': '), ex.lenses[d.id])));
      });
      wrap.appendChild(h('div.card', h('h2', ex.card), lenses, shown));
    });
    var ok = seenN >= 3 || done;
    wrap.appendChild(h('div.actionbar', h('div.info', done ? 'Overlap Lab complete. Wellness dimensions connect, so strength in one can sit beside difficulty in another.' : 'Open at least 3 lenses to continue (' + Math.min(seenN, 3) + ' of 3). No points are involved.'), UI.btn(done ? 'Overlap Lab complete' : 'I explored the overlaps', { cls: 'primary big', disabled: !ok || done || env.readOnly, icon: 'check', onclick: function () { env.state.progress.activities.overlap = true; env.save(true); env.rerender(); UI.announce('Overlap Lab complete.'); } })));
    return wrap;
  };

  /* ---------- 6.1 play Jordan's week (unscored) ---------- */
  Views.yourWeek = function (state, overrides) {
    var wk = S.makeWeek(W.CASEWEEKS.jordan.rows);
    W.DECISIONS.forEach(function (d) { var g = (overrides && overrides[d.id]) || state.sim.picks[d.id]; if (g) wk = S.setCell(wk, d.cat, d.day, g); });
    return wk;
  };
  Views.play = function (m, stage, env) {
    var st = env.state, ro = env.readOnly, base = S.makeWeek(W.CASEWEEKS.jordan.rows), mine = Views.yourWeek(st), picks = st.sim.picks, nPick = Object.keys(picks).length, wrap = h('div.stack');
    var all = nPick === W.DECISIONS.length, done = !!st.progress.activities.playWeek;
    wrap.appendChild(h('div.callout.info', A.iconEl('info'), h('div', h('b', 'Unscored. '), 'Make the 12 decisions for Jordan’s week. Each choice changes exactly one category on one day, so nothing is counted twice. The other entries are scenario-provided defaults (see the full log). These points are fictional teaching weights, never assessment points. The dashed line is Jordan’s baseline week, which stays on screen so you can always compare.')));
    var left = h('div');
    for (var d = 0; d < 7; d++) {
      var group = W.DECISIONS.filter(function (x) { return x.day === d; }); if (!group.length) continue;
      var g = h('div.daygroup', h('h2', A.iconEl('clock'), S.DAY_NAMES[d]));
      group.forEach(function (dec) {
        var ct = S.CAT[dec.cat], chosen = picks[dec.id], dm = S.DOM[ct.dom];
        var opts = h('div.opts', { role: 'radiogroup', 'aria-label': ct.n + ' decision' });
        U.shuffle(['A', 'B', 'C'], st.session.id + '|' + dec.id).forEach(function (gr) {
          opts.appendChild(h('label.opt' + (chosen === gr ? '.picked' : '') + (ro ? '.locked' : ''), h('input', { type: 'radio', name: dec.id, value: gr, checked: chosen === gr, disabled: ro || null, 'data-fk': 'dec-' + dec.id + gr, onchange: function () { st.sim.picks[dec.id] = gr; st.sim.finished = false; env.save(); env.rerender(); } }), h('span.mark', A.iconEl('check')), h('span.txt', dec.opts[gr])));
        });
        var out = chosen ? h('div.outcome.rise', h('span.domtag.dom-' + ct.dom, A.iconEl(dm.ico), ct.n + ' (±' + ct.w + ')'), ' rating ', h('b', chosen), ' = ', h('b', M(S.points(dec.cat, chosen)) + ' points'), ' on ' + S.DAYS[dec.day] + '. ', h('span.muted', dec.ripple)) : null;
        g.appendChild(h('div.dec' + (chosen ? '.done' : ''), h('div.scene', dec.scene), h('div.small.muted', 'Category: ', h('b', ct.n), ' · ' + dm.n), dec.rule ? h('div.rule', dec.rule) : null, opts, out));
      });
      left.appendChild(g);
    }
    var right = h('div.sticky.stack',
      h('div.card.flat', h('div.row.between', h('b', nPick + ' of ' + W.DECISIONS.length + ' decisions made'), h('span.chip.' + (all ? 'ok' : 'warn'), all ? 'Ready to finish' : 'Choose all 12')), h('div.bar', { style: { marginTop: '8px' }, role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '12', 'aria-valuenow': String(nPick), 'aria-label': 'Decisions made' }, h('i', { style: { width: (nPick / 12 * 100) + '%' } }))),
      V.runChart([{ week: mine, color: '#2b3a8c', label: 'Your week' }, { week: base, color: '#5a6683', dash: true, label: 'Jordan’s baseline week' }], { title: 'Running total: your week vs. baseline' }),
      V.domainBars(mine, base));
    wrap.appendChild(h('div.playgrid', left, right));
    wrap.appendChild(h('details.card.flat', h('summary', { style: { cursor: 'pointer', fontWeight: '800' } }, 'Full 7-day log for your week (all 140 entries; ★ = your decisions, others are scenario defaults)'), V.logTable(mine, { stars: true })));
    if (W.CONFIG.extendedExploration) {
      var ex = h('div.card.flat', h('h2', A.iconEl('sparkle'), 'Optional exploration'), h('p.small', 'See the extremes of the model: every choice A (+245), every choice B (0), every choice C (−245).'), h('div.row', ['A', 'B', 'C'].map(function (g) { return UI.btn('All ' + g, { cls: 'sm' + (Views.showExtreme === g ? ' primary' : ''), onclick: function () { Views.showExtreme = Views.showExtreme === g ? null : g; env.rerender(); } }); })));
      if (Views.showExtreme) { var xw = S.uniform(Views.showExtreme); ex.appendChild(h('p', 'All ' + Views.showExtreme + ': total ', h('b', M(S.total(xw))), ' (maximum ±245: daily ±35 × 7 days).')); ex.appendChild(V.dailyTable(xw)); }
      wrap.appendChild(ex);
    }
    if (all) {
      var cmp = st.sim.compare, sel = h('select.sel', { 'aria-label': 'Decision to revise', 'data-fk': 'cmp-sel', disabled: ro || null, onchange: function (e) { var v = e.target.value; if (!v) st.sim.compare = null; else { var cur = picks[v]; var alt = ['A', 'B', 'C'].filter(function (x) { return x !== cur; })[0]; st.sim.compare = { id: v, to: st.sim.compare && st.sim.compare.id === v ? st.sim.compare.to : alt }; } env.save(); env.rerender(); } }, h('option', { value: '' }, 'Choose a decision…'));
      W.DECISIONS.forEach(function (dec) { sel.appendChild(h('option', { value: dec.id, selected: cmp && cmp.id === dec.id || null }, S.DAYS[dec.day] + ' · ' + S.CAT[dec.cat].n)); });
      var box = h('div.card', h('h2', 'Optional: revise one decision and compare'), h('p.small', 'Pick a decision and a different rating to compare your original week with the revised week. Unscored; nothing is final here.'), sel);
      if (cmp) {
        var dec = W.DECISIONS.filter(function (x) { return x.id === cmp.id; })[0], opts2 = h('div.opts.chips', { role: 'radiogroup', 'aria-label': 'New rating' });
        ['A', 'B', 'C'].forEach(function (gr) { opts2.appendChild(h('label.opt', h('input', { type: 'radio', name: 'cmpgr', value: gr, checked: cmp.to === gr, disabled: ro || null, 'data-fk': 'cmpg-' + gr, onchange: function () { st.sim.compare.to = gr; env.save(); env.rerender(); } }), h('span.mark', A.iconEl('check')), 'Rate ' + gr + ' (' + M(S.points(dec.cat, gr)) + ')')); });
        var rev = S.setCell(mine, dec.cat, dec.day, cmp.to), diff = S.total(rev) - S.total(mine);
        box.appendChild(opts2);
        box.appendChild(V.runChart([{ week: mine, color: '#5a6683', dash: true, label: 'Original (your week)' }, { week: rev, color: '#2b3a8c', label: 'Revised' }], { title: 'Original vs. revised trajectory' }));
        box.appendChild(h('p', 'Weekly total changes by ', h('b', M(diff) + ' points'), ' (from ' + M(S.total(mine)) + ' to ' + M(S.total(rev)) + ').'));
      }
      wrap.appendChild(box);
    }
    var finBtn = UI.btn(done ? 'Week finished: continue' : 'Finish the week', { cls: 'primary big', icon: 'check', disabled: !all || ro, onclick: function () { st.sim.finished = true; st.progress.activities.playWeek = true; env.save(true); env.rerender(); UI.announce('Week finished.'); if (!done) UI.toast('Week finished. Next, answer questions about three fixed case weeks.', 'ok'); } });
    wrap.appendChild(h('div.actionbar', h('div.info', done ? 'You finished the unscored week. The questions that follow use fixed case weeks, so they stay valid however you played.' : all ? 'All 12 decisions made. Press Finish the week.' : 'Make all 12 decisions to finish the week.'), finBtn));
    return wrap;
  };

  /* ---------- generic form stage ---------- */
  Views.form = function (m, stage, env) {
    var items = W.itemsForStage(stage.id), wrap = h('div.stack');
    if (m.id === 2) wrap.appendChild(Views.refPanel(false));
    items.forEach(function (it, i) {
      var title = items.length > 1 ? 'Question ' + (i + 1) + ' of ' + items.length : (it.caseType ? 'Post: ' + it.caseType : stage.title);
      wrap.appendChild(IU.renderItem(it, env, { compact: items.length > 1, title: title }));
    });
    if (stage.reflection) wrap.appendChild(Views.reflection(m, m.id === 3 ? 'm3' : 'm7', env, m.id === 3 ? 'What small, realistic habit might you (or a fictional person) try, and what would make it easier?' : 'What is one thing from this assessment you would want to remember?'));
    wrap.appendChild(IU.actionBar(items, env));
    return wrap;
  };
})(typeof window !== 'undefined' ? window : globalThis);
