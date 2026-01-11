import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Branch } from '../../types';
import { cn } from '../../lib/utils';

interface DeleteBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch;
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
const btnClass = 'py-2 px-4 text-[13px] font-medium rounded cursor-pointer transition-colors';
const infoBoxClass = 'p-3 bg-(--bg-secondary) rounded mb-4';

export function DeleteBranchDialog({ open, onOpenChange, branch }: DeleteBranchDialogProps) {
  const [force, setForce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadBranches, refreshRepository } = useRepositoryStore();

  const handleDelete = async () => {
    if (!branch) return;

    setIsLoading(true);
    setError(null);

    try {
      await branchApi.delete(branch.name, force);
      await loadBranches();
      await refreshRepository();
      onOpenChange(false);
    } catch (err) {
      const errorMsg = String(err);
      if (errorMsg.includes('not fully merged') && !force) {
        setError('Branch is not fully merged. Check "Force delete" to delete anyway.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!branch) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content className={contentClass}>
          <Dialog.Title className={titleClass}>
            <Trash2 size={18} />
            Delete Branch
          </Dialog.Title>

          <div className={bodyClass}>
            <div className="flex items-center gap-2 py-2 px-3 mb-4 bg-warning/10 border border-warning rounded text-warning text-[13px]">
              <AlertTriangle size={16} className="shrink-0" />
              This action cannot be undone.
            </div>

            <div className={infoBoxClass}>
              <div className="flex justify-between text-[13px] py-1">
                <span className="text-(--text-secondary)">Branch:</span>
                <span className="text-(--text-primary) font-medium">{branch.name}</span>
              </div>
              <div className="flex justify-between text-[13px] py-1">
                <span className="text-(--text-secondary)">Last commit:</span>
                <span className="text-(--text-primary) font-medium">
                  {branch.last_commit_summary}
                </span>
              </div>
            </div>

            <p className="text-sm text-(--text-secondary) mb-4">
              Are you sure you want to delete the branch "{branch.name}"?
            </p>

            <div className={cn(fieldClass, 'flex items-center gap-2')}>
              <input
                id="force-delete"
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                className="w-4 h-4 accent-(--accent-color)"
              />
              <label htmlFor="force-delete" className="mb-0 text-(--text-primary)">
                Force delete (even if not fully merged)
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
                'bg-error border border-error text-white hover:not-disabled:bg-[#c0392b] disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Branch'}
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
