import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ArrowDownToLine, Check } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Remote } from '../../types';
import './RemoteDialog.css';

interface PullDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PullDialog({ open, onOpenChange }: PullDialogProps) {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [selectedRemote, setSelectedRemote] = useState('');
  const [rebase, setRebase] = useState(false);
  const [ffOnly, setFfOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { branches, loadBranches, loadCommits, refreshRepository } = useRepositoryStore();
  const currentBranch = branches.find((b) => b.is_head);

  useEffect(() => {
    if (open) {
      loadRemotes();
      setSuccess(false);
      setError(null);
      setRebase(false);
      setFfOnly(false);

      // Pre-select upstream remote if available
      if (currentBranch?.upstream) {
        const remoteName = currentBranch.upstream.split('/')[0];
        setSelectedRemote(remoteName);
      }
    }
  }, [open, currentBranch]);

  const loadRemotes = async () => {
    try {
      const data = await remoteApi.list();
      setRemotes(data);
      if (data.length > 0 && !selectedRemote) {
        setSelectedRemote(data[0].name);
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const handlePull = async () => {
    if (!selectedRemote || !currentBranch) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await remoteApi.pull(
        selectedRemote,
        currentBranch.name,
        rebase,
        ffOnly
      );

      setSuccess(true);
      await loadBranches();
      await loadCommits();
      await refreshRepository();
    } catch (err) {
      const errorMsg = String(err);
      if (errorMsg.includes('fast-forward')) {
        setError('Cannot fast-forward. Try disabling "Fast-forward only" or enable rebase.');
      } else if (errorMsg.includes('conflict')) {
        setError('Merge conflict detected. Please resolve conflicts manually.');
      } else if (errorMsg.includes('rebase')) {
        setError('Rebase required. Please use the command line for interactive rebase.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">
            <ArrowDownToLine size={18} />
            Pull from Remote
          </Dialog.Title>

          <div className="dialog-body">
            {success ? (
              <div className="result-section">
                <div className="success-message">
                  <Check size={16} />
                  Pull completed successfully
                </div>
                <div className="result-item">
                  <strong>Pulled from {selectedRemote}</strong>
                  <div className="result-stats">
                    Branch: {currentBranch?.name}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {currentBranch && (
                  <div className="info-section">
                    <div className="info-row">
                      <span className="info-label">Current branch:</span>
                      <span className="info-value">{currentBranch.name}</span>
                    </div>
                    {currentBranch.behind !== null && currentBranch.behind > 0 && (
                      <div className="info-row">
                        <span className="info-label">Commits behind:</span>
                        <span className="info-value">{currentBranch.behind}</span>
                      </div>
                    )}
                    {currentBranch.upstream && (
                      <div className="info-row">
                        <span className="info-label">Upstream:</span>
                        <span className="info-value">{currentBranch.upstream}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-field">
                  <label htmlFor="remote-select">Pull from Remote</label>
                  <select
                    id="remote-select"
                    value={selectedRemote}
                    onChange={(e) => setSelectedRemote(e.target.value)}
                    disabled={remotes.length === 0}
                  >
                    {remotes.map((remote) => (
                      <option key={remote.name} value={remote.name}>
                        {remote.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field checkbox-field">
                  <input
                    id="rebase"
                    type="checkbox"
                    checked={rebase}
                    onChange={(e) => {
                      setRebase(e.target.checked);
                      if (e.target.checked) setFfOnly(false);
                    }}
                    disabled={ffOnly}
                  />
                  <label htmlFor="rebase">
                    Rebase instead of merge
                  </label>
                </div>

                <div className="form-field checkbox-field">
                  <input
                    id="ff-only"
                    type="checkbox"
                    checked={ffOnly}
                    onChange={(e) => {
                      setFfOnly(e.target.checked);
                      if (e.target.checked) setRebase(false);
                    }}
                    disabled={rebase}
                  />
                  <label htmlFor="ff-only">
                    Fast-forward only (abort if not possible)
                  </label>
                </div>

                {error && <div className="error-message">{error}</div>}
              </>
            )}
          </div>

          <div className="dialog-footer">
            {success ? (
              <button className="dialog-button primary" onClick={handleClose}>
                Done
              </button>
            ) : (
              <>
                <Dialog.Close asChild>
                  <button className="dialog-button secondary">Cancel</button>
                </Dialog.Close>
                <button
                  className="dialog-button primary"
                  onClick={handlePull}
                  disabled={isLoading || !selectedRemote || !currentBranch}
                >
                  {isLoading ? 'Pulling...' : 'Pull'}
                </button>
              </>
            )}
          </div>

          <Dialog.Close asChild>
            <button className="dialog-close" aria-label="Close">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
