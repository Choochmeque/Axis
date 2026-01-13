import { useState, useEffect, useCallback } from 'react';
import { Archive, Play, Trash2, Plus, RefreshCw, GitBranch, AlertCircle, X } from 'lucide-react';
import { stashApi } from '../../services/api';
import type { StashEntry } from '../../types';
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
  CheckboxField,
} from '@/components/ui';

const btnIconClass =
  'flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed';
const btnSmallClass =
  'flex items-center gap-1 py-1 px-2 text-xs rounded cursor-pointer transition-colors border';

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
    <div className="flex flex-col h-full bg-(--bg-secondary)">
      <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color)">
        <div className="flex items-center gap-2 font-medium text-(--text-primary)">
          <Archive size={16} />
          <span>Stashes</span>
          <span className="px-1.5 text-xs bg-(--bg-tertiary) rounded-full text-(--text-secondary)">
            {stashes.length}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            className={btnIconClass}
            onClick={() => setShowCreateDialog(true)}
            title="Create stash"
          >
            <Plus size={16} />
          </button>
          <button
            className={btnIconClass}
            onClick={loadStashes}
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
          <button
            className="p-0.5 bg-transparent border-none text-inherit cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => setError(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {stashes.length === 0 ? (
          <div className="py-6 text-center text-(--text-muted) text-sm">No stashes</div>
        ) : (
          stashes.map((stash) => (
            <div
              key={stash.index}
              className={cn(
                'p-3 mb-2 rounded-md cursor-pointer transition-colors border',
                selectedIndex === stash.index
                  ? 'bg-(--bg-active) border-(--accent-color)'
                  : 'bg-(--bg-primary) border-transparent hover:bg-(--bg-hover)'
              )}
              onClick={() => setSelectedIndex(stash.index)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-semibold text-(--accent-color)">
                  {stash.stash_ref}
                </span>
                {stash.branch && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-(--bg-tertiary) rounded text-(--text-secondary)">
                    {stash.branch}
                  </span>
                )}
              </div>
              <div className="text-sm text-(--text-primary) mb-1">{stash.message}</div>
              <div className="flex items-center gap-3 text-xs text-(--text-muted)">
                <span>{stash.author}</span>
                <span>{formatTimestamp(stash.timestamp)}</span>
              </div>
              {selectedIndex === stash.index && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-(--border-color)">
                  <button
                    className={cn(
                      btnSmallClass,
                      'bg-(--bg-secondary) border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                    )}
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
                    className={cn(
                      btnSmallClass,
                      'bg-(--accent-color) border-(--accent-color) text-white hover:opacity-90'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePop(stash.index);
                    }}
                    title="Pop stash (apply and remove)"
                  >
                    Pop
                  </button>
                  <button
                    className={cn(
                      btnSmallClass,
                      'bg-(--bg-secondary) border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBranch(stash.index);
                    }}
                    title="Create branch from stash"
                  >
                    <GitBranch size={12} />
                  </button>
                  <button
                    className={cn(
                      btnSmallClass,
                      'bg-error/10 border-error text-error hover:bg-error/20'
                    )}
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

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-100">
          <DialogTitle>
            <Archive size={18} />
            Create Stash
          </DialogTitle>

          <DialogBody>
            <FormField label="Message (optional)" htmlFor="stash-message">
              <Input
                id="stash-message"
                type="text"
                value={stashMessage}
                onChange={(e) => setStashMessage(e.target.value)}
                placeholder="Stash message..."
              />
            </FormField>
            <CheckboxField
              id="include-untracked"
              label="Include untracked files"
              checked={includeUntracked}
              onCheckedChange={(checked) => setIncludeUntracked(checked === true)}
            />
            <CheckboxField
              id="keep-index"
              label="Keep staged changes in index"
              checked={keepIndex}
              onCheckedChange={(checked) => setKeepIndex(checked === true)}
            />
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button variant="primary" onClick={handleSave}>
              Create Stash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
