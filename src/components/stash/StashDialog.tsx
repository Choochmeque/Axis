import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { StashView } from './StashView';
import { useRepositoryStore } from '../../store/repositoryStore';
import './StashDialog.css';

interface StashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StashDialog({ open, onOpenChange }: StashDialogProps) {
  const { refreshRepository, loadStashes } = useRepositoryStore();

  const handleRefresh = async () => {
    await loadStashes();
    await refreshRepository();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="stash-dialog-content">
          <StashView onRefresh={handleRefresh} />
          <Dialog.Close asChild>
            <button className="stash-dialog-close" aria-label="Close">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
