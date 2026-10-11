import { complianceFromTrust } from '../../../platform/sharedState';

export const DEFAULT_WEEKLY = [18, 64, 52, 30, 14, 6];
const EFFECT = 0.85; // how much full compliance suppresses ongoing transmission

/** Re-scale the outbreak's weekly cases from `fromWeek` on, for a change in how many residents follow guidance. */
export function applyCompliance(weekly: number[], fromWeek: number, c0: number, c1: number): number[] {
  const f = (1 - EFFECT * c1) / (1 - EFFECT * c0);
  return weekly.map((v, i) => (i < fromWeek ? v : Math.round(v * f)));
}
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export { complianceFromTrust };

import type { Vars } from './types';
const DELTA = {
  share: { share: -0.1, pause: 0, ask: 0.01 } as Record<string, number>,
  verify: { lateral: 0.03, author: 0.01, ask: 0 } as Record<string, number>,
  neighbor: { empathy: 0.07, facts: 0.03, link: 0.01 } as Record<string, number>,
  messenger: { pastor: 0.1, elder: 0.08, bilingual: 0.09, none: 0 } as Record<string, number>,
};
export interface RumorResult { c0: number; c1: number; weeklyBefore: number[]; weeklyAfter: number[]; casesBefore: number; casesAfter: number; delta: number }

/** Compliance with guidance after the student's rumor-response choices, and what it does to the outbreak curve. */
export function rumorProject(vars: Vars): Vars {
  const trust0 = Number(vars.trust0 ?? vars.trust) || 50; const c0 = complianceFromTrust(trust0);
  let c = c0 + (DELTA.share[String(vars.shareChoice)] ?? 0) + (DELTA.verify[String(vars.verifyChoice)] ?? 0) + (DELTA.neighbor[String(vars.neighborChoice)] ?? 0) + (DELTA.messenger[String(vars.messenger)] ?? 0);
  if (vars.languages === 'multi') c += 0.05 + (vars.messenger === 'bilingual' ? 0.02 : 0);
  if (vars.viral === 'viral') c -= 0.05;
  const c1 = Math.min(0.95, clamp01(c)); // even the best response does not reach everyone
  const weekly = (Array.isArray(vars.weekly) && (vars.weekly as number[]).length ? (vars.weekly as number[]) : DEFAULT_WEEKLY);
  const after = applyCompliance(weekly, 1, c0, c1);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const trust = Math.min(100, Math.max(0, trust0 + Math.round((c1 - c0) * 40)));
  const res: RumorResult = { c0, c1, weeklyBefore: weekly, weeklyAfter: after, casesBefore: sum(weekly), casesAfter: sum(after), delta: sum(after) - sum(weekly) };
  return { ...vars, rumor: res, trust, contained: c1 >= 0.8 ? 2 : c1 >= 0.65 ? 1 : 0 };
}
