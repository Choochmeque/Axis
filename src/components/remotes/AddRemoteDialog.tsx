import { useState, useEffect } from 'react';
import { Cloud } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import { getErrorMessage } from '@/lib/errorUtils';
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
  Alert,
} from '@/components/ui';

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
      setError(getErrorMessage(err));
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-120">
        <DialogTitle icon={Cloud}>Add Remote</DialogTitle>

        <DialogBody>
          <FormField label="Remote Name" htmlFor="remote-name">
            <Input
              id="remote-name"
              type="text"
              value={remoteName}
              onChange={(e) => setRemoteName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="origin"
              autoFocus
            />
          </FormField>

          <FormField label="Remote URL" htmlFor="remote-url">
            <Input
              id="remote-url"
              type="url"
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://github.com/user/repo.git"
            />
          </FormField>

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
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={isLoading || !remoteName.trim() || !remoteUrl.trim()}
          >
            {isLoading ? 'Adding...' : 'Add Remote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
