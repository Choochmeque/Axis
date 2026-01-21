import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import { getErrorMessage } from '@/lib/errorUtils';
import type { Branch } from '../../types';
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

interface DeleteRemoteBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch;
}

export function DeleteRemoteBranchDialog({
  open,
  onOpenChange,
  branch,
}: DeleteRemoteBranchDialogProps) {
  const [force, setForce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadBranches, refreshRepository } = useRepositoryStore();

  // Parse remote and branch name from full name (e.g., "origin/main")
  const parts = branch?.name.split('/') ?? [];
  const remoteName = parts[0] ?? '';
  const branchName = parts.slice(1).join('/');

  const handleDelete = async () => {
    if (!branch || !remoteName || !branchName) return;

    setIsLoading(true);
    setError(null);

    try {
      await branchApi.deleteRemote(remoteName, branchName, force);
      await loadBranches();
      await refreshRepository();
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!branch) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle icon={Trash2}>Delete Remote Branch</DialogTitle>

        <DialogBody>
          <Alert variant="warning" className="mb-4">
            <AlertTriangle size={16} className="shrink-0" />
            This will delete the branch from the remote server.
          </Alert>

          <div className="dialog-info-box">
            <div className="flex justify-between text-base py-1">
              <span className="text-(--text-secondary)">Remote:</span>
              <span className="text-(--text-primary) font-medium">{remoteName}</span>
            </div>
            <div className="flex justify-between text-base py-1">
              <span className="text-(--text-secondary)">Branch:</span>
              <span className="text-(--text-primary) font-medium">{branchName}</span>
            </div>
          </div>

          <p className="text-sm text-(--text-secondary) mb-4">
            Are you sure you want to delete "{branchName}" from {remoteName}?
          </p>

          <CheckboxField
            id="force-delete-remote"
            label="Force delete"
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
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete from Remote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
