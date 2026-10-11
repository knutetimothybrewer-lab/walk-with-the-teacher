import { create } from 'zustand';
import { getJSON, setJSON } from '../storage';

export interface TeacherConfig {
  pinHash: string | null;
  foundationsRequired: boolean;
  reteachStrictness: 'gentle' | 'standard' | 'strict';
  interruptCap: number;       // max unprompted checks per 10 minutes
  timeTargetMin: number;      // 60 / 90 / 120 / 150 / custom
  timedChoices: boolean;
  pacing: 'off' | 'gentle' | 'strict';
  lab: { scenario: 'random' | 'water' | 'vendor' | 'pool' | 'person'; classSeed: number | null; budget: number; days: number; scaffolds: boolean };
}
const KEY = 'riverton.teacher';
const defaults: TeacherConfig = { pinHash: null, foundationsRequired: true, reteachStrictness: 'standard', interruptCap: 3, timeTargetMin: 120, timedChoices: true, pacing: 'gentle', lab: { scenario: 'random', classSeed: null, budget: 100, days: 10, scaffolds: true } };

export async function hashPin(pin: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('riverton:' + pin));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'plain:' + pin; // insecure contexts (file:// on some browsers) lack crypto.subtle
  }
}

interface Store extends TeacherConfig { unlocked: boolean; patch: (p: Partial<TeacherConfig>) => void; setUnlocked: (u: boolean) => void }
export const useTeacher = create<Store>((set, get) => ({
  ...defaults, ...getJSON<Partial<TeacherConfig>>(KEY, {}), unlocked: false,
  patch: (p) => { set(p); const { unlocked: _u, patch: _p, setUnlocked: _s, ...cfg } = get(); void _u; void _p; void _s; setJSON(KEY, cfg); },
  setUnlocked: (unlocked) => set({ unlocked }),
}));
