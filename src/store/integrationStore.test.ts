import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DetectedProvider,
  IntegrationStatus,
  IntegrationUser,
  Issue,
  PullRequest,
} from '@/types';
import { IssueState, ProviderType, PrState } from '@/types';
import { useIntegrationStore } from './integrationStore';

vi.mock('@/bindings/api', () => ({
  events: {
    integrationStatusChangedEvent: {
      listen: vi.fn(),
    },
  },
}));

vi.mock('@/services/api', () => ({
  integrationApi: {
    detectProvider: vi.fn(),
    getStatus: vi.fn(),
    startOauth: vi.fn(),
    cancelOauth: vi.fn(),
    disconnect: vi.fn(),
    getRepoInfo: vi.fn(),
    listPrs: vi.fn(),
    getPr: vi.fn(),
    createPr: vi.fn(),
    mergePr: vi.fn(),
    listIssues: vi.fn(),
    getIssue: vi.fn(),
    createIssue: vi.fn(),
    listCiRuns: vi.fn(),
    getCommitStatus: vi.fn(),
    listNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, params?: Record<string, string>) => {
      if (params) {
        return `${key}: ${JSON.stringify(params)}`;
      }
      return key;
    },
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));

vi.mock('@/lib/utils', () => ({
  normalizePath: (path: string) => path.replace(/\/$/, ''),
}));

import { integrationApi } from '@/services/api';

describe('integrationStore', () => {
  const mockUser: IntegrationUser = {
    login: 'testuser',
    avatarUrl: 'https://example.com/avatar.png',
    url: 'https://github.com/testuser',
  };

  const mockProvider: DetectedProvider = {
    provider: ProviderType.GitHub,
    owner: 'test-owner',
    repo: 'test-repo',
  };

  const mockStatus: IntegrationStatus = {
    provider: ProviderType.GitHub,
    connected: true,
    username: 'testuser',
    avatarUrl: 'https://example.com/avatar.png',
  };

  const mockPr: PullRequest = {
    provider: ProviderType.GitHub,
    number: 1,
    title: 'Test PR',
    state: PrState.Open,
    author: mockUser,
    sourceBranch: 'feature',
    targetBranch: 'main',
    draft: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    url: 'https://github.com/test/repo/pull/1',
  };

  const mockIssue: Issue = {
    provider: ProviderType.GitHub,
    number: 1,
    title: 'Test Issue',
    state: IssueState.Open,
    author: mockUser,
    labels: [],
    commentsCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    url: 'https://github.com/test/repo/issues/1',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    useIntegrationStore.setState({
      detectedProvider: null,
      connectionStatus: null,
      isConnecting: false,
      repoInfo: null,
      pullRequests: [],
      selectedPr: null,
      prFilter: PrState.Open,
      prsPage: 1,
      prsHasMore: false,
      isLoadingPrs: false,
      isLoadingMorePrs: false,
      issues: [],
      selectedIssue: null,
      issueFilter: IssueState.Open,
      issuesPage: 1,
      issuesHasMore: false,
      isLoadingIssues: false,
      isLoadingMoreIssues: false,
      ciRuns: [],
      ciRunsPage: 1,
      ciRunsHasMore: false,
      isLoadingCiRuns: false,
      isLoadingMoreCiRuns: false,
      notifications: [],
      unreadCount: 0,
      notificationFilter: false,
      notificationsPage: 1,
      notificationsHasMore: false,
      isLoadingNotifications: false,
      isLoadingMoreNotifications: false,
      repoCache: new Map(),
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('detectProvider', () => {
    it('should detect provider and check connection', async () => {
      vi.mocked(integrationApi.detectProvider).mockResolvedValue(mockProvider);
      vi.mocked(integrationApi.getStatus).mockResolvedValue(mockStatus);

      await useIntegrationStore.getState().detectProvider();

      expect(integrationApi.detectProvider).toHaveBeenCalled();
      expect(integrationApi.getStatus).toHaveBeenCalledWith(ProviderType.GitHub);
      expect(useIntegrationStore.getState().detectedProvider).toEqual(mockProvider);
      expect(useIntegrationStore.getState().connectionStatus).toEqual(mockStatus);
    });

    it('should not check connection if no provider detected', async () => {
      vi.mocked(integrationApi.detectProvider).mockResolvedValue(null);

      await useIntegrationStore.getState().detectProvider();

      expect(integrationApi.getStatus).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      vi.mocked(integrationApi.detectProvider).mockRejectedValue(new Error('Failed'));

      await useIntegrationStore.getState().detectProvider();

      expect(useIntegrationStore.getState().error).toContain('detectFailed');
    });
  });

  describe('checkConnection', () => {
    it('should check connection status for detected provider', async () => {
      useIntegrationStore.setState({ detectedProvider: mockProvider });
      vi.mocked(integrationApi.getStatus).mockResolvedValue(mockStatus);

      await useIntegrationStore.getState().checkConnection();

      expect(integrationApi.getStatus).toHaveBeenCalledWith(ProviderType.GitHub);
      expect(useIntegrationStore.getState().connectionStatus).toEqual(mockStatus);
    });

    it('should do nothing if no provider detected', async () => {
      await useIntegrationStore.getState().checkConnection();

      expect(integrationApi.getStatus).not.toHaveBeenCalled();
    });
  });

  describe('cancelOAuth', () => {
    it('should cancel OAuth', async () => {
      useIntegrationStore.setState({ isConnecting: true });
      vi.mocked(integrationApi.cancelOauth).mockResolvedValue(null);

      await useIntegrationStore.getState().cancelOAuth();

      expect(integrationApi.cancelOauth).toHaveBeenCalled();
      expect(useIntegrationStore.getState().isConnecting).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect and clear state', async () => {
      useIntegrationStore.setState({
        detectedProvider: mockProvider,
        connectionStatus: mockStatus,
        pullRequests: [mockPr],
        issues: [mockIssue],
      });
      vi.mocked(integrationApi.disconnect).mockResolvedValue(null);

      await useIntegrationStore.getState().disconnect();

      expect(integrationApi.disconnect).toHaveBeenCalledWith(ProviderType.GitHub);
      const state = useIntegrationStore.getState();
      expect(state.connectionStatus).toBeNull();
      expect(state.pullRequests).toHaveLength(0);
      expect(state.issues).toHaveLength(0);
    });
  });

  describe('loadPullRequests', () => {
    it('should load pull requests', async () => {
      useIntegrationStore.setState({
        detectedProvider: mockProvider,
        connectionStatus: mockStatus,
      });
      vi.mocked(integrationApi.listPrs).mockResolvedValue({
        items: [mockPr],
        hasMore: true,
      });

      await useIntegrationStore.getState().loadPullRequests();

      expect(integrationApi.listPrs).toHaveBeenCalledWith(mockProvider, PrState.Open, 1);
      const state = useIntegrationStore.getState();
      expect(state.pullRequests).toHaveLength(1);
      expect(state.prsHasMore).toBe(true);
    });

    it('should do nothing if not connected', async () => {
      await useIntegrationStore.getState().loadPullRequests();

      expect(integrationApi.listPrs).not.toHaveBeenCalled();
    });
  });

  describe('reloadPullRequests', () => {
    it('should reload pull requests with loading state', async () => {
      useIntegrationStore.setState({
        detectedProvider: mockProvider,
        connectionStatus: mockStatus,
        pullRequests: [mockPr],
      });
      vi.mocked(integrationApi.listPrs).mockResolvedValue({
        items: [],
        hasMore: false,
      });

      await useIntegrationStore.getState().reloadPullRequests();

      const state = useIntegrationStore.getState();
      expect(state.isLoadingPrs).toBe(false);
      expect(state.pullRequests).toHaveLength(0);
    });

    it('should update filter when provided', async () => {
      useIntegrationStore.setState({
        detectedProvider: mockProvider,
        connectionStatus: mockStatus,
        prFilter: PrState.Open,
      });
      vi.mocked(integrationApi.listPrs).mockResolvedValue({ items: [], hasMore: false });

      await useIntegrationStore.getState().reloadPullRequests(PrState.Closed);

      expect(useIntegrationStore.getState().prFilter).toBe(PrState.Closed);
      expect(integrationApi.listPrs).toHaveBeenCalledWith(mockProvider, PrState.Closed, 1);
    });
  });

  describe('loadMorePullRequests', () => {
    it('should load next page of pull requests', async () => {
      useIntegrationStore.setState({
        detectedProvider: mockProvider,
        connectionStatus: mockStatus,
        pullRequests: [mockPr],
        prsPage: 1,
        prsHasMore: true,
      });
      const secondPr = { ...mockPr, number: 2 };
      vi.mocked(integrationApi.listPrs).mockResolvedValue({
        items: [secondPr],
        hasMore: false,
      });

      await useIntegrationStore.getState().loadMorePullRequests();

      const state = useIntegrationStore.getState();
      expect(state.pullRequests).toHaveLength(2);
      expect(state.prsPage).toBe(2);
      expect(state.prsHasMore).toBe(false);
    });

    it('should not load if no more items', async () => {
      useIntegrationStore.setState({
        detectedProvider: mockProvider,
        connectionStatus: mockStatus,
        prsHasMore: false,
      });

      await useIntegrationStore.getState().loadMorePullRequests();

      expect(integrationApi.listPrs).not.toHaveBeenCalled();
    });
  });

  describe('setPrFilter', () => {
    it('should update filter and reload', async () => {
      useIntegrationStore.setState({
        detectedProvider: mockProvider,
        connectionStatus: mockStatus,
        prFilter: PrState.Open,
      });
      vi.mocked(integrationApi.listPrs).mockResolvedValue({ items: [], hasMore: false });

      useIntegrationStore.getState().setPrFilter(PrState.Merged);

      expect(useIntegrationStore.getState().prFilter).toBe(PrState.Merged);
    });
  });

  describe('loadIssues', () => {
    it('should load issues', async () => {
      useIntegrationStore.setState({
        detectedProvider: mockProvider,
        connectionStatus: mockStatus,
      });
      vi.mocked(integrationApi.listIssues).mockResolvedValue({
        items: [mockIssue],
        hasMore: false,
      });

      await useIntegrationStore.getState().loadIssues();

      expect(integrationApi.listIssues).toHaveBeenCalledWith(mockProvider, IssueState.Open, 1);
      expect(useIntegrationStore.getState().issues).toHaveLength(1);
    });
  });

  describe('cache management', () => {
    it('should save state to cache', () => {
      useIntegrationStore.setState({
        pullRequests: [mockPr],
        issues: [mockIssue],
      });

      useIntegrationStore.getState().saveToCache('/path/to/repo');

      expect(useIntegrationStore.getState().repoCache.has('/path/to/repo')).toBe(true);
    });

    it('should return false if no cache exists', () => {
      const result = useIntegrationStore.getState().restoreFromCache('/nonexistent');

      expect(result).toBe(false);
    });

    it('should clear cache for repo', () => {
      const cache = new Map();
      cache.set('/path/to/repo', { pullRequests: [mockPr] });
      useIntegrationStore.setState({ repoCache: cache });

      useIntegrationStore.getState().clearCache('/path/to/repo');

      expect(useIntegrationStore.getState().repoCache.has('/path/to/repo')).toBe(false);
    });
  });

  describe('clear actions', () => {
    it('should clear selected PR', () => {
      useIntegrationStore.setState({ selectedPr: mockPr as never });

      useIntegrationStore.getState().clearSelectedPr();

      expect(useIntegrationStore.getState().selectedPr).toBeNull();
    });

    it('should clear PR view', () => {
      useIntegrationStore.setState({
        pullRequests: [mockPr],
        selectedPr: mockPr as never,
        prsPage: 2,
        prsHasMore: true,
        isLoadingPrs: true,
      });

      useIntegrationStore.getState().clearPrView();

      const state = useIntegrationStore.getState();
      expect(state.pullRequests).toHaveLength(0);
      expect(state.selectedPr).toBeNull();
      expect(state.prsPage).toBe(1);
    });

    it('should clear selected issue', () => {
      useIntegrationStore.setState({ selectedIssue: mockIssue as never });

      useIntegrationStore.getState().clearSelectedIssue();

      expect(useIntegrationStore.getState().selectedIssue).toBeNull();
    });

    it('should clear issue view', () => {
      useIntegrationStore.setState({
        issues: [mockIssue],
        selectedIssue: mockIssue as never,
      });

      useIntegrationStore.getState().clearIssueView();

      const state = useIntegrationStore.getState();
      expect(state.issues).toHaveLength(0);
      expect(state.selectedIssue).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset state but preserve cache', () => {
      const cache = new Map();
      cache.set('/path/to/repo', { pullRequests: [mockPr] });
      useIntegrationStore.setState({
        detectedProvider: mockProvider,
        connectionStatus: mockStatus,
        pullRequests: [mockPr],
        issues: [mockIssue],
        error: 'Some error',
        repoCache: cache,
      });

      useIntegrationStore.getState().reset();

      const state = useIntegrationStore.getState();
      expect(state.detectedProvider).toBeNull();
      expect(state.connectionStatus).toBeNull();
      expect(state.pullRequests).toHaveLength(0);
      expect(state.issues).toHaveLength(0);
      expect(state.error).toBeNull();
      // Cache should be preserved
      expect(state.repoCache.has('/path/to/repo')).toBe(true);
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      useIntegrationStore.setState({ error: 'Some error' });

      useIntegrationStore.getState().clearError();

      expect(useIntegrationStore.getState().error).toBeNull();
    });
  });
});
