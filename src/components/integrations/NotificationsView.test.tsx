import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationsView } from './NotificationsView';

// Mock stores
const mockLoadNotifications = vi.fn();
const mockReloadNotifications = vi.fn();
const mockLoadMoreNotifications = vi.fn();
const mockMarkAllNotificationsRead = vi.fn();
const mockSetNotificationFilter = vi.fn();

let mockStoreState = {
  notifications: [],
  unreadCount: 0,
  notificationFilter: false,
  notificationsHasMore: false,
  isLoadingNotifications: false,
  isLoadingMoreNotifications: false,
  connectionStatus: { connected: true },
  detectedProvider: 'GitHub',
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
      connectionStatus: { connected: true },
      detectedProvider: 'GitHub',
      loadNotifications: mockLoadNotifications,
      reloadNotifications: mockReloadNotifications,
      loadMoreNotifications: mockLoadMoreNotifications,
      markAllNotificationsRead: mockMarkAllNotificationsRead,
      setNotificationFilter: mockSetNotificationFilter,
    };
  });

  it('should show not connected message when not connected', () => {
    mockStoreState.connectionStatus = { connected: false };

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
    mockStoreState.notifications = [{ id: 1 }, { id: 2 }];

    render(<NotificationsView />);

    expect(screen.getByText('2 notifications')).toBeInTheDocument();
  });
});
