import { create } from 'zustand';
import { getJSON, setJSON } from '../../../platform/storage';
import { advanceMut, createCity, INTERVENTIONS, POLICIES, preview, type CityState } from '../sim';
import { apply, replay, type Action } from './log';
import { MISSIONS, eastsideGap, missionById, type MissionDef } from './missions';
import { POE, nameOf, valuesOf, type Prediction, type Values } from './poe';
import type { Overlay } from '../render/CityScene';

export interface Snap { id: string; name: string; month: number; logLen: number; cash: number; hoods: Record<string, { out: Record<string, number>; det: Record<string, number>; displacedPct: number }>; gap: number }
export interface PendingPoe { pred: Prediction; before: Values; dueMonth: number; stage: 'predict' | 'wait' | 'observe' | 'done' }
export interface Pending { type: string; kind: 'building' | 'program' | 'city' | 'policy'; at?: [number, number]; hood?: string; sliding: boolean }
interface Saved { missionId: string; log: Action[]; month: number; snaps: Snap[]; done: boolean; startLogLen: number; poeSeen: string[]; checklist: string[] }

export const OPTS = (m: MissionDef) => ({ seed: m.seed, startingCash: m.startingCash, annualBudget: m.annualBudget, eventsEnabled: m.allowEvents });
const snapOf = (s: CityState, name: string, logLen: number): Snap => ({ id: Math.random().toString(36).slice(2, 8), name, month: s.month, logLen, cash: s.cash, gap: eastsideGap(s), hoods: Object.fromEntries(Object.entries(s.hoods).map(([k, h]) => [k, { out: { ...h.out } as Record<string, number>, det: { ...h.det } as Record<string, number>, displacedPct: h.displacedPct }])) });

interface Game {
  profileId: string | null; mission: MissionDef | null; city: CityState; log: Action[]; v: number; startGap: number; done: boolean;
  speed: 0 | 1 | 2 | 5; until: number | null; overlay: Overlay; hood: string | null; building: string | null; palette: string | null; pending: Pending | null; message: string;
  snaps: Snap[]; startLogLen: number; poe: PendingPoe[]; poeSeen: string[]; checklist: string[]; why: { hood: string; out: string } | null;
  start: (pid: string, id: MissionDef['id'], resume?: boolean) => void; exit: () => void;
  setSpeed: (s: Game['speed']) => void; advanceYears: (n: number) => void; tick: () => void;
  setOverlay: (o: Overlay) => void; selectHood: (h: string | null) => void; selectBuilding: (u: string | null) => void; setPalette: (p: string | null) => void;
  stage: (p: Pending | null) => void; confirm: () => { ok: boolean; error?: string; firstOfType?: boolean };
  remove: (uid: string) => void; save: () => void; takeSnap: (name: string) => void; restore: (id: string) => void; revise: () => void;
  answerPredict: (pred: Prediction) => void; finishPoe: (type: string) => void; markCheck: (k: string) => void; openWhy: (w: Game['why']) => void;
}
const key = (pid: string) => `riverton.city.${pid}`;

