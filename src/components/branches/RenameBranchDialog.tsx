import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { branchApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Branch } from '../../types';
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
  CheckboxField,
  Alert,
} from '@/components/ui';

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
      toast.success(`Branch renamed to "${newName.trim()}"`);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle icon={Pencil}>Rename Branch</DialogTitle>

        <DialogBody>
          <div className="dialog-info-box">
            <div className="flex justify-between text-base py-1">
              <span className="text-(--text-secondary)">Current name:</span>
              <span className="text-(--text-primary) font-medium">{branch.name}</span>
            </div>
            {branch.isHead && (
              <div className="flex justify-between text-base py-1">
                <span className="text-(--text-secondary)">Status:</span>
                <span className="text-(--text-primary) font-medium">Current branch (HEAD)</span>
              </div>
            )}
          </div>

          <FormField
            label="New Branch Name"
            htmlFor="new-branch-name"
            error={validationError ?? undefined}
          >
            <Input
              id="new-branch-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter new branch name"
              autoFocus
            />
          </FormField>

          <CheckboxField
            id="force-rename"
            label="Force rename (overwrite if branch exists)"
            checked={force}
            onCheckedChange={setForce}
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
            onClick={handleRename}
            disabled={isLoading || !newName.trim() || !!validationError || isUnchanged}
          >
            {isLoading ? 'Renaming...' : 'Rename Branch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
