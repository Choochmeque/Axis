import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ArrowDownToLine, Check } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Remote } from '../../types';
import { cn } from '../../lib/utils';

interface PullDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const overlayClass = 'fixed inset-0 bg-black/50 z-9999 animate-in fade-in duration-150';
const contentClass =
  'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-(--bg-primary) rounded-lg shadow-xl w-[90vw] max-w-120 max-h-[85vh] p-0 overflow-y-auto z-10000 animate-in fade-in zoom-in-95 duration-150';
const titleClass =
  'flex items-center gap-2 py-4 px-5 m-0 text-base font-semibold text-(--text-primary) border-b border-(--border-color)';
const bodyClass = 'p-5';
const footerClass = 'flex justify-end gap-2 py-4 px-5 border-t border-(--border-color)';
const closeClass =
  'absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)';
const fieldClass = 'mb-4 last:mb-0';
const labelClass = 'block mb-1.5 text-[13px] font-medium text-(--text-secondary)';
const inputClass =
  'w-full py-2 px-3 text-sm bg-(--bg-secondary) border border-(--border-color) rounded text-(--text-primary) outline-none transition-colors focus:border-(--accent-color)';
const btnClass = 'py-2 px-4 text-[13px] font-medium rounded cursor-pointer transition-colors';
const checkboxFieldClass = 'flex items-center gap-2 mb-4 last:mb-0';
const infoBoxClass = 'p-3 bg-(--bg-secondary) rounded mb-4';

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
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content className={contentClass}>
          <Dialog.Title className={titleClass}>
            <ArrowDownToLine size={18} />
            Pull from Remote
          </Dialog.Title>

          <div className={bodyClass}>
            {success ? (
              <div>
                <div className="flex items-center gap-2 p-3 mb-4 bg-success/10 border border-success rounded text-success text-sm">
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
                  <div className={infoBoxClass}>
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

                <div className={fieldClass}>
                  <label htmlFor="remote-select" className={labelClass}>
                    Pull from Remote
                  </label>
                  <select
                    id="remote-select"
                    value={selectedRemote}
                    onChange={(e) => setSelectedRemote(e.target.value)}
                    disabled={remotes.length === 0}
                    className={inputClass}
                  >
                    {remotes.map((remote) => (
                      <option key={remote.name} value={remote.name}>
                        {remote.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={checkboxFieldClass}>
                  <input
                    id="rebase"
                    type="checkbox"
                    checked={rebase}
                    onChange={(e) => {
                      setRebase(e.target.checked);
                      if (e.target.checked) setFfOnly(false);
                    }}
                    disabled={ffOnly}
                    className="w-4 h-4 accent-(--accent-color)"
                  />
                  <label htmlFor="rebase" className="text-(--text-primary)">
                    Rebase instead of merge
                  </label>
                </div>

                <div className={checkboxFieldClass}>
                  <input
                    id="ff-only"
                    type="checkbox"
                    checked={ffOnly}
                    onChange={(e) => {
                      setFfOnly(e.target.checked);
                      if (e.target.checked) setRebase(false);
                    }}
                    disabled={rebase}
                    className="w-4 h-4 accent-(--accent-color)"
                  />
                  <label htmlFor="ff-only" className="text-(--text-primary)">
                    Fast-forward only (abort if not possible)
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
            {success ? (
              <button
                className={cn(
                  btnClass,
                  'bg-(--accent-color) border border-(--accent-color) text-white hover:bg-(--accent-color-hover)'
                )}
                onClick={handleClose}
              >
                Done
              </button>
            ) : (
              <>
                <Dialog.Close asChild>
                  <button
                    className={cn(
                      btnClass,
                      'bg-transparent border border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                    )}
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  className={cn(
                    btnClass,
                    'bg-(--accent-color) border border-(--accent-color) text-white hover:not-disabled:bg-(--accent-color-hover) disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  onClick={handlePull}
                  disabled={isLoading || !selectedRemote || !currentBranch}
                >
                  {isLoading ? 'Pulling...' : 'Pull'}
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
