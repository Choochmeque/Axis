import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRepositoryStore } from './repositoryStore';
import {
  repositoryApi,
  graphApi,
  branchApi,
  tagApi,
  stashApi,
  submoduleApi,
  worktreeApi,
  diffApi,
} from '../services/api';

// Suppress unused import warnings - these are used in the mock
void graphApi;
void tagApi;
void stashApi;
void submoduleApi;
void worktreeApi;
void diffApi;
import type { GraphCommit, Branch } from '../types';
import { BranchType, RepositoryState, BranchFilterType, SortOrder } from '../types';

// Mock the API modules
vi.mock('../services/api', () => ({
  repositoryApi: {
    open: vi.fn(),
    close: vi.fn(),
    getInfo: vi.fn(),
    getStatus: vi.fn(),
    getRecentRepositories: vi.fn(),
    switchActive: vi.fn(),
  },
  graphApi: {
    build: vi.fn(),
  },
  branchApi: {
    list: vi.fn(),
  },
  tagApi: {
    list: vi.fn(),
  },
  stashApi: {
    list: vi.fn(),
  },
  submoduleApi: {
    list: vi.fn(),
  },
  worktreeApi: {
    list: vi.fn(),
  },
  diffApi: {
    getCommit: vi.fn(),
    getHead: vi.fn(),
  },
  remoteApi: {
    list: vi.fn(),
  },
  commitApi: {
    getCommit: vi.fn(),
  },
}));

