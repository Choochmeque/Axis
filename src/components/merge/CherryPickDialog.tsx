import { useState } from 'react';
import { Cherry, X, AlertCircle, Check } from 'lucide-react';
import { cherryPickApi } from '../../services/api';
import type { Commit, CherryPickResult } from '../../types';
import './MergeDialog.css';

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
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog cherry-pick-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header">
          <div className="dialog-title">
            <Cherry size={20} />
            <span>Cherry Pick</span>
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
                <label>
                  {commits.length === 1 ? 'Commit to Cherry Pick' : 'Commits to Cherry Pick'}
                </label>
                <div className="commit-list">
                  {commits.map((commit) => (
                    <div key={commit.oid} className="commit-item">
                      <span className="commit-oid">{commit.short_oid}</span>
                      <span className="commit-message">{commit.summary}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={noCommit}
                    onChange={(e) => setNoCommit(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>Stage changes only (--no-commit)</span>
                </label>
                <p className="checkbox-description">
                  Apply changes without creating a commit
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
                Abort
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
