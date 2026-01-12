import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { X, GitBranch, Check } from 'lucide-react';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';

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
  if (/[~^:?*\[\]\\@{]/.test(name)) return 'Branch name contains invalid characters';
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
  const localBranches = branches.filter((b) => b.branch_type === 'local');

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
    } catch (err) {
      setError(String(err));
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content max-w-105">
          <Dialog.Title className="dialog-title">
            <GitBranch size={18} />
            Create Branch
          </Dialog.Title>

          <div className="dialog-body">
            <div className="field">
              <label htmlFor="branch-name" className="label">
                Branch Name
              </label>
              <input
                id="branch-name"
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="feature/my-feature"
                autoFocus
                className="input"
              />
              {validationError && (
                <p className="text-xs text-error mt-1">{validationError}</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="base-branch" className="label">
                Starting Point
              </label>
              <select
                id="base-branch"
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className="input"
              >
                <option value="">Current HEAD</option>
                {startPoint && !localBranches.some((b) => b.name === startPoint) && (
                  <option value={startPoint}>
                    {startPoint.length > 8 ? startPoint.slice(0, 8) : startPoint} (commit)
                  </option>
                )}
                {localBranches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name} {branch.is_head && '(current)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="checkbox-field">
              <Checkbox.Root
                id="checkout"
                className="checkbox"
                checked={checkout}
                onCheckedChange={(checked) => setCheckout(checked === true)}
              >
                <Checkbox.Indicator>
                  <Check size={10} className="text-white" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label htmlFor="checkout" className="checkbox-label">
                Checkout new branch
              </label>
            </div>

            {error && <div className="alert-inline alert-error mt-3">{error}</div>}
          </div>

          <div className="dialog-footer">
            <Dialog.Close asChild>
              <button className="btn btn-secondary">Cancel</button>
            </Dialog.Close>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={isLoading || !branchName.trim() || !!validationError}
            >
              {isLoading ? 'Creating...' : 'Create Branch'}
            </button>
          </div>

          <Dialog.Close asChild>
            <button className="btn-close absolute top-3 right-3" aria-label="Close">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
