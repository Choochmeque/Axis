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
} from 'lucide-react';
import { useRepositoryStore } from '../../store/repositoryStore';
import { CreateBranchDialog, CheckoutBranchDialog } from '../branches';
import { FetchDialog, PushDialog, PullDialog } from '../remotes';
import { StashDialog } from '../stash';
import { SettingsDialog } from '../settings/SettingsDialog';
import { useKeyboardShortcuts } from '../../hooks';

const toolbarButtonClass =
  'flex flex-col items-center gap-0.5 px-3 py-1.5 bg-transparent border-none rounded text-(--text-primary) cursor-pointer text-[11px] transition-colors hover:not-disabled:bg-(--bg-hover) active:not-disabled:bg-(--bg-active) disabled:opacity-50 disabled:cursor-not-allowed';

export function Toolbar() {
  const { repository, setCurrentView, refreshRepository } = useRepositoryStore();

  // Dialog states
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [checkoutBranchOpen, setCheckoutBranchOpen] = useState(false);
  const [fetchOpen, setFetchOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [pullOpen, setPullOpen] = useState(false);
  const [stashOpen, setStashOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleCommitClick = useCallback(() => {
    setCurrentView('file-status');
  }, [setCurrentView]);

  const handleRefresh = useCallback(() => {
    refreshRepository?.();
  }, [refreshRepository]);

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onOpenSettings: () => setSettingsOpen(true),
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
              <GitCommit size={18} />
              <span>Commit</span>
            </button>
            <button className={toolbarButtonClass} title="Pull" onClick={() => setPullOpen(true)}>
              <ArrowDownToLine size={18} />
              <span>Pull</span>
            </button>
            <button className={toolbarButtonClass} title="Push" onClick={() => setPushOpen(true)}>
              <ArrowUpFromLine size={18} />
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
        <button
          className={toolbarButtonClass}
          onClick={() => setSettingsOpen(true)}
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
