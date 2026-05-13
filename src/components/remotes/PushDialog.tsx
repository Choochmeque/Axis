import { useQuery } from '@tanstack/react-query';
import { ArrowUpFromLine } from 'lucide-react';
import { useState } from 'react';
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
import { queryKeys } from '@/lib/queryKeys';
import { remoteApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';

interface PushDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PushDialog({ isOpen, onClose }: PushDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && <PushDialogContent onClose={onClose} />}
    </Dialog>
  );
}

function PushDialogContent({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { branches, loadBranches, refreshRepository } = useRepositoryStore();
  const currentBranch = branches.find((b) => b.isHead);
  const upstreamRemote = currentBranch?.upstream?.split('/')[0] ?? '';

  const [selectedRemote, setSelectedRemote] = useState(upstreamRemote);
  const [force, setForce] = useState(false);
  const [setUpstream, setSetUpstream] = useState(!upstreamRemote);
  const [tags, setTags] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pushOperation = useOperationProgress('Push');
  const { checkSshKeyForRemote } = useSshKeyCheck();

  const { data: remotes = [] } = useQuery({
    queryKey: queryKeys.remotes(),
    queryFn: () => remoteApi.list(),
  });

  const effectiveRemote = selectedRemote || remotes[0]?.name || '';
  // Show setUpstream checkbox only if no upstream or pushing to different remote
  const showSetUpstream = !upstreamRemote || upstreamRemote !== effectiveRemote;

  const doPush = async () => {
    if (!effectiveRemote || !currentBranch) return;

    setIsLoading(true);
    setError(null);

    try {
      await remoteApi.pushCurrentBranch(effectiveRemote, {
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
    if (!effectiveRemote || !currentBranch) return;
    await checkSshKeyForRemote(effectiveRemote, doPush);
  };

  return (
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
                <span className="text-(--text-primary) font-medium">{currentBranch.upstream}</span>
              </div>
            )}
          </div>
        )}

        <FormField label={t('remotes.push.remoteLabel')} htmlFor="remote-select">
          <Select
            id="remote-select"
            value={effectiveRemote}
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
          disabled={isLoading || !effectiveRemote || !currentBranch}
        >
          {isLoading ? t('common.pushing') : t('remotes.push.pushButton')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
