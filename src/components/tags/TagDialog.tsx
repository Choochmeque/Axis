import { useState } from 'react';
import { Tag as TagIcon, X, AlertCircle, Check } from 'lucide-react';
import { tagApi } from '../../services/api';
import type { TagResult } from '../../types';
import './TagDialog.css';

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTagCreated?: (result: TagResult) => void;
  targetCommit?: string;
  targetCommitSummary?: string;
}

export function TagDialog({
  isOpen,
  onClose,
  onTagCreated,
  targetCommit,
  targetCommitSummary,
}: TagDialogProps) {
  const [tagName, setTagName] = useState('');
  const [message, setMessage] = useState('');
  const [isAnnotated, setIsAnnotated] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TagResult | null>(null);

  const handleCreate = async () => {
    if (!tagName.trim()) {
      setError('Tag name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tagResult = await tagApi.create(tagName, {
        target: targetCommit,
        annotated: isAnnotated,
        message: isAnnotated ? message || undefined : undefined,
      });

      setResult(tagResult);

      if (tagResult.success) {
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
    setTagName('');
    setMessage('');
    setIsAnnotated(true);
    setError(null);
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="dialog tag-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-title">
            <TagIcon size={20} />
            <span>Create Tag</span>
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
              {targetCommit && (
                <div className="form-group">
                  <label>Target Commit</label>
                  <div className="target-commit">
                    <span className="commit-oid">{targetCommit.substring(0, 7)}</span>
                    {targetCommitSummary && (
                      <span className="commit-summary">{targetCommitSummary}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="tag-name">Tag Name</label>
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

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isAnnotated}
                    onChange={(e) => setIsAnnotated(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>Annotated tag</span>
                </label>
                <p className="checkbox-description">
                  Annotated tags include a message and tagger information
                </p>
              </div>

              {isAnnotated && (
                <div className="form-group">
                  <label htmlFor="tag-message">Message</label>
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
                {isLoading ? 'Creating...' : 'Create Tag'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
