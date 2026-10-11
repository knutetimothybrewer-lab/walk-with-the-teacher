import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { createCity, placeIntervention, removeIntervention, setPolicy, setOption, advance, citywide, equityGap, preview, explainChange, triggerHeatWave, INTERVENTIONS, POLICIES, HOOD_IDS } from '../src/modules/city/sim';
import type { CityState } from '../src/modules/city/sim';

const EAST: [number, number] = [780, 400];
const HILL: [number, number] = [198, 152];
const place = (s: CityState, type: string, hood?: string, at?: [number, number], opts?: Record<string, boolean>) => {
  const r = placeIntervention(s, { type, hood, at, opts }); if (!r.ok) throw new Error(r.error); return r.state;
};
const fresh = (seed = 7, cash = 200) => createCity({ seed, startingCash: cash, annualBudget: 14 });

describe('determinism and baselines', () => {
  it('same seed and actions give identical states; different seeds differ', () => {
    const run = (seed: number) => advance(place(fresh(seed), 'clinic', 'eastside', EAST), 60);
    expect(JSON.stringify(run(3).hoods)).toBe(JSON.stringify(run(3).hoods));
    expect(JSON.stringify(run(3).hoods)).not.toBe(JSON.stringify(run(4).hoods));
  });
  it('seeded random events are reproducible', () => {
    const mk = (seed: number) => advance(createCity({ seed, eventsEnabled: true, startingCash: 50 }), 240);
    expect(mk(11).events).toEqual(mk(11).events);
  });
  it('with no actions the city stays at its baseline and matches the shared world data', () => {
    const s = advance(fresh(), 120);
    expect(s.hoods.eastside.out.lifeExpectancy).toBeCloseTo(69.7, 6);
    expect(equityGap(s).gap).toBeCloseTo(12.4, 6);
    expect(equityGap(s)).toMatchObject({ best: 'hillcrest', worst: 'eastside' });
  });
});

describe('realism: lags, distance, diminishing returns', () => {
  it('waterborne illness falls within months once the water upgrade opens; life expectancy moves slowest', () => {
    const s0 = place(fresh(), 'water_upgrade');
    const open = INTERVENTIONS.water_upgrade.constructionMonths;
    const wb = (m: number) => advance(s0, m).hoods.eastside.out.waterborne;
    const base = fresh().hoods.eastside.out.waterborne;
    expect(wb(open - 1)).toBeCloseTo(base, 6);
    expect(wb(open + 6)).toBeLessThan(base * 0.75);
    const full = place(place(fresh(), 'clinic', 'eastside', EAST), 'chw_outreach', 'eastside');
    const frac = (m: number, key: 'preventableER' | 'lifeExpectancy') => { const a = advance(full, 240).hoods.eastside.out[key], b = fresh().hoods.eastside.out[key]; return (advance(full, m).hoods.eastside.out[key] - b) / (a - b); };
    expect(frac(24, 'preventableER')).toBeGreaterThan(frac(24, 'lifeExpectancy'));
  });
  it('lead pipe replacement lowers child blood lead over roughly 1-2 years, not instantly', () => {
    const s = place(fresh(), 'lead_replacement', 'eastside');
    const lead = (m: number) => advance(s, m).hoods.eastside.out.leadElevated;
    const base = fresh().hoods.eastside.out.leadElevated;
    expect(lead(12)).toBeCloseTo(base, 6);               // still under construction
    expect(lead(12 + 6)).toBeLessThan(base);
    expect(lead(12 + 24)).toBeLessThan(lead(12 + 6));
    expect(lead(12 + 24)).toBeLessThan(base * 0.65);
    expect(lead(12 + 36)).toBeLessThan(base * 0.5);
  });
  it('a hospital far from a neighborhood does little for it', () => {
    const far = advance(place(fresh(), 'hospital', 'hillcrest', HILL), 120).hoods.eastside.out.preventableER;
    const near = advance(place(fresh(), 'hospital', 'eastside', EAST), 120).hoods.eastside.out.preventableER;
    const base = fresh().hoods.eastside.out.preventableER;
    expect(base - far).toBeLessThan((base - near) * 0.5);
  });
  it('preview reports coverage and people reached', () => {
    const p = preview(fresh(), 'clinic', EAST);
    expect(p.hood).toBe('eastside');
    expect(p.coverage.find((c) => c.hood === 'eastside')!.coverage).toBeGreaterThan(0.7);
    expect(p.coverage.find((c) => c.hood === 'pinewood')!.coverage).toBe(0);
    expect(p.peopleReached).toBeGreaterThan(15000);
  });
  it('a third grocery store in an already-served area adds almost nothing', () => {
    const f = (n: number) => { let s = fresh(); for (let i = 0; i < n; i++) s = place(s, 'supermarket', 'eastside', [EAST[0] + i * 10, EAST[1]]); return advance(s, 60).hoods.eastside.det.food; };
    const [a, b, c] = [f(1), f(2), f(3)];
    expect(b - a).toBeGreaterThan(c - b);
    expect(c - b).toBeLessThan((a - 22) * 0.2);
  });
  it('investing in the most advantaged neighborhood barely moves citywide outcomes', () => {
    const base = citywide(fresh()).obesity;
    const hill = citywide(advance(place(fresh(), 'park', 'hillcrest', HILL), 120)).obesity;
    const east = citywide(advance(place(fresh(), 'park', 'eastside', EAST), 120)).obesity;
    expect(base - east).toBeGreaterThan(base - hill);
  });
});

