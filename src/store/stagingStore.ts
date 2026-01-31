import { create } from 'zustand';

import i18n from '@/i18n';
import { operations } from '@/store/operationStore';
import { stagingApi, repositoryApi, diffApi, commitApi, lfsApi } from '@/services/api';
import type { RepositoryStatus, FileDiff, FileStatus, DiffOptions, LfsCheckResult } from '@/types';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useDialogStore } from '@/store/dialogStore';
import { getErrorMessage } from '@/lib/errorUtils';
import { debounce, type DebouncedFn } from '@/lib/debounce';
import { getEmptyCommitParts, type ConventionalCommitParts } from '@/lib/conventionalCommits';
import { normalizePath } from '@/lib/utils';

// Debounce delay for load operations
const DEBOUNCE_DELAY = 150;

// Debounced loader (initialized lazily)
let debouncedLoadStatus: DebouncedFn | null = null;

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

// Per-repo cache for commit form state
interface StagingRepoCache {
  commitMessage: string;
  isAmending: boolean;
  pushAfterCommit: boolean;
  structuredMode: boolean;
  commitParts: ConventionalCommitParts;
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
  pushAfterCommit: boolean;
  structuredMode: boolean;
  commitParts: ConventionalCommitParts;

  // Per-repo cache
  repoCache: Map<string, StagingRepoCache>;

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
  discardUnstaged: () => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  setCommitMessage: (message: string) => void;
  setIsAmending: (isAmending: boolean) => void;
  setPushAfterCommit: (push: boolean) => void;
  setStructuredMode: (mode: boolean) => void;
  setCommitParts: (parts: ConventionalCommitParts) => void;
  createCommit: (sign?: boolean, bypassHooks?: boolean) => Promise<string>;
  amendCommit: (bypassHooks?: boolean) => Promise<string>;
  clearError: () => void;
  reset: () => void;

  // Per-repo cache management
  saveToCache: (repoPath: string) => void;
  restoreFromCache: (repoPath: string) => boolean;
  clearCache: (repoPath: string) => void;
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
  pushAfterCommit: false,
  structuredMode: false,
  commitParts: getEmptyCommitParts(),
  repoCache: new Map(),
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

/**
 * Check files for large binaries before staging.
 * Returns true if staging should proceed, false if paused (dialog shown).
 */
async function checkLfsBeforeStaging(
  paths: string[],
  onProceed: () => Promise<void>
): Promise<boolean> {
  const settings = useSettingsStore.getState().settings;
  if (!settings?.largeBinaryWarningEnabled) return true;

  let result: LfsCheckResult;
  try {
    result = await stagingApi.checkFilesForLfs(paths, settings.largeBinaryThreshold);
  } catch (error) {
    console.error('Failed to check files for LFS:', error);
    // On error, allow staging to proceed
    return true;
  }

  if (result.files.length === 0) return true;

  // Open warning dialog — staging is paused
  const { openLargeBinaryWarningDialog } = useDialogStore.getState();
  openLargeBinaryWarningDialog({
    files: result.files,
    pendingPaths: paths,
    lfsInstalled: result.lfsInstalled,
    lfsInitialized: result.lfsInitialized,
    onStageAnyway: async () => {
      await onProceed();
    },
    onTrackWithLfs: async (patterns: string[]) => {
      try {
        for (const pattern of patterns) {
          await lfsApi.track(pattern);
        }
        await onProceed();
      } catch (error) {
        console.error('Failed to track files with LFS:', error);
      }
    },
  });

  return false;
}

export const useStagingStore = create<StagingState>((set, get) => ({
  ...initialState,

  loadStatus: async () => {
    if (!debouncedLoadStatus) {
      debouncedLoadStatus = debounce(async () => {
        const opId = operations.start(i18n.t('store.staging.loadingStatus'), { category: 'file' });
        set({ isLoadingStatus: true, error: null });
        try {
          const status = await repositoryApi.getStatus();
          set({ status, isLoadingStatus: false });
        } catch (error) {
          set({
            error: getErrorMessage(error),
            isLoadingStatus: false,
          });
        } finally {
          operations.complete(opId);
        }
      }, DEBOUNCE_DELAY);
    }
    debouncedLoadStatus();
  },

  selectFile: async (file: FileStatus | null, staged: boolean) => {
    if (!file) {
      set({ selectedFile: null, selectedFileDiff: null, isSelectedFileStaged: false });
      return;
    }

    const opId = operations.start(i18n.t('store.staging.loadingDiff'), { category: 'file' });
    set({ selectedFile: file, isSelectedFileStaged: staged, isLoadingDiff: true, error: null });
    try {
      const options = toDiffOptions(get().diffSettings);
      const diff = await diffApi.getFile(file.path, staged, options);
      set({ selectedFileDiff: diff, isLoadingDiff: false });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        selectedFileDiff: null,
        isLoadingDiff: false,
      });
    } finally {
      operations.complete(opId);
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
        set({ error: getErrorMessage(error), isLoadingDiff: false });
      }
    }
  },

