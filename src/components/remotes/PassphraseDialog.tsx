import { KeyRound } from 'lucide-react';
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
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { sshKeysApi } from '@/services/api';

interface PassphraseDialogProps {
  isOpen: boolean;
  keyPath: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PassphraseDialog({ isOpen, keyPath, onSuccess, onCancel }: PassphraseDialogProps) {
  const { t } = useTranslation();
  const [passphrase, setPassphrase] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassphrase('');
      setError(null);
      setIsUnlocking(false);
    }
  }, [isOpen]);

  const keyName = keyPath?.split('/').pop() ?? '';

  const handleUnlock = async () => {
    if (!keyPath || !passphrase) return;

    setIsUnlocking(true);
    setError(null);
    try {
      await sshKeysApi.cachePassphrase(keyPath, passphrase);
      onSuccess();
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && passphrase) {
      handleUnlock();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-100">
        <DialogTitle icon={KeyRound}>{t('remotes.passphrase.title')}</DialogTitle>

        <DialogBody>
          <p className="text-sm text-(--text-secondary) mb-3">
            {t('remotes.passphrase.description', { keyName })}
          </p>

          <FormField label={t('remotes.passphrase.label')} htmlFor="ssh-passphrase">
            <Input
              id="ssh-passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('remotes.passphrase.placeholder')}
              autoFocus
            />
          </FormField>

          {error && (
            <Alert variant="error" className="mt-3">
              {error}
            </Alert>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button variant="primary" onClick={handleUnlock} disabled={isUnlocking || !passphrase}>
            {isUnlocking ? t('remotes.passphrase.unlocking') : t('remotes.passphrase.unlock')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
