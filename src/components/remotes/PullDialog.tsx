import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { X, ArrowDownToLine, Check } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Remote } from '../../types';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await remoteApi.pull(selectedRemote, currentBranch.name, rebase, ffOnly);

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
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content max-w-120">
          <Dialog.Title className="dialog-title">
            <ArrowDownToLine size={18} />
            Pull from Remote
          </Dialog.Title>

          <div className="dialog-body">
            {success ? (
              <div>
                <div className="alert alert-success mb-4">
                  <Check size={16} />
                  Pull completed successfully
                </div>
                <div className="p-3 bg-(--bg-secondary) rounded">
                  <strong className="block mb-1 text-(--text-primary)">
                    Pulled from {selectedRemote}
                  </strong>
                  <div className="text-xs text-(--text-secondary)">
                    Branch: {currentBranch?.name}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {currentBranch && (
                  <div className="dialog-info-box">
                    <div className="flex justify-between text-[13px] py-1">
                      <span className="text-(--text-secondary)">Current branch:</span>
                      <span className="text-(--text-primary) font-medium">
                        {currentBranch.name}
                      </span>
                    </div>
                    {currentBranch.behind !== null && currentBranch.behind > 0 && (
                      <div className="flex justify-between text-[13px] py-1">
                        <span className="text-(--text-secondary)">Commits behind:</span>
                        <span className="text-(--text-primary) font-medium">
                          {currentBranch.behind}
                        </span>
                      </div>
                    )}
                    {currentBranch.upstream && (
                      <div className="flex justify-between text-[13px] py-1">
                        <span className="text-(--text-secondary)">Upstream:</span>
                        <span className="text-(--text-primary) font-medium">
                          {currentBranch.upstream}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="field">
                  <label htmlFor="remote-select" className="label">
                    Pull from Remote
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
                        {remote.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="checkbox-field">
                  <Checkbox.Root
                    id="rebase"
                    className="checkbox"
                    checked={rebase}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      setRebase(isChecked);
                      if (isChecked) setFfOnly(false);
                    }}
                    disabled={ffOnly}
                  >
                    <Checkbox.Indicator>
                      <Check size={10} className="text-white" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <label htmlFor="rebase" className="checkbox-label">
                    Rebase instead of merge
                  </label>
                </div>

                <div className="checkbox-field">
                  <Checkbox.Root
                    id="ff-only"
                    className="checkbox"
                    checked={ffOnly}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      setFfOnly(isChecked);
                      if (isChecked) setRebase(false);
                    }}
                    disabled={rebase}
                  >
                    <Checkbox.Indicator>
                      <Check size={10} className="text-white" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <label htmlFor="ff-only" className="checkbox-label">
                    Fast-forward only (abort if not possible)
                  </label>
                </div>

                {error && <div className="alert-inline alert-error mt-3">{error}</div>}
              </>
            )}
          </div>

          <div className="dialog-footer">
            {success ? (
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
                  onClick={handlePull}
                  disabled={isLoading || !selectedRemote || !currentBranch}
                >
                  {isLoading ? 'Pulling...' : 'Pull'}
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
