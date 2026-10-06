/* Completion code: a short, screenshot-friendly hash of name, class code,
   score and finish time. It lets a teacher spot-check a screenshot against the
   Sheet; it is not tamper-proof. */
import { hashStr } from './rng.js';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I

export function completionCode({ first, last, code, percent, earned, endedAt }) {
  const base = [first, last, code, percent, earned, endedAt].join('|').toLowerCase();
  let h1 = hashStr(base);
  let h2 = hashStr('w|' + base);
  let a = '', b = '';
  for (let i = 0; i < 4; i++) { a += ALPHABET[h1 & 31]; h1 >>>= 5; }
  for (let i = 0; i < 4; i++) { b += ALPHABET[h2 & 31]; h2 >>>= 5; }
  return `WWT-${a}-${b}`;
}
