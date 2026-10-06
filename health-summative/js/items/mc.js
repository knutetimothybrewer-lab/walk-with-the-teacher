/* mc — single choice (radio group with arrow-key support). */
import { h, rich } from '../ui/dom.js';
import { setMark, LETTERS } from './common.js';

export function mount(host, ctx) {
  const { item, view } = ctx;
  let pick = null;
  let locked = false;
  const btns = new Map();

  const group = h('div', { class: 'opts', role: 'radiogroup', 'aria-label': 'Answer choices' });
  view.optionOrder.forEach((oi, n) => {
    const o = item.options[oi];
    const b = h('button', { type: 'button', class: 'opt', role: 'radio', 'aria-checked': 'false', tabindex: n === 0 ? '0' : '-1', 'data-opt': String(oi) },
      h('span', { class: 'letter', 'aria-hidden': 'true' }, LETTERS[n]),
      h('span', { class: 'otext' }, rich(o.t)));
    b.addEventListener('click', () => choose(oi));
    b.addEventListener('keydown', (e) => {
      if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) return;
      e.preventDefault();
      const live = view.optionOrder.filter(i => !btns.get(i).disabled);
      if (!live.length) return;
      const at = live.indexOf(oi);
      const dir = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
      const next = live[(at + dir + live.length) % live.length];
      btns.get(next).focus();
      choose(next);
    });
    btns.set(oi, b);
    group.append(b);
  });
  host.append(group);

  function refreshRoving() {
    const enabled = view.optionOrder.filter(i => !btns.get(i).disabled);
    const target = (pick !== null && enabled.includes(pick)) ? pick : enabled[0];
    btns.forEach((b, i) => b.setAttribute('tabindex', i === target ? '0' : '-1'));
  }

  function choose(oi) {
    if (locked || btns.get(oi).disabled) return;
    pick = oi;
    btns.forEach((b, i) => {
      const on = i === oi;
      b.setAttribute('aria-checked', String(on));
      b.classList.toggle('picked', on);
    });
    refreshRoving();
    ctx.onChange();
  }

  return {
    getResponse: () => ({ pick }),
    isComplete: () => pick !== null,
    /** res = grade() output for this attempt */
    showResult(res, { final, solved }) {
      const p = pick !== null ? pick : Number(Object.keys(res.subs)[0]);
      const ok = res.subs[p];
      const b = btns.get(p);
      b.classList.remove('picked');
      b.setAttribute('aria-checked', 'false');
      if (ok) { setMark(b, 'right'); b.classList.add('picked'); b.setAttribute('aria-checked', 'true'); this.lockAll(); }
      else { setMark(b, 'wrong'); b.disabled = true; b.setAttribute('aria-disabled', 'true'); pick = null; }
      if (final && !solved) this.showCorrect();
      refreshRoving();
    },
    showCorrect() {
      item.options.forEach((o, i) => { if (o.ok && !btns.get(i).classList.contains('right')) setMark(btns.get(i), 'reveal'); });
      this.lockAll();
    },
    lockAll() { locked = true; btns.forEach(b => { b.disabled = true; b.setAttribute('aria-disabled', 'true'); }); },
    focus() { const f = Array.from(btns.values()).find(b => !b.disabled); if (f) f.focus(); },
    /** Which option text was picked (for hint lookup). */
    lastWrong: () => null,
  };
}