describe('repositoryStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store state before each test
    useRepositoryStore.setState({
      repository: null,
      commits: [],
      branches: [],
      status: null,
      recentRepositories: [],
      isLoading: false,
      isLoadingCommits: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('openRepository', () => {
    it('should open a repository and load initial data', async () => {
      const mockRepo = {
        id: '123',
        name: 'test-repo',
        path: '/path/to/repo',
        isBare: false,
        isUnborn: false,
        currentBranch: 'main',
        state: RepositoryState.Clean,
      };

      const mockCommits = [
        {
          oid: 'abc123',
          shortOid: 'abc123',
          message: 'Initial commit',
          summary: 'Initial commit',
          author: { name: 'Test', email: 'test@test.com', timestamp: '2024-01-01T00:00:00Z' },
          committer: { name: 'Test', email: 'test@test.com', timestamp: '2024-01-01T00:00:00Z' },
          parentOids: [],
          timestamp: '2024-01-01T00:00:00Z',
          isMerge: false,
        },
      ];

      const mockBranches = [
        {
          name: 'main',
          fullName: 'refs/heads/main',
          branchType: BranchType.Local,
          isHead: true,
          upstream: null,
          ahead: null,
          behind: null,
          targetOid: 'abc123',
          lastCommitSummary: 'Initial commit',
          lastCommitTime: '2024-01-01T00:00:00Z',
        },
      ];

      const mockStatus = {
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: [],
      };

      vi.mocked(repositoryApi.open).mockResolvedValue(mockRepo);
      vi.mocked(graphApi.build).mockResolvedValue({
        commits: mockCommits as unknown as GraphCommit[],
        totalCount: 1,
        maxLane: 0,
        hasMore: false,
      });
      vi.mocked(branchApi.list).mockResolvedValue(mockBranches);
      vi.mocked(tagApi.list).mockResolvedValue([]);
      vi.mocked(stashApi.list).mockResolvedValue([]);
      vi.mocked(submoduleApi.list).mockResolvedValue([]);
      vi.mocked(worktreeApi.list).mockResolvedValue([]);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useRepositoryStore.getState().openRepository('/path/to/repo');
      await vi.runAllTimersAsync();

      const state = useRepositoryStore.getState();
      expect(state.repository).toEqual(mockRepo);
      expect(state.commits.length).toBe(1);
      expect(state.commits[0].oid).toBe('abc123');
      expect(state.branches).toEqual(mockBranches);
      expect(state.status).toEqual(mockStatus);
      expect(state.isLoading).toBe(false);
    });

    it('should set error state when opening fails', async () => {
      vi.mocked(repositoryApi.open).mockRejectedValue(new Error('Not a git repository'));

      await expect(useRepositoryStore.getState().openRepository('/invalid/path')).rejects.toThrow();
      await vi.runAllTimersAsync();

      const state = useRepositoryStore.getState();
      expect(state.error).toBe('Not a git repository');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('closeRepository', () => {
    it('should clear repository state', async () => {
      // Set up initial state
      useRepositoryStore.setState({
        repository: {
          id: '123',
          name: 'test-repo',
          path: '/path/to/repo',
          isBare: false,
          isUnborn: false,
          currentBranch: 'main',
          state: RepositoryState.Clean,
        },
        commits: [{ oid: 'abc' }] as unknown as GraphCommit[],
        branches: [{ name: 'main' }] as unknown as Branch[],
      });

      vi.mocked(repositoryApi.close).mockResolvedValue(null);

      await useRepositoryStore.getState().closeRepository();

      const state = useRepositoryStore.getState();
      expect(state.repository).toBeNull();
      expect(state.commits).toEqual([]);
      expect(state.branches).toEqual([]);
    });
  });

  describe('loadRecentRepositories', () => {
    it('should load recent repositories', async () => {
      const mockRecent = [
        {
          path: '/path/1',
          name: 'repo1',
          lastOpened: '2024-01-01T00:00:00Z',
          exists: true,
          currentBranch: 'main',
          isPinned: false,
          displayPath: '/path/1',
        },
        {
          path: '/path/2',
          name: 'repo2',
          lastOpened: '2024-01-02T00:00:00Z',
          exists: true,
          currentBranch: 'develop',
          isPinned: false,
          displayPath: '/path/2',
        },
      ];

      vi.mocked(repositoryApi.getRecentRepositories).mockResolvedValue(mockRecent);

      await useRepositoryStore.getState().loadRecentRepositories();

      const state = useRepositoryStore.getState();
      expect(state.recentRepositories).toEqual(mockRecent);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useRepositoryStore.setState({ error: 'Some error' });

      useRepositoryStore.getState().clearError();

      expect(useRepositoryStore.getState().error).toBeNull();
    });
  });

  describe('setCurrentView', () => {
    it('should update current view', () => {
      useRepositoryStore.getState().setCurrentView('history');

      expect(useRepositoryStore.getState().currentView).toBe('history');
    });

    it('should set to file-status view', () => {
      useRepositoryStore.getState().setCurrentView('file-status');

      expect(useRepositoryStore.getState().currentView).toBe('file-status');
    });
  });

  describe('setBranchFilter', () => {
    it('should update branch filter', async () => {
      vi.mocked(graphApi.build).mockResolvedValue({
        commits: [],
        totalCount: 0,
        maxLane: 0,
        hasMore: false,
      });

      useRepositoryStore.getState().setBranchFilter(BranchFilterType.Current);
      await vi.runAllTimersAsync();

      expect(useRepositoryStore.getState().branchFilter).toBe(BranchFilterType.Current);
    });
  });

  describe('setIncludeRemotes', () => {
    it('should update includeRemotes', async () => {
      vi.mocked(graphApi.build).mockResolvedValue({
        commits: [],
        totalCount: 0,
        maxLane: 0,
        hasMore: false,
      });

      useRepositoryStore.getState().setIncludeRemotes(false);
      await vi.runAllTimersAsync();

      expect(useRepositoryStore.getState().includeRemotes).toBe(false);
    });
  });

  describe('setSortOrder', () => {
    it('should update sort order', async () => {
      vi.mocked(graphApi.build).mockResolvedValue({
        commits: [],
        totalCount: 0,
        maxLane: 0,
        hasMore: false,
      });

      useRepositoryStore.getState().setSortOrder(SortOrder.AncestorOrder);
      await vi.runAllTimersAsync();

      expect(useRepositoryStore.getState().sortOrder).toBe(SortOrder.AncestorOrder);
    });
  });

  describe('selectCommit', () => {
    it('should select commit and load files', async () => {
      const mockFiles = [
        {
          oldPath: 'file.txt',
          newPath: 'file.txt',
          oldOid: 'abc',
          newOid: 'def',
          status: 'Modified' as const,
          binary: false,
          hunks: [],
          additions: 1,
          deletions: 0,
        },
      ];
      vi.mocked(diffApi.getCommit).mockResolvedValue(mockFiles);

      await useRepositoryStore.getState().selectCommit('abc123');

      const state = useRepositoryStore.getState();
      expect(state.selectedCommitOid).toBe('abc123');
      expect(state.selectedCommitFiles).toEqual(mockFiles);
      expect(state.selectedCommitFile).toEqual(mockFiles[0]);
    });

    it('should clear selection when null is passed', async () => {
      useRepositoryStore.setState({
        selectedCommitOid: 'abc123',
        selectedCommitFiles: [{ oldPath: 'test.txt' } as never],
      });

      await useRepositoryStore.getState().selectCommit(null);

      const state = useRepositoryStore.getState();
      expect(state.selectedCommitOid).toBeNull();
      expect(state.selectedCommitFiles).toEqual([]);
    });

    it('should handle uncommitted changes', async () => {
      const mockFiles = [
        {
          oldPath: 'unstaged.txt',
          newPath: 'unstaged.txt',
          oldOid: null,
          newOid: null,
          status: 'Modified' as const,
          binary: false,
          hunks: [],
          additions: 2,
          deletions: 1,
        },
      ];
      vi.mocked(diffApi.getHead).mockResolvedValue(mockFiles);

      await useRepositoryStore.getState().selectCommit('uncommitted');

      const state = useRepositoryStore.getState();
      expect(state.selectedCommitOid).toBe('uncommitted');
      expect(diffApi.getHead).toHaveBeenCalled();
    });

    it('should set error on failure', async () => {
      vi.mocked(diffApi.getCommit).mockRejectedValue(new Error('Failed to load commit'));

      await useRepositoryStore.getState().selectCommit('abc123');

      expect(useRepositoryStore.getState().error).toBe('Failed to load commit');
    });
  });

  describe('selectCommitFile', () => {
    it('should update selected commit file', () => {
      const file = { oldPath: 'test.txt' } as never;

      useRepositoryStore.getState().selectCommitFile(file);

      expect(useRepositoryStore.getState().selectedCommitFile).toEqual(file);
    });
  });

  describe('clearCommitSelection', () => {
    it('should clear commit selection state', () => {
      useRepositoryStore.setState({
        selectedCommitOid: 'abc123',
        selectedCommitData: { oid: 'abc123' } as never,
        selectedCommitFiles: [{ oldPath: 'test.txt' }] as never,
        selectedCommitFile: { oldPath: 'test.txt' } as never,
        isLoadingCommitFiles: true,
      });

      useRepositoryStore.getState().clearCommitSelection();

      const state = useRepositoryStore.getState();
      expect(state.selectedCommitOid).toBeNull();
      expect(state.selectedCommitData).toBeNull();
      expect(state.selectedCommitFiles).toEqual([]);
      expect(state.selectedCommitFile).toBeNull();
      expect(state.isLoadingCommitFiles).toBe(false);
    });
  });

  describe('setScrollTarget', () => {
    it('should update scroll target', () => {
      useRepositoryStore.getState().setScrollTarget('abc123');

      expect(useRepositoryStore.getState().scrollTargetOid).toBe('abc123');
    });

    it('should clear scroll target', () => {
      useRepositoryStore.setState({ scrollTargetOid: 'abc123' });

      useRepositoryStore.getState().setScrollTarget(null);

      expect(useRepositoryStore.getState().scrollTargetOid).toBeNull();
    });
  });

  describe('clearStashSelection', () => {
    it('should clear stash selection state', () => {
      useRepositoryStore.setState({
        selectedStash: { index: 0, message: 'test' } as never,
        selectedStashFiles: [{ oldPath: 'test.txt' }] as never,
        selectedStashFile: { oldPath: 'test.txt' } as never,
        isLoadingStashFiles: true,
      });

      useRepositoryStore.getState().clearStashSelection();

      const state = useRepositoryStore.getState();
      expect(state.selectedStash).toBeNull();
      expect(state.selectedStashFiles).toEqual([]);
      expect(state.selectedStashFile).toBeNull();
      expect(state.isLoadingStashFiles).toBe(false);
    });
  });

  describe('clearCheckoutConflict', () => {
    it('should clear checkout conflict state', () => {
      useRepositoryStore.setState({
        checkoutConflict: {
          files: ['file.txt'],
          targetBranch: 'feature',
          isRemote: false,
        },
      });

      useRepositoryStore.getState().clearCheckoutConflict();

      expect(useRepositoryStore.getState().checkoutConflict).toBeNull();
    });
  });

  describe('cache management', () => {
    it('should save state to cache', () => {
      useRepositoryStore.setState({
        commits: [{ oid: 'abc' }] as unknown as GraphCommit[],
        branches: [{ name: 'main' }] as unknown as Branch[],
        tags: [],
        stashes: [],
        currentView: 'history',
        branchFilter: 'All',
        includeRemotes: true,
        sortOrder: 'DateOrder',
        selectedCommitOid: 'abc',
        maxLane: 2,
        hasMoreCommits: true,
      });

      useRepositoryStore.getState().saveToCache('/path/to/repo');

      expect(useRepositoryStore.getState().repoCache.has('/path/to/repo')).toBe(true);
    });

    it('should restore state from cache', () => {
      const cachedData = {
        commits: [{ oid: 'cached' }],
        branches: [{ name: 'cached-branch' }],
        tags: [],
        stashes: [],
        currentView: 'history' as const,
        branchFilter: BranchFilterType.Current,
        includeRemotes: false,
        sortOrder: SortOrder.AncestorOrder,
        selectedCommitOid: 'cached',
        maxLane: 3,
        hasMoreCommits: false,
      };
      const cache = new Map();
      cache.set('/path/to/repo', cachedData);
      useRepositoryStore.setState({ repoCache: cache });

      const result = useRepositoryStore.getState().restoreFromCache('/path/to/repo');

      expect(result).toBe(true);
      const state = useRepositoryStore.getState();
      expect(state.currentView).toBe('history');
      expect(state.branchFilter).toBe(BranchFilterType.Current);
      expect(state.includeRemotes).toBe(false);
    });

    it('should return false when no cache exists', () => {
      const result = useRepositoryStore.getState().restoreFromCache('/nonexistent');

      expect(result).toBe(false);
    });

    it('should clear cache for repo', () => {
      const cache = new Map();
      cache.set('/path/to/repo', { commits: [] });
      useRepositoryStore.setState({ repoCache: cache });

      useRepositoryStore.getState().clearCache('/path/to/repo');

      expect(useRepositoryStore.getState().repoCache.has('/path/to/repo')).toBe(false);
    });
  });

  describe('refresh', () => {
    it('should soft refresh without clearing data', async () => {
      useRepositoryStore.setState({
        commits: [{ oid: 'existing' }] as unknown as GraphCommit[],
      });
      vi.mocked(graphApi.build).mockResolvedValue({
        commits: [],
        totalCount: 0,
        maxLane: 0,
        hasMore: false,
      });
      vi.mocked(branchApi.list).mockResolvedValue([]);
      vi.mocked(tagApi.list).mockResolvedValue([]);
      vi.mocked(stashApi.list).mockResolvedValue([]);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue({
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: [],
      });

      useRepositoryStore.getState().refresh();

      // Data should not be cleared immediately on soft refresh
      expect(useRepositoryStore.getState().commits.length).toBe(1);
    });

    it('should force refresh and clear data', async () => {
      useRepositoryStore.setState({
        commits: [{ oid: 'existing' }] as unknown as GraphCommit[],
        branches: [{ name: 'main' }] as unknown as Branch[],
      });
      vi.mocked(graphApi.build).mockResolvedValue({
        commits: [],
        totalCount: 0,
        maxLane: 0,
        hasMore: false,
      });

      useRepositoryStore.getState().refresh(true);

      // Data should be cleared immediately on force refresh
      expect(useRepositoryStore.getState().commits).toEqual([]);
      expect(useRepositoryStore.getState().branches).toEqual([]);
    });
  });

  describe('switchRepository', () => {
    it('should switch to a different repository', async () => {
      const mockRepo = {
        id: '456',
        name: 'another-repo',
        path: '/path/to/another',
        isBare: false,
        isUnborn: false,
        currentBranch: 'develop',
        state: RepositoryState.Clean,
      };

      vi.mocked(repositoryApi.switchActive).mockResolvedValue(mockRepo);

      await useRepositoryStore.getState().switchRepository('/path/to/another');

      expect(useRepositoryStore.getState().repository).toEqual(mockRepo);
    });

    it('should set error on failure', async () => {
      vi.mocked(repositoryApi.switchActive).mockRejectedValue(new Error('Failed to switch'));

      await expect(
        useRepositoryStore.getState().switchRepository('/invalid/path')
      ).rejects.toThrow();

      expect(useRepositoryStore.getState().error).toBe('Failed to switch');
    });
  });
});
