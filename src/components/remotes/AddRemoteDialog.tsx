import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Cloud } from 'lucide-react';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import { cn } from '../../lib/utils';

interface AddRemoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const overlayClass = 'fixed inset-0 bg-black/50 z-9999 animate-in fade-in duration-150';
const contentClass =
  'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-(--bg-primary) rounded-lg shadow-xl w-[90vw] max-w-120 max-h-[85vh] p-0 overflow-y-auto z-10000 animate-in fade-in zoom-in-95 duration-150';
const titleClass =
  'flex items-center gap-2 py-4 px-5 m-0 text-base font-semibold text-(--text-primary) border-b border-(--border-color)';
const bodyClass = 'p-5';
const footerClass = 'flex justify-end gap-2 py-4 px-5 border-t border-(--border-color)';
const closeClass =
  'absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)';
const fieldClass = 'mb-4 last:mb-0';
const labelClass = 'block mb-1.5 text-[13px] font-medium text-(--text-secondary)';
const inputClass =
  'w-full py-2 px-3 text-sm bg-(--bg-secondary) border border-(--border-color) rounded text-(--text-primary) outline-none transition-colors focus:border-(--accent-color)';
const btnClass = 'py-2 px-4 text-[13px] font-medium rounded cursor-pointer transition-colors';

export function AddRemoteDialog({ open, onOpenChange }: AddRemoteDialogProps) {
  const [remoteName, setRemoteName] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadBranches } = useRepositoryStore();

  useEffect(() => {
    if (open) {
      setRemoteName('');
      setRemoteUrl('');
      setError(null);
    }
  }, [open]);

  const handleAdd = async () => {
    if (!remoteName.trim()) {
      setError('Remote name is required');
      return;
    }

    if (!remoteUrl.trim()) {
      setError('Remote URL is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await remoteApi.add(remoteName.trim(), remoteUrl.trim());
      await loadBranches();
      onOpenChange(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleAdd();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content className={contentClass}>
          <Dialog.Title className={titleClass}>
            <Cloud size={18} />
            Add Remote
          </Dialog.Title>

          <div className={bodyClass}>
            <div className={fieldClass}>
              <label htmlFor="remote-name" className={labelClass}>
                Remote Name
              </label>
              <input
                id="remote-name"
                type="text"
                value={remoteName}
                onChange={(e) => setRemoteName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="origin"
                autoFocus
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <label htmlFor="remote-url" className={labelClass}>
                Remote URL
              </label>
              <input
                id="remote-url"
                type="url"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://github.com/user/repo.git"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="mt-3 py-2 px-3 bg-error/10 border border-error rounded text-error text-[13px]">
                {error}
              </div>
            )}
          </div>

          <div className={footerClass}>
            <Dialog.Close asChild>
              <button
                className={cn(
                  btnClass,
                  'bg-transparent border border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                )}
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              className={cn(
                btnClass,
                'bg-(--accent-color) border border-(--accent-color) text-white hover:not-disabled:bg-(--accent-color-hover) disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              onClick={handleAdd}
              disabled={isLoading || !remoteName.trim() || !remoteUrl.trim()}
            >
              {isLoading ? 'Adding...' : 'Add Remote'}
            </button>
          </div>

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
