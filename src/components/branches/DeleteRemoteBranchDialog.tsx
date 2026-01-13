import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { X, Trash2, AlertTriangle, Check } from 'lucide-react';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Branch } from '../../types';
import { cn } from '../../lib/utils';

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
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!branch) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content max-w-105">
          <Dialog.Title className="dialog-title">
            <Trash2 size={18} />
            Delete Remote Branch
          </Dialog.Title>

          <div className="dialog-body">
            <div className="flex items-center gap-2 py-2 px-3 mb-4 bg-warning/10 border border-warning rounded text-warning text-[13px]">
              <AlertTriangle size={16} className="shrink-0" />
              This will delete the branch from the remote server.
            </div>

            <div className="dialog-info-box">
              <div className="flex justify-between text-[13px] py-1">
                <span className="text-(--text-secondary)">Remote:</span>
                <span className="text-(--text-primary) font-medium">{remoteName}</span>
              </div>
              <div className="flex justify-between text-[13px] py-1">
                <span className="text-(--text-secondary)">Branch:</span>
                <span className="text-(--text-primary) font-medium">{branchName}</span>
              </div>
            </div>

            <p className="text-sm text-(--text-secondary) mb-4">
              Are you sure you want to delete "{branchName}" from {remoteName}?
            </p>

            <div className="checkbox-field">
              <Checkbox.Root
                id="force-delete-remote"
                className="checkbox"
                checked={force}
                onCheckedChange={(checked) => setForce(checked === true)}
              >
                <Checkbox.Indicator>
                  <Check size={10} className="text-white" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label htmlFor="force-delete-remote" className="checkbox-label">
                Force delete
              </label>
            </div>

            {error && <div className="alert-inline alert-error mt-3">{error}</div>}
          </div>

          <div className="dialog-footer">
            <Dialog.Close asChild>
              <button className="btn btn-secondary">Cancel</button>
            </Dialog.Close>
            <button
              className={cn(
                'btn',
                'bg-error border border-error text-white hover:not-disabled:bg-[#c0392b] disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete from Remote'}
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
