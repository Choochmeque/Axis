import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GitBranch, MessageSquare, Pencil, Play, SkipForward, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { testId } from '@/lib/utils';
import { operationApi, rebaseApi } from '@/services/api';
import { useRebaseProgressStore } from '@/store/rebaseProgressStore';
import { useStagingStore } from '@/store/stagingStore';
import type { OperationState } from '@/types';

interface RebaseBannerProps {
  onComplete?: () => void;
}

const operationStateKey = ['operation-state'] as const;

export function RebaseBanner({ onComplete }: RebaseBannerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const { loadProgress, openRewordDialog, openEditPauseDialog } = useRebaseProgressStore();
  const status = useStagingStore((s) => s.status);
  const conflictCount = status?.conflicted?.length ?? 0;

  const { data: state = null, refetch: reloadState } = useQuery<OperationState | null>({
    queryKey: operationStateKey,
    queryFn: async () => {
      try {
        const operationState = await operationApi.getState();
        // If rebasing, also load detailed progress
        if (operationState && typeof operationState === 'object' && 'Rebasing' in operationState) {
          await loadProgress();
        }
        return operationState;
      } catch {
        return null;
      }
    },
  });

  const handleAbort = async () => {
    setIsLoading(true);
    try {
      await rebaseApi.abort();
      queryClient.setQueryData(operationStateKey, null);
      toast.success(t('merge.rebaseBanner.aborted'));
      onComplete?.();
    } catch (err) {
      toast.error(t('merge.rebaseBanner.abortFailed'), getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const result = await rebaseApi.continue();
      if (result.success) {
        toast.success(t('merge.rebaseBanner.continued'));
        onComplete?.();
      } else {
        // Check if rebase is still in progress (conflict on next commit)
        const newState = await operationApi.getState();
        const stillRebasing = newState && typeof newState === 'object' && 'Rebasing' in newState;
        if (stillRebasing) {
          // Not an error - just hit another conflict
          toast.info(t('merge.rebaseBanner.conflictEncountered'));
          onComplete?.();
        } else {
          toast.error(t('merge.rebaseBanner.continueFailed'), result.message);
        }
      }
      await reloadState();
    } catch (err) {
      toast.error(t('merge.rebaseBanner.continueFailed'), getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      const result = await rebaseApi.skip();
      if (result.success) {
        toast.success(t('merge.rebaseBanner.skipped'));
        await reloadState();
        onComplete?.();
      } else {
        toast.error(t('merge.rebaseBanner.skipFailed'), result.message);
      }
    } catch (err) {
      toast.error(t('merge.rebaseBanner.skipFailed'), getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Check if rebase is in progress
  const isRebasing = state && typeof state === 'object' && 'Rebasing' in state;

  if (!isRebasing) {
    return null;
  }

  /* eslint-disable @typescript-eslint/naming-convention -- Rust enum variant is PascalCase */
  const rebasingState = (
    state as {
      Rebasing: {
        onto: string | null;
        current: number | null;
        total: number | null;
        pausedAction: string | null;
        headName: string | null;
      };
    }
  ).Rebasing;
  /* eslint-enable @typescript-eslint/naming-convention */

  return (
    <div
      {...testId('e2e-rebase-banner')}
      className="flex items-center gap-3 px-4 py-2 bg-warning/10 border-b border-warning/30"
    >
      <GitBranch size={16} className="text-warning" />
      <span className="text-sm font-medium">
        {t('merge.rebaseBanner.inProgress')}
        {rebasingState.headName && (
          <>
            {' '}
            <code className="px-1 py-0.5 bg-(--bg-secondary) rounded text-xs">
              {rebasingState.headName}
            </code>
          </>
        )}
        {rebasingState.onto && (
          <>
            {' '}
            {t('merge.rebaseBanner.onto')}{' '}
            <code className="px-1 py-0.5 bg-(--bg-secondary) rounded text-xs">
              {rebasingState.onto.slice(0, 7)}
            </code>
          </>
        )}
      </span>

      {rebasingState.current != null && rebasingState.total != null && (
        <span className="text-xs text-(--text-secondary)">
          {t('merge.rebaseBanner.step', {
            current: rebasingState.current,
            total: rebasingState.total,
          })}
        </span>
      )}

      {rebasingState.pausedAction === 'Edit' && (
        <span className="text-xs text-warning font-medium">
          {t('merge.rebaseBanner.pausedForEdit')}
        </span>
      )}
      {rebasingState.pausedAction === 'Reword' && (
        <span className="text-xs text-warning font-medium">
          {t('merge.rebaseBanner.pausedForReword')}
        </span>
      )}

      {conflictCount > 0 && !rebasingState.pausedAction && (
        <span className="text-xs text-warning">
          {t('merge.rebaseBanner.resolveHint', { count: conflictCount })}
        </span>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {rebasingState.pausedAction === 'Edit' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={openEditPauseDialog}
            disabled={isLoading}
            title={t('merge.rebaseBanner.pausedForEdit')}
          >
            <Pencil size={14} />
          </Button>
        )}
        {rebasingState.pausedAction === 'Reword' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={openRewordDialog}
            disabled={isLoading}
            title={t('merge.rebaseBanner.pausedForReword')}
          >
            <MessageSquare size={14} />
          </Button>
        )}
        <Button
          {...testId('e2e-rebase-banner-continue')}
          size="sm"
          variant="ghost"
          onClick={handleContinue}
          disabled={isLoading}
          title={t('merge.rebaseBanner.continue')}
        >
          <Play size={14} />
        </Button>
        <Button
          {...testId('e2e-rebase-banner-skip')}
          size="sm"
          variant="ghost"
          onClick={handleSkip}
          disabled={isLoading}
          title={t('merge.rebaseBanner.skip')}
        >
          <SkipForward size={14} />
        </Button>
        <Button
          {...testId('e2e-rebase-banner-abort')}
          size="sm"
          variant="ghost"
          onClick={handleAbort}
          disabled={isLoading}
          title={t('merge.rebaseBanner.abort')}
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
