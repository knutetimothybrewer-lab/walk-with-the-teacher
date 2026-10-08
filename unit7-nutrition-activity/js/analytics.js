// Deterministic teacher analytics (no AI, no network). Everything is computed from submitted results and question metadata.
// Input shape = what the Apps Script "t_data" action returns: { students, items, meta, domainOrder, domainNames, blocks, options }.

export const ALL = 'All Classes';
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Students that count toward statistics for a view. */
export function counted(data, { block = ALL, showDemo = false } = {}) {
  return data.students.filter((s) => s.status === 'Submitted' && (s.review === 'OK' || s.review === 'DUPLICATE: ACCEPTED') && (s.type === 'LIVE' || showDemo) && (block === ALL || s.block === block));
}

export function summary(rows, opts) {
  const pcts = rows.map((s) => s.pct), n = rows.length;
  const strong = rows.filter((s) => s.pct >= opts.strongAt).length, support = rows.filter((s) => s.pct < opts.developingAt).length;
  return { n, avg: r1(avg(pcts)), median: r1(median(pcts)), max: n ? Math.max(...pcts) : null, min: n ? Math.min(...pcts) : null, avgMin: r1(avg(rows.map((s) => s.min))),
    mastery: strong, masteryPct: n ? r1(strong / n * 100) : null, support, supportPct: n ? r1(support / n * 100) : null };
}
export function domainMeans(rows, order) {
  return order.map((_, i) => r1(avg(rows.map((s) => s.dom[i]).filter((v) => v != null))));
}
/** Share of questions answered correctly on the first attempt. */
export function firstAttemptAccuracy(rows) {
  const q = rows.reduce((a, s) => a + s.f1 + s.f2 + s.f3 + s.zero, 0);
  return q ? r1(rows.reduce((a, s) => a + s.f1, 0) / q * 100) : null;
}

/** Per-slot (logical question) statistics for the given set of student session ids. */
export function itemStats(data, sids) {
  const set = new Set(sids), by = {};
  for (const it of data.items) {
    if (!set.has(it[0])) continue;
    const [, qid, used, earned, poss, result, a1, a2, a3] = it, m = data.meta[qid]; if (!m) continue;
    const o = by[m.sl] || (by[m.sl] = { slot: m.sl, domain: m.d, concept: m.c, conceptName: m.cn, skill: m.k, qt: m.qt, type: m.y, difficulty: m.df, major: m.mj, n: 0, first: 0, eventually: 0, zero: 0, earned: 0, poss: 0, attempts: 0, ids: {}, wrong: {} });
    o.n++; o.earned += earned; o.poss += poss; o.attempts += used;
    if (result === 'Correct (attempt 1)') { o.first++; o.eventually++; } else if (String(result).startsWith('Correct')) o.eventually++; else o.zero++;
    const hitN = /attempt (\d)/.exec(result); const wrongN = hitN ? Number(hitN[1]) - 1 : used;
    [a1, a2, a3].slice(0, Math.max(0, wrongN)).forEach((c) => { if (c !== '' && c != null) { const w = o.wrong[qid] || (o.wrong[qid] = {}); w[c] = (w[c] || 0) + 1; } });
    o.ids[qid] = (o.ids[qid] || 0) + 1;
  }
  return Object.values(by).map((o) => ({ ...o, firstPct: r1(o.first / o.n * 100), eventualPct: r1(o.eventually / o.n * 100), zeroPct: r1(o.zero / o.n * 100), avgPts: o.poss ? r1(o.earned / o.poss * 100) : null, avgAttempts: Math.round(o.attempts / o.n * 100) / 100 }));
}
export const sortItems = (list, key, dir = 'asc') => [...list].sort((a, b) => ((a[key] ?? 0) - (b[key] ?? 0)) * (dir === 'asc' ? 1 : -1) || a.slot.localeCompare(b.slot));
/** Most missed = lowest first-attempt rate, ties broken by highest zero-credit rate. */
export function mostMissed(stats, k = 8) { return [...stats].filter((s) => s.n > 0).sort((a, b) => a.firstPct - b.firstPct || b.zeroPct - a.zeroPct || a.slot.localeCompare(b.slot)).slice(0, k); }

