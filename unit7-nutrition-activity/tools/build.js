// Build: authoring/*.js (has answers)  ->  content/public.js (no answers; hashed keys)
//                                       ->  google-apps-script/KeyData.gs (server-side scoring key)
//                                       ->  teacher-private/*.md (answer key + item map)
// Usage: node tools/build.js [--strip]   (--strip: server-grading build; no hashes/explanations in the public bundle)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canon, answerHash } from '../js/canon.js';
import { obf } from '../js/obf.js';
import { sha256 } from '../js/sha256.js';
import { solve } from '../js/solve.js';
import { DOMAIN_NAME } from '../js/scoring.js';
import { CONCEPTS, LVL_NAME } from '../authoring/lib.js';
import { blueprint } from './blueprint.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const saltFile = path.join(root, 'authoring', 'salt.txt');
if (!fs.existsSync(saltFile)) fs.writeFileSync(saltFile, sha256(String(Date.now()) + Math.random()).slice(0, 24) + '\n');
const SALT = fs.readFileSync(saltFile, 'utf8').trim();

const mods = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'];
const missions = [];
for (const m of mods) missions.push((await import(`../authoring/${m}.js`)).default);

const errors = [];
const err = (m) => errors.push(m);

// ---- walk helpers --------------------------------------------------------------------------------------
function* stagesIn(stages) { for (const s of stages) { yield s; if (s.kind === 'pool') for (const g of s.groups) yield* stagesIn(g.items); } }
function* qsOf(stage) { if (stage.kind === 'q') yield stage.q; else if (stage.kind === 'scene') yield* stage.qs; }
function* allQs(mission) { for (const s of stagesIn(mission.stages)) yield* qsOf(s); }
const stageKeyOf = (s) => (s.kind === 'q' ? s.q.id : s.id);

// ---- validation ----------------------------------------------------------------------------------------
const keys = (arr) => arr.map((x) => x[0]);
const TYPES = ['mc', 'multi', 'sort', 'match', 'slots', 'seq', 'hotspot', 'spots', 'slider', 'num', 'plan'];
function validate(q) {
  const where = `[${q.id}]`;
  const need = (c, m) => { if (!c) err(`${where} ${m}`); };
  need(q.id && q.domain && q.type && q.lvl && q.pts > 0 && q.prompt, 'missing basic fields');
  need(DOMAIN_NAME[q.domain], 'unknown domain');
  need(CONCEPTS[q.concept], 'unknown concept ' + q.concept);
  need(CONCEPTS[q.concept] && CONCEPTS[q.concept][0] === q.domain, 'concept domain mismatch');
  need(['K', 'AP', 'AN', 'SY'].includes(q.lvl), 'bad lvl');
  need(q.skill && q.difficulty >= 1 && q.difficulty <= 3 && q.qt, 'missing skill/difficulty/qt');
  need(Array.isArray(q.hints) && q.hints.length >= 1, 'needs at least one hint');
  need(q.explain, 'missing explanation');
  need(TYPES.includes(q.type), 'unknown type ' + q.type);
  switch (q.type) {
    case 'mc': need(keys(q.opts).includes(q.ans), 'ans not in opts'); break;
    case 'multi': need(Array.isArray(q.ans) && q.ans.length && q.ans.every((a) => keys(q.opts).includes(a)), 'bad multi ans'); break;
    case 'spots': need(Array.isArray(q.ans) && q.ans.length && q.ans.every((a) => keys(q.regions).includes(a)), 'bad spots ans'); break;
    case 'sort': case 'match': {
      const ik = keys(q.items), ck = keys(q.bins || q.choices);
      need(ik.length === Object.keys(q.ans).length && ik.every((k) => q.ans[k]), 'ans must cover all items');
      need(Object.values(q.ans).every((v) => ck.includes(v)), 'ans value not in bins/choices');
      break;
    }
    case 'slots': need(q.slots.every((s) => q.ans[s.k] && keys(s.opts).includes(q.ans[s.k])), 'bad slots ans'); break;
    case 'seq': { const sk = keys(q.steps); need(q.ans.length === sk.length && sk.every((k) => q.ans.includes(k)), 'seq ans must be a permutation'); break; }
    case 'hotspot': need(keys(q.regions).includes(q.ans), 'ans not in regions'); break;
    case 'num': case 'slider': {
      const arr = Array.isArray(q.ans) ? q.ans : [q.ans];
      need(Array.isArray(q.range) && q.range.length === 3, 'needs range [lo,hi,step]');
      need(arr.every((a) => a >= q.range[0] && a <= q.range[1]), 'ans outside range');
      break;
    }
    case 'plan': need(q.plan && q.plan.blocks, 'plan spec missing'); break;
    default: break;
  }
}

