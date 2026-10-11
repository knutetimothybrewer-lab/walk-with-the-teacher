export type Vars = Record<string, unknown>;
export type Cond =
  | { var: string; op: '>=' | '<=' | '>' | '<' | '==' | '!=' | 'includes' | 'notIncludes'; value: unknown }
  | { all: Cond[] } | { any: Cond[] } | { not: Cond };
export type Effect = { set: string; value: unknown } | { add: string; delta: number; min?: number; max?: number } | { push: string; value: string };

export interface Line { who?: string; expr?: string; text: string; thought?: boolean }
export interface Choice { id: string; label: string; detail?: string; shallow?: boolean; if?: Cond; effects?: Effect[]; next: string }

interface Base { id: string; onEnter?: Effect[]; label?: string }
export interface SceneNode extends Base { type: 'scene'; scene: string; lines: Line[]; next: string; cast?: { who: string; expr?: string; side?: 'left' | 'right' | 'center' }[] }
export interface ChatNode extends Base { type: 'chat'; group: string; messages: { from: string; text: string; me?: boolean; if?: Cond }[]; next: string }
export interface DataNode extends Base { type: 'data'; title: string; intro: string; items: { label: string; metric: string; unit: string; compare?: boolean }[]; question?: string; next: string }
export interface CompareNode extends Base { type: 'compare'; title: string; prompt: string; perceptions: { who: string; quote: string }[]; data: { label: string; value: string }[]; next: string }
export interface ChoiceNode extends Base { type: 'choice'; scene?: string; prompt: string; timed?: number; defaultChoice?: string; decision?: boolean; choices: Choice[] }
export interface Stakeholder { id: string; name: string; role: string; needs: string; lines: Line[]; fact?: string; requires?: Cond; evidenceId: string }
export interface ListenNode extends Base { type: 'listen'; prompt: string; stakeholders: Stakeholder[]; pickBase: number; pickBonus?: { if: Cond; extra: number }; next: string }
export type ReasonKind = 'evidence' | 'impact' | 'equity' | 'tradeoffs' | 'alternatives' | 'comms' | 'justify' | 'decisionVsOutcome';
export interface ReasonNode extends Base { type: 'reason'; kind: ReasonKind; prompt: string; options?: { id: string; label: string }[]; next: string }
export interface ProposalNode extends Base { type: 'proposal'; prompt: string; next: string }
export interface Voter { id: string; name: string; lean: { var: string; w: number }[]; base: number }
export interface VoteNode extends Base { type: 'vote'; prompt: string; voters: Voter[]; need: number; passNext: string; failNext: string }
export interface ProjectNode extends Base { type: 'project'; next: string }
export interface ChanceNode extends Base { type: 'chance'; key: string; outcomes: { id: string; label: string; p: number; effects?: Effect[] }[]; next: string }
export interface RouteNode extends Base { type: 'route'; routes: { if: Cond; next: string }[]; default: string }
export interface ReflectNode extends Base { type: 'reflect'; question: string; next: string }
export interface EndNode extends Base { type: 'end'; ending: { id: string; title: string; summary: string; tone: 'good' | 'mixed' | 'hard' }; lines?: Line[] }
export type Node = SceneNode | ChatNode | DataNode | CompareNode | ChoiceNode | ListenNode | ReasonNode | ProposalNode | VoteNode | ProjectNode | ChanceNode | RouteNode | ReflectNode | EndNode;

export interface Scenario {
  id: string; title: string; tagline: string; minutes: number; start: string; minEndings: number;
  vars: Vars; lessons: string[]; nodes: Node[]; debrief: { cer: string; rubricNote: string };
}

export interface HistoryEntry { node: string; kind: string; pick?: string; vars: Vars; rng: number }
export interface Reasoning { node: string; kind: ReasonKind | 'listen' | 'proposal' | 'vote'; payload: unknown }
export interface Run {
  scenarioId: string; node: string; vars: Vars; rng: number; seed: number;
  history: HistoryEntry[]; reasoning: Reasoning[]; visited: string[]; done: boolean; ending?: string;
}
