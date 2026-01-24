import { create } from 'zustand';

import { blameApi } from '@/services/api';
import type { BlameResult } from '@/types';
import { getErrorMessage } from '@/lib/errorUtils';

interface BlameState {
  // Cache: Map<`${path}:${commitOid || 'HEAD'}`, BlameResult>
  cache: Map<string, BlameResult>;

  // Current view state
  currentPath: string | null;
  currentCommitOid: string | null;
  result: BlameResult | null;
  isLoading: boolean;
  error: string | null;
  hoveredCommitOid: string | null;

  // Actions
  loadBlame: (path: string, commitOid?: string) => Promise<void>;
  setHoveredCommit: (oid: string | null) => void;
  invalidateCache: (path?: string) => void;
  clear: () => void;
}

const initialState = {
  cache: new Map<string, BlameResult>(),
  currentPath: null,
  currentCommitOid: null,
  result: null,
  isLoading: false,
  error: null,
  hoveredCommitOid: null,
};

const getCacheKey = (path: string, commitOid?: string): string => {
  return `${path}:${commitOid || 'HEAD'}`;
};

export const useBlameStore = create<BlameState>((set, get) => ({
  ...initialState,

  loadBlame: async (path: string, commitOid?: string) => {
    const cacheKey = getCacheKey(path, commitOid);
    const { cache } = get();

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      set({
        currentPath: path,
        currentCommitOid: commitOid ?? null,
        result: cached,
        isLoading: false,
        error: null,
      });
      return;
    }

    set({
      currentPath: path,
      currentCommitOid: commitOid ?? null,
      isLoading: true,
      error: null,
    });

    try {
      const result = await blameApi.file(path, commitOid);

      // Update cache
      const newCache = new Map(get().cache);
      newCache.set(cacheKey, result);

      set({
        cache: newCache,
        result,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load blame:', error);
      set({
        error: getErrorMessage(error),
        isLoading: false,
        result: null,
      });
    }
  },

  setHoveredCommit: (oid: string | null) => {
    set({ hoveredCommitOid: oid });
  },

  invalidateCache: (path?: string) => {
    const { cache } = get();
    if (path) {
      // Invalidate all entries for this path
      const newCache = new Map(cache);
      for (const key of newCache.keys()) {
        if (key.startsWith(`${path}:`)) {
          newCache.delete(key);
        }
      }
      set({ cache: newCache });
    } else {
      // Clear entire cache
      set({ cache: new Map() });
    }
  },

  clear: () => {
    set({
      currentPath: null,
      currentCommitOid: null,
      result: null,
      isLoading: false,
      error: null,
      hoveredCommitOid: null,
    });
  },
}));
