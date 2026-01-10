import { useState, useCallback } from 'react';
import {
  GitCommit,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  GitBranch,
  GitMerge,
  Archive,
  FolderOpen,
  Settings,
} from 'lucide-react';
import { useRepositoryStore } from '../../store/repositoryStore';
import { open } from '@tauri-apps/plugin-dialog';
import { CreateBranchDialog, CheckoutBranchDialog } from '../branches';
import { FetchDialog, PushDialog, PullDialog } from '../remotes';
import { StashDialog } from '../stash';
import { SettingsDialog } from '../settings/SettingsDialog';
import { useKeyboardShortcuts } from '../../hooks';
import './Toolbar.css';

export function Toolbar() {
  const { repository, openRepository, setCurrentView, refreshRepository } = useRepositoryStore();

  // Dialog states
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [checkoutBranchOpen, setCheckoutBranchOpen] = useState(false);
  const [fetchOpen, setFetchOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [pullOpen, setPullOpen] = useState(false);
  const [stashOpen, setStashOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleOpenRepository = useCallback(async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Repository',
    });

    if (selected && typeof selected === 'string') {
      await openRepository(selected);
    }
  }, [openRepository]);

  const handleCommitClick = useCallback(() => {
    setCurrentView('file-status');
  }, [setCurrentView]);

  const handleRefresh = useCallback(() => {
    refreshRepository?.();
  }, [refreshRepository]);

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onOpenSettings: () => setSettingsOpen(true),
    onOpenRepository: handleOpenRepository,
    onRefresh: handleRefresh,
    onCommit: handleCommitClick,
    onPush: () => repository && setPushOpen(true),
    onPull: () => repository && setPullOpen(true),
    onFetch: () => repository && setFetchOpen(true),
    onCreateBranch: () => repository && setCreateBranchOpen(true),
    onSearch: () => setCurrentView('search'),
  });

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          onClick={handleOpenRepository}
          title="Open Repository"
        >
          <FolderOpen size={18} />
          <span>Open</span>
        </button>
      </div>

      {repository && (
        <>
          <div className="toolbar-separator" />
          <div className="toolbar-group">
            <button
              className="toolbar-button"
              title="Commit"
              onClick={handleCommitClick}
            >
              <GitCommit size={18} />
              <span>Commit</span>
            </button>
            <button
              className="toolbar-button"
              title="Pull"
              onClick={() => setPullOpen(true)}
            >
              <ArrowDownToLine size={18} />
              <span>Pull</span>
            </button>
            <button
              className="toolbar-button"
              title="Push"
              onClick={() => setPushOpen(true)}
            >
              <ArrowUpFromLine size={18} />
              <span>Push</span>
            </button>
            <button
              className="toolbar-button"
              onClick={() => setFetchOpen(true)}
              title="Fetch"
            >
              <RefreshCw size={18} />
              <span>Fetch</span>
            </button>
          </div>

          <div className="toolbar-separator" />
          <div className="toolbar-group">
            <button
              className="toolbar-button"
              title="Create Branch"
              onClick={() => setCreateBranchOpen(true)}
            >
              <GitBranch size={18} />
              <span>Branch</span>
            </button>
            <button
              className="toolbar-button"
              title="Checkout Branch"
              onClick={() => setCheckoutBranchOpen(true)}
            >
              <GitMerge size={18} />
              <span>Checkout</span>
            </button>
            <button
              className="toolbar-button"
              title="Stash"
              onClick={() => setStashOpen(true)}
            >
              <Archive size={18} />
              <span>Stash</span>
            </button>
          </div>

          {/* Branch Dialogs */}
          <CreateBranchDialog
            open={createBranchOpen}
            onOpenChange={setCreateBranchOpen}
          />
          <CheckoutBranchDialog
            open={checkoutBranchOpen}
            onOpenChange={setCheckoutBranchOpen}
          />

          {/* Remote Dialogs */}
          <FetchDialog open={fetchOpen} onOpenChange={setFetchOpen} />
          <PushDialog open={pushOpen} onOpenChange={setPushOpen} />
          <PullDialog open={pullOpen} onOpenChange={setPullOpen} />

          {/* Stash Dialog */}
          <StashDialog open={stashOpen} onOpenChange={setStashOpen} />
        </>
      )}

      <div className="toolbar-spacer" />

      <div className="toolbar-group">
        <button
          className="toolbar-button"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      <SettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
