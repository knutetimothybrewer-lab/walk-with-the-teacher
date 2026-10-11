import { describe, it, expect } from 'vitest';
import { advanceMut, createCity, placeIntervention, setPolicy, INTERVENTIONS, POLICIES, type CityState } from '../src/modules/city/sim';
import { replay, apply, type Action } from '../src/modules/city/game/log';
import { POE, judge, magnitudeOf, valueOf, valuesOf, type Prediction } from '../src/modules/city/game/poe';
import { MISSIONS, missionById, evaluate, eastsideGap, stars } from '../src/modules/city/game/missions';
import { storyFor } from '../src/modules/city/game/stories';

const LOT: [number, number] = [790, 380];
const city = () => createCity({ seed: 9, startingCash: 300, annualBudget: 20 });

describe('action log replay', () => {
  const log: Action[] = [{ m: 0, k: 'place', type: 'clinic', hood: 'eastside', at: LOT }, { m: 6, k: 'place', type: 'park', hood: 'eastside', at: LOT }, { m: 12, k: 'policy', id: 'min_wage', on: true }, { m: 24, k: 'place', type: 'nutrition_ed', hood: 'eastside' }];
  it('rebuilds exactly the state a player would have reached', () => {
    let s = createCity({ seed: 9, startingCash: 300, annualBudget: 20 });
    for (const a of log) { if (a.m > s.month) advanceMut(s, a.m - s.month); s = apply(s, a).state; }
    advanceMut(s, 60 - s.month);
    const r = replay({ seed: 9, startingCash: 300, annualBudget: 20 }, log, 60);
    expect(r.month).toBe(60); expect(JSON.stringify(r.hoods)).toBe(JSON.stringify(s.hoods)); expect(r.cash).toBeCloseTo(s.cash, 9);
  });
  it('replaying only part of the log gives the earlier city (used to restore snapshots)', () => {
    const early = replay({ seed: 9, startingCash: 300 }, log, 10);
    expect(early.month).toBe(10); expect(early.placed.map((p) => p.type)).toEqual(['clinic', 'park']);
  });
  it('rejected actions leave the city unchanged and report why', () => {
    const r = apply(createCity({ startingCash: 1 }), { m: 0, k: 'place', type: 'hospital', hood: 'eastside', at: LOT }); expect(r.error).toMatch(/funds/);
  });
});

describe('Predict-Observe-Explain content matches the model', () => {
  it('every intervention and policy has a POE entry with a concept and an expected outcome', () => {
    for (const id of [...Object.keys(INTERVENTIONS), ...Object.keys(POLICIES)]) { expect(POE[id], id).toBeDefined(); expect(Object.keys(POE[id].expect).length).toBeGreaterThan(0); expect(POE[id].lag.length).toBeGreaterThan(20); }
  });
  it('the primary expected outcome really moves in the expected direction (so students are never taught something false)', () => {
    for (const [id, def] of Object.entries(INTERVENTIONS)) {
      let s = city(); const hood = def.targetHoods?.[0] ?? 'eastside'; const at: [number, number] = hood === 'millworks' ? [800, 120] : LOT;
      const r = placeIntervention(s, { type: id, hood: def.scope === 'city' ? undefined : hood, at: def.scope === 'point' ? at : undefined }); expect(r.ok, id + ' ' + (r.ok ? '' : r.error)).toBe(true);
      const before = (r as { state: CityState }).state; const after = structuredClone(before); advanceMut(after, 96);
      const [out, dir] = Object.entries(POE[id].expect)[0]; const d = valueOf(valuesOf(after), hood, out) - valueOf(valuesOf(before), hood, out);
      expect(Math.sign(d) * dir, `${id} ${out}: ${d}`).toBe(1);
    }
    for (const id of Object.keys(POLICIES)) {
      const r = setPolicy(city(), id, true); expect(r.ok).toBe(true); let s = (r as { state: CityState }).state;
      if (id === 'housing_protection') { s = (placeIntervention(s, { type: 'mixed_income_redevelopment', hood: 'eastside', at: LOT, scale: 1 }) as { state: CityState }).state; s = (placeIntervention(s, { type: 'park', hood: 'eastside', at: LOT }) as { state: CityState }).state; }
      const before = structuredClone(s); advanceMut(s, 96);
      const [out, dir] = Object.entries(POE[id].expect)[0];
      if (out === 'displacement') { const open = (() => { let o = city(); o = (placeIntervention(o, { type: 'mixed_income_redevelopment', hood: 'eastside', at: LOT, scale: 1 }) as { state: CityState }).state; o = (placeIntervention(o, { type: 'park', hood: 'eastside', at: LOT }) as { state: CityState }).state; advanceMut(o, 96); return o.hoods.eastside.displacedPct; })(); expect(valueOf(valuesOf(s), 'eastside', out)).toBeLessThan(open); }
      else expect(Math.sign(valueOf(valuesOf(s), 'eastside', out) - valueOf(before, 'eastside', out)) * dir, id).toBe(1);
    }
  });
  it('judging compares direction, outcome, and size against the model', () => {
    const b = (placeIntervention(city(), { type: 'clinic', hood: 'eastside', at: LOT }) as { state: CityState }).state; const a = structuredClone(b); advanceMut(a, 60);
    const base: Prediction = { type: 'clinic', hood: 'eastside', outcome: 'preventableER', direction: -1, magnitude: 'small', neighborhood: 'eastside', month: 0 };
    const good = judge(base, valuesOf(b), valuesOf(a)); expect(good.directionOk && good.outcomeOk && good.correct).toBe(true); expect(good.actual).toBeLessThan(0);
    expect(judge({ ...base, direction: 1 }, valuesOf(b), valuesOf(a)).correct).toBe(false);
    expect(judge({ ...base, outcome: 'lifeExpectancy', neighborhood: 'hillcrest', direction: 0 }, valuesOf(b), valuesOf(a)).outcomeOk).toBe(false);
    expect(magnitudeOf(0.4)).toBe('tiny'); expect(magnitudeOf(-8)).toBe('medium'); expect(magnitudeOf(20)).toBe('large');
  });
});

