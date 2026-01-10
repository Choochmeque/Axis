import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Cloud } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import './RemoteDialog.css';

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
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">
            <Cloud size={18} />
            Add Remote
          </Dialog.Title>

          <div className="dialog-body">
            <div className="form-field">
              <label htmlFor="remote-name">Remote Name</label>
              <input
                id="remote-name"
                type="text"
                value={remoteName}
                onChange={(e) => setRemoteName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="origin"
                autoFocus
              />
            </div>

            <div className="form-field">
              <label htmlFor="remote-url">Remote URL</label>
              <input
                id="remote-url"
                type="url"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://github.com/user/repo.git"
              />
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="dialog-footer">
            <Dialog.Close asChild>
              <button className="dialog-button secondary">Cancel</button>
            </Dialog.Close>
            <button
              className="dialog-button primary"
              onClick={handleAdd}
              disabled={isLoading || !remoteName.trim() || !remoteUrl.trim()}
            >
              {isLoading ? 'Adding...' : 'Add Remote'}
            </button>
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
