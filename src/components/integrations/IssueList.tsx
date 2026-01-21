import { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CircleDot, CheckCircle2, Clock, User, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/dateUtils';
import type { Issue, IssueDetail } from '@/bindings/api';

interface IssueListProps {
  issues: Issue[];
  selectedIssue: IssueDetail | null;
  isLoading: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onSelect: (issue: Issue) => void;
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
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: issues.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  // Infinite scroll: load more when scrolling near the bottom
  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement || !onLoadMore || !hasMore || isLoadingMore) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      // Load more when within 200px of bottom
      if (scrollHeight - scrollTop - clientHeight < 200) {
        onLoadMore();
      }
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, onLoadMore]);

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

  if (isLoading && issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-(--text-muted) text-sm">Loading issues...</div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-(--text-muted) text-sm">No issues found</div>
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
          const issue = issues[virtualRow.index];
          const isSelected = selectedIssue?.number === issue.number;

          return (
            <div
              key={issue.number}
              className={cn(
                'absolute top-0 left-0 w-full px-3 py-2 border-b border-(--border-color) cursor-pointer',
                'hover:bg-(--bg-hover) transition-colors',
                isSelected && 'bg-(--bg-tertiary)'
              )}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onClick={() => onSelect(issue)}
            >
              <div className="flex items-start gap-2">
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
                          style={{
                            backgroundColor: `#${label.color}20`,
                            color: `#${label.color}`,
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {issue.labels.length > 3 && (
                        <span className="text-xs text-(--text-muted)">
                          +{issue.labels.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
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
