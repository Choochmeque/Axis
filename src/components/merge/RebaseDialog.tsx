import { useState, useEffect } from 'react';
import { GitBranch, X, AlertCircle, Check } from 'lucide-react';
import { rebaseApi, branchApi } from '../../services/api';
import type { Branch, RebaseResult } from '../../types';
import './MergeDialog.css';

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
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog rebase-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-title">
            <GitBranch size={20} />
            <span>Rebase Branch</span>
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
                <label htmlFor="rebase-branch">Rebase Onto</label>
                <select
                  id="rebase-branch"
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

              <div className="rebase-info">
                <p>
                  This will replay all commits from <strong>{currentBranch}</strong> on
                  top of <strong>{selectedBranch || '...'}</strong>.
                </p>
                <p className="warning-text">
                  Warning: Rebase rewrites commit history. Only rebase commits that
                  haven't been pushed to a shared repository.
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
              <button className="btn btn-danger" onClick={handleAbort}>
                Abort Rebase
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleSkip}
                disabled={isLoading}
              >
                Skip Commit
              </button>
              <button
                className="btn btn-primary"
                onClick={handleContinue}
                disabled={isLoading}
              >
                Continue
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
