export const DETS = ['economic', 'healthcare', 'food', 'water', 'air', 'walkability', 'cohesion', 'education', 'housing', 'safety'] as const;
export const BEHS = ['diet', 'activity', 'preventiveCare', 'erAsPrimary', 'smoking', 'stress', 'leadExposure', 'pollutantExposure'] as const;
export const OUTS = ['lifeExpectancy', 'obesity', 'diabetes', 'hypertension', 'asthma', 'waterborne', 'leadElevated', 'infantMortality', 'preventableER', 'vaccination', 'uninsured', 'mentalDays'] as const;
export type Det = (typeof DETS)[number];
export type Beh = (typeof BEHS)[number];
export type Out = (typeof OUTS)[number];

export type Vec<K extends string> = Record<K, number>;
export interface Contribution { src: string; label: string; amount: number }

export interface Effect { target: 'det' | 'beh' | 'acute'; key: string; amount: number; lag: number }
export interface Synergy { with?: string; detAtLeast?: { key: Det; value: number }; mult: number; applyTo: string[] }
export interface InterventionDef {
  id: string; name: string; category: string; upstream: 'upstream' | 'midstream' | 'downstream';
  prevention: 'primary' | 'secondary' | 'tertiary'; scope: 'point' | 'hood' | 'city';
  cost: number; opCost: number; radiusMiles: number; constructionMonths: number;
  effects: Effect[]; mechanism: string; synergies?: Synergy[]; modifiers?: string[];
  transitExtends?: boolean; transitBoost?: number; amenity?: number; costScale?: 'pop'; redevelopment?: boolean;
  heatShield?: number; targetHoods?: string[]; defaultOpts?: Record<string, boolean>; jobs?: boolean;
}
export interface PolicyDef { id: string; name: string; cost: number; opCost: number; effects: Effect[]; mechanism: string; protectsRent?: number }

export type Status = 'building' | 'open' | 'reduced' | 'closed';
export interface Placed {
  uid: string; type: string; hood: string; at: [number, number] | null;
  builtMonth: number; openMonth: number; status: Status; noise: number;
  cov: Record<string, number>; opts: Record<string, boolean>; capital: number;
}
export interface Shock { id: string; hood: string; det: Det; amount: number; start: number; rise: number; decay: number | null; label: string }
export interface CityEvent { id: string; type: string; month: number; hoods: string[]; note: string; deaths?: number }

export interface HoodState {
  id: string; pop: number; income: number;
  det: Vec<Det>; beh: Vec<Beh>; out: Vec<Out>; acute: number;
  rentPressure: number; displacedPct: number;
}
export interface Snapshot {
  m: number;
  hoods: Record<string, { acute: number; det: Vec<Det>; beh: Vec<Beh>; out: Vec<Out>; contribDet: Partial<Record<Det, Contribution[]>>; contribBeh: Partial<Record<Beh, Contribution[]>> }>;
}
export interface CityState {
  seed: number; rng: number; month: number;
  cash: number; annualBudget: number; deficitMonths: number;
  hoods: Record<string, HoodState>;
  base: Record<string, { det: Vec<Det>; beh: Vec<Beh>; out: Vec<Out>; income: number; pop: number }>;
  placed: Placed[]; policies: Record<string, number>; shocks: Shock[]; events: CityEvent[];
  eventsEnabled: boolean; nextUid: number; history: Snapshot[]; log: string[];
}
export interface CityOptions { seed?: number; startingCash?: number; annualBudget?: number; eventsEnabled?: boolean }
export type Result<T> = { ok: true; state: T; info?: string } | { ok: false; error: string };
