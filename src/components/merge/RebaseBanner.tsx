import { GitBranch, MessageSquare, Pencil, SkipForward, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { operationApi, rebaseApi } from '@/services/api';
import { useRebaseProgressStore } from '@/store/rebaseProgressStore';
import type { OperationState } from '@/types';

interface RebaseBannerProps {
  onComplete?: () => void;
}

export function RebaseBanner({ onComplete }: RebaseBannerProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<OperationState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { loadProgress, openRewordDialog, openEditPauseDialog } = useRebaseProgressStore();

  const loadState = useCallback(async () => {
    try {
      const operationState = await operationApi.getState();
      setState(operationState);

      // If rebasing, also load detailed progress
      if (operationState && typeof operationState === 'object' && 'Rebasing' in operationState) {
        await loadProgress();
      }
    } catch {
      setState(null);
    }
  }, [loadProgress]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleAbort = async () => {
    setIsLoading(true);
    try {
      await rebaseApi.abort();
      setState(null);
      toast.success(t('merge.rebaseBanner.aborted'));
      onComplete?.();
    } catch (err) {
      toast.error(t('merge.rebaseBanner.abortFailed'), getErrorMessage(err));
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
        await loadState();
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
    <div className="flex items-center gap-3 px-4 py-2 bg-warning/10 border-b border-warning/30">
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
          size="sm"
          variant="ghost"
          onClick={handleSkip}
          disabled={isLoading}
          title={t('merge.rebaseBanner.skip')}
        >
          <SkipForward size={14} />
        </Button>
        <Button
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
