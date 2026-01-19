import { useState, useEffect } from 'react';
import { Tag as TagIcon, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { tagApi, remoteApi } from '../../services/api';
import type { TagResult, Remote } from '../../types';
import { cn } from '../../lib/utils';
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
  Select,
  Textarea,
  CheckboxField,
  Alert,
} from '@/components/ui';

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTagCreated?: (result: TagResult) => void;
  targetCommit?: string;
  targetCommitSummary?: string;
}

type CommitTarget = 'head' | 'specified';

export function TagDialog({
  isOpen,
  onClose,
  onTagCreated,
  targetCommit,
  targetCommitSummary,
}: TagDialogProps) {
  const [tagName, setTagName] = useState('');
  const [commitTarget, setCommitTarget] = useState<CommitTarget>(
    targetCommit ? 'specified' : 'head'
  );
  const [specifiedCommit, setSpecifiedCommit] = useState(targetCommit || '');
  const [pushTag, setPushTag] = useState(false);
  const [selectedRemote, setSelectedRemote] = useState('origin');
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [forceMove, setForceMove] = useState(false);
  const [isLightweight, setIsLightweight] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      setTagName('');
      setCommitTarget(targetCommit ? 'specified' : 'head');
      setSpecifiedCommit(targetCommit || '');
      setPushTag(false);
      setShowAdvanced(false);
      setForceMove(false);
      setIsLightweight(false);
      setMessage('');
      setError(null);

      // Load remotes
      remoteApi.list().then(setRemotes).catch(console.error);
    }
  }, [isOpen, targetCommit]);

  const handleCreate = async () => {
    if (!tagName.trim()) {
      setError('Tag name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const target = commitTarget === 'specified' ? specifiedCommit : null;
      const tagResult = await tagApi.create(tagName, {
        target,
        annotated: !isLightweight,
        message: !isLightweight ? message || null : null,
        force: forceMove,
      });

      if (tagResult.success) {
        // Push tag if requested
        if (pushTag && selectedRemote) {
          try {
            await tagApi.push(tagName, selectedRemote);
          } catch (pushErr) {
            console.error('Failed to push tag:', pushErr);
          }
        }

        onTagCreated?.(tagResult);
        onClose();
        toast.success(`Tag "${tagName}" created`);
      } else {
        setError(tagResult.message);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const radioLabelClass = 'flex items-center gap-2 text-base text-(--text-primary) cursor-pointer';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-112.5">
        <DialogTitle icon={TagIcon}>Add Tag</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertCircle size={16} />
              <span>{error}</span>
            </Alert>
          )}

          <FormField label="Tag Name:" htmlFor="tag-name">
            <Input
              id="tag-name"
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="v1.0.0"
              disabled={isLoading}
              autoFocus
            />
          </FormField>

          <div className="field">
            <label className="label">Commit:</label>
            <div className="flex flex-col gap-2.5 mt-1">
              <label className={radioLabelClass}>
                <input
                  type="radio"
                  name="commit-target"
                  checked={commitTarget === 'head'}
                  onChange={() => setCommitTarget('head')}
                  disabled={isLoading}
                  className="w-auto m-0 accent-(--accent-color) shrink-0"
                />
                <span className="flex-1">Working copy parent</span>
              </label>
              <label className={radioLabelClass}>
                <input
                  type="radio"
                  name="commit-target"
                  checked={commitTarget === 'specified'}
                  onChange={() => setCommitTarget('specified')}
                  disabled={isLoading}
                  className="w-auto m-0 accent-(--accent-color) shrink-0"
                />
                <span className="flex-1">Specified commit:</span>
              </label>
              {commitTarget === 'specified' && (
                <div className="flex flex-col gap-1 ml-6">
                  <Input
                    type="text"
                    value={specifiedCommit}
                    onChange={(e) => setSpecifiedCommit(e.target.value)}
                    placeholder="Commit SHA"
                    disabled={isLoading}
                    className="font-mono text-base"
                  />
                  {targetCommitSummary && (
                    <span className="text-xs text-(--text-tertiary) overflow-hidden text-ellipsis whitespace-nowrap">
                      {targetCommitSummary}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <CheckboxField
              id="push-tag"
              label="Push tag:"
              checked={pushTag}
              disabled={isLoading}
              onCheckedChange={setPushTag}
              className="whitespace-nowrap mb-0"
            />
            <Select
              value={selectedRemote}
              onChange={(e) => setSelectedRemote(e.target.value)}
              disabled={isLoading || !pushTag}
              className="flex-1"
            >
              {remotes.map((remote) => (
                <option key={remote.name} value={remote.name}>
                  {remote.name}
                </option>
              ))}
              {remotes.length === 0 && <option value="origin">origin</option>}
            </Select>
          </div>

          <div className="mt-2 border-t border-(--border-color) pt-3">
            <button
              type="button"
              className="flex items-center gap-1 p-0 bg-transparent border-none text-(--text-secondary) text-base cursor-pointer hover:text-(--text-primary)"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>Advanced Options</span>
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-3 mt-3 pl-4.5">
                <CheckboxField
                  id="force-move"
                  label="Move existing tag"
                  checked={forceMove}
                  disabled={isLoading}
                  onCheckedChange={setForceMove}
                />

                <CheckboxField
                  id="lightweight"
                  label="Lightweight tag (not recommended)"
                  checked={isLightweight}
                  disabled={isLoading}
                  onCheckedChange={setIsLightweight}
                />

                {!isLightweight && (
                  <FormField label="Message:" htmlFor="tag-message" className="mt-1">
                    <Textarea
                      id="tag-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tag message..."
                      rows={3}
                      disabled={isLoading}
                      className={cn('resize-y min-h-15')}
                    />
                  </FormField>
                )}
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="primary" onClick={handleCreate} disabled={isLoading || !tagName.trim()}>
            {isLoading ? 'Creating...' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
