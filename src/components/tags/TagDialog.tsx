import { ChevronDown, ChevronRight, Tag as TagIcon } from 'lucide-react';
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
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@/components/ui';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { cn } from '../../lib/utils';
import { remoteApi, tagApi } from '../../services/api';
import type { Remote, TagResult } from '../../types';

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
  const { t } = useTranslation();
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
      setError(t('sidebar.tag.dialog.tagNameRequired'));
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
        toast.success(t('sidebar.tag.dialog.tagCreated', { name: tagName }));
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
        <DialogTitle icon={TagIcon}>{t('sidebar.tag.dialog.title')}</DialogTitle>

        <DialogBody>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <FormField label={t('sidebar.tag.dialog.tagNameLabel')} htmlFor="tag-name">
            <Input
              id="tag-name"
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder={t('sidebar.tag.dialog.tagNamePlaceholder')}
              disabled={isLoading}
              autoFocus
            />
          </FormField>

          <div className="field">
            <label className="label">{t('sidebar.tag.dialog.commitLabel')}</label>
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
                <span className="flex-1">{t('sidebar.tag.dialog.workingCopyParent')}</span>
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
                <span className="flex-1">{t('sidebar.tag.dialog.specifiedCommit')}</span>
              </label>
              {commitTarget === 'specified' && (
                <div className="flex flex-col gap-1 ml-6">
                  <Input
                    type="text"
                    value={specifiedCommit}
                    onChange={(e) => setSpecifiedCommit(e.target.value)}
                    placeholder={t('sidebar.tag.dialog.commitShaPlaceholder')}
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
              label={t('sidebar.tag.dialog.pushTagLabel')}
              checked={pushTag}
              disabled={isLoading}
              onCheckedChange={setPushTag}
              className="whitespace-nowrap mb-0"
            />
            <Select
              value={selectedRemote}
              onValueChange={setSelectedRemote}
              disabled={isLoading || !pushTag}
              className="flex-1"
            >
              {remotes.map((remote) => (
                <SelectItem key={remote.name} value={remote.name}>
                  {remote.name}
                </SelectItem>
              ))}
              {remotes.length === 0 && <SelectItem value="origin">origin</SelectItem>}
            </Select>
          </div>

          <div className="mt-2 border-t border-(--border-color) pt-3">
            <button
              type="button"
              className="flex items-center gap-1 p-0 bg-transparent border-none text-(--text-secondary) text-base cursor-pointer hover:text-(--text-primary)"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>{t('sidebar.tag.dialog.advancedOptions')}</span>
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-3 mt-3 pl-4.5">
                <CheckboxField
                  id="force-move"
                  label={t('sidebar.tag.dialog.moveExisting')}
                  checked={forceMove}
                  disabled={isLoading}
                  onCheckedChange={setForceMove}
                />

                <CheckboxField
                  id="lightweight"
                  label={t('sidebar.tag.dialog.lightweight')}
                  checked={isLightweight}
                  disabled={isLoading}
                  onCheckedChange={setIsLightweight}
                />

                {!isLightweight && (
                  <FormField
                    label={t('sidebar.tag.dialog.messageLabel')}
                    htmlFor="tag-message"
                    className="mt-1"
                  >
                    <Textarea
                      id="tag-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t('sidebar.tag.dialog.messagePlaceholder')}
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
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button variant="primary" onClick={handleCreate} disabled={isLoading || !tagName.trim()}>
            {isLoading ? t('sidebar.tag.dialog.creating') : t('sidebar.tag.dialog.addButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
