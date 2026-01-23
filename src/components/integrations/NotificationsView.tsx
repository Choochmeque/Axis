import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, CheckCheck } from 'lucide-react';

import { Button } from '@/components/ui';
import { useIntegrationStore } from '@/store/integrationStore';
import { NotificationList } from './NotificationList';

export function NotificationsView() {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    notificationFilter,
    notificationsHasMore,
    isLoadingNotifications,
    isLoadingMoreNotifications,
    connectionStatus,
    loadNotifications,
    loadMoreNotifications,
    markAllNotificationsRead,
    setNotificationFilter,
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
          <p>{t('integrations.notConnected.message')}</p>
          <p className="mt-2 text-sm">{t('integrations.notConnected.notificationsHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-(--border-color) bg-(--bg-primary)">
        <span className="text-sm font-medium text-(--text-primary)">
          {t('integrations.notifications.title')}
        </span>

        {unreadCount > 0 && (
          <span className="badge bg-(--accent-color) text-white">
            {t('integrations.notifications.unread', { count: unreadCount })}
          </span>
        )}

        <div className="flex items-center gap-1 ml-4">
          <button
            className={`px-2 py-1 text-xs rounded ${
              !notificationFilter
                ? 'bg-(--accent-color) text-white'
                : 'bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-hover)'
            }`}
            onClick={() => setNotificationFilter(false)}
          >
            {t('integrations.notifications.filterUnread')}
          </button>
          <button
            className={`px-2 py-1 text-xs rounded ${
              notificationFilter
                ? 'bg-(--accent-color) text-white'
                : 'bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-hover)'
            }`}
            onClick={() => setNotificationFilter(true)}
          >
            {t('integrations.notifications.filterAll')}
          </button>
        </div>

        <div className="flex-1" />

        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            title={t('integrations.notifications.markAllRead')}
          >
            <CheckCheck size={14} />
            <span>{t('integrations.notifications.markAllRead')}</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoadingNotifications}
          title={t('integrations.common.refresh')}
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
