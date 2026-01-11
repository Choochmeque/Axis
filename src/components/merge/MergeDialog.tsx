import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { GitMerge, X, AlertCircle, Check } from 'lucide-react';
import { mergeApi, branchApi } from '../../services/api';
import type { Branch, MergeResult } from '../../types';
import { cn } from '../../lib/utils';

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

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content max-w-125">
          <Dialog.Title className="dialog-title">
            <GitMerge size={18} />
            Merge Branch
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
                  <label className="label">Current Branch</label>
                  <div className="py-2.5 px-3 text-sm font-mono text-(--accent-color) bg-(--bg-secondary) rounded-md font-medium">
                    {currentBranch}
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="merge-branch" className="label">
                    Merge From
                  </label>
                  <select
                    id="merge-branch"
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

                <div className="field">
                  <label htmlFor="merge-message" className="label">
                    Commit Message (optional)
                  </label>
                  <textarea
                    id="merge-message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder={`Merge branch '${selectedBranch || '...'}' into ${currentBranch}`}
                    disabled={isLoading}
                    rows={3}
                    className={cn('input', 'resize-y min-h-15')}
                  />
                </div>

                <div className="checkbox-field">
                  <Checkbox.Root
                    id="no-ff"
                    className="checkbox"
                    checked={noFastForward}
                    onCheckedChange={(checked) => setNoFastForward(checked === true)}
                    disabled={isLoading || squash}
                  >
                    <Checkbox.Indicator>
                      <Check size={10} className="text-white" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <div>
                    <label htmlFor="no-ff" className="checkbox-label">
                      Create merge commit (--no-ff)
                    </label>
                    <p className="mt-1 ml-6 text-xs text-(--text-secondary)">
                      Always create a merge commit, even if fast-forward is possible
                    </p>
                  </div>
                </div>

                <div className="checkbox-field">
                  <Checkbox.Root
                    id="squash"
                    className="checkbox"
                    checked={squash}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      setSquash(isChecked);
                      if (isChecked) setNoFastForward(false);
                    }}
                    disabled={isLoading}
                  >
                    <Checkbox.Indicator>
                      <Check size={10} className="text-white" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <div>
                    <label htmlFor="squash" className="checkbox-label">
                      Squash commits
                    </label>
                    <p className="mt-1 ml-6 text-xs text-(--text-secondary)">
                      Combine all commits into a single commit
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
                <button className="btn-icon btn-secondary" onClick={handleAbort}>
                  Abort Merge
                </button>
                <button className="btn-icon btn-primary" onClick={onClose}>
                  Resolve Conflicts
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
                  onClick={handleMerge}
                  disabled={isLoading || !selectedBranch}
                >
                  {isLoading ? 'Merging...' : 'Merge'}
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
