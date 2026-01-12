import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { X, Pencil, Check } from 'lucide-react';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Branch } from '../../types';

interface RenameBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch | null;
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

export function RenameBranchDialog({ open, onOpenChange, branch }: RenameBranchDialogProps) {
  const [newName, setNewName] = useState('');
  const [force, setForce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadBranches, refreshRepository } = useRepositoryStore();

  // Reset form when dialog opens or branch changes
  useEffect(() => {
    if (open && branch) {
      setNewName(branch.name);
      setForce(false);
      setError(null);
    }
  }, [open, branch]);

  const validationError = validateBranchName(newName);
  const isUnchanged = newName.trim() === branch?.name;

  const handleRename = async () => {
    if (!branch || !newName.trim()) return;

    // If name hasn't changed, just close
    if (isUnchanged) {
      onOpenChange(false);
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await branchApi.rename(branch.name, newName.trim(), force);
      await loadBranches();
      await refreshRepository();
      onOpenChange(false);
    } catch (err) {
      const errorMsg = String(err);
      if (errorMsg.includes('already exists') && !force) {
        setError('A branch with this name already exists. Check "Force rename" to overwrite.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && !validationError && newName.trim() && !isUnchanged) {
      handleRename();
    }
  };

  if (!branch) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content max-w-105">
          <Dialog.Title className="dialog-title">
            <Pencil size={18} />
            Rename Branch
          </Dialog.Title>

          <div className="dialog-body">
            <div className="dialog-info-box">
              <div className="flex justify-between text-[13px] py-1">
                <span className="text-(--text-secondary)">Current name:</span>
                <span className="text-(--text-primary) font-medium">{branch.name}</span>
              </div>
              {branch.is_head && (
                <div className="flex justify-between text-[13px] py-1">
                  <span className="text-(--text-secondary)">Status:</span>
                  <span className="text-(--text-primary) font-medium">Current branch (HEAD)</span>
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="new-branch-name" className="label">
                New Branch Name
              </label>
              <input
                id="new-branch-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter new branch name"
                autoFocus
                className="input"
              />
              {validationError && <p className="text-xs text-error mt-1">{validationError}</p>}
            </div>

            <div className="checkbox-field">
              <Checkbox.Root
                id="force-rename"
                className="checkbox"
                checked={force}
                onCheckedChange={(checked) => setForce(checked === true)}
              >
                <Checkbox.Indicator>
                  <Check size={10} className="text-white" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label htmlFor="force-rename" className="checkbox-label">
                Force rename (overwrite if branch exists)
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
              onClick={handleRename}
              disabled={isLoading || !newName.trim() || !!validationError || isUnchanged}
            >
              {isLoading ? 'Renaming...' : 'Rename Branch'}
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
