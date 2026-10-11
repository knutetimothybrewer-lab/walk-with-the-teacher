import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { validateBundle, type Bundle } from '../src/platform/validate';
import { CAST } from '../src/platform/art/characters';

const root = 'src/content/shared';
const j = (p: string) => JSON.parse(readFileSync(`${root}/${p}`, 'utf8'));
const dir = (d: string) => readdirSync(`${root}/${d}`).map((f) => j(`${d}/${f}`));
const base = (): Bundle => ({ questions: dir('questions').flat(), lessons: dir('lessons'), reteach: j('reteach.json'), concepts: j('concepts.json'), glossary: j('glossary.json'), world: j('riverton-world.json'), castIds: CAST.map((c) => c.id) });

describe('content validator', () => {
  it('shipped content has no errors', () => expect(validateBundle(base()).errors).toEqual([]));
  it('catches a distractor without a reteach card', () => {
    const b = base(); const q = b.questions.find((x) => x.type === 'mc') as any; q.options.find((o: any) => !o.correct).misconception = 'nope';
    expect(validateBundle(b).errors.join()).toContain('no reteach card');
  });
  it('catches a check question without a parallel', () => {
    const b = base(); delete (b.questions.find((q) => q.id === 'q-ch-1') as any).parallel;
    expect(validateBundle(b).errors.join()).toContain('no parallel');
  });
  it('catches a lesson with no check', () => {
    const b = base(); b.lessons[0].blocks = b.lessons[0].blocks.filter((x) => x.type !== 'check');
    expect(validateBundle(b).errors.join()).toContain('no check');
  });
});
