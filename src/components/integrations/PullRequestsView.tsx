import { useState, useCallback, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import { useIntegrationStore } from '@/store/integrationStore';
import { PullRequestList } from './PullRequestList';
import { PullRequestDetail } from './PullRequestDetail';
import { CreatePullRequestDialog } from './CreatePullRequestDialog';
import { PrState } from '@/types';
import type { PullRequest } from '@/types';

export function PullRequestsView() {
  const {
    pullRequests,
    selectedPr,
    prFilter,
    prsHasMore,
    isLoadingPrs,
    isLoadingMorePrs,
    connectionStatus,
    loadPullRequests,
    loadMorePullRequests,
    getPullRequest,
    setPrFilter,
    clearSelectedPr,
  } = useIntegrationStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Load PRs on mount (clearing is done in Sidebar click handler)
  useEffect(() => {
    const state = useIntegrationStore.getState();
    if (state.connectionStatus?.connected && state.detectedProvider) {
      state.loadPullRequests();
    }
  }, []);

  const handlePrSelect = useCallback(
    async (pr: PullRequest) => {
      await getPullRequest(pr.number);
    },
    [getPullRequest]
  );

  const handleRefresh = useCallback(() => {
    loadPullRequests();
  }, [loadPullRequests]);

  const handleLoadMore = useCallback(() => {
    loadMorePullRequests();
  }, [loadMorePullRequests]);

  const handlePrCreated = useCallback(() => {
    setShowCreateDialog(false);
    loadPullRequests();
  }, [loadPullRequests]);

  if (!connectionStatus?.connected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-(--text-muted)">
          <p>Not connected to provider.</p>
          <p className="mt-2 text-sm">Connect in Settings to view pull requests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-(--border-color) bg-(--bg-primary)">
        <span className="text-sm font-medium text-(--text-primary)">Pull Requests</span>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 ml-4">
          <button
            className={`px-2 py-1 text-xs rounded ${
              prFilter === PrState.Open
                ? 'bg-(--accent-color) text-white'
                : 'bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-hover)'
            }`}
            onClick={() => setPrFilter(PrState.Open)}
          >
            Open
          </button>
          <button
            className={`px-2 py-1 text-xs rounded ${
              prFilter === PrState.Closed
                ? 'bg-(--accent-color) text-white'
                : 'bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-hover)'
            }`}
            onClick={() => setPrFilter(PrState.Closed)}
          >
            Closed
          </button>
          <button
            className={`px-2 py-1 text-xs rounded ${
              prFilter === PrState.All
                ? 'bg-(--accent-color) text-white'
                : 'bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-hover)'
            }`}
            onClick={() => setPrFilter(PrState.All)}
          >
            All
          </button>
        </div>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoadingPrs}
          title="Refresh"
        >
          <RefreshCw size={14} className={isLoadingPrs ? 'animate-spin' : ''} />
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          title="New PR"
        >
          <Plus size={14} />
        </Button>
      </div>

      {/* Content */}
      {selectedPr ? (
        <PanelGroup direction="horizontal" autoSaveId="pr-view-layout" className="flex-1">
          <Panel defaultSize={40} minSize={25} maxSize={60}>
            <PullRequestList
              pullRequests={pullRequests}
              selectedPr={selectedPr}
              isLoading={isLoadingPrs}
              hasMore={prsHasMore}
              isLoadingMore={isLoadingMorePrs}
              onSelect={handlePrSelect}
              onLoadMore={handleLoadMore}
            />
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          <Panel minSize={40}>
            <PullRequestDetail prDetail={selectedPr} onClose={clearSelectedPr} />
          </Panel>
        </PanelGroup>
      ) : (
        <div className="flex-1 overflow-hidden">
          <PullRequestList
            pullRequests={pullRequests}
            selectedPr={selectedPr}
            isLoading={isLoadingPrs}
            hasMore={prsHasMore}
            isLoadingMore={isLoadingMorePrs}
            onSelect={handlePrSelect}
            onLoadMore={handleLoadMore}
          />
        </div>
      )}

      {/* Create PR Dialog */}
      <CreatePullRequestDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={handlePrCreated}
      />
    </div>
  );
}
