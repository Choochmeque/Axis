import { useState, useEffect } from 'react';
import { GitFork } from 'lucide-react';

import { toast, useOperation } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { worktreeApi, branchApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
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
import type { Branch } from '@/types';

interface AddWorktreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddWorktreeDialog({ open, onOpenChange }: AddWorktreeDialogProps) {
  const { loadWorktrees } = useRepositoryStore();
  const { trackOperation } = useOperation();
  const [path, setPath] = useState('');
  const [branch, setBranch] = useState('');
  const [createBranch, setCreateBranch] = useState(false);
  const [baseBranch, setBaseBranch] = useState('');
  const [detach, setDetach] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Load branches for suggestions
  useEffect(() => {
    if (open) {
      branchApi
        .list(true, false)
        .then(setBranches)
        .catch(() => setBranches([]));
    }
  }, [open]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPath('');
      setBranch('');
      setCreateBranch(false);
      setBaseBranch('');
      setDetach(false);
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const handleAdd = async () => {
    if (!path.trim()) {
      setError('Path is required');
      return;
    }

    if (!detach && !branch.trim()) {
      setError('Branch name is required (or select detached HEAD)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await trackOperation(
        { name: 'Add Worktree', description: 'Creating worktree', category: 'git' },
        async () => {
          await worktreeApi.add({
            path: path.trim(),
            branch: branch.trim() || null,
            createBranch,
            base: createBranch && baseBranch.trim() ? baseBranch.trim() : null,
            force: false,
            detach,
          });
          await loadWorktrees();
        }
      );

      handleOpenChange(false);
      toast.success('Worktree created');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle icon={GitFork}>Add Worktree</DialogTitle>

        <DialogBody>
          <p className="text-base text-(--text-secondary) mb-4">
            Create a new worktree linked to this repository. Each worktree can be checked out to a
            different branch.
          </p>

          <FormField
            label="Path"
            htmlFor="worktree-path"
            hint="Absolute path or path relative to repository"
          >
            <Input
              id="worktree-path"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="../my-repo-feature"
              autoFocus
            />
          </FormField>

          <CheckboxField
            id="detach-head"
            label="Detached HEAD (no branch)"
            checked={detach}
            onCheckedChange={(checked) => {
              setDetach(checked);
              if (checked) {
                setCreateBranch(false);
              }
            }}
          />

          {!detach && (
            <>
              <FormField label="Branch" htmlFor="worktree-branch">
                <Input
                  id="worktree-branch"
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="feature/my-feature"
                  list="branch-suggestions"
                />
                <datalist id="branch-suggestions">
                  {branches.map((b) => (
                    <option key={b.name} value={b.name} />
                  ))}
                </datalist>
              </FormField>

              <CheckboxField
                id="create-branch"
                label="Create new branch"
                checked={createBranch}
                onCheckedChange={setCreateBranch}
              />

              {createBranch && (
                <FormField
                  label="Base (optional)"
                  htmlFor="worktree-base"
                  hint="Branch or commit to base new branch on"
                >
                  <Input
                    id="worktree-base"
                    type="text"
                    value={baseBranch}
                    onChange={(e) => setBaseBranch(e.target.value)}
                    placeholder="main"
                  />
                </FormField>
              )}
            </>
          )}

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
            onClick={handleAdd}
            disabled={isLoading || !path.trim() || (!detach && !branch.trim())}
          >
            {isLoading ? 'Creating...' : 'Add Worktree'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
