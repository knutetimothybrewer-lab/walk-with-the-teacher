export interface VisualStep { caption: string; nodes?: string[]; active?: number[]; map?: string[] }
export type Block =
  | { type: 'hook'; text: string; map?: string[] }
  | { type: 'explain'; chunks: { text: string; terms?: string[] }[] }
  | { type: 'visual'; title: string; steps: VisualStep[] }
  | { type: 'worked'; title: string; steps: string[] }
  | { type: 'guided'; questionId: string }
  | { type: 'check'; questionIds: string[] }
  | { type: 'summary'; cardId: string; bullets: string[] };
export interface Lesson { id: string; title: string; module: string; concepts: string[]; minutes: number; blocks: Block[] }
export interface GlossaryEntry { term: string; definition: string }
export interface ConceptDef { id: string; label: string; module: string; core: boolean }
