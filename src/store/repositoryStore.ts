import { create } from 'zustand';
import type { Repository, Commit, Branch, RepositoryStatus, RecentRepository } from '../types';
import { repositoryApi, commitApi, branchApi } from '../services/api';

export type ViewType = 'file-status' | 'history' | 'search';

interface RepositoryState {
  // Data
  repository: Repository | null;
  commits: Commit[];
  branches: Branch[];
  status: RepositoryStatus | null;
  recentRepositories: RecentRepository[];

  // UI State
  currentView: ViewType;

  // Loading states
  isLoading: boolean;
  isLoadingCommits: boolean;
  error: string | null;

  // Actions
  openRepository: (path: string) => Promise<void>;
  closeRepository: () => Promise<void>;
  refreshRepository: () => Promise<void>;
  loadCommits: (limit?: number, skip?: number) => Promise<void>;
  loadBranches: () => Promise<void>;
  loadStatus: () => Promise<void>;
  loadRecentRepositories: () => Promise<void>;
  setCurrentView: (view: ViewType) => void;
  clearError: () => void;
}

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  // Initial state
  repository: null,
  commits: [],
  branches: [],
  status: null,
  recentRepositories: [],
  currentView: 'file-status',
  isLoading: false,
  isLoadingCommits: false,
  error: null,

  openRepository: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      const repository = await repositoryApi.open(path);
      set({ repository, isLoading: false });

      // Load initial data in parallel
      await Promise.all([
        get().loadCommits(),
        get().loadBranches(),
        get().loadStatus(),
      ]);
    } catch (err) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  closeRepository: async () => {
    try {
      await repositoryApi.close();
      set({
        repository: null,
        commits: [],
        branches: [],
        status: null,
        error: null,
      });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  refreshRepository: async () => {
    const { repository } = get();
    if (!repository) return;

    try {
      const [updatedRepo] = await Promise.all([
        repositoryApi.getInfo(),
        get().loadCommits(),
        get().loadBranches(),
        get().loadStatus(),
      ]);
      set({ repository: updatedRepo });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  loadCommits: async (limit = 100, skip = 0) => {
    set({ isLoadingCommits: true });
    try {
      const commits = await commitApi.getHistory({ limit, skip });
      set({ commits, isLoadingCommits: false });
    } catch (err) {
      set({ error: String(err), isLoadingCommits: false });
    }
  },

  loadBranches: async () => {
    try {
      const branches = await branchApi.list();
      set({ branches });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  loadStatus: async () => {
    try {
      const status = await repositoryApi.getStatus();
      set({ status });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  loadRecentRepositories: async () => {
    try {
      const recentRepositories = await repositoryApi.getRecentRepositories();
      set({ recentRepositories });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  setCurrentView: (view: ViewType) => set({ currentView: view }),

  clearError: () => set({ error: null }),
}));