// ---- collect + checks -----------------------------------------------------------------------------------
// ---- time estimate (replaces hand-typed seconds): reading + interaction + thinking + 12% for re-attempts -------------
const words = (x) => (x ? String(typeof x === 'string' ? x : JSON.stringify(x)).replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean).length : 0);
function estSec(q) {
  const read = (words(q.prompt) + words(q.stim && { a: q.stim.title, b: q.stim.paras, c: q.stim.table, d: q.stim.quote }) + words(q.opts) * 0.7 + words(q.items) + words(q.choices) * 0.5 + words(q.steps) + words(q.slots) * 0.5) / 4.0;
  const act = { mc: 10, multi: 18, sort: 6 * (q.items || []).length, match: 5 * (q.items || []).length, slots: 9 * (q.slots || []).length, seq: 7 * (q.steps || []).length, hotspot: 10, spots: 25, num: 18, slider: 14, plan: 110 }[q.type] || 12;
  const think = [0, 4, 10, 20][q.difficulty] || 10;
  return Math.round((read + act + think) * 1.12);
}
const SCENE_SEC = { labelsim: 100, grocery: 90, intensity: 90, market: 80, foodsys: 80 };
const seen = new Set();
const all = [];
for (const mi of missions) for (const st of stagesIn(mi.stages)) for (const q of qsOf(st)) {
  if (seen.has(q.id)) err(`duplicate id ${q.id}`);
  q.sec = estSec(q); seen.add(q.id); validate(q); q.mission = mi.id; q.stageKey = stageKeyOf(st); all.push(q);
}

// pool fairness: all alternatives must be equal in points; branch groups must total the same points
const itemPts = (stage) => { let p = 0; for (const q of qsOf(stage)) p += q.pts; return p; };
const itemSec = (stage) => { let p = stage.kind === 'scene' ? SCENE_SEC[stage.scene] || 90 : 0; for (const q of qsOf(stage)) p += q.sec; return p; };
function poolRange(stages) {
  let min = 0, max = 0, smin = 0, smax = 0;
  for (const s of stages) {
    if (s.kind === 'pool') {
      const gTot = [], gSec = [];
      for (const g of s.groups) {
        const ps = g.items.map(itemPts), ss = g.items.map(itemSec);
        if (new Set(ps).size > 1) err(`pool ${s.id}: items in a group differ in points (${ps.join(',')})`);
        gTot.push(ps[0] * g.pick); gSec.push([Math.min(...ss) * g.pick, Math.max(...ss) * g.pick]);
      }
      if (new Set(gTot).size > 1) err(`pool ${s.id}: branch groups differ in total points (${gTot.join(',')})`);
      min += gTot[0]; max += gTot[0];
      smin += Math.min(...gSec.map((x) => x[0])); smax += Math.max(...gSec.map((x) => x[1]));
    } else if (s.kind === 'choice') { smin += 15; smax += 15; }
    else { const p = itemPts(s), t = itemSec(s); min += p; max += p; smin += t; smax += t; }
  }
  return { min, max, smin, smax };
}
const versionStats = { min: 0, max: 0, secMin: 0, secMax: 0 };
const perMission = {};
for (const mi of missions) { const r = perMission[mi.id] = poolRange(mi.stages); versionStats.min += r.min; versionStats.max += r.max; versionStats.secMin += r.smin; versionStats.secMax += r.smax; }
if (versionStats.min !== 100 || versionStats.max !== 100) err(`each student version must total 100 points (got ${versionStats.min}..${versionStats.max})`);

