import { create } from 'zustand';

import i18n from '@/i18n';
import { toast } from '@/hooks';
import { operations } from '@/store/operationStore';
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
  Worktree,
  Remote,
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
  worktreeApi,
  remoteApi,
} from '@/services/api';
import { getErrorMessage, isAxisError } from '@/lib/errorUtils';
import { debounce, type DebouncedFn } from '@/lib/debounce';

// Debounce delay for load operations
const DEBOUNCE_DELAY = 150;

// Debounced loaders (initialized lazily)
let debouncedLoadCommits: DebouncedFn | null = null;
let debouncedLoadStatus: DebouncedFn | null = null;
let debouncedLoadBranches: DebouncedFn | null = null;
let debouncedLoadTags: DebouncedFn | null = null;
let debouncedLoadStashes: DebouncedFn | null = null;

export type ViewType =
  | 'file-status'
  | 'history'
  | 'search'
  | 'reflog'
  | 'lfs'
  | 'pull-requests'
  | 'issues'
  | 'ci'
  | 'notifications';

interface RepositoryState {
  // Data
  repository: Repository | null;
  commits: GraphCommit[];
  maxLane: number;
  branches: Branch[];
  tags: Tag[];
  stashes: StashEntry[];
  remotes: Remote[];
  submodules: Submodule[];
  worktrees: Worktree[];
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

  // Scroll to commit state
  scrollTargetOid: string | null;

  // Stash detail state
  selectedStash: StashEntry | null;
  selectedStashFiles: FileDiff[];
  selectedStashFile: FileDiff | null;
  isLoadingStashFiles: boolean;

  // Checkout conflict state
  checkoutConflict: {
    files: string[];
    targetBranch: string;
    isRemote: boolean;
  } | null;

  // Loading states
  isLoading: boolean;
  isLoadingCommits: boolean;
  isLoadingMoreCommits: boolean;
  hasMoreCommits: boolean;
  error: string | null;

  // Actions
  openRepository: (path: string) => Promise<void>;
  switchRepository: (path: string) => Promise<void>;
  closeRepository: () => Promise<void>;
  refreshRepository: () => Promise<void>;
  reloadRepositoryInfo: () => Promise<void>;
  loadCommits: (limit?: number, skip?: number) => Promise<void>;
  loadMoreCommits: () => Promise<void>;
  loadBranches: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadStashes: () => Promise<void>;
  loadRemotes: () => Promise<void>;
  loadSubmodules: () => Promise<void>;
  loadWorktrees: () => Promise<void>;
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

  // Scroll to commit actions
  setScrollTarget: (oid: string | null) => void;

  // Stash detail actions
  selectStash: (stash: StashEntry | null) => Promise<void>;
  clearStashSelection: () => void;

