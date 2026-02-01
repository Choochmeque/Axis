import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GitPullRequest, GitMerge, XCircle, Clock, User } from 'lucide-react';

import { formatRelativeTime } from '@/lib/dateUtils';
import { VirtualList } from '@/components/ui';
import type { SelectionKey } from '@/hooks';
import type { PullRequest, PullRequestDetail } from '@/bindings/api';

interface PullRequestListProps {
  pullRequests: PullRequest[];
  selectedPr: PullRequestDetail | null;
  isLoading: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onSelect: (pr: PullRequest | null) => void;
  onLoadMore?: () => void;
}

export function PullRequestList({
  pullRequests,
  selectedPr,
  isLoading,
  hasMore = false,
  isLoadingMore = false,
  onSelect,
  onLoadMore,
}: PullRequestListProps) {
  const { t } = useTranslation();

  const selectedKeys = useMemo(
    () => (selectedPr ? new Set<SelectionKey>([selectedPr.number]) : new Set<SelectionKey>()),
    [selectedPr]
  );

  const getStateIcon = useCallback((state: string) => {
    switch (state) {
      case 'open':
        return <GitPullRequest size={16} className="text-success" />;
      case 'merged':
        return <GitMerge size={16} className="text-purple-500" />;
      case 'closed':
        return <XCircle size={16} className="text-error" />;
      default:
        return <GitPullRequest size={16} className="text-(--text-muted)" />;
    }
  }, []);

  return (
    <VirtualList
      items={pullRequests}
      getItemKey={(pr) => pr.number}
      itemHeight={72}
      isLoading={isLoading}
      loadingMessage={t('integrations.pullRequests.loading')}
      emptyMessage={t('integrations.pullRequests.noPullRequests')}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={onLoadMore}
      loadingMoreMessage={t('integrations.pullRequests.loadingMore')}
      selectionMode="single"
      selectedKeys={selectedKeys}
      onSelectionChange={(keys) => {
        if (keys.size === 0) {
          onSelect(null);
          return;
        }
        const key = keys.values().next().value;
        const pr = pullRequests.find((p) => p.number === key);
        if (pr) onSelect(pr);
      }}
    >
      {(pr) => (
        <>
          <div className="mt-0.5">{getStateIcon(pr.state)}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-(--text-primary) truncate">{pr.title}</span>
              {pr.draft && (
                <span className="px-1.5 py-0.5 text-xs bg-(--bg-tertiary) text-(--text-muted) rounded">
                  {t('integrations.pullRequests.draft')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-(--text-secondary)">
              <span className="text-(--text-muted)">#{pr.number}</span>
              <span className="flex items-center gap-1">
                <User size={12} />
                {pr.author.login}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatRelativeTime(pr.createdAt)}
              </span>
            </div>

            <div className="mt-1 text-xs text-(--text-muted) truncate">
              {pr.sourceBranch} → {pr.targetBranch}
            </div>
          </div>
        </>
      )}
    </VirtualList>
  );
}
