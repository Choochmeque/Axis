import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, GitBranch } from 'lucide-react';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import './BranchDialog.css';

interface CreateBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startPoint?: string;
}

export function CreateBranchDialog({
  open,
  onOpenChange,
  startPoint,
}: CreateBranchDialogProps) {
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

  const handleCreate = async () => {
    if (!branchName.trim()) {
      setError('Branch name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await branchApi.create(
        branchName.trim(),
        baseBranch || undefined,
        false
      );

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
    if (e.key === 'Enter' && !isLoading) {
      handleCreate();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">
            <GitBranch size={18} />
            Create Branch
          </Dialog.Title>

          <div className="dialog-body">
            <div className="form-field">
              <label htmlFor="branch-name">Branch Name</label>
              <input
                id="branch-name"
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="feature/my-feature"
                autoFocus
              />
            </div>

            <div className="form-field">
              <label htmlFor="base-branch">Starting Point</label>
              <select
                id="base-branch"
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
              >
                <option value="">Current HEAD</option>
                {startPoint && !localBranches.some(b => b.name === startPoint) && (
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

            <div className="form-field checkbox-field">
              <input
                id="checkout"
                type="checkbox"
                checked={checkout}
                onChange={(e) => setCheckout(e.target.checked)}
              />
              <label htmlFor="checkout">Checkout new branch</label>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="dialog-footer">
            <Dialog.Close asChild>
              <button className="dialog-button secondary">Cancel</button>
            </Dialog.Close>
            <button
              className="dialog-button primary"
              onClick={handleCreate}
              disabled={isLoading || !branchName.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Branch'}
            </button>
          </div>

          <Dialog.Close asChild>
            <button className="dialog-close" aria-label="Close">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
