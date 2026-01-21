import { useCallback, useEffect } from 'react';
import { RefreshCw, CheckCheck } from 'lucide-react';

import { Button } from '@/components/ui';
import { useIntegrationStore } from '@/store/integrationStore';
import { NotificationList } from './NotificationList';

export function NotificationsView() {
  const {
    notifications,
    unreadCount,
    notificationsHasMore,
    isLoadingNotifications,
    isLoadingMoreNotifications,
    connectionStatus,
    loadNotifications,
    loadMoreNotifications,
    markAllNotificationsRead,
  } = useIntegrationStore();

  // Load notifications on mount (clearing is done in Sidebar click handler)
  useEffect(() => {
    const state = useIntegrationStore.getState();
    if (state.connectionStatus?.connected && state.detectedProvider) {
      state.loadNotifications();
    }
  }, []);

  const handleRefresh = useCallback(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleLoadMore = useCallback(() => {
    loadMoreNotifications();
  }, [loadMoreNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead();
  }, [markAllNotificationsRead]);

  if (!connectionStatus?.connected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-(--text-muted)">
          <p>Not connected to provider.</p>
          <p className="mt-2 text-sm">Connect in Settings to view notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-(--border-color) bg-(--bg-primary)">
        <span className="text-sm font-medium text-(--text-primary)">Notifications</span>

        {unreadCount > 0 && (
          <span className="badge bg-(--accent-color) text-white">{unreadCount} unread</span>
        )}

        <div className="flex-1" />

        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} title="Mark all as read">
            <CheckCheck size={14} />
            <span>Mark all read</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoadingNotifications}
          title="Refresh"
        >
          <RefreshCw size={14} className={isLoadingNotifications ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <NotificationList
          notifications={notifications}
          isLoading={isLoadingNotifications}
          hasMore={notificationsHasMore}
          isLoadingMore={isLoadingMoreNotifications}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );
}
