// Class analytics: averages by block, completion, chapter performance and timing, most-missed questions, attempts.
import { h, clear, fmt } from '../util.js';
import { barChart } from '../charts.js';
import { tcall } from './tapi.js';
import { saveCsv, saveXlsx, fileStamp } from './export.js';

export async function build(host, ctx) {
  let block = 'all', source = 'real', data = null;
  const blockSel = h('select', { class: 'input', 'aria-label': 'Class block' }, h('option', { value: 'all' }, 'All blocks'), ctx.blocks.map((b) => h('option', { value: b }, b)));
  const srcSel = h('select', { class: 'input', 'aria-label': 'Data source' }, h('option', { value: 'real' }, 'Real student records'), h('option', { value: 'demo' }, 'Fictional test students (demo)'));
  const out = h('div', { 'aria-live': 'polite' });
  if (ctx.args && ctx.args.source === 'demo') { source = 'demo'; srcSel.value = 'demo'; }
  host.append(h('h2', null, 'Analytics'), h('div', { class: 'controls t-controls' }, h('label', { class: 'pv-f' }, h('span', null, 'Block'), blockSel), h('label', { class: 'pv-f' }, h('span', null, 'Data'), srcSel),
    h('button', { class: 'btn btn-sm btn-primary', type: 'button', onclick: load }, 'Refresh')), out);
  blockSel.addEventListener('change', () => { block = blockSel.value; load(); }); srcSel.addEventListener('change', () => { source = srcSel.value; load(); });
  const card = (k, v, s, hot) => h('div', { class: 'stat' + (hot ? ' hot' : '') }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, String(v)), s ? h('div', { class: 's' }, s) : null);
  const pct = (v) => (v == null ? '—' : fmt(v, 1) + '%');

  async function load() {
    clear(out); out.append(h('p', { class: 'muted' }, 'Loading…'));
    const r = await tcall('teacherAnalytics', { block, source });
    clear(out);
    if (!r.ok) { out.append(h('div', { class: 'notice bad', role: 'alert' }, r.message || 'Could not load analytics.')); return; }
    data = r; draw();
  }
  function draw() {
    const d = data, o = d.overall; clear(out);
    if (source === 'demo') out.append(h('div', { class: 'notice warn' }, h('strong', null, 'Fictional data. '), 'These records are generated for testing and are not in the gradebook.'));
    if (!o.registered) { out.append(h('p', { class: 'muted' }, 'No records yet for this selection.' + (source === 'real' ? ' When students sign in, results appear here.' : ' Use Preview and testing to generate fictional students.'))); return; }
    out.append(h('div', { class: 'stat-grid' }, card('Registered', o.registered), card('Completed', o.submitted, `${o.inProgress} still working`), card('Average score', pct(o.avgPct), o.submitted ? `median ${pct(o.medianPct)} · range ${pct(o.low)}–${pct(o.high)}` : 'no completed attempts', true),
      card('Avg completion time', d.avgCompletionMin == null ? '—' : fmt(d.avgCompletionMin, 1) + ' min', 'students who submitted themselves'), card('Auto-submitted', d.autoSubmissions, 'time expired'), card('Avg attempts per question', d.avgAttemptsPerItem == null ? '—' : fmt(d.avgAttemptsPerItem, 2), 'of 3 allowed'), card('Near the deadline', d.approaching.length, 'within 15 minutes')));

    // average by block
    const bl = ctx.blocks.map((b) => ({ label: b.replace('Block ', ''), value: d.byBlock[b].avgPct == null ? 0 : d.byBlock[b].avgPct, color: 'var(--accent)' }));
    out.append(h('div', { class: 'sim-grid2', style: 'margin-top:1rem' },
      h('div', { class: 'panel' }, h('h3', null, 'Average score by block'), barChart(bl, { unit: '%', max: 100, title: 'Average percent, completed attempts only', alt: 'Average score for each class block: ' + ctx.blocks.map((b) => `${b} ${pct(d.byBlock[b].avgPct)}`).join(', ') }),
        h('table', { class: 't-table small' }, h('thead', null, h('tr', null, ['Block', 'Registered', 'Not started', 'Working', 'Submitted', 'Auto', 'Average'].map((x) => h('th', { scope: 'col' }, x)))), h('tbody', null, ctx.blocks.map((b) => { const s = d.byBlock[b]; return h('tr', null, h('th', { scope: 'row' }, b), h('td', { class: 'num' }, s.registered), h('td', { class: 'num' }, s.notStarted), h('td', { class: 'num' }, s.inProgress), h('td', { class: 'num' }, s.submitted), h('td', { class: 'num' }, s.autoSubmitted), h('td', { class: 'num' }, pct(s.avgPct))); })))),
      h('div', { class: 'panel' }, h('h3', null, 'Score distribution'), barChart(Object.keys(o.bands).map((k) => ({ label: k, value: o.bands[k], color: k === 'Below 60' ? 'var(--bad)' : 'var(--accent)' })), { title: 'Completed attempts by score band', alt: 'Number of completed attempts in each score band' }))));

    // chapters
    out.append(h('div', { class: 'sim-grid2', style: 'margin-top:1rem' },
      h('div', { class: 'panel' }, h('h3', null, 'Average score by chapter'), barChart(d.chapters.map((c) => ({ label: 'Ch ' + c.id, value: c.avgPct == null ? 0 : c.avgPct })), { unit: '%', max: 100, title: 'Average percent of chapter points, completed attempts', alt: d.chapters.map((c) => `Chapter ${c.id} ${pct(c.avgPct)}`).join(', ') })),
      h('div', { class: 'panel' }, h('h3', null, 'Time spent per chapter'), h('table', { class: 't-table small' }, h('thead', null, h('tr', null, ['Chapter', 'Average minutes', 'Planned', 'Average score'].map((x) => h('th', { scope: 'col' }, x)))),
        h('tbody', null, d.chapters.map((c) => h('tr', null, h('th', { scope: 'row' }, `${c.id}. ${c.title}`), h('td', { class: 'num' }, c.avgMinutes == null ? '—' : fmt(c.avgMinutes, 1)), h('td', { class: 'num' }, c.targetMinutes), h('td', { class: 'num' }, pct(c.avgPct))))),
        ), h('p', { class: 'muted small' }, 'Time per chapter is measured from the chapter that was on screen. Planned minutes are estimates from the blueprint, not measurements.'))));

    // most missed
    out.append(h('div', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, 'Most-missed questions'), h('p', { class: 'muted small' }, 'Miss rate = students who did not get it right on the first attempt. Review the answer key tab for the explanation to reteach.'),
      d.mostMissed.length ? h('div', { class: 't-scroll' }, itemsTable(d.mostMissed)) : h('p', { class: 'muted' }, 'No question attempts recorded yet.')));
    out.append(h('details', { class: 'panel', style: 'margin-top:1rem' }, h('summary', null, h('strong', null, 'All questions (' + d.items.length + ')')), h('div', { class: 't-scroll' }, itemsTable(d.items))));
    if (d.approaching.length) out.append(h('div', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, 'Students approaching the deadline'), h('ul', null, d.approaching.map((a) => h('li', null, `${a.name} (${a.block}): ${fmt(a.remainingMin, 1)} min left`)))));
    out.append(h('div', { class: 'controls', style: 'margin-top:1rem' },
      h('button', { class: 'btn btn-sm', type: 'button', onclick: () => saveCsv(`analytics-questions-${fileStamp()}.csv`, ITEM_HEAD, d.items.map(itemRow)) }, 'Download question table (CSV)'),
      h('button', { class: 'btn btn-sm', type: 'button', onclick: () => saveXlsx(`analytics-${fileStamp()}.xlsx`, [{ name: 'Questions', head: ITEM_HEAD, rows: d.items.map(itemRow) }, { name: 'Chapters', head: ['Chapter', 'Title', 'Average percent', 'Average minutes', 'Planned minutes'], rows: d.chapters.map((c) => [c.id, c.title, c.avgPct, c.avgMinutes, c.targetMinutes]) }, { name: 'Blocks', head: ['Block', 'Registered', 'Not started', 'In progress', 'Submitted', 'Auto-submitted', 'Average percent'], rows: ctx.blocks.map((b) => { const s = d.byBlock[b]; return [b, s.registered, s.notStarted, s.inProgress, s.submitted, s.autoSubmitted, s.avgPct]; }) }]) }, 'Download analytics (Excel)')));
  }
  const ITEM_HEAD = ['Question', 'Chapter', 'Title', 'Points', 'Students attempted', 'Right on first try %', 'Right eventually %', 'Miss rate %', 'Zero credit', 'Avg attempts', 'Avg credit %'];
  const itemRow = (i) => [i.id, i.ch, i.title, i.pts, i.attempted, i.firstTryPct, i.eventuallyPct, i.missRate, i.zeroCredit, i.avgAttempts, i.avgCreditPct];
  function itemsTable(items) {
    return h('table', { class: 't-table small' }, h('thead', null, h('tr', null, ['Question', 'Pts', 'Attempted', 'First try', 'Eventually', 'Miss rate', 'Zero credit', 'Avg attempts', 'Avg credit'].map((x) => h('th', { scope: 'col' }, x)))),
      h('tbody', null, items.map((i) => h('tr', null, h('th', { scope: 'row' }, `${i.id}`, h('div', { class: 'muted' }, i.title)), h('td', { class: 'num' }, i.pts), h('td', { class: 'num' }, i.attempted), h('td', { class: 'num' }, pct(i.firstTryPct)), h('td', { class: 'num' }, pct(i.eventuallyPct)), h('td', { class: 'num' }, pct(i.missRate)), h('td', { class: 'num' }, i.zeroCredit), h('td', { class: 'num' }, i.avgAttempts == null ? '—' : fmt(i.avgAttempts, 2)), h('td', { class: 'num' }, pct(i.avgCreditPct))))));
  }
  await load();
}
