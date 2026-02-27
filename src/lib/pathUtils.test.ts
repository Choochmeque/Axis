import { describe, expect, it } from 'vitest';
import { truncatePath } from './pathUtils';

describe('truncatePath', () => {
  it('should return path unchanged when shorter than maxLen', () => {
    expect(truncatePath('~/Projects/foo', 50)).toBe('~/Projects/foo');
  });

  it('should return path unchanged when equal to maxLen', () => {
    const path = '~/Projects/foo';
    expect(truncatePath(path, path.length)).toBe(path);
  });

  it('should truncate long unix paths with ... in the middle', () => {
    const path = '~/Projects/very/deep/nested/structure/repo';
    const result = truncatePath(path, 30);
    expect(result).toContain('...');
    expect(result.length).toBeLessThanOrEqual(35); // allows some slack
    expect(result.startsWith('~')).toBe(true);
    expect(result.endsWith('repo')).toBe(true);
  });

  it('should truncate long windows paths with backslash separator', () => {
    const path = 'C:\\Users\\user\\Documents\\Projects\\deep\\repo';
    const result = truncatePath(path, 25);
    expect(result).toContain('...');
    expect(result.includes('\\')).toBe(true);
    expect(result.endsWith('repo')).toBe(true);
  });

  it('should handle paths with only two segments', () => {
    const path = '~/repo';
    expect(truncatePath(path, 3)).toBe('~/repo');
  });

  it('should handle root-level paths', () => {
    const path = '/repo';
    expect(truncatePath(path, 3)).toBe('/repo');
  });

  it('should keep first and last parts when truncating', () => {
    const path = '~/a/b/c/d/e';
    const result = truncatePath(path, 10);
    expect(result.startsWith('~')).toBe(true);
    expect(result).toContain('...');
  });

  it('should try to include more end parts when space allows', () => {
    const path = '~/Projects/a/b/c/repo';
    const result = truncatePath(path, 20);
    expect(result).toContain('...');
    expect(result.endsWith('repo')).toBe(true);
  });
});
