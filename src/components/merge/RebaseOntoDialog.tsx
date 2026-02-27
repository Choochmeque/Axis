import { GitBranch, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  FormField,
  Select,
  SelectItem,
} from '@/components/ui';
import { toast, useOperation } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { branchApi, commitApi, rebaseApi } from '@/services/api';
import { type Branch, BranchType, type Commit, type RebaseResult } from '@/types';

interface RebaseOntoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRebaseComplete?: (result: RebaseResult) => void;
  currentBranch: string;
  newBase: string;
}

export function RebaseOntoDialog({
  isOpen,
  onClose,
  onRebaseComplete,
  currentBranch,
  newBase,
}: RebaseOntoDialogProps) {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedOldBase, setSelectedOldBase] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RebaseResult | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { trackOperation } = useOperation();

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setResult(null);
      setSelectedOldBase('');
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [allBranches, recentCommits] = await Promise.all([
        branchApi.list({ includeLocal: true, includeRemote: true, limit: null }),
        commitApi.getHistory({ limit: 50, skip: null, fromRef: null }),
      ]);
      // Filter out the current branch and the new base
      const otherBranches = allBranches.filter(
        (b: Branch) => b.name !== currentBranch && b.name !== newBase && !b.isHead
      );
      setBranches(otherBranches);
      setCommits(recentCommits);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleRebaseOnto = async () => {
    if (!selectedOldBase) {
      setError(t('merge.rebaseOnto.selectOldBaseError'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rebaseResult = await trackOperation(
        {
          name: 'Rebase Onto',
          description: `Rebasing commits after ${selectedOldBase} onto ${newBase}`,
          category: 'git',
        },
        () =>
          rebaseApi.rebaseOnto({
            newBase,
            oldBase: selectedOldBase,
            branch: null,
          })
      );

      if (rebaseResult.success && rebaseResult.conflicts.length === 0) {
        onRebaseComplete?.(rebaseResult);
        onClose();
        toast.success(t('notifications.success.rebaseComplete'));
      } else {
        setResult(rebaseResult);
        if (rebaseResult.success) {
          onRebaseComplete?.(rebaseResult);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbort = async () => {
    try {
      await rebaseApi.abort();
      setResult(null);
      setError(null);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const continueResult = await rebaseApi.continue();
      if (continueResult.success && continueResult.conflicts.length === 0) {
        onRebaseComplete?.(continueResult);
        onClose();
        toast.success(t('notifications.success.rebaseComplete'));
      } else {
        setResult(continueResult);
        if (continueResult.success) {
          onRebaseComplete?.(continueResult);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      const skipResult = await rebaseApi.skip();
      if (skipResult.success && skipResult.conflicts.length === 0) {
        onRebaseComplete?.(skipResult);
        onClose();
        toast.success(t('notifications.success.rebaseComplete'));
      } else {
        setResult(skipResult);
        if (skipResult.success) {
          onRebaseComplete?.(skipResult);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-125">
        <DialogTitle icon={GitBranch}>{t('merge.rebaseOnto.title')}</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          {result && (
            <Alert variant="warning" className="mb-4">
              {result.message}
            </Alert>
          )}

          {!result && (
            <>
              <FormField label={t('merge.rebaseOnto.currentBranch')}>
                <div className="py-2.5 px-3 text-sm font-mono text-(--accent-color) bg-(--bg-secondary) rounded-md font-medium">
                  {currentBranch}
                </div>
              </FormField>

              <FormField label={t('merge.rebaseOnto.newBase')}>
                <div className="py-2.5 px-3 text-sm font-mono text-(--accent-color) bg-(--bg-secondary) rounded-md font-medium">
                  {newBase}
                </div>
              </FormField>

              {isLoadingData ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 size={16} className="animate-spin text-(--text-secondary)" />
                  <span className="ml-2 text-sm text-(--text-secondary)">
                    {t('common.loading')}
                  </span>
                </div>
              ) : (
                <FormField
                  label={t('merge.rebaseOnto.oldBase')}
                  htmlFor="old-base"
                  hint={t('merge.rebaseOnto.oldBaseHint')}
                >
                  <Select
                    id="old-base"
                    value={selectedOldBase}
                    onValueChange={setSelectedOldBase}
                    disabled={isLoading}
                    placeholder={t('merge.rebaseOnto.selectOldBase')}
                  >
                    {branches.map((branch) => (
                      <SelectItem key={branch.fullName} value={branch.name}>
                        {branch.name}
                        {branch.branchType === BranchType.Remote && ` (${branch.branchType})`}
                      </SelectItem>
                    ))}
                    {commits.slice(0, 20).map((commit) => (
                      <SelectItem key={commit.oid} value={commit.oid}>
                        <span className="font-mono text-xs">{commit.shortOid}</span>{' '}
                        <span className="truncate">{commit.summary}</span>
                      </SelectItem>
                    ))}
                  </Select>
                </FormField>
              )}

              <div className="p-3 bg-(--bg-secondary) rounded-md text-base text-(--text-secondary)">
                <p className="m-0 mb-2">
                  {t('merge.rebaseOnto.description', {
                    currentBranch,
                    oldBase: selectedOldBase || '...',
                    newBase,
                  })}
                </p>
                <p className="m-0 text-xs text-warning">{t('merge.rebaseOnto.warning')}</p>
              </div>
            </>
          )}

          {result && result.conflicts.length > 0 && (
            <div className="mt-4 p-3 bg-(--bg-secondary) rounded-md">
              <h4 className="m-0 mb-2 text-base font-semibold text-(--text-primary)">
                {t('merge.rebase.conflictedFiles')}
              </h4>
              <ul className="m-0 p-0 list-none">
                {result.conflicts.map((conflict) => (
                  <li
                    key={conflict.path}
                    className="py-1.5 text-base font-mono text-warning border-b border-(--border-color) last:border-b-0"
                  >
                    {conflict.path}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {result ? (
            <>
              <Button variant="destructive" onClick={handleAbort}>
                {t('common.abort')}
              </Button>
              <Button variant="secondary" onClick={handleSkip} disabled={isLoading}>
                {t('common.skipCommit')}
              </Button>
              <Button variant="primary" onClick={handleContinue} disabled={isLoading}>
                {t('common.continue')}
              </Button>
            </>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="secondary" disabled={isLoading}>
                  {t('common.cancel')}
                </Button>
              </DialogClose>
              <Button
                variant="primary"
                onClick={handleRebaseOnto}
                disabled={isLoading || !selectedOldBase}
              >
                {isLoading ? t('common.rebasing') : t('merge.rebaseOnto.rebaseButton')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
