import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DetectedProvider, IntegrationStatus, Notification } from '@/types';
import { NotificationsView } from './NotificationsView';

// Mock stores
const mockLoadNotifications = vi.fn();
const mockReloadNotifications = vi.fn();
const mockLoadMoreNotifications = vi.fn();
const mockMarkAllNotificationsRead = vi.fn();
const mockSetNotificationFilter = vi.fn();

type MockIntegrationState = {
  notifications: Notification[];
  unreadCount: number;
  notificationFilter: boolean;
  notificationsHasMore: boolean;
  isLoadingNotifications: boolean;
  isLoadingMoreNotifications: boolean;
  connectionStatus: IntegrationStatus | null;
  detectedProvider: DetectedProvider | null;
  loadNotifications: typeof mockLoadNotifications;
  reloadNotifications: typeof mockReloadNotifications;
  loadMoreNotifications: typeof mockLoadMoreNotifications;
  markAllNotificationsRead: typeof mockMarkAllNotificationsRead;
  setNotificationFilter: typeof mockSetNotificationFilter;
};

let mockStoreState: MockIntegrationState = {
  notifications: [],
  unreadCount: 0,
  notificationFilter: false,
  notificationsHasMore: false,
  isLoadingNotifications: false,
  isLoadingMoreNotifications: false,
  connectionStatus: {
    provider: 'GitHub',
    connected: true,
    username: null,
    avatarUrl: null,
  },
  detectedProvider: { provider: 'GitHub', owner: 'acme', repo: 'repo' },
  loadNotifications: mockLoadNotifications,
  reloadNotifications: mockReloadNotifications,
  loadMoreNotifications: mockLoadMoreNotifications,
  markAllNotificationsRead: mockMarkAllNotificationsRead,
  setNotificationFilter: mockSetNotificationFilter,
};

vi.mock('@/store/integrationStore', () => ({
  useIntegrationStore: Object.assign(() => mockStoreState, {
    getState: () => mockStoreState,
  }),
}));

// Mock child components
vi.mock('./NotificationList', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NotificationList: ({ notifications, isLoading }: any) => (
    <div data-testid="notification-list">
      {isLoading ? 'Loading...' : `${notifications.length} notifications`}
    </div>
  ),
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.count !== undefined) {
        return `${key} (${params.count})`;
      }
      return key;
    },
  }),
}));

// Mock UI components
vi.mock('@/components/ui', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, disabled, title }: any) => (
    <button onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  ),
}));

describe('NotificationsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      notifications: [],
      unreadCount: 0,
      notificationFilter: false,
      notificationsHasMore: false,
      isLoadingNotifications: false,
      isLoadingMoreNotifications: false,
      connectionStatus: {
        provider: 'GitHub',
        connected: true,
        username: null,
        avatarUrl: null,
      },
      detectedProvider: { provider: 'GitHub', owner: 'acme', repo: 'repo' },
      loadNotifications: mockLoadNotifications,
      reloadNotifications: mockReloadNotifications,
      loadMoreNotifications: mockLoadMoreNotifications,
      markAllNotificationsRead: mockMarkAllNotificationsRead,
      setNotificationFilter: mockSetNotificationFilter,
    };
  });

  it('should show not connected message when not connected', () => {
    mockStoreState.connectionStatus = {
      provider: 'GitHub',
      connected: false,
      username: null,
      avatarUrl: null,
    };

    render(<NotificationsView />);

    expect(screen.getByText('integrations.notConnected.message')).toBeInTheDocument();
    expect(screen.getByText('integrations.notConnected.notificationsHint')).toBeInTheDocument();
  });

  it('should render notifications view when connected', () => {
    render(<NotificationsView />);

    expect(screen.getByText('integrations.notifications.title')).toBeInTheDocument();
    expect(screen.getByTestId('notification-list')).toBeInTheDocument();
  });

  it('should show filter buttons', () => {
    render(<NotificationsView />);

    expect(screen.getByText('integrations.notifications.filterUnread')).toBeInTheDocument();
    expect(screen.getByText('integrations.notifications.filterAll')).toBeInTheDocument();
  });

  it('should change filter when filter button is clicked', () => {
    render(<NotificationsView />);

    fireEvent.click(screen.getByText('integrations.notifications.filterAll'));

    expect(mockSetNotificationFilter).toHaveBeenCalledWith(true);
  });

  it('should call reloadNotifications when refresh is clicked', () => {
    render(<NotificationsView />);

    fireEvent.click(screen.getByTitle('integrations.common.refresh'));

    expect(mockReloadNotifications).toHaveBeenCalled();
  });

  it('should show unread count badge when there are unread notifications', () => {
    mockStoreState.unreadCount = 5;

    render(<NotificationsView />);

    expect(screen.getByText('integrations.notifications.unread (5)')).toBeInTheDocument();
  });

  it('should show mark all read button when there are unread notifications', () => {
    mockStoreState.unreadCount = 5;

    render(<NotificationsView />);

    expect(screen.getByTitle('integrations.notifications.markAllRead')).toBeInTheDocument();
  });

  it('should not show mark all read button when no unread notifications', () => {
    mockStoreState.unreadCount = 0;

    render(<NotificationsView />);

    expect(screen.queryByTitle('integrations.notifications.markAllRead')).not.toBeInTheDocument();
  });

  it('should call markAllNotificationsRead when mark all read is clicked', () => {
    mockStoreState.unreadCount = 5;

    render(<NotificationsView />);

    fireEvent.click(screen.getByTitle('integrations.notifications.markAllRead'));

    expect(mockMarkAllNotificationsRead).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    mockStoreState.isLoadingNotifications = true;

    render(<NotificationsView />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should disable refresh button when loading', () => {
    mockStoreState.isLoadingNotifications = true;

    render(<NotificationsView />);

    expect(screen.getByTitle('integrations.common.refresh')).toBeDisabled();
  });

  it('should display notifications count', () => {
    mockStoreState.notifications = [
      {
        provider: 'GitHub',
        id: '1',
        reason: 'Subscribed',
        unread: false,
        subjectTitle: 'Issue #1',
        subjectType: 'Issue',
        subjectUrl: 'https://example.com/issue/1',
        repository: 'acme/repo',
        updatedAt: new Date().toISOString(),
        url: 'https://example.com/notifications/1',
      },
      {
        provider: 'GitHub',
        id: '2',
        reason: 'Mention',
        unread: true,
        subjectTitle: 'PR #2',
        subjectType: 'PullRequest',
        subjectUrl: 'https://example.com/pr/2',
        repository: 'acme/repo',
        updatedAt: new Date().toISOString(),
        url: 'https://example.com/notifications/2',
      },
    ];

    render(<NotificationsView />);

    expect(screen.getByText('2 notifications')).toBeInTheDocument();
  });
});
