import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  Alert,
} from '@/components/ui';

interface DiscardConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode: 'file' | 'all';
  filePath?: string;
}

export function DiscardConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  mode,
  filePath,
}: DiscardConfirmDialogProps) {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const title = mode === 'all' ? t('dialogs.discard.titleAll') : t('dialogs.discard.title');
  const message =
    mode === 'all'
      ? t('dialogs.discard.messageAll')
      : t('dialogs.discard.message', { path: filePath });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-100">
        <DialogTitle icon={AlertTriangle} iconClassName="text-warning">
          {title}
        </DialogTitle>

        <DialogBody>
          <Alert variant="warning">{message}</Alert>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm}>
            {t('dialogs.discard.discardButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
