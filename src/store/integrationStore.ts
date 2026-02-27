import { create } from 'zustand';

import { events } from '@/bindings/api';
import i18n from '@/i18n';
import { getErrorMessage } from '@/lib/errorUtils';
import { normalizePath } from '@/lib/utils';
import { integrationApi } from '@/services/api';
import type {
  CIRun,
  CommitStatus,
  CreateIssueOptions,
  CreatePrOptions,
  DetectedProvider,
  IntegrationLabel,
  IntegrationRepoInfo,
  IntegrationStatus,
  Issue,
  IssueDetail,
  MergePrOptions,
  Notification,
  PullRequest,
  PullRequestDetail,
} from '@/types';
import { IssueState, PrState } from '@/types';

// Per-repository cache for integration data
interface IntegrationRepoCache {
  repoInfo: IntegrationRepoInfo | null;
  pullRequests: PullRequest[];
  selectedPr: PullRequestDetail | null;
  prFilter: PrState;
  prsPage: number;
  prsHasMore: boolean;
  issues: Issue[];
  selectedIssue: IssueDetail | null;
  issueFilter: IssueState;
  issuesPage: number;
  issuesHasMore: boolean;
  ciRuns: CIRun[];
  ciRunsPage: number;
  ciRunsHasMore: boolean;
  notifications: Notification[];
  unreadCount: number;
  notificationFilter: boolean;
  notificationsPage: number;
  notificationsHasMore: boolean;
}

interface IntegrationState {
  // Connection status (provider-level, not cached per-repo)
  detectedProvider: DetectedProvider | null;
  connectionStatus: IntegrationStatus | null;
  isConnecting: boolean;

  // Repository info
  repoInfo: IntegrationRepoInfo | null;

  // Pull Requests
  pullRequests: PullRequest[];
  selectedPr: PullRequestDetail | null;
  prFilter: PrState;
  prsPage: number;
  prsHasMore: boolean;
  isLoadingPrs: boolean;
  isLoadingMorePrs: boolean;

  // Issues
  issues: Issue[];
  selectedIssue: IssueDetail | null;
  issueFilter: IssueState;
  issuesPage: number;
  issuesHasMore: boolean;
  isLoadingIssues: boolean;
  isLoadingMoreIssues: boolean;

  // CI/CD
  ciRuns: CIRun[];
  ciRunsPage: number;
  ciRunsHasMore: boolean;
  isLoadingCiRuns: boolean;
  isLoadingMoreCiRuns: boolean;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  notificationFilter: boolean; // true = all, false = unread only
  notificationsPage: number;
  notificationsHasMore: boolean;
  isLoadingNotifications: boolean;
  isLoadingMoreNotifications: boolean;

  // Labels
  availableLabels: IntegrationLabel[];
  isLoadingLabels: boolean;

  // Per-repository cache
  repoCache: Map<string, IntegrationRepoCache>;

  // Error state
  error: string | null;

  // Actions
  detectProvider: () => Promise<void>;
  checkConnection: () => Promise<void>;
  startOAuth: () => Promise<void>;
  cancelOAuth: () => Promise<void>;
  disconnect: () => Promise<void>;

  loadRepoInfo: () => Promise<void>;
  loadLabels: () => Promise<void>;

  // Soft load (keeps existing data, updates in place)
  loadPullRequests: () => Promise<void>;
  loadIssues: () => Promise<void>;
  loadCiRuns: () => Promise<void>;
  loadNotifications: () => Promise<void>;

  // Hard reload (clears data first, shows loading state)
  reloadPullRequests: (state?: PrState) => Promise<void>;
  reloadIssues: (state?: IssueState) => Promise<void>;
  reloadCiRuns: () => Promise<void>;
  reloadNotifications: (all?: boolean) => Promise<void>;

  loadMorePullRequests: () => Promise<void>;
  getPullRequest: (number: number) => Promise<void>;
  createPullRequest: (options: CreatePrOptions) => Promise<PullRequest>;
  mergePullRequest: (number: number, options: MergePrOptions) => Promise<void>;
  setPrFilter: (state: PrState) => void;
  clearSelectedPr: () => void;
  clearPrView: () => void;

