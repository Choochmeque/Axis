import { create } from 'zustand';

import { commands, events } from '@/bindings/api';
import { getErrorMessage } from '@/lib/errorUtils';
import { PrState, IssueState } from '@/types';
import type {
  DetectedProvider,
  IntegrationStatus,
  IntegrationRepoInfo,
  PullRequest,
  PullRequestDetail,
  Issue,
  IssueDetail,
  CIRun,
  CommitStatus,
  Notification,
  CreatePrOptions,
  MergePrOptions,
  CreateIssueOptions,
} from '@/types';

interface IntegrationState {
  // Connection status
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
  prsTotalCount: number;
  isLoadingPrs: boolean;
  isLoadingMorePrs: boolean;

  // Issues
  issues: Issue[];
  selectedIssue: IssueDetail | null;
  issueFilter: IssueState;
  issuesPage: number;
  issuesHasMore: boolean;
  issuesTotalCount: number;
  isLoadingIssues: boolean;
  isLoadingMoreIssues: boolean;

  // CI/CD
  ciRuns: CIRun[];
  ciRunsPage: number;
  ciRunsHasMore: boolean;
  ciRunsTotalCount: number;
  isLoadingCiRuns: boolean;
  isLoadingMoreCiRuns: boolean;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  notificationsPage: number;
  notificationsHasMore: boolean;
  isLoadingNotifications: boolean;
  isLoadingMoreNotifications: boolean;

  // Error state
  error: string | null;

  // Actions
  detectProvider: () => Promise<void>;
  checkConnection: () => Promise<void>;
  startOAuth: () => Promise<void>;
  cancelOAuth: () => Promise<void>;
  disconnect: () => Promise<void>;

  loadRepoInfo: () => Promise<void>;

  loadPullRequests: (state?: PrState) => Promise<void>;
  loadMorePullRequests: () => Promise<void>;
  getPullRequest: (number: number) => Promise<void>;
  createPullRequest: (options: CreatePrOptions) => Promise<PullRequest>;
  mergePullRequest: (number: number, options: MergePrOptions) => Promise<void>;
  setPrFilter: (state: PrState) => void;
  clearSelectedPr: () => void;
  clearPrView: () => void;

  loadIssues: (state?: IssueState) => Promise<void>;
  loadMoreIssues: () => Promise<void>;
  getIssue: (number: number) => Promise<void>;
  createIssue: (options: CreateIssueOptions) => Promise<Issue>;
  setIssueFilter: (state: IssueState) => void;
  clearSelectedIssue: () => void;
  clearIssueView: () => void;

  loadCiRuns: () => Promise<void>;
  loadMoreCiRuns: () => Promise<void>;
  clearCiView: () => void;
  getCommitStatus: (sha: string) => Promise<CommitStatus>;

