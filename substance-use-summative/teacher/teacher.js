// Teacher dashboard (static page; talks to your Apps Script web app with the TEACHER_PASSCODE script property).
// This page is intentionally not linked from the student screens. Bookmark its URL.
import { CONFIG } from '../js/config.js';
import { send, hasBackend } from '../js/transport.js';
import { h } from '../js/util.js';

const main = document.getElementById('main');
let pass = sessionStorage.getItem('sig.tpass') || '', data = null, filter = 'ALL', showDemo = false;
const toast = (m) => { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); };

function login(msg) {
  const inp = h('input.input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Teacher passcode', placeholder: 'Teacher passcode' });
  const f = h('form.panel', { onsubmit: async (e) => { e.preventDefault(); pass = inp.value; await load(); } }, h('h2', 'Teacher dashboard'),
    hasBackend() ? h('p.muted', 'Enter the TEACHER_PASSCODE you set in Apps Script (Project Settings > Script properties).') : h('p.err', 'No backend is configured in js/config.js, so there is no data to show.'),
    h('div.field', inp), h('div.err', msg || ''), h('button.btn.primary', { type: 'submit' }, 'Open dashboard'));
  main.replaceChildren(h('section.screen.narrow', h('div.kicker', 'SIGNAL'), f)); inp.focus();
}
async function load() {
  main.replaceChildren(h('section.screen', h('p', 'Loading…')));
  const r = await send('t_dashboard', { pass });
  if (!r || !r.ok) { sessionStorage.removeItem('sig.tpass'); return login(r && r.error === 'bad-passcode' ? 'That passcode is not correct.' : r && r.error === 'locked-out' ? 'Too many wrong tries. Wait ten minutes.' : 'Could not load data (' + (r && r.error || 'network') + ').'); }
  sessionStorage.setItem('sig.tpass', pass); data = r; render();
}
const fmtT = (v) => { try { return new Date(v).toLocaleString(); } catch { return ''; } };
function render() {
  const rows = data.students.filter((s) => (showDemo || s.mode !== 'DEMO') && (filter === 'ALL' || s.code === filter));
  const codes = [...new Set(data.students.map((s) => s.code))].sort();
  const done = rows.filter((s) => s.status === 'completed');
  const avg = done.length ? Math.round(done.reduce((a, s) => a + (+s.pct || 0), 0) / done.length * 10) / 10 : null;
  const sel = h('select.input', { 'aria-label': 'Filter by class code', style: { maxWidth: '220px' }, onchange: (e) => { filter = e.target.value; render(); } }, h('option', { value: 'ALL' }, 'All classes'), codes.map((c) => h('option', { value: c, selected: c === filter }, c)));
  const tog = h('label.row', h('input', { type: 'checkbox', checked: showDemo, onchange: (e) => { showDemo = e.target.checked; render(); } }), 'Show DEMO rows');
  const stu = h('table.data', h('caption', `${rows.length} sessions • ${done.length} completed${avg != null ? ' • average ' + avg + '%' : ''}`),
    h('thead', h('tr', ['Student', 'Class', 'Period', 'Status', 'Score', '%', 'Minutes', 'Attempts used', 'Version', 'Integrity', ''].map((x) => h('th', x)))),
    h('tbody', rows.map((s) => h('tr', h('td', s.name, s.mode === 'DEMO' ? h('span.pill.demo', 'DEMO') : ''), h('td', s.code), h('td', s.period),
      h('td', s.status), h('td', s.score != null ? `${s.score}/${s.possible}` : '—'), h('td', s.pct != null ? s.pct + '%' : '—'), h('td', s.minutes ?? '—'), h('td', s.attemptsServer || '—'), h('td', s.versionId), h('td', s.integrity || ''),
      h('td', s.status !== 'reset' ? h('button.btn.small.warn', { type: 'button', onclick: () => resetStudent(s) }, 'Reset') : h('span.small.muted', 'reset'))))));
  const dom = data.domainOrder.map((d, i) => { const vals = done.map((s) => s.domains && s.domains[i]).filter((v) => v !== '' && v != null).map(Number); const a = vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : 0; return h('div.brow', h('span', data.domainNames[d]), h('div.btrack', h('div.bfill', { style: { width: a + '%' } })), h('span.bpct', vals.length ? a + '%' : '—')); });
  const qs = data.questions.slice().sort((a, b) => a.firstPct - b.firstPct).slice(0, 20);
  const qt = h('table.data', h('caption', 'Most-missed questions (hardest first; LIVE submissions only)'), h('thead', h('tr', ['Question', 'Concept', 'Students', '% first try', '% eventually correct', '% missed', 'Avg attempts'].map((x) => h('th', x)))),
    h('tbody', qs.map((q) => h('tr', h('td', q.qid), h('td', q.topic), h('td', q.n), h('td', q.firstPct + '%'), h('td', q.correctPct + '%'), h('td', q.missedPct + '%'), h('td', q.avgAttempts)))));
  const cls = h('table.data', h('caption', 'Class averages (LIVE)'), h('thead', h('tr', h('th', 'Class'), h('th', 'Students'), h('th', 'Average %'))), h('tbody', data.classes.map((c) => h('tr', h('td', c.code), h('td', c.n), h('td', c.avg + '%')))));
  main.replaceChildren(h('section.screen', h('div.row.spread', h('div', h('div.kicker', 'SIGNAL'), h('h1', { style: { fontSize: '2rem' } }, 'Teacher dashboard')),
    h('div.row', sel, tog, h('button.btn.small', { type: 'button', onclick: load }, 'Refresh'), h('button.btn.small', { type: 'button', onclick: csv }, 'Download CSV'), h('button.btn.small', { type: 'button', onclick: async () => { const r = await send('t_analytics', { pass }); toast(r && r.ok ? 'Analytics tab rebuilt.' : 'Could not rebuild.'); } }, 'Rebuild Analytics tab'))),
    h('div.panel', { style: { overflowX: 'auto' } }, stu), h('div.grid2', { style: { marginTop: '1rem' } }, h('div.panel', h('h3', 'Average by content domain'), h('div.bars', dom)), h('div.panel', { style: { overflowX: 'auto' } }, cls)),
    h('div.panel', { style: { marginTop: '1rem', overflowX: 'auto' } }, qt),
    h('p.small.muted', 'Reset lets a student start over (the old row is kept and marked as superseded). Student pages never link here.')));
}
async function resetStudent(s) {
  if (!confirm(`Reset ${s.name} (${s.code})? They will be able to start a fresh attempt.`)) return;
  const r = await send('t_reset', { pass, sid: s.sid }); toast(r && r.ok ? 'Reset. The student can sign in again.' : 'Could not reset (' + (r && r.error) + ').'); load();
}
function csv() {
  const rows = [['Student', 'Class', 'Period', 'Status', 'Score', 'Possible', 'Percent', 'Minutes', 'Version', 'Mode', 'Integrity'], ...data.students.map((s) => [s.name, s.code, s.period, s.status, s.score, s.possible, s.pct, s.minutes, s.versionId, s.mode, s.integrity])];
  const text = rows.map((r) => r.map((c) => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/csv' })), download: 'signal-results.csv' }); document.body.append(a); a.click(); a.remove();
}
if (pass) load(); else login();
