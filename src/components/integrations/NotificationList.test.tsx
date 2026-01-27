import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationList } from './NotificationList';
import type { Notification } from '@/bindings/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/dateUtils', () => ({
  formatRelativeTime: (date: string) => `relative-${date}`,
}));

const mockMarkNotificationRead = vi.fn();
const mockOpenUrl = vi.fn();

vi.mock('@/services/api', () => ({
  shellApi: {
    openUrl: (url: string) => mockOpenUrl(url),
  },
}));

vi.mock('@/store/integrationStore', () => ({
  useIntegrationStore: () => ({
    markNotificationRead: mockMarkNotificationRead,
  }),
}));

vi.mock('@/components/ui', () => ({
  VirtualList: ({
    items,
    children,
    isLoading,
    emptyMessage,
    onItemClick,
  }: {
    items: unknown[];
    children: (item: unknown) => React.ReactNode;
    isLoading: boolean;
    emptyMessage: string;
    onItemClick?: (item: unknown) => void;
  }) => {
    if (isLoading) return <div data-testid="loading">Loading...</div>;
    if (items.length === 0) return <div data-testid="empty">{emptyMessage}</div>;
    return (
      <div data-testid="notification-list">
        {items.map((item, i) => (
          <div key={i} data-testid="notification-item" onClick={() => onItemClick?.(item)}>
            {children(item)}
          </div>
        ))}
      </div>
    );
  },
}));

describe('NotificationList', () => {
  const mockNotifications: Notification[] = [
    {
      id: '1',
      provider: 'GitHub',
      subjectTitle: 'Fix bug in authentication',
      subjectType: 'PullRequest',
      subjectUrl: 'https://github.com/test/repo/pull/1',
      url: 'https://api.github.com/notifications/1',
      repository: 'test/repo',
      reason: 'ReviewRequested',
      unread: true,
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      provider: 'GitHub',
      subjectTitle: 'Add new feature',
      subjectType: 'Issue',
      subjectUrl: 'https://github.com/test/repo/issues/2',
      url: 'https://api.github.com/notifications/2',
      repository: 'test/repo',
      reason: 'Assigned',
      unread: false,
      updatedAt: '2024-01-14T10:00:00Z',
    },
  ];

  const defaultProps = {
    notifications: mockNotifications,
    isLoading: false,
    hasMore: false,
    isLoadingMore: false,
    onLoadMore: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    render(<NotificationList {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should render empty state', () => {
    render(<NotificationList {...defaultProps} notifications={[]} />);

    expect(screen.getByTestId('empty')).toBeInTheDocument();
    expect(screen.getByText('integrations.notifications.noNotifications')).toBeInTheDocument();
  });

  it('should render notification items', () => {
    render(<NotificationList {...defaultProps} />);

    const items = screen.getAllByTestId('notification-item');
    expect(items).toHaveLength(2);
  });

  it('should display notification titles', () => {
    render(<NotificationList {...defaultProps} />);

    expect(screen.getByText('Fix bug in authentication')).toBeInTheDocument();
    expect(screen.getByText('Add new feature')).toBeInTheDocument();
  });

  it('should display repository names', () => {
    render(<NotificationList {...defaultProps} />);

    const repoNames = screen.getAllByText('test/repo');
    expect(repoNames).toHaveLength(2);
  });

  it('should display relative times', () => {
    render(<NotificationList {...defaultProps} />);

    expect(screen.getByText('relative-2024-01-15T10:00:00Z')).toBeInTheDocument();
    expect(screen.getByText('relative-2024-01-14T10:00:00Z')).toBeInTheDocument();
  });

  it('should display reason text', () => {
    render(<NotificationList {...defaultProps} />);

    // The component returns the reason as-is if it doesn't match predefined cases
    expect(screen.getByText('ReviewRequested')).toBeInTheDocument();
    expect(screen.getByText('Assigned')).toBeInTheDocument();
  });

  it('should mark notification as read and open URL on click', async () => {
    mockMarkNotificationRead.mockResolvedValue(undefined);
    render(<NotificationList {...defaultProps} />);

    const items = screen.getAllByTestId('notification-item');
    fireEvent.click(items[0]);

    // The markNotificationRead should be called for unread notifications
    expect(mockMarkNotificationRead).toHaveBeenCalledWith('1');
  });

  it('should not mark already read notification', async () => {
    render(<NotificationList {...defaultProps} />);

    const items = screen.getAllByTestId('notification-item');
    fireEvent.click(items[1]); // Second notification is already read

    expect(mockMarkNotificationRead).not.toHaveBeenCalled();
  });

  it('should open URL on click', async () => {
    mockMarkNotificationRead.mockResolvedValue(undefined);
    render(<NotificationList {...defaultProps} />);

    const items = screen.getAllByTestId('notification-item');
    fireEvent.click(items[1]); // Click on read notification to test URL opening

    expect(mockOpenUrl).toHaveBeenCalledWith('https://github.com/test/repo/issues/2');
  });

  it('should show unread indicator for unread notifications', () => {
    render(<NotificationList {...defaultProps} />);

    // First notification is unread, should have indicator
    const items = screen.getAllByTestId('notification-item');
    const firstItem = items[0];
    const unreadIndicator = firstItem.querySelector('.bg-\\(--accent-color\\)');
    expect(unreadIndicator).toBeInTheDocument();
  });
});
