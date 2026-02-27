import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlameStore } from './blameStore';

vi.mock('@/services/api', () => ({
  blameApi: {
    file: vi.fn(),
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

import { blameApi } from '@/services/api';
import type { BlameResult } from '@/types';

describe('blameStore', () => {
  const mockBlameResult: BlameResult = {
    path: 'test.ts',
    lines: [
      {
        lineNumber: 1,
        commitOid: 'abc123',
        shortOid: 'abc123',
        author: 'Test User',
        timestamp: new Date().toISOString(),
        content: 'line 1',
        originalLine: 1,
        isGroupStart: true,
      },
      {
        lineNumber: 2,
        commitOid: 'abc123',
        shortOid: 'abc123',
        author: 'Test User',
        timestamp: new Date().toISOString(),
        content: 'line 2',
        originalLine: 2,
        isGroupStart: false,
      },
    ],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    useBlameStore.setState({
      cache: new Map(),
      currentPath: null,
      currentCommitOid: null,
      result: null,
      isLoading: false,
      error: null,
      hoveredCommitOid: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loadBlame', () => {
    it('should return cached result if available', async () => {
      const cachedResult = { ...mockBlameResult };
      useBlameStore.setState({
        cache: new Map([['test.ts:HEAD', cachedResult]]),
      });

      await useBlameStore.getState().loadBlame('test.ts');

      expect(blameApi.file).not.toHaveBeenCalled();
      const state = useBlameStore.getState();
      expect(state.result).toBe(cachedResult);
      expect(state.currentPath).toBe('test.ts');
    });

    it('should fetch and cache new blame data', async () => {
      vi.mocked(blameApi.file).mockResolvedValue(mockBlameResult);

      await useBlameStore.getState().loadBlame('new-file.ts');

      expect(blameApi.file).toHaveBeenCalledWith('new-file.ts', undefined);
      const state = useBlameStore.getState();
      expect(state.result).toEqual(mockBlameResult);
      expect(state.cache.get('new-file.ts:HEAD')).toEqual(mockBlameResult);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: BlameResult) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(blameApi.file).mockReturnValue(pendingPromise as Promise<BlameResult>);

      const loadPromise = useBlameStore.getState().loadBlame('test.ts');

      expect(useBlameStore.getState().isLoading).toBe(true);

      resolvePromise!(mockBlameResult);
      await loadPromise;

      expect(useBlameStore.getState().isLoading).toBe(false);
    });

    it('should handle errors', async () => {
      vi.mocked(blameApi.file).mockRejectedValue(new Error('Failed to load'));

      await useBlameStore.getState().loadBlame('test.ts');

      const state = useBlameStore.getState();
      expect(state.error).toBe('Failed to load');
      expect(state.isLoading).toBe(false);
      expect(state.result).toBeNull();
    });

    it('should generate correct cache key with commitOid', async () => {
      vi.mocked(blameApi.file).mockResolvedValue(mockBlameResult);

      await useBlameStore.getState().loadBlame('test.ts', 'abc123');

      expect(useBlameStore.getState().cache.has('test.ts:abc123')).toBe(true);
      expect(useBlameStore.getState().currentCommitOid).toBe('abc123');
    });

    it('should generate correct cache key for HEAD', async () => {
      vi.mocked(blameApi.file).mockResolvedValue(mockBlameResult);

      await useBlameStore.getState().loadBlame('test.ts');

      expect(useBlameStore.getState().cache.has('test.ts:HEAD')).toBe(true);
      expect(useBlameStore.getState().currentCommitOid).toBeNull();
    });
  });

  describe('setHoveredCommit', () => {
    it('should update hoveredCommitOid', () => {
      useBlameStore.getState().setHoveredCommit('abc123');

      expect(useBlameStore.getState().hoveredCommitOid).toBe('abc123');
    });

    it('should allow setting to null', () => {
      useBlameStore.setState({ hoveredCommitOid: 'abc123' });

      useBlameStore.getState().setHoveredCommit(null);

      expect(useBlameStore.getState().hoveredCommitOid).toBeNull();
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate entries for specific path', () => {
      useBlameStore.setState({
        cache: new Map([
          ['test.ts:HEAD', mockBlameResult],
          ['test.ts:abc123', mockBlameResult],
          ['other.ts:HEAD', mockBlameResult],
        ]),
      });

      useBlameStore.getState().invalidateCache('test.ts');

      const cache = useBlameStore.getState().cache;
      expect(cache.has('test.ts:HEAD')).toBe(false);
      expect(cache.has('test.ts:abc123')).toBe(false);
      expect(cache.has('other.ts:HEAD')).toBe(true);
    });

    it('should clear entire cache when no path provided', () => {
      useBlameStore.setState({
        cache: new Map([
          ['test.ts:HEAD', mockBlameResult],
          ['other.ts:HEAD', mockBlameResult],
        ]),
      });

      useBlameStore.getState().invalidateCache();

      expect(useBlameStore.getState().cache.size).toBe(0);
    });
  });

  describe('clear', () => {
    it('should reset all state except cache', () => {
      useBlameStore.setState({
        cache: new Map([['test.ts:HEAD', mockBlameResult]]),
        currentPath: 'test.ts',
        currentCommitOid: 'abc123',
        result: mockBlameResult,
        isLoading: false,
        error: 'Some error',
        hoveredCommitOid: 'xyz789',
      });

      useBlameStore.getState().clear();

      const state = useBlameStore.getState();
      expect(state.currentPath).toBeNull();
      expect(state.currentCommitOid).toBeNull();
      expect(state.result).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.hoveredCommitOid).toBeNull();
      // Cache should be preserved
      expect(state.cache.size).toBe(1);
    });
  });
});