  stageFile: async (path: string) => {
    try {
      const proceed = await checkLfsBeforeStaging([path], async () => {
        await stagingApi.stageFile(path);
        await get().loadStatus();
      });
      if (!proceed) return;
      await stagingApi.stageFile(path);
      await get().loadStatus();
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  stageFiles: async (paths: string[]) => {
    try {
      const proceed = await checkLfsBeforeStaging(paths, async () => {
        await stagingApi.stageFiles(paths);
        await get().loadStatus();
      });
      if (!proceed) return;
      await stagingApi.stageFiles(paths);
      await get().loadStatus();
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  stageAll: async () => {
    try {
      // Gather all unstaged + untracked paths for the LFS check
      const status = get().status;
      const allPaths = [
        ...(status?.unstaged ?? []).map((f) => f.path),
        ...(status?.untracked ?? []).map((f) => f.path),
      ];
      const proceed = await checkLfsBeforeStaging(allPaths, async () => {
        await stagingApi.stageAll();
        await get().loadStatus();
      });
      if (!proceed) return;
      await stagingApi.stageAll();
      await get().loadStatus();
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  unstageFile: async (path: string) => {
    try {
      await stagingApi.unstageFile(path);
      await get().loadStatus();
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  unstageFiles: async (paths: string[]) => {
    try {
      await stagingApi.unstageFiles(paths);
      await get().loadStatus();
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  unstageAll: async () => {
    try {
      await stagingApi.unstageAll();
      await get().loadStatus();
    } catch (error) {
      set({ error: getErrorMessage(error) });
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
      set({ error: getErrorMessage(error) });
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
      set({ error: getErrorMessage(error) });
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
      set({ error: getErrorMessage(error) });
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
      set({ error: getErrorMessage(error) });
    }
  },

  discardUnstaged: async () => {
    try {
      await stagingApi.discardUnstaged();
      await get().loadStatus();
      set({ selectedFile: null, selectedFileDiff: null });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  deleteFile: async (path: string) => {
    try {
      await stagingApi.deleteFile(path);
      await get().loadStatus();
      if (get().selectedFile?.path === path) {
        set({ selectedFile: null, selectedFileDiff: null });
      }
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },

  setCommitMessage: (message: string) => {
    set({ commitMessage: message });
  },

  setIsAmending: (isAmending: boolean) => {
    set({ isAmending });
  },

  setPushAfterCommit: (push: boolean) => {
    set({ pushAfterCommit: push });
  },

  setStructuredMode: (mode: boolean) => {
    set({ structuredMode: mode });
  },

  setCommitParts: (parts: ConventionalCommitParts) => {
    set({ commitParts: parts });
  },

  createCommit: async (sign?: boolean, bypassHooks?: boolean) => {
    const { commitMessage } = get();
    if (!commitMessage.trim()) {
      const errorMsg = i18n.t('store.staging.commitMessageRequired');
      set({ error: errorMsg });
      throw new Error(errorMsg);
    }

    const opId = operations.start(i18n.t('store.staging.creatingCommit'), { category: 'git' });
    set({ isCommitting: true, error: null });
    try {
      const oid = await commitApi.create(commitMessage, undefined, undefined, sign, bypassHooks);
      set({
        commitMessage: '',
        isCommitting: false,
      });
      // Refresh status and commit history
      await get().loadStatus();
      const repoStore = useRepositoryStore.getState();
      await Promise.all([
        repoStore.reloadRepositoryInfo(),
        repoStore.loadCommits(),
        repoStore.loadBranches(),
      ]);
      return oid;
    } catch (error) {
      set({
        error: getErrorMessage(error),
        isCommitting: false,
        selectedFile: null,
        selectedFileDiff: null,
      });
      throw error;
    } finally {
      operations.complete(opId);
    }
  },

  amendCommit: async (bypassHooks?: boolean) => {
    const { commitMessage } = get();

    const opId = operations.start(i18n.t('store.staging.amendingCommit'), { category: 'git' });
    set({ isCommitting: true, error: null });
    try {
      const oid = await commitApi.amend(commitMessage || undefined, bypassHooks);
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
        error: getErrorMessage(error),
        isCommitting: false,
        selectedFile: null,
        selectedFileDiff: null,
      });
      throw error;
    } finally {
      operations.complete(opId);
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },

  saveToCache: (repoPath: string) => {
    const key = normalizePath(repoPath);
    const { commitMessage, isAmending, pushAfterCommit, structuredMode, commitParts, repoCache } =
      get();
    const newCache = new Map(repoCache);
    newCache.set(key, {
      commitMessage,
      isAmending,
      pushAfterCommit,
      structuredMode,
      commitParts,
    });
    set({ repoCache: newCache });
  },

  restoreFromCache: (repoPath: string) => {
    const key = normalizePath(repoPath);
    const cached = get().repoCache.get(key);
    if (cached) {
      set({
        commitMessage: cached.commitMessage,
        isAmending: cached.isAmending,
        pushAfterCommit: cached.pushAfterCommit,
        structuredMode: cached.structuredMode,
        commitParts: cached.commitParts,
      });
      return true;
    }
    // Reset to defaults if no cache
    set({
      commitMessage: '',
      isAmending: false,
      pushAfterCommit: false,
      structuredMode: false,
      commitParts: getEmptyCommitParts(),
    });
    return false;
  },

  clearCache: (repoPath: string) => {
    const key = normalizePath(repoPath);
    const newCache = new Map(get().repoCache);
    newCache.delete(key);
    set({ repoCache: newCache });
  },
}));