  loadMoreIssues: () => Promise<void>;
  getIssue: (number: number) => Promise<void>;
  createIssue: (options: CreateIssueOptions) => Promise<Issue>;
  setIssueFilter: (state: IssueState) => void;
  clearSelectedIssue: () => void;
  clearIssueView: () => void;

  loadMoreCiRuns: () => Promise<void>;
  clearCiView: () => void;
  getCommitStatus: (sha: string) => Promise<CommitStatus>;

  loadMoreNotifications: () => Promise<void>;
  markNotificationRead: (threadId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  setNotificationFilter: (all: boolean) => void;
  clearNotificationsView: () => void;

  // Cache management
  saveToCache: (repoPath: string) => void;
  restoreFromCache: (repoPath: string) => boolean;
  clearCache: (repoPath: string) => void;
  refresh: (force?: boolean) => void;

  clearError: () => void;
  reset: () => void;
}

const initialState = {
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
  availableLabels: [] as IntegrationLabel[],
  isLoadingLabels: false,
  repoCache: new Map<string, IntegrationRepoCache>(),
  error: null,
};

export const useIntegrationStore = create<IntegrationState>((set, get) => ({
  ...initialState,

  detectProvider: async () => {
    try {
      const detected = await integrationApi.detectProvider();
      set({ detectedProvider: detected, error: null });

      // If detected, check connection status
      if (detected) {
        await get().checkConnection();
      }
    } catch (error) {
      console.error('Failed to detect provider:', error);
      set({ error: i18n.t('store.integration.detectFailed', { error: getErrorMessage(error) }) });
    }
  },

  checkConnection: async () => {
    const { detectedProvider } = get();
    if (!detectedProvider) return;

    try {
      const status = await integrationApi.getStatus(detectedProvider.provider);
      set({ connectionStatus: status, error: null });
    } catch (error) {
      console.error('Failed to check connection:', error);
      set({
        error: i18n.t('store.integration.connectionCheckFailed', { error: getErrorMessage(error) }),
      });
    }
  },

  startOAuth: async () => {
    const { detectedProvider } = get();
    if (!detectedProvider) {
      set({ error: i18n.t('store.integration.noProviderDetected') });
      return;
    }

    set({ isConnecting: true, error: null });
    try {
      // This opens browser, waits for callback, and exchanges token
      await integrationApi.startOauth(detectedProvider.provider);
      await get().checkConnection();
      set({ isConnecting: false });

      // Load initial data after successful connection
      const { connectionStatus } = get();
      if (connectionStatus?.connected) {
        get().loadRepoInfo();
        get().reloadPullRequests();
        get().reloadIssues();
        get().reloadNotifications();
      }
    } catch (error) {
      console.error('Failed to start OAuth:', error);
      set({
        error: i18n.t('store.integration.oauthFailed', { error: getErrorMessage(error) }),
        isConnecting: false,
      });
    }
  },

  cancelOAuth: async () => {
    try {
      await integrationApi.cancelOauth();
      set({ isConnecting: false, error: null });
    } catch (error) {
      console.error('Failed to cancel OAuth:', error);
    }
  },

  disconnect: async () => {
    const { detectedProvider } = get();
    if (!detectedProvider) return;

    try {
      await integrationApi.disconnect(detectedProvider.provider);
      set({
        connectionStatus: null,
        repoInfo: null,
        pullRequests: [],
        selectedPr: null,
        prsPage: 1,
        prsHasMore: false,
        isLoadingMorePrs: false,
        issues: [],
        selectedIssue: null,
        issuesPage: 1,
        issuesHasMore: false,
        isLoadingMoreIssues: false,
        ciRuns: [],
        ciRunsPage: 1,
        ciRunsHasMore: false,
        isLoadingMoreCiRuns: false,
        notifications: [],
        notificationsPage: 1,
        notificationsHasMore: false,
        isLoadingMoreNotifications: false,
        unreadCount: 0,
        availableLabels: [],
        isLoadingLabels: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
      set({
        error: i18n.t('store.integration.disconnectFailed', { error: getErrorMessage(error) }),
      });
    }
  },

  loadRepoInfo: async () => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    try {
      const info = await integrationApi.getRepoInfo(detectedProvider);
      set({ repoInfo: info, error: null });
    } catch (error) {
      console.error('Failed to load repo info:', error);
      set({
        error: i18n.t('store.integration.repoInfoFailed', { error: getErrorMessage(error) }),
      });
    }
  },

  loadLabels: async () => {
    const { detectedProvider, connectionStatus, availableLabels, isLoadingLabels } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;
    if (isLoadingLabels || availableLabels.length > 0) return;

    set({ isLoadingLabels: true });

    try {
      const labels = await integrationApi.listLabels(detectedProvider);
      set({ availableLabels: labels, isLoadingLabels: false });
    } catch (error) {
      console.error('Failed to load labels:', error);
      set({ isLoadingLabels: false });
    }
  },

  // Soft load - keeps existing data visible, updates in place when done
  loadPullRequests: async () => {
    const { detectedProvider, connectionStatus, prFilter } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    try {
      const result = await integrationApi.listPrs(detectedProvider, prFilter, 1);
      set({
        pullRequests: result.items,
        prsPage: 1,
        prsHasMore: result.hasMore,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load pull requests:', error);
      // Silent fail on soft load - keep existing data
    }
  },

  // Hard reload - clears data first, shows loading state
  reloadPullRequests: async (state?: PrState) => {
    const { detectedProvider, connectionStatus, prFilter } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    const filterState = state ?? prFilter;
    set({ isLoadingPrs: true, prFilter: filterState, pullRequests: [], prsPage: 1 });

    try {
      const result = await integrationApi.listPrs(detectedProvider, filterState, 1);
      set({
        pullRequests: result.items,
        prsPage: 1,
        prsHasMore: result.hasMore,
        isLoadingPrs: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load pull requests:', error);
      set({
        isLoadingPrs: false,
        error: i18n.t('store.integration.prsFailed', { error: getErrorMessage(error) }),
      });
    }
  },

  loadMorePullRequests: async () => {
    const { detectedProvider, connectionStatus, prsHasMore, isLoadingMorePrs, prsPage, prFilter } =
      get();
    if (!detectedProvider || !connectionStatus?.connected) return;
    if (!prsHasMore || isLoadingMorePrs) return;

    set({ isLoadingMorePrs: true });

    try {
      const nextPage = prsPage + 1;
      const result = await integrationApi.listPrs(detectedProvider, prFilter, nextPage);
      set((state) => ({
        pullRequests: [...state.pullRequests, ...result.items],
        prsPage: nextPage,
        prsHasMore: result.hasMore,
        isLoadingMorePrs: false,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to load more pull requests:', error);
      set({
        isLoadingMorePrs: false,
        error: i18n.t('store.integration.prsMoreFailed', { error: getErrorMessage(error) }),
      });
    }
  },

  getPullRequest: async (number: number) => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    try {
      const pr = await integrationApi.getPr(detectedProvider, number);
      set({ selectedPr: pr, error: null });
    } catch (error) {
      console.error('Failed to get pull request:', error);
      set({ error: i18n.t('store.integration.prFailed', { error: getErrorMessage(error) }) });
    }
  },

  createPullRequest: async (options: CreatePrOptions) => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) {
      throw new Error(i18n.t('store.integration.notConnected'));
    }

    const pr = await integrationApi.createPr(detectedProvider, options);

    // Refresh PR list
    get().reloadPullRequests();

    return pr;
  },

  mergePullRequest: async (number: number, options: MergePrOptions) => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) {
      throw new Error(i18n.t('store.integration.notConnected'));
    }

    await integrationApi.mergePr(detectedProvider, number, options);

    // Refresh PR list, CI runs and clear selection
    set({ selectedPr: null });
    get().reloadPullRequests();
    get().reloadCiRuns();
  },

  setPrFilter: (state: PrState) => {
    set({ prFilter: state });
    get().reloadPullRequests(state);
  },

  clearSelectedPr: () => set({ selectedPr: null }),
  clearPrView: () =>
    set({
      pullRequests: [],
      selectedPr: null,
      prsPage: 1,
      prsHasMore: false,
      isLoadingPrs: false,
      isLoadingMorePrs: false,
    }),

  // Soft load - keeps existing data visible, updates in place when done
  loadIssues: async () => {
    const { detectedProvider, connectionStatus, issueFilter } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    try {
      const result = await integrationApi.listIssues(detectedProvider, issueFilter, 1);
      set({
        issues: result.items,
        issuesPage: 1,
        issuesHasMore: result.hasMore,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load issues:', error);
      // Silent fail on soft load - keep existing data
    }
  },

  // Hard reload - clears data first, shows loading state
  reloadIssues: async (state?: IssueState) => {
    const { detectedProvider, connectionStatus, issueFilter } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    const filterState = state ?? issueFilter;
    set({ isLoadingIssues: true, issueFilter: filterState, issues: [], issuesPage: 1 });

    try {
      const result = await integrationApi.listIssues(detectedProvider, filterState, 1);
      set({
        issues: result.items,
        issuesPage: 1,
        issuesHasMore: result.hasMore,
        isLoadingIssues: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load issues:', error);
      set({
        isLoadingIssues: false,
        error: i18n.t('store.integration.issuesFailed', { error: getErrorMessage(error) }),
      });
    }
  },

  loadMoreIssues: async () => {
    const {
      detectedProvider,
      connectionStatus,
      issuesHasMore,
      isLoadingMoreIssues,
      issuesPage,
      issueFilter,
    } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;
    if (!issuesHasMore || isLoadingMoreIssues) return;

    set({ isLoadingMoreIssues: true });

    try {
      const nextPage = issuesPage + 1;
      const result = await integrationApi.listIssues(detectedProvider, issueFilter, nextPage);
      set((state) => ({
        issues: [...state.issues, ...result.items],
        issuesPage: nextPage,
        issuesHasMore: result.hasMore,
        isLoadingMoreIssues: false,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to load more issues:', error);
      set({
        isLoadingMoreIssues: false,
        error: i18n.t('store.integration.issuesMoreFailed', { error: getErrorMessage(error) }),
      });
    }
  },

  getIssue: async (number: number) => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    try {
      const issue = await integrationApi.getIssue(detectedProvider, number);
      set({ selectedIssue: issue, error: null });
    } catch (error) {
      console.error('Failed to get issue:', error);
      set({ error: i18n.t('store.integration.issueFailed', { error: getErrorMessage(error) }) });
    }
  },

  createIssue: async (options: CreateIssueOptions) => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) {
      throw new Error(i18n.t('store.integration.notConnected'));
    }

    const issue = await integrationApi.createIssue(detectedProvider, options);

    // Refresh issue list
    get().reloadIssues();

    return issue;
  },

  setIssueFilter: (state: IssueState) => {
    set({ issueFilter: state });
    get().reloadIssues(state);
  },

  clearSelectedIssue: () => set({ selectedIssue: null }),
  clearIssueView: () =>
    set({
      issues: [],
      selectedIssue: null,
      issuesPage: 1,
      issuesHasMore: false,
      isLoadingIssues: false,
      isLoadingMoreIssues: false,
    }),

  // Soft load - keeps existing data visible, updates in place when done
  loadCiRuns: async () => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    try {
      const result = await integrationApi.listCiRuns(detectedProvider, 1);
      set({
        ciRuns: result.runs,
        ciRunsPage: 1,
        ciRunsHasMore: result.hasMore,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load CI runs:', error);
      // Silent fail on soft load - keep existing data
    }
  },

  // Hard reload - clears data first, shows loading state
  reloadCiRuns: async () => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    set({ isLoadingCiRuns: true, ciRuns: [], ciRunsPage: 1 });

    try {
      const result = await integrationApi.listCiRuns(detectedProvider, 1);
      set({
        ciRuns: result.runs,
        ciRunsPage: 1,
        ciRunsHasMore: result.hasMore,
        isLoadingCiRuns: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load CI runs:', error);
      set({
        isLoadingCiRuns: false,
        error: i18n.t('store.integration.ciRunsFailed', { error: getErrorMessage(error) }),
      });
    }
  },

  loadMoreCiRuns: async () => {
    const { detectedProvider, connectionStatus, ciRunsHasMore, isLoadingMoreCiRuns, ciRunsPage } =
      get();
    if (!detectedProvider || !connectionStatus?.connected) return;
    if (!ciRunsHasMore || isLoadingMoreCiRuns) return;

    set({ isLoadingMoreCiRuns: true });

    try {
      const nextPage = ciRunsPage + 1;
      const result = await integrationApi.listCiRuns(detectedProvider, nextPage);
      set((state) => ({
        ciRuns: [...state.ciRuns, ...result.runs],
        ciRunsPage: nextPage,
        ciRunsHasMore: result.hasMore,
        isLoadingMoreCiRuns: false,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to load more CI runs:', error);
      set({
        isLoadingMoreCiRuns: false,
        error: i18n.t('store.integration.ciRunsMoreFailed', { error: getErrorMessage(error) }),
      });
    }
  },

  clearCiView: () =>
    set({
      ciRuns: [],
      ciRunsPage: 1,
      ciRunsHasMore: false,
      isLoadingCiRuns: false,
      isLoadingMoreCiRuns: false,
    }),

  getCommitStatus: async (sha: string) => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) {
      throw new Error(i18n.t('store.integration.notConnected'));
    }

    return await integrationApi.getCommitStatus(detectedProvider, sha);
  },

  // Soft load - keeps existing data visible, updates in place when done
  loadNotifications: async () => {
    const { detectedProvider, connectionStatus, notificationFilter } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    try {
      const [result, unreadCount] = await Promise.all([
        integrationApi.listNotifications(detectedProvider, notificationFilter, 1),
        integrationApi.getUnreadCount(detectedProvider),
      ]);
      set({
        notifications: result.items,
        notificationsPage: 1,
        notificationsHasMore: result.hasMore,
        unreadCount,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Silent fail on soft load - keep existing data
    }
  },

  // Hard reload - clears data first, shows loading state
  reloadNotifications: async (all?: boolean) => {
    const { detectedProvider, connectionStatus, notificationFilter } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    const filterAll = all ?? notificationFilter;
    set({
      isLoadingNotifications: true,
      notifications: [],
      notificationFilter: filterAll,
      notificationsPage: 1,
    });

    try {
      const [result, unreadCount] = await Promise.all([
        integrationApi.listNotifications(detectedProvider, filterAll, 1),
        integrationApi.getUnreadCount(detectedProvider),
      ]);
      set({
        notifications: result.items,
        notificationsPage: 1,
        notificationsHasMore: result.hasMore,
        unreadCount,
        isLoadingNotifications: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load notifications:', error);
      set({
        isLoadingNotifications: false,
        error: i18n.t('store.integration.notificationsFailed', { error: getErrorMessage(error) }),
      });
    }
  },

  loadMoreNotifications: async () => {
    const {
      detectedProvider,
      connectionStatus,
      notificationFilter,
      notificationsHasMore,
      isLoadingMoreNotifications,
      notificationsPage,
    } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;
    if (!notificationsHasMore || isLoadingMoreNotifications) return;

    set({ isLoadingMoreNotifications: true });

    try {
      const nextPage = notificationsPage + 1;
      const result = await integrationApi.listNotifications(
        detectedProvider,
        notificationFilter,
        nextPage
      );
      set((state) => ({
        notifications: [...state.notifications, ...result.items],
        notificationsPage: nextPage,
        notificationsHasMore: result.hasMore,
        isLoadingMoreNotifications: false,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to load more notifications:', error);
      set({
        isLoadingMoreNotifications: false,
        error: i18n.t('store.integration.notificationsMoreFailed', {
          error: getErrorMessage(error),
        }),
      });
    }
  },

  markNotificationRead: async (threadId: string) => {
    const { detectedProvider } = get();
    if (!detectedProvider) return;

    try {
      await integrationApi.markNotificationRead(detectedProvider.provider, threadId);
      // Update local state
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === threadId ? { ...n, unread: false } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      set({
        error: i18n.t('store.integration.markReadFailed', { error: getErrorMessage(error) }),
      });
    }
  },

  markAllNotificationsRead: async () => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    try {
      await integrationApi.markAllNotificationsRead(detectedProvider);
      // Update local state
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, unread: false })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      set({
        error: i18n.t('store.integration.markAllReadFailed', { error: getErrorMessage(error) }),
      });
    }
  },

  setNotificationFilter: (all: boolean) => {
    set({ notificationFilter: all });
    get().reloadNotifications(all);
  },

  clearNotificationsView: () =>
    set({
      notifications: [],
      notificationFilter: false,
      notificationsPage: 1,
      notificationsHasMore: false,
      isLoadingNotifications: false,
      isLoadingMoreNotifications: false,
    }),

  // Save current state to cache for a repository
  saveToCache: (repoPath: string) => {
    const key = normalizePath(repoPath);
    const state = get();
    const cache: IntegrationRepoCache = {
      repoInfo: state.repoInfo,
      pullRequests: state.pullRequests,
      selectedPr: state.selectedPr,
      prFilter: state.prFilter,
      prsPage: state.prsPage,
      prsHasMore: state.prsHasMore,
      issues: state.issues,
      selectedIssue: state.selectedIssue,
      issueFilter: state.issueFilter,
      issuesPage: state.issuesPage,
      issuesHasMore: state.issuesHasMore,
      ciRuns: state.ciRuns,
      ciRunsPage: state.ciRunsPage,
      ciRunsHasMore: state.ciRunsHasMore,
      notifications: state.notifications,
      unreadCount: state.unreadCount,
      notificationFilter: state.notificationFilter,
      notificationsPage: state.notificationsPage,
      notificationsHasMore: state.notificationsHasMore,
    };
    const newCache = new Map(state.repoCache);
    newCache.set(key, cache);
    set({ repoCache: newCache });
  },

  // Restore state from cache for a repository
  restoreFromCache: (repoPath: string) => {
    const key = normalizePath(repoPath);
    const cached = get().repoCache.get(key);
    if (!cached) return false;

    set({
      repoInfo: cached.repoInfo,
      pullRequests: cached.pullRequests,
      selectedPr: cached.selectedPr,
      prFilter: cached.prFilter,
      prsPage: cached.prsPage,
      prsHasMore: cached.prsHasMore,
      issues: cached.issues,
      selectedIssue: cached.selectedIssue,
      issueFilter: cached.issueFilter,
      issuesPage: cached.issuesPage,
      issuesHasMore: cached.issuesHasMore,
      ciRuns: cached.ciRuns,
      ciRunsPage: cached.ciRunsPage,
      ciRunsHasMore: cached.ciRunsHasMore,
      notifications: cached.notifications,
      unreadCount: cached.unreadCount,
      notificationFilter: cached.notificationFilter,
      notificationsPage: cached.notificationsPage,
      notificationsHasMore: cached.notificationsHasMore,
      // Clear loading states
      isLoadingPrs: false,
      isLoadingMorePrs: false,
      isLoadingIssues: false,
      isLoadingMoreIssues: false,
      isLoadingCiRuns: false,
      isLoadingMoreCiRuns: false,
      isLoadingNotifications: false,
      isLoadingMoreNotifications: false,
      error: null,
    });
    return true;
  },

  // Clear cache for a repository (called when tab is closed)
  clearCache: (repoPath: string) => {
    const key = normalizePath(repoPath);
    const newCache = new Map(get().repoCache);
    newCache.delete(key);
    set({ repoCache: newCache });
  },

  // Refresh all integration data
  // force=false (default): soft refresh - keeps cached data visible while updating
  // force=true: hard refresh - clears data, shows loading state
  refresh: (force = false) => {
    const { connectionStatus, detectedProvider } = get();
    if (!connectionStatus?.connected || !detectedProvider) return;

    if (force) {
      get().reloadPullRequests();
      get().reloadIssues();
      get().reloadCiRuns();
      get().reloadNotifications();
    } else {
      get().loadPullRequests();
      get().loadIssues();
      get().loadCiRuns();
      get().loadNotifications();
    }
  },

  clearError: () => set({ error: null }),

  reset: () => {
    const { repoCache } = get();
    set({ ...initialState, repoCache }); // Preserve cache across resets
  },
}));

// Setup integration event listeners
let integrationListenerInitialized = false;

export function initIntegrationListeners() {
  if (integrationListenerInitialized) return;
  integrationListenerInitialized = true;

  events.integrationStatusChangedEvent.listen((event) => {
    const { provider, connected } = event.payload;
    const { detectedProvider, connectionStatus } = useIntegrationStore.getState();

    // Update connection status if it's for our detected provider
    if (detectedProvider && detectedProvider.provider === provider) {
      useIntegrationStore.setState({
        connectionStatus: connectionStatus
          ? { ...connectionStatus, connected }
          : { provider, connected, username: null, avatarUrl: null },
      });
    }
  });
}
