// Teacher Analytics Dashboard. Not linked from any student screen. Data comes from your Google Sheet (passcode protected on the
// server), or, with no sheet connected, from an offline sandbox of generated DEMO DATA so you can explore every view.
import { CONFIG } from '../js/config.js';
import { send, hasBackend } from '../js/transport.js';
import { h, sha256, fmtDur } from '../js/util.js';
import { DOMAIN_NAME } from '../js/scoring.js';
import { chartEl } from '../js/charts.js';
import { solve, describe } from '../js/solve.js';
import { subst } from '../js/engine.js';
import * as A from '../js/analytics.js';
import { sandboxData } from '../js/demo.js';

const content = await import(CONFIG.gradingMode === 'server' ? '../content/public.server.js' : '../content/public.js').then((m) => m.default).catch(() => import('../content/public.server.js').then((m) => m.default));
const main = document.getElementById('main'), dlg = document.getElementById('dlg');
const state = { data: null, pass: sessionStorage.getItem('u7.tpass') || '', view: A.ALL, showDemo: null, sort: { key: 'last', dir: 'asc' }, itemSort: { key: 'firstPct', dir: 'asc' }, open: null, sandbox: !hasBackend(), sandboxOn: true };
const toast = (m) => { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3200); };
const BLOCK_COLORS = ['#6ea8ff', '#7ad7a0', '#f2c14e', '#c79bff', '#ff9d7a'];
const pub = {}; (function walk(stages) { for (const s of stages) { if (s.kind === 'pool') s.groups.forEach((g) => walk(g.items)); else if (s.kind === 'q') pub[s.q.id] = s.q; else if (s.kind === 'scene') s.qs.forEach((q) => { pub[q.id] = q; }); } })(content.missions.flatMap((m) => m.stages));
const NAMES = ['Jordan', 'Riley', 'Sam'];

// ------------------------------------------------------------------------------------------------ login + loading
function login(msg) {
  const inp = h('input.input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Teacher passcode', placeholder: 'Teacher passcode' });
  const f = h('form.panel', { onsubmit: async (e) => { e.preventDefault(); state.pass = inp.value; await load(); } }, h('h2', 'Teacher analytics'),
    hasBackend() ? h('p.muted', 'Enter the teacher dashboard passcode for your Google Sheet. (It was shown when you ran setupGradebook(); change it in the sheet\'s "Unit 7 Gradebook" menu.)')
      : h('p.muted', 'No Google Sheet is connected in js/config.js, so this is the offline sandbox with generated DEMO DATA. Enter the offline dashboard passcode.'),
    h('div.field', inp), h('div.err', { role: 'alert' }, msg || ''), h('button.btn.primary', { type: 'submit' }, 'Open dashboard'));
  main.replaceChildren(h('section.screen.narrow', h('div.kicker', 'Unit 7 • Teacher only'), f)); inp.focus();
}
async function load(keepView) {
  if (!hasBackend()) {
    if (sha256(CONFIG.hashSalt + '|dash|' + state.pass) !== CONFIG.teacherPasscodeHash) return login(state.pass ? 'That passcode is not correct.' : '');
    sessionStorage.setItem('u7.tpass', state.pass); state.sandbox = true;
    state.data = sandboxData(content, { blocks: CONFIG.blocks, domainOrder: Object.keys(DOMAIN_NAME), domainNames: DOMAIN_NAME, options: { strongAt: CONFIG.scoring.strongAt, developingAt: CONFIG.scoring.developingAt, includeDemo: false } });
    if (!state.sandboxOn) state.data.students = [], state.data.items = [];
  } else {
    main.replaceChildren(h('section.screen', h('p', 'Loading from your Google Sheet…')));
    const r = await send('t_data', { pass: state.pass });
    if (!r || !r.ok) { sessionStorage.removeItem('u7.tpass'); return login(r && r.error === 'bad-passcode' ? 'That passcode is not correct.' : r && r.error === 'locked-out' ? 'Too many wrong tries. Wait ten minutes.' : 'Could not load data (' + (r && r.error || 'network') + ').'); }
    sessionStorage.setItem('u7.tpass', state.pass); state.data = r; state.sandbox = false;
  }
  if (state.showDemo === null) state.showDemo = !state.data.students.some((s) => s.type === 'LIVE');
  if (!keepView) state.view = A.ALL;
  render();
}

