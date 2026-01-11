import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { open } from '@tauri-apps/plugin-dialog';
import { X, FolderPlus, FolderOpen, Check } from 'lucide-react';
import { repositoryApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import { useTabsStore } from '../../store/tabsStore';
import { cn } from '../../lib/utils';

interface InitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content max-w-105">
          <Dialog.Title className="dialog-title">
            <FolderPlus size={18} />
            Initialize Repository
          </Dialog.Title>

          <div className="dialog-body">
            <div className="field">
              <label htmlFor="init-path" className="label">
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
              <p className="mt-1 text-xs text-(--text-tertiary)">
                Select an empty directory or create a new one
              </p>
            </div>

            <div className="checkbox-field">
              <Checkbox.Root
                id="bare"
                className="checkbox"
                checked={bare}
                onCheckedChange={(checked) => setBare(checked === true)}
              >
                <Checkbox.Indicator>
                  <Check size={10} className="text-white" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label htmlFor="bare" className="checkbox-label">
                Create bare repository
              </label>
            </div>
            <p className="text-xs text-(--text-tertiary) ml-6 -mt-2">
              Bare repositories have no working directory (for servers)
            </p>

            {error && <div className="alert-inline alert-error mt-3">{error}</div>}
          </div>

          <div className="dialog-footer">
            <Dialog.Close asChild>
              <button className="btn btn-secondary" disabled={isLoading}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              className="btn btn-primary"
              onClick={handleInit}
              disabled={isLoading || !path.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Repository'}
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              className="btn-close absolute top-3 right-3"
              aria-label="Close"
              disabled={isLoading}
            >
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
