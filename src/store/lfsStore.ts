import { create } from 'zustand';
import { lfsApi } from '@/services/api';
import { useToastStore } from './toastStore';
import type {
  LfsStatus,
  LfsTrackedPattern,
  LfsFile,
  LfsEnvironment,
  GitEnvironment,
  LfsFetchOptions,
  LfsPullOptions,
  LfsPushOptions,
  LfsMigrateOptions,
  LfsPruneOptions,
} from '@/bindings/api';

interface LfsState {
  // Data
  status: LfsStatus | null;
  patterns: LfsTrackedPattern[];
  files: LfsFile[];
  environment: LfsEnvironment | null;
  gitEnvironment: GitEnvironment | null;

  // Loading flags
  isLoadingStatus: boolean;
  isLoadingPatterns: boolean;
  isLoadingFiles: boolean;
  isLoadingEnvironment: boolean;

  // Operation flags
  isInstalling: boolean;
  isFetching: boolean;
  isPulling: boolean;
  isPushing: boolean;
  isMigrating: boolean;
  isPruning: boolean;

  // Actions
  loadStatus: () => Promise<void>;
  loadPatterns: () => Promise<void>;
  loadFiles: () => Promise<void>;
  loadEnvironment: () => Promise<void>;
  loadGitEnvironment: () => Promise<void>;
  loadAll: () => Promise<void>;

  install: () => Promise<boolean>;
  track: (pattern: string) => Promise<boolean>;
  untrack: (pattern: string) => Promise<boolean>;

  fetch: (options?: LfsFetchOptions) => Promise<boolean>;
  pull: (options?: LfsPullOptions) => Promise<boolean>;
  push: (options?: LfsPushOptions) => Promise<boolean>;
  migrate: (options: LfsMigrateOptions) => Promise<boolean>;
  prune: (options?: LfsPruneOptions) => Promise<boolean>;

  reset: () => void;
}

const initialState = {
  status: null,
  patterns: [],
  files: [],
  environment: null,
  gitEnvironment: null,
  isLoadingStatus: false,
  isLoadingPatterns: false,
  isLoadingFiles: false,
  isLoadingEnvironment: false,
  isInstalling: false,
  isFetching: false,
  isPulling: false,
  isPushing: false,
  isMigrating: false,
  isPruning: false,
};

