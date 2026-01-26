import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
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
  isOpen: boolean;
  onClose: () => void;
  branch?: Branch;
}

export function DeleteBranchDialog({ isOpen, onClose, branch }: DeleteBranchDialogProps) {
  const { t } = useTranslation();
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
      onClose();
      toast.success(t('notifications.success.branchDeleted', { name: branch.name }));
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      if (errorMsg.includes('not fully merged') && !force) {
        setError(t('branches.delete.notFullyMerged'));
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!branch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle icon={Trash2}>{t('branches.delete.title')}</DialogTitle>

        <DialogBody>
          <Alert variant="warning" className="mb-4">
            {t('branches.delete.warning')}
          </Alert>

          <div className="dialog-info-box">
            <div className="flex justify-between text-base py-1">
              <span className="text-(--text-secondary)">{t('branches.delete.branchLabel')}</span>
              <span className="text-(--text-primary) font-medium">{branch.name}</span>
            </div>
            <div className="flex justify-between text-base py-1">
              <span className="text-(--text-secondary)">
                {t('branches.delete.lastCommitLabel')}
              </span>
              <span className="text-(--text-primary) font-medium">{branch.lastCommitSummary}</span>
            </div>
          </div>

          <p className="text-sm text-(--text-secondary) mb-4">
            {t('branches.delete.confirmMessage', { name: branch.name })}
          </p>

          <CheckboxField
            id="force-delete"
            label={t('branches.delete.forceDelete')}
            checked={force}
            onCheckedChange={setForce}
          />

          {hasRemoteBranch && (
            <CheckboxField
              id="delete-remote"
              label={t('branches.delete.deleteRemote', { remote: remoteBranchInfo?.displayName })}
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
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? t('branches.delete.deleting') : t('branches.delete.deleteButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
