import type { Profile } from './profile/profileStore';

export type SegmentId = 'orientation' | 'city' | 'townhall' | 'outbreak' | 'rumor' | 'wrapup';
export interface Segment { id: SegmentId; title: string; blurb: string; module: 'orientation' | 'city' | 'crossroads' | 'lab' | 'wrapup'; route: string; minutes: number; checkpoint: number }
/** The core path from the spec (§12): about 120 minutes, with checkpoints at each segment boundary. */
export const SEGMENTS: Segment[] = [
  { id: 'orientation', title: 'Orientation', blurb: 'Meet Riverton and its health gap.', module: 'orientation', route: '/orientation', minutes: 5, checkpoint: 5 },
  { id: 'city', title: 'City: Plan', blurb: 'Close the life-expectancy gap.', module: 'city', route: '/city', minutes: 43, checkpoint: 48 },
  { id: 'townhall', title: 'Crossroads: Town Hall', blurb: 'Decide the future of the Elm Street lot.', module: 'crossroads', route: '/crossroads/town-hall', minutes: 22, checkpoint: 70 },
  { id: 'outbreak', title: 'Sim Lab: Outbreak', blurb: 'Investigate a stomach-illness outbreak.', module: 'lab', route: '/lab', minutes: 35, checkpoint: 105 },
  { id: 'rumor', title: 'Crossroads: Rumor Mill', blurb: 'Fight misinformation while the outbreak continues.', module: 'crossroads', route: '/crossroads/rumor-mill', minutes: 10, checkpoint: 115 },
  { id: 'wrapup', title: 'Wrap-up', blurb: 'Write the commission’s year-end report.', module: 'wrapup', route: '/report', minutes: 5, checkpoint: 120 },
];
export const DEFAULT_ORDER: SegmentId[] = SEGMENTS.map((s) => s.id);
export const segment = (id: SegmentId) => SEGMENTS.find((s) => s.id === id)!;

export function isDone(p: Profile, id: SegmentId): boolean {
  switch (id) {
    case 'orientation': return !!p.progress.orientation?.completed.includes('orientation');
    case 'city': return !!p.progress.city?.completed.includes('close-the-gap');
    case 'townhall': return !!p.crossroads?.['town-hall'];
    case 'outbreak': return !!p.progress.lab?.completed.includes('outbreak');
    case 'rumor': return !!p.crossroads?.['rumor-mill'];
    case 'wrapup': return !!p.report;
  }
}
export interface StoryItem { seg: Segment; done: boolean; assigned: boolean; current: boolean; minutes: number }
export function storyOf(p: Profile, order: SegmentId[], assigned?: (id: SegmentId) => boolean): StoryItem[] {
  const items = order.map((id) => { const seg = segment(id); return { seg, done: isDone(p, id), assigned: assigned ? assigned(id) : true, current: false, minutes: Math.round((p.progress[seg.module]?.minutes ?? 0) * 10) / 10 }; });
  const next = items.find((i) => i.assigned && !i.done); if (next) next.current = true;
  return items;
}
export const nextSegment = (items: StoryItem[]) => items.find((i) => i.current)?.seg ?? null;

/** Pace: minutes spent so far vs. the time the finished segments were budgeted. Teachers see it; students never see a countdown. */
export function pace(p: Profile, order: SegmentId[], target = 120) {
  const scale = target / 120; const items = storyOf(p, order);
  const spent = items.reduce((a, i) => a + i.minutes, 0); const budgeted = items.filter((i) => i.done).reduce((a, i) => a + i.seg.minutes * scale, 0);
  const inProgress = items.find((i) => i.current); const budgetNow = budgeted + (inProgress ? Math.min(inProgress.minutes, inProgress.seg.minutes * scale) : 0);
  return { spent, budgeted, ahead: budgetNow - spent, behind: spent > budgeted + (inProgress ? inProgress.seg.minutes * scale * 1.25 : 0) + 3 };
}
