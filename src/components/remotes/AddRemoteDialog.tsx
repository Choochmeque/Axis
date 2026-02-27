import { Cloud } from 'lucide-react';
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
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';

interface AddRemoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRemoteDialog({ open, onOpenChange }: AddRemoteDialogProps) {
  const { t } = useTranslation();
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
      setError(t('remotes.add.nameRequired'));
      return;
    }

    if (!remoteUrl.trim()) {
      setError(t('remotes.add.urlRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await remoteApi.add(remoteName.trim(), remoteUrl.trim());
      await loadBranches();
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
        <DialogTitle icon={Cloud}>{t('remotes.add.title')}</DialogTitle>

        <DialogBody>
          <FormField label={t('remotes.add.nameLabel')} htmlFor="remote-name">
            <Input
              id="remote-name"
              type="text"
              value={remoteName}
              onChange={(e) => setRemoteName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('remotes.add.namePlaceholder')}
              autoFocus
            />
          </FormField>

          <FormField label={t('remotes.add.urlLabel')} htmlFor="remote-url">
            <Input
              id="remote-url"
              type="url"
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('remotes.add.urlPlaceholder')}
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
            disabled={isLoading || !remoteName.trim() || !remoteUrl.trim()}
          >
            {isLoading ? t('remotes.add.adding') : t('remotes.add.addButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