// answer-length bias heuristic (multiple choice)
let mcN = 0, longest = 0; const biased = [];
for (const q of all) if (q.type === 'mc' && !q.fixedOrder && q.opts.length >= 3) {
  mcN++;
  const lens = q.opts.map((o) => o[1].length), ci = keys(q.opts).indexOf(q.ans);
  const others = lens.filter((_, i) => i !== ci), avgOther = others.reduce((a, b) => a + b, 0) / others.length;
  if (lens[ci] === Math.max(...lens)) longest++;
  if (lens[ci] > 1.6 * avgOther) biased.push(`${q.id} (${lens[ci]} vs avg ${Math.round(avgOther)})`);
}

// ---- hashes ---------------------------------------------------------------------------------------------
function hashesFor(q) {
  if (q.type === 'num' || q.type === 'slider') return (Array.isArray(q.ans) ? q.ans : [q.ans]).map((a) => answerHash(SALT, q.id, canon(q.type, a)));
  if (q.type === 'plan') return [answerHash(SALT, q.id, 'm1v1s1b1')];
  return [answerHash(SALT, q.id, canon(q.type, q.ans))];
}

// ---- public content -------------------------------------------------------------------------------------
const PUBLIC_Q = ['id', 'slot', 'domain', 'concept', 'skill', 'difficulty', 'qt', 'type', 'lvl', 'pts', 'sec', 'major', 'prompt', 'stim', 'opts', 'items', 'bins', 'choices', 'steps', 'slots', 'regions', 'need', 'after', 'pin', 'fixedOrder', 'range', 'unit', 'plan', 'plate', 'goalPreview', 'hints'];
function pubQ(q, strip) {
  const o = {};
  for (const k of PUBLIC_Q) if (q[k] !== undefined) o[k] = q[k];
  if (!strip) { o.h = hashesFor(q); o.x = obf(q.explain, SALT + q.id); }
  return o;
}
function pubStage(s, strip) {
  if (s.kind === 'q') return { kind: 'q', block: s.block, q: pubQ(s.q, strip) };
  if (s.kind === 'scene') return { kind: 'scene', scene: s.scene, id: s.id, title: s.title, lead: s.lead, cfg: s.cfg, qs: s.qs.map((q) => pubQ(q, strip)), block: s.block };
  if (s.kind === 'choice') return { kind: 'choice', id: s.id, block: s.block, title: s.title, paras: s.paras, prompt: s.prompt, opts: s.opts };
  if (s.kind === 'pool') return { kind: 'pool', id: s.id, by: s.by, groups: s.groups.map((g) => ({ when: g.when, pick: g.pick, items: g.items.map((it) => pubStage(it, strip)) })) };
  throw new Error('stage kind ' + s.kind);
}
const concepts = Object.fromEntries(Object.entries(CONCEPTS).map(([k, v]) => [k, { domain: v[0], name: v[1], tip: v[2], struggle: v[3] }]));
const makePub = (strip) => ({
  version: VERSION, salt: SALT, mode: strip ? 'server' : 'local', concepts,
  missions: missions.map((m) => ({ id: m.id, num: m.num, title: m.title, theme: m.theme, est: m.est, kicker: m.kicker, blurb: m.blurb, stages: m.stages.map((st) => pubStage(st, strip)) }))
});
const pub = makePub(false), pubServer = makePub(true);

// ---- self-check: the solver must recover the authored answer from the public hashes --------------------------
{
  const pubQs = []; (function walk(stages) { for (const s of stages) { if (s.kind === 'pool') s.groups.forEach((g) => walk(g.items)); else if (s.kind === 'q') pubQs.push(s.q); else if (s.kind === 'scene') pubQs.push(...s.qs); } })(pub.missions.flatMap((m) => m.stages));
  for (const q of pubQs) {
    const found = solve(q, SALT);
    const src = all.find((x) => x.id === q.id);
    const expected = hashesFor(src).length;
    if (found.length !== expected) err(`[${q.id}] solver found ${found.length} accepted responses, expected ${expected}`);
  }
}
if (errors.length) { console.error('BUILD FAILED:\n' + errors.join('\n')); process.exit(1); }
fs.writeFileSync(path.join(root, 'content', 'public.js'), '// GENERATED by tools/build.js. Do not edit by hand. (local-grading build: hashed answer keys)\nexport default ' + JSON.stringify(pub) + ';\n');
fs.writeFileSync(path.join(root, 'content', 'public.server.js'), '// GENERATED by tools/build.js. Do not edit by hand. (server-grading build: NO answer keys, hashes or explanations)\nexport default ' + JSON.stringify(pubServer) + ';\n');

