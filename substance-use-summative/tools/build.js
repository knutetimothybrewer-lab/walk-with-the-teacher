// Build: authoring/*.js (has answers)  ->  content/public.js (no answers; hashed keys)
//                                       ->  google-apps-script/KeyData.gs (server-side scoring key)
//                                       ->  teacher-private/*.md (blueprint, question bank, answer key)
// Usage: node tools/build.js [--strip]   (--strip: server-grading build; no hashes/explanations in the public bundle)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canon, answerHash } from '../js/canon.js';
import { obf } from '../js/obf.js';
import { passingPaths } from '../js/chatmodel.js';
import { sha256 } from '../js/sha256.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strip = process.argv.includes('--strip');
const VERSION = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const saltFile = path.join(root, 'authoring', 'salt.txt');
if (!fs.existsSync(saltFile)) fs.writeFileSync(saltFile, sha256(String(Date.now()) + Math.random()).slice(0, 24) + '\n');
const SALT = fs.readFileSync(saltFile, 'utf8').trim();

const mods = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];
const missions = [];
for (const m of mods) missions.push((await import(`../authoring/${m}.js`)).default);
const chat = (await import('../authoring/chat.js')).default;

const errors = [], warns = [];
const err = (m) => errors.push(m);

// ---- walk helpers --------------------------------------------------------------------------------------
function* stagesIn(stages) { for (const s of stages) { yield s; if (s.kind === 'pool') for (const g of s.groups) yield* stagesIn(g.items); } }
function* qsOf(stage) { if (stage.kind === 'q') yield stage.q; else if (stage.kind === 'scene') yield* stage.qs; }
function* allQs(mission) { for (const s of stagesIn(mission.stages)) yield* qsOf(s); }

// ---- validation ----------------------------------------------------------------------------------------
const keys = (arr) => arr.map((x) => x[0]);
function validate(q) {
  const where = `[${q.id}]`;
  const need = (c, m) => { if (!c) err(`${where} ${m}`); };
  need(q.id && q.domain && q.type && q.lvl && q.pts > 0 && q.prompt, 'missing basic fields');
  switch (q.type) {
    case 'mc': case 'predict': need(keys(q.opts).includes(q.ans), 'ans not in opts'); break;
    case 'multi': need(Array.isArray(q.ans) && q.ans.length && q.ans.every((a) => keys(q.opts).includes(a)), 'bad multi ans'); break;
    case 'sort': case 'match': {
      const ik = keys(q.items), ck = keys(q.bins || q.choices);
      need(ik.length === Object.keys(q.ans).length && ik.every((k) => q.ans[k]), 'ans must cover all items');
      need(Object.values(q.ans).every((v) => ck.includes(v)), 'ans value not in bins/choices');
      break;
    }
    case 'slots':
      need(q.slots.every((s) => q.ans[s.k] && keys(s.opts).includes(q.ans[s.k])), 'bad slots ans'); break;
    case 'seq': {
      const sk = keys(q.steps);
      need(q.ans.length === sk.length && sk.every((k) => q.ans.includes(k)), 'seq ans must be a permutation'); break;
    }
    case 'pick': {
      const sk = keys(q.steps);
      need(q.ans.length === q.need && q.ans.every((k) => sk.includes(k)), 'pick ans invalid'); break;
    }
    case 'hotspot': need(keys(q.regions).includes(q.ans), 'ans not in regions'); break;
    case 'run': break;
    default: err(`${where} unknown type ${q.type}`);
  }
  need(q.type === 'run' ? q.explain : q.explain, 'missing explanation');
}

// ---- collect + checks -----------------------------------------------------------------------------------
const seen = new Set();
const all = [];
for (const mi of missions) for (const st of stagesIn(mi.stages)) for (const q of qsOf(st)) {
  if (seen.has(q.id)) err(`duplicate id ${q.id}`);
  seen.add(q.id); validate(q); q.mission = mi.id; q.stageKey = st.kind === 'q' ? st.q.id : st.id; all.push(q);
}

