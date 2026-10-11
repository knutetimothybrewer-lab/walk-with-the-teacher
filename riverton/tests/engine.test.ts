import { describe, it, expect } from 'vitest';
import { evaluate, nextStep, shouldInterrupt } from '../src/platform/questions/engine';
import { applyResult, markIntroduced, needsWork } from '../src/platform/learn/mastery';
import type { MCQuestion } from '../src/platform/questions/types';

const q: MCQuestion = { id: 'q', module: 'shared', concept: 'c', type: 'mc', difficulty: 1, prompt: '?', explanation: 'e', context: 'lesson:x',
  options: [{ id: 'a', text: 'A', feedback: 'no', misconception: 'm1' }, { id: 'b', text: 'B', feedback: 'yes', correct: true }] };

describe('question engine', () => {
  it('evaluates MC and reports misconception', () => {
    expect(evaluate(q, 'a')).toMatchObject({ correct: false, misconception: 'm1' });
    expect(evaluate(q, 'b').correct).toBe(true);
  });
  it('retries once, then reteaches (with hint) on the second miss', () => {
    expect(nextStep(1)).toBe('retry');
    expect(nextStep(2)).toBe('reteach');
  });
  it('caps interruptions in a rolling window', () => {
    const now = 1_000_000;
    expect(shouldInterrupt([now - 1000, now - 2000], now, 2)).toBe(false);
    expect(shouldInterrupt([now - 1000, now - 20 * 60_000], now, 2)).toBe(true);
  });
});

describe('mastery', () => {
  it('needs correct application in two different contexts', () => {
    let m = markIntroduced({}, 'c');
    expect(m.c.level).toBe('introduced');
    m = applyResult(m, 'c', true, 'lesson:x');
    expect(m.c.level).toBe('practiced');
    m = applyResult(m, 'c', true, 'lesson:x');
    expect(m.c.level).toBe('practiced');
    m = applyResult(m, 'c', true, 'sim:city');
    expect(m.c.level).toBe('mastered');
    expect(needsWork(m)).toEqual([]);
  });
});
