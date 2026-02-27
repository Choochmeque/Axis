import { AlertTriangle } from 'lucide-react';
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

interface CheckoutConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetBranch: string;
  conflictingFiles: string[];
  onStashAndSwitch: () => Promise<void>;
  onDiscardAndSwitch: () => Promise<void>;
}

export function CheckoutConflictDialog({
  isOpen,
  onClose,
  targetBranch,
  conflictingFiles,
  onStashAndSwitch,
  onDiscardAndSwitch,
}: CheckoutConflictDialogProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<'stash' | 'discard' | null>(null);

  const handleStashAndSwitch = async () => {
    setIsLoading('stash');
    try {
      await onStashAndSwitch();
      onClose();
    } finally {
      setIsLoading(null);
    }
  };

  const handleDiscardAndSwitch = async () => {
    setIsLoading('discard');
    try {
      await onDiscardAndSwitch();
      onClose();
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="max-w-120">
        <DialogTitle icon={AlertTriangle} iconClassName="text-warning">
          {t('branches.checkoutConflict.title')}
        </DialogTitle>

        <DialogBody className="space-y-3">
          <Alert variant="warning">
            {t('branches.checkoutConflict.message', { branch: targetBranch })}
          </Alert>

          <div className="text-sm text-(--text-secondary)">
            {t('branches.checkoutConflict.filesLabel', { count: conflictingFiles.length })}
          </div>

          <div className="max-h-40 overflow-y-auto rounded border border-(--border-primary) bg-(--bg-secondary) p-2">
            <ul className="space-y-1 text-sm font-mono">
              {conflictingFiles.map((file) => (
                <li key={file} className="text-(--text-primary)">
                  {file}
                </li>
              ))}
            </ul>
          </div>

          <div className="text-sm text-(--text-tertiary)">
            {t('branches.checkoutConflict.hint')}
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isLoading !== null}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button variant="secondary" onClick={handleStashAndSwitch} disabled={isLoading !== null}>
            {isLoading === 'stash'
              ? t('common.stashing')
              : t('branches.checkoutConflict.stashAndSwitch')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDiscardAndSwitch}
            disabled={isLoading !== null}
          >
            {isLoading === 'discard'
              ? t('branches.checkoutConflict.discarding')
              : t('branches.checkoutConflict.discardAndSwitch')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
