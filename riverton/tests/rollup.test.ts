import { describe, it, expect } from 'vitest';
import { blankProfile, type Profile } from '../src/platform/profile/profileStore';
import { rollup, studentsCsv, conceptsCsv, sheetToProfiles, toCsv } from '../src/platform/teacher/rollup';
import { applyResult } from '../src/platform/learn/mastery';
import { CONCEPTS, QUESTIONS } from '../src/platform/content';
import { decodePreset, defaultPreset, encodePreset } from '../src/platform/preset';
import { pace, storyOf, DEFAULT_ORDER, SEGMENTS } from '../src/platform/storyline';

const mcq = QUESTIONS.find((q) => q.id === 'q-ch-1')!; const wrong = (mcq as { options: { id: string; correct?: boolean; misconception?: string }[] }).options.find((o) => !o.correct)!;
function student(name: string, o: Partial<Profile> = {}, miss = true): Profile {
  const p = blankProfile(name, '3'); p.mastery = applyResult(applyResult({}, 'community-health', true, 'a'), 'community-health', true, 'b');
  p.responses.push({ id: 'r' + name, t: 1, qid: 'q-ch-1', module: 'shared', concept: 'community-health', type: 'mc', correct: miss ? false : true, attempts: 1, hintUsed: false, chosen: miss ? wrong.id : 'x', misconception: miss ? wrong.misconception : undefined });
  return { ...p, ...o };
}
describe('class roll-up', () => {
  const a = student('Ava', { progress: { city: { completed: ['close-the-gap'], minutes: 40 } }, crossroads: { 'town-hall': { ending: 'shared', reasoning: [], rubric: [{ id: 'data', score: 2, max: 2 }, { id: 'voice', score: 0, max: 2 }], at: 1 } }, lab: { scenario: 'water', seed: 1, source: 's', curve: 'continuous', hypothesis1: 'diner', hypothesis2: 'water', hypothesisRight: true, caseDefVerdict: 'balanced', surveys: 2, interviews: 5, waterTests: 1, inspections: 0, activeFinding: true, interventions: [{ kind: 'fix_main', day: 5 }], targeted: true, casesPrevented: 100, daysUsed: 8, budgetUsed: 60, at: 1 } });
  const b = student('Ben', { city: { missions: { 'close-the-gap': { gapStart: 12.4, gapEnd: 9, reduced: 3.4, target: 2.5, won: true, stars: 2, displacedPct: 9, built: ['clinic'], at: 1 } } }, crossroads: { 'town-hall': { ending: 'displaced', reasoning: [], rubric: [{ id: 'data', score: 1, max: 2 }, { id: 'voice', score: 2, max: 2 }], at: 1 } } }, false);
  const r = rollup([a, b], CONCEPTS as never, QUESTIONS);
  it('counts completion, mastery by concept, and the most-missed questions with the distractor chosen', () => {
    expect(r.students).toBe(2); expect(r.completion.city).toBe(1); expect(r.completion.townhall).toBe(2); expect(r.completion.outbreak).toBe(0);
    expect(r.concepts.find((c) => c.id === 'community-health')!.mastered).toBe(2);
    expect(r.missed[0]).toMatchObject({ qid: 'q-ch-1', attempts: 2, wrong: 1, rate: 0.5 }); expect(r.missed[0].distractors[0].text.length).toBeGreaterThan(5);
    expect(r.misconceptions[0].id).toBe(wrong.misconception);
  });
  it('summarizes Crossroads reasoning, Lab design choices, and City results', () => {
    expect(r.rubric.find((x) => x.id === 'data')).toMatchObject({ zero: 0, one: 1, two: 1 }); expect(r.endings['town-hall']).toEqual({ shared: 1, displaced: 1 });
    expect(r.lab).toMatchObject({ n: 1, hypothesisRightPct: 100, targetedPct: 100, surveyedPct: 100 }); expect(r.lab.interventions.fix_main).toBe(1);
    expect(r.city).toMatchObject({ n: 1, wonPct: 100 }); expect(r.city.avgDisplaced).toBe(9);
  });
  it('exports CSV with quoting', () => { const csv = studentsCsv([a, b], CONCEPTS as never); expect(csv.split('\n')).toHaveLength(3); expect(csv).toContain('Ava,3'); expect(conceptsCsv(r)).toMatch(/^concept,not_met/); expect(toCsv([['a,b', 'say "hi"']])).toBe('"a,b","say ""hi"""'); });
  it('rebuilds profiles from the Sheet roll-up so the same analysis works without files', () => {
    const ps = sheetToProfiles({ roster: [{ student: 'Ava', period: '3' }], events: [{ id: '1', timestamp: '2024-01-01T00:00:00Z', student: 'Ava', period: '3', module: 'shared', item: 'q-ch-1', concept: 'community-health', type: 'mc', correct: false, attempts: 1, hint_used: false, chosen: wrong.id }], progress: [{ student: 'Ava', period: '3', module: 'city', completed: 'tutorial, close-the-gap', minutes: 41, mastery_pct_by_concept: '{"sdoh":100}' }] });
    const rr = rollup(ps, CONCEPTS as never, QUESTIONS); expect(rr.missed[0].qid).toBe('q-ch-1'); expect(rr.completion.city).toBe(1); expect(rr.concepts.find((c) => c.id === 'sdoh')!.mastered).toBe(1);
  });
});
describe('assignment presets and pacing', () => {
  it('round-trips through a link or a file, and rejects junk', () => {
    const p = { ...defaultPreset(), name: 'Block 3', off: ['city' as const], lockedScenarios: ['rumor-mill'], sync: { url: 'https://x', code: 'c' }, settings: { interruptCap: 2, lab: { scenario: 'water', classSeed: 7, budget: 90, days: 9, scaffolds: true } } };
    expect(decodePreset(encodePreset(p))).toEqual(p); expect(decodePreset(JSON.stringify(p))).toEqual(p); expect(decodePreset('nonsense')).toBeNull(); expect(decodePreset('{"v":2}')).toBeNull();
  });
  it('the core path budgets total 120 minutes with checkpoints at the segment boundaries', () => { expect(SEGMENTS.reduce((a, s) => a + s.minutes, 0)).toBe(120); expect(SEGMENTS.map((s) => s.checkpoint)).toEqual([5, 48, 70, 105, 115, 120]); });
  it('finds the next segment, respects assignment, and flags a class that is behind', () => {
    const p = blankProfile('Ava'); expect(storyOf(p, DEFAULT_ORDER).find((i) => i.current)!.seg.id).toBe('orientation');
    expect(storyOf(p, DEFAULT_ORDER, (id) => id !== 'orientation').find((i) => i.current)!.seg.id).toBe('city');
    p.progress.orientation = { completed: ['orientation'], minutes: 4 }; p.progress.city = { completed: [], minutes: 20 };
    expect(pace(p, DEFAULT_ORDER).behind).toBe(false);
    p.progress.city.minutes = 95; expect(pace(p, DEFAULT_ORDER).behind).toBe(true);
    expect(pace(p, DEFAULT_ORDER, 60).behind).toBe(true);
  });
});
