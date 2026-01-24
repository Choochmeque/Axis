import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';

import { toast, useOperationProgress } from '@/hooks';
import { notifyNewCommits } from '@/lib/actions';
import { getErrorMessage } from '@/lib/errorUtils';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Remote } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  FormField,
  Select,
  SelectItem,
  CheckboxField,
  Alert,
  OperationProgressBar,
} from '@/components/ui';

interface FetchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FetchDialog({ open, onOpenChange }: FetchDialogProps) {
  const { t } = useTranslation();
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [selectedRemote, setSelectedRemote] = useState('');
  const [fetchAll, setFetchAll] = useState(true);
  const [prune, setPrune] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadBranches, refreshRepository } = useRepositoryStore();
  const fetchOperation = useOperationProgress('Fetch');

  useEffect(() => {
    if (open) {
      loadRemotes();
      setError(null);
    }
  }, [open]);

  const loadRemotes = async () => {
    try {
      const data = await remoteApi.list();
      setRemotes(data);
      if (data.length > 0) {
        setSelectedRemote(data[0].name);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleFetch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (fetchAll) {
        await remoteApi.fetchAll();
      } else {
        await remoteApi.fetch(selectedRemote, { prune, tags: false, depth: null });
      }

      await loadBranches();
      await refreshRepository();
      notifyNewCommits(useRepositoryStore.getState().branches);

      onOpenChange(false);
      toast.success(t('remotes.fetch.complete'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-120">
        <DialogTitle icon={RefreshCw}>{t('remotes.fetch.title')}</DialogTitle>

        <DialogBody>
          <CheckboxField
            id="fetch-all"
            label={t('remotes.fetch.fetchAll')}
            checked={fetchAll}
            onCheckedChange={setFetchAll}
            disabled={isLoading}
          />

          {!fetchAll && (
            <FormField label={t('remotes.fetch.remoteLabel')} htmlFor="remote-select">
              <Select
                id="remote-select"
                value={selectedRemote}
                onValueChange={setSelectedRemote}
                disabled={remotes.length === 0 || isLoading}
              >
                {remotes.map((remote) => (
                  <SelectItem key={remote.name} value={remote.name}>
                    {remote.name} ({remote.url})
                  </SelectItem>
                ))}
              </Select>
            </FormField>
          )}

          <CheckboxField
            id="prune"
            label={t('remotes.fetch.prune')}
            checked={prune}
            onCheckedChange={setPrune}
            disabled={isLoading}
          />

          {fetchOperation?.progress && (
            <OperationProgressBar progress={fetchOperation.progress} className="mt-3" />
          )}

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
            onClick={handleFetch}
            disabled={isLoading || (!fetchAll && !selectedRemote)}
          >
            {isLoading ? t('remotes.fetch.fetching') : t('remotes.fetch.fetchButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
