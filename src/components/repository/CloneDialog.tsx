import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, FolderPlus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogTitle,
  FormField,
  Input,
  OperationProgressBar,
} from '@/components/ui';
import { useOperationProgress } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { repositoryApi, shellApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import { TabType, useTabsStore } from '@/store/tabsStore';

interface CloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Extract repo name from URL for default folder name
function getRepoNameFromUrl(repoUrl: string): string {
  const match = repoUrl.match(/\/([^/]+?)(?:\.git)?$/);
  return match ? match[1] : '';
}

export function CloneDialog({ open: isOpen, onOpenChange }: CloneDialogProps) {
  const closeHandlerRef = useRef<(() => void) | null>(null);
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) {
          if (closeHandlerRef.current) {
            closeHandlerRef.current();
          } else {
            onOpenChange(false);
          }
        }
      }}
    >
      {isOpen && (
        <CloneDialogContent onOpenChange={onOpenChange} closeHandlerRef={closeHandlerRef} />
      )}
    </Dialog>
  );
}

interface CloneDialogContentProps {
  onOpenChange: (open: boolean) => void;
  closeHandlerRef: React.RefObject<(() => void) | null>;
}

function CloneDialogContent({ onOpenChange, closeHandlerRef }: CloneDialogContentProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [path, setPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { loadRecentRepositories, openRepository } = useRepositoryStore();
  const { addTab, findTabByPath, setActiveTab } = useTabsStore();
  const cloneOperation = useOperationProgress('Clone');

  // Derive a suggested path from URL; the user can override via the input or browse button.
  const home = import.meta.env.VITE_HOME || '~';
  const repoName = getRepoNameFromUrl(url);
  const suggestedPath = repoName ? `${home}/Projects/${repoName}` : '';
  const effectivePath = path || suggestedPath;

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: t('repository.clone.selectDestination'),
    });

    if (selected && typeof selected === 'string') {
      const name = getRepoNameFromUrl(url);
      setPath(name ? `${selected}/${name}` : selected);
    }
  };

  const handleClone = async () => {
    if (!url.trim()) {
      setError(t('repository.clone.urlRequired'));
      return;
    }
    if (!effectivePath.trim()) {
      setError(t('repository.clone.pathRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const repo = await repositoryApi.clone(url.trim(), effectivePath.trim());
      await loadRecentRepositories();

      // Load the repository into the store
      await openRepository(repo.path);

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

  const cancelOperation = useCallback(async () => {
    if (cloneOperation) {
      try {
        await shellApi.cancelOperation(cloneOperation.id);
      } catch (err) {
        console.warn('Failed to cancel clone operation:', err);
      }
    }
    setShowCancelConfirm(false);
    setError(null);
    onOpenChange(false);
  }, [cloneOperation, onOpenChange]);

  const handleClose = useCallback(() => {
    if (isLoading && cloneOperation) {
      setShowCancelConfirm(true);
      return;
    }
    setError(null);
    onOpenChange(false);
  }, [isLoading, cloneOperation, onOpenChange]);

  useEffect(() => {
    closeHandlerRef.current = handleClose;
    return () => {
      closeHandlerRef.current = null;
    };
  }, [closeHandlerRef, handleClose]);

  return (
    <DialogContent className="max-w-110">
      <DialogTitle icon={FolderPlus}>{t('repository.clone.title')}</DialogTitle>

      <DialogBody>
        {showCancelConfirm ? (
          <Alert variant="warning">{t('repository.clone.cancelConfirm')}</Alert>
        ) : (
          <>
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
                disabled={isLoading}
              />
            </FormField>

            <FormField label={t('repository.clone.destinationLabel')} htmlFor="clone-path">
              <div className="flex gap-2">
                <Input
                  id="clone-path"
                  type="text"
                  value={effectivePath}
                  onChange={(e) => setPath(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('repository.clone.destinationPlaceholder')}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button variant="secondary" onClick={handleBrowse} disabled={isLoading}>
                  <FolderOpen size={16} />
                </Button>
              </div>
            </FormField>

            {cloneOperation?.progress && (
              <OperationProgressBar progress={cloneOperation.progress} className="mt-3" />
            )}

            {error && (
              <Alert variant="error" inline className="mt-3">
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogBody>

      <DialogFooter>
        {showCancelConfirm ? (
          <>
            <Button variant="secondary" onClick={() => setShowCancelConfirm(false)}>
              {t('repository.clone.continueOperation')}
            </Button>
            <Button variant="destructive" onClick={cancelOperation}>
              {t('repository.clone.cancelOperation')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleClone}
              disabled={isLoading || !url.trim() || !effectivePath.trim()}
            >
              {isLoading ? t('repository.clone.cloning') : t('repository.clone.cloneButton')}
            </Button>
          </>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
