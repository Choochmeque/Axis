import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ArrowUpFromLine, Check } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Remote, PushResult } from '../../types';

interface PushDialogProps {
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
const fieldClass = 'mb-4 last:mb-0';
const labelClass = 'block mb-1.5 text-[13px] font-medium text-(--text-secondary)';
const inputClass =
  'w-full py-2 px-3 text-sm bg-(--bg-secondary) border border-(--border-color) rounded text-(--text-primary) outline-none transition-colors focus:border-(--accent-color)';
const checkboxFieldClass = 'flex items-center gap-2 mb-4 last:mb-0';
const infoBoxClass = 'p-3 bg-(--bg-secondary) rounded mb-4';

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

  const handlePush = async () => {
    if (!selectedRemote || !currentBranch) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const pushResult = await remoteApi.pushCurrentBranch(selectedRemote, force, setUpstream);

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
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className={contentClass}>
          <Dialog.Title className={titleClass}>
            <ArrowUpFromLine size={18} />
            Push to Remote
          </Dialog.Title>

          <div className={bodyClass}>
            {result ? (
              <div>
                <div className="flex items-center gap-2 p-3 mb-4 bg-success/10 border border-success rounded text-success text-sm">
                  <Check size={16} />
                  Push completed successfully
                </div>
                <div className="p-3 bg-(--bg-secondary) rounded">
                  <strong className="block mb-1 text-(--text-primary)">
                    Pushed to {result.remote}
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
                    {currentBranch.ahead !== null && currentBranch.ahead > 0 && (
                      <div className="flex justify-between text-[13px] py-1">
                        <span className="text-(--text-secondary)">Commits ahead:</span>
                        <span className="text-(--text-primary) font-medium">
                          {currentBranch.ahead}
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
                    Push to Remote
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
                    id="set-upstream"
                    type="checkbox"
                    checked={setUpstream}
                    onChange={(e) => setSetUpstream(e.target.checked)}
                    className="w-4 h-4 accent-(--accent-color)"
                  />
                  <label htmlFor="set-upstream" className="text-(--text-primary)">
                    Set as upstream tracking branch
                  </label>
                </div>

                <div className={checkboxFieldClass}>
                  <input
                    id="force-push"
                    type="checkbox"
                    checked={force}
                    onChange={(e) => setForce(e.target.checked)}
                    className="w-4 h-4 accent-(--accent-color)"
                  />
                  <label htmlFor="force-push" className="text-(--text-primary)">
                    Force push (overwrites remote changes)
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
                  onClick={handlePush}
                  disabled={isLoading || !selectedRemote || !currentBranch}
                >
                  {isLoading ? 'Pushing...' : 'Push'}
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
