import { createContext, useContext } from 'react';
import type { LabRun, Step } from './labStore';
import type { Sim, Truth, LineRow } from '../labs/outbreak';
import type { MCQuestion, Option } from '../../../platform/questions/types';

export interface LabCtx {
  run: LabRun; patch: (p: Partial<LabRun>) => void; go: (s: Step) => void;
  truth: Truth; sim: Sim; simBase: Sim; alertAt: { day: number; kind: 'er' | 'cluster' } | null;
  compliance: number; rows: LineRow[]; rowsInDef: LineRow[]; pid: string;
}
export const Ctx = createContext<LabCtx | null>(null);
export const useLabCtx = () => { const c = useContext(Ctx); if (!c) throw new Error('LabCtx missing'); return c; };

/** Build a question from the student's own data so it can run through the shared CheckRunner. */
export function dynamicMC(id: string, concept: string, prompt: string, options: Option[], explanation: string, hint?: string): MCQuestion {
  return { id, module: 'lab', concept, type: 'mc', difficulty: 2, trigger: 'sim-data', prompt, options, explanation, context: 'sim:lab', hint };
}
