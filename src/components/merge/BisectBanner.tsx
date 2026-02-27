import { CheckCircle2, Search, SkipForward, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { bisectApi } from '@/services/api';
import { BisectMarkType, type BisectState } from '@/types';

interface BisectBannerProps {
  onComplete?: () => void;
}

export function BisectBanner({ onComplete }: BisectBannerProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<BisectState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const bisectState = await bisectApi.getState();
      setState(bisectState);
    } catch {
      setState(null);
    }
  };

  const handleMark = async (mark: BisectMarkType) => {
    setIsLoading(true);
    try {
      const result = await bisectApi.mark(mark);
      setState(result.state);

      if (result.state.firstBadCommit) {
        toast.success(
          t('merge.bisect.notifications.complete'),
          t('merge.bisect.notifications.firstBadCommit', {
            oid: result.state.firstBadCommit.substring(0, 7),
          })
        );
        onComplete?.();
      }
    } catch (err) {
      toast.error(t('merge.bisect.notifications.markFailed'), getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await bisectApi.reset();
      setState(null);
      toast.success(t('merge.bisect.notifications.ended'));
      onComplete?.();
    } catch (err) {
      toast.error(t('merge.bisect.notifications.endFailed'), getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!state?.isActive) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-warning/10 border-b border-warning/30">
      <Search size={16} className="text-warning" />
      <span className="text-sm font-medium">
        {t('merge.bisect.banner.testing')}{' '}
        <code className="px-1 py-0.5 bg-(--bg-secondary) rounded text-xs">
          {state.currentCommit?.substring(0, 7)}
        </code>
      </span>

      {state.stepsRemaining !== undefined && (
        <span className="text-xs text-(--text-secondary)">
          {t('merge.bisect.banner.stepsLeft', { steps: state.stepsRemaining })}
        </span>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleMark(BisectMarkType.Good)}
          disabled={isLoading}
          title={t('merge.bisect.markGood')}
        >
          <CheckCircle2 size={14} className="text-success" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleMark(BisectMarkType.Bad)}
          disabled={isLoading}
          title={t('merge.bisect.markBad')}
        >
          <XCircle size={14} className="text-error" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleMark(BisectMarkType.Skip)}
          disabled={isLoading}
          title={t('merge.bisect.skipCommit')}
        >
          <SkipForward size={14} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          disabled={isLoading}
          title={t('merge.bisect.endBisect')}
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
