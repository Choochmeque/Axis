import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
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
  Alert,
} from '@/components/ui';

interface CheckoutBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutBranchDialog({ open, onOpenChange }: CheckoutBranchDialogProps) {
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { branches, loadBranches, refreshRepository } = useRepositoryStore();
  const localBranches = branches.filter((b) => b.branch_type === 'local');
  const remoteBranches = branches.filter((b) => b.branch_type === 'remote');
  const currentBranch = branches.find((b) => b.is_head);

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
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>
          <GitBranch size={18} />
          Checkout Branch
        </DialogTitle>

        <DialogBody>
          {currentBranch && (
            <div className="dialog-info-box">
              <div className="flex justify-between text-[13px] py-1">
                <span className="text-(--text-secondary)">Current branch:</span>
                <span className="text-(--text-primary) font-medium">{currentBranch.name}</span>
              </div>
            </div>
          )}

          <FormField label="Select Branch" htmlFor="branch-select">
            <Select
              id="branch-select"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">-- Select a branch --</option>

              {localBranches.length > 0 && (
                <optgroup label="Local Branches">
                  {localBranches
                    .filter((b) => !b.is_head)
                    .map((branch) => (
                      <option key={branch.name} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                </optgroup>
              )}

              {remoteBranches.length > 0 && (
                <optgroup label="Remote Branches">
                  {remoteBranches.map((branch) => (
                    <option key={branch.full_name} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </optgroup>
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
