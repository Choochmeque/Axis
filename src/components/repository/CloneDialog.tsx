import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { open } from '@tauri-apps/plugin-dialog';
import { X, FolderPlus, FolderOpen } from 'lucide-react';
import { repositoryApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import { useTabsStore } from '../../store/tabsStore';
import { cn } from '../../lib/utils';

interface CloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const contentClass =
  'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-(--bg-primary) rounded-lg shadow-xl w-[90vw] max-w-110 max-h-[85vh] p-0 overflow-y-auto z-10000 animate-in fade-in zoom-in-95 duration-150';
const titleClass =
  'flex items-center gap-2 py-4 px-5 m-0 text-base font-semibold text-(--text-primary) border-b border-(--border-color)';
const bodyClass = 'p-5';
const footerClass = 'flex justify-end gap-2 py-4 px-5 border-t border-(--border-color)';
const closeClass =
  'absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)';
const fieldClass = 'mb-4 last:mb-0';
export function CloneDialog({ open: isOpen, onOpenChange }: CloneDialogProps) {
  const [url, setUrl] = useState('');
  const [path, setPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadRecentRepositories } = useRepositoryStore();
  const { addTab, findTabByPath, setActiveTab } = useTabsStore();

  // Extract repo name from URL for default folder name
  const getRepoNameFromUrl = (repoUrl: string): string => {
    const match = repoUrl.match(/\/([^/]+?)(?:\.git)?$/);
    return match ? match[1] : '';
  };

  // Update path when URL changes
  useEffect(() => {
    if (url && !path) {
      const repoName = getRepoNameFromUrl(url);
      if (repoName) {
        // Get default parent directory (user's home or current dir)
        const home = import.meta.env.VITE_HOME || '~';
        setPath(`${home}/Projects/${repoName}`);
      }
    }
  }, [url, path]);

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Clone Destination',
    });

    if (selected && typeof selected === 'string') {
      const repoName = getRepoNameFromUrl(url);
      setPath(repoName ? `${selected}/${repoName}` : selected);
    }
  };

  const handleClone = async () => {
    if (!url.trim()) {
      setError('Repository URL is required');
      return;
    }
    if (!path.trim()) {
      setError('Destination path is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const repo = await repositoryApi.clone(url.trim(), path.trim());
      await loadRecentRepositories();

      // Create tab for cloned repository
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
      setUrl('');
      setPath('');
      onOpenChange(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleClone();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className={contentClass}>
          <Dialog.Title className={titleClass}>
            <FolderPlus size={18} />
            Clone Repository
          </Dialog.Title>

          <div className={bodyClass}>
            <div className={fieldClass}>
              <label htmlFor="clone-url" className="label">
                Repository URL
              </label>
              <input
                id="clone-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://github.com/user/repo.git"
                autoFocus
                className="input"
              />
              <p className="mt-1 text-xs text-(--text-tertiary)">
                HTTPS or SSH URL (e.g., git@github.com:user/repo.git)
              </p>
            </div>

            <div className={fieldClass}>
              <label htmlFor="clone-path" className="label">
                Destination
              </label>
              <div className="flex gap-2">
                <input
                  id="clone-path"
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="/path/to/clone"
                  className={cn('input', 'flex-1')}
                />
                <button
                  type="button"
                  onClick={handleBrowse}
                  className={cn(
                    'btn',
                    'shrink-0 bg-(--bg-secondary) border border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                  )}
                >
                  <FolderOpen size={16} />
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-3 py-2 px-3 bg-error/10 border border-error rounded text-error text-[13px]">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="mt-3 py-2 px-3 bg-(--bg-secondary) border border-(--border-color) rounded text-(--text-secondary) text-[13px]">
                Cloning repository... This may take a while for large repositories.
              </div>
            )}
          </div>

          <div className={footerClass}>
            <Dialog.Close asChild>
              <button className="btn btn-secondary" disabled={isLoading}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              className="btn btn-primary"
              onClick={handleClone}
              disabled={isLoading || !url.trim() || !path.trim()}
            >
              {isLoading ? 'Cloning...' : 'Clone'}
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