  // Checkout conflict actions
  checkoutBranch: (branchName: string, isRemote?: boolean) => Promise<boolean>;
  stashAndCheckout: () => Promise<void>;
  discardAndCheckout: () => Promise<void>;
  clearCheckoutConflict: () => void;
}

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  // Initial state
  repository: null,
  commits: [],
  maxLane: 0,
  branches: [],
  tags: [],
  stashes: [],
  remotes: [],
  submodules: [],
  worktrees: [],
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
  scrollTargetOid: null,
  selectedStash: null,
  selectedStashFiles: [],
  selectedStashFile: null,
  isLoadingStashFiles: false,
  checkoutConflict: null,
  isLoading: false,
  isLoadingCommits: false,
  isLoadingMoreCommits: false,
  hasMoreCommits: false,
  error: null,

  openRepository: async (path: string) => {
    const opId = operations.start(i18n.t('store.repository.openingRepository'), {
      category: 'file',
    });
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
        get().loadRemotes(),
        get().loadSubmodules(),
        get().loadWorktrees(),
        get().loadStatus(),
      ]);
    } catch (err) {
      set({ error: getErrorMessage(err), isLoading: false });
      throw err;
    } finally {
      operations.complete(opId);
    }
  },

  switchRepository: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      const repository = await repositoryApi.switchActive(path);
      set({ repository, isLoading: false });

      // Load data in parallel
      await Promise.all([
        get().loadCommits(),
        get().loadBranches(),
        get().loadTags(),
        get().loadStashes(),
        get().loadRemotes(),
        get().loadSubmodules(),
        get().loadWorktrees(),
        get().loadStatus(),
      ]);
    } catch (err) {
      set({ error: getErrorMessage(err), isLoading: false });
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
        worktrees: [],
        status: null,
        error: null,
        selectedCommitOid: null,
        selectedCommitFiles: [],
        selectedCommitFile: null,
      });
    } catch (err) {
      set({ error: getErrorMessage(err) });
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
        get().loadRemotes(),
        get().loadSubmodules(),
        get().loadWorktrees(),
        get().loadStatus(),
      ]);
      set({ repository: updatedRepo });
    } catch (err) {
      set({ error: getErrorMessage(err) });
    }
  },

  reloadRepositoryInfo: async () => {
    try {
      const updatedRepo = await repositoryApi.getInfo();
      set({ repository: updatedRepo });
    } catch (err) {
      set({ error: getErrorMessage(err) });
    }
  },

  loadCommits: async (limit = 100, skip = 0) => {
    if (!debouncedLoadCommits) {
      debouncedLoadCommits = debounce(async (limitArg: number, skipArg: number) => {
        const { branchFilter, includeRemotes, sortOrder } = get();
        const opId = operations.start(i18n.t('store.repository.loadingCommits'), {
          category: 'file',
        });
        set({ isLoadingCommits: true });
        try {
          const result = await graphApi.build({
            limit: limitArg,
            skip: skipArg,
            branchFilter: branchFilter,
            includeRemotes: includeRemotes,
            sortOrder: sortOrder,
            fromRef: null,
            includeUncommitted: true,
          });
          set({
            commits: result.commits,
            maxLane: Number(result.maxLane),
            hasMoreCommits: result.hasMore,
            isLoadingCommits: false,
          });
        } catch (err) {
          set({ error: getErrorMessage(err), isLoadingCommits: false });
        } finally {
          operations.complete(opId);
        }
      }, DEBOUNCE_DELAY);
    }
    debouncedLoadCommits(limit, skip);
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

    const opId = operations.start(i18n.t('store.repository.loadingMoreCommits'), {
      category: 'file',
    });
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
      set({ error: getErrorMessage(err), isLoadingMoreCommits: false });
    } finally {
      operations.complete(opId);
    }
  },

  loadBranches: async () => {
    if (!debouncedLoadBranches) {
      debouncedLoadBranches = debounce(async () => {
        try {
          const branches = await branchApi.list();
          set({ branches });
        } catch (err) {
          set({ error: getErrorMessage(err) });
        }
      }, DEBOUNCE_DELAY);
    }
    debouncedLoadBranches();
  },

  loadTags: async () => {
    if (!debouncedLoadTags) {
      debouncedLoadTags = debounce(async () => {
        try {
          const tags = await tagApi.list();
          set({ tags });
        } catch (err) {
          set({ error: getErrorMessage(err) });
        }
      }, DEBOUNCE_DELAY);
    }
    debouncedLoadTags();
  },

  loadStashes: async () => {
    if (!debouncedLoadStashes) {
      debouncedLoadStashes = debounce(async () => {
        try {
          const stashes = await stashApi.list();
          set({ stashes });
        } catch (err) {
          set({ error: getErrorMessage(err) });
        }
      }, DEBOUNCE_DELAY);
    }
    debouncedLoadStashes();
  },

  loadRemotes: async () => {
    try {
      const remotes = await remoteApi.list();
      set({ remotes });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast.error(i18n.t('notifications.error.loadRemotesFailed'), errorMsg);
      set({ error: errorMsg });
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

  loadWorktrees: async () => {
    try {
      const worktrees = await worktreeApi.list();
      set({ worktrees });
    } catch {
      // Silently ignore - repo may not support worktrees or git version too old
      set({ worktrees: [] });
    }
  },

  loadStatus: async () => {
    if (!debouncedLoadStatus) {
      debouncedLoadStatus = debounce(async () => {
        try {
          const status = await repositoryApi.getStatus();
          set({ status });
        } catch (err) {
          set({ error: getErrorMessage(err) });
        }
      }, DEBOUNCE_DELAY);
    }
    debouncedLoadStatus();
  },

  loadRecentRepositories: async () => {
    try {
      const recentRepositories = await repositoryApi.getRecentRepositories();
      set({ recentRepositories });
    } catch (err) {
      set({ error: getErrorMessage(err) });
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

    const opId = operations.start(i18n.t('store.repository.loadingCommitDetails'), {
      category: 'file',
    });
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
      set({ error: getErrorMessage(err), isLoadingCommitFiles: false });
    } finally {
      operations.complete(opId);
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

  setScrollTarget: (oid: string | null) => set({ scrollTargetOid: oid }),

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

    const opId = operations.start(i18n.t('store.repository.loadingStashDetails'), {
      category: 'file',
    });
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
      set({ error: getErrorMessage(err), isLoadingStashFiles: false });
    } finally {
      operations.complete(opId);
    }
  },

  clearStashSelection: () =>
    set({
      selectedStash: null,
      selectedStashFiles: [],
      selectedStashFile: null,
      isLoadingStashFiles: false,
    }),

  checkoutBranch: async (branchName: string, isRemote = false): Promise<boolean> => {
    try {
      if (isRemote) {
        const parts = branchName.split('/');
        const remoteName = parts[0];
        const remoteBranchName = parts.slice(1).join('/');
        await branchApi.checkoutRemote(remoteName, remoteBranchName);
      } else {
        await branchApi.checkout(branchName, { create: false, force: false, track: null });
      }
      await get().loadBranches();
      await get().loadCommits();
      await get().loadStatus();
      return true;
    } catch (err) {
      if (isAxisError(err) && err.type === 'CheckoutConflict') {
        const files = Array.isArray(err.data) ? err.data : [];
        set({
          checkoutConflict: {
            files,
            targetBranch: branchName,
            isRemote,
          },
        });
        return false;
      }
      throw err;
    }
  },

  stashAndCheckout: async () => {
    const { checkoutConflict } = get();
    if (!checkoutConflict) return;

    const { targetBranch, isRemote } = checkoutConflict;
    try {
      await stashApi.save({
        message: null,
        includeUntracked: true,
        keepIndex: false,
        includeIgnored: false,
      });
      await get().checkoutBranch(targetBranch, isRemote);
      set({ checkoutConflict: null });
      await get().loadStashes();
    } catch (err) {
      toast.error(i18n.t('notifications.error.operationFailed'), getErrorMessage(err));
    }
  },

  discardAndCheckout: async () => {
    const { checkoutConflict } = get();
    if (!checkoutConflict) return;

    const { targetBranch, isRemote } = checkoutConflict;
    try {
      // Use force checkout
      if (isRemote) {
        const parts = targetBranch.split('/');
        const remoteName = parts[0];
        const remoteBranchName = parts.slice(1).join('/');
        await branchApi.checkoutRemote(remoteName, remoteBranchName, undefined, true);
      } else {
        await branchApi.checkout(targetBranch, { create: false, force: true, track: null });
      }
      set({ checkoutConflict: null });
      await get().loadBranches();
      await get().loadCommits();
      await get().loadStatus();
    } catch (err) {
      toast.error(i18n.t('notifications.error.operationFailed'), getErrorMessage(err));
    }
  },

  clearCheckoutConflict: () => set({ checkoutConflict: null }),
}));
