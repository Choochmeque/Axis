import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { X, ArrowUpFromLine, Check } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Remote, PushResult } from '../../types';

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
        <Dialog.Content className="dialog-content max-w-120">
          <Dialog.Title className="dialog-title">
            <ArrowUpFromLine size={18} />
            Push to Remote
          </Dialog.Title>

          <div className="dialog-body">
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
                  <div className="dialog-info-box">
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

                <div className="field">
                  <label htmlFor="remote-select" className="label">
                    Push to Remote
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
                    id="set-upstream"
                    className="checkbox"
                    checked={setUpstream}
                    onCheckedChange={(checked) => setSetUpstream(checked === true)}
                  >
                    <Checkbox.Indicator>
                      <Check size={10} className="text-white" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <label htmlFor="set-upstream" className="checkbox-label">
                    Set as upstream tracking branch
                  </label>
                </div>

                <div className="checkbox-field">
                  <Checkbox.Root
                    id="force-push"
                    className="checkbox"
                    checked={force}
                    onCheckedChange={(checked) => setForce(checked === true)}
                  >
                    <Checkbox.Indicator>
                      <Check size={10} className="text-white" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <label htmlFor="force-push" className="checkbox-label">
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

          <div className="dialog-footer">
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
            <button className="btn-close absolute top-3 right-3" aria-label="Close">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
