import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpFromLine } from 'lucide-react';

import { toast, useOperationProgress, useSshKeyCheck } from '@/hooks';
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

interface PushDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PushDialog({ isOpen, onClose }: PushDialogProps) {
  const { t } = useTranslation();
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [selectedRemote, setSelectedRemote] = useState('');
  const [force, setForce] = useState(false);
  const [setUpstream, setSetUpstream] = useState(false);
  const [tags, setTags] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { branches, loadBranches, refreshRepository } = useRepositoryStore();
  const pushOperation = useOperationProgress('Push');
  const currentBranch = branches.find((b) => b.isHead);
  const { checkSshKeyForRemote } = useSshKeyCheck();

  // Extract remote name from upstream (e.g., "origin/main" -> "origin")
  const upstreamRemote = currentBranch?.upstream?.split('/')[0];
  // Show setUpstream checkbox only if no upstream or pushing to different remote
  const showSetUpstream = !upstreamRemote || upstreamRemote !== selectedRemote;

  useEffect(() => {
    if (isOpen) {
      loadRemotes();
      setError(null);
      setForce(false);
      setTags(false);
      // Pre-select upstream remote if available
      if (currentBranch?.upstream) {
        const remoteName = currentBranch.upstream.split('/')[0];
        setSelectedRemote(remoteName);
        setSetUpstream(false);
      } else {
        setSetUpstream(true);
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

  const doPush = async () => {
    if (!selectedRemote || !currentBranch) return;

    setIsLoading(true);
    setError(null);

    try {
      await remoteApi.pushCurrentBranch(selectedRemote, {
        force,
        setUpstream,
        tags,
      });

      await Promise.all([loadBranches(), refreshRepository()]);

      onClose();
      toast.success(t('remotes.push.complete'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    if (!selectedRemote || !currentBranch) return;
    await checkSshKeyForRemote(selectedRemote, doPush);
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-120">
        <DialogTitle icon={ArrowUpFromLine}>{t('remotes.push.title')}</DialogTitle>

        <DialogBody>
          {currentBranch && (
            <div className="dialog-info-box">
              <div className="flex justify-between text-base py-1">
                <span className="text-(--text-secondary)">{t('remotes.push.currentBranch')}</span>
                <span className="text-(--text-primary) font-medium">{currentBranch.name}</span>
              </div>
              {currentBranch.ahead !== null && currentBranch.ahead > 0 && (
                <div className="flex justify-between text-base py-1">
                  <span className="text-(--text-secondary)">{t('remotes.push.commitsAhead')}</span>
                  <span className="text-(--text-primary) font-medium">{currentBranch.ahead}</span>
                </div>
              )}
              {currentBranch.upstream && (
                <div className="flex justify-between text-base py-1">
                  <span className="text-(--text-secondary)">{t('remotes.push.upstream')}</span>
                  <span className="text-(--text-primary) font-medium">
                    {currentBranch.upstream}
                  </span>
                </div>
              )}
            </div>
          )}

          <FormField label={t('remotes.push.remoteLabel')} htmlFor="remote-select">
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

          {showSetUpstream && (
            <CheckboxField
              id="set-upstream"
              label={t('remotes.push.setUpstream')}
              checked={setUpstream}
              onCheckedChange={setSetUpstream}
              disabled={isLoading}
            />
          )}

          <CheckboxField
            id="tags"
            label={t('remotes.push.includeTags')}
            checked={tags}
            onCheckedChange={setTags}
            disabled={isLoading}
          />

          <CheckboxField
            id="force-push"
            label={t('remotes.push.forcePush')}
            checked={force}
            onCheckedChange={setForce}
            disabled={isLoading}
          />

          {pushOperation?.progress && (
            <OperationProgressBar progress={pushOperation.progress} className="mt-3" />
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
            onClick={handlePush}
            disabled={isLoading || !selectedRemote || !currentBranch}
          >
            {isLoading ? t('common.pushing') : t('remotes.push.pushButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
