import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import { branchApi } from '../../services/api';
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutBranchDialog({ open, onOpenChange }: CheckoutBranchDialogProps) {
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { branches, loadBranches, refreshRepository } = useRepositoryStore();
  const localBranches = branches.filter((b) => b.branchType === BranchType.Local);
  const remoteBranches = branches.filter((b) => b.branchType === BranchType.Remote);
  const currentBranch = branches.find((b) => b.isHead);

  const handleCheckout = async () => {
    if (!selectedBranch) {
      setError('Please select a branch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if it's a remote branch
      const isRemote = selectedBranch.includes('/');

      if (isRemote) {
        // Extract remote name and branch name
        const parts = selectedBranch.split('/');
        const remoteName = parts[0];
        const branchName = parts.slice(1).join('/');
        await branchApi.checkoutRemote(remoteName, branchName);
      } else {
        await branchApi.checkout(selectedBranch);
      }

      await loadBranches();
      await refreshRepository();

      setSelectedBranch('');
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle icon={GitBranch}>Checkout Branch</DialogTitle>

        <DialogBody>
          {currentBranch && (
            <div className="dialog-info-box">
              <div className="flex justify-between text-base py-1">
                <span className="text-(--text-secondary)">Current branch:</span>
                <span className="text-(--text-primary) font-medium">{currentBranch.name}</span>
              </div>
            </div>
          )}

          <FormField label="Select Branch" htmlFor="branch-select">
            <Select
              id="branch-select"
              value={selectedBranch}
              onValueChange={setSelectedBranch}
              placeholder="-- Select a branch --"
            >
              {localBranches.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Local Branches</SelectLabel>
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
                  <SelectLabel>Remote Branches</SelectLabel>
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
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleCheckout}
            disabled={isLoading || !selectedBranch}
          >
            {isLoading ? 'Switching...' : 'Checkout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
