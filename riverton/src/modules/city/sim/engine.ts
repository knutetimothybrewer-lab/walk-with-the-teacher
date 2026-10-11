import world from '../../../content/shared/riverton-world.json';
import { TUNING, INTERVENTIONS, POLICIES } from './config';
import { HOOD_IDS, dist, hoodAt, labelOf, type Pt } from './geometry';
import { next, nextRange } from './rng';
import { BEHS, DETS, OUTS } from './types';
import type { Beh, CityOptions, CityState, Contribution, Det, Effect, HoodState, Out, Placed, Result, Snapshot, Vec } from './types';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const hoodDefs = world.neighborhoods;
const MI = TUNING.milesToUnits;

// ---------------------------------------------------------------- baselines
function baselineBeh(det: Vec<Det>, profilePre1978: number, highway: number): Vec<Beh> {
  const b = {} as Vec<Beh>;
  for (const k of BEHS) {
    let v = 50;
    for (const [d, c] of Object.entries(TUNING.behaviorFromDeterminant[k])) v += c * (det[d as Det] - 50);
    b[k] = v;
  }
  b.leadExposure = clamp(profilePre1978, 0, 100);       // share of pre-1978 housing (lead paint and pipes)
  b.pollutantExposure = clamp(100 - det.air, 0, 100);
  void highway;
  return b;
}

export function createCity(opts: CityOptions = {}): CityState {
  const seed = (opts.seed ?? 1) >>> 0;
  const base: CityState['base'] = {}; const hoods: CityState['hoods'] = {};
  for (const h of hoodDefs) {
    const det = { ...h.determinants } as Vec<Det>;
    const out = { ...h.outcomes, uninsured: h.profile.uninsuredPct, mentalDays: 2.2 + 0.035 * (100 - det.economic) + 0.02 * (100 - det.cohesion) } as unknown as Vec<Out>;
    const beh = baselineBeh(det, h.profile.housingPre1978Pct, h.profile.highwayProximity);
    base[h.id] = { det: { ...det }, beh: { ...beh }, out: { ...out }, income: h.profile.medianIncome, pop: h.profile.population };
    hoods[h.id] = { id: h.id, pop: h.profile.population, income: h.profile.medianIncome, det, beh, out, acute: 0, rentPressure: 0, displacedPct: 0 };
  }
  const s: CityState = {
    seed, rng: seed ^ 0x9e3779b9, month: 0, cash: opts.startingCash ?? TUNING.budget.defaultStartingCash,
    annualBudget: opts.annualBudget ?? TUNING.budget.defaultAnnualBudget, deficitMonths: 0,
    hoods, base, placed: [], policies: {}, shocks: [], events: [], eventsEnabled: !!opts.eventsEnabled, nextUid: 1, history: [], log: [],
  };
  s.history.push(snapshot(s, contributions(s)));
  return s;
}

// ---------------------------------------------------------------- coverage / reach
export function coverage(def: typeof INTERVENTIONS[string], at: Pt | null, placedHood: string, targetHood: string): number {
  if (def.scope === 'city') return 1;
  if (def.scope === 'hood') return placedHood === targetHood ? 1 : 0;
  if (!at) return 0;
  const transit = hoodDefs.find((h) => h.id === targetHood)!.profile.transitAccess;
  const reach = def.radiusMiles * MI * (1 + (def.transitExtends ? 0.8 * transit : 0));
  const d = dist(at, labelOf(targetHood));
  let c = clamp(1 - d / reach, 0, 1);
  if (targetHood === placedHood) c = Math.max(c, TUNING.ownHoodFloor);
  return c;
}

/** Ghost preview for drag-and-drop: who a facility would reach, and what it costs. */
export function preview(state: CityState, type: string, at: Pt, hood?: string) {
  const def = INTERVENTIONS[type];
  const placedHood = hood ?? hoodAt(at);
  const per = HOOD_IDS.map((id) => ({ hood: id, coverage: coverage(def, at, placedHood, id), people: Math.round(coverage(def, at, placedHood, id) * state.hoods[id].pop) }));
  return { hood: placedHood, coverage: per, peopleReached: per.reduce((a, b) => a + b.people, 0), cost: capitalCost(def, placedHood, state), opCost: def.opCost };
}
function capitalCost(def: typeof INTERVENTIONS[string], hood: string, state: CityState): number {
  return def.costScale === 'pop' ? +(def.cost * (state.hoods[hood].pop / 20000)).toFixed(2) : def.cost;
}

