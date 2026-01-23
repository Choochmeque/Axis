import { useState, useRef } from 'react';
import { GitBranch, Loader2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { toast, useOperation } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { rebaseApi } from '@/services/api';
import { useInteractiveRebaseStore } from '@/store/interactiveRebaseStore';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useStagingStore } from '@/store/stagingStore';
import type { RebaseAction, InteractiveRebaseEntry } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
  Button,
  Select,
  SelectItem,
  Alert,
} from '@/components/ui';

const REBASE_ACTIONS: { value: RebaseAction; label: string; description: string }[] = [
  { value: 'Pick', label: 'pick', description: 'use commit' },
  { value: 'Reword', label: 'reword', description: 'edit message' },
  { value: 'Edit', label: 'edit', description: 'stop for amending' },
  { value: 'Squash', label: 'squash', description: 'meld into previous' },
  { value: 'Fixup', label: 'fixup', description: 'meld, discard message' },
  { value: 'Drop', label: 'drop', description: 'remove commit' },
];

export function InteractiveRebaseDialog() {
  const {
    isOpen,
    entries,
    onto,
    preview,
    isLoading,
    error,
    close,
    setEntryAction,
    moveEntry,
    reset,
  } = useInteractiveRebaseStore();
  const { trackOperation } = useOperation();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 5,
  });

  const handleExecute = async () => {
    setIsExecuting(true);
    setExecuteError(null);
    try {
      const result = await trackOperation(
        { name: 'Interactive Rebase', description: `Rebasing onto ${onto}`, category: 'git' },
        () =>
          rebaseApi.interactiveRebase({
            onto,
            entries,
            autosquash: false,
          })
      );

      if (result.success && result.conflicts.length === 0) {
        toast.success('Interactive rebase completed');
        reset();
        // Refresh repository data
        await useRepositoryStore.getState().loadCommits();
        await useStagingStore.getState().loadStatus();
        await useRepositoryStore.getState().loadBranches();
      } else if (result.conflicts.length > 0) {
        toast.warning('Rebase has conflicts - resolve and continue');
        reset();
        // Refresh to show conflict state
        await useStagingStore.getState().loadStatus();
      }
    } catch (err) {
      setExecuteError(getErrorMessage(err));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    if (!isExecuting) {
      close();
    }
  };

  const renderEntry = (entry: InteractiveRebaseEntry, index: number) => {
    const isDropped = entry.action === 'Drop';

    return (
      <div className={`interactive-rebase-entry ${isDropped ? 'dropped' : ''}`} data-index={index}>
        <div className="entry-grip">
          <GripVertical size={14} />
        </div>

        <Select
          value={entry.action}
          onValueChange={(value) => setEntryAction(index, value as RebaseAction)}
          className="entry-action-select"
        >
          {REBASE_ACTIONS.map((action) => (
            <SelectItem key={action.value} value={action.value}>
              {action.label}
            </SelectItem>
          ))}
        </Select>

        <span className="entry-oid">{entry.shortOid}</span>
        <span className="entry-summary" title={entry.summary}>
          {entry.summary}
        </span>

        <div className="entry-move-buttons">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => moveEntry(index, index - 1)}
            disabled={index === 0}
            title="Move up"
          >
            <ArrowUp size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => moveEntry(index, index + 1)}
            disabled={index === entries.length - 1}
            title="Move down"
          >
            <ArrowDown size={14} />
          </Button>
        </div>
      </div>
    );
  };

  const displayError = executeError || error;
  const commitsToRebase = entries.filter((e) => e.action !== 'Drop').length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-175 max-h-[85vh]">
        <DialogTitle icon={GitBranch}>Interactive Rebase</DialogTitle>

        <DialogBody>
          {displayError && (
            <Alert variant="error" className="mb-4">
              {displayError}
            </Alert>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 size={20} className="animate-spin text-(--text-secondary)" />
              <span className="ml-3 text-sm text-(--text-secondary)">Loading commits...</span>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-(--bg-secondary) rounded-md">
                <p className="m-0 text-sm text-(--text-secondary)">
                  Rebasing <strong className="text-(--accent-color)">{commitsToRebase}</strong>{' '}
                  commit(s) onto <strong className="text-(--text-primary) font-mono">{onto}</strong>
                  {entries.length !== commitsToRebase && (
                    <span className="text-(--text-tertiary)">
                      {' '}
                      ({entries.length - commitsToRebase} will be dropped)
                    </span>
                  )}
                </p>
              </div>

              <div className="mb-2 flex items-center gap-4 text-xs text-(--text-tertiary)">
                <span>Use arrows to reorder commits</span>
                <span className="text-(--border-color)">|</span>
                <span>Select action for each commit</span>
              </div>

              <div
                ref={parentRef}
                className="interactive-rebase-list"
                style={{ height: Math.min(360, entries.length * 44 + 8), overflow: 'auto' }}
              >
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualRow) => (
                    <div
                      key={virtualRow.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {renderEntry(entries[virtualRow.index], virtualRow.index)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-(--bg-secondary) rounded-md text-xs text-(--text-tertiary) space-y-1">
                <p className="m-0">
                  <strong className="text-(--text-secondary)">pick</strong> = use commit as-is
                </p>
                <p className="m-0">
                  <strong className="text-(--text-secondary)">reword</strong> = use commit but edit
                  message
                </p>
                <p className="m-0">
                  <strong className="text-(--text-secondary)">squash</strong> = meld into previous
                  commit (keep message)
                </p>
                <p className="m-0">
                  <strong className="text-(--text-secondary)">fixup</strong> = meld into previous
                  (discard message)
                </p>
                <p className="m-0">
                  <strong className="text-(--text-secondary)">drop</strong> = remove commit entirely
                </p>
              </div>

              {preview && preview.preview.commitsToRebase.length > 0 && (
                <div className="mt-3 p-3 bg-(--bg-secondary) rounded-md">
                  <p className="m-0 text-xs text-warning">
                    Warning: Rebase rewrites commit history. Only rebase commits that haven't been
                    pushed to a shared repository.
                  </p>
                </div>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isExecuting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleExecute}
            disabled={isExecuting || isLoading || entries.length === 0}
          >
            {isExecuting ? 'Rebasing...' : 'Start Rebase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
