import { useState, useEffect } from 'react';
import { ArrowDownToLine, Check } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Remote } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Select,
  CheckboxField,
  Alert,
} from '@/components/ui';

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
  const currentBranch = branches.find((b) => b.isHead);

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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-120">
        <DialogTitle>
          <ArrowDownToLine size={18} />
          Pull from Remote
        </DialogTitle>

        <DialogBody>
          {success ? (
            <div>
              <Alert variant="success" className="mb-4">
                <Check size={16} />
                Pull completed successfully
              </Alert>
              <div className="p-3 bg-(--bg-secondary) rounded">
                <strong className="block mb-1 text-(--text-primary)">
                  Pulled from {selectedRemote}
                </strong>
                <div className="text-xs text-(--text-secondary)">Branch: {currentBranch?.name}</div>
              </div>
            </div>
          ) : (
            <>
              {currentBranch && (
                <div className="dialog-info-box">
                  <div className="flex justify-between text-[13px] py-1">
                    <span className="text-(--text-secondary)">Current branch:</span>
                    <span className="text-(--text-primary) font-medium">{currentBranch.name}</span>
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

              <FormField label="Pull from Remote" htmlFor="remote-select">
                <Select
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
                </Select>
              </FormField>

              <CheckboxField
                id="rebase"
                label="Rebase instead of merge"
                checked={rebase}
                disabled={ffOnly}
                onCheckedChange={(checked) => {
                  setRebase(checked);
                  if (checked) setFfOnly(false);
                }}
              />

              <CheckboxField
                id="ff-only"
                label="Fast-forward only (abort if not possible)"
                checked={ffOnly}
                disabled={rebase}
                onCheckedChange={(checked) => {
                  setFfOnly(checked);
                  if (checked) setRebase(false);
                }}
              />

              {error && (
                <Alert variant="error" inline className="mt-3">
                  {error}
                </Alert>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          {success ? (
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button
                variant="primary"
                onClick={handlePull}
                disabled={isLoading || !selectedRemote || !currentBranch}
              >
                {isLoading ? 'Pulling...' : 'Pull'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
