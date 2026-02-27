import {
  AlertCircle,
  Archive,
  ArrowLeftRight,
  Check,
  Copy,
  Download,
  GitBranch,
  GitCommit,
  GitMerge,
  History,
  RefreshCw,
  RotateCcw,
  Undo2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  FormField,
  Input,
  Select,
  SelectItem,
  VirtualList,
} from '@/components/ui';
import type { SelectionKey } from '@/hooks';
import { copyToClipboard } from '@/lib/actions';
import { formatTimestamp } from '@/lib/dateUtils';
import { getErrorMessage } from '@/lib/errorUtils';
import { cn } from '@/lib/utils';
import { branchApi, reflogApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import type { ReflogEntry } from '@/types';
import { ReflogAction } from '@/types';

const btnIconClass =
  'flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed';
const btnSmallClass =
  'flex items-center justify-center w-6 h-6 p-0 rounded cursor-pointer transition-colors border bg-(--bg-secondary) border-(--border-color) text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--text-primary)';

interface ReflogViewProps {
  onRefresh?: () => void;
}

const getActionIcon = (action: ReflogEntry['action']): React.ElementType => {
  if (typeof action === 'object' && 'Other' in action) {
    return GitCommit;
  }
  switch (action) {
    case ReflogAction.Commit:
    case ReflogAction.CommitAmend:
    case ReflogAction.CommitInitial:
      return GitCommit;
    case ReflogAction.Checkout:
      return ArrowLeftRight;
    case ReflogAction.Merge:
    case ReflogAction.Rebase:
      return GitMerge;
    case ReflogAction.Reset:
      return RotateCcw;
    case ReflogAction.CherryPick:
      return GitCommit;
    case ReflogAction.Revert:
      return Undo2;
    case ReflogAction.Pull:
    case ReflogAction.Clone:
      return Download;
    case ReflogAction.Branch:
      return GitBranch;
    case ReflogAction.Stash:
      return Archive;
    default:
      return GitCommit;
  }
};

const PAGE_SIZE = 50;

export function ReflogView({ onRefresh }: ReflogViewProps) {
  const { t } = useTranslation();

  const getActionLabel = useCallback(
    (action: ReflogEntry['action']): string => {
      if (typeof action === 'object' && 'Other' in action) {
        return action.Other;
      }
      switch (action) {
        case ReflogAction.Commit:
          return t('reflog.actions.commit');
        case ReflogAction.CommitAmend:
          return t('reflog.actions.amend');
        case ReflogAction.CommitInitial:
          return t('reflog.actions.initial');
        case ReflogAction.Checkout:
          return t('reflog.actions.checkout');
        case ReflogAction.Merge:
          return t('reflog.actions.merge');
        case ReflogAction.Rebase:
          return t('reflog.actions.rebase');
        case ReflogAction.Reset:
          return t('reflog.actions.reset');
        case ReflogAction.CherryPick:
          return t('reflog.actions.cherryPick');
        case ReflogAction.Revert:
          return t('reflog.actions.revert');
        case ReflogAction.Pull:
          return t('reflog.actions.pull');
        case ReflogAction.Clone:
          return t('reflog.actions.clone');
        case ReflogAction.Branch:
          return t('reflog.actions.branch');
        case ReflogAction.Stash:
          return t('reflog.actions.stash');
        default:
          return t('reflog.actions.other');
      }
    },
    [t]
  );

  const [entries, setEntries] = useState<ReflogEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ReflogEntry | null>(null);
  const selectedEntryKeys = useMemo(
    () =>
      selectedEntry ? new Set<SelectionKey>([selectedEntry.reflogRef]) : new Set<SelectionKey>(),
    [selectedEntry]
  );
  const [availableRefs, setAvailableRefs] = useState<string[]>(['HEAD']);
  const [currentRef, setCurrentRef] = useState('HEAD');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [branchName, setBranchName] = useState('');

  const { loadBranches, loadCommits } = useRepositoryStore();

  const loadReflog = useCallback(
    async (refname: string) => {
      setIsLoading(true);
      setError(null);
      setHasMore(true);
      try {
        const [reflogEntries, count] = await Promise.all([
          reflogApi.list({
            refname,
            limit: PAGE_SIZE,
            skip: null,
          }),
          reflogApi.count(refname),
        ]);
        setEntries(reflogEntries);
        setTotalCount(count);
        setHasMore(reflogEntries.length >= PAGE_SIZE);
      } catch (err) {
        console.error('Failed to load reflog:', err);
        setError(t('reflog.failedToLoad'));
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  const loadMoreEntries = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const moreEntries = await reflogApi.list({
        refname: currentRef,
        limit: PAGE_SIZE,
        skip: entries.length,
      });
      if (moreEntries.length > 0) {
        setEntries((prev) => [...prev, ...moreEntries]);
      }
      setHasMore(moreEntries.length >= PAGE_SIZE);
    } catch (err) {
      console.error('Failed to load more reflog entries:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentRef, entries.length, hasMore, isLoadingMore]);

  const loadAvailableRefs = useCallback(async () => {
    try {
      const refs = await reflogApi.refs();
      setAvailableRefs(refs);
    } catch (err) {
      console.error('Failed to load available refs:', err);
    }
  }, []);

  useEffect(() => {
    loadAvailableRefs();
    loadReflog(currentRef);
  }, [loadAvailableRefs, loadReflog, currentRef]);

  const handleRefChange = (ref: string) => {
    setCurrentRef(ref);
    setSelectedEntry(null);
  };

  const handleCheckout = async (entry: ReflogEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await reflogApi.checkout(entry.reflogRef);
      await Promise.all([loadBranches(), loadCommits()]);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to checkout:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleOpenBranchDialog = (entry: ReflogEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEntry(entry);
    setShowBranchDialog(true);
  };

  const handleCreateBranch = async () => {
    if (!branchName.trim() || !selectedEntry) return;
    try {
      await branchApi.create(branchName, {
        startPoint: selectedEntry.newOid,
        force: false,
        track: null,
      });
      await Promise.all([loadBranches(), loadCommits()]);
      setShowBranchDialog(false);
      setBranchName('');
      onRefresh?.();
    } catch (err) {
      console.error('Failed to create branch:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleCopySha = (entry: ReflogEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(entry.newOid);
  };

  const getRefDisplayName = (ref: string) => {
    if (ref === 'HEAD') return 'HEAD';
    return ref.replace('refs/heads/', '');
  };

  return (
    <div className="flex flex-col h-full bg-(--bg-secondary)">
      <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color) shrink-0">
        <div className="flex items-center gap-2 font-medium text-(--text-primary)">
          <History size={16} />
          <span>{t('reflog.title')}</span>
          <Select
            value={currentRef}
            onValueChange={handleRefChange}
            className="h-6 text-xs min-w-24"
          >
            {availableRefs.map((ref) => (
              <SelectItem key={ref} value={ref}>
                {getRefDisplayName(ref)}
              </SelectItem>
            ))}
          </Select>
          <span className="px-1.5 text-xs bg-(--bg-tertiary) rounded-full text-(--text-secondary)">
            {totalCount ?? entries.length}
          </span>
        </div>
        <button
          className={btnIconClass}
          onClick={() => loadReflog(currentRef)}
          title={t('common.refresh')}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 py-2 px-3 m-2 bg-error/10 text-error rounded text-xs shrink-0">
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

      <VirtualList
        items={entries}
        getItemKey={(entry) => entry.reflogRef}
        itemHeight={64}
        isLoading={isLoading}
        emptyMessage={t('reflog.noEntries')}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMoreEntries}
        loadingMoreMessage={t('reflog.loadingMore')}
        selectionMode="single"
        selectedKeys={selectedEntryKeys}
        onSelectionChange={(keys) => {
          if (keys.size === 0) {
            setSelectedEntry(null);
            return;
          }
          const key = keys.values().next().value;
          const entry = entries.find((e) => e.reflogRef === key);
          if (entry) setSelectedEntry(entry);
        }}
        className="flex-1"
      >
        {(entry) => {
          const Icon = getActionIcon(entry.action);
          return (
            <>
              <Icon size={14} className="text-(--accent-color) mt-0.5 shrink-0" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-(--accent-color)">
                    {entry.shortNewOid}
                  </span>
                  <span className="px-1.5 py-0.5 text-xs bg-(--bg-tertiary) rounded text-(--text-secondary)">
                    {getActionLabel(entry.action)}
                  </span>
                </div>
                <div className="text-sm text-(--text-primary) truncate">{entry.message}</div>
                <div className="flex items-center gap-3 text-xs text-(--text-muted)">
                  <span>{entry.committerName}</span>
                  <span>{formatTimestamp(entry.timestamp)}</span>
                </div>
              </div>

              <div className="flex gap-1 shrink-0">
                <button
                  className={cn(btnSmallClass)}
                  onClick={(e) => handleCheckout(entry, e)}
                  title={t('reflog.entry.checkoutTitle')}
                >
                  <Check size={12} />
                </button>
                <button
                  className={cn(btnSmallClass)}
                  onClick={(e) => handleOpenBranchDialog(entry, e)}
                  title={t('reflog.entry.branchTitle')}
                >
                  <GitBranch size={12} />
                </button>
                <button
                  className={cn(btnSmallClass)}
                  onClick={(e) => handleCopySha(entry, e)}
                  title={t('reflog.entry.copyShaTitle')}
                >
                  <Copy size={12} />
                </button>
              </div>
            </>
          );
        }}
      </VirtualList>

      <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
        <DialogContent className="max-w-100">
          <DialogTitle icon={GitBranch}>{t('reflog.createBranch.title')}</DialogTitle>

          <DialogBody>
            <FormField label={t('reflog.createBranch.nameLabel')} htmlFor="branch-name">
              <Input
                id="branch-name"
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder={t('reflog.createBranch.namePlaceholder')}
              />
            </FormField>
            <div className="text-xs text-(--text-muted)">
              {t('reflog.createBranch.fromCommit', { oid: selectedEntry?.shortNewOid })}
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{t('common.cancel')}</Button>
            </DialogClose>
            <Button variant="primary" onClick={handleCreateBranch} disabled={!branchName.trim()}>
              {t('reflog.createBranch.createButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