// ------------------------------------------------------------------------------------------------ helpers
const opts = () => ({ strongAt: state.data.options.strongAt, developingAt: state.data.options.developingAt, showDemo: state.showDemo });
const rows = () => A.counted(state.data, { block: state.view, showDemo: state.showDemo });
const fmt = (v, s = '') => (v == null ? '—' : v + s);
const tone = (p) => (p == null ? '' : p >= state.data.options.strongAt ? 'good' : p >= state.data.options.developingAt ? 'mid' : 'low');
function download(name, text) { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })), download: name }); document.body.append(a); a.click(); a.remove(); }
const safe = (s) => String(s).replace(/[^\w-]+/g, '-');
function qPrompt(id) { const q = pub[id]; return q ? subst(q.prompt, NAMES) : id; }
function chartDef(title, groups, o = {}) { return { title, unit: o.unit ?? '%', yMax: o.yMax ?? 100, decimals: 1, desc: title + '. ' + groups.map((g) => g.label + ': ' + g.bars.map((b) => `${b.label} ${b.value ?? 'no data'}`).join(', ')).join('; '), groups, yLabel: o.yLabel || 'Percent', src: [], note: o.note || '' }; }

// ------------------------------------------------------------------------------------------------ render
function render() {
  const d = state.data, R = rows(), S = A.summary(R, opts()), live = d.students.filter((s) => s.type === 'LIVE').length, demo = d.students.filter((s) => s.type === 'DEMO DATA').length;
  const viewSel = h('select.input', { 'aria-label': 'View', onchange: (e) => { state.view = e.target.value; state.open = null; render(); } }, [A.ALL, ...d.blocks].map((b) => h('option', { value: b, selected: b === state.view }, b)));
  const demoTog = h('label.row.small', h('input', { type: 'checkbox', checked: state.showDemo, onchange: (e) => { state.showDemo = e.target.checked; render(); } }), 'Include DEMO DATA in these numbers');
  const stats = A.itemStats(d, R.map((s) => s.sid));
  const nav = h('nav.tnav', { 'aria-label': 'Dashboard sections' }, [['sum', 'Overview'], ['dom', 'Domain mastery'], ['items', 'Question analysis'], ['reteach', 'What should I reteach?'], ['cmp', 'Compare blocks'], ['stu', 'Students'], ['flags', 'Flags'], ['exp', 'Export'], ['demo', 'Demo data']].map(([id, t]) => h('a', { href: '#' + id }, t)));
  main.replaceChildren(h('section.screen.dash',
    h('div.row.spread', h('div', h('div.kicker', 'Unit 7 • Teacher analytics'), h('h1', { style: { fontSize: '2rem' } }, 'Class results')), h('div.row', h('label.row', h('strong', 'View:'), viewSel), demoTog, h('button.btn.small', { type: 'button', onclick: () => load(true) }, 'Refresh'))),
    state.sandbox ? h('div.banner.demo', h('b', 'OFFLINE SANDBOX. '), 'No Google Sheet is connected, so everything here is generated DEMO DATA for exploring the dashboard. Connect your sheet (see README) to see real results.') : '',
    state.showDemo && demo ? h('div.banner.demo', h('b', 'DEMO DATA INCLUDED. '), `${demo} fictional records are mixed into these numbers. Uncheck "Include DEMO DATA" to see real students only.`) : '',
    live === 0 && !state.showDemo ? h('div.banner', 'No real submissions yet. Turn on "Include DEMO DATA" or use the Demo data section to preview the dashboard.') : '',
    nav, sectionSummary(S, R), sectionDomains(R), sectionItems(stats), sectionReteach(stats), sectionCompare(), sectionStudents(R), sectionFlags(), sectionExport(R), sectionDemo(demo)));
}
const sec = (id, title, ...kids) => h('section.dsec', { id }, h('h2', title), ...kids);

