import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateBundle, type Bundle } from '../src/platform/validate';
import { CAST } from '../src/platform/art/characters';
import { validateScenario } from '../src/modules/crossroads/engine/validate';
import type { Scenario } from '../src/modules/crossroads/engine/types';

const root = join(import.meta.dirname, '..', 'src', 'content', 'shared');
const json = <T>(p: string) => JSON.parse(readFileSync(join(root, p), 'utf8')) as T;
const dir = <T>(d: string) => readdirSync(join(root, d)).filter((f) => f.endsWith('.json')).map((f) => json<T>(join(d, f)));

const bundle: Bundle = {
  questions: dir<unknown[]>('questions').flat() as Bundle['questions'],
  lessons: dir<Bundle['lessons'][number]>('lessons'),
  reteach: json('reteach.json'), concepts: json('concepts.json'), glossary: json('glossary.json'),
  world: json('riverton-world.json'), castIds: CAST.map((c) => c.id),
};
const r = validateBundle(bundle, process.argv.includes('--strict'));
const tuning = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'src', 'modules', 'city', 'content', 'tuning.json'), 'utf8')) as { interventions: Record<string, unknown>; policies: Record<string, unknown> };
const poe = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'src', 'modules', 'city', 'content', 'poe.json'), 'utf8')) as Record<string, { concept: string; expect: Record<string, number>; lag: string }>;
for (const id of [...Object.keys(tuning.interventions), ...Object.keys(tuning.policies)]) {
  const e = poe[id];
  if (!e) { r.errors.push(`City: ${id} has no Predict-Observe-Explain entry`); continue; }
  if (!Object.keys(e.expect).length) r.errors.push(`City: ${id} POE has no expected outcome`);
  if (!e.lag || e.lag.length < 20) r.errors.push(`City: ${id} POE has no explanation`);
  if (!bundle.concepts.some((c) => c.id === e.concept)) r.errors.push(`City: ${id} POE concept ${e.concept} is not a known concept`);
}
console.log(`city: ${Object.keys(tuning.interventions).length} interventions and ${Object.keys(tuning.policies).length} policies, all with POE entries`);
const xrDir = join(import.meta.dirname, '..', 'src', 'modules', 'crossroads', 'content');
const qIds = new Set(bundle.questions.map((q) => q.id)); const cast = new Set(CAST.map((c) => c.id));
for (const f of readdirSync(xrDir).filter((x) => x.endsWith('.json'))) {
  const sc = JSON.parse(readFileSync(join(xrDir, f), 'utf8')) as Scenario;
  const rep = validateScenario(sc, { questionIds: qIds, castIds: cast });
  r.errors.push(...rep.errors); r.warnings.push(...rep.warnings);
  for (const l of sc.lessons) if (!bundle.lessons.some((x) => x.id === l)) r.errors.push(`${sc.id}: lesson ${l} missing`);
  console.log(`scenario ${sc.id}: ${rep.reachable}/${rep.total} nodes reachable, ${rep.endings.length} endings`);
}
r.warnings.forEach((w) => console.warn('warn  ', w));
r.errors.forEach((e) => console.error('ERROR ', e));
// dev-only "simulated student" estimate: foundations time from the content plus each chapter's simulation time
const FOUND: Record<string, { lessons: string[]; budget: number; chapter: number }> = {
  orientation: { lessons: ['orientation-community-health'], budget: 3, chapter: 5 }, city: { lessons: ['city-sdoh', 'city-upstream', 'city-equity'], budget: 10, chapter: 43 }, townhall: { lessons: ['xr-decision-stakeholders'], budget: 4, chapter: 22 },
  outbreak: { lessons: ['lab-chain-surveillance', 'lab-casedef-epicurve', 'lab-attack-rr-confounding'], budget: 9, chapter: 35 }, rumor: { lessons: ['xr-misinfo'], budget: 2, chapter: 10 }, wrapup: { lessons: [], budget: 0, chapter: 5 },
};
let estimate = 0;
for (const [id, f] of Object.entries(FOUND)) { const lessons = f.lessons.reduce((a, l) => a + (bundle.lessons.find((x) => x.id === l)?.minutes ?? 0), 0); const seg = lessons + (f.chapter - f.budget); estimate += seg; if (lessons > f.budget + 2) r.warnings.push(`${id}: foundations lessons take ~${lessons} min, over the ${f.budget}-minute budget`); }
console.log(`core-path estimate: ~${Math.round(estimate)} minutes (budget 120)`);
if (estimate > 125) r.warnings.push(`estimated core path ${Math.round(estimate)} min exceeds 125`);
console.log(`\n${bundle.questions.length} questions, ${bundle.lessons.length} lessons, ${bundle.reteach.length} reteach cards, ~${r.estimatedMinutes} lesson min`);
if (r.errors.length) { console.error(`${r.errors.length} error(s)`); process.exit(1); }
console.log('content OK');
