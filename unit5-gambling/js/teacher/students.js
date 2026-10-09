// Student progress and the two kinds of reset.  "Reset Student Progress" is enforced by the server: it archives the old record
// into a protected audit tab, then restores 3 attempts on every question and a full 90 minutes (the clock starts again at Begin).
import { h, clear, fmt, toast, announce } from '../util.js';
import { tcall, confirmDialog, fmtTime, minLabel } from './tapi.js';

export async function build(host, ctx) {
  let block = 'all', selected = null;
  const blockSel = h('select', { class: 'input', 'aria-label': 'Class block' }, h('option', { value: 'all' }, 'All blocks'), ctx.blocks.map((b) => h('option', { value: b }, b)));
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Name or Student ID', 'aria-label': 'Search for a student' });
  const results = h('div', { 'aria-live': 'polite' }), detail = h('div', { class: 'panel', hidden: true, tabindex: -1, 'aria-label': 'Student details' });
  const form = h('form', { class: 'controls t-controls', onsubmit: (e) => { e.preventDefault(); find(); } }, h('label', { class: 'pv-f' }, h('span', null, 'Block'), blockSel), h('label', { class: 'pv-f grow' }, h('span', null, 'Search'), search), h('button', { class: 'btn btn-primary btn-sm', type: 'submit' }, 'Search'), h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { search.value = ''; find(); } }, 'List the block'));
  host.append(h('h2', null, 'Students and resets'), h('p', { class: 'muted' }, 'Choose a block, search for a student, check their progress, and reset them only if you need to. A reset keeps a permanent copy of the old record in the protected audit history.'), form, results, detail,
    h('div', { class: 'panel', style: 'margin-top:1.5rem' }, h('h3', null, 'Two different resets'), h('ul', null, h('li', null, h('strong', null, 'Reset Student Progress'), ' (this page): a real student starts over. Their old record is archived, their attempts are restored and they get a full 90 minutes.'), h('li', null, h('strong', null, 'Reset My Preview Progress'), ' (Preview toolbar): clears only your own teacher preview. It never touches a student.'))));
  blockSel.addEventListener('change', () => { block = blockSel.value; find(); });

  async function find() {
    clear(results); results.append(h('p', { class: 'muted' }, 'Searching…'));
    const q = search.value.trim();
    const r = q ? await tcall('findStudent', { query: q, block }) : await tcall('teacherOverview', { block });
    clear(results);
    if (!r.ok) { results.append(h('div', { class: 'notice bad', role: 'alert' }, r.message || 'Search failed.')); return; }
    const list = (q ? r.matches : r.rows).slice(0, 80);
    if (!list.length) { results.append(h('p', { class: 'muted' }, q ? 'No student matches that search in this block.' : 'No students have signed in for this block yet.')); return; }
    results.append(h('div', { class: 't-scroll' }, h('table', { class: 't-table' }, h('thead', null, h('tr', null, ['Student', 'Block', 'Status', 'Score', ''].map((x) => h('th', { scope: 'col' }, x)))),
      h('tbody', null, list.map((x) => h('tr', { class: selected === x.studentId ? 'sel' : '' }, h('th', { scope: 'row' }, `${x.last}, ${x.first}`, h('div', { class: 'small muted' }, 'ID ' + x.studentId)), h('td', null, x.block), h('td', null, x.statusLabel), h('td', { class: 'num' }, x.status === 'registered' ? '—' : fmt(x.pct, 1) + '%'), h('td', null, h('button', { class: 'btn btn-sm', type: 'button', onclick: () => open(x.studentId) }, 'View progress'))))))));
  }

  async function open(id) {
    selected = id; detail.hidden = false; clear(detail); detail.append(h('p', { class: 'muted' }, 'Loading…'));
    const r = await tcall('teacherStudent', { studentId: id });
    clear(detail);
    if (!r.ok) { detail.append(h('div', { class: 'notice bad', role: 'alert' }, r.message || 'Could not load the student.')); return; }
    const s = r.row;
    const actions = h('div', { class: 'controls', style: 'margin-top:1rem' });
    const resetBtn = h('button', { class: 'btn btn-danger', type: 'button', onclick: () => doReset(r) }, 'Reset Student Progress');
    actions.append(resetBtn);
    if (s.status === 'active') actions.append(h('button', { class: 'btn', type: 'button', onclick: () => doFinalize(r) }, 'Submit now for this student'));
    const mv = h('select', { class: 'input', style: 'max-width:180px', 'aria-label': 'Move to block' }, ctx.blocks.filter((b) => b !== s.block).map((b) => h('option', { value: b }, b)));
    actions.append(h('span', { class: 'row' }, mv, h('button', { class: 'btn', type: 'button', onclick: () => doMove(r, mv.value) }, 'Move to this block')));
    const chRows = Object.keys(r.chMs || {}).map((k) => [k, r.chMs[k]]);
    const byCh = {}; r.items.forEach((i) => { (byCh[i.ch] = byCh[i.ch] || []).push(i); });
    detail.append(
      h('h3', { id: 'sd-h' }, `${s.first} ${s.last}`, h('span', { class: 'small muted' }, `  ID ${s.studentId} · ${s.block}`)),
      h('div', { class: 'stat-grid' }, stat('Status', s.statusLabel), stat('Score', s.status === 'registered' ? '—' : `${fmt(s.earned, 1)} / ${s.possible}`, s.status === 'registered' ? '' : fmt(s.pct, 1) + '%'), stat('Questions finished', `${s.itemsDone} / ${s.itemsTotal}`), stat('Attempts used', s.attempts), stat('Time used', s.startedAt ? minLabel(s.timeUsedMin) : '—'), stat('Time left', s.remainingMin == null ? '—' : minLabel(s.remainingMin)), stat('Sign-ins', s.loginCount), stat('Resets so far', s.resetCount)),
      h('p', { class: 'small muted' }, s.startedAt ? `Started ${fmtTime(s.startedAt)} · deadline ${fmtTime(s.deadline)}${s.submittedAt ? ' · submitted ' + fmtTime(s.submittedAt) + ' (' + s.submissionType + ')' : ''}` : 'This student signed in but has not pressed Begin Assessment.'),
      actions, h('div', { id: 'sd-msg', 'aria-live': 'polite' }),
      h('h4', null, 'Progress by question'),
      h('div', { class: 't-scroll' }, h('table', { class: 't-table small' }, h('thead', null, h('tr', null, ['Chapter', 'Question', 'Status', 'Attempts', 'Credit'].map((x) => h('th', { scope: 'col' }, x)))),
        h('tbody', null, r.items.map((i) => h('tr', null, h('td', null, i.ch), h('th', { scope: 'row' }, i.title, h('div', { class: 'muted' }, i.id)), h('td', null, { open: i.attempts ? 'In progress' : 'Not started', correct: 'Correct', locked: 'Locked (0)' }[i.status] || i.status), h('td', { class: 'num' }, i.attempts + ' / 3'), h('td', { class: 'num' }, `${fmt(i.earned, 2)} / ${i.pts}`)))))),
      chRows.length ? [h('h4', null, 'Time in each chapter'), h('p', { class: 'small' }, chRows.map((x) => `Chapter ${x[0]}: ${fmt(x[1] / 60000, 1)} min`).join(' · '))] : null,
      r.resetLog && r.resetLog.length ? [h('h4', null, 'Reset history'), h('ul', { class: 'small' }, r.resetLog.map((x) => h('li', null, `${fmtTime(new Date(x.at).toISOString())}: ${x.reason} (was ${x.prevStatus}, ${x.prevPct == null ? '—' : fmt(x.prevPct, 1) + '%'})`)))] : null,
      r.archive && r.archive.length ? [h('h4', null, 'Archived earlier attempts (audit)'), h('ul', { class: 'small' }, r.archive.map((a) => h('li', null, `${fmtTime(a.archivedAt)} by ${a.by}: ${a.reason} — ${a.status}, ${a.pct == null ? '—' : fmt(a.pct, 1) + '%'}`)))] : null,
      h('details', null, h('summary', null, 'Recent activity log'), h('ul', { class: 'small' }, (r.events || []).map((e) => h('li', null, `${fmtTime(e.at).slice(11)} ${e.e}${e.d ? ': ' + e.d : ''}`)))));
    detail.focus({ preventScroll: false }); detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const stat = (k, v, s) => h('div', { class: 'stat' }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, String(v)), s ? h('div', { class: 's' }, s) : null);
  const say = (kind, t) => { const m = document.getElementById('sd-msg'); if (m) { clear(m); m.append(h('div', { class: 'notice ' + kind, role: 'status' }, t)); } };

  async function doReset(r) {
    const s = r.row, reason = h('input', { class: 'input', type: 'text', maxlength: 160, 'aria-label': 'Reason for the reset', placeholder: 'Reason (for example: browser crashed, wrong student ID)' });
    const ok = await confirmDialog({ title: 'Reset Student Progress?', danger: true, confirmLabel: 'Reset this student', needCheck: `I am resetting ${s.first} ${s.last} (ID ${s.studentId}) in ${s.block}.`,
      body: h('div', null, h('p', null, h('strong', null, `${s.first} ${s.last}`), ` · ${s.block} · ${s.statusLabel}` + (s.status === 'registered' ? '' : ` · ${fmt(s.pct, 1)}% · ${s.itemsDone} of ${s.itemsTotal} questions`)),
        h('ul', null, h('li', null, 'The current record is copied into the protected audit history before anything changes.'), h('li', null, 'Every question goes back to 3 fresh attempts. Answers and simulation work start over.'), h('li', null, 'The student gets a full 90 minutes. The clock starts again when they press Begin Assessment.'), h('li', null, 'The student must sign in again. Their other classmates are not affected.')),
        h('label', { class: 'field' }, h('span', null, 'Reason (saved in the audit history)'), reason)) });
    if (!ok) return;
    const res = await tcall('resetStudent', { studentId: s.studentId, confirm: true, reason: reason.value });
    if (!res.ok) { say('bad', res.message || 'The reset failed. Nothing was changed.'); return; }
    announce('Student reset.'); toast('Reset complete. The old record was archived.'); await open(s.studentId); say('good', `${s.first} ${s.last} was reset. The old record is in the audit history. They can sign in and begin again with a full 90 minutes.`); find();
  }
  async function doFinalize(r) {
    const s = r.row;
    const ok = await confirmDialog({ title: 'Submit for this student now?', confirmLabel: 'Submit now', body: h('p', null, `${s.first} ${s.last} will be graded on what they have finished (unanswered questions earn 0) and locked. This counts as “Submitted by Teacher”.`) });
    if (!ok) return; const res = await tcall('finalizeNow', { studentId: s.studentId });
    if (!res.ok) return say('bad', res.message || 'Could not submit.'); await open(s.studentId); say('good', 'Submitted by teacher.'); find();
  }
  async function doMove(r, to) {
    const s = r.row; if (!to) return;
    const ok = await confirmDialog({ title: 'Move to another block?', confirmLabel: 'Move student', body: h('p', null, `${s.first} ${s.last}: ${s.block} → ${to}. Students cannot change blocks themselves; this is recorded in their activity log.`) });
    if (!ok) return; const res = await tcall('moveBlock', { studentId: s.studentId, block: to });
    if (!res.ok) return say('bad', res.message || 'Could not move.'); await open(s.studentId); say('good', `Moved to ${to}.`); find();
  }
  if (ctx.args && ctx.args.id) { await open(ctx.args.id); }
  await find();
}