describe('upstream vs downstream, interactions', () => {
  const bundle = () => { let s = fresh(); for (const t of ['clinic', 'supermarket', 'park', 'sidewalks', 'bus_route']) s = place(s, t, 'eastside', EAST); for (const t of ['chw_outreach', 'nutrition_ed', 'insurance_drive', 'lead_replacement']) s = place(s, t, 'eastside'); return s; };
  it('over ten years upstream investment closes far more of the gap than a hospital', () => {
    const up = equityGap(advance(bundle(), 120)).gap;
    const hosp = equityGap(advance(place(fresh(), 'hospital', 'eastside', EAST), 120)).gap;
    expect(12.4 - up).toBeGreaterThan(2);
    expect(12.4 - up).toBeGreaterThan((12.4 - hosp) * 5);
  });
  it('but a hospital saves lives in an emergency such as a heat wave', () => {
    const noH = triggerHeatWave(advance(fresh(), 60)).deaths;
    const withH = triggerHeatWave(advance(place(place(fresh(), 'hospital', 'eastside', EAST), 'hospital', 'oldtown', [390, 350]), 60)).deaths;
    expect(withH).toBeLessThan(noH);
    const withPark = triggerHeatWave(advance(place(fresh(), 'park', 'eastside', EAST), 60)).deaths;
    expect(withPark).toBeLessThan(noH);
  });
  it('a grocery store changes diet more when paired with nutrition education', () => {
    const diet = (s: CityState) => advance(s, 60).hoods.eastside.beh.diet - fresh().hoods.eastside.beh.diet;
    const alone = diet(place(fresh(), 'supermarket', 'eastside', EAST));
    const paired = diet(place(place(fresh(), 'supermarket', 'eastside', EAST), 'nutrition_ed', 'eastside'));
    expect(alone).toBeGreaterThan(0);
    expect(paired).toBeGreaterThan(alone * 1.5);
  });
  it('a YMCA helps activity more with sliding-scale membership in a lower-income neighborhood', () => {
    const act = (sliding: boolean) => advance(place(fresh(), 'ymca', 'eastside', EAST, { sliding }), 60).hoods.eastside.beh.activity;
    expect(act(true)).toBeGreaterThan(act(false) + 0.5);
    const s = place(fresh(), 'ymca', 'eastside', EAST);
    const toggled = setOption(s, s.placed[0].uid, 'sliding', true);
    expect(toggled.ok).toBe(true);
  });
  it('an insurance drive boosts clinic impact on preventable ER visits', () => {
    const er = (s: CityState) => advance(s, 60).hoods.eastside.out.preventableER;
    expect(er(place(place(fresh(), 'clinic', 'eastside', EAST), 'insurance_drive', 'eastside'))).toBeLessThan(er(place(fresh(), 'clinic', 'eastside', EAST)) - 3);
  });
});

