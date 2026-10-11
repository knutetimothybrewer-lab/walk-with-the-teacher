export type Level = 'none' | 'introduced' | 'practiced' | 'mastered';
export interface ConceptMastery { level: Level; contexts: string[]; correct: number; attempts: number; lastSeen: number }
export type MasteryMap = Record<string, ConceptMastery>;

const blank = (): ConceptMastery => ({ level: 'none', contexts: [], correct: 0, attempts: 0, lastSeen: 0 });

export function markIntroduced(m: MasteryMap, concept: string, now = Date.now()): MasteryMap {
  const c = m[concept] ?? blank();
  return { ...m, [concept]: { ...c, level: c.level === 'none' ? 'introduced' : c.level, lastSeen: now } };
}

/** introduced -> practiced (first correct application) -> mastered (correct in two different contexts). */
export function applyResult(m: MasteryMap, concept: string, correct: boolean, context: string, now = Date.now()): MasteryMap {
  const c = m[concept] ?? blank();
  const contexts = correct && !c.contexts.includes(context) ? [...c.contexts, context] : c.contexts;
  let level: Level = c.level === 'none' ? 'introduced' : c.level;
  if (correct && level === 'introduced') level = 'practiced';
  if (contexts.length >= 2) level = 'mastered';
  return { ...m, [concept]: { level, contexts, correct: c.correct + (correct ? 1 : 0), attempts: c.attempts + 1, lastSeen: now } };
}

/** Warm-up weighting: missed or stale concepts first. */
export function warmupOrder(m: MasteryMap, now = Date.now()): string[] {
  const score = (c: ConceptMastery) => {
    const missRate = c.attempts ? 1 - c.correct / c.attempts : 0;
    const days = (now - c.lastSeen) / 86_400_000;
    const lvl = { none: 0, introduced: 1, practiced: 0.6, mastered: 0.2 }[c.level];
    return missRate * 2 + Math.min(days, 14) / 14 + lvl;
  };
  return Object.entries(m).sort((a, b) => score(b[1]) - score(a[1])).map(([k]) => k);
}

export const needsWork = (m: MasteryMap): string[] => Object.entries(m).filter(([, c]) => c.level !== 'mastered' && c.attempts > 0).map(([k]) => k);
