'use strict';
// Generates docs/ALIGNMENT.md, docs/BLUEPRINT.md (tables), docs/SOURCES.md (committed, no answers)
// and private/ANSWER_KEY.md (PRIVATE: answers, hints, explanations, rubrics).
const fs = require('fs'); const path = require('path');
const split = require('./split'); const G = require('../server/grading'); const refsMod = require('../content/src/references');
const { pub, priv } = split.load();
if (!priv) { console.error('private/keys.json required'); process.exit(1); }
const ROOT = path.join(__dirname, '..'); const w = (p, s) => { fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true }); fs.writeFileSync(path.join(ROOT, p), s); };
const TARGETS = split.common.TARGETS;
const units = pub.modules.flatMap(m => m.units.map(u => Object.assign({ mod: m }, u, { p: priv.units[u.id] })));

// ---- ALIGNMENT
let a = `# Source-to-assessment alignment\n\nVersion ${pub.version}. **Important:** the 14 classroom source files were NOT available to the builder (see SOURCE_STATUS.md). The "source location" column therefore names the source file and the TOPIC it covers (taken from the assignment's list of required content), **not a verified slide or page number**. Please confirm each locator against your originals.\n\n`;
a += `| Task | Location | Source file and topic locator (unverified) | Learning target | Pts | DOK | Cognitive demand | Graph/table | Formats |\n|---|---|---|---|---|---|---|---|---|\n`;
units.forEach(u => { a += `| ${u.id} ${u.title} | ${u.mod.id}. ${u.mod.title} | ${u.p.src.map(s => s.f + ' — ' + s.loc).join('<br>')} | ${u.p.target}: ${TARGETS[u.p.target]} | ${u.points} | ${u.p.dok} | ${u.p.cog} | ${u.p.needsGraph ? 'yes' : ''} | ${u.fields.map(f => f.type).join(', ')} |\n`; });
a += `\n## Points by cognitive demand\n\n`; const bc = {}; units.forEach(u => bc[u.p.cog] = (bc[u.p.cog] || 0) + u.points);
a += Object.entries(bc).map(([k, v]) => `- ${k}: ${v} pts`).join('\n') + `\n\nApplication/analysis or higher (apply, analyze, evaluate, create): **${['apply', 'analyze', 'evaluate', 'create'].reduce((s, k) => s + (bc[k] || 0), 0)} of 100 points**.\n`;
a += `\n## Major concept coverage (A–G) with scored evidence\n\n| Concept | Scored tasks | Points |\n|---|---|---|\n`;
'ABCDEFG'.split('').forEach(L => { const us = units.filter(u => u.p.target[0] === L); a += `| ${L} | ${us.map(u => u.id).join(', ')} | ${us.reduce((s, u) => s + u.points, 0)} |\n`; });
a += `\n## Source file → tasks\n\n| Source file | Tasks that draw on it |\n|---|---|\n`;
Object.values(split.common.SRC).forEach(f => { const us = units.filter(u => u.p.src.some(s => s.f === f)); a += `| ${f} | ${us.length ? us.map(u => u.id).join(', ') : '(see note)'} |\n`; });
a += `\nNote: **Unit3_Community_Environmental_Health_Exam (1).docx** (84 points) is used only through the crosswalk in BLUEPRINT.md; it informed concepts and reasoning demands, not item text, because the file was unavailable. **Day_1_Environment_and_Health (1).docx** and **Community_Health_Investigation_Student_Worksheet_Blank_Spaces (1).docx** are cited where the topics (short/long-term effects, water; conditions/groups/protective factors) match.\n`;
w('docs/ALIGNMENT.md', a);

// ---- BLUEPRINT tables
let b = `# Blueprint, timing rationale and exam crosswalk\n\nTotal: **${pub.totalPoints} points, ${units.length} scored units**. Nominal time: tutorial 3 + ${pub.modules.reduce((s, m) => s + m.minutes, 0)} + final 2 = ${3 + 2 + pub.modules.reduce((s, m) => s + m.minutes, 0)} minutes.\n\n| # | Location | Minutes | Points | Scored units | Per-unit points (minutes) |\n|---|---|---|---|---|---|\n`;
pub.modules.forEach(m => { b += `| ${m.id} | ${m.title} | ${m.minutes} | ${m.points} | ${m.units.length} | ${m.units.map(u => u.points + ' (' + u.minutes + ')').join(', ')} |\n`; });
w('private/BLUEPRINT.tables.md', b);

// ---- SOURCES
let s = `# Sources and verification register\n\nAccess date: ${refsMod.ACCESS}. **Status honesty:** the builder's network blocked direct fetches of agency pages, so the facts below were checked only against search-result excerpts, never against a fully loaded page. No page date was retrieved. **Please open each URL and confirm before classroom use.**\n\n| Organization | Page title | URL | Publication/update date | Supported claim | Tasks | Verification status |\n|---|---|---|---|---|---|---|\n`;
refsMod.REFERENCES.forEach(r => { s += `| ${r.org} | ${r.title} | ${r.url} | ${r.date} | ${r.claim} | ${r.tasks.join(', ')} | ${r.status} |\n`; });
s += `\n## Original classroom data and fictional scenarios\n\n` + refsMod.ORIGINAL.map(o => `- **${o.title}** — tasks: ${o.tasks.join(', ')}`).join('\n') + `\n\nNo health statistics from real surveys are used. Every number in a task is either original classroom data, a fictional scenario value, or a rule from the guidance above. Fictional organizations (Eastbrook County Health Department, Healthy Teens Alliance, SparkUp, @maya.moves, etc.) are not real and no findings are attributed to real agencies.\n`;
w('docs/SOURCES.md', s);

// ---- PRIVATE ANSWER KEY
let k = `# PRIVATE ANSWER KEY AND RUBRICS — DO NOT PUBLISH OR COMMIT\n\nVersion ${pub.version}. Also viewable inside the app via Teacher panel → Answers and scoring.\n\n`;
units.forEach(u => {
  k += `## ${u.id} · ${u.title} (${u.points} pts) — ${u.mod.title}\n\n- Target ${u.p.target} · DOK ${u.p.dok} · ${u.p.cog}\n- Credit: attempt 1 = ${u.points}, attempt 2 = ${G.round2(u.points * .85)}, attempt 3 = ${G.round2(u.points * .75)}, otherwise 0\n- Rubric: ${u.p.rubric}\n- Hint after attempt 1: ${u.p.hints[0]}\n- Hint after attempt 2: ${u.p.hints[1] || u.p.hints[0]}\n- Explanation: ${u.p.explain}\n- Accepted answer(s):\n`;
  u.fields.forEach(f => { k += '  - `' + f.id + '` (' + f.type + ')\n\n```\n' + G.formatKey(pub, f, u.p.keys[f.id]) + '\n```\n\n'; });
});
w('private/ANSWER_KEY.md', k);
console.log('docs generated: docs/ALIGNMENT.md, docs/BLUEPRINT.generated.md, docs/SOURCES.md, private/ANSWER_KEY.md');
