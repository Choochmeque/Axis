import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleDot, CheckCircle2, Clock, User } from 'lucide-react';

import { formatRelativeTime } from '@/lib/dateUtils';
import { getLabelColors } from '@/lib/utils';
import { VirtualList } from '@/components/ui';
import type { SelectionKey } from '@/hooks';
import type { Issue, IssueDetail } from '@/bindings/api';

interface IssueListProps {
  issues: Issue[];
  selectedIssue: IssueDetail | null;
  isLoading: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onSelect: (issue: Issue | null) => void;
  onLoadMore?: () => void;
}

export function IssueList({
  issues,
  selectedIssue,
  isLoading,
  hasMore = false,
  isLoadingMore = false,
  onSelect,
  onLoadMore,
}: IssueListProps) {
  const { t } = useTranslation();

  const selectedKeys = useMemo(
    () => (selectedIssue ? new Set<SelectionKey>([selectedIssue.number]) : new Set<SelectionKey>()),
    [selectedIssue]
  );

  const getStateIcon = useCallback((state: string) => {
    switch (state) {
      case 'open':
        return <CircleDot size={16} className="text-success" />;
      case 'closed':
        return <CheckCircle2 size={16} className="text-purple-500" />;
      default:
        return <CircleDot size={16} className="text-(--text-muted)" />;
    }
  }, []);

  return (
    <VirtualList
      items={issues}
      getItemKey={(issue) => issue.number}
      itemHeight={72}
      isLoading={isLoading}
      loadingMessage={t('integrations.issues.loading')}
      emptyMessage={t('integrations.issues.noIssues')}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={onLoadMore}
      loadingMoreMessage={t('integrations.issues.loadingMore')}
      selectionMode="single"
      selectedKeys={selectedKeys}
      onSelectionChange={(keys) => {
        if (keys.size === 0) {
          onSelect(null);
          return;
        }
        const key = keys.values().next().value;
        const issue = issues.find((i) => i.number === key);
        if (issue) onSelect(issue);
      }}
    >
      {(issue) => (
        <>
          <div className="mt-0.5">{getStateIcon(issue.state)}</div>

          <div className="flex-1 min-w-0">
            <div className="font-medium text-(--text-primary) truncate">{issue.title}</div>

            <div className="flex items-center gap-3 mt-1 text-xs text-(--text-secondary)">
              <span className="text-(--text-muted)">#{issue.number}</span>
              <span className="flex items-center gap-1">
                <User size={12} />
                {issue.author.login}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatRelativeTime(issue.createdAt)}
              </span>
            </div>

            {issue.labels.length > 0 && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {issue.labels.slice(0, 3).map((label) => (
                  <span
                    key={label.name}
                    className="px-1.5 py-0.5 text-xs rounded"
                    style={getLabelColors(label.color)}
                  >
                    {label.name}
                  </span>
                ))}
                {issue.labels.length > 3 && (
                  <span className="text-xs text-(--text-muted)">+{issue.labels.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </VirtualList>
  );
}
