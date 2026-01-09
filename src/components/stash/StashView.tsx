import { useState, useEffect, useCallback } from 'react';
import { Archive, Play, Trash2, Plus, RefreshCw, GitBranch, AlertCircle, X } from 'lucide-react';
import { stashApi } from '../../services/api';
import type { StashEntry, StashResult } from '../../types';
import './StashView.css';

interface StashViewProps {
  onRefresh?: () => void;
}

export function StashView({ onRefresh }: StashViewProps) {
  const [stashes, setStashes] = useState<StashEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [stashMessage, setStashMessage] = useState('');
  const [includeUntracked, setIncludeUntracked] = useState(false);
  const [keepIndex, setKeepIndex] = useState(false);

  const loadStashes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stashList = await stashApi.list();
      setStashes(stashList);
    } catch (err) {
      console.error('Failed to load stashes:', err);
      setError('Failed to load stashes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStashes();
  }, [loadStashes]);

  const handleSave = async () => {
    try {
      const result = await stashApi.save({
        message: stashMessage || undefined,
        include_untracked: includeUntracked,
        keep_index: keepIndex,
      });

      if (result.success) {
        setShowCreateDialog(false);
        setStashMessage('');
        setIncludeUntracked(false);
        setKeepIndex(false);
        await loadStashes();
        onRefresh?.();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to save stash:', err);
      setError('Failed to save stash');
    }
  };

  const handleApply = async (index: number) => {
    try {
      const result = await stashApi.apply({ index });
      if (result.success) {
        onRefresh?.();
      } else if (result.conflicts.length > 0) {
        setError(`Stash applied with conflicts in: ${result.conflicts.join(', ')}`);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to apply stash:', err);
      setError('Failed to apply stash');
    }
  };

  const handlePop = async (index: number) => {
    try {
      const result = await stashApi.pop({ index });
      if (result.success) {
        await loadStashes();
        onRefresh?.();
      } else if (result.conflicts.length > 0) {
        setError(`Stash applied with conflicts (not dropped): ${result.conflicts.join(', ')}`);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to pop stash:', err);
      setError('Failed to pop stash');
    }
  };

  const handleDrop = async (index: number) => {
    try {
      const result = await stashApi.drop(index);
      if (result.success) {
        await loadStashes();
        setSelectedIndex(null);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to drop stash:', err);
      setError('Failed to drop stash');
    }
  };

  const handleBranch = async (index: number) => {
    const branchName = prompt('Enter branch name:');
    if (!branchName) return;

    try {
      const result = await stashApi.branch(branchName, index);
      if (result.success) {
        await loadStashes();
        onRefresh?.();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to create branch from stash:', err);
      setError('Failed to create branch from stash');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="stash-view">
      <div className="stash-header">
        <div className="stash-title">
          <Archive size={16} />
          <span>Stashes</span>
          <span className="stash-count">{stashes.length}</span>
        </div>
        <div className="stash-actions">
          <button
            className="btn-icon"
            onClick={() => setShowCreateDialog(true)}
            title="Create stash"
          >
            <Plus size={16} />
          </button>
          <button
            className="btn-icon"
            onClick={loadStashes}
            title="Refresh"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="stash-error">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="stash-list">
        {stashes.length === 0 ? (
          <div className="stash-empty">No stashes</div>
        ) : (
          stashes.map((stash) => (
            <div
              key={stash.index}
              className={`stash-item ${selectedIndex === stash.index ? 'selected' : ''}`}
              onClick={() => setSelectedIndex(stash.index)}
            >
              <div className="stash-item-header">
                <span className="stash-ref">{stash.stash_ref}</span>
                {stash.branch && (
                  <span className="stash-branch">{stash.branch}</span>
                )}
              </div>
              <div className="stash-message">{stash.message}</div>
              <div className="stash-meta">
                <span className="stash-author">{stash.author}</span>
                <span className="stash-time">{formatTimestamp(stash.timestamp)}</span>
              </div>
              {selectedIndex === stash.index && (
                <div className="stash-item-actions">
                  <button
                    className="btn btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply(stash.index);
                    }}
                    title="Apply stash (keep in list)"
                  >
                    <Play size={12} />
                    Apply
                  </button>
                  <button
                    className="btn btn-small btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePop(stash.index);
                    }}
                    title="Pop stash (apply and remove)"
                  >
                    Pop
                  </button>
                  <button
                    className="btn btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBranch(stash.index);
                    }}
                    title="Create branch from stash"
                  >
                    <GitBranch size={12} />
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDrop(stash.index);
                    }}
                    title="Drop stash"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showCreateDialog && (
        <div className="dialog-overlay" onClick={() => setShowCreateDialog(false)}>
          <div className="dialog stash-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="dialog-title">
                <Archive size={20} />
                <span>Create Stash</span>
              </div>
              <button className="dialog-close" onClick={() => setShowCreateDialog(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="dialog-content">
              <div className="form-group">
                <label htmlFor="stash-message">Message (optional)</label>
                <input
                  id="stash-message"
                  type="text"
                  value={stashMessage}
                  onChange={(e) => setStashMessage(e.target.value)}
                  placeholder="Stash message..."
                />
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeUntracked}
                    onChange={(e) => setIncludeUntracked(e.target.checked)}
                  />
                  <span>Include untracked files</span>
                </label>
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={keepIndex}
                    onChange={(e) => setKeepIndex(e.target.checked)}
                  />
                  <span>Keep staged changes in index</span>
                </label>
              </div>
            </div>
            <div className="dialog-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Create Stash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
