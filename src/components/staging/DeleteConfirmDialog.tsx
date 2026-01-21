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
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-100">
        <DialogTitle icon={AlertTriangle} iconClassName="text-error">
          Delete File
        </DialogTitle>

        <DialogBody>
          <Alert variant="warning">
            Are you sure you want to permanently delete "{filePath}"? This cannot be undone.
          </Alert>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
