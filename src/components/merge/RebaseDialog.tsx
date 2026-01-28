import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GitBranch, Loader2 } from 'lucide-react';

import { toast, useOperation } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { rebaseApi, branchApi } from '../../services/api';
import {
  BranchType,
  type Branch,
  type Commit,
  type RebasePreview,
  type RebaseResult,
} from '../../types';
import { RebasePreviewDiagram } from './RebasePreviewDiagram';
import { useInteractiveRebaseStore } from '@/store/interactiveRebaseStore';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Select,
  SelectItem,
  Label,
  Alert,
} from '@/components/ui';

interface RebaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRebaseComplete?: (result: RebaseResult) => void;
  currentBranch: string;
  targetCommit?: Commit;
}

export function RebaseDialog({
  isOpen,
  onClose,
  onRebaseComplete,
  currentBranch,
  targetCommit,
}: RebaseDialogProps) {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RebaseResult | null>(null);
  const [preview, setPreview] = useState<RebasePreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const { trackOperation } = useOperation();
  const openInteractiveRebase = useInteractiveRebaseStore((s) => s.open);
  const isOpeningInteractive = useInteractiveRebaseStore((s) => s.isLoading);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setResult(null);
      setSelectedBranch('');
      setPreview(null);
      if (!targetCommit) {
        loadBranches();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetCommit]);

  // Load preview when target changes
  useEffect(() => {
    const loadPreview = async () => {
      const rebaseTarget = targetCommit?.oid ?? selectedBranch;
      if (!rebaseTarget || !isOpen) {
        setPreview(null);
        return;
      }

      setIsLoadingPreview(true);
      try {
        const previewData = await rebaseApi.getPreview(rebaseTarget);
        setPreview(previewData);
      } catch {
        setPreview(null);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview();
  }, [isOpen, targetCommit, selectedBranch]);

  const loadBranches = async () => {
    try {
      const allBranches = await branchApi.list({ includeLocal: true, includeRemote: true });
      // Filter out the current branch
      const otherBranches = allBranches.filter((b) => b.name !== currentBranch && !b.isHead);
      setBranches(otherBranches);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleRebase = async () => {
    const rebaseTarget = targetCommit ? targetCommit.oid : selectedBranch;

    if (!rebaseTarget) {
      setError(t('merge.rebase.selectBranchError'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rebaseResult = await trackOperation(
        { name: 'Rebase', description: `Rebasing onto ${rebaseTarget}`, category: 'git' },
        () =>
          rebaseApi.rebase({
            onto: rebaseTarget,
            interactive: false,
            preserveMerges: false,
            autosquash: false,
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
        <DialogTitle icon={GitBranch}>{t('merge.rebase.title')}</DialogTitle>

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
              <FormField label={t('merge.rebase.currentBranch')}>
                <div className="py-2.5 px-3 text-sm font-mono text-(--accent-color) bg-(--bg-secondary) rounded-md font-medium">
                  {currentBranch}
                </div>
              </FormField>

              {targetCommit ? (
                <div className="field">
                  <Label>{t('merge.rebase.rebaseOntoCommit')}</Label>
                  <div className="flex items-center gap-3 py-2.5 px-3 border border-(--border-color) rounded-md bg-(--bg-secondary)">
                    <span className="shrink-0 font-mono text-xs font-semibold text-(--accent-color)">
                      {targetCommit.shortOid}
                    </span>
                    <span className="flex-1 text-base text-(--text-primary) overflow-hidden text-ellipsis whitespace-nowrap">
                      {targetCommit.summary}
                    </span>
                  </div>
                </div>
              ) : (
                <FormField label={t('merge.rebase.rebaseOnto')} htmlFor="rebase-branch">
                  <Select
                    id="rebase-branch"
                    value={selectedBranch}
                    onValueChange={setSelectedBranch}
                    disabled={isLoading}
                    placeholder={t('merge.rebase.selectBranch')}
                  >
                    {branches.map((branch) => (
                      <SelectItem key={branch.fullName} value={branch.name}>
                        {branch.name}
                        {branch.branchType === BranchType.Remote && ` (${branch.branchType})`}
                      </SelectItem>
                    ))}
                  </Select>
                </FormField>
              )}

              {isLoadingPreview && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 size={16} className="animate-spin text-(--text-secondary)" />
                  <span className="ml-2 text-sm text-(--text-secondary)">
                    {t('merge.rebase.loadingPreview')}
                  </span>
                </div>
              )}

              {preview && !isLoadingPreview && (
                <RebasePreviewDiagram preview={preview} currentBranch={currentBranch} />
              )}

              <div className="p-3 bg-(--bg-secondary) rounded-md text-base text-(--text-secondary)">
                <p className="m-0 mb-2">
                  {t('merge.rebaseDescription', {
                    source: currentBranch,
                    target: targetCommit ? targetCommit.shortOid : selectedBranch || '...',
                  })}
                </p>
                <p className="m-0 text-xs text-warning">{t('merge.rebase.rebaseWarning')}</p>
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
                variant="secondary"
                onClick={() => {
                  const target = targetCommit?.oid ?? selectedBranch;
                  if (target) {
                    openInteractiveRebase(target);
                    onClose();
                  }
                }}
                disabled={
                  isLoading ||
                  isOpeningInteractive ||
                  (!targetCommit && !selectedBranch) ||
                  !preview
                }
              >
                {isOpeningInteractive ? t('merge.rebase.loading') : t('merge.rebase.interactive')}
              </Button>
              <Button
                variant="primary"
                onClick={handleRebase}
                disabled={isLoading || (!targetCommit && !selectedBranch)}
              >
                {isLoading ? t('common.rebasing') : t('merge.rebase.rebaseButton')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