// ---------------------------------------------------------------- actions
const clone = <T,>(s: T): T => structuredClone(s);

export function placeIntervention(state: CityState, req: { type: string; at?: Pt; hood?: string; opts?: Record<string, boolean>; scale?: number }): Result<CityState> {
  const def = INTERVENTIONS[req.type];
  if (!def) return { ok: false, error: `Unknown intervention ${req.type}` };
  const at = req.at ?? null;
  const hood = req.hood ?? (at ? hoodAt(at) : undefined);
  if (def.scope !== 'city' && !hood) return { ok: false, error: 'Choose a neighborhood or a place on the map.' };
  if (def.targetHoods && hood && !def.targetHoods.includes(hood)) return { ok: false, error: `${def.name} only applies near its source (${def.targetHoods.join(', ')}).` };
  const s = clone(state);
  const placedHood = hood ?? 'city';
  if (def.scope === 'hood' && s.placed.some((p) => p.type === req.type && p.hood === placedHood)) return { ok: false, error: `${def.name} is already running in that neighborhood.` };
  if (def.scope === 'city' && s.placed.some((p) => p.type === req.type)) return { ok: false, error: `${def.name} is already built.` };
  const scale = req.scale ?? 1;
  const cost = +((placedHood === 'city' ? def.cost : capitalCost(def, placedHood, s)) * scale).toFixed(3);
  if (cost > s.cash) return { ok: false, error: `Not enough funds: needs $${cost}M, you have $${s.cash.toFixed(1)}M.` };
  s.cash -= cost;
  const cov: Record<string, number> = {};
  for (const id of HOOD_IDS) cov[id] = coverage(def, at, placedHood, id);
  const noise = 1 + nextRange(s, -TUNING.noise.effectRealization, TUNING.noise.effectRealization);
  const p: Placed = {
    uid: `${req.type}#${s.nextUid++}`, type: req.type, hood: placedHood, at, builtMonth: s.month,
    openMonth: s.month + def.constructionMonths, status: def.constructionMonths > 0 ? 'building' : 'open', noise, scale, cov,
    opts: { ...(def.defaultOpts ?? {}), ...(req.opts ?? {}) }, capital: cost,
  };
  s.placed.push(p);
  s.log.push(`Month ${s.month}: started ${def.name} in ${placedHood} ($${cost}M)`);
  return { ok: true, state: refresh(s) };
}

export function removeIntervention(state: CityState, uid: string, refund = false): Result<CityState> {
  const s = clone(state);
  const i = s.placed.findIndex((p) => p.uid === uid);
  if (i < 0) return { ok: false, error: 'Not found.' };
  const [p] = s.placed.splice(i, 1);
  if (refund && p.status === 'building') s.cash += p.capital;
  s.log.push(`Month ${s.month}: removed ${INTERVENTIONS[p.type].name}`);
  return { ok: true, state: refresh(s) };
}

export function setPolicy(state: CityState, id: string, on: boolean): Result<CityState> {
  if (!POLICIES[id]) return { ok: false, error: `Unknown policy ${id}` };
  const s = clone(state);
  if (on && s.policies[id] == null) s.policies[id] = s.month;
  if (!on) delete s.policies[id];
  return { ok: true, state: refresh(s) };
}

export function setOption(state: CityState, uid: string, key: string, value: boolean): Result<CityState> {
  const s = clone(state);
  const p = s.placed.find((x) => x.uid === uid);
  if (!p) return { ok: false, error: 'Not found.' };
  p.opts[key] = value;
  return { ok: true, state: refresh(s) };
}

// ---------------------------------------------------------------- the causal chain
const statusMult = (p: Placed) => (p.status === 'open' ? 1 : p.status === 'reduced' ? TUNING.budget.reducedMult : 0);
const rampOf = (p: Placed, m: number, lag: number) => clamp((m - p.openMonth) / Math.max(1, lag), 0, 1);