// ---- Apps Script key ------------------------------------------------------------------------------------
// ---- teacher docs ---------------------------------------------------------------------------------------
const answerText = (q) => {
  const opt = (arr, k) => (arr.find((o) => o[0] === k) || [k, k])[1];
  switch (q.type) {
    case 'mc': return opt(q.opts, q.ans);
    case 'multi': return q.ans.map((k) => opt(q.opts, k)).join(' | ');
    case 'spots': return q.ans.map((k) => opt(q.regions, k)).join(' | ');
    case 'sort': case 'match': return q.items.map(([k, t]) => `${t} → ${opt(q.bins || q.choices, q.ans[k])}`).join(' | ');
    case 'slots': return q.slots.map((s) => `${s.label}: ${opt(s.opts, q.ans[s.k])}`).join(' | ');
    case 'seq': return q.ans.map((k, i) => `${i + 1}. ${opt(q.steps, k)}`).join(' | ');
    case 'hotspot': return opt(q.regions, q.ans);
    case 'num': case 'slider': return Array.isArray(q.ans) ? q.ans.join(' or ') : String(q.ans);
    case 'plan': return 'All four checks met: 60+ moderate-to-vigorous minutes every day; vigorous on 3+ days; muscle-strengthening on 3+ days; bone-strengthening on 3+ days';
    default: return '';
  }
};
const keyObj = {};
for (const q of all) {
  const o = { a: answerText(q), d: q.domain, c: q.concept, k: q.skill, df: q.difficulty, y: q.type, qt: q.qt, p: q.pts, m: q.mission, s: q.stageKey, sl: q.slot || q.id, mj: q.major ? 1 : 0, h: hashesFor(q), x: q.explain };
  if (q.type === 'mc' || q.type === 'hotspot') o.o = keys(q.opts || q.regions);
  keyObj[q.id] = o;
}
// plan units: for each stage, the alternative question-id sets a student may receive (used by the demo-data generator)
const UNITS = [];
for (const mi of missions) for (const s of mi.stages) {
  if (s.kind === 'q') UNITS.push({ p: 1, a: [[s.q.id]] });
  else if (s.kind === 'scene') UNITS.push({ p: 1, a: [s.qs.map((q) => q.id)] });
  else if (s.kind === 'pool') UNITS.push({ p: s.groups[0].pick, a: s.groups.flatMap((g) => g.items.map((it) => [...qsOf(it)].map((q) => q.id))) });
}
const gs = `// GENERATED by tools/build.js. Paste this whole file into your Apps Script project as KeyData.gs.
// Contains the scoring key (hashed answers). Keep this out of any public place.
var KEY_SALT = ${JSON.stringify(SALT)};
var CONTENT_VERSION = ${JSON.stringify(VERSION)};
var DOMAIN_ORDER = ${JSON.stringify(Object.keys(DOMAIN_NAME))};
var DOMAIN_NAMES = ${JSON.stringify(DOMAIN_NAME)};
var CONCEPT_NAMES = ${JSON.stringify(Object.fromEntries(Object.entries(CONCEPTS).map(([k, v]) => [k, v[1]])))};
var PLAN_UNITS = ${JSON.stringify(UNITS)};
var KEY = ${JSON.stringify(keyObj)};
`;
fs.writeFileSync(path.join(root, 'google-apps-script', 'KeyData.gs'), gs);

