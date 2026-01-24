import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, CheckCircle2, XCircle, SkipForward } from 'lucide-react';

import { toast, useOperation } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { bisectApi } from '@/services/api';
import { BisectMarkType, type BisectState, type BisectResult } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Input,
  Alert,
} from '@/components/ui';

interface BisectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBisectComplete?: (result: BisectResult) => void;
  badCommit?: string;
  goodCommit?: string;
}

export function BisectDialog({
  isOpen,
  onClose,
  onBisectComplete,
  badCommit: initialBad,
  goodCommit: initialGood,
}: BisectDialogProps) {
  const { t } = useTranslation();
  const [badCommit, setBadCommit] = useState(initialBad ?? '');
  const [goodCommit, setGoodCommit] = useState(initialGood ?? '');
  const [bisectState, setBisectState] = useState<BisectState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { trackOperation } = useOperation();

  useEffect(() => {
    if (isOpen) {
      loadBisectState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadBisectState = async () => {
    try {
      const state = await bisectApi.getState();
      setBisectState(state);
      if (!state.isActive) {
        setBadCommit(initialBad ?? '');
        setGoodCommit(initialGood ?? '');
      }
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleStart = async () => {
    if (!goodCommit) {
      setError(t('merge.bisect.specifyGoodCommit'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await trackOperation(
        { name: 'Bisect Start', description: 'Starting bisect session', category: 'git' },
        () =>
          bisectApi.start({
            badCommit: badCommit || null,
            goodCommit,
          })
      );

      if (result.success) {
        setBisectState(result.state);
        toast.success(
          t('merge.bisect.notifications.started'),
          t('merge.bisect.notifications.testingCommit', {
            oid: result.state.currentCommit?.substring(0, 7),
          })
        );
      } else {
        setError(result.message ?? null);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMark = async (mark: BisectMarkType) => {
    setIsLoading(true);
    setError(null);

    try {
      const markLabels = {
        [BisectMarkType.Good]: 'good',
        [BisectMarkType.Bad]: 'bad',
        [BisectMarkType.Skip]: 'skipped',
      };

      const result = await trackOperation(
        {
          name: `Mark ${markLabels[mark]}`,
          description: `Marking commit as ${markLabels[mark]}`,
          category: 'git',
        },
        () => bisectApi.mark(mark)
      );

      if (result.state.firstBadCommit) {
        toast.success(
          t('merge.bisect.notifications.complete'),
          t('merge.bisect.notifications.firstBadCommit', {
            oid: result.state.firstBadCommit.substring(0, 7),
          })
        );
        setBisectState(result.state);
        onBisectComplete?.(result);
      } else if (result.success) {
        setBisectState(result.state);
        toast.info(
          t('merge.bisect.notifications.testingCommit', {
            oid: result.state.currentCommit?.substring(0, 7),
          })
        );
      } else {
        setError(result.message ?? null);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await bisectApi.reset();
      setBisectState(null);
      onClose();
      toast.success(t('merge.bisect.notifications.ended'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const isActive = bisectState?.isActive ?? false;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-125">
        <DialogTitle icon={Search}>{t('merge.bisect.title')}</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          {bisectState?.firstBadCommit && (
            <div className="p-4 bg-success/10 border border-success/30 rounded-md mb-4">
              <div className="flex items-center gap-2 text-success font-semibold mb-2">
                <CheckCircle2 size={18} />
                <span>{t('merge.bisect.firstBadFound')}</span>
              </div>
              <code className="block p-2 bg-(--bg-secondary) rounded font-mono text-sm">
                {bisectState.firstBadCommit}
              </code>
            </div>
          )}

          {!isActive && !bisectState?.firstBadCommit && (
            <>
              <FormField label={t('merge.bisect.badCommit')} htmlFor="bad-commit">
                <Input
                  id="bad-commit"
                  value={badCommit}
                  onChange={(e) => setBadCommit(e.target.value)}
                  placeholder={t('merge.bisect.badCommitPlaceholder')}
                  disabled={isLoading}
                />
              </FormField>

              <FormField label={t('merge.bisect.goodCommit')} htmlFor="good-commit">
                <Input
                  id="good-commit"
                  value={goodCommit}
                  onChange={(e) => setGoodCommit(e.target.value)}
                  placeholder={t('merge.bisect.goodCommitPlaceholder')}
                  disabled={isLoading}
                />
              </FormField>

              <div className="p-3 bg-(--bg-secondary) rounded-md text-sm text-(--text-secondary)">
                <p className="m-0">{t('merge.bisect.description')}</p>
              </div>
            </>
          )}

          {isActive && !bisectState?.firstBadCommit && (
            <>
              <div className="p-3 bg-(--bg-secondary) rounded-md mb-4">
                <div className="text-sm text-(--text-secondary) mb-2">
                  {t('merge.bisect.currentCommit')}
                </div>
                <code className="block p-2 bg-(--bg-primary) rounded font-mono text-sm text-(--accent-color)">
                  {bisectState?.currentCommit?.substring(0, 12)}
                </code>
                {bisectState?.stepsRemaining !== undefined && (
                  <div className="text-xs text-(--text-tertiary) mt-2">
                    {t('merge.bisect.stepsRemaining', {
                      steps: bisectState.stepsRemaining,
                      total: bisectState.totalCommits,
                    })}
                  </div>
                )}
              </div>

              <div className="text-sm text-(--text-secondary) mb-3">
                {t('merge.bisect.testAndMark')}
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  variant="secondary"
                  onClick={() => handleMark(BisectMarkType.Good)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <CheckCircle2 size={16} className="text-success" />
                  {t('merge.bisect.good')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleMark(BisectMarkType.Bad)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <XCircle size={16} className="text-error" />
                  {t('merge.bisect.bad')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleMark(BisectMarkType.Skip)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <SkipForward size={16} />
                  {t('merge.bisect.skip')}
                </Button>
              </div>

              {((bisectState?.goodCommits?.length ?? 0) > 0 ||
                (bisectState?.skippedCommits?.length ?? 0) > 0) && (
                <div className="mt-4 text-xs text-(--text-tertiary)">
                  <div>
                    {t('merge.bisect.goodCount', { count: bisectState?.goodCommits?.length ?? 0 })}
                  </div>
                  <div>
                    {t('merge.bisect.skippedCount', {
                      count: bisectState?.skippedCommits?.length ?? 0,
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          {isActive || bisectState?.firstBadCommit ? (
            <>
              <Button variant="destructive" onClick={handleReset} disabled={isLoading}>
                {t('merge.bisect.endButton')}
              </Button>
              <DialogClose asChild>
                <Button variant="secondary">{t('common.close')}</Button>
              </DialogClose>
            </>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="secondary" disabled={isLoading}>
                  {t('common.cancel')}
                </Button>
              </DialogClose>
              <Button variant="primary" onClick={handleStart} disabled={isLoading || !goodCommit}>
                {isLoading ? t('merge.bisect.starting') : t('merge.bisect.startButton')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
