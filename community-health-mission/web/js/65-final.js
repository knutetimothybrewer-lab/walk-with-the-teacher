'use strict';
// Final review, submission, results, receipt, plan product, references.
(function () {
  var mount = function (view, title) { // reuse shell from 60-app via CHM.mountShell
    CHM.mountShell(view, title);
  };
  var pending = null;

  CHM.renderReview = function () {
    var mods = CHM.content.modules, all = CHM.allDone(), preview = CHM.session.preview;
    var confirm = false, btn, err = h('p.error', { role: 'alert' }), sub;
    var rows = mods.map(function (m) {
      return h('section.rv', h('h3', m.id + '. ' + m.title), h('ul.rvl', m.units.map(function (u, i) {
        var s = CHM.state.units[u.id], t = s.status === 'correct' ? '✓ Completed · correct (attempt ' + s.correctOn + ')' : s.status === 'exhausted' ? '✕ Completed · not correct (3 attempts used)' : s.attempts ? '◐ In progress · ' + s.attempts + ' attempt(s) used' : '○ Not started';
        return h('li', h('button.linkbtn', { type: 'button', onclick: function () { CHM.go('module', { id: m.id, unit: i }); } }, u.title), h('span.rvs ' + (s.status === 'correct' ? 'ok' : s.status === 'exhausted' ? 'bad' : ''), t));
      })));
    });
    function update() { btn.disabled = !(confirm && (all || preview)); }
    btn = h('button.btn.primary', { type: 'button', disabled: true, onclick: function () { submitFinal(btn, err); } }, preview ? 'Submit (preview: simulated)' : 'Submit final answers');
    var box = h('label.chk', h('input', { type: 'checkbox', onchange: function (e) { confirm = e.target.checked; update(); } }), ' I am ready to submit. I understand my answers will be locked and sent to my teacher\'s gradebook.');
    var view = h('div.review', h('h1', 'Final review'), h('p', all ? 'Every question is finished. Check the list, then submit.' : 'Some questions are not finished. Finish each question (or use its three attempts) before submitting.'),
      h('p.small', 'Completed means finished (correct, or all three attempts used). Correct is shown separately. Explanations appear after you submit' + (CHM.session.cls && CHM.session.cls.revealMode === 'onLock' ? ' and when each question locks.' : '.')), rows,
      h('div.card.submitbox', box, err, h('div.row', btn, h('button.btn.ghost', { type: 'button', onclick: function () { CHM.go('map'); } }, 'Back to map'))));
    mount(view, 'Final review');
  };

  function submitFinal(btn, err) {
    btn.disabled = true; btn.textContent = 'Submitting…'; err.textContent = '';
    var req = pending || (pending = { requestId: CHM.uid() });
    CHM.api('finalize', { requestId: req.requestId, confirm: true }, { retries: 4 }).then(function (res) {
      if (!res.ok) { btn.disabled = false; btn.textContent = 'Submit final answers'; err.textContent = res.message; return; }
      pending = null; CHM.state = Object.assign(res.state, { activity: CHM.state.activity });
      CHM.final = res.final; CHM.go('results');
    }, function () {
      btn.disabled = false; btn.textContent = 'Try submitting again';
      err.textContent = 'We could not reach the server, so your submission is NOT confirmed yet. Your work is saved. Press the button again; the same request is re-sent and cannot create a duplicate.';
    });
  }

  function chip(cls, text) { return h('span.chip2 ' + cls, text); }
  function stamp(iso) { try { return new Date(iso).toLocaleString(); } catch (e) { return iso; } }

  CHM.renderResults = function () {
    var f = CHM.state.final || CHM.final; if (!f) return CHM.go('review');
    var r = f.results, preview = !!f.preview;
    var gb = f.gradebook, gbChip = gb === 'recorded' ? chip('ok', '✓ Results recorded in teacher gradebook') : gb === 'simulated' ? chip('warn', 'Simulated only: nothing was delivered') : chip('warn', '⚠ Gradebook delivery pending');
    var retry = (gb === 'pending') ? h('button.btn.sm', { type: 'button', onclick: function (e) { e.target.disabled = true; CHM.api('retryGradebook', {}, { retries: 3 }).then(function (res) { if (res.ok) { CHM.state.final = res.final; CHM.final = res.final; } CHM.go('results'); }, function () { e.target.disabled = false; }); } }, 'Retry delivery to gradebook') : null;
    var head = h('section.res-head',
      preview ? h('div.previewlabel', 'Teacher Preview — No Student Grade Recorded') : null,
      h('h1', 'Mission report'), h('p', f.student.name + ' · Roster ID ' + f.student.rosterId + (f.student.period ? ' · Period ' + f.student.period : '') + (f.student.section ? ' · ' + f.student.section : '')),
      h('div.scorebox', h('div.big', r.pctDisplay + '%'), h('div', h('strong', CHM.pts(r.earned) + ' of ' + r.possible + ' points'), h('div.small', 'Earned grade = points earned ÷ total points × 100')),
        h('div.stats', h('span', h('strong', r.completed + ' of ' + r.units), ' questions completed'), h('span', h('strong', r.correct), ' answered correctly'), h('span', h('strong', r.firstTryCorrect), ' correct on the first attempt'), h('span', h('strong', r.attempts), ' attempts submitted in all'))),
      h('div.statusrow', chip('ok', '✓ Progress saved'), chip('ok', '✓ Finalized on server · ' + stamp(f.finalizedAt)), gbChip, retry),
      h('p.small', 'Receipt ID: ', h('strong.mono', f.receiptId), ' · Server time: ' + stamp(f.finalizedAt) + ' · Time from start: about ' + Math.round(f.elapsedMinutes) + ' min (guide only)'),
      h('div.row.noprint', h('button.btn', { type: 'button', onclick: function () { window.print(); } }, '🖨 Print receipt'), h('button.btn', { type: 'button', onclick: function () { CHM.download('receipt-' + f.receiptId + '.txt', receiptText(f)); } }, '⬇ Download receipt')));
    var mods = h('section.card', h('h2', 'Scores by location'), h('div.mbars', r.modules.map(function (m) {
      return h('div.mb', h('div.mbl', h('strong', m.id + '. ' + m.title), h('span', CHM.pts(m.earned) + ' / ' + m.possible + ' pts (' + (Math.round(m.pct * 10) / 10) + '%) · ' + m.completed + '/' + m.units + ' completed · ' + m.correct + ' correct')), h('div.mbt', { role: 'img', 'aria-label': Math.round(m.pct) + ' percent' }, h('div.mbf', { style: { width: m.pct + '%', background: CHM.content.modules[m.id - 1].colors.a } })));
    })));
    var feed = h('section.card', h('h2', 'Strengths and areas to review'), h('div.cols2', h('div', h('h3', 'Strengths'), r.strengths.length ? h('ul', r.strengths.map(function (x) { return h('li', x); })) : h('p', 'No location reached 85% yet. Review the explanations below.')), h('div', h('h3', 'Areas to review'), r.review.length ? h('ul', r.review.map(function (x) { return h('li', x); })) : h('p', 'Nice work. Nothing below 85%.'))));
    var attempts = h('details.card', h('summary', h('strong', 'Attempts summary by question')), h('table.dt', h('caption', 'Each question: completion, correctness, attempts and credit'), h('thead', h('tr', ['Question', 'Completed', 'Correct', 'Attempts', 'Credit'].map(function (x) { return h('th', { scope: 'col' }, x); }))),
      h('tbody', CHM.content.modules.reduce(function (a, m) { return a.concat(m.units.map(function (u) { var s = CHM.state.units[u.id]; return h('tr', h('th', { scope: 'row' }, u.id + ' ' + u.title), h('td', s.status !== 'open' ? 'Yes' : 'No'), h('td', s.status === 'correct' ? 'Yes (attempt ' + s.correctOn + ')' : s.status === 'exhausted' ? 'No' : '—'), h('td.n', s.attempts), h('td.n', CHM.pts(s.earned || 0) + ' / ' + u.points)); })); }, []))));
    var reviewHost = h('section.card', h('h2', 'Answers and explanations'), h('p.small', 'Loading…'));
    CHM.api('getReview', {}, { retries: 3 }).then(function (res) {
      CHM.clear(reviewHost); reviewHost.appendChild(h('h2', 'Answers and explanations'));
      if (!res.ok) { reviewHost.appendChild(h('p', res.message)); return; }
      CHM.content.modules.forEach(function (m) {
        reviewHost.appendChild(h('h3', m.id + '. ' + m.title));
        res.units.filter(function (u) { return u.module === m.id; }).forEach(function (u) {
          reviewHost.appendChild(h('details.rvd', h('summary', u.title + ' — ' + (u.status === 'correct' ? '✓ correct (attempt ' + u.correctOn + ')' : u.status === 'exhausted' ? '✕ not correct' : 'not finished') + ' · ' + CHM.pts(u.earned) + '/' + u.points),
            u.answer.map(function (a) { return h('div.ans', h('strong', 'Correct answer' + (a.label && a.label !== u.title ? ' (' + a.label + ')' : '') + ':'), h('pre.answer', a.text)); }), h('p', h('strong', 'Why: '), u.explanation)));
        });
      });
    });
    var plan = CHM.planProduct();
    var refs = h('section.card.refs-sec', h('h2', 'References and data notes'), h('p.small', 'Original classroom data and fictional scenarios are labeled as such in each task. Real published guidance used for reference panels:'),
      h('ul', CHM.content.references.map(function (x) { return h('li', h('strong', x.org + ': '), x.title, ' — ', h('span.mono', x.url), h('div.small', x.claim)); })),
      h('p.small', 'Fictional: Riverbend profile details, the picnic outbreak, the SparkUp post and all source cards, the district practice log, and all names of organizations other than those listed above. Original classroom data: the four-community health table.'));
    var done = h('div.row.noprint', h('button.btn', { type: 'button', onclick: function () { if (CHM.session.preview) CHM.go('teacher'); else CHM.signOut(); } }, CHM.session.preview ? 'Back to teacher panel' : 'Sign out'));
    mount(h('div.results', head, mods, feed, plan, attempts, reviewHost, refs, done), 'Mission report');
  };

  function receiptText(f) {
    var r = f.results, L = [];
    if (f.preview) L.push('*** TEACHER PREVIEW — NO STUDENT GRADE RECORDED ***');
    L.push('Community Health Mission: receipt', 'Student: ' + f.student.name, 'Roster ID: ' + f.student.rosterId, 'Class: ' + f.student.classCode + (f.student.section ? ' / ' + f.student.section : ''), 'Receipt ID: ' + f.receiptId,
      'Finalized on server: ' + f.finalizedAt, 'Gradebook status: ' + ({ recorded: 'recorded in teacher gradebook', pending: 'delivery pending', simulated: 'simulated (preview)' })[f.gradebook],
      'Assessment version: ' + f.version, '', 'Grade: ' + r.pctDisplay + '% (' + r.earned + ' of ' + r.possible + ' points)', 'Completed: ' + r.completed + ' of ' + r.units + ' · Correct: ' + r.correct + ' · First-attempt correct: ' + r.firstTryCorrect, '');
    r.modules.forEach(function (m) { L.push(m.id + '. ' + m.title + ': ' + CHM.pts(m.earned) + '/' + m.possible); });
    return L.join('\r\n');
  }

  // The student's own Community Health Action Plan, built from their last submitted selections.
  CHM.planProduct = function () {
    var m6 = CHM.content.modules[5], d = m6.explorer.data, U = CHM.state.units;
    var adv = U['M6-U2'] && U['M6-U2'].last && U['M6-U2'].last.plan, cm = U['M6-U4'] && U['M6-U4'].last && U['M6-U4'].last.plan, ev = U['M6-U5'] && U['M6-U5'].last && U['M6-U5'].last.ev;
    function o(ctls, k, v) { var c = ctls.filter(function (x) { return x.id === k; })[0]; return v && c ? CHM.optText(c.options, v) : 'Not completed'; }
    var rows = [['Problem', d.problem], ['Evidence', ev ? CHM.optText(d.evidence, ev) : 'Not completed'], ['Audience', o(d.advocacyControls, 'aud', adv && adv.aud)], ['Solution', o(d.advocacyControls, 'sol', adv && adv.sol)],
      ['Message', o(d.advocacyControls, 'msg', adv && adv.msg)], ['Action', 'Present the proposal and ask the decision-makers for a vote at their next meeting.'], ['Evaluation', o(d.advocacyControls, 'eval', adv && adv.eval)], ['Personal protection', o(d.advocacyControls, 'pers', adv && adv.pers)]];
    var cr = [['Fact and source', 'fact'], ['Healthier alternative', 'alt'], ['Visual', 'vis'], ['Call to action', 'cta'], ['Tone', 'tone']];
    return h('section.card.planprod', h('h2', 'Your Community Health Action Plan'), h('p.small', 'Built from your last submitted choices. A choice shown here may not be the best one; compare with the explanations below.'),
      h('dl.plan', rows.map(function (r) { return [h('dt', r[0]), h('dd', r[1])]; })), h('h3', 'Counter-message to the SparkUp post'), h('dl.plan', cr.map(function (r) { return [h('dt', r[0]), h('dd', o(d.counterControls, r[1], cm && cm[r[1]]))]; })),
      h('button.btn.sm.noprint', { type: 'button', onclick: function () { CHM.download('my-action-plan.txt', rows.map(function (r) { return r[0] + ': ' + r[1]; }).concat(['', 'Counter-message:']).concat(cr.map(function (r) { return r[0] + ': ' + o(d.counterControls, r[1], cm && cm[r[1]]); })).join('\r\n')); } }, '⬇ Download my plan'));
  };
})();
