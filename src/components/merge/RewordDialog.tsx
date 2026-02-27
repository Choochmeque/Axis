import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Loader2 } from 'lucide-react';

import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { useRebaseProgressStore } from '@/store/rebaseProgressStore';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useStagingStore } from '@/store/stagingStore';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  Textarea,
} from '@/components/ui';

export function RewordDialog() {
  const { t } = useTranslation();
  const {
    rewordDialogOpen,
    closeRewordDialog,
    progress,
    isLoading,
    continueWithMessage,
    loadProgress,
  } = useRebaseProgressStore();

  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill with original commit message when dialog opens
  useEffect(() => {
    if (rewordDialogOpen && progress?.commitMessage) {
      setMessage(progress.commitMessage);
    }
  }, [rewordDialogOpen, progress?.commitMessage]);

  const handleContinue = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      const success = await continueWithMessage(message);
      if (success) {
        toast.success(t('merge.reword.success'));
        closeRewordDialog();
        setMessage('');
        // Refresh data
        await Promise.all([
          useRepositoryStore.getState().loadCommits(),
          useRepositoryStore.getState().loadStatus(),
          useStagingStore.getState().loadStatus(),
        ]);
        // Check if there are more paused actions
        await loadProgress();
      }
    } catch (err) {
      toast.error(t('merge.reword.failed'), getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      closeRewordDialog();
    }
  };

  return (
    <Dialog open={rewordDialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-125">
        <DialogTitle icon={MessageSquare}>{t('merge.reword.title')}</DialogTitle>

        <DialogBody>
          {progress && (
            <div className="mb-4 text-xs text-(--text-secondary)">
              {t('merge.reword.progress', {
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

          <label className="block text-sm font-medium mb-2">{t('merge.reword.newMessage')}</label>
          <Textarea
            className="h-32 px-3 py-2 text-sm font-mono"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('merge.reword.placeholder')}
            disabled={isSubmitting}
          />
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button onClick={handleContinue} disabled={isSubmitting || isLoading || !message.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin mr-2" />
                {t('merge.reword.submitting')}
              </>
            ) : (
              t('merge.reword.continue')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
