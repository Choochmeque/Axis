import { AlertTriangle, RotateCcw } from 'lucide-react';
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
  Label,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/errorUtils';
import { cn } from '@/lib/utils';
import { operationApi } from '@/services/api';
import type { Commit, ResetMode as ResetModeType } from '@/types';
import { ResetMode } from '@/types';

interface ResetConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete?: () => void;
  commit: Commit;
  mode: ResetModeType;
  currentBranch: string;
}

export function ResetConfirmDialog({
  isOpen,
  onClose,
  onResetComplete,
  commit,
  mode,
  currentBranch,
}: ResetConfirmDialogProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getModeInfo = (resetMode: ResetModeType) => {
    switch (resetMode) {
      case ResetMode.Soft:
        return {
          title: t('merge.reset.soft.title'),
          description: t('merge.reset.soft.description'),
          warning: t('merge.reset.soft.warning'),
        };
      case ResetMode.Mixed:
        return {
          title: t('merge.reset.mixed.title'),
          description: t('merge.reset.mixed.description'),
          warning: t('merge.reset.mixed.warning'),
        };
      case ResetMode.Hard:
        return {
          title: t('merge.reset.hard.title'),
          description: t('merge.reset.hard.description'),
          warning: t('merge.reset.hard.warning'),
        };
    }
  };

  const modeInfo = getModeInfo(mode);
  const isHardReset = mode === ResetMode.Hard;

  const handleReset = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await operationApi.reset({
        target: commit.oid,
        mode,
      });
      onResetComplete?.();
      onClose();
    } catch (err) {
      console.error('Reset failed:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-125">
        <DialogTitle icon={RotateCcw}>{modeInfo.title}</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <div className="field">
            <Label>{t('merge.reset.branch')}</Label>
            <div className="py-2.5 px-3 text-sm font-mono text-(--accent-color) bg-(--bg-secondary) rounded-md font-medium">
              {currentBranch}
            </div>
          </div>

          <div className="field">
            <Label>{t('merge.reset.resetToCommit')}</Label>
            <div className="flex items-center gap-3 py-2.5 px-3 border border-(--border-color) rounded-md bg-(--bg-secondary)">
              <span className="shrink-0 font-mono text-xs font-semibold text-(--accent-color)">
                {commit.shortOid}
              </span>
              <span className="flex-1 text-base text-(--text-primary) overflow-hidden text-ellipsis whitespace-nowrap">
                {commit.summary}
              </span>
            </div>
          </div>

          <div className="p-3 bg-(--bg-secondary) rounded-md text-base text-(--text-secondary)">
            <p className="m-0 mb-2">{modeInfo.description}</p>
          </div>

          <div
            className={cn(
              'p-3 rounded-md text-base flex items-start gap-2',
              isHardReset
                ? 'bg-error/10 text-error border border-error/30'
                : 'bg-(--bg-secondary) text-(--text-secondary)'
            )}
          >
            {isHardReset ? <AlertTriangle size={16} className="shrink-0 mt-0.5" /> : null}
            <p className="m-0">{modeInfo.warning}</p>
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isLoading}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button
            variant={isHardReset ? 'destructive' : 'primary'}
            onClick={handleReset}
            disabled={isLoading}
          >
            {isLoading
              ? t('merge.reset.resetting')
              : t('merge.reset.resetButton', {
                  mode: mode.charAt(0).toUpperCase() + mode.slice(1),
                })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