describe('missions', () => {
  const m = missionById('close-the-gap');
  const sim = (items: [string, string?][], months = 120) => { let s = createCity({ seed: m.seed, startingCash: m.startingCash, annualBudget: m.annualBudget }); for (const [t, h] of items) { const def = INTERVENTIONS[t]; const r = placeIntervention(s, { type: t, hood: def.scope === 'city' ? undefined : h ?? 'eastside', at: def.scope === 'point' ? LOT : undefined }); if (!r.ok) throw new Error(t + ': ' + r.error); s = r.state; } const start = eastsideGap(createCity({ seed: m.seed })); advanceMut(s, months); return { s, st: evaluate(m, s, start) }; };
  it('has the core missions with a 2.5-year, 10-year target', () => { expect(MISSIONS.filter((x) => x.core).map((x) => x.id)).toEqual(['tutorial', 'close-the-gap']); expect(m.target).toBe(2.5); expect(m.years).toBe(10); });
  it('a balanced upstream plan within budget wins the mission', () => {
    const { s, st } = sim([['clinic'], ['supermarket'], ['park'], ['sidewalks'], ['bus_route'], ['chw_outreach'], ['nutrition_ed'], ['insurance_drive'], ['lead_replacement']]);
    expect(st.won, JSON.stringify(st)).toBe(true); expect(s.cash).toBeGreaterThan(0); expect(stars(st)).toBeGreaterThanOrEqual(2);
  });
  it('a hospital does not fit the budget, and a single grocery store is not enough', () => {
    expect(placeIntervention(createCity({ startingCash: m.startingCash }), { type: 'hospital', hood: 'eastside', at: LOT }).ok).toBe(false);
    expect(sim([['supermarket']]).st.won).toBe(false);
  });
  it('the tutorial can be completed with one clinic and a year of time', () => {
    const t = missionById('tutorial'); let s = createCity({ seed: t.seed, startingCash: t.startingCash }); s = (placeIntervention(s, { type: 'clinic', hood: 'eastside', at: LOT }) as { state: CityState }).state; advanceMut(s, 24);
    expect(s.hoods.eastside.out.preventableER).toBeLessThan(142);
  });
});

describe('resident stories', () => {
  it('change when conditions change', () => {
    const a = storyFor(city(), 'eastside', 1); expect(a.name).toBeTruthy();
    let s = (placeIntervention(city(), { type: 'clinic', hood: 'eastside', at: LOT }) as { state: CityState }).state; advanceMut(s, 30);
    const texts = [0, 1, 2, 3, 4].map((i) => storyFor(city(), 'eastside', i).text); const after = [0, 1, 2, 3, 4].map((i) => storyFor(s, 'eastside', i).text);
    expect(after).not.toEqual(texts);
    expect(after.join(' ')).toMatch(/clinic/);
  });
});