/**
 * "What should I reteach?" Concepts ranked by share of available points earned (weakest first). Deterministic: built only from
 * question metadata (concept, skill, question type) and student performance. concepts = content.concepts registry.
 */
export function reteach(stats, concepts, { k = 5, minResponses = 3, scope = ALL } = {}) {
  const by = {};
  for (const s of stats) { const o = by[s.concept] || (by[s.concept] = { concept: s.concept, n: 0, earned: 0, poss: 0, zero: 0, items: [] }); o.n += s.n; o.earned += s.earned; o.poss += s.poss; o.zero += s.zero; o.items.push(s); }
  return Object.values(by).filter((o) => o.n >= minResponses && o.poss > 0).map((o) => ({ ...o, pct: r1(o.earned / o.poss * 100) })).sort((a, b) => a.pct - b.pct || a.concept.localeCompare(b.concept)).slice(0, k).map((o, i) => {
    const weakest = [...o.items].sort((a, b) => a.firstPct - b.firstPct)[0], c = concepts[o.concept] || { name: o.concept, tip: '', domain: '', struggle: '' };
    return { priority: i + 1, concept: o.concept, name: c.name, domain: c.domain, scope, pct: o.pct, zeroPct: r1(o.zero / o.n * 100), responses: o.n, tip: c.tip,
      weakest: `${weakest.qt} item (${weakest.skill}); ${weakest.firstPct}% correct on the first attempt, ${weakest.zeroPct}% earned zero`,
      struggle: c.struggle, text: `Priority ${i + 1}: ${c.name}. ${scope} average: ${o.pct}%. Students particularly struggled with ${c.struggle || 'this concept'}. ${c.tip}` };
  });
}

export function compareBlocks(data, opts) {
  return data.blocks.map((b) => { const rows = counted(data, { block: b, showDemo: opts.showDemo }), s = summary(rows, opts); return { block: b, n: s.n, avg: s.avg, domains: domainMeans(rows, data.domainOrder), avgMin: s.avgMin, firstAcc: firstAttemptAccuracy(rows) }; });
}

/** Detail for one student: domain bars, attempt counts, zero-credit questions and responses to major simulations/scenarios. */
export function studentReport(data, sid) {
  const s = data.students.find((x) => x.sid === sid); if (!s) return null;
  const items = data.items.filter((it) => it[0] === sid).map((it) => ({ qid: it[1], used: it[2], earned: it[3], poss: it[4], result: it[5], resp: [it[6], it[7], it[8]], meta: data.meta[it[1]] }));
  return { student: s, items, zero: items.filter((i) => i.result === 'Zero credit'), a1: items.filter((i) => i.result === 'Correct (attempt 1)'), a2: items.filter((i) => i.result === 'Correct (attempt 2)'), a3: items.filter((i) => i.result === 'Correct (attempt 3)'), major: items.filter((i) => i.meta && i.meta.mj) };
}

// ---- CSV ------------------------------------------------------------------------------------------------------
const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
export const toCsv = (header, rows) => '﻿' + [header, ...rows].map((r) => r.map(q).join(',')).join('\r\n');
export function masterCsv(data, rows) {
  const d = data.domainOrder.map((k) => data.domainNames[k] + ' %');
  return toCsv(['Submission time', 'Record type', 'First name', 'Last name', 'Class block', 'Assessment version', 'Seed', 'Start time', 'Duration (min)', 'Raw points', 'Points possible', 'Final %', ...d, '1st-attempt correct', '2nd-attempt correct', '3rd-attempt correct', 'Zero-credit', 'Status', 'Review status'],
    rows.map((s) => [s.sub, s.type, s.first, s.last, s.block, s.version, s.seed, s.start, s.min, s.raw, s.poss, s.pct, ...s.dom, s.f1, s.f2, s.f3, s.zero, s.status, s.review]));
}
export const gradeCsv = (rows) => toCsv(['Student Last Name', 'Student First Name', 'Block', 'Final Percentage'], [...rows].sort((a, b) => a.block.localeCompare(b.block) || a.last.localeCompare(b.last) || a.first.localeCompare(b.first)).map((s) => [s.last, s.first, s.block, s.pct]));
