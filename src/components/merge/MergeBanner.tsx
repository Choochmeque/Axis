import { GitMerge, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { mergeApi, operationApi } from '@/services/api';
import type { OperationState } from '@/types';

interface MergeBannerProps {
  onComplete?: () => void;
}

export function MergeBanner({ onComplete }: MergeBannerProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<OperationState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const operationState = await operationApi.getState();
      setState(operationState);
    } catch {
      setState(null);
    }
  };

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

  // Check if merge is in progress
  const isMerging = state && typeof state === 'object' && 'Merging' in state;

  if (!isMerging) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention -- Rust enum variant is PascalCase
  const mergingState = (state as { Merging: { branch: string | null } }).Merging;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-warning/10 border-b border-warning/30">
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

      <span className="text-xs text-(--text-secondary)">{t('merge.banner.hint')}</span>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button
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
