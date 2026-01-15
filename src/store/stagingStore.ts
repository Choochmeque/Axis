import { create } from 'zustand';
import { stagingApi, repositoryApi, diffApi, commitApi } from '@/services/api';
import type { RepositoryStatus, FileDiff, FileStatus, DiffOptions } from '@/types';
import { useRepositoryStore } from '@/store/repositoryStore';

/* eslint-disable @typescript-eslint/naming-convention */
export const WhitespaceMode = {
  Show: 'show',
  Ignore: 'ignore',
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

export type WhitespaceMode = (typeof WhitespaceMode)[keyof typeof WhitespaceMode];
export type ContextLines = 1 | 3 | 6 | 12 | 25 | 50 | 100;
/* eslint-disable @typescript-eslint/naming-convention */
export const DiffCompareMode = {
  Parent: 'parent',
  Merged: 'merged',
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

export type DiffCompareMode = (typeof DiffCompareMode)[keyof typeof DiffCompareMode];

export interface DiffSettings {
  whitespace: WhitespaceMode;
  contextLines: ContextLines;
  compareMode: DiffCompareMode;
}

interface StagingState {
  // Status
  status: RepositoryStatus | null;
  isLoadingStatus: boolean;

  // Selected file for diff viewing
  selectedFile: FileStatus | null;
  selectedFileDiff: FileDiff | null;
  isSelectedFileStaged: boolean;
  isLoadingDiff: boolean;

  // Diff settings
  diffSettings: DiffSettings;

  // Commit form
  commitMessage: string;
  isAmending: boolean;
  isCommitting: boolean;

  // Errors
  error: string | null;

  // Actions
  loadStatus: () => Promise<void>;
  selectFile: (file: FileStatus | null, staged: boolean) => Promise<void>;
  setDiffSettings: (settings: DiffSettings) => Promise<void>;
  stageFile: (path: string) => Promise<void>;
  stageFiles: (paths: string[]) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageFile: (path: string) => Promise<void>;
  unstageFiles: (paths: string[]) => Promise<void>;
  unstageAll: () => Promise<void>;
  stageHunk: (patch: string) => Promise<void>;
  unstageHunk: (patch: string) => Promise<void>;
  discardHunk: (patch: string) => Promise<void>;
  discardFile: (path: string) => Promise<void>;
  discardAll: () => Promise<void>;
  setCommitMessage: (message: string) => void;
  setIsAmending: (isAmending: boolean) => void;
  createCommit: (sign?: boolean) => Promise<string>;
  amendCommit: () => Promise<string>;
  clearError: () => void;
  reset: () => void;
}

const defaultDiffSettings: DiffSettings = {
  whitespace: WhitespaceMode.Show,
  contextLines: 3,
  compareMode: DiffCompareMode.Parent,
};

const initialState = {
  status: null,
  isLoadingStatus: false,
  selectedFile: null,
  selectedFileDiff: null,
  isSelectedFileStaged: false,
  isLoadingDiff: false,
  diffSettings: defaultDiffSettings,
  commitMessage: '',
  isAmending: false,
  isCommitting: false,
  error: null,
};

// Helper to convert DiffSettings to DiffOptions for API calls
function toDiffOptions(settings: DiffSettings): DiffOptions {
  return {
    contextLines: settings.contextLines,
    ignoreWhitespace: settings.whitespace === WhitespaceMode.Ignore,
    ignoreWhitespaceEol: false,
  };
}

export const useStagingStore = create<StagingState>((set, get) => ({
  ...initialState,

  loadStatus: async () => {
    set({ isLoadingStatus: true, error: null });
    try {
      const status = await repositoryApi.getStatus();
      set({ status, isLoadingStatus: false });
    } catch (error) {
      set({
        error: String(error),
        isLoadingStatus: false,
      });
    }
  },

  selectFile: async (file: FileStatus | null, staged: boolean) => {
    if (!file) {
      set({ selectedFile: null, selectedFileDiff: null, isSelectedFileStaged: false });
      return;
    }

    set({ selectedFile: file, isSelectedFileStaged: staged, isLoadingDiff: true, error: null });
    try {
      const options = toDiffOptions(get().diffSettings);
      const diff = await diffApi.getFile(file.path, staged, options);
      set({ selectedFileDiff: diff, isLoadingDiff: false });
    } catch (error) {
      set({
        error: String(error),
        selectedFileDiff: null,
        isLoadingDiff: false,
      });
    }
  },

  setDiffSettings: async (settings: DiffSettings) => {
    set({ diffSettings: settings });
    // Re-fetch the diff with new settings if a file is selected
    const { selectedFile, isSelectedFileStaged } = get();
    if (selectedFile) {
      set({ isLoadingDiff: true });
      try {
        const options = toDiffOptions(settings);
        const diff = await diffApi.getFile(selectedFile.path, isSelectedFileStaged, options);
        set({ selectedFileDiff: diff, isLoadingDiff: false });
      } catch (error) {
        set({ error: String(error), isLoadingDiff: false });
      }
    }
  },

  stageFile: async (path: string) => {
    try {
      await stagingApi.stageFile(path);
      await get().loadStatus();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  stageFiles: async (paths: string[]) => {
    try {
      await stagingApi.stageFiles(paths);
      await get().loadStatus();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  stageAll: async () => {
    try {
      await stagingApi.stageAll();
      await get().loadStatus();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  unstageFile: async (path: string) => {
    try {
      await stagingApi.unstageFile(path);
      await get().loadStatus();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  unstageFiles: async (paths: string[]) => {
    try {
      await stagingApi.unstageFiles(paths);
      await get().loadStatus();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  unstageAll: async () => {
    try {
      await stagingApi.unstageAll();
      await get().loadStatus();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  stageHunk: async (patch: string) => {
    try {
      await stagingApi.stageHunk(patch);
      await get().loadStatus();
      // Refresh the diff for the currently selected file
      const { selectedFile, isSelectedFileStaged, diffSettings } = get();
      if (selectedFile) {
        const options = toDiffOptions(diffSettings);
        const diff = await diffApi.getFile(selectedFile.path, isSelectedFileStaged, options);
        set({ selectedFileDiff: diff });
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },

  unstageHunk: async (patch: string) => {
    try {
      await stagingApi.unstageHunk(patch);
      await get().loadStatus();
      // Refresh the diff for the currently selected file
      const { selectedFile, isSelectedFileStaged, diffSettings } = get();
      if (selectedFile) {
        const options = toDiffOptions(diffSettings);
        const diff = await diffApi.getFile(selectedFile.path, isSelectedFileStaged, options);
        set({ selectedFileDiff: diff });
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },

  discardHunk: async (patch: string) => {
    try {
      await stagingApi.discardHunk(patch);
      await get().loadStatus();
      // Refresh the diff for the currently selected file
      const { selectedFile, isSelectedFileStaged, diffSettings } = get();
      if (selectedFile) {
        const options = toDiffOptions(diffSettings);
        const diff = await diffApi.getFile(selectedFile.path, isSelectedFileStaged, options);
        set({ selectedFileDiff: diff });
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },

  discardFile: async (path: string) => {
    try {
      await stagingApi.discardFile(path);
      await get().loadStatus();
      // Clear selected file if it was the discarded one
      if (get().selectedFile?.path === path) {
        set({ selectedFile: null, selectedFileDiff: null });
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },

  discardAll: async () => {
    try {
      await stagingApi.discardAll();
      await get().loadStatus();
      set({ selectedFile: null, selectedFileDiff: null });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setCommitMessage: (message: string) => {
    set({ commitMessage: message });
  },

  setIsAmending: (isAmending: boolean) => {
    set({ isAmending });
  },

  createCommit: async (sign?: boolean) => {
    const { commitMessage } = get();
    if (!commitMessage.trim()) {
      set({ error: 'Commit message is required' });
      throw new Error('Commit message is required');
    }

    set({ isCommitting: true, error: null });
    try {
      const oid = await commitApi.create(commitMessage, undefined, undefined, sign);
      set({
        commitMessage: '',
        isCommitting: false,
      });
      // Refresh status and commit history
      await get().loadStatus();
      const repoStore = useRepositoryStore.getState();
      await Promise.all([repoStore.loadCommits(), repoStore.loadBranches()]);
      return oid;
    } catch (error) {
      set({
        error: String(error),
        isCommitting: false,
      });
      throw error;
    }
  },

  amendCommit: async () => {
    const { commitMessage } = get();

    set({ isCommitting: true, error: null });
    try {
      const oid = await commitApi.amend(commitMessage || undefined);
      set({
        commitMessage: '',
        isAmending: false,
        isCommitting: false,
      });
      // Refresh status and commit history
      await get().loadStatus();
      const repoStore = useRepositoryStore.getState();
      await Promise.all([repoStore.loadCommits(), repoStore.loadBranches()]);
      return oid;
    } catch (error) {
      set({
        error: String(error),
        isCommitting: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));
