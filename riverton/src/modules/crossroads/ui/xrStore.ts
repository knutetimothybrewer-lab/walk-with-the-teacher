import { create } from 'zustand';
import { getJSON, setJSON } from '../../../platform/storage';
import type { Run } from '../engine/types';

const KEY = 'riverton.crossroads';
interface Store { runs: Record<string, Run>; alt: Record<string, Run>; set: (k: string, r: Run) => void; setAlt: (k: string, r: Run | null) => void; clear: (k: string) => void }
export const useXr = create<Store>((set, get) => ({
  runs: getJSON<Record<string, Run>>(KEY, {}), alt: {},
  set: (k, r) => { const runs = { ...get().runs, [k]: r }; set({ runs }); setJSON(KEY, runs); },
  setAlt: (k, r) => { const alt = { ...get().alt }; if (r) alt[k] = r; else delete alt[k]; set({ alt }); },
  clear: (k) => { const { [k]: _x, ...rest } = get().runs; void _x; set({ runs: rest }); setJSON(KEY, rest); get().setAlt(k, null); },
}));
export const runKey = (pid: string, scenarioId: string) => `${pid}:${scenarioId}`;
