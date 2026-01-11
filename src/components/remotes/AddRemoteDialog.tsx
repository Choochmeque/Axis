import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Cloud } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';

interface AddRemoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRemoteDialog({ open, onOpenChange }: AddRemoteDialogProps) {
  const [remoteName, setRemoteName] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadBranches } = useRepositoryStore();

  useEffect(() => {
    if (open) {
      setRemoteName('');
      setRemoteUrl('');
      setError(null);
    }
  }, [open]);

  const handleAdd = async () => {
    if (!remoteName.trim()) {
      setError('Remote name is required');
      return;
    }

    if (!remoteUrl.trim()) {
      setError('Remote URL is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await remoteApi.add(remoteName.trim(), remoteUrl.trim());
      await loadBranches();
      onOpenChange(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleAdd();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content max-w-120">
          <Dialog.Title className="dialog-title">
            <Cloud size={18} />
            Add Remote
          </Dialog.Title>

          <div className="dialog-body">
            <div className="field">
              <label htmlFor="remote-name" className="label">
                Remote Name
              </label>
              <input
                id="remote-name"
                type="text"
                value={remoteName}
                onChange={(e) => setRemoteName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="origin"
                autoFocus
                className="input"
              />
            </div>

            <div className="field">
              <label htmlFor="remote-url" className="label">
                Remote URL
              </label>
              <input
                id="remote-url"
                type="url"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://github.com/user/repo.git"
                className="input"
              />
            </div>

            {error && <div className="alert-inline alert-error mt-3">{error}</div>}
          </div>

          <div className="dialog-footer">
            <Dialog.Close asChild>
              <button className="btn btn-secondary">Cancel</button>
            </Dialog.Close>
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={isLoading || !remoteName.trim() || !remoteUrl.trim()}
            >
              {isLoading ? 'Adding...' : 'Add Remote'}
            </button>
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
