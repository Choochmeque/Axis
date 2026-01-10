import { useState, useEffect, useCallback } from 'react';
import { Tag as TagIcon, Trash2, Upload, Plus, RefreshCw, AlertCircle, X } from 'lucide-react';
import { tagApi, remoteApi } from '../../services/api';
import type { Tag, Remote } from '../../types';
import { TagDialog } from './TagDialog';
import { cn } from '../../lib/utils';

const btnIconClass = "flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed";
const btnSmallClass = "flex items-center gap-1 py-1 px-2 text-xs rounded cursor-pointer transition-colors border";

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
    <div className="flex flex-col h-full bg-(--bg-secondary)">
      <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color)">
        <div className="flex items-center gap-2 font-medium text-(--text-primary)">
          <TagIcon size={16} />
          <span>Tags</span>
          <span className="px-1.5 text-xs bg-(--bg-tertiary) rounded-full text-(--text-secondary)">{tags.length}</span>
        </div>
        <div className="flex gap-1">
          <button
            className={btnIconClass}
            onClick={() => setShowCreateDialog(true)}
            title="Create tag"
          >
            <Plus size={16} />
          </button>
          <button
            className={btnIconClass}
            onClick={loadTags}
            title="Refresh"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 py-2 px-3 m-2 bg-error/10 text-error rounded text-xs">
          <AlertCircle size={14} />
          <span className="flex-1">{error}</span>
          <button className="p-0.5 bg-transparent border-none text-inherit cursor-pointer opacity-70 hover:opacity-100" onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {tags.length === 0 ? (
          <div className="py-6 text-center text-(--text-muted) text-sm">No tags</div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.name}
              className={cn(
                "p-3 mb-2 rounded-md cursor-pointer transition-colors border",
                selectedTag === tag.name
                  ? "bg-(--bg-active) border-(--accent-color)"
                  : "bg-(--bg-primary) border-transparent hover:bg-(--bg-hover)"
              )}
              onClick={() => {
                setSelectedTag(tag.name);
                onTagSelect?.(tag);
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <TagIcon size={14} className={tag.is_annotated ? 'text-(--accent-color)' : 'text-(--text-muted)'} />
                <span className="font-mono text-sm text-(--text-primary) font-medium">{tag.name}</span>
                {tag.is_annotated && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-(--accent-color)/10 text-(--accent-color) rounded">annotated</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-(--text-muted)">
                <span className="font-mono text-(--accent-color)">{tag.short_oid}</span>
                {tag.tagger && (
                  <span>
                    {tag.tagger.name} - {formatTimestamp(tag.tagger.timestamp)}
                  </span>
                )}
              </div>
              {tag.message && (
                <div className="mt-1 text-xs text-(--text-secondary) line-clamp-2">{tag.message}</div>
              )}
              {selectedTag === tag.name && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-(--border-color)">
                  {remotes.length > 0 && (
                    <button
                      className={cn(btnSmallClass, "bg-(--bg-secondary) border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)")}
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
                    className={cn(btnSmallClass, "bg-error/10 border-error text-error hover:bg-error/20")}
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
