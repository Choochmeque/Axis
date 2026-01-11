import { useState } from 'react';
import { Cherry, X, AlertCircle, Check } from 'lucide-react';
import { cherryPickApi } from '../../services/api';
import type { Commit, CherryPickResult } from '../../types';
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
const checkboxLabelClass =
  'flex items-center gap-2 cursor-pointer font-normal text-(--text-primary)';
const checkboxDescClass = 'mt-1 ml-6 text-xs text-(--text-secondary)';
const btnClass =
  'flex items-center justify-center gap-1.5 py-2 px-4 text-[13px] font-medium border-none rounded-md cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

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

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay-centered" onClick={onClose}>
      <div className={dialogClass} onClick={(e) => e.stopPropagation()}>
        <div className={headerClass}>
          <div className={titleClass}>
            <Cherry size={20} />
            <span>Cherry Pick</span>
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
                <label className={labelClass}>
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

              <div className="mb-3">
                <label className={checkboxLabelClass}>
                  <input
                    type="checkbox"
                    checked={noCommit}
                    onChange={(e) => setNoCommit(e.target.checked)}
                    disabled={isLoading}
                    className="w-4 h-4 accent-(--accent-color)"
                  />
                  <span>Stage changes only (--no-commit)</span>
                </label>
                <p className={checkboxDescClass}>Apply changes without creating a commit</p>
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
                className={cn(
                  btnClass,
                  'bg-error/10 text-error border border-error hover:bg-error/20'
                )}
                onClick={handleAbort}
              >
                Abort
              </button>
              <button
                className={cn(btnClass, 'bg-(--accent-color) text-white hover:opacity-90')}
                onClick={handleContinue}
                disabled={isLoading}
              >
                Continue
              </button>
            </>
          ) : result && result.success ? (
            <button
              className={cn(btnClass, 'bg-(--accent-color) text-white hover:opacity-90')}
              onClick={onClose}
            >
              Close
            </button>
          ) : (
            <>
              <button
                className={cn(
                  btnClass,
                  'bg-(--bg-secondary) text-(--text-primary) border border-(--border-color) hover:bg-(--bg-hover)'
                )}
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className={cn(btnClass, 'bg-(--accent-color) text-white hover:opacity-90')}
                onClick={handleCherryPick}
                disabled={isLoading || commits.length === 0}
              >
                {isLoading ? 'Cherry Picking...' : 'Cherry Pick'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
