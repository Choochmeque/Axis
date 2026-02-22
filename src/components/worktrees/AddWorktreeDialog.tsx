import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        .list({ includeLocal: true, includeRemote: false, limit: null })
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
      setError(t('worktrees.add.pathRequired'));
      return;
    }

    if (!detach && !branch.trim()) {
      setError(t('worktrees.add.branchRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await trackOperation(
        {
          name: t('worktrees.operations.add'),
          description: t('worktrees.operations.addDescription'),
          category: 'git',
        },
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
      toast.success(t('worktrees.notifications.created'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle icon={GitFork}>{t('worktrees.add.title')}</DialogTitle>

        <DialogBody>
          <p className="text-base text-(--text-secondary) mb-4">{t('worktrees.add.description')}</p>

          <FormField
            label={t('worktrees.add.pathLabel')}
            htmlFor="worktree-path"
            hint={t('worktrees.add.pathHint')}
          >
            <Input
              id="worktree-path"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder={t('worktrees.add.pathPlaceholder')}
              autoFocus
            />
          </FormField>

          <CheckboxField
            id="detach-head"
            label={t('worktrees.add.detachLabel')}
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
              <FormField label={t('worktrees.add.branchLabel')} htmlFor="worktree-branch">
                <Input
                  id="worktree-branch"
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder={t('worktrees.add.branchPlaceholder')}
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
                label={t('worktrees.add.createBranchLabel')}
                checked={createBranch}
                onCheckedChange={setCreateBranch}
              />

              {createBranch && (
                <FormField
                  label={t('worktrees.add.baseLabel')}
                  htmlFor="worktree-base"
                  hint={t('worktrees.add.baseHint')}
                >
                  <Input
                    id="worktree-base"
                    type="text"
                    value={baseBranch}
                    onChange={(e) => setBaseBranch(e.target.value)}
                    placeholder={t('worktrees.add.basePlaceholder')}
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
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={isLoading || !path.trim() || (!detach && !branch.trim())}
          >
            {isLoading ? t('worktrees.add.creating') : t('worktrees.add.addButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
