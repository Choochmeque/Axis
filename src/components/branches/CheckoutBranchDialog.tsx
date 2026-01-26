import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GitBranch } from 'lucide-react';
import { useRepositoryStore } from '../../store/repositoryStore';
import { getErrorMessage } from '@/lib/errorUtils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Select,
  SelectItem,
  SelectGroup,
  SelectLabel,
  Alert,
} from '@/components/ui';
import { BranchType } from '@/types';

interface CheckoutBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CheckoutBranchDialog({ isOpen, onClose }: CheckoutBranchDialogProps) {
  const { t } = useTranslation();
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { branches, checkoutBranch } = useRepositoryStore();
  const localBranches = branches.filter((b) => b.branchType === BranchType.Local);
  const remoteBranches = branches.filter((b) => b.branchType === BranchType.Remote);
  const currentBranch = branches.find((b) => b.isHead);

  const handleCheckout = async () => {
    if (!selectedBranch) {
      setError(t('branches.checkout.selectBranchError'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isRemote = selectedBranch.includes('/');
      const success = await checkoutBranch(selectedBranch, isRemote);

      if (success) {
        setSelectedBranch('');
        onClose();
      }
      // If not successful, the store will show the conflict dialog
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle icon={GitBranch}>{t('branches.checkout.title')}</DialogTitle>

        <DialogBody>
          {currentBranch && (
            <div className="dialog-info-box">
              <div className="flex justify-between text-base py-1">
                <span className="text-(--text-secondary)">
                  {t('branches.checkout.currentBranchLabel')}
                </span>
                <span className="text-(--text-primary) font-medium">{currentBranch.name}</span>
              </div>
            </div>
          )}

          <FormField label={t('branches.checkout.selectBranchLabel')} htmlFor="branch-select">
            <Select
              id="branch-select"
              value={selectedBranch}
              onValueChange={setSelectedBranch}
              placeholder={t('branches.checkout.selectBranchPlaceholder')}
            >
              {localBranches.length > 0 && (
                <SelectGroup>
                  <SelectLabel>{t('branches.checkout.localBranches')}</SelectLabel>
                  {localBranches
                    .filter((b) => !b.isHead)
                    .map((branch) => (
                      <SelectItem key={branch.name} value={branch.name}>
                        {branch.name}
                      </SelectItem>
                    ))}
                </SelectGroup>
              )}

              {remoteBranches.length > 0 && (
                <SelectGroup>
                  <SelectLabel>{t('branches.checkout.remoteBranches')}</SelectLabel>
                  {remoteBranches.map((branch) => (
                    <SelectItem key={branch.fullName} value={branch.name}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </Select>
          </FormField>

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
            onClick={handleCheckout}
            disabled={isLoading || !selectedBranch}
          >
            {isLoading ? t('branches.checkout.switching') : t('branches.checkout.checkoutButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
