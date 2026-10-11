import { applyEffects } from './cond';
import { projectProposal, proposalCost, proposalValid, type Proposal } from './cityAdapter';
import type { Vars } from './types';

/** Which stakeholder needs a proposal meets. Used for community trust and for the debrief. */
export const NEEDS: Record<string, (p: Proposal) => boolean> = {
  elder: (p) => p.coop > 0 || p.park > 0, parent: (p) => p.clinic > 0, storeowner: (p) => p.coop > 0, pastor: (p) => p.protections || (p.housing > 0 && !p.developer),
  teen: (p) => p.park > 0, clinic: (p) => p.clinic > 0, developer: (p) => p.developer,
};

export function proposalFeatures(p: Proposal): Vars {
  const equity = (p.clinic > 0 ? 1 : 0) + (p.coop > 0 ? 1 : 0) + (p.housing > 0 ? 1 : 0) + (p.park > 0 ? 1 : 0) + (p.protections ? 1 : 0) - (p.developer && !p.protections ? 1 : 0);
  return { proposal: p, devDeal: p.developer ? 1 : 0, protections: p.protections, feat_equity: Math.max(0, equity), feat_health: p.clinic, feat_food: p.coop, feat_open: p.park, feat_housing: p.housing + (p.protections ? 1 : 0), cost: proposalCost(p) };
}
export function acceptProposal(vars: Vars, p: Proposal): Vars | null {
  if (!proposalValid(p)) return null;
  return applyEffects([], { ...vars, ...proposalFeatures(p) });
}

/** Called when the Town Hall reaches its consequences: runs the City engine, with luck, and updates trust. */
export function townHallProject(vars: Vars, seed: number): Vars {
  const p = vars.proposal as Proposal;
  const luck = vars.luck === 'lucky' ? 1.25 : vars.luck === 'unlucky' ? 0.75 : 1;
  const proj = projectProposal(p, { seed, luck }); const typical = projectProposal(p, { seed, luck: 1 });
  const heard = (vars.heard as string[]) ?? [];
  const met = heard.filter((h) => NEEDS[h]?.(p)), missed = heard.filter((h) => NEEDS[h] && !NEEDS[h](p));
  const trust = Math.min(100, Math.max(0, (Number(vars.trust) || 50) + met.length * 3 - missed.length * 2 + (vars.protections && heard.includes('pastor') ? 3 : 0)));
  return { ...vars, proj, projTypical: typical, trust, needsMet: met, needsMissed: missed, displaced: proj.displacedPct >= 2 ? 1 : 0, gapImproved: proj.gapAfter < proj.gapBefore - 0.15 || proj.after.preventableER < proj.before.preventableER - 8 ? 1 : 0 };
}
