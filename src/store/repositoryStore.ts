import { create } from 'zustand';
import { BranchFilterType, SortOrder } from '@/types';
import type { BranchFilterType as BranchFilterTypeType, SortOrder as SortOrderType } from '@/types';
import type {
  Repository,
  GraphCommit,
  Commit,
  Branch,
  RepositoryStatus,
  RecentRepository,
  Tag,
  StashEntry,
  FileDiff,
  Submodule,
} from '@/types';
import {
  repositoryApi,
  graphApi,
  branchApi,
  tagApi,
  stashApi,
  diffApi,
  commitApi,
  submoduleApi,
} from '@/services/api';

export type ViewType = 'file-status' | 'history' | 'search';

interface RepositoryState {
  // Data
  repository: Repository | null;
  commits: GraphCommit[];
  maxLane: number;
  branches: Branch[];
  tags: Tag[];
  stashes: StashEntry[];
  submodules: Submodule[];
  status: RepositoryStatus | null;
  recentRepositories: RecentRepository[];

  // UI State
  currentView: ViewType;

  // History filters
  branchFilter: BranchFilterTypeType;
  includeRemotes: boolean;
  sortOrder: SortOrderType;

  // Commit detail state
  selectedCommitOid: string | null;
  selectedCommitData: Commit | null; // For commits not in the loaded list
  selectedCommitFiles: FileDiff[];
  selectedCommitFile: FileDiff | null;
  isLoadingCommitFiles: boolean;

  // Stash detail state
  selectedStash: StashEntry | null;
  selectedStashFiles: FileDiff[];
  selectedStashFile: FileDiff | null;
  isLoadingStashFiles: boolean;

  // Loading states
  isLoading: boolean;
  isLoadingCommits: boolean;
  isLoadingMoreCommits: boolean;
  hasMoreCommits: boolean;
  error: string | null;

  // Actions
  openRepository: (path: string) => Promise<void>;
  closeRepository: () => Promise<void>;
  refreshRepository: () => Promise<void>;
  loadCommits: (limit?: number, skip?: number) => Promise<void>;
  loadMoreCommits: () => Promise<void>;
  loadBranches: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadStashes: () => Promise<void>;
  loadSubmodules: () => Promise<void>;
  loadStatus: () => Promise<void>;
  loadRecentRepositories: () => Promise<void>;
  setCurrentView: (view: ViewType) => void;
  clearError: () => void;

  // Filter actions
  setBranchFilter: (filter: BranchFilterTypeType) => void;
  setIncludeRemotes: (include: boolean) => void;
  setSortOrder: (order: SortOrderType) => void;

  // Commit detail actions
  selectCommit: (oid: string | null) => Promise<void>;
  selectCommitFile: (file: FileDiff | null) => void;
  clearCommitSelection: () => void;

