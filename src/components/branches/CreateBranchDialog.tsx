import { useState, useEffect } from 'react';
import { GitBranch } from 'lucide-react';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
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
  Input,
  Select,
  CheckboxField,
  Alert,
} from '@/components/ui';
import { BranchType } from '@/types';

interface CreateBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startPoint?: string;
}

// Validate branch name according to git rules
function validateBranchName(name: string): string | null {
  if (!name.trim()) return null; // Empty is handled separately

  if (name.includes(' ')) return 'Branch name cannot contain spaces';
  if (name.startsWith('.')) return 'Branch name cannot start with a dot';
  if (name.endsWith('/')) return 'Branch name cannot end with a slash';
  if (name.endsWith('.lock')) return 'Branch name cannot end with .lock';
  if (name.includes('..')) return 'Branch name cannot contain consecutive dots';
  if (/[~^:?*[\]\\@{]/.test(name)) return 'Branch name contains invalid characters';
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(name)) return 'Branch name contains control characters';

  return null;
}

export function CreateBranchDialog({ open, onOpenChange, startPoint }: CreateBranchDialogProps) {
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

  const validationError = validateBranchName(branchName);

  const handleCreate = async () => {
    if (!branchName.trim()) {
      setError('Branch name is required');
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await branchApi.create(branchName.trim(), baseBranch || undefined, false);

      if (checkout) {
        await branchApi.checkout(branchName.trim());
      }

      await loadBranches();
      await refreshRepository();

      setBranchName('');
      setBaseBranch('');
      onOpenChange(false);
      toast.success(`Branch "${branchName.trim()}" created`);
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
        <DialogTitle icon={GitBranch}>Create Branch</DialogTitle>

        <DialogBody>
          <FormField label="Branch Name" htmlFor="branch-name" error={validationError ?? undefined}>
            <Input
              id="branch-name"
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="feature/my-feature"
              autoFocus
            />
          </FormField>

          <FormField label="Starting Point" htmlFor="base-branch">
            <Select
              id="base-branch"
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
            >
              <option value="">Current HEAD</option>
              {startPoint && !localBranches.some((b) => b.name === startPoint) && (
                <option value={startPoint}>
                  {startPoint.length > 8 ? startPoint.slice(0, 8) : startPoint} (commit)
                </option>
              )}
              {localBranches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name} {branch.isHead && '(current)'}
                </option>
              ))}
            </Select>
          </FormField>

          <CheckboxField
            id="checkout"
            label="Checkout new branch"
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
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={isLoading || !branchName.trim() || !!validationError}
          >
            {isLoading ? 'Creating...' : 'Create Branch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
