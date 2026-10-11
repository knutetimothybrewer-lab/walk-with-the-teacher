export type ModuleId = 'shared' | 'city' | 'crossroads' | 'lab';
export type QType = 'mc' | 'order' | 'classify' | 'cer' | 'vocab' | 'slider' | 'poe';

export interface QBase {
  id: string;
  module: ModuleId;
  concept: string;
  type: QType;
  difficulty: 1 | 2 | 3;
  trigger?: string;
  standards?: string[];
  prompt: string;
  explanation: string;
  /** id of a parallel question: same concept, new context. Required for lesson checks. */
  parallel?: string;
  /** context used for the "two different contexts" mastery rule, e.g. "lesson:orientation" or "sim:city" */
  context: string;
  seconds?: number;
}
export interface Option { id: string; text: string; feedback: string; correct?: boolean; misconception?: string }
export interface MCQuestion extends QBase { type: 'mc' | 'vocab'; options: Option[]; hint?: string }
export interface OrderQuestion extends QBase { type: 'order'; items: { id: string; text: string }[]; correctOrder: string[]; hint?: string }
export interface ClassifyQuestion extends QBase {
  type: 'classify'; categories: { id: string; label: string }[];
  items: { id: string; text: string; category: string; misconception?: string }[]; hint?: string;
}
export interface CERQuestion extends QBase {
  type: 'cer'; rubric: { id: string; criterion: string }[]; sampleAnswer: string; required?: boolean;
}
export interface SliderQuestion extends QBase { type: 'slider'; min: number; max: number; unit: string; acceptRange: [number, number]; hint?: string }
export type Question = MCQuestion | OrderQuestion | ClassifyQuestion | CERQuestion | SliderQuestion;

export interface ReteachCard {
  id: string;            // matches a misconception id
  concept: string;
  title: string;
  body: string[];        // short chunks
  steps?: { caption: string; art: string }[]; // alternative visual, different from the lesson
}

export type Answer = string | string[] | Record<string, string> | number;
export interface EvalResult { correct: boolean; feedback: string; misconception?: string; scored: boolean }
