import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, FolderPlus, GitBranchPlus, Clock } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useRepositoryStore } from '../store/repositoryStore';
import { formatTimeAgo } from '@/lib/dateUtils';
import { CloneDialog } from './repository/CloneDialog';
import { InitDialog } from './repository/InitDialog';
import { RecentRepoContextMenu } from './repository/RecentRepoContextMenu';

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

export function WelcomeView() {
  const { t } = useTranslation();
  const { recentRepositories, loadRecentRepositories } = useRepositoryStore();
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showInitDialog, setShowInitDialog] = useState(false);

  useEffect(() => {
    loadRecentRepositories();
  }, [loadRecentRepositories]);

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

  const handleOpenRecent = async (path: string) => {
    await openInTab(path);
  };

  return (
    <div className="flex items-center justify-center h-full p-12">
      <div className="text-center max-w-150">
        <h1 className="text-5xl font-bold m-0 mb-2 text-(--text-primary)">{t('welcome.title')}</h1>
        <p className="text-lg text-(--text-secondary) m-0 mb-8">{t('welcome.subtitle')}</p>

        <div className="flex justify-center gap-4 mb-12">
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

        {recentRepositories.length > 0 && (
          <div className="text-left">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-(--text-secondary) m-0 mb-4 uppercase tracking-wide">
              <Clock size={16} />
              {t('welcome.recentRepositories')}
            </h2>
            <ul className="list-none p-0 m-0">
              {recentRepositories.map((repo) => (
                <li key={repo.path}>
                  <RecentRepoContextMenu repo={repo} onOpenInTab={handleOpenRecent}>
                    <button
                      className="flex flex-col items-start w-full py-3 px-4 bg-transparent border border-(--border-color) rounded-md mb-2 cursor-pointer transition-all text-left hover:bg-(--bg-hover) hover:border-(--accent-color)"
                      onClick={() => handleOpenRecent(repo.path)}
                    >
                      <span className="text-sm font-semibold text-(--text-primary)">
                        {repo.name}
                      </span>
                      <span className="text-xs text-(--text-secondary) mt-1 break-all">
                        {repo.path}
                      </span>
                      <span className="text-sm text-(--text-tertiary) mt-1">
                        {formatTimeAgo(repo.lastOpened)}
                      </span>
                    </button>
                  </RecentRepoContextMenu>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
