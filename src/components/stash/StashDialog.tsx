import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { StashView } from './StashView';
import { useRepositoryStore } from '../../store/repositoryStore';

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
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content w-125 max-h-[80vh] flex flex-col overflow-hidden">
          <StashView onRefresh={handleRefresh} />
          <Dialog.Close asChild>
            <button className="btn-close absolute top-3 right-3" aria-label="Close">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
