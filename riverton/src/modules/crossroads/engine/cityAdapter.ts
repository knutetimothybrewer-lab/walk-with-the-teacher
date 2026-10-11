import { createCity, placeIntervention, setPolicy, advance, equityGap, type CityState, type Out } from '../../city/sim';

/** Town Hall proposal components, expressed as scaled City interventions so the numbers match what City would produce. */
export interface Component { id: 'clinic' | 'coop' | 'park' | 'housing'; label: string; cityType: string; levels: { scale: number; cost: number; label: string }[]; blurb: string }
export const COMPONENTS: Component[] = [
  { id: 'clinic', label: 'Community clinic', cityType: 'clinic', blurb: 'A satellite clinic run with the Eastside health center partner: primary care, screenings, vaccines.', levels: [{ scale: 0, cost: 0, label: 'None' }, { scale: 0.4, cost: 1.0, label: 'Small clinic ($1.0M)' }, { scale: 0.7, cost: 1.8, label: 'Full clinic ($1.8M)' }] },
  { id: 'coop', label: 'Grocery co-op', cityType: 'supermarket', blurb: 'A resident-owned store with fresh food and prices set for the neighborhood.', levels: [{ scale: 0, cost: 0, label: 'None' }, { scale: 0.4, cost: 0.9, label: 'Small co-op ($0.9M)' }, { scale: 0.7, cost: 1.6, label: 'Full co-op ($1.6M)' }] },
  { id: 'park', label: 'Park and rec space', cityType: 'park', blurb: 'Green space, a track and a covered court, lit and open after school.', levels: [{ scale: 0, cost: 0, label: 'None' }, { scale: 0.5, cost: 0.5, label: 'Pocket park ($0.5M)' }, { scale: 1.0, cost: 1.0, label: 'Park and rec ($1.0M)' }] },
  { id: 'housing', label: 'Affordable housing', cityType: 'affordable_housing', blurb: 'Homes priced for people who live in Eastside now, including seniors.', levels: [{ scale: 0, cost: 0, label: 'None' }, { scale: 0.15, cost: 1.0, label: 'Small building ($1.0M)' }, { scale: 0.28, cost: 1.8, label: 'Larger building ($1.8M)' }] },
];
export const GRANT = 2.0; export const DEVELOPER_BONUS = 2.0; export const PROTECTION_COST = 0.3;
export const LOT: [number, number] = [790, 380];
export interface Proposal { clinic: 0 | 1 | 2; coop: 0 | 1 | 2; park: 0 | 1 | 2; housing: 0 | 1 | 2; developer: boolean; protections: boolean }
export const emptyProposal = (): Proposal => ({ clinic: 0, coop: 0, park: 0, housing: 0, developer: false, protections: false });
export const proposalCost = (p: Proposal) => +(COMPONENTS.reduce((a, c) => a + c.levels[p[c.id]].cost, 0) + (p.protections ? PROTECTION_COST : 0)).toFixed(2);
export const proposalBudget = (p: Proposal) => GRANT + (p.developer ? DEVELOPER_BONUS : 0);
export const proposalValid = (p: Proposal) => proposalCost(p) <= proposalBudget(p) + 1e-9 && (COMPONENTS.some((c) => p[c.id] > 0) || p.developer);

export const TRACKED: Out[] = ['lifeExpectancy', 'asthma', 'preventableER', 'obesity', 'diabetes', 'uninsured', 'leadElevated', 'mentalDays'];
export interface Projection {
  years: number; before: Record<string, number>; after: Record<string, number>; gapBefore: number; gapAfter: number;
  displacedPct: number; rentPressure: number; originalShare: number; luck: number;
}

/** Build the same city the City module would build, with the proposal placed on the Elm Street lot, and advance it. */
export function buildCity(p: Proposal, seed: number, luck = 1): CityState {
  let s = createCity({ seed, startingCash: 100, annualBudget: 14 });
  for (const c of COMPONENTS) {
    const lvl = c.levels[p[c.id]]; if (!lvl.scale) continue;
    const r = placeIntervention(s, { type: c.cityType, hood: 'eastside', at: LOT, scale: lvl.scale * luck }); if (r.ok) s = r.state;
  }
  if (p.developer) { const r = placeIntervention(s, { type: 'mixed_income_redevelopment', hood: 'eastside', at: LOT, scale: 1.0 * luck }); if (r.ok) s = r.state; }
  if (p.protections) { const r = setPolicy(s, 'housing_protection', true); if (r.ok) s = r.state; }
  return s;
}
const cache = new Map<string, Projection>();
export function projectProposal(p: Proposal, opts: { seed: number; luck?: number; years?: number }): Projection {
  const key = JSON.stringify([p, opts.seed, opts.luck ?? 1, opts.years ?? 5]);
  const hit = cache.get(key); if (hit) return hit;
  const years = opts.years ?? 5; const base = createCity({ seed: opts.seed, startingCash: 100 });
  const after = advance(buildCity(p, opts.seed, opts.luck ?? 1), years * 12);
  const pick = (s: CityState) => Object.fromEntries(TRACKED.map((o) => [o, s.hoods.eastside.out[o]]));
  const out: Projection = { years, before: pick(base), after: pick(after), gapBefore: equityGap(base).gap, gapAfter: equityGap(after).gap, displacedPct: after.hoods.eastside.displacedPct, rentPressure: after.hoods.eastside.rentPressure, originalShare: 100 - after.hoods.eastside.displacedPct, luck: opts.luck ?? 1 };
  cache.set(key, out); return out;
}
