import { useRef, useCallback, useEffect } from 'react';
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

  const getReasonText = useCallback((reason: string) => {
    switch (reason) {
      case 'assigned':
        return 'You were assigned';
      case 'author':
        return 'You created this';
      case 'comment':
        return 'Someone commented';
      case 'invitation':
        return 'You were invited';
      case 'manual':
        return 'You subscribed';
      case 'mention':
        return 'You were mentioned';
      case 'review_requested':
        return 'Review requested';
      case 'security_alert':
        return 'Security alert';
      case 'state_change':
        return 'State changed';
      case 'subscribed':
        return "You're watching";
      case 'team_mention':
        return 'Your team was mentioned';
      case 'ci_activity':
        return 'CI activity';
      default:
        return reason;
    }
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, []);

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
        <div className="text-(--text-muted) text-sm">Loading notifications...</div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-(--text-muted) text-sm">No notifications</div>
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
                    <span>{formatDate(notification.updatedAt)}</span>
                  </div>
                </div>

                {notification.url && (
                  <button
                    className="p-1 hover:bg-(--bg-tertiary) rounded"
                    onClick={(e) => openInBrowser(notification.url, e)}
                    title="Open in browser"
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
            <span className="ml-2 text-sm text-(--text-muted)">Loading more...</span>
          </div>
        )}
      </div>
    </div>
  );
}
