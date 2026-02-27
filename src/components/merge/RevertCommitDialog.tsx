import { Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  CheckboxField,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  Label,
} from '@/components/ui';
import { toast, useOperation } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { revertApi } from '../../services/api';
import type { Commit, RevertResult } from '../../types';

interface RevertCommitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRevertComplete?: (result: RevertResult) => void;
  commits: Commit[];
}

export function RevertCommitDialog({
  isOpen,
  onClose,
  onRevertComplete,
  commits,
}: RevertCommitDialogProps) {
  const { t } = useTranslation();
  const [noCommit, setNoCommit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RevertResult | null>(null);
  const { trackOperation } = useOperation();

  useEffect(() => {
    if (isOpen) {
      setNoCommit(false);
      setIsLoading(false);
      setError(null);
      setResult(null);
    }
  }, [isOpen]);

  const handleRevert = async () => {
    if (commits.length === 0) {
      setError(t('merge.revert.noCommitsError'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const revertResult = await trackOperation(
        {
          name: 'Revert',
          description: `Reverting ${commits.length} commit${commits.length > 1 ? 's' : ''}`,
          category: 'git',
        },
        () =>
          revertApi.revert({
            commits: commits.map((c) => c.oid),
            noCommit: noCommit,
          })
      );

      if (revertResult.success && revertResult.conflicts.length === 0) {
        onRevertComplete?.(revertResult);
        onClose();
        toast.success(t('notifications.success.revertComplete'));
      } else {
        setResult(revertResult);
        if (revertResult.success) {
          onRevertComplete?.(revertResult);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbort = async () => {
    try {
      await revertApi.abort();
      setResult(null);
      setError(null);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const continueResult = await revertApi.continue();
      if (continueResult.success && continueResult.conflicts.length === 0) {
        onRevertComplete?.(continueResult);
        onClose();
        toast.success(t('notifications.success.revertComplete'));
      } else {
        setResult(continueResult);
        if (continueResult.success) {
          onRevertComplete?.(continueResult);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      setError(null);
      setResult(null);
      setNoCommit(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-125">
        <DialogTitle icon={Undo2}>{t('merge.revert.title')}</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          {result && (
            <Alert variant="warning" className="mb-4">
              {result.message}
            </Alert>
          )}

          {!result && (
            <>
              <div className="field">
                <Label>
                  {commits.length === 1
                    ? t('merge.revert.commitToRevert')
                    : t('merge.revert.commitsToRevert')}
                </Label>
                <div className="max-h-50 overflow-y-auto border border-(--border-color) rounded-md">
                  {commits.map((commit) => (
                    <div
                      key={commit.oid}
                      className="flex items-center gap-3 py-2.5 px-3 border-b border-(--border-color) last:border-b-0"
                    >
                      <span className="shrink-0 font-mono text-xs font-semibold text-(--accent-color)">
                        {commit.shortOid}
                      </span>
                      <span className="flex-1 text-base text-(--text-primary) overflow-hidden text-ellipsis whitespace-nowrap">
                        {commit.summary}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-(--bg-secondary) rounded-md text-base text-(--text-secondary)">
                <p className="m-0">{t('merge.revert.revertDescription')}</p>
              </div>

              <CheckboxField
                id="no-commit-revert"
                label={t('merge.revert.noCommit')}
                description={t('merge.revert.noCommitDesc')}
                checked={noCommit}
                disabled={isLoading}
                onCheckedChange={setNoCommit}
              />
            </>
          )}

          {result && result.conflicts.length > 0 && (
            <div className="mt-4 p-3 bg-(--bg-secondary) rounded-md">
              <h4 className="m-0 mb-2 text-base font-semibold text-(--text-primary)">
                {t('merge.revert.conflictedFiles')}
              </h4>
              <ul className="m-0 p-0 list-none">
                {result.conflicts.map((conflict) => (
                  <li
                    key={conflict.path}
                    className="py-1.5 text-base font-mono text-warning border-b border-(--border-color) last:border-b-0"
                  >
                    {conflict.path}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {result ? (
            <>
              <Button variant="destructive" onClick={handleAbort}>
                {t('common.abort')}
              </Button>
              <Button variant="primary" onClick={handleContinue} disabled={isLoading}>
                {t('common.continue')}
              </Button>
            </>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="secondary" disabled={isLoading}>
                  {t('common.cancel')}
                </Button>
              </DialogClose>
              <Button
                variant="primary"
                onClick={handleRevert}
                disabled={isLoading || commits.length === 0}
              >
                {isLoading ? t('merge.revert.reverting') : t('merge.revert.revertButton')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
