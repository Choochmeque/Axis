import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, GitBranch } from 'lucide-react';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import { cn } from '../../lib/utils';

interface CreateBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startPoint?: string;
}

const contentClass =
  'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-(--bg-primary) rounded-lg shadow-xl w-[90vw] max-w-105 max-h-[85vh] p-0 overflow-y-auto z-10000 animate-in fade-in zoom-in-95 duration-150';
const titleClass =
  'flex items-center gap-2 py-4 px-5 m-0 text-base font-semibold text-(--text-primary) border-b border-(--border-color)';
const bodyClass = 'p-5';
const footerClass = 'flex justify-end gap-2 py-4 px-5 border-t border-(--border-color)';
const closeClass =
  'absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)';
const fieldClass = 'mb-4 last:mb-0';
const labelClass = 'block mb-1.5 text-[13px] font-medium text-(--text-secondary)';
const inputClass =
  'w-full py-2 px-3 text-sm bg-(--bg-secondary) border border-(--border-color) rounded text-(--text-primary) outline-none transition-colors focus:border-(--accent-color)';
const btnClass = 'py-2 px-4 text-[13px] font-medium rounded cursor-pointer transition-colors';

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

  const handleCreate = async () => {
    if (!branchName.trim()) {
      setError('Branch name is required');
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
    if (e.key === 'Enter' && !isLoading) {
      handleCreate();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className={contentClass}>
          <Dialog.Title className={titleClass}>
            <GitBranch size={18} />
            Create Branch
          </Dialog.Title>

          <div className={bodyClass}>
            <div className={fieldClass}>
              <label htmlFor="branch-name" className={labelClass}>
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
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <label htmlFor="base-branch" className={labelClass}>
                Starting Point
              </label>
              <select
                id="base-branch"
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className={inputClass}
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

            <div className={cn(fieldClass, 'flex items-center gap-2')}>
              <input
                id="checkout"
                type="checkbox"
                checked={checkout}
                onChange={(e) => setCheckout(e.target.checked)}
                className="w-4 h-4 accent-(--accent-color)"
              />
              <label htmlFor="checkout" className="mb-0 text-(--text-primary)">
                Checkout new branch
              </label>
            </div>

            {error && (
              <div className="mt-3 py-2 px-3 bg-error/10 border border-error rounded text-error text-[13px]">
                {error}
              </div>
            )}
          </div>

          <div className={footerClass}>
            <Dialog.Close asChild>
              <button
                className={cn(
                  btnClass,
                  'bg-transparent border border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                )}
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              className={cn(
                btnClass,
                'bg-(--accent-color) border border-(--accent-color) text-white hover:not-disabled:bg-(--accent-color-hover) disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              onClick={handleCreate}
              disabled={isLoading || !branchName.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Branch'}
            </button>
          </div>

          <Dialog.Close asChild>
            <button className={closeClass} aria-label="Close">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
