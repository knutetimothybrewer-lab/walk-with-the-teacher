// Teacher Mode shell: tabs, sign-out and a banner that always says what this mode is.  Each tab is its own lazily loaded module
// exporting build(host, ctx) -> { destroy? }.  The server checks the teacher token on every call; nothing here is trusted.
import { h, mount, clear, announce, $ } from '../util.js';
import { S } from '../state.js';
import { signOut, tcall } from './tapi.js';

const TABS = [
  { id: 'overview', label: 'Overview', load: () => import('./overview.js') },
  { id: 'analytics', label: 'Analytics', load: () => import('./analytics.js') },
  { id: 'students', label: 'Students and resets', load: () => import('./students.js') },
  { id: 'codes', label: 'Access codes', load: () => import('./codes.js') },
  { id: 'testing', label: 'Preview and testing', load: () => import('./testing.js') },
  { id: 'key', label: 'Answer key', load: () => import('./keyview.js') },
  { id: 'sources', label: 'Sources and research', load: () => import('./sources.js') },
  { id: 'export', label: 'Export', load: () => import('./exports.js') }
];

export function renderTeacher(root) {
  document.body.dataset.ch = 't';
  let current = null, inst = null, ping = null;
  const host = h('div', { class: 't-host', role: 'tabpanel', id: 't-panel', tabindex: -1 });
  const bar = h('div', { class: 'sim-tabs t-tabs', role: 'tablist', 'aria-label': 'Teacher Mode sections' });
  const btns = TABS.map((t, i) => { const b = h('button', { class: 'sim-tab', role: 'tab', type: 'button', id: 'tt-' + t.id, 'aria-selected': 'false', 'aria-controls': 't-panel' }, t.label); b.addEventListener('click', () => show(t.id)); bar.append(b); return b; });
  bar.addEventListener('keydown', (e) => { const i = TABS.findIndex((t) => t.id === current); const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!k) return; e.preventDefault(); const n = (i + k + TABS.length) % TABS.length; show(TABS[n].id); btns[n].focus(); });
  const ctx = { goto: (id, args) => show(id, args), blocks: (S.cfg && S.cfg.blocks) || [] };

  async function show(id, args) {
    if (inst && inst.destroy) { try { inst.destroy(); } catch { /* ignore */ } }
    inst = null; current = id;
    btns.forEach((b, i) => { const on = TABS[i].id === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    clear(host); host.append(h('p', { class: 'muted' }, 'Loading…')); host.setAttribute('aria-labelledby', 'tt-' + id);
    try {
      const m = await TABS.find((t) => t.id === id).load();
      if (current !== id) return;
      clear(host); inst = (await m.build(host, Object.assign({}, ctx, { args }))) || null;
    } catch (e) { clear(host); host.append(h('div', { class: 'notice bad', role: 'alert' }, 'This section could not load. ' + (e && e.message ? e.message : ''))); }
    try { history.replaceState(null, '', location.pathname + '#teacher'); } catch { /* ignore */ }
  }

  mount(root, h('header', { class: 't-banner' }, h('div', { class: 'row', style: 'justify-content:space-between;width:100%' },
      h('div', null, h('strong', null, 'Teacher Mode'), h('span', { class: 'small' }, ' · Gambling: Behind the Odds · signed in')),
      h('div', { class: 'row' }, h('button', { class: 'btn btn-sm btn-primary', type: 'button', onclick: () => ctx.goto('testing') }, 'Open student preview'), h('button', { class: 'btn btn-sm', type: 'button', onclick: () => signOut('Signed out of Teacher Mode.') }, 'Sign out')))),
    h('main', { id: 'main', class: 'page t-page' }, bar, host));
  // keep the teacher session fresh and notice if it was revoked
  ping = setInterval(async () => { if (!document.getElementById('t-panel')) return clearInterval(ping); await tcall('teacherPing', {}, { tries: 1 }); }, 10 * 60 * 1000);
  show((ctx.args && ctx.args.tab) || 'overview');
  announce('Teacher Mode');
}
