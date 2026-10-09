// Access codes: one separate, teacher-controlled code per class block.  The server stores and checks them; students cannot change blocks.
import { h, clear, toast, announce } from '../util.js';
import { tcall, confirmDialog } from './tapi.js';

export async function build(host, ctx) {
  const r0 = await tcall('getConfig', {});
  if (!r0.ok) { host.append(h('div', { class: 'notice bad', role: 'alert' }, r0.message || 'Could not load access codes.')); return; }
  const blocks = r0.blocks, inputs = {}, opens = {}, msg = h('div', { 'aria-live': 'polite' });
  const rows = blocks.map((b) => {
    const c = r0.codes[b] || { code: '', open: false };
    const inp = h('input', { class: 'input mono', type: 'text', value: c.code, maxlength: 20, 'aria-label': `Access code for ${b}`, autocomplete: 'off', spellcheck: 'false', style: 'text-transform:uppercase;max-width:220px' });
    const open = h('input', { type: 'checkbox', id: 'open-' + b, 'aria-label': `${b} is open for sign-in` }); open.checked = c.open !== false;
    inputs[b] = inp; opens[b] = open;
    return h('tr', null, h('th', { scope: 'row' }, b), h('td', null, inp), h('td', null, h('label', { class: 'check-line' }, open, ' Open for sign-in')),
      h('td', null, h('button', { class: 'btn btn-sm', type: 'button', onclick: () => test(b, inp.value) }, 'Test this code')));
  });
  const say = (kind, t) => { clear(msg); msg.append(h('div', { class: 'notice ' + kind, role: 'status' }, t)); announce(t); };
  const collect = () => { const codes = {}; blocks.forEach((b) => { codes[b] = { code: inputs[b].value, open: opens[b].checked }; }); return codes; };
  async function save() {
    const r = await tcall('saveConfig', { codes: collect() });
    if (!r.ok) return say('bad', r.message || 'Could not save.'); blocks.forEach((b) => { inputs[b].value = r.codes[b].code; opens[b].checked = r.codes[b].open; }); say('good', 'Access codes saved. Students already signed in are not affected; new sign-ins use the new codes.');
  }
  async function generate() {
    const ok = await confirmDialog({ title: 'Generate four new codes?', confirmLabel: 'Generate and close all blocks', body: h('p', null, 'This replaces all four codes with new random ones and closes every block. Students who are already signed in can keep working. Open each block when its class is ready.') });
    if (!ok) return; const r = await tcall('generateCodes', {});
    if (!r.ok) return say('bad', r.message || 'Could not generate codes.'); blocks.forEach((b) => { inputs[b].value = r.codes[b].code; opens[b].checked = r.codes[b].open; }); say('good', 'New codes generated. All blocks are closed. Tick “Open for sign-in” for the class that is starting, then Save.');
  }
  async function test(b, code) {
    const r = await tcall('testCode', { block: b, code });
    if (!r.ok) return say('bad', r.message || 'Could not test.'); say(r.valid && r.open ? 'good' : r.valid ? 'warn' : 'bad', `${b}: ${r.reason}`);
  }
  const tb = h('select', { class: 'input', 'aria-label': 'Block to test' }, blocks.map((b) => h('option', { value: b }, b))), tc = h('input', { class: 'input mono', type: 'text', placeholder: 'Type a code to test', 'aria-label': 'Code to test', autocomplete: 'off', style: 'max-width:240px' });
  const setRes = h('select', { class: 'input', 'aria-label': 'What students see when finished' }, [['full', 'Score and chapter breakdown'], ['score', 'Total score only'], ['hidden', 'Completion message only (no score)']].map((x) => h('option', { value: x[0] }, x[1])));
  setRes.value = r0.settings.studentResults;
  const calc = h('input', { type: 'checkbox', id: 's-calc' }), ref = h('input', { type: 'checkbox', id: 's-ref' }); calc.checked = r0.settings.calculator; ref.checked = r0.settings.referenceSheet;
  host.append(h('h2', null, 'Access codes'),
    h('p', { class: 'muted' }, 'Each class block has its own code. Give students only their own block’s code. A student must pick their block and type that block’s code; they cannot change blocks afterwards without you.'),
    h('div', { class: 't-scroll' }, h('table', { class: 't-table' }, h('thead', null, h('tr', null, ['Block', 'Access code', 'Sign-in', ''].map((x) => h('th', { scope: 'col' }, x)))), h('tbody', null, rows))),
    h('div', { class: 'controls', style: 'margin-top:1rem' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: save }, 'Save codes'), h('button', { class: 'btn', type: 'button', onclick: generate }, 'Generate new codes'),
      h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { blocks.forEach((b) => { opens[b].checked = true; }); } }, 'Tick all open'), h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { blocks.forEach((b) => { opens[b].checked = false; }); } }, 'Tick all closed')),
    msg,
    h('div', { class: 'panel', style: 'margin-top:1.2rem' }, h('h3', null, 'Check a code without signing in'), h('div', { class: 'controls t-controls' }, tb, tc, h('button', { class: 'btn', type: 'button', onclick: () => test(tb.value, tc.value) }, 'Validate code')), h('p', { class: 'muted small' }, 'This asks the server whether the block and code match. It creates no student record.')),
    h('div', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, 'Student settings'),
      h('label', { class: 'field' }, h('span', null, 'When a student finishes, show them'), setRes),
      h('label', { class: 'check-line' }, calc, ' Allow the calculator'), h('br'), h('label', { class: 'check-line' }, ref, ' Allow the formula reference sheet'),
      h('div', { style: 'margin-top:.8rem' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => { const r = await tcall('saveConfig', { settings: { studentResults: setRes.value, calculator: calc.checked, referenceSheet: ref.checked } }); r.ok ? say('good', 'Student settings saved.') : say('bad', r.message || 'Could not save settings.'); } }, 'Save settings'))),
    h('p', { class: 'muted small', style: 'margin-top:1rem' }, `The time limit is ${r0.timeLimitMin} minutes and is enforced by the server. Codes are stored in the Config tab of your Google Sheet, never in the public website files. Codes prove a student is in the right class; they cannot prove who is typing.`));
}
