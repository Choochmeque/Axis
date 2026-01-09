import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ArrowUpFromLine, Check } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Remote, PushResult } from '../../types';
import './RemoteDialog.css';

interface PushDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PushDialog({ open, onOpenChange }: PushDialogProps) {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [selectedRemote, setSelectedRemote] = useState('');
  const [force, setForce] = useState(false);
  const [setUpstream, setSetUpstream] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PushResult | null>(null);

  const { branches, loadBranches, refreshRepository } = useRepositoryStore();
  const currentBranch = branches.find((b) => b.is_head);

  useEffect(() => {
    if (open) {
      loadRemotes();
      setResult(null);
      setError(null);
      setForce(false);

      // Pre-select upstream remote if available
      if (currentBranch?.upstream) {
        const remoteName = currentBranch.upstream.split('/')[0];
        setSelectedRemote(remoteName);
        setSetUpstream(false);
      } else {
        setSetUpstream(true);
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

  const handlePush = async () => {
    if (!selectedRemote || !currentBranch) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const pushResult = await remoteApi.pushCurrentBranch(
        selectedRemote,
        force,
        setUpstream
      );

      setResult(pushResult);
      await loadBranches();
      await refreshRepository();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">
            <ArrowUpFromLine size={18} />
            Push to Remote
          </Dialog.Title>

          <div className="dialog-body">
            {result ? (
              <div className="result-section">
                <div className="success-message">
                  <Check size={16} />
                  Push completed successfully
                </div>
                <div className="result-item">
                  <strong>Pushed to {result.remote}</strong>
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
                    {currentBranch.ahead !== null && currentBranch.ahead > 0 && (
                      <div className="info-row">
                        <span className="info-label">Commits ahead:</span>
                        <span className="info-value">{currentBranch.ahead}</span>
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
                  <label htmlFor="remote-select">Push to Remote</label>
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
                    id="set-upstream"
                    type="checkbox"
                    checked={setUpstream}
                    onChange={(e) => setSetUpstream(e.target.checked)}
                  />
                  <label htmlFor="set-upstream">
                    Set as upstream tracking branch
                  </label>
                </div>

                <div className="form-field checkbox-field">
                  <input
                    id="force-push"
                    type="checkbox"
                    checked={force}
                    onChange={(e) => setForce(e.target.checked)}
                  />
                  <label htmlFor="force-push">
                    Force push (overwrites remote changes)
                  </label>
                </div>

                {error && <div className="error-message">{error}</div>}
              </>
            )}
          </div>

          <div className="dialog-footer">
            {result ? (
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
                  onClick={handlePush}
                  disabled={isLoading || !selectedRemote || !currentBranch}
                >
                  {isLoading ? 'Pushing...' : 'Push'}
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
