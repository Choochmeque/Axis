import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { StashView } from './StashView';
import { useRepositoryStore } from '../../store/repositoryStore';

const overlayClass = "fixed inset-0 bg-black/50 z-9999";
const contentClass = "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 max-w-[90vw] max-h-[80vh] bg-(--bg-primary) rounded-lg shadow-xl z-10000 flex flex-col overflow-hidden";
const closeClass = "absolute top-3 right-3 w-6 h-6 flex items-center justify-center bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)";

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
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content className={contentClass}>
          <StashView onRefresh={handleRefresh} />
          <Dialog.Close asChild>
            <button className={closeClass} aria-label="Close">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
