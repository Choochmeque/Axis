import { useEffect } from 'react';
import { FolderOpen, FolderPlus, Clock } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useRepositoryStore } from '../store/repositoryStore';
import { formatDistanceToNow } from 'date-fns';
import './WelcomeView.css';

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
    <div className="welcome-view">
      <div className="welcome-content">
        <h1 className="welcome-title">Axis</h1>
        <p className="welcome-subtitle">Git Repository Manager</p>

        <div className="welcome-actions">
          <button className="welcome-button" onClick={handleOpenRepository}>
            <FolderOpen size={24} />
            <span>Open Repository</span>
          </button>
          <button className="welcome-button" disabled>
            <FolderPlus size={24} />
            <span>Clone Repository</span>
          </button>
        </div>

        {recentRepositories.length > 0 && (
          <div className="recent-repositories">
            <h2 className="recent-title">
              <Clock size={16} />
              Recent Repositories
            </h2>
            <ul className="recent-list">
              {recentRepositories.map((repo) => (
                <li key={repo.path}>
                  <button
                    className="recent-item"
                    onClick={() => handleOpenRecent(repo.path)}
                  >
                    <span className="recent-name">{repo.name}</span>
                    <span className="recent-path">{repo.path}</span>
                    <span className="recent-date">
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