  // Stash detail actions
  selectStash: (stash: StashEntry | null) => Promise<void>;
  clearStashSelection: () => void;
}

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  // Initial state
  repository: null,
  commits: [],
  maxLane: 0,
  branches: [],
  tags: [],
  stashes: [],
  submodules: [],
  status: null,
  recentRepositories: [],
  currentView: 'file-status',
  branchFilter: BranchFilterType.All,
  includeRemotes: true,
  sortOrder: SortOrder.DateOrder,
  selectedCommitOid: null,
  selectedCommitData: null,
  selectedCommitFiles: [],
  selectedCommitFile: null,
  isLoadingCommitFiles: false,
  selectedStash: null,
  selectedStashFiles: [],
  selectedStashFile: null,
  isLoadingStashFiles: false,
  isLoading: false,
  isLoadingCommits: false,
  isLoadingMoreCommits: false,
  hasMoreCommits: false,
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
        get().loadTags(),
        get().loadStashes(),
        get().loadSubmodules(),
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
        maxLane: 0,
        branches: [],
        tags: [],
        stashes: [],
        submodules: [],
        status: null,
        error: null,
        selectedCommitOid: null,
        selectedCommitFiles: [],
        selectedCommitFile: null,
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
        get().loadTags(),
        get().loadStashes(),
        get().loadSubmodules(),
        get().loadStatus(),
      ]);
      set({ repository: updatedRepo });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  loadCommits: async (limit = 100, skip = 0) => {
    const { branchFilter, includeRemotes, sortOrder } = get();
    set({ isLoadingCommits: true });
    try {
      const result = await graphApi.build({
        limit: limit,
        skip: skip,
        branchFilter: branchFilter,
        includeRemotes: includeRemotes,
        sortOrder: sortOrder,
        fromRef: null,
      });
      set({
        commits: result.commits,
        maxLane: Number(result.maxLane),
        hasMoreCommits: result.hasMore,
        isLoadingCommits: false,
      });
    } catch (err) {
      set({ error: String(err), isLoadingCommits: false });
    }
  },

  loadMoreCommits: async () => {
    const {
      commits,
      hasMoreCommits,
      isLoadingMoreCommits,
      branchFilter,
      includeRemotes,
      sortOrder,
    } = get();
    if (!hasMoreCommits || isLoadingMoreCommits) return;

    set({ isLoadingMoreCommits: true });
    try {
      const result = await graphApi.build({
        limit: 100,
        skip: commits.length,
        branchFilter: branchFilter,
        includeRemotes: includeRemotes,
        sortOrder: sortOrder,
        fromRef: null,
      });
      set({
        commits: [...commits, ...result.commits],
        maxLane: Math.max(get().maxLane, Number(result.maxLane)),
        hasMoreCommits: result.hasMore,
        isLoadingMoreCommits: false,
      });
    } catch (err) {
      set({ error: String(err), isLoadingMoreCommits: false });
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

  loadTags: async () => {
    try {
      const tags = await tagApi.list();
      set({ tags });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  loadStashes: async () => {
    try {
      const stashes = await stashApi.list();
      set({ stashes });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  loadSubmodules: async () => {
    try {
      const submodules = await submoduleApi.list();
      set({ submodules });
    } catch {
      // Silently ignore - repo may not have submodules
      set({ submodules: [] });
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

  setBranchFilter: (filter: BranchFilterType) => {
    set({ branchFilter: filter });
    get().loadCommits();
  },

  setIncludeRemotes: (include: boolean) => {
    set({ includeRemotes: include });
    get().loadCommits();
  },

  setSortOrder: (order: SortOrder) => {
    set({ sortOrder: order });
    get().loadCommits();
  },

  selectCommit: async (oid: string | null) => {
    if (!oid) {
      set({
        selectedCommitOid: null,
        selectedCommitData: null,
        selectedCommitFiles: [],
        selectedCommitFile: null,
        isLoadingCommitFiles: false,
      });
      return;
    }

    // Check if commit is in loaded list
    const { commits } = get();
    const commitInList = commits.find((c) => c.oid === oid);

    set({
      selectedCommitOid: oid,
      selectedCommitData: null,
      isLoadingCommitFiles: true,
      selectedCommitFile: null,
    });

    try {
      // Fetch files and commit data in parallel
      const [files, commitData] = await Promise.all([
        diffApi.getCommit(oid),
        // Only fetch commit data if not in list
        commitInList ? Promise.resolve(null) : commitApi.getCommit(oid),
      ]);

      set({
        selectedCommitFiles: files,
        selectedCommitFile: files.length > 0 ? files[0] : null,
        selectedCommitData: commitData,
        isLoadingCommitFiles: false,
      });
    } catch (err) {
      set({ error: String(err), isLoadingCommitFiles: false });
    }
  },

  selectCommitFile: (file: FileDiff | null) => set({ selectedCommitFile: file }),

  clearCommitSelection: () =>
    set({
      selectedCommitOid: null,
      selectedCommitData: null,
      selectedCommitFiles: [],
      selectedCommitFile: null,
      isLoadingCommitFiles: false,
    }),

  selectStash: async (stash: StashEntry | null) => {
    if (!stash) {
      set({
        selectedStash: null,
        selectedStashFiles: [],
        selectedStashFile: null,
        isLoadingStashFiles: false,
      });
      return;
    }

    // Clear commit selection when selecting a stash
    set({
      selectedStash: stash,
      selectedStashFiles: [],
      selectedStashFile: null,
      isLoadingStashFiles: true,
      selectedCommitOid: null,
      selectedCommitData: null,
      selectedCommitFiles: [],
      selectedCommitFile: null,
    });

    try {
      const files = await diffApi.getCommit(stash.commitOid);
      set({
        selectedStashFiles: files,
        selectedStashFile: files.length > 0 ? files[0] : null,
        isLoadingStashFiles: false,
      });
    } catch (err) {
      set({ error: String(err), isLoadingStashFiles: false });
    }
  },

  clearStashSelection: () =>
    set({
      selectedStash: null,
      selectedStashFiles: [],
      selectedStashFile: null,
      isLoadingStashFiles: false,
    }),
}));
