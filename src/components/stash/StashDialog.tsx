import { useState } from 'react';
import { Archive } from 'lucide-react';
import { stashApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Input,
  CheckboxField,
  Alert,
} from '@/components/ui';

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
      await stashApi.save({
        message: message || null,
        keepIndex: keepStaged,
        includeUntracked: true,
        includeIgnored: false,
      });

      setMessage('');
      setKeepStaged(false);
      await loadStashes();
      await refreshRepository();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save stash:', err);
      setError(err instanceof Error ? err.message : 'Failed to create stash');
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>
          <Archive size={18} />
          Stash Changes
        </DialogTitle>

        <DialogBody>
          <p className="text-base text-(--text-secondary) mb-4">
            This will stash all the changes in your working copy and return it to a clean state.
          </p>

          <FormField label="Message (optional)" htmlFor="stash-message">
            <Input
              id="stash-message"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional stash message..."
              autoFocus
            />
          </FormField>

          <CheckboxField
            id="keep-staged"
            label="Keep staged changes"
            checked={keepStaged}
            onCheckedChange={setKeepStaged}
          />

          {error && (
            <Alert variant="error" inline className="mt-3">
              {error}
            </Alert>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="primary" onClick={handleStash} disabled={isLoading}>
            {isLoading ? 'Stashing...' : 'Stash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
