import type { Lesson, GlossaryEntry, ConceptDef } from './learn/types';
import type { Question, ReteachCard } from './questions/types';

const mods = <T,>(g: Record<string, { default: T }>): T[] => Object.values(g).map((m) => m.default);
const qFiles = import.meta.glob('../content/shared/questions/*.json', { eager: true }) as Record<string, { default: Question[] }>;
const lFiles = import.meta.glob('../content/shared/lessons/*.json', { eager: true }) as Record<string, { default: Lesson }>;

export const QUESTIONS: Question[] = mods(qFiles).flat();
export const LESSONS: Lesson[] = mods(lFiles);
export { default as RETEACH } from '../content/shared/reteach.json';
export { default as GLOSSARY } from '../content/shared/glossary.json';
export { default as CONCEPTS } from '../content/shared/concepts.json';

export const questionById = (id: string) => QUESTIONS.find((q) => q.id === id);
export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);
export type { ReteachCard, GlossaryEntry, ConceptDef };
