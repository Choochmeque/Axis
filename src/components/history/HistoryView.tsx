// Refactored to use vscode-git-graph approach
import { useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { GitCommit, Loader2 } from 'lucide-react';

import { useRepositoryStore } from '@/store/repositoryStore';
import { useScrollToCommit } from '@/hooks';
import type { GraphCommit } from '@/types';
import { RefType } from '@/types';
import { CommitDetailPanel } from './CommitDetailPanel';
import { HistoryFilters } from './HistoryFilters';
import {
  CommitGraph,
  defaultGraphConfig,
  defaultMuteConfig,
  buildCommitLookup,
  createGraph,
} from './CommitGraph';
import { CommitTable } from './CommitTable';
import { BisectBanner } from '../merge/BisectBanner';

export function HistoryView() {
  const { t } = useTranslation();
  const {
    commits,
    isLoadingCommits,
    isLoadingMoreCommits,
    hasMoreCommits,
    error,
    selectedCommitOid,
    selectedCommitData,
    selectCommit,
    clearCommitSelection,
    loadMoreCommits,
    loadCommits,
    loadStatus,
  } = useRepositoryStore();

  const listRef = useRef<HTMLDivElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const tableHeaderRef = useRef<HTMLTableRowElement>(null);

  const { scrollToCommit, cancelScroll, isSearching, progress } = useScrollToCommit(listRef);

  // Use commit from list if available, otherwise fall back to fetched data
  const selectedCommit = selectedCommitOid
    ? (commits.find((c) => c.oid === selectedCommitOid) ?? selectedCommitData)
    : null;

  // Determine current HEAD commit
  const commitHead = useMemo(() => {
    const headCommit = commits.find((c) =>
      c.refs?.some((r) => r.isHead && r.refType === RefType.LocalBranch)
    );
    return headCommit?.oid ?? null;
  }, [commits]);

  // Build graph data (single Graph instance used for both computation and rendering)
  const graphData = useMemo(() => {
    const commitLookup = buildCommitLookup(commits);

    // Create dummy element for Graph (SVG will be moved to CommitGraph container)
    const dummyElem = document.createElement('div');
    const graph = createGraph(
      dummyElem,
      commits,
      commitHead,
      commitLookup,
      defaultGraphConfig,
      defaultMuteConfig
    );

    return {
      vertexColours: graph.getVertexColours(),
      widthsAtVertices: graph.getWidthsAtVertices(),
      mutedCommits: graph.getMutedCommits(commitHead),
      graph,
    };
  }, [commits, commitHead]);

  const handleCommitClick = useCallback(
    (_index: number, commit: GraphCommit) => {
      if (selectedCommitOid === commit.oid) {
        clearCommitSelection();
      } else {
        selectCommit(commit.oid);
      }
    },
    [selectedCommitOid, selectCommit, clearCommitSelection]
  );

  const handleScroll = useCallback(() => {
    if (!listRef.current || isLoadingMoreCommits || !hasMoreCommits) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const scrollThreshold = 200;

    if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
      loadMoreCommits();
    }
  }, [isLoadingMoreCommits, hasMoreCommits, loadMoreCommits]);

  // Scroll to selected commit when it changes
  useEffect(() => {
    if (!selectedCommitOid || !listRef.current) return;

    const row = listRef.current.querySelector(`[data-oid="${selectedCommitOid}"]`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedCommitOid]);

  // Handle graph column width change
  const handleGraphWidthChange = useCallback((width: number) => {
    if (graphContainerRef.current) {
      graphContainerRef.current.style.width = width + 'px';
    }
  }, []);

  if (isLoadingCommits) {
    return (
      <div className="historyEmptyState">
        <p>{t('history.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="historyEmptyState">
        <GitCommit size={48} strokeWidth={1} />
        <p>{t('history.errorLoading')}</p>
        <p className="text-xs text-(--text-tertiary)">{error}</p>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="historyEmptyState">
        <GitCommit size={48} strokeWidth={1} />
        <p>{t('history.noCommits')}</p>
      </div>
    );
  }

  const handleBisectComplete = async () => {
    await loadCommits();
    await loadStatus();
  };

  const commitListContent = (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
      <HistoryFilters />
      <BisectBanner onComplete={handleBisectComplete} />
      {isSearching && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-(--bg-secondary) border-b border-(--border-color) text-xs">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            <span>{t('history.scrollToCommit.searching')}</span>
            <span className="text-(--text-tertiary)">
              {t('history.scrollToCommit.progress', { count: progress })}
            </span>
          </div>
          <button
            type="button"
            className="text-(--accent-color) hover:underline cursor-pointer"
            onClick={cancelScroll}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto" ref={listRef} onScroll={handleScroll}>
        <div id="commitGraphContent">
          <div id="commitGraph" ref={graphContainerRef} />
          <CommitGraph
            graph={graphData.graph}
            expandedCommitIndex={null}
            containerRef={graphContainerRef}
            tableHeaderRef={tableHeaderRef}
          />
          <CommitTable
            commits={commits}
            vertexColours={graphData.vertexColours}
            widthsAtVertices={graphData.widthsAtVertices}
            mutedCommits={graphData.mutedCommits}
            commitHead={commitHead}
            selectedCommitOid={selectedCommitOid}
            onCommitClick={handleCommitClick}
            onGraphWidthChange={handleGraphWidthChange}
            tableHeaderRef={tableHeaderRef}
          />
        </div>
        {isLoadingMoreCommits && (
          <div className="flex items-center justify-center gap-2 p-3 text-(--text-secondary) text-xs">
            <Loader2 size={16} className="animate-spin" />
            <span>{t('history.loadingMore')}</span>
          </div>
        )}
      </div>
    </div>
  );

  const viewClass = 'flex flex-col flex-1 h-full min-h-0 overflow-hidden';

  if (!selectedCommit) {
    return <div className={viewClass}>{commitListContent}</div>;
  }

  return (
    <div className={viewClass}>
      <PanelGroup direction="vertical" autoSaveId="history-layout">
        <Panel defaultSize={50} minSize={20}>
          {commitListContent}
        </Panel>
        <PanelResizeHandle className="resize-handle-vertical" />
        <Panel defaultSize={50} minSize={30}>
          <CommitDetailPanel
            commit={selectedCommit}
            onClose={clearCommitSelection}
            onScrollToCommit={scrollToCommit}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}
