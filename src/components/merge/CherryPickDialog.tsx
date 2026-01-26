import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cherry } from 'lucide-react';

import { toast, useOperation } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { cherryPickApi } from '../../services/api';
import type { Commit, CherryPickResult } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  Label,
  CheckboxField,
  Alert,
} from '@/components/ui';

interface CherryPickDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCherryPickComplete?: (result: CherryPickResult) => void;
  commits: Commit[];
}

export function CherryPickDialog({
  isOpen,
  onClose,
  onCherryPickComplete,
  commits,
}: CherryPickDialogProps) {
  const { t } = useTranslation();
  const [noCommit, setNoCommit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CherryPickResult | null>(null);
  const { trackOperation } = useOperation();

  const handleCherryPick = async () => {
    if (commits.length === 0) {
      setError(t('merge.cherryPick.noCommitsError'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cherryPickResult = await trackOperation(
        {
          name: 'Cherry-pick',
          description: `Cherry-picking ${commits.length} commit${commits.length > 1 ? 's' : ''}`,
          category: 'git',
        },
        () =>
          cherryPickApi.cherryPick({
            commits: commits.map((c) => c.oid),
            noCommit: noCommit,
            allowEmpty: false,
          })
      );

      if (cherryPickResult.success && cherryPickResult.conflicts.length === 0) {
        onCherryPickComplete?.(cherryPickResult);
        onClose();
        toast.success(t('notifications.success.cherryPickComplete'));
      } else {
        setResult(cherryPickResult);
        if (cherryPickResult.success) {
          onCherryPickComplete?.(cherryPickResult);
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
      await cherryPickApi.abort();
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
      const continueResult = await cherryPickApi.continue();
      if (continueResult.success && continueResult.conflicts.length === 0) {
        onCherryPickComplete?.(continueResult);
        onClose();
        toast.success(t('notifications.success.cherryPickComplete'));
      } else {
        setResult(continueResult);
        if (continueResult.success) {
          onCherryPickComplete?.(continueResult);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      const skipResult = await cherryPickApi.skip();
      if (skipResult.success && skipResult.conflicts.length === 0) {
        onCherryPickComplete?.(skipResult);
        onClose();
        toast.success(t('notifications.success.cherryPickComplete'));
      } else {
        setResult(skipResult);
        if (skipResult.success) {
          onCherryPickComplete?.(skipResult);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-125">
        <DialogTitle icon={Cherry}>{t('merge.cherryPick.title')}</DialogTitle>

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
                    ? t('merge.cherryPick.commitToPick')
                    : t('merge.cherryPick.commitsToPick')}
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

              <CheckboxField
                id="no-commit"
                label={t('merge.cherryPick.noCommit')}
                description={t('merge.cherryPick.noCommitDesc')}
                checked={noCommit}
                disabled={isLoading}
                onCheckedChange={setNoCommit}
              />
            </>
          )}

          {result && result.conflicts.length > 0 && (
            <div className="mt-4 p-3 bg-(--bg-secondary) rounded-md">
              <h4 className="m-0 mb-2 text-base font-semibold text-(--text-primary)">
                {t('merge.cherryPick.conflictedFiles')}
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
              <Button variant="secondary" onClick={handleSkip} disabled={isLoading}>
                {t('common.skipCommit')}
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
                onClick={handleCherryPick}
                disabled={isLoading || commits.length === 0}
              >
                {isLoading ? t('merge.cherryPick.picking') : t('merge.cherryPick.pickButton')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
