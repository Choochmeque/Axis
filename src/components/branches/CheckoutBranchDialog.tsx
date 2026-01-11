import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, GitBranch } from 'lucide-react';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import { cn } from '../../lib/utils';

interface CheckoutBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const overlayClass = 'fixed inset-0 bg-black/50 z-9999 animate-in fade-in duration-150';
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
const infoBoxClass = 'p-3 bg-(--bg-secondary) rounded mb-4';

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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content className={contentClass}>
          <Dialog.Title className={titleClass}>
            <GitBranch size={18} />
            Checkout Branch
          </Dialog.Title>

          <div className={bodyClass}>
            {currentBranch && (
              <div className={infoBoxClass}>
                <div className="flex justify-between text-[13px] py-1">
                  <span className="text-(--text-secondary)">Current branch:</span>
                  <span className="text-(--text-primary) font-medium">{currentBranch.name}</span>
                </div>
              </div>
            )}

            <div className={fieldClass}>
              <label htmlFor="branch-select" className={labelClass}>
                Select Branch
              </label>
              <select
                id="branch-select"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className={inputClass}
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
              </select>
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
              onClick={handleCheckout}
              disabled={isLoading || !selectedBranch}
            >
              {isLoading ? 'Switching...' : 'Checkout'}
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
