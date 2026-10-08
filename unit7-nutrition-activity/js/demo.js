// Offline sandbox data generator (used only when no Google Sheet is connected, so the dashboard can be explored and tested).
// Produces the same shape as the Apps Script "t_data" action. Every record is labelled DEMO DATA.
import { rng, shuffled } from './util.js';

const FIRST = ['Avery', 'Jordan', 'Riley', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Devon', 'Priya', 'Mateo', 'Amara', 'Luis', 'Mei', 'Noah', 'Zara', 'Kofi', 'Elena', 'Omar', 'Ines', 'Tariq', 'Hana', 'Diego', 'Quinn', 'Rowan', 'Sasha', 'Leilani', 'Emeka', 'Ravi'];
const LAST = ['Quill', 'Marsh', 'Okafor', 'Lindqvist', 'Reyes', 'Tanaka', 'Brightwater', 'Castellanos', 'Nguyen', 'Abernathy', 'Petrov', 'Halloran', 'Mbeki', 'Fontaine', 'Sorensen', 'Alvarado', 'Whitlock', 'Desai', 'Kowalski', 'Ferreira', 'Bellamy', 'Ishikawa', 'Montague', 'Oyelaran', 'Delacroix', 'Hartwell', 'Vasquez', 'Pemberton'];
const CONCEPT_BIAS = { 'pct-dv': -1.1, 'resilience-efficiency': -0.8, 'causal-chain': -0.7, 'plan-build': -0.5, 'dual-column': -0.4, 'emerging-tech': -0.4, 'smart-components': 0.7, 'goal-repair': 0.5, 'myplate-build': 0.5, 'macro-roles': 0.4, pqvd: 0.4 };
const BLOCK_BIAS = { 'Block 1/2': { labels: -0.1 }, 'Block 3/4': { labels: -0.5, marketing: 0.15 }, 'Block 6/7': { systems: -0.55, goals: 0.2 }, 'Block 8/9': { activity: 0.35, found: 0.2 } };
const CREDIT = [1, 0.85, 0.75];
const sig = (x) => 1 / (1 + Math.exp(-x));
const gauss = (r) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

function* qsOf(stage) { if (stage.kind === 'q') yield stage.q; else if (stage.kind === 'scene') yield* stage.qs; }
export function metaFrom(content) {
  const meta = {}, units = [];
  const addAll = (stage) => { for (const q of qsOf(stage)) meta[q.id] = { sl: q.slot || q.id, d: q.domain, c: q.concept, cn: content.concepts[q.concept].name, k: q.skill, df: q.difficulty, y: q.type, qt: q.qt, p: q.pts, mj: q.major ? 1 : 0, opts: (q.opts || q.regions || []).map((o) => o[0]) }; };
  for (const m of content.missions) for (const s of m.stages) {
    if (s.kind === 'pool') { const alts = []; for (const g of s.groups) for (const it of g.items) { addAll(it); alts.push([...qsOf(it)].map((q) => q.id)); } units.push({ p: s.groups[0].pick, a: alts }); }
    else if (s.kind !== 'choice') { addAll(s); units.push({ p: 1, a: [[...qsOf(s)].map((q) => q.id)] }); }
  }
  return { meta, units };
}

export function sandboxData(content, { count = 28, seed = 20260, blocks, domainOrder, domainNames, options }) {
  const { meta, units } = metaFrom(content), r = rng(seed), students = [], items = [];
  const per = Array.from({ length: count }, (_, i) => blocks[Math.min(blocks.length - 1, Math.floor(i * blocks.length / count))]);
  for (let s = 0; s < count; s++) {
    const block = per[s], theta = gauss(r) * 0.85 + (s % 9 === 0 ? -0.9 : 0) + (s % 11 === 0 ? 0.6 : 0), ids = [];
    for (const u of units) { const pool = u.a.slice(); for (let k = 0; k < u.p; k++) ids.push(...pool.splice(Math.floor(r() * pool.length), 1)[0]); }
    const sid = 'DEMO-' + (1000 + s), tot = { e: 0, p: 0, f: [0, 0, 0], z: 0, d: {} };
    for (const d of domainOrder) tot.d[d] = { e: 0, p: 0 };
    for (const qid of ids) {
      const m = meta[qid], z = 0.6 + theta + (CONCEPT_BIAS[m.c] || 0) + ((BLOCK_BIAS[block] || {})[m.d] || 0) - (m.df - 2) * 0.55 + gauss(r) * 0.45;
      const t1 = sig(1.5 * z + 0.3), t2 = t1 + (1 - t1) * 0.55 * sig(z + 1), t3 = t2 + (1 - t2) * 0.5 * sig(z + 0.8), u = r(), hit = u < t1 ? 1 : u < t2 ? 2 : u < t3 ? 3 : 0;
      const wrong = hit ? hit - 1 : 3, resp = [];
      for (let w = 0; w < wrong; w++) resp.push(m.opts.length ? m.opts[Math.floor(r() * m.opts.length)] : 'demo-incorrect');
      const earned = hit ? Math.round(m.p * CREDIT[hit - 1] * 100) / 100 : 0;
      if (hit) { tot.f[hit - 1]++; resp.push(''); } else tot.z++;
      tot.e += earned; tot.p += m.p; tot.d[m.d].e += earned; tot.d[m.d].p += m.p;
      items.push([sid, qid, hit ? hit : 3, earned, m.p, hit ? `Correct (attempt ${hit})` : 'Zero credit', resp[0] ?? '', resp[1] ?? '', resp[2] ?? '']);
    }
    const minutes = Math.max(33, Math.min(78, Math.round(52 - theta * 4 + gauss(r) * 6)));
    students.push({ ts: Date.now() - Math.floor(r() * 5 * 864e5), type: 'DEMO DATA', first: '[DEMO] ' + FIRST[s % FIRST.length], last: LAST[(s * 7) % LAST.length], block, assess: 'unit7-nutrition-activity', version: 'V-DEMO' + (s % 9), seed: 'demo' + s, start: 0, sub: 0, min: minutes, raw: Math.round(tot.e * 100) / 100, poss: tot.p, pct: Math.round(tot.e / tot.p * 1000) / 10,
      dom: domainOrder.map((d) => (tot.d[d].p ? Math.round(tot.d[d].e / tot.d[d].p * 1000) / 10 : null)), f1: tot.f[0], f2: tot.f[1], f3: tot.f[2], zero: tot.z, status: 'Submitted', review: 'OK', dupOf: '', integ: 'DEMO DATA', sid, conf: 'DEMO', counted: 0, choices: '{}' });
  }
  return { ok: true, students, items, meta: Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, { ...v, x: '' }])), domainOrder, domainNames, blocks, options };
}
