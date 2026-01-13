import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Undo2, X, AlertCircle, Check } from 'lucide-react';
import { revertApi } from '../../services/api';
import type { Commit, RevertResult } from '../../types';
import { cn } from '../../lib/utils';

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
  const [noCommit, setNoCommit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RevertResult | null>(null);

  const handleRevert = async () => {
    if (commits.length === 0) {
      setError('No commits selected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const revertResult = await revertApi.revert({
        commits: commits.map((c) => c.oid),
        no_commit: noCommit,
      });

      setResult(revertResult);

      if (revertResult.success) {
        onRevertComplete?.(revertResult);
      }
    } catch (err) {
      console.error('Revert failed:', err);
      setError(err instanceof Error ? err.message : 'Revert failed');
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
      console.error('Failed to abort revert:', err);
      setError('Failed to abort revert');
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const continueResult = await revertApi.continue();
      setResult(continueResult);
      if (continueResult.success) {
        onRevertComplete?.(continueResult);
      }
    } catch (err) {
      console.error('Failed to continue revert:', err);
      setError('Failed to continue revert');
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
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content max-w-125">
          <Dialog.Title className="dialog-title">
            <Undo2 size={18} />
            Revert Commit
          </Dialog.Title>

          <div className="dialog-body">
            {error && (
              <div className="alert alert-error mb-4">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className={cn('alert mb-4', result.success ? 'alert-success' : 'alert-warning')}>
                {result.success ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{result.message}</span>
              </div>
            )}

            {!result && (
              <>
                <div className="field">
                  <label className="label">
                    {commits.length === 1 ? 'Commit to Revert' : 'Commits to Revert'}
                  </label>
                  <div className="max-h-50 overflow-y-auto border border-(--border-color) rounded-md">
                    {commits.map((commit) => (
                      <div
                        key={commit.oid}
                        className="flex items-center gap-3 py-2.5 px-3 border-b border-(--border-color) last:border-b-0"
                      >
                        <span className="shrink-0 font-mono text-xs font-semibold text-(--accent-color)">
                          {commit.short_oid}
                        </span>
                        <span className="flex-1 text-[13px] text-(--text-primary) overflow-hidden text-ellipsis whitespace-nowrap">
                          {commit.summary}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-(--bg-secondary) rounded-md text-[13px] text-(--text-secondary)">
                  <p className="m-0">
                    Reverting a commit creates a new commit that undoes the changes introduced by
                    the selected commit. This is safe for shared branches as it does not rewrite
                    history.
                  </p>
                </div>

                <div className="checkbox-field">
                  <Checkbox.Root
                    id="no-commit-revert"
                    className="checkbox"
                    checked={noCommit}
                    onCheckedChange={(checked) => setNoCommit(checked === true)}
                    disabled={isLoading}
                  >
                    <Checkbox.Indicator>
                      <Check size={10} className="text-white" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <div>
                    <label htmlFor="no-commit-revert" className="checkbox-label">
                      Stage changes only (--no-commit)
                    </label>
                    <p className="mt-1 ml-6 text-xs text-(--text-secondary)">
                      Apply revert changes without creating a commit
                    </p>
                  </div>
                </div>
              </>
            )}

            {result && result.conflicts.length > 0 && (
              <div className="mt-4 p-3 bg-(--bg-secondary) rounded-md">
                <h4 className="m-0 mb-2 text-[13px] font-semibold text-(--text-primary)">
                  Conflicted Files
                </h4>
                <ul className="m-0 p-0 list-none">
                  {result.conflicts.map((conflict) => (
                    <li
                      key={conflict.path}
                      className="py-1.5 text-[13px] font-mono text-warning border-b border-(--border-color) last:border-b-0"
                    >
                      {conflict.path}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="dialog-footer">
            {result && !result.success ? (
              <>
                <button
                  className="btn-icon bg-error/10 text-error border border-error hover:bg-error/20"
                  onClick={handleAbort}
                >
                  Abort
                </button>
                <button
                  className="btn-icon btn-primary"
                  onClick={handleContinue}
                  disabled={isLoading}
                >
                  Continue
                </button>
              </>
            ) : result && result.success ? (
              <button className="btn-icon btn-primary" onClick={onClose}>
                Close
              </button>
            ) : (
              <>
                <Dialog.Close asChild>
                  <button className="btn-icon btn-secondary" disabled={isLoading}>
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  className="btn-icon btn-primary"
                  onClick={handleRevert}
                  disabled={isLoading || commits.length === 0}
                >
                  {isLoading ? 'Reverting...' : 'Revert'}
                </button>
              </>
            )}
          </div>

          <Dialog.Close asChild>
            <button className="btn-close absolute top-3 right-3" aria-label="Close">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
