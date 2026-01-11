import { useState, useEffect } from 'react';
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

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  const inputClass =
    'w-full py-2 px-3 text-sm bg-(--bg-input) border border-(--border-color) rounded text-(--text-primary) font-inherit focus:outline-none focus:border-(--accent-color)';
  const checkboxLabelClass =
    'flex items-center gap-2 text-[13px] text-(--text-primary) cursor-pointer';
  const btnClass = 'py-2 px-4 text-[13px] font-medium rounded cursor-pointer transition-colors';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999"
      onClick={handleClose}
    >
      <div
        className="bg-(--bg-primary) rounded-lg shadow-xl min-w-112.5 max-w-125 max-h-[80vh] overflow-hidden flex flex-col z-10000"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-(--border-color) shrink-0 bg-(--bg-primary)">
          <div className="flex items-center gap-2 text-base font-semibold text-(--text-primary)">
            <TagIcon size={20} />
            <span>Add Tag</span>
          </div>
          <button
            className="flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer hover:bg-(--bg-hover) hover:text-(--text-primary)"
            onClick={handleClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-error/10 border border-error/30 rounded-md text-error text-[13px] mb-4">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {result && result.success ? (
            <div className="flex items-start gap-2 p-3 bg-success/10 border border-success/30 rounded-md text-success text-[13px] mb-4">
              <Check size={16} />
              <span>Tag '{result.tag?.name}' created successfully</span>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label
                  htmlFor="tag-name"
                  className="block mb-1.5 text-[13px] font-medium text-(--text-secondary)"
                >
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
                  className={inputClass}
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1.5 text-[13px] font-medium text-(--text-secondary)">
                  Commit:
                </label>
                <div className="flex flex-col gap-2.5 mt-1">
                  <label className={checkboxLabelClass}>
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
                  <label className={checkboxLabelClass}>
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
                        className={cn(inputClass, 'font-mono text-[13px]')}
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
                <label className={cn(checkboxLabelClass, 'whitespace-nowrap')}>
                  <input
                    type="checkbox"
                    checked={pushTag}
                    onChange={(e) => setPushTag(e.target.checked)}
                    disabled={isLoading}
                    className="w-auto m-0 accent-(--accent-color)"
                  />
                  <span>Push tag:</span>
                </label>
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
                    <label className={checkboxLabelClass}>
                      <input
                        type="checkbox"
                        checked={forceMove}
                        onChange={(e) => setForceMove(e.target.checked)}
                        disabled={isLoading}
                        className="w-auto m-0 accent-(--accent-color)"
                      />
                      <span>Move existing tag</span>
                    </label>

                    <label className={checkboxLabelClass}>
                      <input
                        type="checkbox"
                        checked={isLightweight}
                        onChange={(e) => setIsLightweight(e.target.checked)}
                        disabled={isLoading}
                        className="w-auto m-0 accent-(--accent-color)"
                      />
                      <span>Lightweight tag (not recommended)</span>
                    </label>

                    {!isLightweight && (
                      <div className="mt-1">
                        <label
                          htmlFor="tag-message"
                          className="block mb-1.5 text-[13px] font-medium text-(--text-secondary)"
                        >
                          Message:
                        </label>
                        <textarea
                          id="tag-message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Tag message..."
                          rows={3}
                          disabled={isLoading}
                          className={cn(inputClass, 'resize-y min-h-15')}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-(--border-color) shrink-0 bg-(--bg-primary)">
          {result && result.success ? (
            <button
              className={cn(
                btnClass,
                'bg-(--accent-color) border border-(--accent-color) text-white hover:bg-(--accent-color-hover)'
              )}
              onClick={handleClose}
            >
              Close
            </button>
          ) : (
            <>
              <button
                className={cn(
                  btnClass,
                  'bg-transparent border border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                )}
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className={cn(
                  btnClass,
                  'bg-(--accent-color) border border-(--accent-color) text-white hover:not-disabled:bg-(--accent-color-hover) disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                onClick={handleCreate}
                disabled={isLoading || !tagName.trim()}
              >
                {isLoading ? 'Creating...' : 'Add'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
