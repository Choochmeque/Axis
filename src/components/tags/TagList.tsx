import { useState, useEffect, useCallback } from 'react';
import { Tag as TagIcon, Trash2, Upload, Plus, RefreshCw, AlertCircle, X } from 'lucide-react';
import { tagApi, remoteApi } from '../../services/api';
import type { Tag, Remote } from '../../types';
import { TagDialog } from './TagDialog';
import './TagDialog.css';

interface TagListProps {
  onRefresh?: () => void;
  onTagSelect?: (tag: Tag) => void;
}

export function TagList({ onRefresh, onTagSelect }: TagListProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadTags = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tagList, remoteList] = await Promise.all([
        tagApi.list(),
        remoteApi.list(),
      ]);
      setTags(tagList);
      setRemotes(remoteList);
    } catch (err) {
      console.error('Failed to load tags:', err);
      setError('Failed to load tags');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete tag '${name}'?`)) return;

    try {
      const result = await tagApi.delete(name);
      if (result.success) {
        await loadTags();
        if (selectedTag === name) {
          setSelectedTag(null);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to delete tag:', err);
      setError('Failed to delete tag');
    }
  };

  const handlePush = async (name: string) => {
    const remote = remotes.length === 1 ? remotes[0].name : 'origin';

    try {
      const result = await tagApi.push(name, remote);
      if (result.success) {
        // Tag pushed successfully
        setError(null);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to push tag:', err);
      setError('Failed to push tag');
    }
  };

  const handleTagCreated = async () => {
    setShowCreateDialog(false);
    await loadTags();
    onRefresh?.();
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <div className="tag-list-view">
      <div className="tag-list-header">
        <div className="tag-list-title">
          <TagIcon size={16} />
          <span>Tags</span>
          <span className="tag-count">{tags.length}</span>
        </div>
        <div className="tag-list-actions">
          <button
            className="btn-icon"
            onClick={() => setShowCreateDialog(true)}
            title="Create tag"
          >
            <Plus size={16} />
          </button>
          <button
            className="btn-icon"
            onClick={loadTags}
            title="Refresh"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="tag-list-error">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="tag-list">
        {tags.length === 0 ? (
          <div className="tag-list-empty">No tags</div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.name}
              className={`tag-item ${selectedTag === tag.name ? 'selected' : ''}`}
              onClick={() => {
                setSelectedTag(tag.name);
                onTagSelect?.(tag);
              }}
            >
              <div className="tag-item-header">
                <TagIcon size={14} className={tag.is_annotated ? 'annotated' : ''} />
                <span className="tag-name">{tag.name}</span>
                {tag.is_annotated && (
                  <span className="tag-type-badge">annotated</span>
                )}
              </div>
              <div className="tag-item-meta">
                <span className="tag-oid">{tag.short_oid}</span>
                {tag.tagger && (
                  <span className="tag-tagger">
                    {tag.tagger.name} - {formatTimestamp(tag.tagger.timestamp)}
                  </span>
                )}
              </div>
              {tag.message && (
                <div className="tag-message">{tag.message}</div>
              )}
              {selectedTag === tag.name && (
                <div className="tag-item-actions">
                  {remotes.length > 0 && (
                    <button
                      className="btn btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePush(tag.name);
                      }}
                      title="Push tag to remote"
                    >
                      <Upload size={12} />
                      Push
                    </button>
                  )}
                  <button
                    className="btn btn-small btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(tag.name);
                    }}
                    title="Delete tag"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <TagDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onTagCreated={handleTagCreated}
      />
    </div>
  );
}