// pool fairness: all items in a group must be equal in points and domain mix
function itemPts(stage) { let p = 0; for (const q of qsOf(stage)) p += q.pts; return p; }
function itemSec(stage) { let p = 0; for (const q of qsOf(stage)) p += q.sec; return p; }
const versionStats = { min: 0, max: 0, secMin: 0, secMax: 0 };
function poolRange(stages) {
  let min = 0, max = 0, smin = 0, smax = 0;
  for (const s of stages) {
    if (s.kind === 'pool') {
      for (const g of s.groups) {
        const ps = g.items.map(itemPts), ss = g.items.map(itemSec);
        if (new Set(ps).size > 1) err(`pool ${s.id}: items in a group differ in points (${ps.join(',')})`);
        const mn = Math.min(...ps), mx = Math.max(...ps);
        min += mn * g.pick; max += mx * g.pick;
        smin += Math.min(...ss) * g.pick; smax += Math.max(...ss) * g.pick;
      }
    } else { const p = itemPts(s), t = itemSec(s); min += p; max += p; smin += t; smax += t; }
  }
  return { min, max, smin, smax };
}
const perMission = {};
for (const mi of missions) { perMission[mi.id] = poolRange(mi.stages); versionStats.min += perMission[mi.id].min; versionStats.max += perMission[mi.id].max; versionStats.secMin += perMission[mi.id].smin; versionStats.secMax += perMission[mi.id].smax; }

// ---- answer-position / length-bias heuristics -----------------------------------------------------------
let mcN = 0, longest = 0, hedgy = 0; const biased = [];
for (const q of all) if (q.type === 'mc' && !q.fixedOrder && q.opts.length >= 3) {
  mcN++;
  const lens = q.opts.map((o) => o[1].length), ci = keys(q.opts).indexOf(q.ans);
  const max = Math.max(...lens), others = lens.filter((_, i) => i !== ci);
  const avgOther = others.reduce((a, b) => a + b, 0) / others.length;
  if (lens[ci] === max) longest++;
  if (lens[ci] > 1.45 * avgOther) biased.push(`${q.id} (${lens[ci]} vs avg ${Math.round(avgOther)})`);
}

// ---- hashes ---------------------------------------------------------------------------------------------
function hashesFor(q) {
  if (q.type === 'run') return passingPaths(chat).map((p) => answerHash(SALT, q.id, canon('run', p)));
  return [answerHash(SALT, q.id, canon(q.type, q.ans))];
}

// ---- public content -------------------------------------------------------------------------------------
const PUBLIC_Q = ['id', 'domain', 'topic', 'type', 'lvl', 'pts', 'sec', 'prompt', 'stim', 'opts', 'items', 'bins', 'choices', 'steps', 'slots', 'regions', 'diagram', 'layout', 'need', 'after', 'pin', 'fixedOrder', 'chat'];
function pubQ(q) {
  const o = {};
  for (const k of PUBLIC_Q) if (q[k] !== undefined) o[k] = q[k];
  if (!strip) { o.h = hashesFor(q); o.x = obf(q.explain, SALT + q.id); }
  return o;
}
function pubStage(s) {
  if (s.kind === 'q') return { kind: 'q', block: s.block, q: pubQ(s.q) };
  if (s.kind === 'scene') return { kind: 'scene', scene: s.scene, id: s.id, title: s.title, lead: s.lead, cfg: s.cfg, qs: s.qs.map(pubQ), block: s.block };
  if (s.kind === 'pool') return { kind: 'pool', id: s.id, groups: s.groups.map((g) => ({ pick: g.pick, items: g.items.map(pubStage) })) };
  throw new Error('stage kind ' + s.kind);
}
const pub = {
  version: VERSION, salt: SALT, mode: strip ? 'server' : 'local',
  missions: missions.map((m) => ({ id: m.id, num: m.num, title: m.title, theme: m.theme, est: m.est, kicker: m.kicker, blurb: m.blurb, stages: m.stages.map(pubStage) })),
  chat
};
if (errors.length) { console.error('BUILD FAILED:\n' + errors.join('\n')); process.exit(1); }
fs.writeFileSync(path.join(root, 'content', 'public.js'), '// GENERATED by tools/build.js. Do not edit by hand.\nexport default ' + JSON.stringify(pub) + ';\n');

