import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Tag as TagIcon, X, AlertCircle, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { tagApi, remoteApi } from '../../services/api';
import type { TagResult, Remote } from '../../types';
import { cn } from '../../lib/utils';

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
  const [result, setResult] = useState<TagResult | null>(null);

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
      setResult(null);

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
      const target = commitTarget === 'specified' ? specifiedCommit : undefined;
      const tagResult = await tagApi.create(tagName, {
        target,
        annotated: !isLightweight,
        message: !isLightweight ? message || undefined : undefined,
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

        setResult(tagResult);
        onTagCreated?.(tagResult);
      } else {
        setError(tagResult.message);
      }
    } catch (err) {
      console.error('Failed to create tag:', err);
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setIsLoading(false);
    }
  };

  const radioLabelClass =
    'flex items-center gap-2 text-[13px] text-(--text-primary) cursor-pointer';

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-animated" />
        <Dialog.Content className="dialog-content max-w-112.5">
          <Dialog.Title className="dialog-title">
            <TagIcon size={18} />
            Add Tag
          </Dialog.Title>

          <div className="dialog-body">
            {error && (
              <div className="alert alert-error mb-4">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {result && result.success ? (
              <div className="alert alert-success mb-4">
                <Check size={16} />
                <span>Tag '{result.tag?.name}' created successfully</span>
              </div>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="tag-name" className="label">
                    Tag Name:
                  </label>
                  <input
                    id="tag-name"
                    type="text"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="v1.0.0"
                    disabled={isLoading}
                    autoFocus
                    className="input"
                  />
                </div>

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
                        <input
                          type="text"
                          value={specifiedCommit}
                          onChange={(e) => setSpecifiedCommit(e.target.value)}
                          placeholder="Commit SHA"
                          disabled={isLoading}
                          className={cn('input', 'font-mono text-[13px]')}
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
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Checkbox.Root
                      id="push-tag"
                      className="checkbox"
                      checked={pushTag}
                      onCheckedChange={(checked) => setPushTag(checked === true)}
                      disabled={isLoading}
                    >
                      <Checkbox.Indicator>
                        <Check size={10} className="text-white" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <label htmlFor="push-tag" className="checkbox-label">
                      Push tag:
                    </label>
                  </div>
                  <select
                    value={selectedRemote}
                    onChange={(e) => setSelectedRemote(e.target.value)}
                    disabled={isLoading || !pushTag}
                    className="flex-1 py-1.5 px-2.5 text-[13px] bg-(--bg-input) border border-(--border-color) rounded text-(--text-primary) focus:outline-none focus:border-(--accent-color) disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {remotes.map((remote) => (
                      <option key={remote.name} value={remote.name}>
                        {remote.name}
                      </option>
                    ))}
                    {remotes.length === 0 && <option value="origin">origin</option>}
                  </select>
                </div>

                <div className="mt-2 border-t border-(--border-color) pt-3">
                  <button
                    type="button"
                    className="flex items-center gap-1 p-0 bg-transparent border-none text-(--text-secondary) text-[13px] cursor-pointer hover:text-(--text-primary)"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Advanced Options</span>
                  </button>

                  {showAdvanced && (
                    <div className="flex flex-col gap-3 mt-3 pl-4.5">
                      <div className="flex items-center gap-2">
                        <Checkbox.Root
                          id="force-move"
                          className="checkbox"
                          checked={forceMove}
                          onCheckedChange={(checked) => setForceMove(checked === true)}
                          disabled={isLoading}
                        >
                          <Checkbox.Indicator>
                            <Check size={10} className="text-white" />
                          </Checkbox.Indicator>
                        </Checkbox.Root>
                        <label htmlFor="force-move" className="checkbox-label">
                          Move existing tag
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox.Root
                          id="lightweight"
                          className="checkbox"
                          checked={isLightweight}
                          onCheckedChange={(checked) => setIsLightweight(checked === true)}
                          disabled={isLoading}
                        >
                          <Checkbox.Indicator>
                            <Check size={10} className="text-white" />
                          </Checkbox.Indicator>
                        </Checkbox.Root>
                        <label htmlFor="lightweight" className="checkbox-label">
                          Lightweight tag (not recommended)
                        </label>
                      </div>

                      {!isLightweight && (
                        <div className="mt-1">
                          <label htmlFor="tag-message" className="label">
                            Message:
                          </label>
                          <textarea
                            id="tag-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Tag message..."
                            rows={3}
                            disabled={isLoading}
                            className={cn('input', 'resize-y min-h-15')}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="dialog-footer">
            {result && result.success ? (
              <button className="btn btn-primary" onClick={onClose}>
                Close
              </button>
            ) : (
              <>
                <Dialog.Close asChild>
                  <button className="btn btn-secondary" disabled={isLoading}>
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  className="btn btn-primary"
                  onClick={handleCreate}
                  disabled={isLoading || !tagName.trim()}
                >
                  {isLoading ? 'Creating...' : 'Add'}
                </button>
              </>
            )}
          </div>

          <Dialog.Close asChild>
            <button className="btn-close absolute top-3 right-3" aria-label="Close">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
