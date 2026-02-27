import { FolderGit2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  FormField,
  Input,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/errorUtils';
import { submoduleApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';

interface AddSubmoduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSubmoduleDialog({ open, onOpenChange }: AddSubmoduleDialogProps) {
  const { t } = useTranslation();
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
      setError(t('sidebar.submodule.addDialog.urlRequired'));
      return;
    }

    if (!path.trim()) {
      setError(t('sidebar.submodule.addDialog.pathRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await submoduleApi.add({
        url: url.trim(),
        path: path.trim(),
        branch: branch.trim() || null,
        name: null,
        depth: null,
      });
      await loadSubmodules();
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-120">
        <DialogTitle icon={FolderGit2}>{t('sidebar.submodule.addDialog.title')}</DialogTitle>

        <DialogBody>
          <FormField label={t('sidebar.submodule.addDialog.urlLabel')} htmlFor="submodule-url">
            <Input
              id="submodule-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('sidebar.submodule.addDialog.urlPlaceholder')}
              autoFocus
            />
          </FormField>

          <FormField
            label={t('sidebar.submodule.addDialog.pathLabel')}
            htmlFor="submodule-path"
            hint={t('sidebar.submodule.addDialog.pathHint')}
          >
            <Input
              id="submodule-path"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('sidebar.submodule.addDialog.pathPlaceholder')}
            />
          </FormField>

          <FormField
            label={t('sidebar.submodule.addDialog.branchLabel')}
            htmlFor="submodule-branch"
          >
            <Input
              id="submodule-branch"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('sidebar.submodule.addDialog.branchPlaceholder')}
            />
          </FormField>

          {error && (
            <Alert variant="error" inline className="mt-3">
              {error}
            </Alert>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={isLoading || !url.trim() || !path.trim()}
          >
            {isLoading
              ? t('sidebar.submodule.addDialog.adding')
              : t('sidebar.submodule.addDialog.addButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