// ---- Apps Script key ------------------------------------------------------------------------------------
const keyObj = {};
for (const q of all) keyObj[q.id] = { d: q.domain, t: q.topic, y: q.type, p: q.pts, m: q.mission, s: q.stageKey, h: hashesFor(q), x: q.explain };
const gs = `// GENERATED by tools/build.js. Paste this whole file into your Apps Script project as KeyData.gs.
// Contains the scoring key (hashed answers). Keep this out of any public place.
var KEY_SALT = ${JSON.stringify(SALT)};
var CONTENT_VERSION = ${JSON.stringify(VERSION)};
var KEY = ${JSON.stringify(keyObj)};
`;
fs.writeFileSync(path.join(root, 'google-apps-script', 'KeyData.gs'), gs);

// ---- teacher docs ---------------------------------------------------------------------------------------
const LVL = { R: 'Remember', I: 'Understand', AP: 'Apply', AN: 'Analyze/Evaluate' };
const LVLGRP = { R: 'Recall/recognition', I: 'Interpretation', AP: 'Application', AN: 'Analysis/evaluation' };
const { DOMAIN_NAME } = await import('../js/scoring.js');
const answerText = (q) => {
  const opt = (arr, k) => (arr.find((o) => o[0] === k) || [k, k])[1];
  switch (q.type) {
    case 'mc': case 'predict': return opt(q.opts, q.ans);
    case 'multi': return q.ans.map((k) => opt(q.opts, k)).join(' | ');
    case 'sort': case 'match': return q.items.map(([k, t]) => `${t} → ${opt(q.bins || q.choices, q.ans[k])}`).join(' | ');
    case 'slots': return q.slots.map((s) => `${s.label}: ${opt(s.opts, q.ans[s.k])}`).join(' | ');
    case 'seq': case 'pick': return q.ans.map((k, i) => `${i + 1}. ${opt(q.steps, k)}`).join(' | ');
    case 'hotspot': return opt(q.regions, q.ans);
    case 'run': return `Complete the conversation with no unsafe choices and final meters Safety ≥ ${chat.pass.minSafety}, Support ≥ ${chat.pass.minSupport}, Pressure ≤ ${chat.pass.maxPressure} (${passingPaths(chat).length} qualifying paths)`;
  }
};
const poolOf = {};
for (const mi of missions) for (const s of stagesIn(mi.stages)) if (s.kind === 'pool') for (const g of s.groups) for (const it of g.items) for (const q of qsOf(it)) poolOf[q.id] = `${s.id}`;
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const tot = { byLvl: {}, byDomain: {}, pts: 0 };
let bp = `# Assessment blueprint (CONTAINS THE ANSWER KEY. Do not publish.)\n\nGenerated by \`npm run build\` from \`authoring/\`. Content version **${VERSION}**.\n\n`;
bp += `Every student receives a version worth **${versionStats.min === versionStats.max ? versionStats.min : versionStats.min + '–' + versionStats.max} points**. Estimated working time: **${Math.round(versionStats.secMin / 60)}–${Math.round(versionStats.secMax / 60)} minutes** (item estimates) plus orientation.\n\n`;
bp += `| ID | Mission | Pool | Domain | Learning objective | Type | Level | DOK | Pts | Est. sec | Correct answer / scoring rule | Misconception tested |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const q of all) {
  bp += `| ${q.id} | ${q.mission} | ${poolOf[q.id] || ''} | ${DOMAIN_NAME[q.domain]} | ${esc(q.lo)} | ${q.type} | ${LVL[q.lvl]} | ${q.dok} | ${q.pts} | ${q.sec} | ${esc(answerText(q))} | ${esc(q.misc || '')} |\n`;
}
// expected-version distribution (every pool item counted at its weight within the pick)
const weight = {};
for (const mi of missions) for (const s of mi.stages) {
  if (s.kind === 'pool') for (const g of s.groups) for (const it of g.items) for (const q of qsOf(it)) weight[q.id] = g.pick / g.items.length;
}
for (const q of all) {
  const w = weight[q.id] ?? 1;
  tot.pts += q.pts * w;
  tot.byLvl[q.lvl] = (tot.byLvl[q.lvl] || 0) + q.pts * w;
  tot.byDomain[q.domain] = (tot.byDomain[q.domain] || 0) + q.pts * w;
}
bp += `\n## Coverage and balance (expected points per student version)\n\n| Cognitive demand | Points | Share | Target |\n|---|---|---|---|\n`;
const target = { R: 15, I: 25, AP: 35, AN: 25 };
for (const k of ['R', 'I', 'AP', 'AN']) bp += `| ${LVLGRP[k]} | ${(tot.byLvl[k] || 0).toFixed(1)} | ${((tot.byLvl[k] || 0) / tot.pts * 100).toFixed(0)}% | ${target[k]}% |\n`;
bp += `\n| Content domain | Points | Share |\n|---|---|---|\n`;
for (const d of Object.keys(DOMAIN_NAME)) bp += `| ${DOMAIN_NAME[d]} | ${(tot.byDomain[d] || 0).toFixed(1)} | ${((tot.byDomain[d] || 0) / tot.pts * 100).toFixed(0)}% |\n`;
const typeCount = {}; for (const q of all) typeCount[q.type] = (typeCount[q.type] || 0) + 1;
bp += `\n| Interaction type | Items in bank |\n|---|---|\n` + Object.entries(typeCount).map(([k, v]) => `| ${k} | ${v} |`).join('\n') + '\n';
bp += `\n## Per-mission points and time\n\n| Mission | Points | Estimated minutes |\n|---|---|---|\n`;
for (const mi of missions) { const r = perMission[mi.id]; bp += `| ${mi.kicker}: ${mi.title} | ${r.min === r.max ? r.min : r.min + '–' + r.max} | ${(r.smin / 60).toFixed(1)}–${(r.smax / 60).toFixed(1)} |\n`; }
fs.mkdirSync(path.join(root, 'teacher-private'), { recursive: true });
fs.writeFileSync(path.join(root, 'teacher-private', 'BLUEPRINT.md'), bp);

