import { useState, useEffect } from 'react';
import { GitBranch, X, AlertCircle, Check } from 'lucide-react';
import { rebaseApi, branchApi } from '../../services/api';
import type { Branch, RebaseResult } from '../../types';
import { cn } from '../../lib/utils';

const dialogClass =
  'bg-(--bg-primary) rounded-lg shadow-xl min-w-100 max-w-125 max-h-[80vh] flex flex-col overflow-hidden z-10000';
const headerClass = 'flex items-center justify-between py-4 px-4 border-b border-(--border-color)';
const titleClass = 'flex items-center gap-2 text-base font-semibold text-(--text-primary)';
const closeClass =
  'flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)';
const contentClass = 'flex-1 p-4 overflow-y-auto';
const footerClass = 'flex justify-end gap-2 py-4 px-4 border-t border-(--border-color)';
const formGroupClass = 'mb-4';
const labelClass = 'block text-[13px] font-medium text-(--text-secondary) mb-1.5';
const selectClass =
  'w-full py-2.5 px-3 text-sm text-(--text-primary) bg-(--bg-input) border border-(--border-color) rounded-md outline-none transition-colors focus:border-(--accent-color) disabled:opacity-60 disabled:cursor-not-allowed';

interface RebaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRebaseComplete?: (result: RebaseResult) => void;
  currentBranch: string;
}

export function RebaseDialog({
  isOpen,
  onClose,
  onRebaseComplete,
  currentBranch,
}: RebaseDialogProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RebaseResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      setError(null);
      setResult(null);
      setSelectedBranch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
    if (!selectedBranch) {
      setError('Please select a branch to rebase onto');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rebaseResult = await rebaseApi.rebase({
        onto: selectedBranch,
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

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay-centered" onClick={onClose}>
      <div className={dialogClass} onClick={(e) => e.stopPropagation()}>
        <div className={headerClass}>
          <div className={titleClass}>
            <GitBranch size={20} />
            <span>Rebase Branch</span>
          </div>
          <button className={closeClass} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={contentClass}>
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
              <div className={formGroupClass}>
                <label className={labelClass}>Current Branch</label>
                <div className="py-2.5 px-3 text-sm font-mono text-(--accent-color) bg-(--bg-secondary) rounded-md font-medium">
                  {currentBranch}
                </div>
              </div>

              <div className={formGroupClass}>
                <label htmlFor="rebase-branch" className={labelClass}>
                  Rebase Onto
                </label>
                <select
                  id="rebase-branch"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={isLoading}
                  className={selectClass}
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

              <div className="p-3 bg-(--bg-secondary) rounded-md text-[13px] text-(--text-secondary)">
                <p className="m-0 mb-2">
                  This will replay all commits from{' '}
                  <strong className="text-(--text-primary) font-mono">{currentBranch}</strong> on
                  top of{' '}
                  <strong className="text-(--text-primary) font-mono">
                    {selectedBranch || '...'}
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

        <div className={footerClass}>
          {result && !result.success ? (
            <>
              <button
                className="btn-icon bg-error/10 text-error border border-error hover:bg-error/20"
                onClick={handleAbort}
              >
                Abort Rebase
              </button>
              <button className="btn-icon btn-secondary" onClick={handleSkip} disabled={isLoading}>
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
              <button className="btn-icon btn-secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </button>
              <button
                className="btn-icon btn-primary"
                onClick={handleRebase}
                disabled={isLoading || !selectedBranch}
              >
                {isLoading ? 'Rebasing...' : 'Rebase'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
