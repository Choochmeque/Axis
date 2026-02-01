import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, FolderPlus, GitBranchPlus, Clock, Search, Pin } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import type { RecentRepository } from '@/types';
import { useRepositoryStore } from '@/store/repositoryStore';
import {
  Input,
  Select,
  SelectItem,
  VirtualList,
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuPortal,
  ContextMenuContent,
} from '@/components/ui';
import { CloneDialog } from './repository/CloneDialog';
import { InitDialog } from './repository/InitDialog';
import { RecentRepoContextMenu } from './repository/RecentRepoContextMenu';
import { RepoCard } from './repository/RepoCard';

type SortBy = 'lastOpened' | 'name' | 'path';

// Get the tab-aware open function from window
const openInTab = (path: string) => {
  const fn = (window as unknown as { openRepositoryInTab?: (path: string) => Promise<void> })
    .openRepositoryInTab;
  if (fn) {
    return fn(path);
  }
  // Fallback to direct open
  return useRepositoryStore.getState().openRepository(path);
};

function matchesSearch(repo: RecentRepository, query: string): boolean {
  const lower = query.toLowerCase();
  return (
    repo.name.toLowerCase().includes(lower) ||
    repo.displayPath.toLowerCase().includes(lower) ||
    (repo.currentBranch?.toLowerCase().includes(lower) ?? false)
  );
}

function sortRepos(repos: RecentRepository[], sortBy: SortBy): RecentRepository[] {
  return [...repos].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'path':
        return a.displayPath.localeCompare(b.displayPath);
      case 'lastOpened':
      default:
        return new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime();
    }
  });
}

export function WelcomeView() {
  const { t } = useTranslation();
  const { recentRepositories, loadRecentRepositories } = useRepositoryStore();
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('lastOpened');
  const [contextMenuRepo, setContextMenuRepo] = useState<RecentRepository | null>(null);

  useEffect(() => {
    loadRecentRepositories();
  }, [loadRecentRepositories]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return recentRepositories;
    return recentRepositories.filter((repo) => matchesSearch(repo, query));
  }, [recentRepositories, searchQuery]);

  const pinnedRepos = useMemo(
    () =>
      sortRepos(
        filtered.filter((r) => r.isPinned),
        sortBy
      ),
    [filtered, sortBy]
  );

  const recentRepos = useMemo(
    () =>
      sortRepos(
        filtered.filter((r) => !r.isPinned),
        sortBy
      ),
    [filtered, sortBy]
  );

  const handleOpenRepository = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: t('welcome.selectRepository'),
    });

    if (selected && typeof selected === 'string') {
      await openInTab(selected);
    }
  };

  const handleOpenRecent = (path: string) => {
    openInTab(path);
  };

  const handleRepoContextMenu = useCallback((repo: RecentRepository) => {
    setContextMenuRepo(repo);
  }, []);

  return (
    <div className="flex flex-col items-center h-full p-12 overflow-hidden">
      <div className="text-center w-full max-w-150">
        <h1 className="text-5xl font-bold m-0 mb-2 text-(--text-primary)">{t('welcome.title')}</h1>
        <p className="text-lg text-(--text-secondary) m-0 mb-8">{t('welcome.subtitle')}</p>

        <div className="flex justify-center gap-4 mb-8">
          <button
            className="flex flex-col items-center gap-3 py-6 px-8 bg-(--bg-card) border border-(--border-color) rounded-lg text-(--text-primary) cursor-pointer transition-all min-w-40 hover:not-disabled:bg-(--bg-hover) hover:not-disabled:border-(--accent-color) disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setShowInitDialog(true)}
          >
            <GitBranchPlus size={24} />
            <span>{t('welcome.newRepository')}</span>
          </button>
          <button
            className="flex flex-col items-center gap-3 py-6 px-8 bg-(--bg-card) border border-(--border-color) rounded-lg text-(--text-primary) cursor-pointer transition-all min-w-40 hover:not-disabled:bg-(--bg-hover) hover:not-disabled:border-(--accent-color) disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleOpenRepository}
          >
            <FolderOpen size={24} />
            <span>{t('welcome.openRepository')}</span>
          </button>
          <button
            className="flex flex-col items-center gap-3 py-6 px-8 bg-(--bg-card) border border-(--border-color) rounded-lg text-(--text-primary) cursor-pointer transition-all min-w-40 hover:not-disabled:bg-(--bg-hover) hover:not-disabled:border-(--accent-color) disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setShowCloneDialog(true)}
          >
            <FolderPlus size={24} />
            <span>{t('welcome.cloneRepository')}</span>
          </button>
        </div>

        <InitDialog open={showInitDialog} onOpenChange={setShowInitDialog} />
        <CloneDialog open={showCloneDialog} onOpenChange={setShowCloneDialog} />
      </div>

      {recentRepositories.length > 0 && (
        <div className="flex flex-col flex-1 w-full max-w-150 min-h-0 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="welcome-search flex-1">
              <Search size={14} className="welcome-search-icon" />
              <Input
                placeholder={t('welcome.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortBy)}
              placeholder={t('staging.filters.labels.sortBy')}
              className="w-40"
            >
              <SelectItem value="lastOpened">{t('welcome.sortLastOpened')}</SelectItem>
              <SelectItem value="name">{t('common.name')}</SelectItem>
              <SelectItem value="path">{t('common.path')}</SelectItem>
            </Select>
          </div>

          <ContextMenuRoot>
            <ContextMenuTrigger asChild>
              <div className="flex flex-col flex-1 min-h-0">
                {pinnedRepos.length > 0 && (
                  <div className="mb-4">
                    <h2 className="welcome-section-header">
                      <Pin size={14} />
                      {t('welcome.pinnedRepositories')}
                    </h2>
                    {pinnedRepos.map((repo) => (
                      <RepoCard
                        key={repo.path}
                        repo={repo}
                        onClick={handleOpenRecent}
                        onContextMenu={() => handleRepoContextMenu(repo)}
                      />
                    ))}
                  </div>
                )}

                <div className="flex flex-col flex-1 min-h-0">
                  <h2 className="welcome-section-header">
                    <Clock size={14} />
                    {t('welcome.recentRepositories')}
                  </h2>
                  <VirtualList
                    items={recentRepos}
                    getItemKey={(repo) => repo.path}
                    itemHeight={56}
                    overscan={5}
                    emptyMessage={t('welcome.noResults')}
                    className="welcome-repo-list"
                  >
                    {(repo) => (
                      <RepoCard
                        repo={repo}
                        onClick={handleOpenRecent}
                        onContextMenu={() => handleRepoContextMenu(repo)}
                      />
                    )}
                  </VirtualList>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuPortal>
              <ContextMenuContent className="menu-content">
                {contextMenuRepo && (
                  <RecentRepoContextMenu repo={contextMenuRepo} onOpenInTab={handleOpenRecent} />
                )}
              </ContextMenuContent>
            </ContextMenuPortal>
          </ContextMenuRoot>
        </div>
      )}

      {recentRepositories.length === 0 && (
        <p className="text-sm text-(--text-muted)">{t('welcome.noRecentRepositories')}</p>
      )}
    </div>
  );
}