describe('equity, unintended consequences, budget', () => {
  it('major redevelopment displaces residents unless housing protections are on', () => {
    const run = (protect: boolean) => { let s = fresh(); if (protect) s = setPolicy(s, 'housing_protection', true).ok ? (setPolicy(s, 'housing_protection', true) as { state: CityState }).state : s; s = place(s, 'mixed_income_redevelopment', 'eastside', EAST); s = place(s, 'park', 'eastside', EAST); s = place(s, 'supermarket', 'eastside', EAST); return advance(s, 144).hoods.eastside; };
    const open = run(false), prot = run(true);
    expect(open.displacedPct).toBeGreaterThan(3);
    expect(prot.displacedPct).toBeLessThan(open.displacedPct * 0.5);
    expect(open.rentPressure).toBeGreaterThan(0);
  });
  it('rejects purchases the budget cannot cover and duplicates', () => {
    expect(placeIntervention(createCity({ startingCash: 5 }), { type: 'hospital', hood: 'eastside', at: EAST }).ok).toBe(false);
    const s = place(fresh(), 'nutrition_ed', 'eastside');
    expect(placeIntervention(s, { type: 'nutrition_ed', hood: 'eastside' }).ok).toBe(false);
    expect(placeIntervention(fresh(), { type: 'factory_controls', hood: 'eastside' }).ok).toBe(false);
  });
  it('running out of operating funds cuts hours, then closes the facility', () => {
    let s = createCity({ seed: 1, startingCash: 7.5, annualBudget: 0 });
    s = place(s, 'clinic', 'eastside', EAST);
    const states = [] as string[];
    for (let i = 0; i < 40; i++) { s = advance(s, 1); states.push(s.placed[0].status); }
    expect(states).toContain('reduced');
    expect(states[states.length - 1]).toBe('closed');
    expect(states.indexOf('reduced')).toBeLessThan(states.indexOf('closed'));
  });
  it('demolishing a facility removes its effects; policies toggle on and off', () => {
    let s = advance(place(fresh(), 'clinic', 'eastside', EAST), 40);
    const before = s.hoods.eastside.det.healthcare;
    const r = removeIntervention(s, s.placed[0].uid); expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.hoods.eastside.det.healthcare).toBeLessThan(before);
    const on = setPolicy(fresh(), 'min_wage', true); expect(on.ok).toBe(true);
    if (on.ok) { s = advance(on.state, 24); expect(s.hoods.eastside.det.economic).toBeGreaterThan(25); }
    expect(Object.keys(POLICIES).length).toBeGreaterThanOrEqual(4);
  });
});

describe('"Why did this change?" tracing', () => {
  it('explains an outcome change through determinant and behavior to the responsible intervention', () => {
    const s = advance(place(place(fresh(), 'lead_replacement', 'eastside'), 'clinic', 'eastside', EAST), 48);
    const ex = explainChange(s, 'eastside', 'leadElevated', 0, 48);
    expect(ex.delta).toBeLessThan(0);
    expect(ex.bySource[0].label).toMatch(/Lead service line/);
    expect(ex.bySource.reduce((a, b) => a + b.share, 0)).toBeCloseTo(ex.delta, 6);
    expect(ex.chains[0].steps.map((x) => x.kind)).toContain('beh');
  });
  it('chain shares always sum to the outcome change, and multi-source changes are attributed', () => {
    let s = fresh(); for (const t of ['clinic', 'supermarket', 'chw_outreach', 'nutrition_ed']) s = place(s, t, 'eastside', EAST);
    s = advance(s, 96);
    for (const o of ['preventableER', 'obesity', 'lifeExpectancy', 'diabetes'] as const) {
      const ex = explainChange(s, 'eastside', o, 0, 96);
      expect(ex.chains.reduce((a, c) => a + c.share, 0)).toBeCloseTo(ex.delta, 5);
      expect(ex.chains.length).toBeGreaterThan(0);
    }
    const er = explainChange(s, 'eastside', 'preventableER', 0, 96);
    expect(er.bySource.map((x) => x.label)).toEqual(expect.arrayContaining(['Community health clinic (FQHC)', 'Community health workers (outreach)']));
  });
});

describe('purity and content', () => {
  it('the sim folder imports no React, Pixi or DOM code', () => {
    const dir = 'src/modules/city/sim';
    for (const f of readdirSync(dir)) {
      const src = readFileSync(`${dir}/${f}`, 'utf8');
      expect(src).not.toMatch(/from ['"](react|pixi|framer|zustand|recharts)/i);
      expect(src).not.toMatch(/\b(window|document|localStorage)\b/);
    }
  });
  it('every intervention has a mechanism explanation, a cost, and a valid effect target', () => {
    for (const d of Object.values(INTERVENTIONS)) {
      expect(d.mechanism.split('.').length).toBeGreaterThanOrEqual(2);
      expect(d.cost).toBeGreaterThanOrEqual(0);
      for (const e of d.effects) expect(['det', 'beh', 'acute']).toContain(e.target);
    }
    expect(HOOD_IDS).toHaveLength(8);
  });
});

describe('tuning JSON integrity', () => {
  it('every effect, synergy and modifier references something that exists', async () => {
    const { DETS, BEHS } = await import('../src/modules/city/sim/types');
    const all = [...Object.values(INTERVENTIONS), ...Object.values(POLICIES)];
    for (const d of all) for (const e of d.effects) {
      if (e.target === 'det') expect(DETS as readonly string[]).toContain(e.key);
      if (e.target === 'beh') expect(BEHS as readonly string[]).toContain(e.key);
      expect(e.lag).toBeGreaterThan(0);
    }
    for (const d of Object.values(INTERVENTIONS)) for (const s of d.synergies ?? []) if (s.with) expect(INTERVENTIONS[s.with]).toBeDefined();
  });
});
