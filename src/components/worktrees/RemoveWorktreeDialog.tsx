import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        {
          name: t('worktrees.operations.remove'),
          description: t('worktrees.operations.removeDescription'),
          category: 'git',
        },
        async () => {
          await worktreeApi.remove({
            path: worktree.path,
            force,
          });
          await loadWorktrees();
        }
      );

      handleOpenChange(false);
      toast.success(t('worktrees.notifications.removed'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle icon={Trash2}>{t('worktrees.remove.title')}</DialogTitle>

        <DialogBody>
          <p className="text-base text-(--text-secondary) mb-4">
            {t('worktrees.remove.confirmMessage')}
          </p>
          <p className="font-mono text-sm bg-(--bg-tertiary) p-2 rounded mb-4 break-all">
            {worktree.path}
          </p>

          {worktree.branch && (
            <p className="text-sm text-(--text-secondary) mb-4">
              {t('worktrees.remove.branchLabel')} <strong>{worktree.branch}</strong>
            </p>
          )}

          <CheckboxField
            id="force-remove"
            label={t('worktrees.remove.forceLabel')}
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
          <Button variant="destructive" onClick={handleRemove} disabled={isLoading}>
            {isLoading ? t('worktrees.remove.removing') : t('worktrees.remove.removeButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
