import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  CheckboxField,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogTitle,
  FormField,
  OperationProgressBar,
  Select,
  SelectItem,
} from '@/components/ui';
import { toast, useOperationProgress, useSshKeyCheck } from '@/hooks';
import { notifyNewCommits } from '@/lib/actions';
import { getErrorMessage } from '@/lib/errorUtils';
import { queryKeys } from '@/lib/queryKeys';
import { remoteApi, shellApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';

interface FetchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FetchDialog({ isOpen, onClose }: FetchDialogProps) {
  const closeHandlerRef = useRef<(() => void) | null>(null);
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (closeHandlerRef.current) {
            closeHandlerRef.current();
          } else {
            onClose();
          }
        }
      }}
    >
      {isOpen && <FetchDialogContent onClose={onClose} closeHandlerRef={closeHandlerRef} />}
    </Dialog>
  );
}

interface FetchDialogContentProps {
  onClose: () => void;
  closeHandlerRef: React.RefObject<(() => void) | null>;
}

function FetchDialogContent({ onClose, closeHandlerRef }: FetchDialogContentProps) {
  const { t } = useTranslation();
  const [selectedRemote, setSelectedRemote] = useState('');
  const [fetchAll, setFetchAll] = useState(true);
  const [prune, setPrune] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { loadBranches, refreshRepository } = useRepositoryStore();
  const fetchOperation = useOperationProgress('Fetch');
  const { checkSshKeyForRemote } = useSshKeyCheck();

  const { data: remotes = [] } = useQuery({
    queryKey: queryKeys.remotes(),
    queryFn: () => remoteApi.list(),
  });

  const effectiveRemote = selectedRemote || remotes[0]?.name || '';

  const doFetch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (fetchAll) {
        await remoteApi.fetchAll();
      } else {
        await remoteApi.fetch(effectiveRemote, { prune, tags: false, depth: null });
      }

      await loadBranches();
      await refreshRepository();
      notifyNewCommits(useRepositoryStore.getState().branches);

      onClose();
      toast.success(t('remotes.fetch.complete'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetch = async () => {
    if (fetchAll) {
      const checkRemotesSequentially = async (index: number): Promise<void> => {
        if (index >= remotes.length) {
          doFetch();
          return;
        }
        await checkSshKeyForRemote(remotes[index].name, () => checkRemotesSequentially(index + 1));
      };
      await checkRemotesSequentially(0);
    } else {
      await checkSshKeyForRemote(effectiveRemote, doFetch);
    }
  };

  const cancelOperation = useCallback(async () => {
    if (fetchOperation) {
      try {
        await shellApi.cancelOperation(fetchOperation.id);
      } catch (err) {
        console.warn('Failed to cancel fetch operation:', err);
      }
    }
    setShowCancelConfirm(false);
    setError(null);
    onClose();
  }, [fetchOperation, onClose]);

  const handleClose = useCallback(() => {
    if (isLoading && fetchOperation) {
      setShowCancelConfirm(true);
      return;
    }
    setError(null);
    onClose();
  }, [isLoading, fetchOperation, onClose]);

  useEffect(() => {
    closeHandlerRef.current = handleClose;
    return () => {
      closeHandlerRef.current = null;
    };
  }, [closeHandlerRef, handleClose]);

  return (
    <DialogContent className="max-w-120">
      <DialogTitle icon={RefreshCw}>{t('remotes.fetch.title')}</DialogTitle>

      <DialogBody>
        {showCancelConfirm ? (
          <Alert variant="warning">{t('remotes.fetch.cancelConfirm')}</Alert>
        ) : (
          <>
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
                  value={effectiveRemote}
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
          </>
        )}
      </DialogBody>

      <DialogFooter>
        {showCancelConfirm ? (
          <>
            <Button variant="secondary" onClick={() => setShowCancelConfirm(false)}>
              {t('remotes.fetch.continueOperation')}
            </Button>
            <Button variant="destructive" onClick={cancelOperation}>
              {t('remotes.fetch.cancelOperation')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleFetch}
              disabled={isLoading || (!fetchAll && !effectiveRemote)}
            >
              {isLoading ? t('common.fetching') : t('remotes.fetch.fetchButton')}
            </Button>
          </>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
