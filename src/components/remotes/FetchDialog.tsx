import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { X, RefreshCw, Check } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Remote, FetchResult } from '../../types';

interface FetchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const contentClass =
  'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-(--bg-primary) rounded-lg shadow-xl w-[90vw] max-w-120 max-h-[85vh] p-0 overflow-y-auto z-10000 animate-in fade-in zoom-in-95 duration-150';
const titleClass =
  'flex items-center gap-2 py-4 px-5 m-0 text-base font-semibold text-(--text-primary) border-b border-(--border-color)';
const bodyClass = 'p-5';
const footerClass = 'flex justify-end gap-2 py-4 px-5 border-t border-(--border-color)';
const closeClass =
  'absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)';

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
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className={contentClass}>
          <Dialog.Title className={titleClass}>
            <RefreshCw size={18} />
            Fetch from Remote
          </Dialog.Title>

          <div className={bodyClass}>
            {result ? (
              <div>
                <div className="flex items-center gap-2 p-3 mb-4 bg-success/10 border border-success rounded text-success text-sm">
                  <Check size={16} />
                  Fetch completed successfully
                </div>
                {result.map((r) => (
                  <div key={r.remote} className="p-3 bg-(--bg-secondary) rounded mb-2 last:mb-0">
                    <strong className="block mb-1 text-(--text-primary)">{r.remote}</strong>
                    <div className="text-xs text-(--text-secondary)">
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
                <div className="checkbox-field">
                  <Checkbox.Root
                    id="fetch-all"
                    className="checkbox"
                    checked={fetchAll}
                    onCheckedChange={(checked) => setFetchAll(checked === true)}
                  >
                    <Checkbox.Indicator>
                      <Check size={10} className="text-white" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <label htmlFor="fetch-all" className="checkbox-label">
                    Fetch from all remotes
                  </label>
                </div>

                {!fetchAll && (
                  <div className="field">
                    <label htmlFor="remote-select" className="label">
                      Remote
                    </label>
                    <select
                      id="remote-select"
                      value={selectedRemote}
                      onChange={(e) => setSelectedRemote(e.target.value)}
                      disabled={remotes.length === 0}
                      className="input"
                    >
                      {remotes.map((remote) => (
                        <option key={remote.name} value={remote.name}>
                          {remote.name} ({remote.url})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="checkbox-field">
                  <Checkbox.Root
                    id="prune"
                    className="checkbox"
                    checked={prune}
                    onCheckedChange={(checked) => setPrune(checked === true)}
                  >
                    <Checkbox.Indicator>
                      <Check size={10} className="text-white" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <label htmlFor="prune" className="checkbox-label">
                    Prune deleted remote branches
                  </label>
                </div>

                {error && (
                  <div className="mt-3 py-2 px-3 bg-error/10 border border-error rounded text-error text-[13px]">
                    {error}
                  </div>
                )}
              </>
            )}
          </div>

          <div className={footerClass}>
            {result ? (
              <button className="btn btn-primary" onClick={handleClose}>
                Done
              </button>
            ) : (
              <>
                <Dialog.Close asChild>
                  <button className="btn btn-secondary">Cancel</button>
                </Dialog.Close>
                <button
                  className="btn btn-primary"
                  onClick={handleFetch}
                  disabled={isLoading || (!fetchAll && !selectedRemote)}
                >
                  {isLoading ? 'Fetching...' : 'Fetch'}
                </button>
              </>
            )}
          </div>

          <Dialog.Close asChild>
            <button className={closeClass} aria-label="Close">
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
