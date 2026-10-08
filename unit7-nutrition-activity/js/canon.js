// Canonical form of a response, shared by the browser, the build tool and (ported) the Apps Script.
// A "response" is whatever the item renderer produces; the canonical string is what gets hashed.
import { sha256 } from './sha256.js';

export const numCanon = (x) => String(Math.round(Number(x) * 100) / 100);

export function canon(type, r) {
  switch (type) {
    case 'mc': case 'hotspot': case 'predict':
      return String(r);
    case 'multi': case 'spots':
      return [...r].map(String).sort().join(',');
    case 'sort': case 'match': case 'slots':
      return Object.keys(r).sort().map((k) => k + ':' + r[k]).join('|');
    case 'seq': case 'pick':
      return [...r].map(String).join('>');
    case 'num': case 'slider':
      return numCanon(r);
    case 'plan':
      return String(r && r.flags);
    default:
      throw new Error('Unknown item type: ' + type);
  }
}

export const answerHash = (salt, id, canonical) => sha256(salt + '|' + id + '|' + canonical).slice(0, 20);

// Is the response complete enough to enable the CHECK button?
export function isComplete(q, r) {
  if (r == null) return false;
  switch (q.type) {
    case 'mc': case 'hotspot': case 'predict': return typeof r === 'string' && r !== '';
    case 'multi': case 'spots': return Array.isArray(r) && r.length > 0;
    case 'sort': case 'match': return q.items.every(([k]) => r[k]);
    case 'slots': return q.slots.every((s) => r[s.k]);
    case 'seq': return Array.isArray(r) && r.length === q.steps.length;
    case 'pick': return Array.isArray(r) && r.length === q.need;
    case 'num': return r !== '' && Number.isFinite(Number(r));
    case 'slider': return Number.isFinite(Number(r));
    case 'plan': return !!(r && r.flags && r.touched);
    default: return false;
  }
}
