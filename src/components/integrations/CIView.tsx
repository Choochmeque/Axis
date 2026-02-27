import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui';
import { useIntegrationStore } from '@/store/integrationStore';
import { CIRunList } from './CIRunList';

export function CIView() {
  const { t } = useTranslation();
  const {
    ciRuns,
    ciRunsHasMore,
    isLoadingCiRuns,
    isLoadingMoreCiRuns,
    connectionStatus,
    reloadCiRuns,
    loadMoreCiRuns,
  } = useIntegrationStore();

  // Soft load CI runs on mount (uses cached data if available)
  useEffect(() => {
    const state = useIntegrationStore.getState();
    if (state.connectionStatus?.connected && state.detectedProvider) {
      state.loadCiRuns();
    }
  }, []);

  const handleRefresh = useCallback(() => {
    reloadCiRuns();
  }, [reloadCiRuns]);

  const handleLoadMore = useCallback(() => {
    loadMoreCiRuns();
  }, [loadMoreCiRuns]);

  if (!connectionStatus?.connected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-(--text-muted)">
          <p>{t('integrations.notConnected.message')}</p>
          <p className="mt-2 text-sm">{t('integrations.notConnected.ciHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-(--border-color) bg-(--bg-primary)">
        <span className="text-sm font-medium text-(--text-primary)">
          {t('integrations.ci.title')}
        </span>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoadingCiRuns}
          title={t('integrations.common.refresh')}
        >
          <RefreshCw size={14} className={isLoadingCiRuns ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <CIRunList
          ciRuns={ciRuns}
          isLoading={isLoadingCiRuns}
          hasMore={ciRunsHasMore}
          isLoadingMore={isLoadingMoreCiRuns}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );
}
