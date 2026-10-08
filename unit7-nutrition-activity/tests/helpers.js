// Shared test helpers: load the authoring source (answers) and build a representative student plan.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mods = [];
for (const m of ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7']) mods.push((await import(`${root}/authoring/${m}.js`)).default);
export { mods, root };
export function* qsOf(stage) { if (stage.kind === 'q') yield stage.q; else if (stage.kind === 'scene') yield* stage.qs; }
export function* allStages(stages) { for (const s of stages) { yield s; if (s.kind === 'pool') for (const g of s.groups) yield* allStages(g.items); } }
export const allQuestions = () => mods.flatMap((m) => [...allStages(m.stages)].flatMap((s) => [...qsOf(s)]));
/** A representative plan: first alternative of every pool. variant=n picks the n-th alternative (mod length). */
export function plan(variant = 0) {
  const stageIds = [], qs = [];
  for (const m of mods) for (const s of m.stages) {
    let picks = [s];
    if (s.kind === 'pool') { const g = s.groups[variant % s.groups.length] || s.groups[0]; picks = [g.items[variant % g.items.length]]; }
    for (const p of picks) { if (p.kind === 'choice') continue; stageIds.push(p.kind === 'q' ? p.q.id : p.id); qs.push(...qsOf(p)); }
  }
  return { stageIds, qs };
}

import { canon } from '../js/canon.js';
/** Canonical form of the authored correct answer (plans use the all-checks-met flag string; num/slider take the first accepted value). */
export const canonOf = (q) => (q.type === 'plan' ? 'm1v1s1b1' : (q.type === 'num' || q.type === 'slider') ? canon(q.type, Array.isArray(q.ans) ? q.ans[0] : q.ans) : canon(q.type, q.ans));
