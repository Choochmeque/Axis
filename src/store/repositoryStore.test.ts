import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRepositoryStore } from './repositoryStore';
import { repositoryApi, commitApi, branchApi } from '../services/api';

// Mock the API modules
vi.mock('../services/api', () => ({
  repositoryApi: {
    open: vi.fn(),
    close: vi.fn(),
    getInfo: vi.fn(),
    getStatus: vi.fn(),
    getRecentRepositories: vi.fn(),
  },
  commitApi: {
    getHistory: vi.fn(),
  },
  branchApi: {
    list: vi.fn(),
  },
}));

describe('repositoryStore', () => {
  beforeEach(() => {
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

  describe('openRepository', () => {
    it('should open a repository and load initial data', async () => {
      const mockRepo = {
        id: '123',
        name: 'test-repo',
        path: '/path/to/repo',
        is_bare: false,
        current_branch: 'main',
        state: 'clean' as const,
      };

      const mockCommits = [
        {
          oid: 'abc123',
          short_oid: 'abc123',
          message: 'Initial commit',
          summary: 'Initial commit',
          author: { name: 'Test', email: 'test@test.com', timestamp: '2024-01-01T00:00:00Z' },
          committer: { name: 'Test', email: 'test@test.com', timestamp: '2024-01-01T00:00:00Z' },
          parent_oids: [],
          timestamp: '2024-01-01T00:00:00Z',
          is_merge: false,
        },
      ];

      const mockBranches = [
        {
          name: 'main',
          full_name: 'refs/heads/main',
          branch_type: 'local' as const,
          is_head: true,
          upstream: null,
          ahead: null,
          behind: null,
          target_oid: 'abc123',
          last_commit_summary: 'Initial commit',
          last_commit_time: '2024-01-01T00:00:00Z',
        },
      ];

      const mockStatus = {
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: [],
      };

      vi.mocked(repositoryApi.open).mockResolvedValue(mockRepo);
      vi.mocked(commitApi.getHistory).mockResolvedValue(mockCommits);
      vi.mocked(branchApi.list).mockResolvedValue(mockBranches);
      vi.mocked(repositoryApi.getStatus).mockResolvedValue(mockStatus);

      await useRepositoryStore.getState().openRepository('/path/to/repo');

      const state = useRepositoryStore.getState();
      expect(state.repository).toEqual(mockRepo);
      expect(state.commits).toEqual(mockCommits);
      expect(state.branches).toEqual(mockBranches);
      expect(state.status).toEqual(mockStatus);
      expect(state.isLoading).toBe(false);
    });

    it('should set error state when opening fails', async () => {
      vi.mocked(repositoryApi.open).mockRejectedValue(new Error('Not a git repository'));

      await expect(useRepositoryStore.getState().openRepository('/invalid/path')).rejects.toThrow();

      const state = useRepositoryStore.getState();
      expect(state.error).toBe('Error: Not a git repository');
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
          is_bare: false,
          current_branch: 'main',
          state: 'clean',
        },
        commits: [{ oid: 'abc' }] as any,
        branches: [{ name: 'main' }] as any,
      });

      vi.mocked(repositoryApi.close).mockResolvedValue(undefined);

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
        { path: '/path/1', name: 'repo1', last_opened: '2024-01-01T00:00:00Z' },
        { path: '/path/2', name: 'repo2', last_opened: '2024-01-02T00:00:00Z' },
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
});
