import type { Answer, ClassifyQuestion, EvalResult, MCQuestion, OrderQuestion, Question, SliderQuestion } from './types';

/** Pure evaluation of a single answer. CER is never auto-scored. */
export function evaluate(q: Question, a: Answer): EvalResult {
  switch (q.type) {
    case 'mc':
    case 'vocab': {
      const o = (q as MCQuestion).options.find((x) => x.id === a);
      if (!o) return { correct: false, feedback: 'Pick one of the choices.', scored: false };
      return { correct: !!o.correct, feedback: o.feedback, misconception: o.misconception, scored: true };
    }
    case 'order': {
      const ok = JSON.stringify(a) === JSON.stringify((q as OrderQuestion).correctOrder);
      return { correct: ok, feedback: ok ? q.explanation : 'Not quite: check which step has to come first.', scored: true };
    }
    case 'classify': {
      const map = a as Record<string, string>;
      const items = (q as ClassifyQuestion).items;
      const wrong = items.find((i) => map[i.id] !== i.category);
      return wrong
        ? { correct: false, feedback: `Look again at "${wrong.text}".`, misconception: wrong.misconception, scored: true }
        : { correct: true, feedback: q.explanation, scored: true };
    }
    case 'slider': {
      const s = q as SliderQuestion;
      const v = Number(a);
      const ok = v >= s.acceptRange[0] && v <= s.acceptRange[1];
      return { correct: ok, feedback: ok ? q.explanation : 'Your estimate is outside the realistic range.', scored: true };
    }
    case 'cer':
      return { correct: true, feedback: 'Saved. Compare with the sample answer and the rubric.', scored: false };
    default:
      return { correct: false, feedback: '', scored: false };
  }
}

/** Attempt flow: first miss retries; the second miss shows the hint, a reteach card, then a parallel question. */
export function nextStep(misses: number): 'retry' | 'reteach' {
  return misses <= 1 ? 'retry' : 'reteach';
}

/**
 * Global interruption cap: allow at most `cap` unprompted checks in any rolling window.
 * Explicit "Quiz me" and required lesson checks bypass this.
 */
export function shouldInterrupt(timestamps: number[], now: number, cap: number, windowMs = 10 * 60_000): boolean {
  return timestamps.filter((t) => now - t < windowMs).length < cap;
}
