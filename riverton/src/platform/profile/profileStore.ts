import { create } from 'zustand';
import { getJSON, setJSON } from '../storage';
import { applyResult, markIntroduced, type MasteryMap } from '../learn/mastery';
import type { ModuleId } from '../questions/types';

export interface ResponseRec {
  id: string; t: number; qid: string; module: ModuleId; concept: string; type: string;
  correct: boolean | null; attempts: number; hintUsed: boolean; chosen?: string; misconception?: string; prediction?: string;
}
export interface WrittenRec { id: string; t: number; kind: 'cer' | 'justification' | 'conclusion' | 'summary'; qid: string; module: ModuleId; text: string }
export interface LabSummary {
  scenario: string; seed: number; source: string; curve: string; hypothesis1: string; hypothesis2: string; hypothesisRight: boolean; caseDefVerdict: string;
  surveys: number; interviews: number; waterTests: number; inspections: number; activeFinding: boolean; interventions: { kind: string; day: number }[]; targeted: boolean;
  casesPrevented: number; daysUsed: number; budgetUsed: number; at: number;
}
export interface CitySummary { missions: Record<string, { gapStart: number; gapEnd: number; reduced: number; target: number; won: boolean; stars: number; displacedPct: number; built: string[]; at: number }> }
export interface Profile {
  id: string; name: string; period: string; created: number; lastSeen: number;
  progress: Record<string, { completed: string[]; lastRoute?: string; minutes: number }>;
  mastery: MasteryMap;
  responses: ResponseRec[];
  written: WrittenRec[];
  notebook: { summaryCards: string[]; terms: string[] };
  lessonsDone: string[];
  crossroads?: Record<string, { ending: string; reasoning: unknown[]; rubric: { id: string; score: number; max: number }[]; at: number; summary?: Record<string, unknown> }>;
  lab?: LabSummary; city?: CitySummary; report?: { summary: string; at: number };
}
export interface Backup { app: 'riverton'; version: 1; exported: number; profile: Profile }

interface State {
  profiles: Record<string, Profile>;
  activeId: string | null;
  create: (name: string, period?: string) => string;
  switchTo: (id: string) => void;
  remove: (id: string) => void;
  active: () => Profile | null;
  update: (fn: (p: Profile) => Profile) => void;
  recordResponse: (r: Omit<ResponseRec, 'id' | 't'>, context: string) => void;
  recordWritten: (w: Omit<WrittenRec, 'id' | 't'>) => void;
  introduce: (concept: string) => void;
  completeLesson: (lessonId: string, cardIds: string[]) => void;
  addTerm: (term: string) => void;
  exportBackup: () => Backup | null;
  importBackup: (raw: string) => { ok: boolean; error?: string };
}

const KEY = 'riverton.profiles';
const uid = () => Math.random().toString(36).slice(2, 10);
const load = () => getJSON<{ profiles: Record<string, Profile>; activeId: string | null }>(KEY, { profiles: {}, activeId: null });
const persist = (s: Pick<State, 'profiles' | 'activeId'>) => setJSON(KEY, { profiles: s.profiles, activeId: s.activeId });

export const blankProfile = (name: string, period = ''): Profile => ({
  id: uid(), name: name.trim(), period: period.trim(), created: Date.now(), lastSeen: Date.now(),
  progress: {}, mastery: {}, responses: [], written: [], notebook: { summaryCards: [], terms: [] }, lessonsDone: [],
});

export const useProfiles = create<State>((set, get) => {
  const commit = (patch: Partial<State>) => { set(patch); persist(get()); };
  const mutate = (fn: (p: Profile) => Profile) => {
    const { profiles, activeId } = get();
    if (!activeId || !profiles[activeId]) return;
    commit({ profiles: { ...profiles, [activeId]: { ...fn(profiles[activeId]), lastSeen: Date.now() } } });
  };
  return {
    ...load(),
    create: (name, period) => {
      const p = blankProfile(name, period);
      commit({ profiles: { ...get().profiles, [p.id]: p }, activeId: p.id });
      return p.id;
    },
    switchTo: (id) => commit({ activeId: get().profiles[id] ? id : get().activeId }),
    remove: (id) => {
      const { [id]: _gone, ...rest } = get().profiles; void _gone;
      commit({ profiles: rest, activeId: get().activeId === id ? Object.keys(rest)[0] ?? null : get().activeId });
    },
    active: () => { const s = get(); return s.activeId ? s.profiles[s.activeId] ?? null : null; },
    update: mutate,
    recordResponse: (r, context) => mutate((p) => ({
      ...p,
      responses: [...p.responses, { ...r, id: uid(), t: Date.now() }],
      mastery: r.correct == null ? p.mastery : applyResult(p.mastery, r.concept, r.correct, context),
    })),
    recordWritten: (w) => mutate((p) => ({ ...p, written: [...p.written, { ...w, id: uid(), t: Date.now() }] })),
    introduce: (concept) => mutate((p) => ({ ...p, mastery: markIntroduced(p.mastery, concept) })),
    completeLesson: (lessonId, cardIds) => mutate((p) => ({
      ...p,
      lessonsDone: p.lessonsDone.includes(lessonId) ? p.lessonsDone : [...p.lessonsDone, lessonId],
      notebook: { ...p.notebook, summaryCards: [...new Set([...p.notebook.summaryCards, ...cardIds])] },
    })),
    addTerm: (term) => mutate((p) => ({ ...p, notebook: { ...p.notebook, terms: [...new Set([...p.notebook.terms, term])] } })),
    exportBackup: () => { const p = get().active(); return p ? { app: 'riverton', version: 1, exported: Date.now(), profile: p } : null; },
    importBackup: (raw) => {
      try {
        const b = JSON.parse(raw) as Backup;
        if (b.app !== 'riverton' || b.version !== 1 || !b.profile?.id || !b.profile.name) return { ok: false, error: 'This is not a Riverton backup file.' };
        commit({ profiles: { ...get().profiles, [b.profile.id]: b.profile }, activeId: b.profile.id });
        return { ok: true };
      } catch {
        return { ok: false, error: 'Could not read that file.' };
      }
    },
  };
});
