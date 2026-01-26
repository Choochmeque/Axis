import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GitMerge } from 'lucide-react';

import { toast, useOperation } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { useRepositoryStore } from '@/store/repositoryStore';
import { mergeApi, branchApi } from '../../services/api';
import { BranchType, type Branch, type MergeResult } from '../../types';
import { cn } from '../../lib/utils';
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
  Textarea,
  CheckboxField,
  Alert,
} from '@/components/ui';

interface MergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMergeComplete?: (result: MergeResult) => void;
  currentBranch: string;
  sourceBranch?: string;
}

export function MergeDialog({
  isOpen,
  onClose,
  onMergeComplete,
  currentBranch,
  sourceBranch,
}: MergeDialogProps) {
  const { t } = useTranslation();
  const setCurrentView = useRepositoryStore((state) => state.setCurrentView);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [noFastForward, setNoFastForward] = useState(false);
  const [squash, setSquash] = useState(false);
  const [commitImmediately, setCommitImmediately] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MergeResult | null>(null);
  const { trackOperation } = useOperation();

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      setError(null);
      setResult(null);
      setSelectedBranch(sourceBranch ?? '');
      setNoFastForward(false);
      setSquash(false);
      setCommitImmediately(true);
      setCustomMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sourceBranch]);

  const loadBranches = async () => {
    try {
      const allBranches = await branchApi.list(true, true);
      // Filter out the current branch
      const otherBranches = allBranches.filter((b) => b.name !== currentBranch && !b.isHead);
      setBranches(otherBranches);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleMerge = async () => {
    if (!selectedBranch) {
      setError(t('merge.dialog.selectBranchError'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const mergeResult = await trackOperation(
        { name: 'Merge', description: `Merging ${selectedBranch}`, category: 'git' },
        () =>
          mergeApi.merge({
            branch: selectedBranch,
            message: customMessage || null,
            noFf: noFastForward,
            ffOnly: false,
            squash,
            noCommit: !commitImmediately,
          })
      );

      if (mergeResult.success && mergeResult.conflicts.length === 0) {
        onMergeComplete?.(mergeResult);
        onClose();
        toast.success(t('notifications.success.mergeComplete'));
      } else {
        setResult(mergeResult);
        if (mergeResult.success) {
          onMergeComplete?.(mergeResult);
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
      await mergeApi.abort();
      setResult(null);
      setError(null);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-125">
        <DialogTitle icon={GitMerge}>{t('merge.dialog.title')}</DialogTitle>

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
              <FormField label={t('merge.dialog.mergeInto')}>
                <div className="py-2.5 px-3 text-sm font-mono text-(--accent-color) bg-(--bg-secondary) rounded-md font-medium">
                  {currentBranch}
                </div>
              </FormField>

              <FormField label={t('merge.dialog.mergeFrom')} htmlFor="merge-branch">
                <Select
                  id="merge-branch"
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                  disabled={isLoading}
                  placeholder={t('merge.dialog.selectBranch')}
                >
                  {branches.map((branch) => (
                    <SelectItem key={branch.fullName} value={branch.name}>
                      {branch.name}
                      {branch.branchType === BranchType.Remote && ` (${branch.branchType})`}
                    </SelectItem>
                  ))}
                </Select>
              </FormField>

              <FormField label={t('merge.dialog.commitMessage')} htmlFor="merge-message">
                <Textarea
                  id="merge-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={`Merge branch '${selectedBranch || '...'}' into ${currentBranch}`}
                  disabled={isLoading}
                  rows={3}
                  className={cn('resize-y min-h-15')}
                />
              </FormField>

              <CheckboxField
                id="no-ff"
                label={t('merge.dialog.noFastForward')}
                description={t('merge.dialog.noFastForwardDesc')}
                checked={noFastForward}
                disabled={isLoading || squash}
                onCheckedChange={setNoFastForward}
              />

              <CheckboxField
                id="squash"
                label={t('merge.dialog.squash')}
                description={t('merge.dialog.squashDesc')}
                checked={squash}
                disabled={isLoading}
                onCheckedChange={(checked) => {
                  setSquash(checked);
                  if (checked) setNoFastForward(false);
                }}
              />

              <CheckboxField
                id="commit-immediately"
                label={t('merge.dialog.commitImmediately')}
                description={t('merge.dialog.commitImmediatelyDesc')}
                checked={commitImmediately}
                disabled={isLoading}
                onCheckedChange={setCommitImmediately}
              />
            </>
          )}

          {result && result.conflicts.length > 0 && (
            <div className="mt-4 p-3 bg-(--bg-secondary) rounded-md">
              <h4 className="m-0 mb-2 text-base font-semibold text-(--text-primary)">
                {t('merge.dialog.conflictedFiles')}
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
              <Button variant="secondary" onClick={handleAbort}>
                {t('merge.dialog.abortMerge')}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setCurrentView('file-status');
                  onClose();
                }}
              >
                {t('merge.dialog.resolveConflicts')}
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
                onClick={handleMerge}
                disabled={isLoading || !selectedBranch}
              >
                {isLoading ? t('merge.dialog.merging') : t('merge.dialog.mergeButton')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
