import { create } from 'zustand';
import { getJSON, setJSON } from './storage';
import { DEFAULT_ORDER, type SegmentId } from './storyline';

/** A small "assignment file": which segments are active, in what order, and the class settings. Shared as a link or a file. */
export interface Preset {
  v: 1; name: string; order: SegmentId[]; off: SegmentId[];
  lockedMissions: string[]; lockedScenarios: string[];
  settings: { foundationsRequired?: boolean; interruptCap?: number; timeTargetMin?: number; timedChoices?: boolean; reteachStrictness?: 'gentle' | 'standard' | 'strict'; lab?: { scenario: string; classSeed: number | null; budget: number; days: number; scaffolds: boolean } };
  sync?: { url: string; code: string };
}
export const defaultPreset = (): Preset => ({ v: 1, name: 'Default', order: [...DEFAULT_ORDER], off: [], lockedMissions: [], lockedScenarios: [], settings: {} });

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
export const encodePreset = (p: Preset) => b64(JSON.stringify(p));
export function decodePreset(s: string): Preset | null {
  try { const p = JSON.parse(s.trim().startsWith('{') ? s : unb64(s)) as Preset; return p && p.v === 1 && Array.isArray(p.order) ? { ...defaultPreset(), ...p } : null; } catch { return null; }
}

interface Store { preset: Preset | null; set: (p: Preset | null) => void }
export const usePreset = create<Store>((set) => ({ preset: getJSON<Preset | null>('riverton.preset', null), set: (preset) => { set({ preset }); setJSON('riverton.preset', preset); } }));
export const activePreset = (): Preset => usePreset.getState().preset ?? defaultPreset();
export const isAssigned = (p: Preset | null, id: SegmentId) => !p || !p.off.includes(id);
