import { create } from 'zustand';
import { getJSON, setJSON } from '../storage';
import { useProfiles, type Profile } from '../profile/profileStore';

export interface SyncConfig { url: string; code: string }
export interface QueueItem { id: string; kind: 'event' | 'written' | 'progress'; [k: string]: unknown }
export type SyncStatus = 'off' | 'synced' | 'pending' | 'offline';
interface Persisted { config: SyncConfig | null; queue: { pid: string; name: string; period: string; item: QueueItem; tries: number }[]; counters: Record<string, { r: number; w: number; p: string }> }
interface Store extends Persisted { status: SyncStatus; lastError: string; nextTry: number; setConfig: (c: SyncConfig | null) => void }
const KEY = 'riverton.sync';
const load = (): Persisted => ({ config: null, queue: [], counters: {}, ...getJSON<Partial<Persisted>>(KEY, {}) });
const save = (s: Store) => setJSON(KEY, { config: s.config, queue: s.queue.slice(-2000), counters: s.counters });

export const useSync = create<Store>((set, get) => ({ ...load(), status: 'off', lastError: '', nextTry: 0, setConfig: (config) => { set({ config, status: config ? 'pending' : 'off' }); save(get()); } }));

const LVL: Record<string, number> = { none: 0, introduced: 33, practiced: 66, mastered: 100 };
/** Turns new profile activity into sync items. Only grading data: no click streams, no free-roam telemetry. */
export function itemsFor(p: Profile, seen: { r: number; w: number; p: string }): { items: QueueItem[]; seen: { r: number; w: number; p: string } } {
  const items: QueueItem[] = [];
  for (const r of p.responses.slice(seen.r)) items.push({ id: `${p.id}:${r.id}`, kind: 'event', t: r.t, module: r.module, item: r.qid, concept: r.concept, type: r.type, correct: r.correct, attempts: r.attempts, hint: r.hintUsed, prediction: r.prediction ?? '', chosen: r.chosen ?? '' });
  for (const w of p.written.slice(seen.w)) items.push({ id: `${p.id}:${w.id}`, kind: 'written', t: w.t, module: w.module, wkind: w.kind, item: w.qid, text: w.text });
  const mastery = Object.fromEntries(Object.entries(p.mastery).map(([k, v]) => [k, LVL[v.level]]));
  const sig = JSON.stringify([Object.entries(p.progress).map(([k, v]) => [k, v.completed, Math.round(v.minutes)]), mastery]);
  if (sig !== seen.p) {
    const mods = Object.entries(p.progress); if (!mods.length) mods.push(['overall', { completed: [], minutes: 0 }]);
    for (const [mod, v] of mods) items.push({ id: `progress:${p.id}:${mod}`, kind: 'progress', module: mod, completed: v.completed, minutes: Math.round(v.minutes * 10) / 10, mastery });
  }
  return { items, seen: { r: p.responses.length, w: p.written.length, p: sig } };
}

export function scan(): void {
  const st = useSync.getState(); if (!st.config) return;
  const { profiles } = useProfiles.getState(); const queue = [...st.queue]; const counters = { ...st.counters }; let changed = false;
  for (const p of Object.values(profiles)) {
    const r = itemsFor(p, counters[p.id] ?? { r: 0, w: 0, p: '' });
    if (r.items.length) { changed = true; for (const item of r.items) { if (item.kind === 'progress') { const i = queue.findIndex((q) => q.item.id === item.id); if (i >= 0) { queue.splice(i, 1); } } queue.push({ pid: p.id, name: p.name, period: p.period, item, tries: 0 }); } }
    counters[p.id] = r.seen;
  }
  if (changed) { useSync.setState({ queue, counters, status: 'pending' }); save(useSync.getState()); }
}

export async function flush(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const st = useSync.getState(); if (!st.config) return false; scan();
  const q = useSync.getState().queue; if (!q.length) { useSync.setState({ status: 'synced' }); return true; }
  if (Date.now() < st.nextTry) return false;
  const first = q[0]; const batch = q.filter((x) => x.pid === first.pid).slice(0, 50);
  try {
    const res = await fetchImpl(st.config.url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ code: st.config.code, student: { name: first.name, period: first.period }, items: batch.map((b) => b.item) }), keepalive: true });
    const data = (await res.json()) as { ok: boolean; accepted?: string[]; error?: string };
    if (!data.ok) throw new Error(data.error ?? 'rejected');
    const done = new Set(data.accepted ?? []); const left = useSync.getState().queue.filter((x) => !(batch.includes(x) && done.has(x.item.id)));
    useSync.setState({ queue: left, status: left.length ? 'pending' : 'synced', lastError: '', nextTry: 0 }); save(useSync.getState());
    return left.length === 0 || (await flush(fetchImpl));
  } catch (e) {
    const tries = batch[0].tries + 1; batch.forEach((b) => (b.tries = tries));
    useSync.setState({ status: 'offline', lastError: e instanceof Error ? e.message : String(e), nextTry: Date.now() + Math.min(300_000, 2000 * 2 ** tries) }); save(useSync.getState()); return false;
  }
}

export async function testConnection(cfg: SyncConfig, fetchImpl: typeof fetch = fetch): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetchImpl(cfg.url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ code: cfg.code, test: true }) });
    const d = (await res.json()) as { ok: boolean; error?: string }; return d.ok ? { ok: true, message: 'Connected. Your class code works.' } : { ok: false, message: d.error === 'bad class code' ? 'The class code does not match the one in your script.' : `The script answered: ${d.error}` };
  } catch { return { ok: false, message: 'Could not reach the web app URL. Check the URL and that the deployment allows "Anyone".' }; }
}

let started = false;
export function startSync() {
  if (started) return; started = true;
  useProfiles.subscribe(() => { scan(); });
  setInterval(() => { void flush(); }, 60_000);
  const beacon = () => { const st = useSync.getState(); if (!st.config || !st.queue.length) return; scan(); const first = useSync.getState().queue[0]; const batch = useSync.getState().queue.filter((x) => x.pid === first.pid).slice(0, 50); try { navigator.sendBeacon(st.config.url, new Blob([JSON.stringify({ code: st.config.code, student: { name: first.name, period: first.period }, items: batch.map((b) => b.item) })], { type: 'text/plain' })); } catch { /* keep queued */ } };
  window.addEventListener('pagehide', beacon); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') beacon(); });
  window.addEventListener('online', () => { useSync.setState({ nextTry: 0 }); void flush(); }); void flush();
}