export const useGame = create<Game>((set, get) => ({
  profileId: null, mission: null, city: createCity(), log: [], v: 0, startGap: 0, done: false, speed: 0, until: null, overlay: null, hood: null, building: null, palette: null, pending: null, message: '',
  snaps: [], startLogLen: 0, poe: [], poeSeen: [], checklist: [], why: null,

  start: (pid, id, resume) => {
    const m = missionById(id); const saved = resume ? getJSON<Record<string, Saved>>(key(pid), {})[id] : undefined;
    const city = saved ? replay(OPTS(m), saved.log, saved.month) : createCity(OPTS(m));
    set({ profileId: pid, mission: m, city, log: saved?.log ?? [], v: 0, startGap: eastsideGap(createCity(OPTS(m))), done: saved?.done ?? false, speed: 0, until: null, overlay: null, hood: null, building: null, palette: null, pending: null, message: '',
      snaps: saved?.snaps ?? [], startLogLen: saved?.startLogLen ?? 0, poe: [], poeSeen: saved?.poeSeen ?? [], checklist: saved?.checklist ?? [], why: null });
  },
  exit: () => { get().save(); set({ mission: null, speed: 0, until: null }); },
  setSpeed: (s) => set({ speed: s, until: null }),
  advanceYears: (n) => set((st) => ({ until: Math.min(st.city.month + n * 12, (st.mission?.years ?? 30) * 12), speed: 0 })),
  tick: () => {
    const st = get(); if (!st.mission || st.done) return;
    if (st.poe.some((p) => p.stage === 'predict' || p.stage === 'observe')) return; // modal is open: time waits
    const m = st.mission; advanceMut(st.city, 1);
    const due = st.poe.find((p) => p.stage === 'wait' && st.city.month >= p.dueMonth);
    const end = st.city.month >= m.years * 12;
    if (due) due.stage = 'observe';
    set({ v: st.v + 1, speed: end || due ? 0 : st.speed, until: end || due || (st.until != null && st.city.month >= st.until) ? null : st.until, done: end, poe: [...st.poe], message: st.city.events.length && st.city.events[st.city.events.length - 1].month === st.city.month ? st.city.events[st.city.events.length - 1].note : st.message });
    if (end) get().save();
  },
  setOverlay: (o) => { set({ overlay: o }); if (o) get().markCheck('overlay'); },
  selectHood: (h) => { set({ hood: h, building: null }); if (h) get().markCheck('hood'); },
  selectBuilding: (u) => set({ building: u, hood: u ? get().city.placed.find((p) => p.uid === u)?.hood ?? get().hood : get().hood }),
  setPalette: (p) => set({ palette: p, pending: null, building: null }),
  stage: (p) => set({ pending: p }),
  confirm: () => {
    const st = get(); const p = st.pending; if (!p) return { ok: false };
    const a: Action = p.kind === 'policy' ? { m: st.city.month, k: 'policy', id: p.type, on: true } : { m: st.city.month, k: 'place', type: p.type, hood: p.hood, at: p.at, sliding: p.sliding };
    const r = apply(structuredClone(st.city), a); if (r.error) { set({ message: r.error }); return { ok: false, error: r.error }; }
    const first = !st.poeSeen.includes(p.type) && !!POE[p.type];
    const poe = [...st.poe];
    if (first) poe.push({ pred: { type: p.type, hood: p.hood ?? 'eastside', outcome: '', direction: 0, magnitude: 'small', neighborhood: p.hood ?? 'eastside', month: st.city.month }, before: valuesOf(st.city), dueMonth: st.city.month + Math.max(18, INTERVENTIONS[p.type] ? INTERVENTIONS[p.type].constructionMonths + 12 : 18), stage: 'predict' });
    set({ city: r.state, log: [...st.log, a], pending: null, palette: null, v: st.v + 1, poe, poeSeen: first ? [...st.poeSeen, p.type] : st.poeSeen, message: `${nameOf(p.type)} ${p.kind === 'policy' ? 'adopted' : 'started'}.` });
    if (p.type === 'clinic') get().markCheck('clinic'); get().save();
    return { ok: true, firstOfType: first };
  },
  remove: (uid) => { const st = get(); const a: Action = { m: st.city.month, k: 'remove', uid }; const r = apply(structuredClone(st.city), a); if (!r.error) set({ city: r.state, log: [...st.log, a], building: null, v: st.v + 1 }); },
  save: () => {
    const st = get(); if (!st.profileId || !st.mission) return; const all = getJSON<Record<string, Saved>>(key(st.profileId), {});
    all[st.mission.id] = { missionId: st.mission.id, log: st.log, month: st.city.month, snaps: st.snaps, done: st.done, startLogLen: st.startLogLen, poeSeen: st.poeSeen, checklist: st.checklist }; setJSON(key(st.profileId), all);
  },
  takeSnap: (name) => { const st = get(); set({ snaps: [...st.snaps, snapOf(st.city, name, st.log.length)] }); get().save(); },
  restore: (id) => { const st = get(); const sn = st.snaps.find((x) => x.id === id); if (!sn || !st.mission) return; const log = st.log.slice(0, sn.logLen); set({ city: replay(OPTS(st.mission), log, sn.month), log, v: st.v + 1, done: false, speed: 0, until: null, poe: [] }); },
  revise: () => { const st = get(); if (!st.mission) return; const log = st.log.filter((a) => a.m === 0); set({ city: replay(OPTS(st.mission), log, 0), log, v: st.v + 1, done: false, speed: 0, until: null, poe: [], message: 'Back to the start of year 1 with your first plan. Change something, then run it again.' }); },
  answerPredict: (pred) => { const st = get(); set({ poe: st.poe.map((p) => (p.pred.type === pred.type && p.stage === 'predict' ? { ...p, pred, stage: 'wait' } : p)) }); },
  finishPoe: (type) => set((st) => ({ poe: st.poe.map((p) => (p.pred.type === type ? { ...p, stage: 'done' } : p)) })),
  markCheck: (k) => set((st) => (st.checklist.includes(k) ? st : { checklist: [...st.checklist, k] })),
  openWhy: (w) => { set({ why: w }); if (w) get().markCheck('why'); },
}));
export { MISSIONS, POLICIES, preview };
