import { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { GitPullRequest, GitMerge, XCircle, Clock, User, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/dateUtils';
import type { PullRequest, PullRequestDetail } from '@/bindings/api';

interface PullRequestListProps {
  pullRequests: PullRequest[];
  selectedPr: PullRequestDetail | null;
  isLoading: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onSelect: (pr: PullRequest) => void;
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
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: pullRequests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated row height
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
        return <GitPullRequest size={16} className="text-success" />;
      case 'merged':
        return <GitMerge size={16} className="text-purple-500" />;
      case 'closed':
        return <XCircle size={16} className="text-error" />;
      default:
        return <GitPullRequest size={16} className="text-(--text-muted)" />;
    }
  }, []);

  if (isLoading && pullRequests.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-(--text-muted) text-sm">Loading pull requests...</div>
      </div>
    );
  }

  if (pullRequests.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-(--text-muted) text-sm">No pull requests found</div>
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
          const pr = pullRequests[virtualRow.index];
          const isSelected = selectedPr?.number === pr.number;

          return (
            <div
              key={pr.number}
              className={cn(
                'absolute top-0 left-0 w-full px-3 py-2 border-b border-(--border-color) cursor-pointer',
                'hover:bg-(--bg-hover) transition-colors',
                isSelected && 'bg-(--bg-tertiary)'
              )}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onClick={() => onSelect(pr)}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{getStateIcon(pr.state)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-(--text-primary) truncate">{pr.title}</span>
                    {pr.draft && (
                      <span className="px-1.5 py-0.5 text-xs bg-(--bg-tertiary) text-(--text-muted) rounded">
                        Draft
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
