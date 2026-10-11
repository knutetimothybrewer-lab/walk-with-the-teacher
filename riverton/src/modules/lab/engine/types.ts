/** Generic lab engine. The workflow UI is driven by a LabModule; "Outbreak in Riverton" is the reference implementation. */
export type ToolId = 'lineList' | 'epiCurve' | 'spotMap' | 'twoByTwo' | 'resample' | 'oddsRatio' | 'caseControl';

export interface ActionDef {
  id: string; label: string; description: string;
  cost: number;          // budget units
  days: number;          // investigator days consumed
  resultDelay: number;   // extra days before the result is available
  params?: { key: string; label: string; options: { value: string; label: string }[] }[];
}
export interface InterventionDef { id: string; label: string; description: string }
export interface ActionRecord { id: string; actionId: string; args: Record<string, string>; day: number; readyDay: number }

export interface LabContent {
  title: string; tagline: string;
  alert: { headline: string; body: string };
  lessons: string[];            // lesson ids for the Foundations path
  underTheHood: { assumptions: string[]; parameters: { name: string; value: string; note: string }[]; sources: string[]; limitations: string[] };
}

export interface LabModule<Scenario extends string, Truth, Sim, Iv> {
  id: string;
  scenarios: readonly Scenario[];
  generate(seed: number, scenario: Scenario | 'random'): Truth;
  actions: ActionDef[];
  interventions: InterventionDef[];
  simulate(truth: Truth, interventions: Iv[]): Sim;
  tools: ToolId[];
  content: LabContent;
}
