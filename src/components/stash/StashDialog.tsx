import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { X, Check, Archive } from 'lucide-react';
import { stashApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';

interface StashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StashDialog({ open, onOpenChange }: StashDialogProps) {
  const { refreshRepository, loadStashes } = useRepositoryStore();
  const [message, setMessage] = useState('');
  const [keepStaged, setKeepStaged] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStash = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await stashApi.save({
        message: message || undefined,
        keep_index: keepStaged,
        include_untracked: true,
        include_ignored: false,
      });

      if (result.success) {
        setMessage('');
        setKeepStaged(false);
        await loadStashes();
        await refreshRepository();
        onOpenChange(false);
      } else {
        setError(result.message || 'Failed to create stash');
      }
    } catch (err) {
      console.error('Failed to save stash:', err);
      setError('Failed to create stash');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setMessage('');
      setKeepStaged(false);
      setError(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content max-w-105">
          <Dialog.Title className="dialog-title">
            <Archive size={18} />
            Stash Changes
          </Dialog.Title>

          <div className="dialog-body">
            <p className="text-[13px] text-(--text-secondary) mb-4">
              This will stash all the changes in your working copy and return it to a clean state.
            </p>

            <div className="field">
              <label htmlFor="stash-message" className="label">
                Message (optional)
              </label>
              <input
                id="stash-message"
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Optional stash message..."
                className="input"
                autoFocus
              />
            </div>

            <div className="checkbox-field">
              <Checkbox.Root
                id="keep-staged"
                className="checkbox"
                checked={keepStaged}
                onCheckedChange={(checked) => setKeepStaged(checked === true)}
              >
                <Checkbox.Indicator>
                  <Check size={10} className="text-white" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label htmlFor="keep-staged" className="checkbox-label">
                Keep staged changes
              </label>
            </div>

            {error && <div className="alert-inline alert-error mt-3">{error}</div>}
          </div>

          <div className="dialog-footer">
            <Dialog.Close asChild>
              <button className="btn btn-secondary">Cancel</button>
            </Dialog.Close>
            <button className="btn btn-primary" onClick={handleStash} disabled={isLoading}>
              {isLoading ? 'Stashing...' : 'Stash'}
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
