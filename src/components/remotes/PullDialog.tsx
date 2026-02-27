import { ArrowDownToLine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  CheckboxField,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  FormField,
  OperationProgressBar,
  Select,
  SelectItem,
} from '@/components/ui';
import { toast, useOperationProgress, useSshKeyCheck } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';
import type { Remote } from '../../types';

interface PullDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PullDialog({ isOpen, onClose }: PullDialogProps) {
  const { t } = useTranslation();
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [selectedRemote, setSelectedRemote] = useState('');
  const [rebase, setRebase] = useState(false);
  const [ffOnly, setFfOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { branches, loadBranches, loadCommits, refreshRepository } = useRepositoryStore();
  const pullOperation = useOperationProgress('Pull');
  const currentBranch = branches.find((b) => b.isHead);
  const { checkSshKeyForRemote } = useSshKeyCheck();

  useEffect(() => {
    if (isOpen) {
      loadRemotes();
      setError(null);
      setRebase(false);
      setFfOnly(false);

      // Pre-select upstream remote if available
      if (currentBranch?.upstream) {
        const remoteName = currentBranch.upstream.split('/')[0];
        setSelectedRemote(remoteName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentBranch]);

  const loadRemotes = async () => {
    try {
      const data = await remoteApi.list();
      setRemotes(data);
      if (data.length > 0 && !selectedRemote) {
        setSelectedRemote(data[0].name);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const doPull = async () => {
    if (!selectedRemote || !currentBranch) return;

    setIsLoading(true);
    setError(null);

    try {
      await remoteApi.pull(selectedRemote, currentBranch.name, { rebase, ffOnly });

      await Promise.all([loadBranches(), loadCommits(), refreshRepository()]);

      onClose();
      toast.success(t('remotes.pull.complete'));
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      if (errorMsg.includes('fast-forward')) {
        setError(t('remotes.pull.errors.fastForward'));
      } else if (errorMsg.includes('conflict')) {
        setError(t('remotes.pull.errors.conflict'));
      } else if (errorMsg.includes('rebase')) {
        setError(t('remotes.pull.errors.rebase'));
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePull = async () => {
    if (!selectedRemote || !currentBranch) return;
    await checkSshKeyForRemote(selectedRemote, doPull);
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-120">
        <DialogTitle icon={ArrowDownToLine}>{t('remotes.pull.title')}</DialogTitle>

        <DialogBody>
          {currentBranch && (
            <div className="dialog-info-box">
              <div className="flex justify-between text-base py-1">
                <span className="text-(--text-secondary)">{t('remotes.pull.currentBranch')}</span>
                <span className="text-(--text-primary) font-medium">{currentBranch.name}</span>
              </div>
              {currentBranch.behind !== null && currentBranch.behind > 0 && (
                <div className="flex justify-between text-base py-1">
                  <span className="text-(--text-secondary)">{t('remotes.pull.commitsBehind')}</span>
                  <span className="text-(--text-primary) font-medium">{currentBranch.behind}</span>
                </div>
              )}
              {currentBranch.upstream && (
                <div className="flex justify-between text-base py-1">
                  <span className="text-(--text-secondary)">{t('remotes.pull.upstream')}</span>
                  <span className="text-(--text-primary) font-medium">
                    {currentBranch.upstream}
                  </span>
                </div>
              )}
            </div>
          )}

          <FormField label={t('remotes.pull.remoteLabel')} htmlFor="remote-select">
            <Select
              id="remote-select"
              value={selectedRemote}
              onValueChange={setSelectedRemote}
              disabled={remotes.length === 0 || isLoading}
            >
              {remotes.map((remote) => (
                <SelectItem key={remote.name} value={remote.name}>
                  {remote.name}
                </SelectItem>
              ))}
            </Select>
          </FormField>

          <CheckboxField
            id="rebase"
            label={t('remotes.pull.rebase')}
            checked={rebase}
            disabled={ffOnly || isLoading}
            onCheckedChange={(checked) => {
              setRebase(checked);
              if (checked) setFfOnly(false);
            }}
          />

          <CheckboxField
            id="ff-only"
            label={t('remotes.pull.ffOnly')}
            checked={ffOnly}
            disabled={rebase || isLoading}
            onCheckedChange={(checked) => {
              setFfOnly(checked);
              if (checked) setRebase(false);
            }}
          />

          {pullOperation?.progress && (
            <OperationProgressBar progress={pullOperation.progress} className="mt-3" />
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
            onClick={handlePull}
            disabled={isLoading || !selectedRemote || !currentBranch}
          >
            {isLoading ? t('common.pulling') : t('remotes.pull.pullButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
