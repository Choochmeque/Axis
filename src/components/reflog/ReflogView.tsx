import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { reflogApi, branchApi } from '@/services/api';
import type { ReflogEntry, ReflogAction } from '@/types';
import { cn } from '@/lib/utils';
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
} from '@/components/ui';
import { useRepositoryStore } from '@/store/repositoryStore';

const btnIconClass =
  'flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed';
const btnSmallClass =
  'flex items-center gap-1 py-1 px-2 text-xs rounded cursor-pointer transition-colors border';

interface ReflogViewProps {
  onRefresh?: () => void;
}

const getActionIcon = (action: ReflogAction): React.ElementType => {
  if (typeof action === 'object' && 'other' in action) {
    return GitCommit;
  }
  switch (action) {
    case 'commit':
    case 'commitAmend':
    case 'commitInitial':
      return GitCommit;
    case 'checkout':
      return ArrowLeftRight;
    case 'merge':
    case 'rebase':
      return GitMerge;
    case 'reset':
      return RotateCcw;
    case 'cherryPick':
      return GitCommit;
    case 'revert':
      return Undo2;
    case 'pull':
    case 'clone':
      return Download;
    case 'branch':
      return GitBranch;
    case 'stash':
      return Archive;
    default:
      return GitCommit;
  }
};

const getActionLabel = (action: ReflogAction): string => {
  if (typeof action === 'object' && 'other' in action) {
    return action.other;
  }
  switch (action) {
    case 'commit':
      return 'commit';
    case 'commitAmend':
      return 'amend';
    case 'commitInitial':
      return 'initial';
    case 'checkout':
      return 'checkout';
    case 'merge':
      return 'merge';
    case 'rebase':
      return 'rebase';
    case 'reset':
      return 'reset';
    case 'cherryPick':
      return 'cherry-pick';
    case 'revert':
      return 'revert';
    case 'pull':
      return 'pull';
    case 'clone':
      return 'clone';
    case 'branch':
      return 'branch';
    case 'stash':
      return 'stash';
    default:
      return 'other';
  }
};

export function ReflogView({ onRefresh }: ReflogViewProps) {
  const [entries, setEntries] = useState<ReflogEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ReflogEntry | null>(null);
  const [availableRefs, setAvailableRefs] = useState<string[]>(['HEAD']);
  const [currentRef, setCurrentRef] = useState('HEAD');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [branchName, setBranchName] = useState('');

  const { loadBranches, loadCommits } = useRepositoryStore();

  const loadReflog = useCallback(async (refname: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const reflogEntries = await reflogApi.list({
        refname,
        limit: null,
        skip: null,
      });
      setEntries(reflogEntries);
    } catch (err) {
      console.error('Failed to load reflog:', err);
      setError('Failed to load reflog');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAvailableRefs = useCallback(async () => {
    try {
      const refs = await reflogApi.refs();
      setAvailableRefs(refs);
    } catch {
      // Silent fail - just keep HEAD
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
      setError(err instanceof Error ? err.message : 'Failed to checkout');
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
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    }
  };

  const handleCopyOid = async (oid: string) => {
    try {
      await navigator.clipboard.writeText(oid);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
          <Select value={currentRef} onValueChange={handleRefChange} className="h-6 text-xs min-w-24">
            {availableRefs.map((ref) => (
              <option key={ref} value={ref}>
                {getRefDisplayName(ref)}
              </option>
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

      <div className="flex-1 overflow-y-auto p-2">
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
