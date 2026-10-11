import { create } from 'zustand';
import { getJSON, setJSON } from './storage';
import world from '../content/shared/riverton-world.json';

/** State that carries between modules. Every field has a default so each module runs alone. */
export interface SharedState {
  trust: number;                       // 0-100 community trust (Town Hall, Rumor Mill -> Lab compliance)
  interventions: string[];             // built in City, read by Crossroads projections
  outbreakCases: number[] | null;      // weekly case counts from Sim Lab; Rumor Mill reads this
  townHallChoice: string | null;
  rumorOutcome: string | null;
  cityResult?: { gapStart: number; gapEnd: number; reduced: number; won: boolean; stars: number; displacedPct: number } | null;
  labResult?: { source: string; correct: boolean; prevented: number } | null;
}
const KEY = 'riverton.shared';
const defaults = world.sharedStateDefaults as SharedState;

interface Store extends SharedState { patch: (p: Partial<SharedState>) => void; reset: () => void }
export const useShared = create<Store>((set, get) => ({
  ...defaults, ...getJSON<Partial<SharedState>>(KEY, {}),
  patch: (p) => { set(p); const { patch: _p, reset: _r, ...s } = get(); void _p; void _r; setJSON(KEY, s); },
  reset: () => { set({ ...defaults }); setJSON(KEY, defaults); },
}));

/** Compliance with outbreak guidance, a function of trust (shared with Sim Lab). */
export const complianceFromTrust = (trust: number): number => 0.35 + 0.5 * Math.min(100, Math.max(0, trust)) / 100;
