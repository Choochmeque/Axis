import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  CheckboxField,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/errorUtils';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Branch } from '../../types';

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
  const { t } = useTranslation();
  const [force, setForce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForce(false);
      setError(null);
    }
  }, [open]);

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
      await Promise.all([loadBranches(), refreshRepository()]);
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
        <DialogTitle icon={Trash2}>{t('branches.deleteRemote.title')}</DialogTitle>

        <DialogBody>
          <Alert variant="warning" className="mb-4">
            {t('branches.deleteRemote.warning')}
          </Alert>

          <div className="dialog-info-box">
            <div className="flex justify-between text-base py-1">
              <span className="text-(--text-secondary)">
                {t('branches.deleteRemote.remoteLabel')}
              </span>
              <span className="text-(--text-primary) font-medium">{remoteName}</span>
            </div>
            <div className="flex justify-between text-base py-1">
              <span className="text-(--text-secondary)">
                {t('branches.deleteRemote.branchLabel')}
              </span>
              <span className="text-(--text-primary) font-medium">{branchName}</span>
            </div>
          </div>

          <p className="text-sm text-(--text-secondary) mb-4">
            {t('branches.deleteRemote.confirmMessage', { branch: branchName, remote: remoteName })}
          </p>

          <CheckboxField
            id="force-delete-remote"
            label={t('branches.deleteRemote.forceDelete')}
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
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? t('common.deleting') : t('branches.deleteRemote.deleteButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
