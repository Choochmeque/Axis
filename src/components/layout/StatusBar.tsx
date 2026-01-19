import { GitBranch } from 'lucide-react';

import { ToastHistoryDropdown } from '@/components/ui/toast';
import { useRepositoryStore } from '@/store/repositoryStore';

export function StatusBar() {
  const { repository, status, isLoading } = useRepositoryStore();

  const changesCount =
    (status?.staged.length ?? 0) + (status?.unstaged.length ?? 0) + (status?.untracked.length ?? 0);

  return (
    <div className="flex items-center justify-between px-3 py-1 bg-(--bg-statusbar) border-t border-(--border-color) text-xs text-white">
      <div className="flex items-center gap-4">
        {repository && (
          <>
            <div className="flex items-center gap-1">
              <GitBranch size={14} />
              <span>{repository.currentBranch ?? 'detached'}</span>
            </div>
            {changesCount > 0 ? (
              <span className="flex items-center gap-1 text-warning">{changesCount} changes</span>
            ) : (
              <span className="flex items-center gap-1 text-success">Clean</span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        {isLoading && <span className="flex items-center gap-1">Loading...</span>}
        {repository && (
          <span
            className="flex items-center gap-1 max-w-75 overflow-hidden text-ellipsis whitespace-nowrap"
            title={repository.path}
          >
            {repository.path}
          </span>
        )}
        <ToastHistoryDropdown />
      </div>
    </div>
  );
}
