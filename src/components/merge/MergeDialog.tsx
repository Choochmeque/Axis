import { useState, useEffect } from 'react';
import { GitMerge, X, AlertCircle, Check } from 'lucide-react';
import { mergeApi, branchApi } from '../../services/api';
import type { Branch, MergeResult } from '../../types';
import { cn } from '../../lib/utils';

const overlayClass = 'fixed inset-0 bg-black/50 flex items-center justify-center z-9999';
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
const textareaClass =
  'w-full py-2.5 px-3 text-sm text-(--text-primary) bg-(--bg-input) border border-(--border-color) rounded-md font-inherit resize-y min-h-15 outline-none transition-colors focus:border-(--accent-color) disabled:opacity-60 disabled:cursor-not-allowed';
const checkboxGroupClass = 'mb-3';
const checkboxLabelClass =
  'flex items-center gap-2 cursor-pointer font-normal text-(--text-primary)';
const checkboxDescClass = 'mt-1 ml-6 text-xs text-(--text-secondary)';
const btnClass =
  'flex items-center justify-center gap-1.5 py-2 px-4 text-[13px] font-medium border-none rounded-md cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

interface MergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMergeComplete?: (result: MergeResult) => void;
  currentBranch: string;
}

export function MergeDialog({ isOpen, onClose, onMergeComplete, currentBranch }: MergeDialogProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [noFastForward, setNoFastForward] = useState(false);
  const [squash, setSquash] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MergeResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      setError(null);
      setResult(null);
      setSelectedBranch('');
      setNoFastForward(false);
      setSquash(false);
      setCustomMessage('');
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

  const handleMerge = async () => {
    if (!selectedBranch) {
      setError('Please select a branch to merge');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const mergeResult = await mergeApi.merge({
        branch: selectedBranch,
        message: customMessage || undefined,
        no_ff: noFastForward,
        squash,
      });

      setResult(mergeResult);

      if (mergeResult.success) {
        onMergeComplete?.(mergeResult);
      }
    } catch (err) {
      console.error('Merge failed:', err);
      setError(err instanceof Error ? err.message : 'Merge failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbort = async () => {
    try {
      await mergeApi.abort();
      setResult(null);
      setError(null);
      onClose();
    } catch (err) {
      console.error('Failed to abort merge:', err);
      setError('Failed to abort merge');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={overlayClass} onClick={onClose}>
      <div className={dialogClass} onClick={(e) => e.stopPropagation()}>
        <div className={headerClass}>
          <div className={titleClass}>
            <GitMerge size={20} />
            <span>Merge Branch</span>
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
                <label htmlFor="merge-branch" className={labelClass}>
                  Merge From
                </label>
                <select
                  id="merge-branch"
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

              <div className={formGroupClass}>
                <label htmlFor="merge-message" className={labelClass}>
                  Commit Message (optional)
                </label>
                <textarea
                  id="merge-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={`Merge branch '${selectedBranch || '...'}' into ${currentBranch}`}
                  disabled={isLoading}
                  rows={3}
                  className={textareaClass}
                />
              </div>

              <div className={checkboxGroupClass}>
                <label className={checkboxLabelClass}>
                  <input
                    type="checkbox"
                    checked={noFastForward}
                    onChange={(e) => setNoFastForward(e.target.checked)}
                    disabled={isLoading || squash}
                    className="w-4 h-4 accent-(--accent-color)"
                  />
                  <span>Create merge commit (--no-ff)</span>
                </label>
                <p className={checkboxDescClass}>
                  Always create a merge commit, even if fast-forward is possible
                </p>
              </div>

              <div className={checkboxGroupClass}>
                <label className={checkboxLabelClass}>
                  <input
                    type="checkbox"
                    checked={squash}
                    onChange={(e) => {
                      setSquash(e.target.checked);
                      if (e.target.checked) setNoFastForward(false);
                    }}
                    disabled={isLoading}
                    className="w-4 h-4 accent-(--accent-color)"
                  />
                  <span>Squash commits</span>
                </label>
                <p className={checkboxDescClass}>Combine all commits into a single commit</p>
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
                  'bg-(--bg-secondary) text-(--text-primary) border border-(--border-color) hover:bg-(--bg-hover)'
                )}
                onClick={handleAbort}
              >
                Abort Merge
              </button>
              <button
                className={cn(btnClass, 'bg-(--accent-color) text-white hover:opacity-90')}
                onClick={onClose}
              >
                Resolve Conflicts
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
                onClick={handleMerge}
                disabled={isLoading || !selectedBranch}
              >
                {isLoading ? 'Merging...' : 'Merge'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
