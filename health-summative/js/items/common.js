/* Shared helpers for the item components. Marks never rely on colour alone:
   every state carries an icon and hidden text. */
import { h } from '../ui/dom.js';

const MARKS = {
  right: ['✓', 'Correct'],
  wrong: ['↺', 'Not quite'],
  reveal: ['★', 'Correct answer'],
};

/** Add (or replace) the state mark on an option/token element. */
export function setMark(el, kind) {
  el.classList.remove('right', 'wrong', 'reveal');
  const old = el.querySelector(':scope > .mark');
  if (old) old.remove();
  if (!kind) return;
  el.classList.add(kind);
  const [icon, label] = MARKS[kind];
  el.append(h('span', { class: 'mark' }, h('span', { 'aria-hidden': 'true' }, icon), h('span', { class: 'sr-only' }, ' ' + label)));
}

export const LETTERS = 'ABCDEFGHIJ';
