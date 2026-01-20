import { useState } from 'react';
import { Trash2 } from 'lucide-react';

import { toast, useOperation } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { worktreeApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  CheckboxField,
  Alert,
} from '@/components/ui';
import type { Worktree } from '@/types';

interface RemoveWorktreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worktree: Worktree;
}

export function RemoveWorktreeDialog({ open, onOpenChange, worktree }: RemoveWorktreeDialogProps) {
  const { loadWorktrees } = useRepositoryStore();
  const { trackOperation } = useOperation();
  const [force, setForce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setForce(false);
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const handleRemove = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await trackOperation(
        { name: 'Remove Worktree', description: 'Removing worktree', category: 'git' },
        async () => {
          await worktreeApi.remove({
            path: worktree.path,
            force,
          });
          await loadWorktrees();
        }
      );

      handleOpenChange(false);
      toast.success('Worktree removed');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle icon={Trash2}>Remove Worktree</DialogTitle>

        <DialogBody>
          <p className="text-base text-(--text-secondary) mb-4">
            Are you sure you want to remove the worktree at:
          </p>
          <p className="font-mono text-sm bg-(--bg-tertiary) p-2 rounded mb-4 break-all">
            {worktree.path}
          </p>

          {worktree.branch && (
            <p className="text-sm text-(--text-secondary) mb-4">
              Branch: <strong>{worktree.branch}</strong>
            </p>
          )}

          <CheckboxField
            id="force-remove"
            label="Force removal (discard uncommitted changes)"
            checked={force}
            onCheckedChange={setForce}
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
          <Button variant="destructive" onClick={handleRemove} disabled={isLoading}>
            {isLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
