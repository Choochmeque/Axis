import { useState, useEffect } from 'react';
import { Tag as TagIcon, X, AlertCircle, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { tagApi, remoteApi } from '../../services/api';
import type { TagResult, Remote } from '../../types';
import './TagDialog.css';

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
  const [commitTarget, setCommitTarget] = useState<CommitTarget>(targetCommit ? 'specified' : 'head');
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

  return (
    <div className="tag-dialog-overlay" onClick={handleClose}>
      <div className="dialog tag-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-title">
            <TagIcon size={20} />
            <span>Add Tag</span>
          </div>
          <button className="dialog-close" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        <div className="dialog-content">
          {error && (
            <div className="dialog-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {result && result.success ? (
            <div className="dialog-result success">
              <Check size={16} />
              <span>Tag '{result.tag?.name}' created successfully</span>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="tag-name">Tag Name:</label>
                <input
                  id="tag-name"
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="v1.0.0"
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Commit:</label>
                <div className="commit-options">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="commit-target"
                      checked={commitTarget === 'head'}
                      onChange={() => setCommitTarget('head')}
                      disabled={isLoading}
                    />
                    <span>Working copy parent</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="commit-target"
                      checked={commitTarget === 'specified'}
                      onChange={() => setCommitTarget('specified')}
                      disabled={isLoading}
                    />
                    <span>Specified commit:</span>
                  </label>
                  {commitTarget === 'specified' && (
                    <div className="specified-commit-input">
                      <input
                        type="text"
                        value={specifiedCommit}
                        onChange={(e) => setSpecifiedCommit(e.target.value)}
                        placeholder="Commit SHA"
                        disabled={isLoading}
                      />
                      {targetCommitSummary && (
                        <span className="commit-summary-hint">{targetCommitSummary}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group checkbox-inline">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={pushTag}
                    onChange={(e) => setPushTag(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>Push tag:</span>
                </label>
                <select
                  value={selectedRemote}
                  onChange={(e) => setSelectedRemote(e.target.value)}
                  disabled={isLoading || !pushTag}
                  className="remote-select"
                >
                  {remotes.map((remote) => (
                    <option key={remote.name} value={remote.name}>
                      {remote.name}
                    </option>
                  ))}
                  {remotes.length === 0 && <option value="origin">origin</option>}
                </select>
              </div>

              <div className="advanced-section">
                <button
                  type="button"
                  className="advanced-toggle"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>Advanced Options</span>
                </button>

                {showAdvanced && (
                  <div className="advanced-content">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={forceMove}
                        onChange={(e) => setForceMove(e.target.checked)}
                        disabled={isLoading}
                      />
                      <span>Move existing tag</span>
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={isLightweight}
                        onChange={(e) => setIsLightweight(e.target.checked)}
                        disabled={isLoading}
                      />
                      <span>Lightweight tag (not recommended)</span>
                    </label>

                    {!isLightweight && (
                      <div className="form-group message-group">
                        <label htmlFor="tag-message">Message:</label>
                        <textarea
                          id="tag-message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Tag message..."
                          rows={3}
                          disabled={isLoading}
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
            <button className="btn btn-primary" onClick={handleClose}>
              Close
            </button>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </button>
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
      </div>
    </div>
  );
}
