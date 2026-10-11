import { advanceMut, createCity, placeIntervention, removeIntervention, setOption, setPolicy, type CityOptions, type CityState } from '../sim';

/** A player action. Saves store only the seed and this log; the sim is deterministic, so state is rebuilt by replay. */
export type Action =
  | { m: number; k: 'place'; type: string; hood?: string; at?: [number, number]; sliding?: boolean }
  | { m: number; k: 'remove'; uid: string }
  | { m: number; k: 'policy'; id: string; on: boolean }
  | { m: number; k: 'option'; uid: string; key: string; value: boolean };

export function apply(state: CityState, a: Action): { state: CityState; error?: string } {
  const r = a.k === 'place' ? placeIntervention(state, { type: a.type, hood: a.hood, at: a.at, opts: a.sliding ? { sliding: true } : undefined })
    : a.k === 'remove' ? removeIntervention(state, a.uid) : a.k === 'policy' ? setPolicy(state, a.id, a.on) : setOption(state, a.uid, a.key, a.value);
  return r.ok ? { state: r.state } : { state, error: r.error };
}

/** Rebuild a city by replaying the log up to `toMonth` (inclusive of actions taken that month). */
export function replay(opts: CityOptions, log: Action[], toMonth: number): CityState {
  let s = createCity(opts);
  for (const a of log) {
    if (a.m > toMonth) break;
    if (a.m > s.month) advanceMut(s, a.m - s.month);
    s = apply(s, a).state;
  }
  if (toMonth > s.month) advanceMut(s, toMonth - s.month);
  return s;
}
