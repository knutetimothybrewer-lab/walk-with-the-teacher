import raw from '../content/tuning.json';
import type { InterventionDef, PolicyDef } from './types';

export const TUNING = raw as unknown as {
  milesToUnits: number; ownHoodFloor: number; diminishing: number[]; headroom: { floor: number };
  noise: { effectRealization: number };
  budget: { defaultStartingCash: number; defaultAnnualBudget: number; reducedAfterMonths: number; closedAfterMonths: number; reducedMult: number };
  behaviorFromDeterminant: Record<string, Record<string, number>>;
  behaviorRate: Record<string, number>;
  behaviorBetter: Record<string, 1 | -1>; behaviorRoom: { scale: number; min: number; max: number };
  outcomes: Record<string, { unit: string; better: 1 | -1; mode: 'add' | 'log'; rate: number; min: number; max: number; beh: Record<string, number>; det: Record<string, number>; acute?: number }>;
  rent: { gentrifiableIncome: number; decay: number; gain: number; threshold: number; displaceRate: number; maxDisplacedPct: number; econArtifact: number; housingPenalty: number; maxEcon: number };
  events: Record<string, number>;
  modifiers: Record<string, Record<string, number | string>>;
  interventions: Record<string, InterventionDef>; policies: Record<string, PolicyDef>;
};
export const INTERVENTIONS = TUNING.interventions;
export const POLICIES = TUNING.policies;
