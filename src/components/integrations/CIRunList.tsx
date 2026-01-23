import { useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatRelativeTime } from '@/lib/dateUtils';
import { shellApi } from '@/services/api';
import { CIRunStatus, CIConclusion } from '@/types';
import type { CIRun } from '@/types';

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
  const { t } = useTranslation();
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
    if (status === CIRunStatus.Queued) {
      return <Clock size={16} className="text-(--text-muted)" />;
    }
    if (status === CIRunStatus.InProgress) {
      return <Loader2 size={16} className="text-warning animate-spin" />;
    }
    // completed
    switch (conclusion) {
      case CIConclusion.Success:
        return <CheckCircle2 size={16} className="text-success" />;
      case CIConclusion.Failure:
        return <XCircle size={16} className="text-error" />;
      case CIConclusion.Cancelled:
        return <MinusCircle size={16} className="text-(--text-muted)" />;
      case CIConclusion.Skipped:
        return <MinusCircle size={16} className="text-(--text-muted)" />;
      case CIConclusion.Neutral:
        return <MinusCircle size={16} className="text-(--text-secondary)" />;
      case CIConclusion.TimedOut:
        return <AlertCircle size={16} className="text-warning" />;
      case CIConclusion.ActionRequired:
        return <AlertCircle size={16} className="text-warning" />;
      default:
        return <Clock size={16} className="text-(--text-muted)" />;
    }
  }, []);

  const getStatusText = useCallback(
    (status: string, conclusion: string | null) => {
      if (status === CIRunStatus.Queued) return t('integrations.ci.status.queued');
      if (status === CIRunStatus.InProgress) return t('integrations.ci.status.inProgress');
      if (conclusion) {
        return conclusion.charAt(0).toUpperCase() + conclusion.slice(1);
      }
      return t('integrations.ci.status.completed');
    },
    [t]
  );

  const getStatusColor = useCallback((status: string, conclusion: string | null) => {
    if (status === CIRunStatus.Queued) return 'text-(--text-muted)';
    if (status === CIRunStatus.InProgress) return 'text-warning';
    switch (conclusion) {
      case CIConclusion.Success:
        return 'text-success';
      case CIConclusion.Failure:
        return 'text-error';
      default:
        return 'text-(--text-muted)';
    }
  }, []);

  const openInBrowser = useCallback((url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    shellApi.openUrl(url);
  }, []);

  if (isLoading && ciRuns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-(--text-muted) text-sm">{t('integrations.ci.loading')}</div>
      </div>
    );
  }

  if (ciRuns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-(--text-muted) text-sm">{t('integrations.ci.noRuns')}</div>
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
                    <span>Started {formatRelativeTime(run.createdAt)}</span>
                    {run.status === CIRunStatus.Completed && (
                      <span>Finished {formatRelativeTime(run.updatedAt)}</span>
                    )}
                  </div>
                </div>

                <button
                  className="p-1 hover:bg-(--bg-tertiary) rounded"
                  onClick={(e) => openInBrowser(run.url, e)}
                  title={t('integrations.ci.openInBrowser')}
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
            <span className="ml-2 text-sm text-(--text-muted)">
              {t('integrations.ci.loadingMore')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
