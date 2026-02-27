import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { toast } from '@/hooks';
import { validateBranchName } from '@/lib/branchValidation';
import { getErrorMessage } from '@/lib/errorUtils';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Branch } from '../../types';
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

interface RenameBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
}

export function RenameBranchDialog({ isOpen, onClose, branch }: RenameBranchDialogProps) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');
  const [force, setForce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadBranches, refreshRepository } = useRepositoryStore();

  // Reset form when dialog opens or branch changes
  useEffect(() => {
    if (isOpen && branch) {
      setNewName(branch.name);
      setForce(false);
      setError(null);
    }
  }, [isOpen, branch]);

  const validationError = validateBranchName(newName, t);
  const isUnchanged = newName.trim() === branch?.name;

  const handleRename = async () => {
    if (!branch || !newName.trim()) return;

    // If name hasn't changed, just close
    if (isUnchanged) {
      onClose();
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await branchApi.rename(branch.name, newName.trim(), force);
      await Promise.all([loadBranches(), refreshRepository()]);
      onClose();
      toast.success(t('notifications.success.branchRenamed', { name: newName.trim() }));
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      if (errorMsg.includes('already exists') && !force) {
        setError(t('branches.rename.alreadyExists'));
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && !validationError && newName.trim() && !isUnchanged) {
      handleRename();
    }
  };

  if (!branch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle icon={Pencil}>{t('branches.rename.title')}</DialogTitle>

        <DialogBody>
          <div className="dialog-info-box">
            <div className="flex justify-between text-base py-1">
              <span className="text-(--text-secondary)">{t('branches.rename.currentLabel')}</span>
              <span className="text-(--text-primary) font-medium">{branch.name}</span>
            </div>
            {branch.isHead && (
              <div className="flex justify-between text-base py-1">
                <span className="text-(--text-secondary)">{t('branches.rename.statusLabel')}</span>
                <span className="text-(--text-primary) font-medium">
                  {t('branches.rename.currentBranchStatus')}
                </span>
              </div>
            )}
          </div>

          <FormField
            label={t('branches.rename.newNameLabel')}
            htmlFor="new-branch-name"
            error={validationError ?? undefined}
          >
            <Input
              id="new-branch-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('branches.rename.newNamePlaceholder')}
              autoFocus
            />
          </FormField>

          <CheckboxField
            id="force-rename"
            label={t('branches.rename.forceRename')}
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
          <Button
            variant="primary"
            onClick={handleRename}
            disabled={isLoading || !newName.trim() || !!validationError || isUnchanged}
          >
            {isLoading ? t('common.renaming') : t('branches.rename.renameButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
