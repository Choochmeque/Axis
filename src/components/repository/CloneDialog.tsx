import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderPlus, FolderOpen } from 'lucide-react';

import { useOperation } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { repositoryApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import { TabType, useTabsStore } from '@/store/tabsStore';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Input,
  Alert,
} from '@/components/ui';

interface CloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloneDialog({ open: isOpen, onOpenChange }: CloneDialogProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [path, setPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadRecentRepositories } = useRepositoryStore();
  const { addTab, findTabByPath, setActiveTab } = useTabsStore();
  const { trackOperation } = useOperation();

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
      title: t('repository.clone.selectDestination'),
    });

    if (selected && typeof selected === 'string') {
      const repoName = getRepoNameFromUrl(url);
      setPath(repoName ? `${selected}/${repoName}` : selected);
    }
  };

  const handleClone = async () => {
    if (!url.trim()) {
      setError(t('repository.clone.urlRequired'));
      return;
    }
    if (!path.trim()) {
      setError(t('repository.clone.pathRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const repo = await trackOperation(
        { name: 'Clone', description: `Cloning ${url.trim()}`, category: 'git' },
        async () => {
          const cloned = await repositoryApi.clone(url.trim(), path.trim());
          await loadRecentRepositories();
          return cloned;
        }
      );

      // Create tab for cloned repository
      const existingTab = findTabByPath(repo.path);
      if (existingTab) {
        setActiveTab(existingTab.id);
      } else {
        addTab({
          type: TabType.Repository,
          path: repo.path,
          name: repo.name,
        });
      }

      // Reset form and close
      setUrl('');
      setPath('');
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-110">
        <DialogTitle icon={FolderPlus}>{t('repository.clone.title')}</DialogTitle>

        <DialogBody>
          <FormField
            label={t('repository.clone.urlLabel')}
            htmlFor="clone-url"
            hint={t('repository.clone.urlHint')}
          >
            <Input
              id="clone-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('repository.clone.urlPlaceholder')}
              autoFocus
            />
          </FormField>

          <FormField label={t('repository.clone.destinationLabel')} htmlFor="clone-path">
            <div className="flex gap-2">
              <Input
                id="clone-path"
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('repository.clone.destinationPlaceholder')}
                className="flex-1"
              />
              <Button variant="secondary" onClick={handleBrowse}>
                <FolderOpen size={16} />
              </Button>
            </div>
          </FormField>

          {error && (
            <Alert variant="error" inline className="mt-3">
              {error}
            </Alert>
          )}

          {isLoading && (
            <div className="mt-3 py-2 px-3 bg-(--bg-secondary) border border-(--border-color) rounded text-(--text-secondary) text-base">
              {t('repository.clone.cloningMessage')}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isLoading}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleClone}
            disabled={isLoading || !url.trim() || !path.trim()}
          >
            {isLoading ? t('repository.clone.cloning') : t('repository.clone.cloneButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
