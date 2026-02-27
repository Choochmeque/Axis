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
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Branch } from '../../types';

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

  useEffect(() => {
    if (isOpen) {
      setForce(false);
      setDeleteRemote(false);
      setError(null);
    }
  }, [isOpen]);

  const { loadBranches, refreshRepository } = useRepositoryStore();

  // Check if branch has an upstream tracking branch
  const hasUpstream = !!branch?.upstream;

  const handleDelete = async () => {
    if (!branch) return;

    setIsLoading(true);
    setError(null);

    try {
      await branchApi.delete(branch.name, { force, deleteRemote });

      await Promise.all([loadBranches(), refreshRepository()]);
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

          {hasUpstream && (
            <CheckboxField
              id="delete-remote"
              label={t('branches.delete.deleteRemote', { remote: branch.upstream })}
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
            {isLoading ? t('common.deleting') : t('branches.delete.deleteButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
