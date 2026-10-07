// Derives correct answers from the PUBLIC hashed content by enumerating every candidate response.
// Used by Preview Mode ("show correct answer"), the teacher dashboard, and the tests. Every question type has a
// small answer space (< ~5,000 candidates), so this is fast. It is not a security problem: the same enumeration is
// what any determined student could attempt, which is why the README is honest about client-side limits.
import { canon, answerHash, numCanon } from './canon.js';
import { ALL_FLAGS } from './plan.js';

function* product(lists) {
  if (!lists.length) { yield []; return; }
  const [first, ...rest] = lists;
  for (const x of first) for (const tail of product(rest)) yield [x, ...tail];
}
function* perms(arr) {
  if (arr.length <= 1) { yield arr.slice(); return; }
  for (let i = 0; i < arr.length; i++) for (const p of perms([...arr.slice(0, i), ...arr.slice(i + 1)])) yield [arr[i], ...p];
}
function* subsets(arr) { const n = arr.length; for (let m = 1; m < (1 << n); m++) yield arr.filter((_, i) => m & (1 << i)); }
const keys = (a) => (a || []).map((x) => x[0]);

/** Yields { resp, c } candidates for a question definition (public form). */
export function* candidates(q) {
  switch (q.type) {
    case 'mc': case 'predict': for (const k of keys(q.opts)) yield { resp: k, c: k }; break;
    case 'hotspot': for (const k of keys(q.regions)) yield { resp: k, c: k }; break;
    case 'multi': for (const s of subsets(keys(q.opts))) yield { resp: s, c: canon('multi', s) }; break;
    case 'spots': for (const s of subsets(keys(q.regions))) yield { resp: s, c: canon('spots', s) }; break;
    case 'slots': for (const combo of product(q.slots.map((s) => keys(s.opts)))) { const r = {}; q.slots.forEach((s, i) => { r[s.k] = combo[i]; }); yield { resp: r, c: canon('slots', r) }; } break;
    case 'sort': case 'match': {
      const its = keys(q.items), bins = keys(q.bins || q.choices);
      for (const combo of product(its.map(() => bins))) { const r = {}; its.forEach((k, i) => { r[k] = combo[i]; }); yield { resp: r, c: canon(q.type, r) }; }
      break;
    }
    case 'seq': for (const p of perms(keys(q.steps))) yield { resp: p, c: canon('seq', p) }; break;
    case 'num': case 'slider': { const [lo, hi, st] = q.range; for (let v = lo; v <= hi + 1e-9; v += st) { const x = Math.round(v * 100) / 100; yield { resp: x, c: numCanon(x) }; } break; }
    case 'plan': for (const f of ALL_FLAGS) yield { resp: { flags: f, touched: true }, c: f }; break;
    default: break;
  }
}

/** All responses whose hash is in q.h. */
export function solve(q, salt) {
  const hs = new Set(q.h || []); const out = [];
  for (const cand of candidates(q)) if (hs.has(answerHash(salt, q.id, cand.c))) out.push(cand);
  return out;
}

/** Human-readable text for a canonical response string, using the public question definition. */
export function describe(q, c) {
  if (c == null || c === '') return '(no response)';
  const lab = (arr, k) => { const f = (arr || []).find((x) => x[0] === k); return f ? f[1] : k; };
  try {
    switch (q.type) {
      case 'mc': case 'predict': return lab(q.opts, c);
      case 'hotspot': return lab(q.regions, c);
      case 'multi': return c.split(',').map((k) => lab(q.opts, k)).join('; ');
      case 'spots': return c.split(',').map((k) => lab(q.regions, k)).join('; ');
      case 'slots': if (!c.includes(':')) return c; return c.split('|').map((p) => { const [k, v] = p.split(':'); const s = q.slots.find((x) => x.k === k); return `${s ? s.label : k}: ${s ? lab(s.opts, v) : v}`; }).join(' | ');
      case 'sort': case 'match': if (!c.includes(':')) return c; return c.split('|').map((p) => { const [k, v] = p.split(':'); return `${lab(q.items, k)} → ${lab(q.bins || q.choices, v)}`; }).join(' | ');
      case 'seq': if (c.startsWith('demo') || c.startsWith('preview')) return c; return c.split('>').map((k, i) => `${i + 1}. ${lab(q.steps, k)}`).join(' ');
      case 'plan': return `Plan check: ${c.replace(/m(\d)v(\d)s(\d)b(\d)/, (m, a, b, s, d) => `daily minutes ${a === '1' ? '✓' : '✗'}, vigorous days ${b === '1' ? '✓' : '✗'}, muscle days ${s === '1' ? '✓' : '✗'}, bone days ${d === '1' ? '✓' : '✗'}`)}`;
      default: return c;
    }
  } catch { return c; }
}
