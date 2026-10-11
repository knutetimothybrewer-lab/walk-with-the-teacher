import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateBundle, type Bundle } from '../src/platform/validate';
import { CAST } from '../src/platform/art/characters';

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
r.warnings.forEach((w) => console.warn('warn  ', w));
r.errors.forEach((e) => console.error('ERROR ', e));
console.log(`\n${bundle.questions.length} questions, ${bundle.lessons.length} lessons, ${bundle.reteach.length} reteach cards, ~${r.estimatedMinutes} lesson min`);
if (r.errors.length) { console.error(`${r.errors.length} error(s)`); process.exit(1); }
console.log('content OK');
