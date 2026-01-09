import { GitBranch } from 'lucide-react';
import { useRepositoryStore } from '../../store/repositoryStore';
import './StatusBar.css';

export function StatusBar() {
  const { repository, status, isLoading } = useRepositoryStore();

  const changesCount =
    (status?.staged.length ?? 0) +
    (status?.unstaged.length ?? 0) +
    (status?.untracked.length ?? 0);

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        {repository && (
          <>
            <div className="status-item">
              <GitBranch size={14} />
              <span>{repository.current_branch ?? 'detached'}</span>
            </div>
            {changesCount > 0 ? (
              <span className="status-item status-changes">
                {changesCount} changes
              </span>
            ) : (
              <span className="status-item status-clean">Clean</span>
            )}
          </>
        )}
      </div>
      <div className="status-bar-right">
        {isLoading && <span className="status-item">Loading...</span>}
        {repository && (
          <span className="status-item status-path" title={repository.path}>
            {repository.path}
          </span>
        )}
      </div>
    </div>
  );
}