  loadNotifications: (all?: boolean) => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markNotificationRead: (threadId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearNotificationsView: () => void;

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
  prsTotalCount: 0,
  isLoadingPrs: false,
  isLoadingMorePrs: false,
  issues: [],
  selectedIssue: null,
  issueFilter: IssueState.Open,
  issuesPage: 1,
  issuesHasMore: false,
  issuesTotalCount: 0,
  isLoadingIssues: false,
  isLoadingMoreIssues: false,
  ciRuns: [],
  ciRunsPage: 1,
  ciRunsHasMore: false,
  ciRunsTotalCount: 0,
  isLoadingCiRuns: false,
  isLoadingMoreCiRuns: false,
  notifications: [],
  unreadCount: 0,
  notificationsPage: 1,
  notificationsHasMore: false,
  isLoadingNotifications: false,
  isLoadingMoreNotifications: false,
  error: null,
};

export const useIntegrationStore = create<IntegrationState>((set, get) => ({
  ...initialState,

  detectProvider: async () => {
    try {
      const detected = await commands.integrationDetectProvider();
      set({ detectedProvider: detected, error: null });

      // If detected, check connection status
      if (detected) {
        await get().checkConnection();
      }
    } catch (error) {
      console.error('Failed to detect provider:', error);
      set({ error: `Failed to detect provider: ${getErrorMessage(error)}` });
    }
  },

  checkConnection: async () => {
    const { detectedProvider } = get();
    if (!detectedProvider) return;

    try {
      const status = await commands.integrationGetStatus(detectedProvider.provider);
      set({ connectionStatus: status, error: null });
    } catch (error) {
      console.error('Failed to check connection:', error);
      set({ error: `Failed to check connection: ${getErrorMessage(error)}` });
    }
  },

  startOAuth: async () => {
    const { detectedProvider } = get();
    if (!detectedProvider) {
      set({ error: 'No provider detected' });
      return;
    }

    set({ isConnecting: true, error: null });
    try {
      // This opens browser, waits for callback, and exchanges token
      await commands.integrationStartOauth();
      await get().checkConnection();
      set({ isConnecting: false });

      // Load initial data after successful connection
      const { connectionStatus } = get();
      if (connectionStatus?.connected) {
        get().loadRepoInfo();
        get().loadPullRequests();
        get().loadIssues();
        get().loadNotifications();
      }
    } catch (error) {
      console.error('Failed to start OAuth:', error);
      set({ error: `Failed to start OAuth: ${getErrorMessage(error)}`, isConnecting: false });
    }
  },

  cancelOAuth: async () => {
    try {
      await commands.integrationCancelOauth();
      set({ isConnecting: false, error: null });
    } catch (error) {
      console.error('Failed to cancel OAuth:', error);
    }
  },

  disconnect: async () => {
    const { detectedProvider } = get();
    if (!detectedProvider) return;

    try {
      await commands.integrationDisconnect(detectedProvider.provider);
      set({
        connectionStatus: null,
        repoInfo: null,
        pullRequests: [],
        selectedPr: null,
        prsPage: 1,
        prsHasMore: false,
        prsTotalCount: 0,
        isLoadingMorePrs: false,
        issues: [],
        selectedIssue: null,
        issuesPage: 1,
        issuesHasMore: false,
        issuesTotalCount: 0,
        isLoadingMoreIssues: false,
        ciRuns: [],
        ciRunsPage: 1,
        ciRunsHasMore: false,
        ciRunsTotalCount: 0,
        isLoadingMoreCiRuns: false,
        notifications: [],
        notificationsPage: 1,
        notificationsHasMore: false,
        isLoadingMoreNotifications: false,
        unreadCount: 0,
        error: null,
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
      set({ error: `Failed to disconnect: ${getErrorMessage(error)}` });
    }
  },

  loadRepoInfo: async () => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    try {
      const info = await commands.integrationGetRepoInfo(
        detectedProvider.owner,
        detectedProvider.repo
      );
      set({ repoInfo: info, error: null });
    } catch (error) {
      console.error('Failed to load repo info:', error);
      set({ error: `Failed to load repository info: ${getErrorMessage(error)}` });
    }
  },

  loadPullRequests: async (state?: PrState) => {
    const { detectedProvider, connectionStatus, prFilter } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    const filterState = state ?? prFilter;
    set({ isLoadingPrs: true, prFilter: filterState, pullRequests: [], prsPage: 1 });

    try {
      const result = await commands.integrationListPrs(
        detectedProvider.owner,
        detectedProvider.repo,
        filterState,
        1
      );
      set({
        pullRequests: result.items,
        prsPage: 1,
        prsHasMore: result.hasMore,
        prsTotalCount: result.totalCount,
        isLoadingPrs: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load pull requests:', error);
      set({
        isLoadingPrs: false,
        error: `Failed to load pull requests: ${getErrorMessage(error)}`,
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
      const result = await commands.integrationListPrs(
        detectedProvider.owner,
        detectedProvider.repo,
        prFilter,
        nextPage
      );
      set((state) => ({
        pullRequests: [...state.pullRequests, ...result.items],
        prsPage: nextPage,
        prsHasMore: result.hasMore,
        prsTotalCount: result.totalCount,
        isLoadingMorePrs: false,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to load more pull requests:', error);
      set({
        isLoadingMorePrs: false,
        error: `Failed to load more pull requests: ${getErrorMessage(error)}`,
      });
    }
  },

  getPullRequest: async (number: number) => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    try {
      const pr = await commands.integrationGetPr(
        detectedProvider.owner,
        detectedProvider.repo,
        number
      );
      set({ selectedPr: pr, error: null });
    } catch (error) {
      console.error('Failed to get pull request:', error);
      set({ error: `Failed to get pull request: ${getErrorMessage(error)}` });
    }
  },

  createPullRequest: async (options: CreatePrOptions) => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) {
      throw new Error('Not connected to provider');
    }

    const pr = await commands.integrationCreatePr(
      detectedProvider.owner,
      detectedProvider.repo,
      options
    );

    // Refresh PR list
    get().loadPullRequests();

    return pr;
  },

  mergePullRequest: async (number: number, options: MergePrOptions) => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) {
      throw new Error('Not connected to provider');
    }

    await commands.integrationMergePr(
      detectedProvider.owner,
      detectedProvider.repo,
      number,
      options
    );

    // Refresh PR list and clear selection
    set({ selectedPr: null });
    get().loadPullRequests();
  },

  setPrFilter: (state: PrState) => {
    set({ prFilter: state });
    get().loadPullRequests(state);
  },

  clearSelectedPr: () => set({ selectedPr: null }),
  clearPrView: () =>
    set({
      pullRequests: [],
      selectedPr: null,
      prsPage: 1,
      prsHasMore: false,
      prsTotalCount: 0,
      isLoadingPrs: false,
      isLoadingMorePrs: false,
    }),

  loadIssues: async (state?: IssueState) => {
    const { detectedProvider, connectionStatus, issueFilter } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    const filterState = state ?? issueFilter;
    set({ isLoadingIssues: true, issueFilter: filterState, issues: [], issuesPage: 1 });

    try {
      const result = await commands.integrationListIssues(
        detectedProvider.owner,
        detectedProvider.repo,
        filterState,
        1
      );
      set({
        issues: result.items,
        issuesPage: 1,
        issuesHasMore: result.hasMore,
        issuesTotalCount: result.totalCount,
        isLoadingIssues: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load issues:', error);
      set({ isLoadingIssues: false, error: `Failed to load issues: ${getErrorMessage(error)}` });
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
      const result = await commands.integrationListIssues(
        detectedProvider.owner,
        detectedProvider.repo,
        issueFilter,
        nextPage
      );
      set((state) => ({
        issues: [...state.issues, ...result.items],
        issuesPage: nextPage,
        issuesHasMore: result.hasMore,
        issuesTotalCount: result.totalCount,
        isLoadingMoreIssues: false,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to load more issues:', error);
      set({
        isLoadingMoreIssues: false,
        error: `Failed to load more issues: ${getErrorMessage(error)}`,
      });
    }
  },

  getIssue: async (number: number) => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    try {
      const issue = await commands.integrationGetIssue(
        detectedProvider.owner,
        detectedProvider.repo,
        number
      );
      set({ selectedIssue: issue, error: null });
    } catch (error) {
      console.error('Failed to get issue:', error);
      set({ error: `Failed to get issue: ${getErrorMessage(error)}` });
    }
  },

  createIssue: async (options: CreateIssueOptions) => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) {
      throw new Error('Not connected to provider');
    }

    const issue = await commands.integrationCreateIssue(
      detectedProvider.owner,
      detectedProvider.repo,
      options
    );

    // Refresh issue list
    get().loadIssues();

    return issue;
  },

  setIssueFilter: (state: IssueState) => {
    set({ issueFilter: state });
    get().loadIssues(state);
  },

  clearSelectedIssue: () => set({ selectedIssue: null }),
  clearIssueView: () =>
    set({
      issues: [],
      selectedIssue: null,
      issuesPage: 1,
      issuesHasMore: false,
      issuesTotalCount: 0,
      isLoadingIssues: false,
      isLoadingMoreIssues: false,
    }),

  loadCiRuns: async () => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) return;

    set({ isLoadingCiRuns: true, ciRuns: [], ciRunsPage: 1 });

    try {
      const result = await commands.integrationListCiRuns(
        detectedProvider.owner,
        detectedProvider.repo,
        1
      );
      set({
        ciRuns: result.runs,
        ciRunsPage: 1,
        ciRunsHasMore: result.hasMore,
        ciRunsTotalCount: result.totalCount,
        isLoadingCiRuns: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load CI runs:', error);
      set({ isLoadingCiRuns: false, error: `Failed to load CI runs: ${getErrorMessage(error)}` });
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
      const result = await commands.integrationListCiRuns(
        detectedProvider.owner,
        detectedProvider.repo,
        nextPage
      );
      set((state) => ({
        ciRuns: [...state.ciRuns, ...result.runs],
        ciRunsPage: nextPage,
        ciRunsHasMore: result.hasMore,
        ciRunsTotalCount: result.totalCount,
        isLoadingMoreCiRuns: false,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to load more CI runs:', error);
      set({
        isLoadingMoreCiRuns: false,
        error: `Failed to load more CI runs: ${getErrorMessage(error)}`,
      });
    }
  },

  clearCiView: () =>
    set({
      ciRuns: [],
      ciRunsPage: 1,
      ciRunsHasMore: false,
      ciRunsTotalCount: 0,
      isLoadingCiRuns: false,
      isLoadingMoreCiRuns: false,
    }),

  getCommitStatus: async (sha: string) => {
    const { detectedProvider, connectionStatus } = get();
    if (!detectedProvider || !connectionStatus?.connected) {
      throw new Error('Not connected to provider');
    }

    return await commands.integrationGetCommitStatus(
      detectedProvider.owner,
      detectedProvider.repo,
      sha
    );
  },

  loadNotifications: async (all = false) => {
    const { connectionStatus } = get();
    if (!connectionStatus?.connected) return;

    set({ isLoadingNotifications: true, notifications: [], notificationsPage: 1 });

    try {
      const [result, unreadCount] = await Promise.all([
        commands.integrationListNotifications(all, 1),
        commands.integrationGetUnreadCount(),
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
        error: `Failed to load notifications: ${getErrorMessage(error)}`,
      });
    }
  },

  loadMoreNotifications: async () => {
    const {
      connectionStatus,
      notificationsHasMore,
      isLoadingMoreNotifications,
      notificationsPage,
    } = get();
    if (!connectionStatus?.connected) return;
    if (!notificationsHasMore || isLoadingMoreNotifications) return;

    set({ isLoadingMoreNotifications: true });

    try {
      const nextPage = notificationsPage + 1;
      // Load unread only (all=false) for infinite scroll
      const result = await commands.integrationListNotifications(false, nextPage);
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
        error: `Failed to load more notifications: ${getErrorMessage(error)}`,
      });
    }
  },

  markNotificationRead: async (threadId: string) => {
    try {
      await commands.integrationMarkNotificationRead(threadId);
      // Update local state
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === threadId ? { ...n, unread: false } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      set({ error: `Failed to mark notification as read: ${getErrorMessage(error)}` });
    }
  },

  markAllNotificationsRead: async () => {
    try {
      await commands.integrationMarkAllNotificationsRead();
      // Update local state
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, unread: false })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      set({ error: `Failed to mark all notifications as read: ${getErrorMessage(error)}` });
    }
  },

  clearNotificationsView: () =>
    set({
      notifications: [],
      notificationsPage: 1,
      notificationsHasMore: false,
      isLoadingNotifications: false,
      isLoadingMoreNotifications: false,
    }),

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
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
