import { useEffect } from 'react';
import { FolderOpen, FolderPlus, Clock } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useRepositoryStore } from '../store/repositoryStore';
import { formatDistanceToNow } from 'date-fns';

export function WelcomeView() {
  const { recentRepositories, loadRecentRepositories, openRepository } =
    useRepositoryStore();

  useEffect(() => {
    loadRecentRepositories();
  }, [loadRecentRepositories]);

  const handleOpenRepository = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Repository',
    });

    if (selected && typeof selected === 'string') {
      await openRepository(selected);
    }
  };

  const handleOpenRecent = async (path: string) => {
    await openRepository(path);
  };

  return (
    <div className="flex items-center justify-center h-full p-12">
      <div className="text-center max-w-150">
        <h1 className="text-5xl font-bold m-0 mb-2 text-(--text-primary)">Axis</h1>
        <p className="text-lg text-(--text-secondary) m-0 mb-8">Git Repository Manager</p>

        <div className="flex justify-center gap-4 mb-12">
          <button
            className="flex flex-col items-center gap-3 py-6 px-8 bg-(--bg-card) border border-(--border-color) rounded-lg text-(--text-primary) cursor-pointer transition-all min-w-40 hover:not-disabled:bg-(--bg-hover) hover:not-disabled:border-(--accent-color) disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleOpenRepository}
          >
            <FolderOpen size={24} />
            <span>Open Repository</span>
          </button>
          <button
            className="flex flex-col items-center gap-3 py-6 px-8 bg-(--bg-card) border border-(--border-color) rounded-lg text-(--text-primary) cursor-pointer transition-all min-w-40 hover:not-disabled:bg-(--bg-hover) hover:not-disabled:border-(--accent-color) disabled:opacity-50 disabled:cursor-not-allowed"
            disabled
          >
            <FolderPlus size={24} />
            <span>Clone Repository</span>
          </button>
        </div>

        {recentRepositories.length > 0 && (
          <div className="text-left">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-(--text-secondary) m-0 mb-4 uppercase tracking-wide">
              <Clock size={16} />
              Recent Repositories
            </h2>
            <ul className="list-none p-0 m-0">
              {recentRepositories.map((repo) => (
                <li key={repo.path}>
                  <button
                    className="flex flex-col items-start w-full py-3 px-4 bg-transparent border border-(--border-color) rounded-md mb-2 cursor-pointer transition-all text-left hover:bg-(--bg-hover) hover:border-(--accent-color)"
                    onClick={() => handleOpenRecent(repo.path)}
                  >
                    <span className="text-sm font-semibold text-(--text-primary)">{repo.name}</span>
                    <span className="text-xs text-(--text-secondary) mt-1 break-all">{repo.path}</span>
                    <span className="text-[11px] text-(--text-tertiary) mt-1">
                      {formatDistanceToNow(new Date(repo.last_opened), {
                        addSuffix: true,
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
