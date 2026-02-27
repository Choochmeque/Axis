import { AlertTriangle, ExternalLink } from 'lucide-react';
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
import { shellApi } from '@/services/api';
import type { LargeBinaryFileInfo } from '@/types';

interface LargeBinaryWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  files: LargeBinaryFileInfo[];
  lfsInstalled: boolean;
  lfsInitialized: boolean;
  onStageAnyway: () => void;
  onTrackWithLfs?: (patterns: string[]) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function LargeBinaryWarningDialog({
  isOpen,
  onClose,
  files,
  lfsInstalled,
  onStageAnyway,
  onTrackWithLfs,
}: LargeBinaryWarningDialogProps) {
  const { t } = useTranslation();

  const handleStageAnyway = () => {
    onStageAnyway();
    onClose();
  };

  const handleTrackWithLfs = () => {
    const patterns = [...new Set(files.map((f) => f.suggestedPattern))];
    onTrackWithLfs?.(patterns);
    onClose();
  };

  const handleInstallLfs = () => {
    shellApi.openUrl('https://git-lfs.com');
  };

  // Use the smallest file size as approximate threshold display
  const minFileSize = Math.min(...files.map((f) => f.size));
  const threshold = formatSize(minFileSize);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-120">
        <DialogTitle icon={AlertTriangle} iconClassName="text-warning">
          {t('staging.lfsWarning.title')}
        </DialogTitle>

        <DialogBody className="flex flex-col gap-3">
          <Alert variant="warning">
            {t('staging.lfsWarning.message', { count: files.length, threshold })}
          </Alert>

          {/* File list */}
          <div className="max-h-48 overflow-y-auto rounded border border-(--border-color)">
            {files.map((file) => (
              <div
                key={file.path}
                className="flex items-center justify-between px-3 py-2 text-sm border-b border-(--border-color) last:border-b-0"
              >
                <span className="truncate text-(--text-primary) mr-2">{file.path}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-(--text-secondary)">{formatSize(file.size)}</span>
                  <span className="text-xs text-(--text-muted)">
                    {t('staging.lfsWarning.suggestedPattern', {
                      pattern: file.suggestedPattern,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* LFS not installed info */}
          {!lfsInstalled && (
            <Alert variant="info">
              <div className="flex flex-col gap-1">
                <span>{t('staging.lfsWarning.lfsNotInstalled')}</span>
                <button
                  className="inline-flex items-center gap-1 text-sm font-medium text-(--accent-color) hover:underline cursor-pointer self-start"
                  onClick={handleInstallLfs}
                >
                  {t('staging.lfsWarning.installLfs')}
                  <ExternalLink className="size-3" />
                </button>
              </div>
            </Alert>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          {lfsInstalled && onTrackWithLfs && (
            <Button variant="primary" onClick={handleTrackWithLfs}>
              {t('staging.lfsWarning.trackWithLfs')}
            </Button>
          )}
          <Button variant="destructive" onClick={handleStageAnyway}>
            {t('staging.lfsWarning.stageAnyway')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
