import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import { useIntegrationStore } from '@/store/integrationStore';
import { IssueList } from './IssueList';
import { IssueDetail } from './IssueDetail';
import { CreateIssueDialog } from './CreateIssueDialog';
import { IssueState } from '@/types';
import type { Issue } from '@/types';

export function IssuesView() {
  const { t } = useTranslation();
  const {
    issues,
    selectedIssue,
    issueFilter,
    issuesHasMore,
    isLoadingIssues,
    isLoadingMoreIssues,
    connectionStatus,
    reloadIssues,
    loadMoreIssues,
    getIssue,
    setIssueFilter,
    clearSelectedIssue,
  } = useIntegrationStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Soft load issues on mount (uses cached data if available)
  useEffect(() => {
    const state = useIntegrationStore.getState();
    if (state.connectionStatus?.connected && state.detectedProvider) {
      state.loadIssues();
    }
  }, []);

  const handleIssueSelect = useCallback(
    async (issue: Issue) => {
      await getIssue(issue.number);
    },
    [getIssue]
  );

  const handleRefresh = useCallback(() => {
    reloadIssues();
  }, [reloadIssues]);

  const handleLoadMore = useCallback(() => {
    loadMoreIssues();
  }, [loadMoreIssues]);

  const handleIssueCreated = useCallback(() => {
    setShowCreateDialog(false);
    reloadIssues();
  }, [reloadIssues]);

  if (!connectionStatus?.connected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-(--text-muted)">
          <p>{t('integrations.notConnected.message')}</p>
          <p className="mt-2 text-sm">{t('integrations.notConnected.issuesHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-(--border-color) bg-(--bg-primary)">
        <span className="text-sm font-medium text-(--text-primary)">
          {t('integrations.issues.title')}
        </span>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 ml-4">
          <button
            className={`px-2 py-1 text-xs rounded ${
              issueFilter === IssueState.Open
                ? 'bg-(--accent-color) text-white'
                : 'bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-hover)'
            }`}
            onClick={() => setIssueFilter(IssueState.Open)}
          >
            {t('integrations.issues.filterOpen')}
          </button>
          <button
            className={`px-2 py-1 text-xs rounded ${
              issueFilter === IssueState.Closed
                ? 'bg-(--accent-color) text-white'
                : 'bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-hover)'
            }`}
            onClick={() => setIssueFilter(IssueState.Closed)}
          >
            {t('integrations.issues.filterClosed')}
          </button>
          <button
            className={`px-2 py-1 text-xs rounded ${
              issueFilter === IssueState.All
                ? 'bg-(--accent-color) text-white'
                : 'bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-hover)'
            }`}
            onClick={() => setIssueFilter(IssueState.All)}
          >
            {t('integrations.issues.filterAll')}
          </button>
        </div>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoadingIssues}
          title={t('integrations.common.refresh')}
        >
          <RefreshCw size={14} className={isLoadingIssues ? 'animate-spin' : ''} />
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          title={t('integrations.common.newIssue')}
        >
          <Plus size={14} />
        </Button>
      </div>

      {/* Content */}
      {selectedIssue ? (
        <PanelGroup direction="horizontal" autoSaveId="issues-view-layout" className="flex-1">
          <Panel defaultSize={40} minSize={25} maxSize={60}>
            <IssueList
              issues={issues}
              selectedIssue={selectedIssue}
              isLoading={isLoadingIssues}
              hasMore={issuesHasMore}
              isLoadingMore={isLoadingMoreIssues}
              onSelect={handleIssueSelect}
              onLoadMore={handleLoadMore}
            />
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          <Panel minSize={40}>
            <IssueDetail issueDetail={selectedIssue} onClose={clearSelectedIssue} />
          </Panel>
        </PanelGroup>
      ) : (
        <div className="flex-1 overflow-hidden">
          <IssueList
            issues={issues}
            selectedIssue={selectedIssue}
            isLoading={isLoadingIssues}
            hasMore={issuesHasMore}
            isLoadingMore={isLoadingMoreIssues}
            onSelect={handleIssueSelect}
            onLoadMore={handleLoadMore}
          />
        </div>
      )}

      {/* Create Issue Dialog */}
      <CreateIssueDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={handleIssueCreated}
      />
    </div>
  );
}
