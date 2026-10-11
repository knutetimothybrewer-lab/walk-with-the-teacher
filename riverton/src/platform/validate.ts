import type { ConceptDef, Lesson } from './learn/types';
import type { MCQuestion, Question, ReteachCard } from './questions/types';

export interface Bundle {
  questions: Question[]; lessons: Lesson[]; reteach: ReteachCard[]; concepts: ConceptDef[];
  glossary: { term: string; definition: string }[];
  world: { neighborhoods: { id: string; polygon: number[][] }[]; characters: { id: string }[] };
  castIds: string[];
}
export interface Report { errors: string[]; warnings: string[]; estimatedMinutes: number }

/** Pure content checks, shared by `npm run validate-content` and tests. */
export function validateBundle(b: Bundle, strict = false): Report {
  const errors: string[] = []; const warnings: string[] = [];
  const err = (m: string) => errors.push(m);
  const qIds = new Set<string>(); const byId = new Map(b.questions.map((q) => [q.id, q]));
  const reteachIds = new Set(b.reteach.map((r) => r.id));

  for (const q of b.questions) {
    if (qIds.has(q.id)) err(`duplicate question id ${q.id}`);
    qIds.add(q.id);
    if (!q.explanation?.trim()) err(`${q.id}: missing explanation`);
    if (!q.concept) err(`${q.id}: missing concept`);
    if (q.parallel) {
      const p = byId.get(q.parallel);
      if (!p) err(`${q.id}: parallel ${q.parallel} does not exist`);
      else if (p.concept !== q.concept) err(`${q.id}: parallel ${p.id} is a different concept`);
    }
    if (q.type === 'mc' || q.type === 'vocab') {
      const m = q as MCQuestion;
      if (m.options.filter((o) => o.correct).length !== 1) err(`${q.id}: needs exactly one correct option`);
      for (const o of m.options) {
        if (!o.feedback?.trim()) err(`${q.id}/${o.id}: option missing feedback`);
        if (!o.correct) {
          if (!o.misconception) err(`${q.id}/${o.id}: distractor missing misconception tag`);
          else if (!reteachIds.has(o.misconception)) err(`${q.id}/${o.id}: no reteach card for ${o.misconception}`);
        }
      }
    }
    if (q.type === 'cer' && !(q as { sampleAnswer?: string }).sampleAnswer) err(`${q.id}: CER needs a sample answer`);
  }
  for (const r of b.reteach) if (!r.body?.length) err(`reteach ${r.id}: empty body`);

  let minutes = 0;
  const lessonConcepts = new Set<string>();
  for (const l of b.lessons) {
    minutes += l.minutes;
    l.concepts.forEach((c) => lessonConcepts.add(c));
    const checks = l.blocks.filter((x) => x.type === 'check');
    if (!checks.length) err(`lesson ${l.id}: no check for understanding`);
    if (!l.blocks.some((x) => x.type === 'summary')) err(`lesson ${l.id}: no summary card`);
    for (const blk of l.blocks) {
      const ids = blk.type === 'check' ? blk.questionIds : blk.type === 'guided' ? [blk.questionId] : [];
      for (const id of ids) {
        const q = byId.get(id);
        if (!q) { err(`lesson ${l.id}: unknown question ${id}`); continue; }
        if (blk.type === 'check' && !q.parallel) err(`lesson ${l.id}: check question ${id} has no parallel version`);
        if (!l.concepts.includes(q.concept)) err(`lesson ${l.id}: question ${id} tests ${q.concept}, not a lesson concept`);
      }
    }
    for (const c of l.concepts) if (!b.concepts.some((d) => d.id === c)) err(`lesson ${l.id}: unknown concept ${c}`);
  }
  for (const c of b.concepts) {
    if (!lessonConcepts.has(c.id)) (strict ? errors : warnings).push(`concept ${c.id} has no lesson yet${c.core ? ' (CORE)' : ''}`);
  }
  const terms = new Set<string>();
  for (const g of b.glossary) { if (terms.has(g.term)) err(`duplicate glossary term ${g.term}`); terms.add(g.term); }
  if (b.world.neighborhoods.length !== 8) err('world must define 8 neighborhoods');
  for (const n of b.world.neighborhoods) if (n.polygon.length < 3) err(`neighborhood ${n.id}: polygon needs 3+ points`);
  for (const c of b.world.characters) if (!b.castIds.includes(c.id)) err(`world character ${c.id} has no art spec`);
  if (minutes > 125) warnings.push(`estimated lesson time ${minutes} min exceeds the 125-minute core budget`);
  return { errors, warnings, estimatedMinutes: minutes };
}
