import { GitMerge, Play, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { testId } from '@/lib/utils';
import { mergeApi, operationApi } from '@/services/api';
import { useStagingStore } from '@/store/stagingStore';
import type { OperationState } from '@/types';

interface MergeBannerProps {
  onComplete?: () => void;
}

export function MergeBanner({ onComplete }: MergeBannerProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<OperationState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useStagingStore((s) => s.status);
  const conflictCount = status?.conflicted?.length ?? 0;

  const loadState = useCallback(async () => {
    try {
      const operationState = await operationApi.getState();
      setState(operationState);
    } catch {
      setState(null);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleAbort = async () => {
    setIsLoading(true);
    try {
      await mergeApi.abort();
      setState(null);
      toast.success(t('merge.banner.aborted'));
      onComplete?.();
    } catch (err) {
      toast.error(t('merge.banner.abortFailed'), getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    if (conflictCount > 0) {
      toast.error(t('merge.banner.hasConflicts'));
      return;
    }

    setIsLoading(true);
    try {
      const result = await mergeApi.continue();
      if (result.success) {
        toast.success(t('merge.banner.continued'));
        setState(null);
        onComplete?.();
      } else if (result.conflicts.length > 0) {
        toast.warning(t('merge.banner.conflictEncountered'));
        onComplete?.();
      } else {
        toast.error(t('merge.banner.continueFailed'), result.message);
      }
      await loadState();
    } catch (err) {
      toast.error(t('merge.banner.continueFailed'), getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Check if merge is in progress
  const isMerging = state && typeof state === 'object' && 'Merging' in state;

  if (!isMerging) {
    return null;
  }

  /* eslint-disable @typescript-eslint/naming-convention -- Rust enum variant is PascalCase */
  const mergingState = (state as { Merging: { branch: string | null } }).Merging;
  /* eslint-enable @typescript-eslint/naming-convention */

  return (
    <div
      {...testId('e2e-merge-banner')}
      className="flex items-center gap-3 px-4 py-2 bg-warning/10 border-b border-warning/30"
    >
      <GitMerge size={16} className="text-warning" />
      <span className="text-sm font-medium">
        {t('merge.banner.inProgress')}
        {mergingState.branch && (
          <>
            {' '}
            <code className="px-1 py-0.5 bg-(--bg-secondary) rounded text-xs">
              {mergingState.branch}
            </code>
          </>
        )}
      </span>

      {conflictCount > 0 ? (
        <span className="text-xs text-warning">
          {t('merge.banner.resolveHint', { count: conflictCount })}
        </span>
      ) : (
        <span className="text-xs text-(--text-secondary)">{t('merge.banner.hint')}</span>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button
          {...testId('e2e-merge-banner-continue')}
          size="sm"
          variant="ghost"
          onClick={handleContinue}
          disabled={isLoading}
          title={t('merge.banner.continue')}
        >
          <Play size={14} />
        </Button>
        <Button
          {...testId('e2e-merge-banner-abort')}
          size="sm"
          variant="ghost"
          onClick={handleAbort}
          disabled={isLoading}
          title={t('merge.banner.abort')}
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
