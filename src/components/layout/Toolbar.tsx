import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useDialogStore } from '@/store/dialogStore';
import { shellApi } from '@/services/api';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { showInFinder } from '@/lib/actions';
import { useKeyboardShortcuts } from '../../hooks';

const toolbarButtonClass =
  'flex flex-col items-center gap-0.5 px-3 py-1.5 bg-transparent border-none rounded text-(--text-primary) cursor-pointer text-sm transition-colors hover:not-disabled:bg-(--bg-hover) active:not-disabled:bg-(--bg-active) disabled:opacity-50 disabled:cursor-not-allowed';

export function Toolbar() {
  const { t } = useTranslation();
  const { repository, status, branches, remotes, setCurrentView, refreshRepository } =
    useRepositoryStore();

  // Get current branch for ahead/behind counts
  const currentBranch = branches.find((b) => b.isHead);
  const stagedCount = status?.staged?.length ?? 0;
  const aheadCount = currentBranch?.ahead ?? 0;
  const behindCount = currentBranch?.behind ?? 0;
  const hasRemotes = remotes.length > 0;

  // Dialog actions from store
  const {
    openCreateBranchDialog,
    openCheckoutBranchDialog,
    openFetchDialog,
    openPushDialog,
    openPullDialog,
    openStashDialog,
    openSettingsDialog,
    openRepositorySettingsDialog,
  } = useDialogStore();

  const handleCommitClick = useCallback(() => {
    setCurrentView('file-status');
  }, [setCurrentView]);

  const handleRefresh = useCallback(() => {
    refreshRepository?.();
  }, [refreshRepository]);

  const handleOpenTerminal = useCallback(async () => {
    if (repository?.path) {
      try {
        await shellApi.openTerminal(repository.path);
      } catch (err) {
        toast.error(t('notifications.error.operationFailed'), getErrorMessage(err));
      }
    }
  }, [repository, t]);

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onOpenSettings: openSettingsDialog,
    onRefresh: handleRefresh,
    onCommit: handleCommitClick,
    onPush: () => repository && openPushDialog(),
    onPull: () => repository && openPullDialog(),
    onFetch: () => repository && openFetchDialog(),
    onCreateBranch: () => repository && openCreateBranchDialog(),
    onSearch: () => setCurrentView('search'),
  });

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-(--bg-toolbar) border-b border-(--border-color)">
      {repository && (
        <>
          <div className="flex items-center gap-0.5">
            <button
              className={toolbarButtonClass}
              title={t('toolbar.commit')}
              onClick={handleCommitClick}
            >
              <div className="relative">
                <GitCommit size={18} />
                {stagedCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 text-xs font-medium bg-(--accent-color) text-white rounded-full flex items-center justify-center">
                    {stagedCount > 99 ? '99+' : stagedCount}
                  </span>
                )}
              </div>
              <span>{t('toolbar.commit')}</span>
            </button>
            <button
              className={toolbarButtonClass}
              title={t('toolbar.pull')}
              disabled={repository.isUnborn || !hasRemotes}
              onClick={openPullDialog}
            >
              <div className="relative">
                <ArrowDownToLine size={18} />
                {behindCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 text-xs font-medium bg-(--accent-color) text-white rounded-full flex items-center justify-center">
                    {behindCount > 99 ? '99+' : behindCount}
                  </span>
                )}
              </div>
              <span>{t('toolbar.pull')}</span>
            </button>
            <button
              className={toolbarButtonClass}
              title={t('toolbar.push')}
              disabled={repository.isUnborn || !hasRemotes}
              onClick={openPushDialog}
            >
              <div className="relative">
                <ArrowUpFromLine size={18} />
                {aheadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 text-xs font-medium bg-(--accent-color) text-white rounded-full flex items-center justify-center">
                    {aheadCount > 99 ? '99+' : aheadCount}
                  </span>
                )}
              </div>
              <span>{t('toolbar.push')}</span>
            </button>
            <button
              className={toolbarButtonClass}
              disabled={!hasRemotes}
              onClick={openFetchDialog}
              title={t('toolbar.fetch')}
            >
              <RefreshCw size={18} />
              <span>{t('toolbar.fetch')}</span>
            </button>
          </div>

          <div className="w-px h-8 mx-2 bg-(--border-color)" />
          <div className="flex items-center gap-0.5">
            <button
              className={toolbarButtonClass}
              title={t('toolbar.branch')}
              disabled={repository.isUnborn}
              onClick={() => openCreateBranchDialog()}
            >
              <GitBranch size={18} />
              <span>{t('toolbar.branch')}</span>
            </button>
            <button
              className={toolbarButtonClass}
              title={t('toolbar.checkout')}
              disabled={repository.isUnborn}
              onClick={openCheckoutBranchDialog}
            >
              <GitMerge size={18} />
              <span>{t('toolbar.checkout')}</span>
            </button>
            <button
              className={toolbarButtonClass}
              title={t('toolbar.stash')}
              disabled={repository.isUnborn}
              onClick={openStashDialog}
            >
              <Archive size={18} />
              <span>{t('toolbar.stash')}</span>
            </button>
          </div>
        </>
      )}

      <div className="flex-1" />

      {repository && (
        <div className="flex items-center gap-0.5">
          <button
            className={toolbarButtonClass}
            onClick={() => repository?.path && showInFinder(repository.path)}
            title={t('toolbar.showInFinder')}
          >
            <FolderOpen size={18} />
            <span>{t('toolbar.showInFinder')}</span>
          </button>
          <button
            className={toolbarButtonClass}
            onClick={handleOpenTerminal}
            title={t('toolbar.terminal')}
          >
            <Terminal size={18} />
            <span>{t('toolbar.terminal')}</span>
          </button>
          <button
            className={toolbarButtonClass}
            onClick={openRepositorySettingsDialog}
            title={t('toolbar.settings')}
          >
            <Settings size={18} />
            <span>{t('toolbar.settings')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