let qb = `# Question bank and answer key (CONTAINS ANSWERS. Do not publish.)\n\nAll ${all.length} scorable items, including every pool alternative.\n`;
for (const mi of missions) {
  qb += `\n## ${mi.kicker}: ${mi.title}\n`;
  for (const q of allQs(mi)) {
    qb += `\n### ${q.id}  •  ${DOMAIN_NAME[q.domain]}  •  ${q.type}  •  ${q.pts} pt${q.pts > 1 ? 's' : ''}${poolOf[q.id] ? '  •  pool: ' + poolOf[q.id] : ''}\n\n`;
    if (q.stim) {
      const s = q.stim;
      if (s.title) qb += `**${s.title}**\n\n`;
      for (const p of s.paras || []) qb += `> ${p}\n>\n`;
      if (s.quote) qb += `> ${s.quote.who}: “${s.quote.text}”\n\n`;
      if (s.table) qb += `> Table: ${s.table.rows.map((r) => r.join(' = ')).join('; ')}\n\n`;
    }
    qb += `${q.prompt}\n\n`;
    const list = q.opts || q.choices || q.steps || q.items || [];
    for (const [k, t] of list) qb += `- (${k}) ${t}${(q.type === 'mc' || q.type === 'predict') && k === q.ans ? '  **← correct**' : ''}${q.type === 'multi' && q.ans.includes(k) ? '  **← correct**' : ''}\n`;
    qb += `\n**Answer:** ${answerText(q)}\n\n**Why:** ${q.explain}\n`;
  }
}
fs.writeFileSync(path.join(root, 'teacher-private', 'QUESTION_BANK.md'), qb);

// ---- report ---------------------------------------------------------------------------------------------
console.log(`Built ${all.length} items in ${missions.length} missions (${strip ? 'server' : 'local'} grading build).`);
console.log(`Points per version: ${versionStats.min}${versionStats.min === versionStats.max ? '' : '..' + versionStats.max}; time ${Math.round(versionStats.secMin / 60)}-${Math.round(versionStats.secMax / 60)} min`);
console.log('Per mission:', Object.entries(perMission).map(([k, v]) => `${k}=${v.min === v.max ? v.min : v.min + '-' + v.max}pts/${(v.smin / 60).toFixed(1)}min`).join('  '));
console.log('Cognitive demand:', ['R', 'I', 'AP', 'AN'].map((k) => `${k} ${(tot.byLvl[k] / tot.pts * 100).toFixed(0)}% (target ${target[k]}%)`).join(', '));
console.log('Domains:', Object.keys(DOMAIN_NAME).map((d) => `${d} ${(tot.byDomain[d] / tot.pts * 100).toFixed(0)}%`).join(', '));
console.log(`MC length bias: correct option is the longest in ${longest}/${mcN}; much longer than the rest in ${biased.length}: ${biased.join('; ')}`);