export const useLfsStore = create<LfsState>((set, get) => ({
  ...initialState,

  loadStatus: async () => {
    set({ isLoadingStatus: true });
    try {
      const status = await lfsApi.getStatus();
      set({ status });
    } catch (error) {
      console.error('Failed to load LFS status:', error);
    } finally {
      set({ isLoadingStatus: false });
    }
  },

  loadPatterns: async () => {
    set({ isLoadingPatterns: true });
    try {
      const patterns = await lfsApi.listPatterns();
      set({ patterns });
    } catch (error) {
      console.error('Failed to load LFS patterns:', error);
    } finally {
      set({ isLoadingPatterns: false });
    }
  },

  loadFiles: async () => {
    set({ isLoadingFiles: true });
    try {
      const files = await lfsApi.listFiles();
      set({ files });
    } catch (error) {
      console.error('Failed to load LFS files:', error);
    } finally {
      set({ isLoadingFiles: false });
    }
  },

  loadEnvironment: async () => {
    set({ isLoadingEnvironment: true });
    try {
      const environment = await lfsApi.getEnv();
      set({ environment });
    } catch (error) {
      console.error('Failed to load LFS environment:', error);
    } finally {
      set({ isLoadingEnvironment: false });
    }
  },

  loadGitEnvironment: async () => {
    try {
      const gitEnvironment = await lfsApi.getGitEnvironment();
      set({ gitEnvironment });
    } catch (error) {
      console.error('Failed to load Git environment:', error);
    }
  },

  loadAll: async () => {
    const { loadStatus, loadPatterns, loadFiles } = get();
    await Promise.all([loadStatus(), loadPatterns(), loadFiles()]);
  },

  install: async () => {
    set({ isInstalling: true });
    try {
      const result = await lfsApi.install();
      if (result.success) {
        useToastStore.getState().addToast({
          type: 'success',
          message: 'Git LFS initialized successfully',
        });
        await get().loadStatus();
        return true;
      } else {
        useToastStore.getState().addToast({
          type: 'error',
          message: result.message,
        });
        return false;
      }
    } catch (error) {
      useToastStore.getState().addToast({
        type: 'error',
        message: `Failed to initialize LFS: ${error}`,
      });
      return false;
    } finally {
      set({ isInstalling: false });
    }
  },

  track: async (pattern: string) => {
    try {
      const result = await lfsApi.track(pattern);
      if (result.success) {
        useToastStore.getState().addToast({
          type: 'success',
          message: `Tracking pattern: ${pattern}`,
        });
        await get().loadPatterns();
        return true;
      } else {
        useToastStore.getState().addToast({
          type: 'error',
          message: result.message,
        });
        return false;
      }
    } catch (error) {
      useToastStore.getState().addToast({
        type: 'error',
        message: `Failed to track pattern: ${error}`,
      });
      return false;
    }
  },

  untrack: async (pattern: string) => {
    try {
      const result = await lfsApi.untrack(pattern);
      if (result.success) {
        useToastStore.getState().addToast({
          type: 'success',
          message: `Untracked pattern: ${pattern}`,
        });
        await get().loadPatterns();
        return true;
      } else {
        useToastStore.getState().addToast({
          type: 'error',
          message: result.message,
        });
        return false;
      }
    } catch (error) {
      useToastStore.getState().addToast({
        type: 'error',
        message: `Failed to untrack pattern: ${error}`,
      });
      return false;
    }
  },

  fetch: async (options?: LfsFetchOptions) => {
    set({ isFetching: true });
    try {
      const result = await lfsApi.fetch(options ?? { all: false, recent: false, refs: [] });
      if (result.success) {
        useToastStore.getState().addToast({
          type: 'success',
          message: 'LFS objects fetched',
        });
        await get().loadFiles();
        return true;
      } else {
        useToastStore.getState().addToast({
          type: 'error',
          message: result.message,
        });
        return false;
      }
    } catch (error) {
      useToastStore.getState().addToast({
        type: 'error',
        message: `Failed to fetch LFS objects: ${error}`,
      });
      return false;
    } finally {
      set({ isFetching: false });
    }
  },

  pull: async (options?: LfsPullOptions) => {
    set({ isPulling: true });
    try {
      const result = await lfsApi.pull(options ?? {});
      if (result.success) {
        useToastStore.getState().addToast({
          type: 'success',
          message: 'LFS objects pulled',
        });
        await get().loadFiles();
        return true;
      } else {
        useToastStore.getState().addToast({
          type: 'error',
          message: result.message,
        });
        return false;
      }
    } catch (error) {
      useToastStore.getState().addToast({
        type: 'error',
        message: `Failed to pull LFS objects: ${error}`,
      });
      return false;
    } finally {
      set({ isPulling: false });
    }
  },

  push: async (options?: LfsPushOptions) => {
    set({ isPushing: true });
    try {
      const result = await lfsApi.push(options ?? { all: false, dryRun: false });
      if (result.success) {
        useToastStore.getState().addToast({
          type: 'success',
          message: 'LFS objects pushed',
        });
        return true;
      } else {
        useToastStore.getState().addToast({
          type: 'error',
          message: result.message,
        });
        return false;
      }
    } catch (error) {
      useToastStore.getState().addToast({
        type: 'error',
        message: `Failed to push LFS objects: ${error}`,
      });
      return false;
    } finally {
      set({ isPushing: false });
    }
  },

  migrate: async (options: LfsMigrateOptions) => {
    set({ isMigrating: true });
    try {
      const result = await lfsApi.migrate(options);
      if (result.success) {
        useToastStore.getState().addToast({
          type: 'success',
          message: result.message,
        });
        await get().loadAll();
        return true;
      } else {
        useToastStore.getState().addToast({
          type: 'error',
          message: result.message,
        });
        return false;
      }
    } catch (error) {
      useToastStore.getState().addToast({
        type: 'error',
        message: `Failed to migrate: ${error}`,
      });
      return false;
    } finally {
      set({ isMigrating: false });
    }
  },

  prune: async (options?: LfsPruneOptions) => {
    set({ isPruning: true });
    try {
      const result = await lfsApi.prune(options ?? { dryRun: false, verifyRemote: false });
      useToastStore.getState().addToast({
        type: result.success ? 'success' : 'error',
        message: result.message,
      });
      return result.success;
    } catch (error) {
      useToastStore.getState().addToast({
        type: 'error',
        message: `Failed to prune LFS objects: ${error}`,
      });
      return false;
    } finally {
      set({ isPruning: false });
    }
  },

  reset: () => set(initialState),
}));
