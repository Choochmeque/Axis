import { useTranslation } from 'react-i18next';
import { GitBranch } from 'lucide-react';

import { OperationsIndicator } from '@/components/ui/OperationsIndicator';
import { ToastHistoryDropdown } from '@/components/ui/toast';
import { useRepositoryStore } from '@/store/repositoryStore';

export function StatusBar() {
  const { t } = useTranslation();
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
              <span>{repository.currentBranch ?? t('layout.statusBar.detached')}</span>
            </div>
            {changesCount > 0 ? (
              <span className="flex items-center gap-1 text-warning">
                {t('layout.statusBar.changes', { count: changesCount })}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-success">
                {t('layout.statusBar.clean')}
              </span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        {isLoading && (
          <span className="flex items-center gap-1">{t('layout.statusBar.loading')}</span>
        )}
        <OperationsIndicator />
        <ToastHistoryDropdown />
      </div>
    </div>
  );
}
