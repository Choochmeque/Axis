import { useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  Loader2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/dateUtils';
import { shellApi } from '@/services/api';
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
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  // Infinite scroll detection
  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom < 200 && hasMore && !isLoadingMore && !isLoading) {
        onLoadMore();
      }
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, isLoading, onLoadMore]);

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

  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-(--text-muted) text-sm">{t('integrations.notifications.loading')}</div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-(--text-muted) text-sm">
          {t('integrations.notifications.noNotifications')}
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize() + (isLoadingMore ? 40 : 0)}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const notification = notifications[virtualRow.index];

          return (
            <div
              key={notification.id}
              className={cn(
                'absolute top-0 left-0 w-full px-3 py-2 border-b border-(--border-color) cursor-pointer',
                'hover:bg-(--bg-hover) transition-colors',
                notification.unread && 'bg-(--bg-tertiary)/50'
              )}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onClick={() => handleClick(notification)}
            >
              <div className="flex items-start gap-3">
                {notification.unread && (
                  <div className="mt-2 w-2 h-2 rounded-full bg-(--accent-color)" />
                )}
                {!notification.unread && <div className="w-2" />}

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
                    title={t('integrations.notifications.openInBrowser')}
                  >
                    <ExternalLink size={14} className="text-(--text-muted)" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div
            className="absolute left-0 w-full flex items-center justify-center py-3"
            style={{ top: `${virtualizer.getTotalSize()}px` }}
          >
            <Loader2 size={16} className="animate-spin text-(--text-muted)" />
            <span className="ml-2 text-sm text-(--text-muted)">
              {t('integrations.notifications.loadingMore')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