function modifierMult(p: Placed, hood: string, st: CityState, effect: Effect): number {
  const def = INTERVENTIONS[p.type];
  let m = 1;
  const M = TUNING.modifiers;
  const h = hoodDefs.find((x) => x.id === hood)!;
  for (const name of def.modifiers ?? []) {
    if (name === 'affordability' && !p.opts.sliding && h.profile.medianIncome < (M.affordability.belowIncome as number) && effect.key === 'activity') m *= M.affordability.withoutSliding as number;
    if (name === 'safetyTransit') m *= (M.safetyTransit.base as number) + (M.safetyTransit.weight as number) * (st.hoods[hood].det.safety / 100 + h.profile.transitAccess) / 2;
    if (name === 'safetyOnly') m *= (M.safetyOnly.base as number) + (M.safetyOnly.weight as number) * (st.hoods[hood].det.safety / 100);
    if (name === 'insuranceOutreach' && st.placed.some((q) => q.type === (M.insuranceOutreach.partner as string) && q.cov[hood] > 0 && q.status !== 'building')) m *= M.insuranceOutreach.mult as number;
  }
  return m;
}

function synergyMult(p: Placed, hood: string, st: CityState, effectName: string): number {
  const def = INTERVENTIONS[p.type];
  let m = 1;
  for (const s of def.synergies ?? []) {
    if (!s.applyTo.includes(effectName)) continue;
    if (s.with) {
      const partner = st.placed.find((q) => q.type === s.with && q.cov[hood] >= 0.3 && q.status !== 'building' && q.status !== 'closed');
      if (partner) m *= 1 + (s.mult - 1) * Math.min(1, partner.cov[hood]);
    } else if (s.detAtLeast && st.base[hood].det[s.detAtLeast.key] + 0 >= 0) {
      if (st.hoods[hood].det[s.detAtLeast.key] >= s.detAtLeast.value) m *= s.mult;
    }
  }
  return m;
}

interface Contribs { det: Record<string, Partial<Record<Det, Contribution[]>>>; beh: Record<string, Partial<Record<Beh, Contribution[]>>>; acute: Record<string, number>; rentGain: Record<string, number>; rentShield: number }

