import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, RefreshCw, Check } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Remote, FetchResult } from '../../types';
import './RemoteDialog.css';

interface FetchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FetchDialog({ open, onOpenChange }: FetchDialogProps) {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [selectedRemote, setSelectedRemote] = useState('');
  const [fetchAll, setFetchAll] = useState(true);
  const [prune, setPrune] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FetchResult[] | null>(null);

  const { loadBranches, refreshRepository } = useRepositoryStore();

  useEffect(() => {
    if (open) {
      loadRemotes();
      setResult(null);
      setError(null);
    }
  }, [open]);

  const loadRemotes = async () => {
    try {
      const data = await remoteApi.list();
      setRemotes(data);
      if (data.length > 0) {
        setSelectedRemote(data[0].name);
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const handleFetch = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let results: FetchResult[];
      if (fetchAll) {
        results = await remoteApi.fetchAll();
      } else {
        const singleResult = await remoteApi.fetch(selectedRemote, prune);
        results = [singleResult];
      }

      setResult(results);
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
            <RefreshCw size={18} />
            Fetch from Remote
          </Dialog.Title>

          <div className="dialog-body">
            {result ? (
              <div className="result-section">
                <div className="success-message">
                  <Check size={16} />
                  Fetch completed successfully
                </div>
                {result.map((r) => (
                  <div key={r.remote} className="result-item">
                    <strong>{r.remote}</strong>
                    <div className="result-stats">
                      {r.stats.received_objects > 0 ? (
                        <span>
                          Received {r.stats.received_objects} objects (
                          {formatBytes(r.stats.received_bytes)})
                        </span>
                      ) : (
                        <span>Already up to date</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="form-field checkbox-field">
                  <input
                    id="fetch-all"
                    type="checkbox"
                    checked={fetchAll}
                    onChange={(e) => setFetchAll(e.target.checked)}
                  />
                  <label htmlFor="fetch-all">Fetch from all remotes</label>
                </div>

                {!fetchAll && (
                  <div className="form-field">
                    <label htmlFor="remote-select">Remote</label>
                    <select
                      id="remote-select"
                      value={selectedRemote}
                      onChange={(e) => setSelectedRemote(e.target.value)}
                      disabled={remotes.length === 0}
                    >
                      {remotes.map((remote) => (
                        <option key={remote.name} value={remote.name}>
                          {remote.name} ({remote.url})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-field checkbox-field">
                  <input
                    id="prune"
                    type="checkbox"
                    checked={prune}
                    onChange={(e) => setPrune(e.target.checked)}
                  />
                  <label htmlFor="prune">
                    Prune deleted remote branches
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
                  onClick={handleFetch}
                  disabled={isLoading || (!fetchAll && !selectedRemote)}
                >
                  {isLoading ? 'Fetching...' : 'Fetch'}
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
