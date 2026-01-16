import { useState, useMemo } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import { BranchType, type Branch } from '../../types';
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

interface DeleteBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch;
}

export function DeleteBranchDialog({ open, onOpenChange, branch }: DeleteBranchDialogProps) {
  const [force, setForce] = useState(false);
  const [deleteRemote, setDeleteRemote] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { branches, loadBranches, refreshRepository } = useRepositoryStore();

  // Find matching remote branch (even if not tracked)
  // First check explicit upstream, then look for origin/{branch.name}
  const remoteBranchInfo = useMemo(() => {
    if (!branch) return null;

    // If has explicit upstream tracking, use that
    if (branch.upstream) {
      const parts = branch.upstream.split('/');
      return {
        remoteName: parts[0],
        branchName: parts.slice(1).join('/'),
        displayName: branch.upstream,
      };
    }

    // Otherwise, look for a matching remote branch (prefer origin)
    const remoteBranches = branches.filter((b) => b.branchType === BranchType.Remote);

    // Try origin first
    const originMatch = remoteBranches.find((b) => b.name === `origin/${branch.name}`);
    if (originMatch) {
      return {
        remoteName: 'origin',
        branchName: branch.name,
        displayName: `origin/${branch.name}`,
      };
    }

    // Try any other remote
    for (const rb of remoteBranches) {
      const parts = rb.name.split('/');
      const remote = parts[0];
      const name = parts.slice(1).join('/');
      if (name === branch.name) {
        return {
          remoteName: remote,
          branchName: name,
          displayName: rb.name,
        };
      }
    }

    return null;
  }, [branch, branches]);

  const hasRemoteBranch = !!remoteBranchInfo;

  const handleDelete = async () => {
    if (!branch) return;

    setIsLoading(true);
    setError(null);

    try {
      // Delete local branch
      await branchApi.delete(branch.name, force);

      // Delete remote branch if requested
      if (deleteRemote && remoteBranchInfo) {
        await branchApi.deleteRemote(
          remoteBranchInfo.remoteName,
          remoteBranchInfo.branchName,
          force
        );
      }

      await loadBranches();
      await refreshRepository();
      onOpenChange(false);
    } catch (err) {
      const errorMsg = String(err);
      if (errorMsg.includes('not fully merged') && !force) {
        setError('Branch is not fully merged. Check "Force delete" to delete anyway.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!branch) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>
          <Trash2 size={18} />
          Delete Branch
        </DialogTitle>

        <DialogBody>
          <Alert variant="warning" className="mb-4">
            <AlertTriangle size={16} className="shrink-0" />
            This action cannot be undone.
          </Alert>

          <div className="dialog-info-box">
            <div className="flex justify-between text-base py-1">
              <span className="text-(--text-secondary)">Branch:</span>
              <span className="text-(--text-primary) font-medium">{branch.name}</span>
            </div>
            <div className="flex justify-between text-base py-1">
              <span className="text-(--text-secondary)">Last commit:</span>
              <span className="text-(--text-primary) font-medium">{branch.lastCommitSummary}</span>
            </div>
          </div>

          <p className="text-sm text-(--text-secondary) mb-4">
            Are you sure you want to delete the branch "{branch.name}"?
          </p>

          <CheckboxField
            id="force-delete"
            label="Force delete (even if not fully merged)"
            checked={force}
            onCheckedChange={setForce}
          />

          {hasRemoteBranch && (
            <CheckboxField
              id="delete-remote"
              label={`Also delete remote branch (${remoteBranchInfo?.displayName})`}
              checked={deleteRemote}
              onCheckedChange={setDeleteRemote}
            />
          )}

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
            {isLoading ? 'Deleting...' : 'Delete Branch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
