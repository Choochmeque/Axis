import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { open } from '@tauri-apps/plugin-dialog';
import { X, FolderPlus, FolderOpen } from 'lucide-react';
import { repositoryApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import { useTabsStore } from '../../store/tabsStore';
import { cn } from '../../lib/utils';

interface InitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const overlayClass = 'fixed inset-0 bg-black/50 z-9999 animate-in fade-in duration-150';
const contentClass =
  'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-(--bg-primary) rounded-lg shadow-xl w-[90vw] max-w-105 max-h-[85vh] p-0 overflow-y-auto z-10000 animate-in fade-in zoom-in-95 duration-150';
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

export function InitDialog({ open: isOpen, onOpenChange }: InitDialogProps) {
  const [path, setPath] = useState('');
  const [bare, setBare] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadRecentRepositories } = useRepositoryStore();
  const { addTab, findTabByPath, setActiveTab } = useTabsStore();

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Directory for New Repository',
    });

    if (selected && typeof selected === 'string') {
      setPath(selected);
    }
  };

  const handleInit = async () => {
    if (!path.trim()) {
      setError('Directory path is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const repo = await repositoryApi.init(path.trim(), bare);
      await loadRecentRepositories();

      // Create tab for new repository
      const existingTab = findTabByPath(repo.path.toString());
      if (existingTab) {
        setActiveTab(existingTab.id);
      } else {
        addTab({
          type: 'repository',
          path: repo.path.toString(),
          name: repo.name,
          repository: repo,
        });
      }

      // Reset form and close
      setPath('');
      setBare(false);
      onOpenChange(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleInit();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content className={contentClass}>
          <Dialog.Title className={titleClass}>
            <FolderPlus size={18} />
            Initialize Repository
          </Dialog.Title>

          <div className={bodyClass}>
            <div className={fieldClass}>
              <label htmlFor="init-path" className={labelClass}>
                Directory
              </label>
              <div className="flex gap-2">
                <input
                  id="init-path"
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="/path/to/new/repo"
                  autoFocus
                  className={cn(inputClass, 'flex-1')}
                />
                <button
                  type="button"
                  onClick={handleBrowse}
                  className={cn(
                    btnClass,
                    'shrink-0 bg-(--bg-secondary) border border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                  )}
                >
                  <FolderOpen size={16} />
                </button>
              </div>
              <p className="mt-1 text-xs text-(--text-tertiary)">
                Select an empty directory or create a new one
              </p>
            </div>

            <div className={cn(fieldClass, 'flex items-center gap-2')}>
              <input
                id="bare"
                type="checkbox"
                checked={bare}
                onChange={(e) => setBare(e.target.checked)}
                className="w-4 h-4 accent-(--accent-color)"
              />
              <label htmlFor="bare" className="mb-0 text-(--text-primary)">
                Create bare repository
              </label>
            </div>
            <p className="text-xs text-(--text-tertiary) ml-6 -mt-2">
              Bare repositories have no working directory (for servers)
            </p>

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
                disabled={isLoading}
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              className={cn(
                btnClass,
                'bg-(--accent-color) border border-(--accent-color) text-white hover:not-disabled:bg-(--accent-color-hover) disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              onClick={handleInit}
              disabled={isLoading || !path.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Repository'}
            </button>
          </div>

          <Dialog.Close asChild>
            <button className={closeClass} aria-label="Close" disabled={isLoading}>
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
