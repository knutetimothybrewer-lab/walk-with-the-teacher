import { describe, it, expect } from 'vitest';
import { getItem, setItem, getJSON, setJSON } from '../src/platform/storage';

describe('storage without localStorage', () => {
  it('falls back to memory and never throws', () => {
    expect(getItem('a')).toBeNull();
    setItem('a', '1');
    expect(getItem('a')).toBe('1');
    setJSON('j', { x: 2 });
    expect(getJSON('j', null)).toEqual({ x: 2 });
    expect(getJSON('missing', 5)).toBe(5);
  });
});
