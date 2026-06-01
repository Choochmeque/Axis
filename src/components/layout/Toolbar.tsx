import { useQuery } from '@tanstack/react-query';
import {
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  GitBranch,
  GitCommit,
  GitMerge,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import { OpenTargetIcon } from '@/components/open-target';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import {
  FALLBACK_OPEN_TARGET,
  FALLBACK_OPEN_TARGET_OPTIONS,
  getOpenTargetOption,
  openTargetKey,
} from '@/lib/openTargets';
import { testId } from '@/lib/utils';
import { shellApi } from '@/services/api';
import { useDialogStore } from '@/store/dialogStore';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { OpenTarget as OpenTargetType } from '@/types';
import { useKeyboardShortcuts } from '../../hooks';

const toolbarButtonClass =
  'flex flex-col items-center gap-0.5 px-3 py-1.5 bg-transparent border-none rounded text-(--text-primary) cursor-pointer text-sm transition-colors hover:not-disabled:bg-(--bg-hover) active:not-disabled:bg-(--bg-active) disabled:opacity-50 disabled:cursor-not-allowed';
const toolbarSplitButtonClass =
  'flex flex-col items-center gap-0.5 px-2 py-1.5 bg-transparent border-none rounded-l text-(--text-primary) cursor-pointer text-sm transition-colors hover:not-disabled:bg-(--bg-hover) active:not-disabled:bg-(--bg-active) disabled:opacity-50 disabled:cursor-not-allowed';
const toolbarSplitTriggerClass =
  'self-stretch px-1 bg-transparent border-none rounded-r text-(--text-primary) cursor-pointer transition-colors hover:not-disabled:bg-(--bg-hover) active:not-disabled:bg-(--bg-active) disabled:opacity-50 disabled:cursor-not-allowed';

export function Toolbar() {
  const { t } = useTranslation();
  const { repository, status, branches, remotes, setCurrentView, refreshRepository } =
    useRepositoryStore();
  const defaultOpenTarget = useSettingsStore(
    (state) => state.settings?.defaultOpenTarget ?? FALLBACK_OPEN_TARGET
  );
  const { data: openTargetOptions = FALLBACK_OPEN_TARGET_OPTIONS } = useQuery({
    queryKey: ['open-target-options'],
    queryFn: shellApi.getOpenTargetOptions,
  });

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

  const handleOpenRepositoryTarget = useCallback(
    async (target: OpenTargetType) => {
      if (!repository?.path) {
        return;
      }

      try {
        await shellApi.openRepositoryTarget(repository.path, target);
      } catch (err) {
        toast.error(t('notifications.error.operationFailed'), getErrorMessage(err));
      }
    },
    [repository, t]
  );

  const defaultOpenTargetOption = getOpenTargetOption(openTargetOptions, defaultOpenTarget);

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
    <div
      {...testId('e2e-toolbar')}
      className="flex items-center gap-1 px-3 py-2 bg-(--bg-toolbar) border-b border-(--border-color)"
    >
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
              {...testId('e2e-toolbar-branch-btn')}
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
              {...testId('e2e-toolbar-stash-btn')}
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
          <DropdownMenu>
            <div className="flex items-stretch rounded">
              <button
                className={toolbarSplitButtonClass}
                onClick={() => handleOpenRepositoryTarget(defaultOpenTarget)}
                title={t('toolbar.openWith', { target: defaultOpenTargetOption.name })}
              >
                <OpenTargetIcon option={defaultOpenTargetOption} />
                <span>{defaultOpenTargetOption.name}</span>
              </button>
              <DropdownMenuTrigger asChild>
                <button className={toolbarSplitTriggerClass} title={t('toolbar.openWithMenu')}>
                  <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent align="end" className="min-w-44">
              {openTargetOptions.map((target) => (
                <DropdownMenuItem
                  key={openTargetKey(target.target)}
                  onSelect={() => handleOpenRepositoryTarget(target.target)}
                >
                  <span className="flex items-center gap-2">
                    <OpenTargetIcon option={target} size={16} />
                    {target.name}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