function sectionSummary(S, R) {
  const card = (label, value, sub, cls = '') => h('div.card' + (cls ? '.' + cls : ''), h('div.cl', label), h('div.cv', value), sub ? h('div.cs', sub) : '');
  return sec('sum', `Overview: ${state.view}`, h('div.cards',
    card('Students submitted', S.n), card('Class average', fmt(S.avg, '%'), '', tone(S.avg)), card('Median score', fmt(S.median, '%')), card('Highest score', fmt(S.max, '%')), card('Lowest score', fmt(S.min, '%')),
    card('Average completion time', S.avgMin == null ? '—' : fmt(Math.round(S.avgMin), ' min')),
    card('Demonstrating mastery', S.n ? `${S.mastery} (${S.masteryPct}%)` : '—', `${state.data.options.strongAt}% or higher`, 'good'), card('Needing additional support', S.n ? `${S.support} (${S.supportPct}%)` : '—', `below ${state.data.options.developingAt}%`, S.support ? 'low' : '')));
}
function sectionDomains(R) {
  const d = state.data, means = A.domainMeans(R, d.domainOrder);
  const def = chartDef(`Average by content domain: ${state.view}`, d.domainOrder.map((k, i) => ({ label: d.domainNames[k], bars: [{ label: 'Average', value: means[i] ?? 0, color: means[i] == null ? '#555' : means[i] >= d.options.strongAt ? '#5bd08a' : means[i] >= d.options.developingAt ? '#f2c14e' : '#ff7a6b' }] })), { yLabel: 'Average percent correct', note: `Bars: green = ${d.options.strongAt}% or higher, amber = ${d.options.developingAt}% to ${d.options.strongAt - 1}%, red = below ${d.options.developingAt}%. Calculated from submitted results.` });
  return sec('dom', 'Content-domain mastery', R.length ? chartEl(def) : h('p.muted', 'No submissions in this view yet.'),
    h('div.mini', d.domainOrder.map((k, i) => h('div.chipstat', h('span', d.domainNames[k]), h('b.' + tone(means[i]), fmt(means[i], '%'))))));
}

