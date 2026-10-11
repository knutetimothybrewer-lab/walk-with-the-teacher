import { create } from 'zustand';
import { getJSON, setJSON } from '../../../platform/storage';
import type { CaseDef, Interview, Iv, Scenario } from '../labs/outbreak';
import { defaultCaseDef } from '../labs/outbreak';
import type { ActionRecord } from '../engine/types';

export type Step = 'foundations' | 'alert' | 'casedef' | 'hypothesis' | 'investigate' | 'analyze' | 'intervene' | 'conclusion' | 'limits' | 'ethics' | 'done';
export const STEPS: { id: Step; label: string }[] = [
  { id: 'foundations', label: 'Foundations' }, { id: 'alert', label: 'Alert' }, { id: 'casedef', label: 'Case definition' }, { id: 'hypothesis', label: 'Hypothesis' },
  { id: 'investigate', label: 'Investigate' }, { id: 'analyze', label: 'Analyze' }, { id: 'intervene', label: 'Intervene' }, { id: 'conclusion', label: 'Conclusion' },
  { id: 'limits', label: 'Limitations' }, { id: 'ethics', label: 'Ethics' }, { id: 'done', label: 'Debrief' },
];

export interface SurveyRec { id: string; scope: string; n: number; day: number; draw: number; rows: Interview[] }
export interface Hypothesis { source: string; because: string }
export interface LabRun {
  seed: number; scenario: 'random' | Scenario; step: Step;
  day: number; alertDay: number; budget: number; daysUsed: number; daysTotal: number; budgetTotal: number;
  caseDef: CaseDef; caseDefTries: number;
  h1: Hypothesis | null; h2: Hypothesis | null;
  actions: ActionRecord[]; found: { hood: string; day: number }[];
  caseInterviews: Interview[]; surveys: SurveyRec[]; results: { id: string; kind: 'water' | 'inspect' | 'specimens'; day: number; readyDay: number; data: Record<string, unknown> }[];
  ivs: Iv[]; shapeAnswered: boolean; rrAnswered: boolean; conclusion: string; limitsInv: boolean; limitsModel: boolean; ethicsDone: boolean; ethicsChoices: string[];
  finished: boolean; startedAt: number;
}

export const newRun = (seed: number, scenario: LabRun['scenario'], budget = 100, days = 10): LabRun => ({
  seed, scenario, step: 'foundations', day: 0, alertDay: 0, budget, budgetTotal: budget, daysUsed: 0, daysTotal: days,
  caseDef: defaultCaseDef(), caseDefTries: 0, h1: null, h2: null, actions: [], found: [], caseInterviews: [], surveys: [], results: [], ivs: [],
  shapeAnswered: false, rrAnswered: false, conclusion: '', limitsInv: false, limitsModel: false, ethicsDone: false, ethicsChoices: [], finished: false, startedAt: Date.now(),
});

const KEY = 'riverton.lab';
interface Store { runs: Record<string, LabRun>; set: (pid: string, run: LabRun) => void; patch: (pid: string, p: Partial<LabRun>) => void; clear: (pid: string) => void }
export const useLab = create<Store>((set, get) => ({
  runs: getJSON<Record<string, LabRun>>(KEY, {}),
  set: (pid, run) => { const runs = { ...get().runs, [pid]: run }; set({ runs }); setJSON(KEY, runs); },
  patch: (pid, p) => { const cur = get().runs[pid]; if (!cur) return; get().set(pid, { ...cur, ...p }); },
  clear: (pid) => { const { [pid]: _x, ...rest } = get().runs; void _x; set({ runs: rest }); setJSON(KEY, rest); },
}));

export const seedFor = (profileId: string): number => { let h = 2166136261; for (const c of profileId) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) % 100000; };
