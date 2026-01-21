import { useState, useEffect } from 'react';
import { ArrowUpFromLine } from 'lucide-react';

import { toast, useOperation } from '@/hooks';
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
} from '@/components/ui';

interface PushDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PushDialog({ open, onOpenChange }: PushDialogProps) {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [selectedRemote, setSelectedRemote] = useState('');
  const [force, setForce] = useState(false);
  const [setUpstream, setSetUpstream] = useState(false);
  const [tags, setTags] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { branches, loadBranches, refreshRepository } = useRepositoryStore();
  const { trackOperation } = useOperation();
  const currentBranch = branches.find((b) => b.isHead);

  useEffect(() => {
    if (open) {
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
  }, [open, currentBranch]);

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

  const handlePush = async () => {
    if (!selectedRemote || !currentBranch) return;

    setIsLoading(true);
    setError(null);

    try {
      await trackOperation(
        { name: 'Push', description: `Pushing to ${selectedRemote}`, category: 'git' },
        async () => {
          await remoteApi.pushCurrentBranch(selectedRemote, {
            force,
            setUpstream,
            tags,
          });

          await loadBranches();
          await refreshRepository();
        }
      );
      onOpenChange(false);
      toast.success('Push complete');
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
        <DialogTitle icon={ArrowUpFromLine}>Push to Remote</DialogTitle>

        <DialogBody>
          {currentBranch && (
            <div className="dialog-info-box">
              <div className="flex justify-between text-base py-1">
                <span className="text-(--text-secondary)">Current branch:</span>
                <span className="text-(--text-primary) font-medium">{currentBranch.name}</span>
              </div>
              {currentBranch.ahead !== null && currentBranch.ahead > 0 && (
                <div className="flex justify-between text-base py-1">
                  <span className="text-(--text-secondary)">Commits ahead:</span>
                  <span className="text-(--text-primary) font-medium">{currentBranch.ahead}</span>
                </div>
              )}
              {currentBranch.upstream && (
                <div className="flex justify-between text-base py-1">
                  <span className="text-(--text-secondary)">Upstream:</span>
                  <span className="text-(--text-primary) font-medium">
                    {currentBranch.upstream}
                  </span>
                </div>
              )}
            </div>
          )}

          <FormField label="Push to Remote" htmlFor="remote-select">
            <Select
              id="remote-select"
              value={selectedRemote}
              onValueChange={setSelectedRemote}
              disabled={remotes.length === 0}
            >
              {remotes.map((remote) => (
                <SelectItem key={remote.name} value={remote.name}>
                  {remote.name}
                </SelectItem>
              ))}
            </Select>
          </FormField>

          <CheckboxField
            id="set-upstream"
            label="Set as upstream tracking branch"
            checked={setUpstream}
            onCheckedChange={setSetUpstream}
          />

          <CheckboxField id="tags" label="Include tags" checked={tags} onCheckedChange={setTags} />

          <CheckboxField
            id="force-push"
            label="Force push (overwrites remote changes)"
            checked={force}
            onCheckedChange={setForce}
          />

          {error && (
            <Alert variant="error" inline className="mt-3">
              {error}
            </Alert>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handlePush}
            disabled={isLoading || !selectedRemote || !currentBranch}
          >
            {isLoading ? 'Pushing...' : 'Push'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
