// Teacher Mode inside the app: who is signed in, who is working, every submission and grade, what to reteach, resets and
// exports, so you never have to open the Google Sheet. Opened by typing the teacher code in the class-code box; the data is
// protected by the server's TEACHER_PASSCODE script property (Apps Script > Project Settings > Script properties).
// Also used by the hidden teacher/index.html page.
import { CONFIG } from './config.js';
import { send, hasBackend } from './transport.js';
import { h } from './util.js';

const TABS = [['overview', 'Overview'], ['students', 'Students and resets'], ['analytics', 'Analytics'], ['export', 'Export']];
const fmtT = (v) => { try { const d = new Date(v); return isNaN(d) ? '' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };
const cell = (v) => { const t = String(v ?? ''); return /^[=+\-@]/.test(t) ? "'" + t : t; };

export function mountTeacher({ main, toast, onExit, onPreview }) {
  let pass = '', data = null, tab = 'overview', block = 'ALL', find = '', order = 'name', auto = true, showDemo = false, timer = null, gone = false, pulled = null;
  try { pass = sessionStorage.getItem('sig.tpass') || ''; } catch (_) { /* no session storage */ }
  const say = toast || (() => {});
  const stop = () => { gone = true; clearInterval(timer); };
  const exit = () => { stop(); try { sessionStorage.removeItem('sig.tpass'); } catch (_) { /* ignore */ } if (onExit) onExit(); else location.reload(); };

  const bar = () => h('div.tm-bar', h('div', h('b', 'Teacher Mode'), ' · ' + CONFIG.appName + ' · signed in'),
    h('div.row', onPreview ? h('button.btn.small', { type: 'button', onclick: onPreview }, 'Open student preview') : '', h('button.btn.small', { type: 'button', onclick: exit }, 'Sign out')));

  function login(msg) {
    clearInterval(timer);
    const inp = h('input.input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Teacher passcode', placeholder: 'Teacher passcode' });
    const f = h('form.panel', { onsubmit: async (e) => { e.preventDefault(); pass = inp.value; await load(); } }, h('h2', 'Teacher Mode'),
      hasBackend() ? h('p.muted', 'Enter your teacher passcode (the TEACHER_PASSCODE you set in Apps Script).') : h('p.err', 'No backend is configured in js/config.js, so there is no data to show.'),
      h('div.field', inp), h('div.err', { role: 'alert' }, msg || ''),
      h('div.row', h('button.btn.primary', { type: 'submit' }, 'Open Teacher Mode'), onPreview ? h('button.btn', { type: 'button', onclick: onPreview }, 'Preview the assessment') : '', onExit ? h('button.btn', { type: 'button', onclick: exit }, 'Back') : ''));
    main.replaceChildren(h('section.screen.narrow', f)); inp.focus();
  }

  async function load(quiet) {
    if (gone) return;
    if (!quiet) main.replaceChildren(h('section.screen', h('p', 'Loading…')));
    const r = await send('t_dashboard', { pass });
    if (gone) return;
    if (!r || !r.ok) {
      if (quiet && r && r.error !== 'bad-passcode') return; // keep the current screen on a hiccup
      try { sessionStorage.removeItem('sig.tpass'); } catch (_) { /* ignore */ }
      return login(r && r.error === 'bad-passcode' ? 'That passcode is not correct.' : r && r.error === 'locked-out' ? 'Too many wrong tries. Wait ten minutes.' : 'Could not load data (' + (r && r.error || 'network') + ').');
    }
    try { sessionStorage.setItem('sig.tpass', pass); } catch (_) { /* ignore */ }
    data = r; pulled = new Date(); render(); schedule();
  }
  function schedule() { clearInterval(timer); if (auto) timer = setInterval(() => { if (!document.hidden && !gone) load(true); }, 30000); }

  // ------------------------------------------------------------------ data helpers
  const live = () => data.students.filter((s) => s.status !== 'reset' && (showDemo || s.mode !== 'DEMO'));
  const inBlock = (s) => block === 'ALL' || String(s.period) === block;
  const matches = (s) => !find || String(s.name).toLowerCase().includes(find.toLowerCase());
  const done = (s) => s.status === 'completed';
  const sorters = {
    name: (a, b) => String(a.name).localeCompare(String(b.name)),
    high: (a, b) => (Number(b.pct) || -1) - (Number(a.pct) || -1), low: (a, b) => (Number(a.pct) ?? 999) - (Number(b.pct) ?? 999) || String(a.name).localeCompare(String(b.name)),
    newest: (a, b) => new Date(b.started) - new Date(a.started),
  };
  const avgOf = (rows) => { const v = rows.filter(done).map((s) => Number(s.pct)).filter((x) => !isNaN(x)); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null; };
  const blocks = () => { const set = new Set(CONFIG.periods || []); data.students.forEach((s) => s.period && set.add(String(s.period))); return [...set]; };
  const limit = CONFIG.timeLimitMinutes || 0;
  const elapsed = (s) => { const t = new Date(s.started).getTime(); return isNaN(t) ? null : Math.max(0, Math.round((Date.now() - t) / 60000)); };
  const statusChip = (s) => done(s) ? h('span.pill', 'Submitted') : (() => { const m = elapsed(s); const late = limit && m != null && m >= limit - 15; return h('span.pill' + (late ? '.demo' : ''), 'Working' + (m != null ? ' · ' + m + ' min' + (limit ? ' of ' + limit : '') : '')); })();

  // ------------------------------------------------------------------ screens
  const tile = (label, val, note) => h('div.tm-tile', h('div.tm-label', label), h('div.tm-big', String(val)), note ? h('div.tm-note', note) : '');

  function controls() {
    return h('div.tm-controls',
      h('label.tm-field', 'Block', h('select.input', { onchange: (e) => { block = e.target.value; render(); } }, h('option', { value: 'ALL' }, 'All blocks'), blocks().map((b) => h('option', { value: b, selected: b === block }, b)))),
      h('label.tm-field.grow', 'Find', h('input.input#tm-find', { type: 'search', placeholder: 'Search name', value: find, oninput: (e) => { find = e.target.value; renderBody(); } })),
      h('label.tm-field', 'Order', h('select.input', { onchange: (e) => { order = e.target.value; render(); } }, [['name', 'Sort: name'], ['high', 'Sort: score, high first'], ['low', 'Sort: score, low first'], ['newest', 'Sort: newest first']].map(([v, t]) => h('option', { value: v, selected: v === order }, t)))),
      h('button.btn.small.primary', { type: 'button', onclick: () => load() }, 'Refresh now'),
      h('button.btn.small', { type: 'button', 'aria-pressed': String(auto), onclick: () => { auto = !auto; schedule(); render(); } }, 'Auto-refresh ' + (auto ? 'on' : 'off')),
      h('label.tm-check', h('input', { type: 'checkbox', checked: showDemo, onchange: (e) => { showDemo = e.target.checked; render(); } }), 'Show DEMO'),
      h('span.tm-updated', 'Updated ' + pulled.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })));
  }

  function overview() {
    const all = live(), rows = all.filter(inBlock), shown = rows.filter(matches).sort(sorters[order]);
    const sub = rows.filter(done), working = rows.filter((s) => !done(s)), avg = avgOf(rows);
    const glance = blocks().map((b) => {
      const r = all.filter((s) => String(s.period) === b), d = r.filter(done).length, w = r.length - d;
      return h('div.tm-block', h('b', b), h('div.tm-track', r.length ? [h('i.tm-done', { style: { width: d / r.length * 100 + '%' } }), h('i.tm-work', { style: { width: w / r.length * 100 + '%' } })] : h('span', 'No students yet')),
        h('span.tm-count', r.length + ' registered' + (r.length ? ' · ' + d + ' submitted' : '')));
    });
    return [h('h1', 'Class overview'), h('div.tm-tiles', tile('Registered', rows.length), tile('In progress', working.length), tile('Submitted', sub.length), tile('Class average', avg != null ? avg + '%' : '—', sub.length ? '' : 'no one has finished yet')),
      h('h2.tm-h2', 'Blocks at a glance'), h('div.tm-glance', glance),
      h('div.panel', { style: { marginTop: '1rem', overflowX: 'auto' } }, h('table.data', h('caption', `${shown.length} of ${rows.length} students`),
        h('thead', h('tr', ['Student', 'Block', 'Status', 'Score'].map((x) => h('th', x)))),
        h('tbody', shown.length ? shown.map((s) => h('tr', h('td', s.name, s.mode === 'DEMO' ? h('span.pill.demo', 'DEMO') : ''), h('td', s.period), h('td', statusChip(s)), h('td', done(s) ? `${s.score}/${s.possible} (${s.pct}%)` : '—'))) : [h('tr', h('td', { colspan: 4 }, 'No students yet.'))])))];
  }

  function students() {
    const rows = live().filter(inBlock).filter(matches).sort(sorters[order]);
    return [h('h1', 'Students and resets'), h('div.panel', { style: { overflowX: 'auto' } }, h('table.data', h('caption', `${rows.length} students · Reset lets a student start over (the old row is kept and marked as superseded).`),
      h('thead', h('tr', ['Student', 'Block', 'Class code', 'Status', 'Score', '%', 'Minutes', 'Attempts used', 'Version', 'Integrity', ''].map((x) => h('th', x)))),
      h('tbody', rows.length ? rows.map((s) => h('tr', h('td', s.name, s.mode === 'DEMO' ? h('span.pill.demo', 'DEMO') : ''), h('td', s.period), h('td', s.code), h('td', statusChip(s)),
        h('td', s.score != null ? `${s.score}/${s.possible}` : '—'), h('td', s.pct != null ? s.pct + '%' : '—'), h('td', s.minutes ?? '—'), h('td', s.attemptsServer || '—'), h('td', s.versionId), h('td', s.integrity || ''),
        h('td', h('button.btn.small.warn', { type: 'button', onclick: () => resetStudent(s) }, 'Reset')))) : [h('tr', h('td', { colspan: 11 }, 'No students yet.'))])))];
  }

  function analytics() {
    const rows = live().filter(inBlock).filter(done);
    const dom = data.domainOrder.map((d, i) => { const vals = rows.map((s) => s.domains && s.domains[i]).filter((v) => v !== '' && v != null).map(Number); const a = vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : 0; return h('div.brow', h('span', data.domainNames[d]), h('div.btrack', h('div.bfill', { style: { width: a + '%' } })), h('span.bpct', vals.length ? a + '%' : '—')); });
    const qs = data.questions.slice().sort((a, b) => a.firstPct - b.firstPct).slice(0, 20);
    return [h('h1', 'Analytics'), h('div.grid2', h('div.panel', h('h3', 'Average by content domain'), h('div.bars', dom)),
      h('div.panel', { style: { overflowX: 'auto' } }, h('table.data', h('caption', 'Class averages (LIVE)'), h('thead', h('tr', h('th', 'Class'), h('th', 'Students'), h('th', 'Average %'))), h('tbody', data.classes.map((c) => h('tr', h('td', c.code), h('td', c.n), h('td', c.avg + '%'))))))),
      h('div.panel', { style: { marginTop: '1rem', overflowX: 'auto' } }, h('table.data', h('caption', 'What to reteach: most-missed questions (hardest first; LIVE submissions only)'), h('thead', h('tr', ['Question', 'Concept', 'Students', '% first try', '% eventually correct', '% missed', 'Avg attempts'].map((x) => h('th', x)))),
        h('tbody', qs.map((q) => h('tr', h('td', q.qid), h('td', q.topic), h('td', q.n), h('td', q.firstPct + '%'), h('td', q.correctPct + '%'), h('td', q.missedPct + '%'), h('td', q.avgAttempts))))))];
  }

  function exportTab() {
    return [h('h1', 'Export'), h('div.panel', h('p', 'Download every student shown for the chosen block as a spreadsheet file, or rebuild the Analytics tab in your Google Sheet.'),
      h('div.row', h('button.btn.primary', { type: 'button', onclick: csv }, 'Download CSV'),
        h('button.btn', { type: 'button', onclick: async () => { const r = await send('t_analytics', { pass }); say(r && r.ok ? 'Analytics tab rebuilt.' : 'Could not rebuild.'); } }, 'Rebuild Analytics tab in the Sheet')))];
  }

  const views = { overview, students, analytics, export: exportTab };
  function renderBody() { const host = document.getElementById('tm-body'); if (host) host.replaceChildren(...views[tab]()); }
  function render() {
    const keepFind = document.activeElement && document.activeElement.id === 'tm-find';
    main.replaceChildren(h('section.screen.tm', bar(),
      h('nav.tm-tabs', { 'aria-label': 'Teacher sections' }, TABS.map(([id, label]) => h('button.tm-tab', { type: 'button', 'aria-current': id === tab ? 'page' : null, onclick: () => { tab = id; render(); } }, label))),
      controls(), h('div#tm-body', ...views[tab]())));
    if (keepFind) { const f = document.getElementById('tm-find'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }
  }

  async function resetStudent(s) {
    if (!confirm(`Reset ${s.name} (${s.code})? They will be able to start a fresh attempt.`)) return;
    const r = await send('t_reset', { pass, sid: s.sid }); say(r && r.ok ? 'Reset. The student can sign in again.' : 'Could not reset (' + (r && r.error) + ').'); load();
  }

  function csv() {
    const list = live().filter(inBlock).sort(sorters.name);
    const rows = [['Student', 'Block', 'Class code', 'Status', 'Score', 'Possible', 'Percent', 'Minutes', 'Version', 'Mode', 'Integrity'], ...list.map((s) => [s.name, s.period, s.code, s.status, s.score, s.possible, s.pct, s.minutes, s.versionId, s.mode, s.integrity])];
    const text = rows.map((r) => r.map((c) => '"' + cell(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/csv' })), download: 'signal-results.csv' }); document.body.append(a); a.click(); a.remove();
  }

  if (pass) load(); else login();
  return { stop };
}
