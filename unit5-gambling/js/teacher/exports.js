// Exports: the Master Dashboard and each block as CSV or Excel, and the per-attempt response log.
import { h, clear, toast } from '../util.js';
import { tcall } from './tapi.js';
import { saveCsv, saveXlsx, fileStamp } from './export.js';

export async function build(host, ctx) {
  let source = 'real';
  const srcSel = h('select', { class: 'input', style: 'max-width:300px', 'aria-label': 'Data source' }, h('option', { value: 'real' }, 'Real student records'), h('option', { value: 'demo' }, 'Fictional test students (demo)'));
  srcSel.addEventListener('change', () => { source = srcSel.value; });
  const msg = h('div', { 'aria-live': 'polite' });
  const say = (kind, t) => { clear(msg); msg.append(h('div', { class: 'notice ' + kind, role: 'status' }, t)); };
  async function get(block, responses) { const r = await tcall('exportData', { source, block: block || 'all', responses: !!responses }); if (!r.ok) { say('bad', r.message || 'Export failed.'); return null; } return r; }
  const note = () => source === 'demo' ? '-DEMO' : '';
  const btn = (label, fn) => h('button', { class: 'btn', type: 'button', onclick: async (e) => { e.target.disabled = true; try { await fn(); } finally { e.target.disabled = false; } } }, label);
  host.append(h('h2', null, 'Export'),
    h('p', { class: 'muted' }, 'Files are created in your browser from the server’s data and saved to your computer. They contain student names and IDs; store them as you would any gradebook.'),
    h('label', { class: 'pv-f' }, h('span', null, 'Data'), srcSel),
    h('div', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, 'Everything'),
      h('div', { class: 'controls' },
        btn('Excel workbook: Master and all four blocks', async () => { const r = await get('all'); if (!r) return; const sheets = [{ name: 'Master Dashboard', head: r.master.head, rows: r.master.rows }]; for (const b of ctx.blocks) { const rb = await get(b); if (rb && rb.block) sheets.push({ name: b, head: rb.block.head, rows: rb.block.rows }); } saveXlsx(`behind-the-odds${note()}-${fileStamp()}.xlsx`, sheets); say('good', 'Workbook saved.'); }),
        btn('Master Dashboard (CSV)', async () => { const r = await get('all'); if (!r) return; saveCsv(`master-dashboard${note()}-${fileStamp()}.csv`, r.master.head, r.master.rows); say('good', 'Saved.'); }))),
    h('div', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, 'One block'),
      h('div', { class: 'controls' }, ctx.blocks.map((b) => btn(b + ' (CSV)', async () => { const r = await get(b); if (!r || !r.block) return; saveCsv(`${b.replace(/[^A-Za-z0-9]+/g, '-')}${note()}-${fileStamp()}.csv`, r.block.head, r.block.rows); say('good', b + ' saved.'); })))),
    h('div', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, 'Every attempt'), h('p', { class: 'muted small' }, 'One row per attempt: who, which question, which attempt, fraction correct, credit and the response. Useful for item analysis and for resolving a dispute.'), h('div', { class: 'controls' }, btn('Question responses log (CSV)', async () => { const r = await get('all', true); if (!r || !r.responses) return; saveCsv(`question-responses${note()}-${fileStamp()}.csv`, r.responses.head, r.responses.rows); say('good', 'Saved.'); }))),
    msg,
    h('p', { class: 'muted small' }, 'In Google Sheets the same data lives in the Master Dashboard tab and one tab per block. They are rebuilt from the server records about once a minute and cannot be edited by students. Spreadsheet cells that begin with = + - or @ are escaped so that a student’s name can never run as a formula.'));
}