const poolOf = {};
for (const mi of missions) for (const s of stagesIn(mi.stages)) if (s.kind === 'pool') for (const g of s.groups) for (const it of g.items) for (const q of qsOf(it)) poolOf[q.id] = s.id;
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const weight = {};
for (const mi of missions) for (const s of mi.stages) {
  if (s.kind === 'pool') for (const g of s.groups) for (const it of g.items) for (const q of qsOf(it)) weight[q.id] = (g.when ? 0.5 : 1) * g.pick / g.items.length;
}
const stat = { pts: 0, byLvl: {}, byDomain: {}, byType: {}, byConcept: {} };
for (const q of all) {
  const w = weight[q.id] ?? 1; stat.pts += q.pts * w;
  stat.byLvl[q.lvl] = (stat.byLvl[q.lvl] || 0) + q.pts * w;
  stat.byDomain[q.domain] = (stat.byDomain[q.domain] || 0) + q.pts * w;
  stat.byConcept[q.concept] = (stat.byConcept[q.concept] || 0) + q.pts * w;
  stat.byType[q.type] = (stat.byType[q.type] || 0) + w;
}
const stats = { version: VERSION, items: all.length, perMission, stat, versionStats, mcShare: (stat.byType.mc || 0) };
fs.mkdirSync(path.join(root, 'teacher-private'), { recursive: true });
fs.writeFileSync(path.join(root, 'teacher-private', 'build-stats.json'), JSON.stringify(stats, null, 1));

let qb = `# Question bank and answer key (CONTAINS ANSWERS. Do not publish.)\n\nGenerated by \`npm run build\`. Content version **${VERSION}**. All ${all.length} scorable items, including every randomization alternative.\n\n| ID | Slot | Mission | Domain | Concept | Skill | Level | Diff | Type | Pts | Est. sec |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const q of all) qb += `| ${q.id} | ${q.slot || q.id} | ${q.mission} | ${DOMAIN_NAME[q.domain]} | ${esc(CONCEPTS[q.concept][1])} | ${q.skill} | ${q.lvl} | ${q.difficulty} | ${q.type} | ${q.pts} | ${q.sec} |\n`;
for (const mi of missions) {
  qb += `\n## ${mi.kicker}: ${mi.title}\n`;
  for (const q of allQs(mi)) {
    qb += `\n### ${q.id}  •  ${DOMAIN_NAME[q.domain]}  •  ${q.type}  •  ${q.pts} pt${q.pts > 1 ? 's' : ''}${poolOf[q.id] ? '  •  pool: ' + poolOf[q.id] : ''}\n\n${q.prompt}\n\n**Answer:** ${answerText(q)}\n\n**Why:** ${q.explain}\n`;
  }
}
fs.writeFileSync(path.join(root, 'teacher-private', 'ANSWER_KEY.md'), qb);

fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', 'BLUEPRINT.md'), blueprint({ VERSION, missions, all, weight, stat, perMission, versionStats, concepts: CONCEPTS, stagesIn, qsOf }));

// ---- report ---------------------------------------------------------------------------------------------
const pct = (x) => (x / stat.pts * 100).toFixed(0) + '%';
console.log(`Built ${all.length} items in ${missions.length} missions (local + server content files).`);
console.log(`Points per version: ${versionStats.min}${versionStats.min === versionStats.max ? '' : '..' + versionStats.max}; time ${Math.round(versionStats.secMin / 60)}-${Math.round(versionStats.secMax / 60)} min`);
console.log('Per mission:', Object.entries(perMission).map(([k, v]) => `${k}=${v.min}pts/${(v.smin / 60).toFixed(1)}-${(v.smax / 60).toFixed(1)}min`).join('  '));
console.log('Cognitive demand:', ['K', 'AP', 'AN', 'SY'].map((k) => `${k} ${pct(stat.byLvl[k] || 0)}`).join(', '), '(targets K 20-25, AP 40-45, AN 25-30, SY 5-10)');
console.log('Domains:', Object.keys(DOMAIN_NAME).map((d) => `${d} ${pct(stat.byDomain[d] || 0)}`).join(', '));
console.log('Interaction types (expected count per student):', Object.entries(stat.byType).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', '));
console.log(`MC length bias: correct option is the longest in ${longest}/${mcN}; much longer than the rest in ${biased.length}: ${biased.join('; ')}`);