function sectionItems(stats) {
  const d = state.data, mm = A.mostMissed(stats, 8), sorted = A.sortItems(stats, state.itemSort.key, state.itemSort.dir);
  const th = (key, label) => h('th', h('button.sortbtn', { type: 'button', 'aria-label': `Sort by ${label}`, onclick: () => { state.itemSort = { key, dir: state.itemSort.key === key && state.itemSort.dir === 'asc' ? 'desc' : 'asc' }; render(); } }, label, state.itemSort.key === key ? (state.itemSort.dir === 'asc' ? ' ▲' : ' ▼') : ''));
  const table = h('table.data.itemtable', h('caption', 'Every scored question (variants of a question are combined). Click a row for details.'), h('thead', h('tr', th('slot', 'Question'), th('domain', 'Domain'), th('conceptName', 'Concept'), th('n', 'Students'), th('firstPct', '1st attempt'), th('eventualPct', 'Eventually correct'), th('zeroPct', 'Zero credit'), th('avgPts', 'Avg points'), th('avgAttempts', 'Avg attempts'))),
    h('tbody', sorted.map((s) => h('tr', { tabindex: 0, class: state.open === s.slot ? 'open' : '', onclick: () => { state.open = state.open === s.slot ? null : s.slot; render(); document.getElementById('detail')?.scrollIntoView({ block: 'nearest' }); }, onkeydown: (e) => { if (e.key === 'Enter') e.currentTarget.click(); } },
      h('td', h('b', s.slot)), h('td', d.domainNames[s.domain]), h('td', s.conceptName), h('td', s.n), h('td.' + tone(s.firstPct), s.firstPct + '%'), h('td', s.eventualPct + '%'), h('td', s.zeroPct + '%'), h('td', fmt(s.avgPts, '%')), h('td', s.avgAttempts)))));
  const detail = state.open ? itemDetail(stats.find((s) => s.slot === state.open)) : '';
  return sec('items', 'Question-level item analysis', stats.length ? [
    h('div.panel.flat', h('h3', 'MOST MISSED QUESTIONS'), h('ol.missed', mm.map((s) => h('li', h('button.linkish', { type: 'button', onclick: () => { state.open = s.slot; render(); document.getElementById('detail')?.scrollIntoView({ block: 'center' }); } }, h('b', s.slot), ' ', s.conceptName), h('span', ` ${s.firstPct}% correct on the first attempt • ${s.zeroPct}% earned zero • ${d.domainNames[s.domain]}`))))),
    h('div.tablewrap', table), detail] : h('p.muted', 'No question data in this view yet.'));
}
function itemDetail(s) {
  if (!s) return '';
  const d = state.data;
  const ids = Object.keys(s.ids).sort();
  return h('div.panel#detail', h('h3', `${s.slot}: ${s.conceptName}`), h('p.small.muted', `${d.domainNames[s.domain]} • concept: ${s.conceptName} • skill: ${s.skill} • difficulty ${s.difficulty} of 3 • ${s.qt} (${s.type})`),
    h('div.cards.small', [['Students attempting', s.n], ['First-attempt success', s.firstPct + '%'], ['Eventual success', s.eventualPct + '%'], ['Zero credit', s.zeroPct + '%'], ['Avg points earned', fmt(s.avgPts, '%')], ['Avg attempts', s.avgAttempts]].map(([l, v]) => h('div.card', h('div.cl', l), h('div.cv', v)))),
    ids.map((id) => {
      const q = pub[id], right = q && q.h ? solve(q, content.salt).map((c) => describe(q, c.c)) : (d.meta[id] && d.meta[id].a ? [d.meta[id].a] : []);
      const wrong = Object.entries(s.wrong[id] || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
      return h('div.variant', h('h4', ids.length > 1 ? `Version ${id} (${s.ids[id]} students)` : 'Question'), h('p', qPrompt(id)),
        h('p', h('b', 'Correct answer: '), right.length ? right.join('  OR  ') : '(not available)'),
        wrong.length ? h('div', h('b', 'Common incorrect responses'), h('ul', wrong.map(([c, n]) => h('li', `${q ? describe(q, c) : c} `, h('span.muted', `(${n})`))))) : h('p.muted', 'No incorrect responses recorded.'));
    }));
}

function sectionReteach(stats) {
  const list = A.reteach(stats, content.concepts, { scope: state.view });
  return sec('reteach', 'WHAT SHOULD I RETEACH?', h('p.muted', 'The 3 to 5 concepts with the weakest performance in this view, generated by rules from question metadata and student results (no AI).'),
    list.length ? h('ol.reteach', list.map((r) => h('li.panel.flat', h('div.row.spread', h('h3', `Priority ${r.priority}: ${r.name}`), h('span.mastery.' + (r.pct >= state.data.options.strongAt ? 'strong' : r.pct >= state.data.options.developingAt ? 'developing' : 'review'), `${r.pct}%`)),
      h('p', h('b', `${r.scope} average: ${r.pct}%. `), `Students particularly struggled with ${r.struggle || 'this concept'}.`), h('p.small', h('b', 'Suggested reteach: '), r.tip), h('p.small.muted', `${state.data.domainNames[r.domain]} • ${r.responses} responses • weakest: ${r.weakest}`)))) : h('p.muted', 'Not enough responses yet (needs at least 3 per concept).'));
}

function sectionCompare() {
  const d = state.data, o = opts(), C = A.compareBlocks(d, o).filter((b) => b.n > 0);
  if (C.length < 1) return sec('cmp', 'Compare class blocks', h('p.muted', 'No block has submissions yet.'));
  const col = (b) => BLOCK_COLORS[d.blocks.indexOf(b.block) % BLOCK_COLORS.length];
  const one = (title, key, o2 = {}) => chartEl(chartDef(title, [{ label: title, bars: C.map((b) => ({ label: b.block, value: b[key] ?? 0, color: col(b) })) }], o2));
  const domChart = chartEl(chartDef('Domain mastery by block', d.domainOrder.map((k, i) => ({ label: d.domainNames[k], bars: C.map((b) => ({ label: b.block.replace('Block ', ''), value: b.domains[i] ?? 0, color: col(b) })) })), { yLabel: 'Average percent' }));
  const maxT = Math.max(60, ...C.map((b) => b.avgMin || 0));
  return sec('cmp', 'Compare class blocks', h('p.small.muted', 'Blocks differ in schedule, size and time of day, so these charts describe instructional needs. They are not a competition. Block sizes: ' + C.map((b) => `${b.block} n=${b.n}`).join(', ') + '.'),
    h('div.grid2', h('div.panel.flat', one('Overall average', 'avg')), h('div.panel.flat', one('First-attempt accuracy', 'firstAcc'))),
    h('div.panel.flat', domChart), h('div.grid2', h('div.panel.flat', one('Average completion time (minutes)', 'avgMin', { unit: '', yMax: Math.ceil(maxT / 10) * 10 + 10, yLabel: 'Minutes' })),
      h('table.data', h('caption', 'Block comparison table'), h('thead', h('tr', ['Block', 'n', 'Average', 'Avg minutes', '1st-attempt'].map((x) => h('th', x)))), h('tbody', C.map((b) => h('tr', h('td', b.block), h('td', b.n), h('td', fmt(b.avg, '%')), h('td', fmt(b.avgMin)), h('td', fmt(b.firstAcc, '%'))))))));
}

function sectionStudents(R) {
  const d = state.data, vis = d.students.filter((s) => (state.view === A.ALL || s.block === state.view) && (state.showDemo || s.type === 'LIVE') && s.status === 'Submitted');
  const key = state.sort.key, dir = state.sort.dir === 'asc' ? 1 : -1;
  const list = [...vis].sort((a, b) => ((key === 'last' ? (a.last + a.first).localeCompare(b.last + b.first) : key === 'block' ? a.block.localeCompare(b.block) : (a[key] ?? 0) - (b[key] ?? 0)) * dir));
  const th = (k, label) => h('th', h('button.sortbtn', { type: 'button', onclick: () => { state.sort = { key: k, dir: state.sort.key === k && state.sort.dir === 'asc' ? 'desc' : 'asc' }; render(); } }, label, state.sort.key === k ? (state.sort.dir === 'asc' ? ' ▲' : ' ▼') : ''));
  return sec('stu', 'Students', h('p.small.muted', 'Click a name for the individual report. The list is alphabetical by default; there is no ranking or leaderboard.'),
    h('div.tablewrap', h('table.data', h('thead', h('tr', th('last', 'Student'), th('block', 'Block'), th('pct', 'Final %'), th('raw', 'Raw points'), th('min', 'Minutes'), h('th', '1st / 2nd / 3rd / zero'), h('th', 'Flags'), h('th', ''))),
      h('tbody', list.map((s) => h('tr', h('td', h('button.linkish', { type: 'button', onclick: () => studentDialog(s.sid) }, `${s.last}, ${s.first}`)), h('td', s.block), h('td.' + tone(s.pct), s.pct + '%'), h('td', `${s.raw}/${s.poss}`), h('td', Math.round(s.min)), h('td', `${s.f1} / ${s.f2} / ${s.f3} / ${s.zero}`),
        h('td', s.type === 'DEMO DATA' ? h('span.pill.demo', 'DEMO DATA') : '', s.review !== 'OK' ? h('span.pill.flag', s.review) : '', s.integ && s.integ !== 'OK' && s.integ !== 'DEMO DATA' ? h('span.pill.flag', s.integ) : ''),
        h('td', !state.sandbox && s.review !== 'RESET: superseded' ? h('button.btn.small.warn', { type: 'button', onclick: () => resetStudent(s) }, 'Reset') : ''))))))); 
}
function studentDialog(sid) {
  const rep = A.studentReport(state.data, sid); if (!rep) return;
  const s = rep.student, d = state.data;
  const list = (items, empty) => items.length ? h('ul.small', items.map((i) => h('li', h('b', i.meta.sl), ` ${i.meta.cn}`))) : h('p.small.muted', empty);
  dlg.replaceChildren(h('h2', `${s.first} ${s.last}`), h('p.muted', `${s.block} • ${s.type === 'DEMO DATA' ? 'DEMO DATA • ' : ''}version ${s.version} • ${s.min} minutes`),
    h('div.cards.small', [['Overall score', s.pct + '%'], ['Raw points', `${s.raw} / ${s.poss}`], ['Time', Math.round(s.min) + ' min'], ['1st attempt', rep.a1.length], ['2nd attempt', rep.a2.length], ['3rd attempt', rep.a3.length], ['Zero credit', rep.zero.length]].map(([l, v]) => h('div.card', h('div.cl', l), h('div.cv', v)))),
    h('h3', 'Performance by domain'), h('div.bars', d.domainOrder.map((k, i) => h('div.brow', h('span', d.domainNames[k]), h('div.btrack', h('div.bfill', { style: { width: (s.dom[i] || 0) + '%' } })), h('span.bpct', fmt(s.dom[i], '%'))))),
    h('h3', 'Questions earning zero'), list(rep.zero, 'None.'),
    h('h3', 'Responses to major simulations and scenarios'), h('div.small', rep.major.map((i) => { const q = pub[i.qid]; return h('div.variant', h('b', `${i.meta.sl}`), ` (${i.result}, ${i.earned}/${i.poss} pts)`, h('div.muted', qPrompt(i.qid).slice(0, 160)), i.resp.filter((r) => r !== '' && r != null).map((r, n) => h('div', `Attempt ${n + 1}: `, q ? describe(q, r) : r))); })),
    h('div.dlg-actions', h('button.btn.primary', { type: 'button', onclick: () => dlg.close() }, 'Close')));
  dlg.showModal();
}
async function resetStudent(s) {
  if (!confirm(`Reset ${s.first} ${s.last} (${s.block})? Their earlier row is kept but marked "RESET: superseded", and they can retake.`)) return;
  const r = await send('t_reset', { pass: state.pass, sid: s.sid }); toast(r && r.ok ? 'Reset. The student can sign in again.' : 'Could not reset (' + (r && r.error) + ').'); load(true);
}

function sectionFlags() {
  const d = state.data, dup = d.students.filter((s) => s.review === 'DUPLICATE: REVIEW'), odd = d.students.filter((s) => s.integ && !['OK', 'DEMO DATA'].includes(s.integ) && s.type === 'LIVE');
  const find = (sid) => d.students.find((s) => s.sid === sid);
  return sec('flags', 'Flags for teacher review', dup.length ? h('div.panel.flat', h('h3', 'Possible duplicate submissions'), h('p.small.muted', 'The same first name, last name and block submitted more than once. Nothing was overwritten. Accept the new one (both count), ignore it, or reset the student for a legitimate retake.'),
    h('table.data', h('thead', h('tr', ['Student', 'Block', 'Original', 'This submission', ''].map((x) => h('th', x)))), h('tbody', dup.map((s) => { const o = find(s.dupOf); return h('tr', h('td', `${s.last}, ${s.first}`), h('td', s.block), h('td', o ? o.pct + '%' : '—'), h('td', s.pct + '%'),
      h('td', state.sandbox ? '' : [h('button.btn.small', { type: 'button', onclick: () => review(s, 'DUPLICATE: ACCEPTED') }, 'Accept'), ' ', h('button.btn.small', { type: 'button', onclick: () => review(s, 'DUPLICATE: IGNORED') }, 'Ignore')])); })))) : h('p.muted', 'No possible duplicate submissions.'),
    odd.length ? h('div.panel.flat', h('h3', 'Integrity notes'), h('ul', odd.map((s) => h('li', `${s.last}, ${s.first}: ${s.integ}`)))) : '');
}
async function review(s, status) { const r = await send('t_review', { pass: state.pass, sid: s.sid, status }); toast(r && r.ok ? 'Updated.' : 'Could not update.'); load(true); }

function sectionExport(R) {
  const d = state.data, all = d.students.filter((s) => s.status === 'Submitted' && (state.showDemo || s.type === 'LIVE'));
  const b = (label, fn) => h('button.btn.small', { type: 'button', onclick: fn }, label);
  const counted = A.counted(d, { block: A.ALL, showDemo: state.showDemo });
  return sec('exp', 'Export and grade transfer', h('p.small.muted', 'CSV files open in Excel and Google Sheets. All Classes and block files include review status so flagged duplicates are visible.'),
    h('div.row', b('All Classes CSV', () => download('unit7-all-classes.csv', A.masterCsv(d, all))), ...d.blocks.map((k) => b(k + ' CSV', () => download(`unit7-${safe(k)}.csv`, A.masterCsv(d, all.filter((s) => s.block === k)))))),
    h('div.row', { style: { marginTop: '.6rem' } }, b('Grade Export: all blocks (Last | First | Block | Final %)', () => download('unit7-grade-export.csv', A.gradeCsv(counted))), ...d.blocks.map((k) => b(`Grade Export: ${k}`, () => download(`unit7-grades-${safe(k)}.csv`, A.gradeCsv(counted.filter((s) => s.block === k)))))));
}
function sectionDemo(demo) {
  return sec('demo', 'Teacher demo / test data', h('p.muted', 'Generate about 28 fictional students spread over all four blocks (with realistic scores, attempts, timings, strengths and weaknesses) to preview and test the Google Sheet, graphs, item analysis, block comparisons, individual reports and reteaching advice. Every record is labelled DEMO DATA and can be removed without touching real submissions.'),
    h('div.row', h('button.btn.primary', { type: 'button', onclick: async () => {
      if (state.sandbox) { state.sandboxOn = true; state.showDemo = true; toast('Sandbox DEMO DATA generated.'); return load(true); }
      if (!confirm('Add 28 fictional DEMO DATA submissions to your sheet?')) return; toast('Generating… this can take up to a minute.'); const r = await send('t_demo_generate', { pass: state.pass, count: 28 }); toast(r && r.ok ? `Created ${r.created} DEMO DATA submissions.` : 'Could not generate (' + (r && r.error) + ').'); state.showDemo = true; load(true);
    } }, 'Generate demo data'),
    h('button.btn.warn', { type: 'button', onclick: async () => {
      if (state.sandbox) { state.sandboxOn = false; toast('Sandbox DEMO DATA deleted.'); return load(true); }
      if (!confirm('Delete ALL records labelled DEMO DATA? Real student submissions are not affected.')) return; const r = await send('t_demo_delete', { pass: state.pass }); toast(r && r.ok ? `Deleted ${r.deleted} DEMO DATA submissions.` : 'Could not delete (' + (r && r.error) + ').'); load(true);
    } }, 'Delete demo data'), h('span.pill.demo', `${demo} demo records present`)));
}

if (state.pass) load(); else login();