/** Every change in a determinant or behavior is a list of named contributions, so it can always be explained. */
export function contributions(st: CityState): Contribs {
  const out: Contribs = { det: {}, beh: {}, acute: {}, rentGain: {}, rentShield: 0 };
  const m = st.month;
  for (const id of HOOD_IDS) {
    out.det[id] = {}; out.beh[id] = {}; out.acute[id] = 0; out.rentGain[id] = 0;
    const groups = new Map<string, Contribution[]>(); // key: det|beh.key.type
    const push = (kind: 'det' | 'beh', key: string, type: string, c: Contribution) => {
      const k = `${kind}.${key}.${type}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(c);
    };
    for (const p of st.placed) {
      const def = INTERVENTIONS[p.type]; const cov = p.cov[id] ?? 0;
      if (cov <= 0 || statusMult(p) === 0) continue;
      for (const e of def.effects) {
        if (e.amount === 0) continue;
        let a = e.amount * (p.scale ?? 1) * cov * rampOf(p, m, e.lag) * statusMult(p) * p.noise * modifierMult(p, id, st, e);
        if (e.target === 'acute') { out.acute[id] += a; continue; }
        a *= synergyMult(p, id, st, `${e.target}.${e.key}`);
        if (e.target === 'det' && a > 0) a *= Math.max(TUNING.headroom.floor, (100 - st.base[id].det[e.key as Det]) / 100);
        if (e.target === 'beh') a *= behRoom(st, id, e.key as Beh, a);
        if (a !== 0) push(e.target, e.key, p.type, { src: p.uid, label: def.name, amount: a });
      }
      if (def.amenity) out.rentGain[id] += def.amenity * (p.scale ?? 1) * cov * statusMult(p);
    }
    for (const [pid, start] of Object.entries(st.policies)) {
      const def = POLICIES[pid];
      for (const e of def.effects) {
        const a = e.amount * clamp((m - start) / Math.max(1, e.lag), 0, 1);
        if (a !== 0) push(e.target as 'det' | 'beh', e.key, `policy:${pid}`, { src: `policy:${pid}`, label: def.name, amount: a });
      }
    }
    for (const sh of st.shocks) {
      if (sh.hood !== id) continue;
      const t = m - sh.start; if (t < 0) continue;
      const rise = clamp(t / Math.max(1, sh.rise), 0, 1);
      const fall = sh.decay == null ? 1 : clamp(1 - Math.max(0, t - sh.rise) / Math.max(1, sh.decay), 0, 1);
      const a = sh.amount * rise * fall;
      if (a !== 0) push('det', sh.det, `event:${sh.id}`, { src: `event:${sh.id}`, label: sh.label, amount: a });
    }
    // diminishing returns: for each (kind,key,type) keep the strongest instance at full weight, then taper
    const w = TUNING.diminishing;
    for (const [k, list] of groups) {
      const [kind, key] = k.split('.');
      list.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      const tapered = list.map((c, i) => ({ ...c, amount: c.amount * (w[Math.min(i, w.length - 1)]) }));
      const dest = kind === 'det' ? out.det[id] : out.beh[id];
      const arr = ((dest as Record<string, Contribution[]>)[key] ??= []);
      arr.push(...tapered);
    }
    const hs = st.hoods[id];
    if (hs.displacedPct > 0) {
      (out.det[id].economic ??= []).push({ src: 'displacement', label: 'Higher-income newcomers (displacement)', amount: Math.min(TUNING.rent.maxEcon, TUNING.rent.econArtifact * hs.displacedPct) });
      (out.det[id].housing ??= []).push({ src: 'displacement', label: 'Rising rents', amount: -TUNING.rent.housingPenalty * hs.displacedPct });
    }
    out.acute[id] = 1 - Math.exp(-out.acute[id]);
  }
  out.rentShield = Object.keys(st.policies).reduce((a, k) => a + (POLICIES[k].protectsRent ?? 0), 0);
  return out;
}

/** Behaviors saturate: a program that improves a behavior has less room to work where it is already healthy. */
function behRoom(st: CityState, id: string, k: Beh, amount: number): number {
  const better = TUNING.behaviorBetter[k]; if (Math.sign(amount) !== better) return 1;
  const base = st.base[id].beh[k]; const room = better === 1 ? 100 - base : base;
  const r = TUNING.behaviorRoom; return clamp(room / r.scale, r.min, r.max);
}
const sum = (l?: Contribution[]) => (l ? l.reduce((a, c) => a + c.amount, 0) : 0);

function snapshot(st: CityState, c: Contribs): Snapshot {
  const hoods: Snapshot['hoods'] = {};
  for (const id of HOOD_IDS) {
    const h = st.hoods[id];
    hoods[id] = { acute: h.acute, det: { ...h.det }, beh: { ...h.beh }, out: { ...h.out }, contribDet: c.det[id], contribBeh: c.beh[id] };
  }
  return { m: st.month, hoods };
}

/** Recompute determinants (instant reflection of the current contributions) without advancing time. */
function refresh(st: CityState): CityState {
  const c = contributions(st);
  for (const id of HOOD_IDS) for (const d of DETS) st.hoods[id].det[d] = clamp(st.base[id].det[d] + sum(c.det[id][d]), 0, 100);
  st.history[st.history.length - 1] = snapshot(st, c);
  return st;
}

// ---------------------------------------------------------------- time
function monthlyOutcomeTarget(st: CityState, id: string, o: Out, acute: number): number {
  const t = TUNING.outcomes[o]; const b = st.base[id]; const h = st.hoods[id];
  let delta = 0;
  for (const [k, c] of Object.entries(t.beh)) delta += c * (h.beh[k as Beh] - b.beh[k as Beh]);
  for (const [k, c] of Object.entries(t.det)) delta += c * (h.det[k as Det] - b.det[k as Det]);
  if (t.acute) delta += t.acute * acute;
  const v = t.mode === 'log' ? b.out[o] * Math.exp(delta) : b.out[o] + delta;
  return clamp(v, t.min, t.max);
}

function heatWave(st: CityState) {
  const c = contributions(st); let total = 0;
  for (const id of HOOD_IDS) {
    const h = st.hoods[id]; const hd = hoodDefs.find((x) => x.id === id)!;
    const shield = st.placed.filter((p) => p.status === 'open').reduce((a, p) => a + (INTERVENTIONS[p.type].heatShield ?? 0) * (p.cov[id] ?? 0), 0);
    const vuln = (100 - h.det.cohesion) / 100 + (1 - hd.profile.parkAccess) * 0.5;
    total += h.pop * 0.00012 * vuln * (1 - 0.5 * c.acute[id]) * (1 - Math.min(0.6, shield));
  }
  total = Math.round(total);
  st.events.push({ id: `heat${st.month}`, type: 'heat_wave', month: st.month, hoods: HOOD_IDS, deaths: total, note: `A heat wave: an estimated ${total} heat-related deaths.` });
}
/** Force a heat wave now (sandbox event button, missions, tests). Emergency care and green space reduce deaths. */
export function triggerHeatWave(state: CityState): { state: CityState; deaths: number } {
  const s = clone(state); heatWave(s);
  return { state: s, deaths: s.events[s.events.length - 1].deaths ?? 0 };
}

function scheduleEvents(st: CityState) {
  const mo = st.month % 12; const per = (y: number) => y / 12;
  const E = TUNING.events;
  if (next(st) < per(E.grantPerYear)) { const g = +nextRange(st, 2, 5).toFixed(1); st.cash += g; st.events.push({ id: `ev${st.events.length}`, type: 'grant', month: st.month, hoods: [], note: `A $${g}M health grant arrives.` }); }
  if (next(st) < per(E.factoryClosurePerYear) && !st.events.some((e) => e.type === 'factory_closure')) {
    const id = `factory${st.month}`;
    st.shocks.push({ id, hood: 'millworks', det: 'economic', amount: -9, start: st.month, rise: 3, decay: 48, label: 'Factory closure: lost jobs' });
    st.shocks.push({ id: id + 'a', hood: 'millworks', det: 'air', amount: 12, start: st.month, rise: 12, decay: null, label: 'Factory closure: cleaner air' });
    st.events.push({ id, type: 'factory_closure', month: st.month, hoods: ['millworks'], note: 'The Millworks factory closes: jobs are lost, but the air gets cleaner.' });
  }
  if (next(st) < per(E.floodPerYear)) {
    for (const hh of ['riverside', 'oldtown']) st.shocks.push({ id: `flood${st.month}${hh}`, hood: hh, det: 'water', amount: -22, start: st.month, rise: 1, decay: 6, label: 'Flood contaminates water' });
    st.events.push({ id: `flood${st.month}`, type: 'flood', month: st.month, hoods: ['riverside', 'oldtown'], note: 'A flood contaminates water in Riverside and Old Town.' });
  }
  if (mo >= 5 && mo <= 7 && next(st) < per(E.heatWavePerYear) * 4) heatWave(st);
  if (next(st) < per(E.outbreakPerYear) && !st.events.some((e) => e.type === 'outbreak' && st.month - e.month < 12)) st.events.push({ id: `ob${st.month}`, type: 'outbreak', month: st.month, hoods: [], note: 'A stomach-illness outbreak is reported. Investigate in Sim Lab.' });
}

function stepMonth(st: CityState) {
  st.month += 1;
  const m = st.month;
  // construction finishes
  for (const p of st.placed) if (p.status === 'building' && m >= p.openMonth) { p.status = 'open'; st.log.push(`Month ${m}: ${INTERVENTIONS[p.type].name} opened in ${p.hood}`); }
  // budget
  const bd = TUNING.budget;
  st.cash += st.annualBudget / 12;
  for (const p of st.placed) if (p.status !== 'building') st.cash -= (INTERVENTIONS[p.type].opCost * (p.scale ?? 1) / 12) * (p.status === 'reduced' ? bd.reducedMult : p.status === 'closed' ? 0 : 1);
  for (const k of Object.keys(st.policies)) st.cash -= POLICIES[k].opCost / 12;
  if (st.cash < 0) st.deficitMonths += 1; else st.deficitMonths = 0;
  const target = st.deficitMonths >= bd.closedAfterMonths ? 'closed' : st.deficitMonths >= bd.reducedAfterMonths ? 'reduced' : 'open';
  for (const p of st.placed) {
    if (p.status === 'building' || INTERVENTIONS[p.type].opCost === 0) continue;
    if (p.status !== target) { st.log.push(`Month ${m}: ${INTERVENTIONS[p.type].name} in ${p.hood} is now ${target}${target === 'open' ? '' : ' (out of funds)'}`); p.status = target; }
  }
  if (st.eventsEnabled) scheduleEvents(st);
  const c = contributions(st);
  const rent = TUNING.rent;
  for (const id of HOOD_IDS) {
    const h = st.hoods[id]; const b = st.base[id];
    // determinants follow their contributions (the lag lives in each contribution's ramp)
    for (const d of DETS) h.det[d] = clamp(b.det[d] + sum(c.det[id][d]), 0, 100);
    h.acute = c.acute[id];
    // behaviors: target from determinants plus direct program effects, smoothed
    for (const k of BEHS) {
      let t = b.beh[k] + sum(c.beh[id][k]);
      for (const [d, coef] of Object.entries(TUNING.behaviorFromDeterminant[k])) t += coef * (h.det[d as Det] - b.det[d as Det]);
      if (k === 'leadExposure' || k === 'pollutantExposure') t = clamp(t, 0, 100);
      h.beh[k] += TUNING.behaviorRate[k] * (clamp(t, 0, 100) - h.beh[k]);
    }
    for (const o of OUTS) h.out[o] += TUNING.outcomes[o].rate * (monthlyOutcomeTarget(st, id, o, h.acute) - h.out[o]);
    // gentrification: attractive investment in a low-income area raises rent pressure
    const hd = hoodDefs.find((x) => x.id === id)!;
    const vulnerable = hd.profile.medianIncome < rent.gentrifiableIncome ? clamp(1 - hd.profile.medianIncome / 90000, 0, 1) : 0;
    h.rentPressure = clamp(h.rentPressure * rent.decay + rent.gain * c.rentGain[id] * vulnerable * (1 - Math.min(0.95, c.rentShield)) * 5, 0, 100);
    if (h.rentPressure > rent.threshold) {
      const add = rent.displaceRate * (h.rentPressure - rent.threshold) / (100 - rent.threshold);
      const before = h.displacedPct; h.displacedPct = Math.min(rent.maxDisplacedPct, h.displacedPct + add);
      if (before < 1 && h.displacedPct >= 1) st.events.push({ id: `disp${id}${m}`, type: 'displacement', month: m, hoods: [id], note: `Rents are rising in ${hd.name}: longtime residents are starting to move away.` });
    }
  }
  st.history.push(snapshot(st, c));
}

/** Advance N months. Pure: returns a new state. */
export function advance(state: CityState, months: number): CityState {
  const s = clone(state);
  advanceMut(s, months);
  return s;
}
/** In-place version for the renderer's tick loop (avoids cloning history every month). */
export function advanceMut(s: CityState, months: number): CityState {
  for (let i = 0; i < months; i++) stepMonth(s);
  return s;
}

// ---------------------------------------------------------------- read-outs
export const year = (s: CityState) => Math.floor(s.month / 12) + 1;
export function citywide(s: CityState): Record<Out, number> {
  const tot = HOOD_IDS.reduce((a, id) => a + s.hoods[id].pop, 0);
  const r = {} as Record<Out, number>;
  for (const o of OUTS) r[o] = HOOD_IDS.reduce((a, id) => a + s.hoods[id].out[o] * s.hoods[id].pop, 0) / tot;
  return r;
}
export function equityGap(s: CityState): { gap: number; best: string; worst: string } {
  const les = HOOD_IDS.map((id) => [id, s.hoods[id].out.lifeExpectancy] as const).sort((a, b) => b[1] - a[1]);
  return { gap: les[0][1] - les[les.length - 1][1], best: les[0][0], worst: les[les.length - 1][0] };
}
export const originalResidentShare = (s: CityState, id: string) => 100 - s.hoods[id].displacedPct;
export const heatDeaths = (s: CityState) => s.events.filter((e) => e.type === 'heat_wave').reduce((a, e) => a + (e.deaths ?? 0), 0);
export function diff(a: CityState, b: CityState): { hood: string; out: Out; from: number; to: number; delta: number }[] {
  const rows: { hood: string; out: Out; from: number; to: number; delta: number }[] = [];
  for (const id of HOOD_IDS) for (const o of OUTS) rows.push({ hood: id, out: o, from: a.hoods[id].out[o], to: b.hoods[id].out[o], delta: b.hoods[id].out[o] - a.hoods[id].out[o] });
  return rows;
}
export { INTERVENTIONS, POLICIES, TUNING, HOOD_IDS };
