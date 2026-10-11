import townHall from '../content/town-hall.json';
import rumorMill from '../content/rumor-mill.json';
import { townHallProject } from '../engine/townHall';
import { rumorProject } from '../engine/rumor';
import type { Ctx } from '../engine/run';
import type { Scenario } from '../engine/types';

export const SCENARIOS: Record<string, Scenario> = { 'town-hall': townHall as unknown as Scenario, 'rumor-mill': rumorMill as unknown as Scenario };
export const CTX: Record<string, Ctx> = { 'town-hall': { project: townHallProject }, 'rumor-mill': { project: rumorProject } };
export const ORDER = ['town-hall', 'rumor-mill'];
