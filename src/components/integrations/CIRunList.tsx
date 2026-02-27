import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  GitBranch,
  GitCommit,
  Loader2,
  MinusCircle,
  XCircle,
} from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { VirtualList } from '@/components/ui';
import { formatRelativeTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { shellApi } from '@/services/api';
import type { CIRun } from '@/types';
import { CIConclusion, CIRunStatus } from '@/types';

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

  return (
    <VirtualList
      items={ciRuns}
      getItemKey={(run) => run.id}
      itemHeight={80}
      isLoading={isLoading}
      loadingMessage={t('integrations.ci.loading')}
      emptyMessage={t('integrations.ci.noRuns')}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={onLoadMore}
      loadingMoreMessage={t('integrations.ci.loadingMore')}
    >
      {(run) => (
        <>
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
            title={t('common.openInBrowser')}
          >
            <ExternalLink size={14} className="text-(--text-muted)" />
          </button>
        </>
      )}
    </VirtualList>
  );
}
