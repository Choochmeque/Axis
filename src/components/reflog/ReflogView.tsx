import { useState, useEffect, useCallback, useRef } from 'react';
import {
  History,
  RefreshCw,
  AlertCircle,
  X,
  GitCommit,
  GitMerge,
  Undo2,
  RotateCcw,
  ArrowLeftRight,
  Download,
  Archive,
  GitBranch,
  Check,
  Copy,
  Loader2,
} from 'lucide-react';
import { reflogApi, branchApi } from '@/services/api';
import { ReflogAction } from '@/types';
import type { ReflogEntry } from '@/types';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/dateUtils';
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
  Select,
  SelectItem,
} from '@/components/ui';
import { useRepositoryStore } from '@/store/repositoryStore';
import { getErrorMessage } from '@/lib/errorUtils';

const btnIconClass =
  'flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed';
const btnSmallClass =
  'flex items-center gap-1 py-1 px-2 text-xs rounded cursor-pointer transition-colors border';

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

const getActionLabel = (action: ReflogEntry['action']): string => {
  if (typeof action === 'object' && 'Other' in action) {
    return action.Other;
  }
  switch (action) {
    case ReflogAction.Commit:
      return 'commit';
    case ReflogAction.CommitAmend:
      return 'amend';
    case ReflogAction.CommitInitial:
      return 'initial';
    case ReflogAction.Checkout:
      return 'checkout';
    case ReflogAction.Merge:
      return 'merge';
    case ReflogAction.Rebase:
      return 'rebase';
    case ReflogAction.Reset:
      return 'reset';
    case ReflogAction.CherryPick:
      return 'cherry-pick';
    case ReflogAction.Revert:
      return 'revert';
    case ReflogAction.Pull:
      return 'pull';
    case ReflogAction.Clone:
      return 'clone';
    case ReflogAction.Branch:
      return 'branch';
    case ReflogAction.Stash:
      return 'stash';
    default:
      return 'other';
  }
};

const PAGE_SIZE = 50;

export function ReflogView({ onRefresh }: ReflogViewProps) {
  const [entries, setEntries] = useState<ReflogEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ReflogEntry | null>(null);
  const [availableRefs, setAvailableRefs] = useState<string[]>(['HEAD']);
  const [currentRef, setCurrentRef] = useState('HEAD');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [branchName, setBranchName] = useState('');

  const listRef = useRef<HTMLDivElement>(null);
  const { loadBranches, loadCommits } = useRepositoryStore();

  const loadReflog = useCallback(async (refname: string) => {
    setIsLoading(true);
    setError(null);
    setHasMore(true);
    try {
      const reflogEntries = await reflogApi.list({
        refname,
        limit: PAGE_SIZE,
        skip: null,
      });
      setEntries(reflogEntries);
      setHasMore(reflogEntries.length >= PAGE_SIZE);
    } catch (err) {
      console.error('Failed to load reflog:', err);
      setError('Failed to load reflog');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const handleScroll = useCallback(() => {
    if (!listRef.current || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const scrollThreshold = 200;

    if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
      loadMoreEntries();
    }
  }, [isLoadingMore, hasMore, loadMoreEntries]);

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

  const handleCheckout = async (entry: ReflogEntry) => {
    try {
      await reflogApi.checkout(entry.reflogRef);
      await loadBranches();
      await loadCommits();
      onRefresh?.();
    } catch (err) {
      console.error('Failed to checkout:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleCreateBranch = async () => {
    if (!branchName.trim() || !selectedEntry) return;
    try {
      await branchApi.create(branchName, {
        startPoint: selectedEntry.newOid,
        force: false,
        track: null,
      });
      await loadBranches();
      await loadCommits();
      setShowBranchDialog(false);
      setBranchName('');
      onRefresh?.();
    } catch (err) {
      console.error('Failed to create branch:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleCopyOid = async (oid: string) => {
    try {
      await navigator.clipboard.writeText(oid);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getRefDisplayName = (ref: string) => {
    if (ref === 'HEAD') return 'HEAD';
    return ref.replace('refs/heads/', '');
  };

  return (
    <div className="flex flex-col h-full bg-(--bg-secondary)">
      <div className="flex items-center justify-between py-2 px-3 border-b border-(--border-color)">
        <div className="flex items-center gap-2 font-medium text-(--text-primary)">
          <History size={16} />
          <span>Reflog</span>
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
            {entries.length}
          </span>
        </div>
        <button
          className={btnIconClass}
          onClick={() => loadReflog(currentRef)}
          title="Refresh"
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
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

      <div className="flex-1 overflow-y-auto p-2" ref={listRef} onScroll={handleScroll}>
        {entries.length === 0 ? (
          <div className="py-6 text-center text-(--text-muted) text-sm">No reflog entries</div>
        ) : (
          entries.map((entry) => {
            const Icon = getActionIcon(entry.action);
            const isSelected = selectedEntry?.reflogRef === entry.reflogRef;

            return (
              <div
                key={entry.reflogRef}
                className={cn(
                  'p-3 mb-2 rounded-md cursor-pointer transition-colors border',
                  isSelected
                    ? 'bg-(--bg-active) border-(--accent-color)'
                    : 'bg-(--bg-primary) border-transparent hover:bg-(--bg-hover)'
                )}
                onClick={() => setSelectedEntry(isSelected ? null : entry)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className="text-(--accent-color)" />
                  <span className="font-mono text-xs font-semibold text-(--accent-color)">
                    {entry.shortNewOid}
                  </span>
                  <span className="px-1.5 py-0.5 text-xs bg-(--bg-tertiary) rounded text-(--text-secondary)">
                    {getActionLabel(entry.action)}
                  </span>
                </div>
                <div className="text-sm text-(--text-primary) mb-1 truncate">{entry.message}</div>
                <div className="flex items-center gap-3 text-xs text-(--text-muted)">
                  <span>{entry.committerName}</span>
                  <span>{formatTimestamp(entry.timestamp)}</span>
                </div>
                {isSelected && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-(--border-color)">
                    <button
                      className={cn(
                        btnSmallClass,
                        'bg-(--bg-secondary) border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckout(entry);
                      }}
                      title="Checkout (detached HEAD)"
                    >
                      <Check size={12} />
                      Checkout
                    </button>
                    <button
                      className={cn(
                        btnSmallClass,
                        'bg-(--bg-secondary) border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBranchDialog(true);
                      }}
                      title="Create branch from this commit"
                    >
                      <GitBranch size={12} />
                      Branch
                    </button>
                    <button
                      className={cn(
                        btnSmallClass,
                        'bg-(--bg-secondary) border-(--border-color) text-(--text-primary) hover:bg-(--bg-hover)'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyOid(entry.newOid);
                      }}
                      title="Copy SHA"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
        {isLoadingMore && (
          <div className="flex items-center justify-center gap-2 p-3 text-(--text-secondary) text-xs">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading more entries...</span>
          </div>
        )}
      </div>

      <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
        <DialogContent className="max-w-100">
          <DialogTitle icon={GitBranch}>Create Branch</DialogTitle>

          <DialogBody>
            <FormField label="Branch name" htmlFor="branch-name">
              <Input
                id="branch-name"
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="new-branch-name"
              />
            </FormField>
            <div className="text-xs text-(--text-muted)">
              From commit: {selectedEntry?.shortNewOid}
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button variant="primary" onClick={handleCreateBranch} disabled={!branchName.trim()}>
              Create Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
