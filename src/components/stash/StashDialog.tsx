import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive } from 'lucide-react';

import { toast, useOperation } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { stashApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
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

interface StashDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StashDialog({ isOpen, onClose }: StashDialogProps) {
  const { t } = useTranslation();
  const { refreshRepository, loadStashes } = useRepositoryStore();
  const { trackOperation } = useOperation();
  const [message, setMessage] = useState('');
  const [keepStaged, setKeepStaged] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStash = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await trackOperation(
        { name: 'Stash', description: 'Stashing changes', category: 'git' },
        async () => {
          await stashApi.save({
            message: message || null,
            keepIndex: keepStaged,
            includeUntracked: true,
            includeIgnored: false,
          });

          await loadStashes();
          await refreshRepository();
        }
      );

      setMessage('');
      setKeepStaged(false);
      onClose();
      toast.success(t('stash.createSuccess'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setKeepStaged(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogTitle icon={Archive}>{t('stash.dialog.title')}</DialogTitle>

        <DialogBody>
          <p className="text-base text-(--text-secondary) mb-4">{t('stash.dialog.description')}</p>

          <FormField label={t('stash.dialog.messageLabel')} htmlFor="stash-message">
            <Input
              id="stash-message"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('stash.dialog.messagePlaceholder')}
              autoFocus
            />
          </FormField>

          <CheckboxField
            id="keep-staged"
            label={t('stash.dialog.keepStaged')}
            checked={keepStaged}
            onCheckedChange={setKeepStaged}
          />

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
          <Button variant="primary" onClick={handleStash} disabled={isLoading}>
            {isLoading ? t('stash.dialog.stashing') : t('stash.dialog.stashButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
