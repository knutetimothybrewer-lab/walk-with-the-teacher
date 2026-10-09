// Preview launcher and test tools.  Everything here is separate from the real gradebook.
import { h, clear, toast, announce } from '../util.js';
import { S, nav } from '../state.js';
import { tcall, confirmDialog } from './tapi.js';

async function openPreview(fresh, seconds) {
  const r = await tcall(fresh ? 'previewReset' : 'previewStart', {});
  if (!r.ok) return r;
  if (seconds) { const c = await tcall('previewSetClock', { seconds }); if (!c.ok) return c; r.state = c.state; }
  S.sess = { sid: r.sessionId, token: r.token }; S.state = r.state; S.preview = true; S.content = {}; S.sims = {}; S.pos = { ch: 1, step: 0 };
  nav.go('assess'); return r;
}

export async function build(host, ctx) {
  const msg = h('div', { 'aria-live': 'polite' });
  const say = (kind, t) => { clear(msg); msg.append(h('div', { class: 'notice ' + kind, role: 'status' }, t)); announce(t); };
  const launch = (label, fresh, seconds, primary) => h('button', { class: 'btn ' + (primary ? 'btn-primary' : ''), type: 'button', onclick: async (e) => { e.target.disabled = true; const r = await openPreview(fresh, seconds); if (r && !r.ok) { e.target.disabled = false; say('bad', r.message || 'Could not open the preview.'); } } }, label);

  const demoN = h('select', { class: 'input', style: 'max-width:160px', 'aria-label': 'How many fictional students' }, [8, 16, 24, 48].map((n) => h('option', { value: n }, n + ' students'))); demoN.value = '16';
  const sheetsOut = h('div', { 'aria-live': 'polite' });

  host.append(h('h2', null, 'Preview and testing'),
    h('p', { class: 'muted' }, 'Everything on this page is separate from the real gradebook. The preview is its own session, and fictional students live in a protected demo area.'),
    h('div', { class: 'panel' }, h('h3', null, '1. Full student preview'),
      h('p', null, 'Opens the real student experience with every chapter unlocked, the correct answers and explanations under each question, free navigation, working simulations and the real timer. Use the toolbar at the top of the preview to jump anywhere or fill answers.'),
      h('div', { class: 'controls' }, launch('Open my preview', false, 0, true), launch('Start a fresh preview (Reset My Preview Progress)', true, 0, false))),
    h('div', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, '2. Timer and expiry testing'),
      h('p', null, 'Opens a fresh preview with the clock set near the end so you can watch the warning colors and the automatic submission. The countdown, the amber, red and final-minute states, the lock and the “Time Expired — Auto-Submitted” screen all run exactly as they do for students.'),
      h('div', { class: 'controls' }, launch('30 minutes left (amber)', true, 1800), launch('10 minutes left (red)', true, 600), launch('5 minutes left (final warning)', true, 300), launch('20 seconds left (auto-submit)', true, 20))),
    h('div', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, '3. Fictional submissions for dashboards'),
      h('p', null, 'Creates invented students across all four blocks with realistic scores, attempts, chapter times, some in progress and a few auto-submitted. They are labeled “[DEMO]”, are kept in a separate demo store and in the protected “Test Records” tab, and never appear in the gradebook tabs.'),
      h('div', { class: 'controls' }, demoN, h('button', { class: 'btn', type: 'button', onclick: async () => {
        const ok = await confirmDialog({ title: 'Generate fictional students?', confirmLabel: 'Generate', body: h('p', null, 'Previously generated fictional students are replaced. Real student records are never changed.') }); if (!ok) return;
        const r = await tcall('generateDemo', { count: Number(demoN.value) }); r.ok ? say('good', r.message + ` (${r.created} students.)`) : say('bad', r.message || 'Could not generate.'); } }, 'Generate fictional students'),
        h('button', { class: 'btn', type: 'button', onclick: () => ctx.goto('analytics', { source: 'demo' }) }, 'View analytics on the fictional data'))),
    h('div', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, '4. Google Sheets verification'),
      h('p', null, 'Writes a clearly labeled test row to the protected “Test Records” tab and reads it back, so you can confirm the connection and permissions without touching any class tab. “Update Sheets now” rebuilds the Master Dashboard and the four block tabs immediately instead of waiting for the one-minute timer.'),
      h('div', { class: 'controls' }, h('button', { class: 'btn', type: 'button', onclick: async (e) => { e.target.disabled = true; clear(sheetsOut); sheetsOut.append(h('p', { class: 'muted' }, 'Testing…')); const r = await tcall('testSheets', {}, { tries: 1, timeout: 60000 }); e.target.disabled = false; clear(sheetsOut); sheetsOut.append(h('div', { class: 'notice ' + (r.ok && r.readBack ? 'good' : 'bad'), role: 'status' }, r.message || 'Could not reach Google Sheets.', r.ok ? h('div', { class: 'small' }, `Test id ${r.id}. Destination: ${r.destination || 'Test Records'}. Tabs: ${(r.tabs || []).join(', ')}`) : null)); } }, 'Test the Google Sheets connection'),
        h('button', { class: 'btn', type: 'button', onclick: async (e) => { e.target.disabled = true; const r = await tcall('flushReports', {}, { tries: 1, timeout: 90000 }); e.target.disabled = false; r.ok ? say('good', 'Google Sheets updated.') : say('bad', r.message || 'Could not update Sheets.'); } }, 'Update Sheets now')), sheetsOut),
    msg);
}
