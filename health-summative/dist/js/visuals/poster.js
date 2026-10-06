/* poster.js — the capstone "mini-infographic" that fills in as the student
   solves each builder item. Shows the correct tiles for solved sections.     */
import { h, plain } from '../ui/dom.js';

export function mount(host, ctx) {
  const { plan, session, item } = ctx;
  const secs = plan.all.filter(r => r.item.poster);
  const wrap = h('div', { class: 'poster', role: 'group', 'aria-label': 'Your mini-infographic so far' },
    h('h3', { class: 'poster-title' }, 'Your mini-infographic'));
  const grid = h('div', { class: 'poster-grid' });
  secs.forEach(r => {
    const st = session.items[r.id];
    const done = st && st.done;
    const cur = r.id === item.id;
    const body = h('div', { class: 'poster-body' });
    if (done) {
      const lines = r.item.poster.lines
        ? r.item.poster.lines
        : (r.item.options || []).filter(o => o.ok).map(o => plain(o.posterText || o.t));
      lines.forEach(l => body.append(h('p', {}, l)));
    } else body.append(h('p', { class: 'ph' }, cur ? 'Building this part now…' : 'Not built yet'));
    grid.append(h('section', { class: `poster-sec ${done ? 'done' : ''} ${cur ? 'cur' : ''}` },
      h('h4', {}, `${r.item.poster.n}. ${r.item.poster.title}`), body));
  });
  wrap.append(grid);
  host.append(wrap);
  return {};
}
