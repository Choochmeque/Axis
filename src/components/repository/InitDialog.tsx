import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderPlus, FolderOpen } from 'lucide-react';
import { repositoryApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import { TabType, useTabsStore } from '@/store/tabsStore';
import { getErrorMessage } from '@/lib/errorUtils';
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
  CheckboxField,
  Alert,
} from '@/components/ui';

interface InitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InitDialog({ open: isOpen, onOpenChange }: InitDialogProps) {
  const { t } = useTranslation();
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
      title: t('repository.init.selectDirectory'),
    });

    if (selected && typeof selected === 'string') {
      setPath(selected);
    }
  };

  const handleInit = async () => {
    if (!path.trim()) {
      setError(t('repository.init.pathRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const repo = await repositoryApi.init(path.trim(), bare);
      await loadRecentRepositories();

      // Create tab for new repository
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
      setPath('');
      setBare(false);
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-105">
        <DialogTitle icon={FolderPlus}>{t('repository.init.title')}</DialogTitle>

        <DialogBody>
          <FormField
            label={t('repository.init.directoryLabel')}
            htmlFor="init-path"
            hint={t('repository.init.directoryHint')}
          >
            <div className="flex gap-2">
              <Input
                id="init-path"
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('repository.init.directoryPlaceholder')}
                autoFocus
                className="flex-1"
              />
              <Button variant="secondary" onClick={handleBrowse}>
                <FolderOpen size={16} />
              </Button>
            </div>
          </FormField>

          <CheckboxField
            id="bare"
            label={t('repository.init.bareLabel')}
            description={t('repository.init.bareDescription')}
            checked={bare}
            onCheckedChange={setBare}
          />

          {error && (
            <Alert variant="error" inline className="mt-3">
              {error}
            </Alert>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isLoading}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button variant="primary" onClick={handleInit} disabled={isLoading || !path.trim()}>
            {isLoading ? t('repository.init.creating') : t('repository.init.createButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
