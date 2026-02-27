import { AlertTriangle } from 'lucide-react';
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

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  filePath: string;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  filePath,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-100">
        <DialogTitle icon={AlertTriangle} iconClassName="text-error">
          {t('dialogs.deleteFile.title')}
        </DialogTitle>

        <DialogBody>
          <Alert variant="warning">{t('dialogs.deleteFile.message', { path: filePath })}</Alert>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm}>
            {t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
