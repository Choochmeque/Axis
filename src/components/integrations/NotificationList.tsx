import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GitPullRequest,
  CircleDot,
  Tag,
  MessageSquare,
  GitCommit,
  Shield,
  Play,
  ExternalLink,
  Circle,
} from 'lucide-react';

import { formatRelativeTime } from '@/lib/dateUtils';
import { shellApi } from '@/services/api';
import { VirtualList } from '@/components/ui';
import { useIntegrationStore } from '@/store/integrationStore';
import type { Notification } from '@/bindings/api';

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export function NotificationList({
  notifications,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: NotificationListProps) {
  const { t } = useTranslation();
  const { markNotificationRead } = useIntegrationStore();

  const getSubjectIcon = useCallback((subjectType: string) => {
    switch (subjectType) {
      case 'PullRequest':
        return <GitPullRequest size={16} className="text-(--text-secondary)" />;
      case 'Issue':
        return <CircleDot size={16} className="text-(--text-secondary)" />;
      case 'Release':
        return <Tag size={16} className="text-(--text-secondary)" />;
      case 'Discussion':
        return <MessageSquare size={16} className="text-(--text-secondary)" />;
      case 'Commit':
        return <GitCommit size={16} className="text-(--text-secondary)" />;
      case 'RepositoryVulnerabilityAlert':
        return <Shield size={16} className="text-warning" />;
      case 'CheckSuite':
        return <Play size={16} className="text-(--text-secondary)" />;
      default:
        return <Circle size={16} className="text-(--text-secondary)" />;
    }
  }, []);

  const getReasonText = useCallback(
    (reason: string) => {
      switch (reason) {
        case 'assigned':
          return t('integrations.notifications.reasons.assigned');
        case 'author':
          return t('integrations.notifications.reasons.author');
        case 'comment':
          return t('integrations.notifications.reasons.comment');
        case 'invitation':
          return t('integrations.notifications.reasons.invitation');
        case 'manual':
          return t('integrations.notifications.reasons.manual');
        case 'mention':
          return t('integrations.notifications.reasons.mention');
        case 'review_requested':
          return t('integrations.notifications.reasons.reviewRequested');
        case 'security_alert':
          return t('integrations.notifications.reasons.securityAlert');
        case 'state_change':
          return t('integrations.notifications.reasons.stateChange');
        case 'subscribed':
          return t('integrations.notifications.reasons.subscribed');
        case 'team_mention':
          return t('integrations.notifications.reasons.teamMention');
        case 'ci_activity':
          return t('integrations.notifications.reasons.ciActivity');
        default:
          return reason;
      }
    },
    [t]
  );

  const handleClick = useCallback(
    async (notification: Notification) => {
      if (notification.unread) {
        await markNotificationRead(notification.id);
      }
      if (notification.subjectUrl) {
        shellApi.openUrl(notification.subjectUrl);
      } else if (notification.url) {
        shellApi.openUrl(notification.url);
      }
    },
    [markNotificationRead]
  );

  const openInBrowser = useCallback((url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    shellApi.openUrl(url);
  }, []);

  return (
    <VirtualList
      items={notifications}
      getItemKey={(n) => n.id}
      itemHeight={72}
      isLoading={isLoading}
      loadingMessage={t('integrations.notifications.loading')}
      emptyMessage={t('integrations.notifications.noNotifications')}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={onLoadMore}
      loadingMoreMessage={t('integrations.notifications.loadingMore')}
      onItemClick={handleClick}
      itemClassName={(n) => (n.unread ? 'bg-(--bg-tertiary)/50' : '')}
    >
      {(notification) => (
        <>
          {notification.unread && (
            <div className="mt-2 w-2 h-2 rounded-full bg-(--accent-color) shrink-0" />
          )}
          {!notification.unread && <div className="w-2 shrink-0" />}

          <div className="mt-0.5">{getSubjectIcon(notification.subjectType)}</div>

          <div className="flex-1 min-w-0">
            <div className="font-medium text-(--text-primary) truncate">
              {notification.subjectTitle}
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-(--text-secondary)">
              <span className="text-(--text-muted)">{notification.repository}</span>
              <span>•</span>
              <span>{getReasonText(notification.reason)}</span>
              <span>•</span>
              <span>{formatRelativeTime(notification.updatedAt)}</span>
            </div>
          </div>

          {notification.url && (
            <button
              className="p-1 hover:bg-(--bg-tertiary) rounded"
              onClick={(e) => openInBrowser(notification.url, e)}
              title={t('common.openInBrowser')}
            >
              <ExternalLink size={14} className="text-(--text-muted)" />
            </button>
          )}
        </>
      )}
    </VirtualList>
  );
}
