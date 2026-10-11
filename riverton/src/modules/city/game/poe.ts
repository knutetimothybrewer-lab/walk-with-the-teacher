import poe from '../content/poe.json';
import labels from '../content/labels.json';
import { INTERVENTIONS, POLICIES, TUNING, type CityState } from '../sim';

export const POE = poe as Record<string, { concept: string; expect: Record<string, number>; lag: string }>;
export const OUT_LABEL = labels.out as Record<string, string>;
export type Magnitude = 'tiny' | 'small' | 'medium' | 'large';
export const MAGNITUDES: { id: Magnitude; label: string; hint: string }[] = [
  { id: 'tiny', label: 'Barely any change', hint: 'less than 1%' }, { id: 'small', label: 'Small', hint: 'about 1 to 5%' }, { id: 'medium', label: 'Medium', hint: 'about 5 to 15%' }, { id: 'large', label: 'Large', hint: 'more than 15%' }];
export const POE_OUTCOMES = ['lifeExpectancy', 'obesity', 'diabetes', 'hypertension', 'asthma', 'waterborne', 'leadElevated', 'preventableER', 'uninsured', 'vaccination', 'mentalDays', 'displacement'];
export const nameOf = (id: string) => INTERVENTIONS[id]?.name ?? POLICIES[id]?.name ?? id;

export interface Prediction { type: string; hood: string; outcome: string; direction: -1 | 0 | 1; magnitude: Magnitude; neighborhood: string; month: number }
export interface Values { hoods: Record<string, { out: Record<string, number>; displacedPct: number }> }
export const valuesOf = (s: CityState): Values => ({ hoods: Object.fromEntries(Object.entries(s.hoods).map(([k, h]) => [k, { out: { ...h.out } as Record<string, number>, displacedPct: h.displacedPct }])) });
export const valueOf = (s: Values, hood: string, o: string): number => (o === 'displacement' ? s.hoods[hood].displacedPct : s.hoods[hood].out[o]);
export const magnitudeOf = (relPct: number): Magnitude => { const a = Math.abs(relPct); return a < 1 ? 'tiny' : a < 5 ? 'small' : a < 15 ? 'medium' : 'large'; };

export interface PoeResult { actual: number; relPct: number; directionOk: boolean; outcomeOk: boolean; magnitudeOk: boolean; correct: boolean; bestHood: string }
/** Compare a prediction with what the model did, from the start of construction to `now`. */
export function judge(p: Prediction, before: Values, now: Values): PoeResult {
  const actual = valueOf(now, p.neighborhood, p.outcome) - valueOf(before, p.neighborhood, p.outcome);
  const base = valueOf(before, p.neighborhood, p.outcome) || 1; const rel = (actual / Math.abs(base)) * 100;
  const better = TUNING.outcomes[p.outcome]?.better ?? -1; void better;
  const dir = Math.abs(rel) < 0.15 ? 0 : actual > 0 ? 1 : -1;
  const exp = POE[p.type]?.expect ?? {};
  const outcomeOk = p.outcome in exp;
  const directionOk = p.direction === dir || (p.direction === 0 && dir === 0);
  const mag = magnitudeOf(rel);
  // best-served neighborhood for the predicted outcome (largest favorable move)
  let bestHood = p.neighborhood, best = 0;
  for (const h of Object.keys(now.hoods)) { const d = valueOf(now, h, p.outcome) - valueOf(before, h, p.outcome); const fav = (exp[p.outcome] ?? -1) * d; if (fav > best) { best = fav; bestHood = h; } }
  return { actual, relPct: rel, directionOk, outcomeOk, magnitudeOk: mag === p.magnitude, correct: directionOk && outcomeOk, bestHood };
}
