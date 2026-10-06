/* multi — select all that apply. Right picks lock; wrong picks are removed and
   crossed out so the student only has to fix what is wrong. */
import { h, rich } from '../ui/dom.js';
import { setMark, LETTERS } from './common.js';

export function mount(host, ctx) {
  const { item, view } = ctx;
  const picks = new Set();
  const btns = new Map();
  let locked = false;

  const group = h('div', { class: 'opts multi', role: 'group', 'aria-label': 'Answer choices (select all that apply)' });
  view.optionOrder.forEach((oi, n) => {
    const o = item.options[oi];
    const b = h('button', { type: 'button', class: 'opt', role: 'checkbox', 'aria-checked': 'false', 'data-opt': String(oi) },
      h('span', { class: 'box', 'aria-hidden': 'true' }),
      h('span', { class: 'otext' }, rich(o.t)));
    b.addEventListener('click', () => toggle(oi));
    btns.set(oi, b);
    group.append(b);
    void n; void LETTERS;
  });
  host.append(group);

  function toggle(oi) {
    const b = btns.get(oi);
    if (locked || b.disabled) return;
    if (picks.has(oi)) picks.delete(oi); else picks.add(oi);
    b.setAttribute('aria-checked', String(picks.has(oi)));
    b.classList.toggle('picked', picks.has(oi));
    ctx.onChange();
  }

  return {
    getResponse: () => ({ picks: Array.from(picks) }),
    isComplete: () => picks.size > 0,
    showResult(res, { final, solved }) {
      Object.entries(res.subs).forEach(([k, ok]) => {
        const oi = Number(k);
        const b = btns.get(oi);
        if (ok) { setMark(b, 'right'); b.disabled = true; b.setAttribute('aria-disabled', 'true'); }
        else {
          setMark(b, 'wrong'); b.disabled = true; b.setAttribute('aria-disabled', 'true');
          b.classList.remove('picked'); b.setAttribute('aria-checked', 'false'); picks.delete(oi);
        }
      });
      if (solved) this.lockAll();
      if (final && !solved) this.showCorrect();
    },
    showCorrect() {
      item.options.forEach((o, i) => {
        const b = btns.get(i);
        if (o.ok && !b.classList.contains('right')) { setMark(b, 'reveal'); b.setAttribute('aria-checked', 'true'); }
      });
      this.lockAll();
    },
    lockAll() { locked = true; btns.forEach(b => { b.disabled = true; b.setAttribute('aria-disabled', 'true'); }); },
    focus() { const f = Array.from(btns.values()).find(b => !b.disabled); if (f) f.focus(); },
  };
}
