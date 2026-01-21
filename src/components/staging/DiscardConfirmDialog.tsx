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
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const title = mode === 'all' ? 'Discard All Changes' : 'Discard Changes';
  const message =
    mode === 'all'
      ? 'Are you sure you want to discard all unstaged changes? This cannot be undone.'
      : `Are you sure you want to discard changes to "${filePath}"? This cannot be undone.`;

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
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm}>
            Discard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
