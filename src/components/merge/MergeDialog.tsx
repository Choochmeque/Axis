import { useState, useEffect } from 'react';
import { GitMerge, X, AlertCircle, Check } from 'lucide-react';
import { mergeApi, branchApi } from '../../services/api';
import type { Branch, MergeResult } from '../../types';
import './MergeDialog.css';

interface MergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMergeComplete?: (result: MergeResult) => void;
  currentBranch: string;
}

export function MergeDialog({
  isOpen,
  onClose,
  onMergeComplete,
  currentBranch,
}: MergeDialogProps) {
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
  }, [isOpen]);

  const loadBranches = async () => {
    try {
      const allBranches = await branchApi.list(true, true);
      // Filter out the current branch
      const otherBranches = allBranches.filter(
        (b) => b.name !== currentBranch && !b.is_head
      );
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
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog merge-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-title">
            <GitMerge size={20} />
            <span>Merge Branch</span>
          </div>
          <button className="dialog-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="dialog-content">
          {error && (
            <div className="dialog-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div
              className={`dialog-result ${result.success ? 'success' : 'warning'}`}
            >
              {result.success ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{result.message}</span>
            </div>
          )}

          {!result && (
            <>
              <div className="form-group">
                <label>Current Branch</label>
                <div className="current-branch-display">{currentBranch}</div>
              </div>

              <div className="form-group">
                <label htmlFor="merge-branch">Merge From</label>
                <select
                  id="merge-branch"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={isLoading}
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

              <div className="form-group">
                <label htmlFor="merge-message">Commit Message (optional)</label>
                <textarea
                  id="merge-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={`Merge branch '${selectedBranch || '...'}' into ${currentBranch}`}
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={noFastForward}
                    onChange={(e) => setNoFastForward(e.target.checked)}
                    disabled={isLoading || squash}
                  />
                  <span>Create merge commit (--no-ff)</span>
                </label>
                <p className="checkbox-description">
                  Always create a merge commit, even if fast-forward is possible
                </p>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={squash}
                    onChange={(e) => {
                      setSquash(e.target.checked);
                      if (e.target.checked) setNoFastForward(false);
                    }}
                    disabled={isLoading}
                  />
                  <span>Squash commits</span>
                </label>
                <p className="checkbox-description">
                  Combine all commits into a single commit
                </p>
              </div>
            </>
          )}

          {result && result.conflicts.length > 0 && (
            <div className="conflict-list">
              <h4>Conflicted Files</h4>
              <ul>
                {result.conflicts.map((conflict) => (
                  <li key={conflict.path}>{conflict.path}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          {result && !result.success ? (
            <>
              <button className="btn btn-secondary" onClick={handleAbort}>
                Abort Merge
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                Resolve Conflicts
              </button>
            </>
          ) : result && result.success ? (
            <button className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
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
