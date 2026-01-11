import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, FolderGit2 } from 'lucide-react';
import { submoduleApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import { cn } from '../../lib/utils';

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

interface AddSubmoduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSubmoduleDialog({ open, onOpenChange }: AddSubmoduleDialogProps) {
  const [url, setUrl] = useState('');
  const [path, setPath] = useState('');
  const [branch, setBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadSubmodules } = useRepositoryStore();

  useEffect(() => {
    if (open) {
      setUrl('');
      setPath('');
      setBranch('');
      setError(null);
    }
  }, [open]);

  // Auto-fill path from URL
  useEffect(() => {
    if (url && !path) {
      const match = url.match(/\/([^/]+?)(\.git)?$/);
      if (match) {
        setPath(match[1]);
      }
    }
  }, [url, path]);

  const handleAdd = async () => {
    if (!url.trim()) {
      setError('Repository URL is required');
      return;
    }

    if (!path.trim()) {
      setError('Path is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await submoduleApi.add({
        url: url.trim(),
        path: path.trim(),
        branch: branch.trim() || undefined,
      });
      await loadSubmodules();
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
            <FolderGit2 size={18} />
            Add Submodule
          </Dialog.Title>

          <div className={bodyClass}>
            <div className={fieldClass}>
              <label htmlFor="submodule-url" className={labelClass}>
                Repository URL
              </label>
              <input
                id="submodule-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://github.com/user/repo.git"
                autoFocus
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <label htmlFor="submodule-path" className={labelClass}>
                Path
              </label>
              <input
                id="submodule-path"
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="libs/my-submodule"
                className={inputClass}
              />
              <span className="block mt-1 text-xs text-(--text-muted)">
                Relative path where the submodule will be cloned
              </span>
            </div>

            <div className={fieldClass}>
              <label htmlFor="submodule-branch" className={labelClass}>
                Branch (optional)
              </label>
              <input
                id="submodule-branch"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="main"
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
              disabled={isLoading || !url.trim() || !path.trim()}
            >
              {isLoading ? 'Adding...' : 'Add Submodule'}
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
