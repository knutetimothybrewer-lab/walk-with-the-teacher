import { equityGap, type CityState } from '../sim';

export interface MissionDef {
  id: 'tutorial' | 'close-the-gap' | 'sandbox'; title: string; blurb: string; core: boolean;
  startingCash: number; annualBudget: number; years: number; seed: number; target?: number; allowEvents: boolean;
}
export const MISSIONS: MissionDef[] = [
  { id: 'tutorial', title: 'Welcome to the City', blurb: 'Learn to read the map, place a clinic, and watch what happens.', core: true, startingCash: 30, annualBudget: 14, years: 3, seed: 3, allowEvents: false },
  { id: 'close-the-gap', title: 'Close the Gap', blurb: 'Narrow the life-expectancy gap between Hillcrest and Eastside by 2.5 years in 10 years, on a limited budget.', core: true, startingCash: 40, annualBudget: 14, years: 10, seed: 17, target: 2.5, allowEvents: false },
  { id: 'sandbox', title: 'Sandbox', blurb: 'Build anything, advance time, and experiment. No goal and a generous budget.', core: false, startingCash: 120, annualBudget: 20, years: 30, seed: 5, allowEvents: true },
];
export const missionById = (id: string) => MISSIONS.find((m) => m.id === id)!;

/** Gap between the best neighborhood and Eastside (the mission's measure). */
export const eastsideGap = (s: CityState) => { const g = equityGap(s); void g; const best = Math.max(...Object.values(s.hoods).map((h) => h.out.lifeExpectancy)); return best - s.hoods.eastside.out.lifeExpectancy; };

export interface MissionStatus { gapNow: number; reduced: number; target: number; won: boolean; displacedPct: number; cash: number; years: number }
export function evaluate(m: MissionDef, s: CityState, startGap: number): MissionStatus {
  const g = eastsideGap(s); const reduced = startGap - g;
  return { gapNow: g, reduced, target: m.target ?? 0, won: !!m.target && reduced >= m.target, displacedPct: s.hoods.eastside.displacedPct, cash: s.cash, years: s.month / 12 };
}
export const stars = (st: MissionStatus): number => (st.won ? 1 : 0) + (st.won && st.displacedPct < 3 ? 1 : 0) + (st.won && st.cash >= 0 ? 1 : 0);
