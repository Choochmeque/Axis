import { GitBranch } from 'lucide-react';
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
  FormField,
  Input,
  Select,
  SelectItem,
} from '@/components/ui';
import { toast } from '@/hooks';
import { validateBranchName } from '@/lib/branchValidation';
import { getErrorMessage } from '@/lib/errorUtils';
import { testId } from '@/lib/utils';
import { BranchType } from '@/types';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';

interface CreateBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startPoint?: string;
}

export function CreateBranchDialog({ open, onOpenChange, startPoint }: CreateBranchDialogProps) {
  const { t } = useTranslation();
  const [branchName, setBranchName] = useState('');
  const [baseBranch, setBaseBranch] = useState(startPoint || '');
  const [checkout, setCheckout] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { branches, loadBranches, refreshRepository } = useRepositoryStore();
  const localBranches = branches.filter((b) => b.branchType === BranchType.Local);

  // Update baseBranch when startPoint changes (e.g., dialog reopens with different commit)
  useEffect(() => {
    if (open && startPoint) {
      setBaseBranch(startPoint);
    }
  }, [open, startPoint]);

  const validationError = validateBranchName(branchName, t);

  const handleCreate = async () => {
    if (!branchName.trim()) {
      setError(t('branches.validation.nameRequired'));
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await branchApi.create(branchName.trim(), {
        startPoint: baseBranch || null,
        force: false,
        track: null,
      });

      if (checkout) {
        await branchApi.checkout(branchName.trim(), { create: false, force: false, track: null });
      }

      await loadBranches();
      await refreshRepository();

      setBranchName('');
      setBaseBranch('');
      onOpenChange(false);
      toast.success(t('notifications.success.branchCreated', { name: branchName.trim() }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && !validationError && branchName.trim()) {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle icon={GitBranch}>{t('branches.create.title')}</DialogTitle>

        <DialogBody>
          <FormField
            label={t('branches.create.nameLabel')}
            htmlFor="branch-name"
            error={validationError ?? undefined}
          >
            <Input
              id="branch-name"
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('branches.create.namePlaceholder')}
              autoFocus
              {...testId('e2e-branch-name-input')}
            />
          </FormField>

          <FormField label={t('branches.create.startingPointLabel')} htmlFor="base-branch">
            <Select
              id="base-branch"
              value={baseBranch}
              onValueChange={setBaseBranch}
              placeholder={t('branches.create.startingPointPlaceholder')}
            >
              {startPoint && !localBranches.some((b) => b.name === startPoint) && (
                <SelectItem value={startPoint}>
                  {startPoint.length > 8 ? startPoint.slice(0, 8) : startPoint}{' '}
                  {t('branches.create.commitSuffix')}
                </SelectItem>
              )}
              {localBranches.map((branch) => (
                <SelectItem key={branch.name} value={branch.name}>
                  {branch.name} {branch.isHead && t('branches.create.currentSuffix')}
                </SelectItem>
              ))}
            </Select>
          </FormField>

          <CheckboxField
            id="checkout"
            label={t('branches.create.checkoutNewBranch')}
            checked={checkout}
            onCheckedChange={setCheckout}
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
            onClick={handleCreate}
            disabled={isLoading || !branchName.trim() || !!validationError}
            {...testId('e2e-create-branch-btn')}
          >
            {isLoading ? t('common.creating') : t('branches.create.createButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
