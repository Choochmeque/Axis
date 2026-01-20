import { create } from 'zustand';

import { branchApi, diffApi } from '@/services/api';
import type { BranchCompareResult, FileDiff, Commit } from '@/types';
import { getErrorMessage } from '@/lib/errorUtils';

export type CompareTab = 'commits' | 'files';

interface BranchCompareState {
  // Comparison data
  compareResult: BranchCompareResult | null;
  isLoading: boolean;
  error: string | null;

  // UI state
  activeTab: CompareTab;
  selectedCommit: Commit | null;
  selectedCommitFiles: FileDiff[];
  selectedFile: FileDiff | null;
  isLoadingFiles: boolean;

  // Actions
  compare: (baseRef: string, compareRef: string) => Promise<void>;
  setActiveTab: (tab: CompareTab) => void;
  selectCommit: (commit: Commit | null) => Promise<void>;
  selectFile: (file: FileDiff | null) => void;
  clear: () => void;
}

const initialState = {
  compareResult: null,
  isLoading: false,
  error: null,
  activeTab: 'commits' as CompareTab,
  selectedCommit: null,
  selectedCommitFiles: [],
  selectedFile: null,
  isLoadingFiles: false,
};

export const useBranchCompareStore = create<BranchCompareState>((set, get) => ({
  ...initialState,

  compare: async (baseRef: string, compareRef: string) => {
    set({ isLoading: true, error: null, compareResult: null });
    try {
      const result = await branchApi.compare(baseRef, compareRef);
      set({
        compareResult: result,
        isLoading: false,
        // Auto-select first file in files tab
        selectedFile: result.files.length > 0 ? result.files[0] : null,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  },

  setActiveTab: (tab: CompareTab) => {
    set({ activeTab: tab });
    // Clear commit selection when switching to files tab
    if (tab === 'files') {
      const { compareResult } = get();
      set({
        selectedCommit: null,
        selectedCommitFiles: [],
        selectedFile: compareResult?.files[0] ?? null,
      });
    }
  },

  selectCommit: async (commit: Commit | null) => {
    if (!commit) {
      set({ selectedCommit: null, selectedCommitFiles: [], selectedFile: null });
      return;
    }

    set({ selectedCommit: commit, isLoadingFiles: true, selectedFile: null });
    try {
      const files = await diffApi.getCommit(commit.oid);
      set({
        selectedCommitFiles: files,
        isLoadingFiles: false,
        selectedFile: files.length > 0 ? files[0] : null,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        selectedCommitFiles: [],
        isLoadingFiles: false,
      });
    }
  },

  selectFile: (file: FileDiff | null) => {
    set({ selectedFile: file });
  },

  clear: () => {
    set(initialState);
  },
}));
