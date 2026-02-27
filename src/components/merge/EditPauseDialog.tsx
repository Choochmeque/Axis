import { Loader2, Pencil } from 'lucide-react';
import { useState } from 'react';
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
} from '@/components/ui';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { rebaseApi } from '@/services/api';
import { useRebaseProgressStore } from '@/store/rebaseProgressStore';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useStagingStore } from '@/store/stagingStore';

export function EditPauseDialog() {
  const { t } = useTranslation();
  const { editPauseDialogOpen, closeEditPauseDialog, progress, loadProgress } =
    useRebaseProgressStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    setIsSubmitting(true);
    try {
      const result = await rebaseApi.continue();
      if (result.success) {
        toast.success(t('merge.editPause.continued'));
        closeEditPauseDialog();
        // Refresh data
        await Promise.all([
          useRepositoryStore.getState().loadCommits(),
          useRepositoryStore.getState().loadStatus(),
          useStagingStore.getState().loadStatus(),
          useRepositoryStore.getState().loadBranches(),
        ]);
        // Check if there are more paused actions
        await loadProgress();
      } else if (result.conflicts.length > 0) {
        toast.warning(t('merge.editPause.continueFailed'));
        closeEditPauseDialog();
        await useStagingStore.getState().loadStatus();
      } else {
        toast.error(t('merge.editPause.continueFailed'), result.message);
      }
    } catch (err) {
      toast.error(t('merge.editPause.continueFailed'), getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAbort = async () => {
    setIsSubmitting(true);
    try {
      await rebaseApi.abort();
      toast.success(t('merge.editPause.aborted'));
      closeEditPauseDialog();
      // Refresh data
      await Promise.all([
        useRepositoryStore.getState().loadCommits(),
        useRepositoryStore.getState().loadStatus(),
        useStagingStore.getState().loadStatus(),
        useRepositoryStore.getState().loadBranches(),
      ]);
    } catch (err) {
      toast.error(t('merge.editPause.abortFailed'), getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      closeEditPauseDialog();
    }
  };

  return (
    <Dialog open={editPauseDialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-125">
        <DialogTitle icon={Pencil}>{t('merge.editPause.title')}</DialogTitle>

        <DialogBody>
          {progress && (
            <div className="mb-4 text-xs text-(--text-secondary)">
              {t('merge.editPause.progress', {
                current: progress.currentStep,
                total: progress.totalSteps,
              })}
              {progress.stoppedSha && (
                <code className="ml-2 px-1 py-0.5 bg-(--bg-secondary) rounded">
                  {progress.stoppedSha.slice(0, 7)}
                </code>
              )}
            </div>
          )}

          <Alert variant="warning" className="mb-4">
            {t('merge.editPause.paused')}
          </Alert>

          <p className="text-sm text-(--text-secondary) mb-3">{t('merge.editPause.description')}</p>

          <div className="text-sm text-(--text-secondary)">
            <p className="font-medium mb-1">{t('merge.editPause.instructions')}</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>{t('merge.editPause.step1')}</li>
              <li>{t('merge.editPause.step2')}</li>
              <li>{t('merge.editPause.step3')}</li>
            </ol>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={handleAbort} disabled={isSubmitting}>
            {t('merge.editPause.abortRebase')}
          </Button>
          <DialogClose asChild>
            <Button variant="ghost" disabled={isSubmitting}>
              {t('common.close')}
            </Button>
          </DialogClose>
          <Button onClick={handleContinue} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            {t('merge.editPause.continue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
