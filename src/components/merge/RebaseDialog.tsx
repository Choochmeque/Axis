import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { GitBranch, X, AlertCircle, Check } from 'lucide-react';
import { rebaseApi, branchApi } from '../../services/api';
import type { Branch, Commit, RebaseResult } from '../../types';
import { cn } from '../../lib/utils';

interface RebaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRebaseComplete?: (result: RebaseResult) => void;
  currentBranch: string;
  targetCommit?: Commit;
}

export function RebaseDialog({
  isOpen,
  onClose,
  onRebaseComplete,
  currentBranch,
  targetCommit,
}: RebaseDialogProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RebaseResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setResult(null);
      setSelectedBranch('');
      if (!targetCommit) {
        loadBranches();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetCommit]);

  const loadBranches = async () => {
    try {
      const allBranches = await branchApi.list(true, true);
      // Filter out the current branch
      const otherBranches = allBranches.filter((b) => b.name !== currentBranch && !b.is_head);
      setBranches(otherBranches);
    } catch (err) {
      console.error('Failed to load branches:', err);
      setError('Failed to load branches');
    }
  };

  const handleRebase = async () => {
    const rebaseTarget = targetCommit ? targetCommit.oid : selectedBranch;

    if (!rebaseTarget) {
      setError('Please select a branch to rebase onto');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rebaseResult = await rebaseApi.rebase({
        onto: rebaseTarget,
      });

      setResult(rebaseResult);

      if (rebaseResult.success) {
        onRebaseComplete?.(rebaseResult);
      }
    } catch (err) {
      console.error('Rebase failed:', err);
      setError(err instanceof Error ? err.message : 'Rebase failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbort = async () => {
    try {
      await rebaseApi.abort();
      setResult(null);
      setError(null);
      onClose();
    } catch (err) {
      console.error('Failed to abort rebase:', err);
      setError('Failed to abort rebase');
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const continueResult = await rebaseApi.continue();
      setResult(continueResult);
      if (continueResult.success) {
        onRebaseComplete?.(continueResult);
      }
    } catch (err) {
      console.error('Failed to continue rebase:', err);
      setError('Failed to continue rebase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      const skipResult = await rebaseApi.skip();
      setResult(skipResult);
      if (skipResult.success) {
        onRebaseComplete?.(skipResult);
      }
    } catch (err) {
      console.error('Failed to skip commit:', err);
      setError('Failed to skip commit');
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
            <GitBranch size={18} />
            Rebase Branch
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
                  <label className="label">Current Branch</label>
                  <div className="py-2.5 px-3 text-sm font-mono text-(--accent-color) bg-(--bg-secondary) rounded-md font-medium">
                    {currentBranch}
                  </div>
                </div>

                {targetCommit ? (
                  <div className="field">
                    <label className="label">Rebase Onto Commit</label>
                    <div className="flex items-center gap-3 py-2.5 px-3 border border-(--border-color) rounded-md bg-(--bg-secondary)">
                      <span className="shrink-0 font-mono text-xs font-semibold text-(--accent-color)">
                        {targetCommit.short_oid}
                      </span>
                      <span className="flex-1 text-[13px] text-(--text-primary) overflow-hidden text-ellipsis whitespace-nowrap">
                        {targetCommit.summary}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="field">
                    <label htmlFor="rebase-branch" className="label">
                      Rebase Onto
                    </label>
                    <select
                      id="rebase-branch"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      disabled={isLoading}
                      className="input"
                    >
                      <option value="">Select a branch...</option>
                      {branches.map((branch) => (
                        <option key={branch.full_name} value={branch.name}>
                          {branch.name}
                          {branch.branch_type === 'remote' && ` (${branch.branch_type})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="p-3 bg-(--bg-secondary) rounded-md text-[13px] text-(--text-secondary)">
                  <p className="m-0 mb-2">
                    This will replay all commits from{' '}
                    <strong className="text-(--text-primary) font-mono">{currentBranch}</strong> on
                    top of{' '}
                    <strong className="text-(--text-primary) font-mono">
                      {targetCommit ? targetCommit.short_oid : selectedBranch || '...'}
                    </strong>
                    .
                  </p>
                  <p className="m-0 text-xs text-warning">
                    Warning: Rebase rewrites commit history. Only rebase commits that haven't been
                    pushed to a shared repository.
                  </p>
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
                  Abort Rebase
                </button>
                <button
                  className="btn-icon btn-secondary"
                  onClick={handleSkip}
                  disabled={isLoading}
                >
                  Skip Commit
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
                  onClick={handleRebase}
                  disabled={isLoading || (!targetCommit && !selectedBranch)}
                >
                  {isLoading ? 'Rebasing...' : 'Rebase'}
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
