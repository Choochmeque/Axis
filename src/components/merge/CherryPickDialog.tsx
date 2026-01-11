import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Cherry, X, AlertCircle, Check } from 'lucide-react';
import { cherryPickApi } from '../../services/api';
import type { Commit, CherryPickResult } from '../../types';
import { cn } from '../../lib/utils';

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
  const [noCommit, setNoCommit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CherryPickResult | null>(null);

  const handleCherryPick = async () => {
    if (commits.length === 0) {
      setError('No commits selected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cherryPickResult = await cherryPickApi.cherryPick({
        commits: commits.map((c) => c.oid),
        no_commit: noCommit,
      });

      setResult(cherryPickResult);

      if (cherryPickResult.success) {
        onCherryPickComplete?.(cherryPickResult);
      }
    } catch (err) {
      console.error('Cherry-pick failed:', err);
      setError(err instanceof Error ? err.message : 'Cherry-pick failed');
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
      console.error('Failed to abort cherry-pick:', err);
      setError('Failed to abort cherry-pick');
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const continueResult = await cherryPickApi.continue();
      setResult(continueResult);
      if (continueResult.success) {
        onCherryPickComplete?.(continueResult);
      }
    } catch (err) {
      console.error('Failed to continue cherry-pick:', err);
      setError('Failed to continue cherry-pick');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content max-w-125">
          <Dialog.Title className="dialog-title">
            <Cherry size={18} />
            Cherry Pick
          </Dialog.Title>

          <div className="dialog-body">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-error/10 border border-error rounded-md text-error text-[13px] mb-4">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div
                className={cn(
                  'flex items-start gap-2 p-3 rounded-md text-[13px] mb-4',
                  result.success
                    ? 'bg-success/10 border border-success text-success'
                    : 'bg-warning/10 border border-warning text-warning'
                )}
              >
                {result.success ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{result.message}</span>
              </div>
            )}

            {!result && (
              <>
                <div className="field">
                  <label className="label">
                    {commits.length === 1 ? 'Commit to Cherry Pick' : 'Commits to Cherry Pick'}
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

                <div className="checkbox-field">
                  <Checkbox.Root
                    id="no-commit"
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
                    <label htmlFor="no-commit" className="checkbox-label">
                      Stage changes only (--no-commit)
                    </label>
                    <p className="mt-1 ml-6 text-xs text-(--text-secondary)">
                      Apply changes without creating a commit
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
                  onClick={handleCherryPick}
                  disabled={isLoading || commits.length === 0}
                >
                  {isLoading ? 'Cherry Picking...' : 'Cherry Pick'}
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
