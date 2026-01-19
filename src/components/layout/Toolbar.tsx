import { useState, useCallback } from 'react';
import {
  GitCommit,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  GitBranch,
  GitMerge,
  Archive,
  Settings,
  FolderOpen,
  Terminal,
} from 'lucide-react';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { shellApi } from '@/services/api';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { CreateBranchDialog, CheckoutBranchDialog } from '../branches';
import { FetchDialog, PushDialog, PullDialog } from '../remotes';
import { StashDialog } from '../stash';
import { SettingsDialog } from '../settings/SettingsDialog';
import { useKeyboardShortcuts } from '../../hooks';

const toolbarButtonClass =
  'flex flex-col items-center gap-0.5 px-3 py-1.5 bg-transparent border-none rounded text-(--text-primary) cursor-pointer text-sm transition-colors hover:not-disabled:bg-(--bg-hover) active:not-disabled:bg-(--bg-active) disabled:opacity-50 disabled:cursor-not-allowed';

export function Toolbar() {
  const { repository, status, branches, setCurrentView, refreshRepository } = useRepositoryStore();

  // Get current branch for ahead/behind counts
  const currentBranch = branches.find((b) => b.isHead);
  const stagedCount = status?.staged?.length ?? 0;
  const aheadCount = currentBranch?.ahead ?? 0;
  const behindCount = currentBranch?.behind ?? 0;

  // Settings from store (used by menu actions)
  const showSettings = useSettingsStore((s) => s.showSettings);
  const setShowSettings = useSettingsStore((s) => s.setShowSettings);

  // Dialog states
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [checkoutBranchOpen, setCheckoutBranchOpen] = useState(false);
  const [fetchOpen, setFetchOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [pullOpen, setPullOpen] = useState(false);
  const [stashOpen, setStashOpen] = useState(false);

  const handleCommitClick = useCallback(() => {
    setCurrentView('file-status');
  }, [setCurrentView]);

  const handleRefresh = useCallback(() => {
    refreshRepository?.();
  }, [refreshRepository]);

  const handleShowInFinder = useCallback(async () => {
    if (repository?.path) {
      try {
        await shellApi.showInFolder(repository.path);
      } catch (err) {
        toast.error('Show in Finder failed', getErrorMessage(err));
      }
    }
  }, [repository]);

  const handleOpenTerminal = useCallback(async () => {
    if (repository?.path) {
      try {
        await shellApi.openTerminal(repository.path);
      } catch (err) {
        toast.error('Open terminal failed', getErrorMessage(err));
      }
    }
  }, [repository]);

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onOpenSettings: () => setShowSettings(true),
    onRefresh: handleRefresh,
    onCommit: handleCommitClick,
    onPush: () => repository && setPushOpen(true),
    onPull: () => repository && setPullOpen(true),
    onFetch: () => repository && setFetchOpen(true),
    onCreateBranch: () => repository && setCreateBranchOpen(true),
    onSearch: () => setCurrentView('search'),
  });

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-(--bg-toolbar) border-b border-(--border-color)">
      {repository && (
        <>
          <div className="flex items-center gap-0.5">
            <button className={toolbarButtonClass} title="Commit" onClick={handleCommitClick}>
              <div className="relative">
                <GitCommit size={18} />
                {stagedCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 text-xs font-medium bg-(--accent-color) text-white rounded-full flex items-center justify-center">
                    {stagedCount > 99 ? '99+' : stagedCount}
                  </span>
                )}
              </div>
              <span>Commit</span>
            </button>
            <button className={toolbarButtonClass} title="Pull" onClick={() => setPullOpen(true)}>
              <div className="relative">
                <ArrowDownToLine size={18} />
                {behindCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 text-xs font-medium bg-(--accent-color) text-white rounded-full flex items-center justify-center">
                    {behindCount > 99 ? '99+' : behindCount}
                  </span>
                )}
              </div>
              <span>Pull</span>
            </button>
            <button className={toolbarButtonClass} title="Push" onClick={() => setPushOpen(true)}>
              <div className="relative">
                <ArrowUpFromLine size={18} />
                {aheadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 text-xs font-medium bg-(--accent-color) text-white rounded-full flex items-center justify-center">
                    {aheadCount > 99 ? '99+' : aheadCount}
                  </span>
                )}
              </div>
              <span>Push</span>
            </button>
            <button className={toolbarButtonClass} onClick={() => setFetchOpen(true)} title="Fetch">
              <RefreshCw size={18} />
              <span>Fetch</span>
            </button>
          </div>

          <div className="w-px h-8 mx-2 bg-(--border-color)" />
          <div className="flex items-center gap-0.5">
            <button
              className={toolbarButtonClass}
              title="Create Branch"
              onClick={() => setCreateBranchOpen(true)}
            >
              <GitBranch size={18} />
              <span>Branch</span>
            </button>
            <button
              className={toolbarButtonClass}
              title="Checkout Branch"
              onClick={() => setCheckoutBranchOpen(true)}
            >
              <GitMerge size={18} />
              <span>Checkout</span>
            </button>
            <button className={toolbarButtonClass} title="Stash" onClick={() => setStashOpen(true)}>
              <Archive size={18} />
              <span>Stash</span>
            </button>
          </div>

          {/* Branch Dialogs */}
          <CreateBranchDialog open={createBranchOpen} onOpenChange={setCreateBranchOpen} />
          <CheckoutBranchDialog open={checkoutBranchOpen} onOpenChange={setCheckoutBranchOpen} />

          {/* Remote Dialogs */}
          <FetchDialog open={fetchOpen} onOpenChange={setFetchOpen} />
          <PushDialog open={pushOpen} onOpenChange={setPushOpen} />
          <PullDialog open={pullOpen} onOpenChange={setPullOpen} />

          {/* Stash Dialog */}
          <StashDialog open={stashOpen} onOpenChange={setStashOpen} />
        </>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-0.5">
        {repository && (
          <>
            <button
              className={toolbarButtonClass}
              onClick={handleShowInFinder}
              title="Show in Finder"
            >
              <FolderOpen size={18} />
              <span>Show in Finder</span>
            </button>
            <button className={toolbarButtonClass} onClick={handleOpenTerminal} title="Terminal">
              <Terminal size={18} />
              <span>Terminal</span>
            </button>
          </>
        )}
        <button
          className={toolbarButtonClass}
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>

      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
