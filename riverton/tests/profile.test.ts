import { describe, it, expect } from 'vitest';
import { useProfiles } from '../src/platform/profile/profileStore';

describe('profiles', () => {
  it('separates students, records responses, round-trips a backup', () => {
    const s = useProfiles.getState();
    const a = s.create('Ava', '3'); const b = useProfiles.getState().create('Ben');
    expect(a).not.toBe(b);
    useProfiles.getState().switchTo(a);
    useProfiles.getState().recordResponse({ qid: 'q', module: 'shared', concept: 'c', type: 'mc', correct: true, attempts: 1, hintUsed: false }, 'lesson:x');
    const st = useProfiles.getState();
    expect(st.profiles[a].responses).toHaveLength(1);
    expect(st.profiles[b].responses).toHaveLength(0);
    const backup = JSON.stringify(st.exportBackup());
    st.remove(a);
    expect(useProfiles.getState().importBackup(backup).ok).toBe(true);
    expect(useProfiles.getState().profiles[a].responses).toHaveLength(1);
    expect(useProfiles.getState().importBackup('{"x":1}').ok).toBe(false);
  });
});
