import { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  MinusCircle,
  AlertCircle,
  ExternalLink,
  GitBranch,
  GitCommit,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { shellApi } from '@/services/api';
import type { CIRun } from '@/bindings/api';

interface CIRunListProps {
  ciRuns: CIRun[];
  isLoading: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export function CIRunList({
  ciRuns,
  isLoading,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: CIRunListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: ciRuns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
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

  const getStatusIcon = useCallback((status: string, conclusion: string | null) => {
    if (status === 'queued') {
      return <Clock size={16} className="text-(--text-muted)" />;
    }
    if (status === 'inprogress') {
      return <Loader2 size={16} className="text-warning animate-spin" />;
    }
    // completed
    switch (conclusion) {
      case 'success':
        return <CheckCircle2 size={16} className="text-success" />;
      case 'failure':
        return <XCircle size={16} className="text-error" />;
      case 'cancelled':
        return <MinusCircle size={16} className="text-(--text-muted)" />;
      case 'skipped':
        return <MinusCircle size={16} className="text-(--text-muted)" />;
      case 'neutral':
        return <MinusCircle size={16} className="text-(--text-secondary)" />;
      case 'timedout':
        return <AlertCircle size={16} className="text-warning" />;
      case 'actionrequired':
        return <AlertCircle size={16} className="text-warning" />;
      default:
        return <Clock size={16} className="text-(--text-muted)" />;
    }
  }, []);

  const getStatusText = useCallback((status: string, conclusion: string | null) => {
    if (status === 'queued') return 'Queued';
    if (status === 'inprogress') return 'In Progress';
    if (conclusion) {
      return conclusion.charAt(0).toUpperCase() + conclusion.slice(1);
    }
    return 'Completed';
  }, []);

  const getStatusColor = useCallback((status: string, conclusion: string | null) => {
    if (status === 'queued') return 'text-(--text-muted)';
    if (status === 'inprogress') return 'text-warning';
    switch (conclusion) {
      case 'success':
        return 'text-success';
      case 'failure':
        return 'text-error';
      default:
        return 'text-(--text-muted)';
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

  const openInBrowser = useCallback((url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    shellApi.openUrl(url);
  }, []);

  if (isLoading && ciRuns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-(--text-muted) text-sm">Loading CI runs...</div>
      </div>
    );
  }

  if (ciRuns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-(--text-muted) text-sm">No CI runs found</div>
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
          const run = ciRuns[virtualRow.index];

          return (
            <div
              key={run.id}
              className={cn(
                'absolute top-0 left-0 w-full px-3 py-2 border-b border-(--border-color)',
                'hover:bg-(--bg-hover) transition-colors'
              )}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getStatusIcon(run.status, run.conclusion)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-(--text-primary) truncate">{run.name}</span>
                    <span className={cn('text-xs', getStatusColor(run.status, run.conclusion))}>
                      {getStatusText(run.status, run.conclusion)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-(--text-secondary)">
                    <span className="flex items-center gap-1">
                      <GitCommit size={12} />
                      {run.commitSha.substring(0, 7)}
                    </span>
                    {run.branch && (
                      <span className="flex items-center gap-1">
                        <GitBranch size={12} />
                        {run.branch}
                      </span>
                    )}
                    <span className="text-(--text-muted)">{run.event}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-(--text-muted)">
                    <span>Started {formatDate(run.createdAt)}</span>
                    {run.status === 'completed' && (
                      <span>Finished {formatDate(run.updatedAt)}</span>
                    )}
                  </div>
                </div>

                <button
                  className="p-1 hover:bg-(--bg-tertiary) rounded"
                  onClick={(e) => openInBrowser(run.url, e)}
                  title="Open in browser"
                >
                  <ExternalLink size={14} className="text-(--text-muted)" />
                </button>
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
