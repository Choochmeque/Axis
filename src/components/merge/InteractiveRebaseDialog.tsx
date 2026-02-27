import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, GitBranch, GripVertical, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  Select,
  SelectItem,
} from '@/components/ui';
import { toast, useOperation } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { rebaseApi } from '@/services/api';
import { useInteractiveRebaseStore } from '@/store/interactiveRebaseStore';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useStagingStore } from '@/store/stagingStore';
import type { InteractiveRebaseEntry, RebaseAction } from '@/types';

const REBASE_ACTIONS: { value: RebaseAction; label: string; description: string }[] = [
  { value: 'Pick', label: 'pick', description: 'use commit' },
  { value: 'Reword', label: 'reword', description: 'edit message' },
  { value: 'Edit', label: 'edit', description: 'stop for amending' },
  { value: 'Squash', label: 'squash', description: 'meld into previous' },
  { value: 'Fixup', label: 'fixup', description: 'meld, discard message' },
  { value: 'Drop', label: 'drop', description: 'remove commit' },
];

export function InteractiveRebaseDialog() {
  const { t } = useTranslation();
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
        toast.success(t('merge.interactiveRebase.notifications.complete'));
        reset();
        // Refresh repository data
        await Promise.all([
          useRepositoryStore.getState().loadCommits(),
          useStagingStore.getState().loadStatus(),
          useRepositoryStore.getState().loadBranches(),
        ]);
      } else if (result.conflicts.length > 0) {
        toast.warning(t('merge.interactiveRebase.notifications.hasConflicts'));
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
            title={t('merge.interactiveRebase.moveUp')}
          >
            <ArrowUp size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => moveEntry(index, index + 1)}
            disabled={index === entries.length - 1}
            title={t('merge.interactiveRebase.moveDown')}
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
        <DialogTitle icon={GitBranch}>{t('merge.interactiveRebase.title')}</DialogTitle>

        <DialogBody>
          {displayError && (
            <Alert variant="error" className="mb-4">
              {displayError}
            </Alert>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 size={20} className="animate-spin text-(--text-secondary)" />
              <span className="ml-3 text-sm text-(--text-secondary)">
                {t('merge.interactiveRebase.loadingCommits')}
              </span>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-(--bg-secondary) rounded-md">
                <p className="m-0 text-sm text-(--text-secondary)">
                  {t('merge.interactiveRebase.rebasing', { count: commitsToRebase, target: onto })}
                  {entries.length !== commitsToRebase && (
                    <span className="text-(--text-tertiary)">
                      {' '}
                      {t('merge.interactiveRebase.willBeDropped', {
                        count: entries.length - commitsToRebase,
                      })}
                    </span>
                  )}
                </p>
              </div>

              <div className="mb-2 flex items-center gap-4 text-xs text-(--text-tertiary)">
                <span>{t('merge.interactiveRebase.reorderHelp')}</span>
                <span className="text-(--border-color)">|</span>
                <span>{t('merge.interactiveRebase.actionHelp')}</span>
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
                  <strong className="text-(--text-secondary)">
                    {t('merge.interactiveRebase.actions.pick')}
                  </strong>{' '}
                  = {t('merge.interactiveRebase.legend.pick')}
                </p>
                <p className="m-0">
                  <strong className="text-(--text-secondary)">
                    {t('merge.interactiveRebase.actions.reword')}
                  </strong>{' '}
                  = {t('merge.interactiveRebase.legend.reword')}
                </p>
                <p className="m-0">
                  <strong className="text-(--text-secondary)">
                    {t('merge.interactiveRebase.actions.squash')}
                  </strong>{' '}
                  = {t('merge.interactiveRebase.legend.squash')}
                </p>
                <p className="m-0">
                  <strong className="text-(--text-secondary)">
                    {t('merge.interactiveRebase.actions.fixup')}
                  </strong>{' '}
                  = {t('merge.interactiveRebase.legend.fixup')}
                </p>
                <p className="m-0">
                  <strong className="text-(--text-secondary)">
                    {t('merge.interactiveRebase.actions.drop')}
                  </strong>{' '}
                  = {t('merge.interactiveRebase.legend.drop')}
                </p>
              </div>

              {preview && preview.preview.commitsToRebase.length > 0 && (
                <div className="mt-3 p-3 bg-(--bg-secondary) rounded-md">
                  <p className="m-0 text-xs text-warning">
                    {t('merge.interactiveRebase.historyWarning')}
                  </p>
                </div>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isExecuting}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button
            variant="primary"
            onClick={handleExecute}
            disabled={isExecuting || isLoading || entries.length === 0}
          >
            {isExecuting
              ? t('merge.interactiveRebase.rebasing_button')
              : t('merge.interactiveRebase.startButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
