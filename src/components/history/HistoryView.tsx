// Refactored to use vscode-git-graph approach
import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useRepositoryStore } from '@/store/repositoryStore';
import { GitCommit, Loader2 } from 'lucide-react';
import type { GraphCommit } from '@/types';
import { CommitDetailPanel } from './CommitDetailPanel';
import { HistoryFilters } from './HistoryFilters';
import { CommitGraph, defaultGraphConfig, defaultMuteConfig } from './CommitGraph';
import { CommitTable } from './CommitTable';
import { Graph, type GitCommit as GGCommit } from '@/lib/graph';
import { RefType } from '@/types';

// Transform Axis GraphCommit to vscode-git-graph GitCommit format
function toGitCommit(commit: GraphCommit): GGCommit {
  return {
    hash: commit.oid,
    parents: commit.parentOids,
    author: commit.author.name,
    email: commit.author.email,
    date: new Date(commit.timestamp).getTime(),
    message: commit.summary,
    heads:
      commit.refs
        ?.filter((r) => r.refType === RefType.LocalBranch)
        .map((r) => r.name) ?? [],
    tags:
      commit.refs
        ?.filter((r) => r.refType === RefType.Tag)
        .map((r) => ({ name: r.name, annotated: false })) ?? [],
    remotes:
      commit.refs
        ?.filter((r) => r.refType === RefType.RemoteBranch)
        .map((r) => ({ name: r.name, remote: null })) ?? [],
    stash: null,
  };
}

export function HistoryView() {
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
  } = useRepositoryStore();

  const listRef = useRef<HTMLDivElement>(null);

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

  // Build graph data
  const graphData = useMemo(() => {
    const gitCommits = commits.map(toGitCommit);
    const commitLookup: { [hash: string]: number } = {};
    gitCommits.forEach((c, i) => {
      commitLookup[c.hash] = i;
    });

    // Create dummy elements for computation-only Graph (no rendering)
    const dummyElem = document.createElement('div');
    const graph = new Graph(dummyElem, dummyElem, defaultGraphConfig, defaultMuteConfig);
    graph.loadCommits(gitCommits, commitHead, commitLookup, false);

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

  // Find commit element by index (for graph hover)
  const findCommitElem = useCallback((index: number): HTMLElement | null => {
    if (!listRef.current) return null;
    return listRef.current.querySelector(`[data-id="${index}"]`);
  }, []);

  // Handle vertex hover
  const handleVertexHover = useCallback((index: number | null) => {
    // Could be used to highlight rows
  }, []);

  // Handle graph column width change
  const handleGraphWidthChange = useCallback((width: number) => {
    const graphElem = document.getElementById('commitGraph');
    if (graphElem) {
      graphElem.style.width = width + 'px';
    }
  }, []);

  const emptyStateClass =
    'flex flex-col items-center justify-center flex-1 h-full text-(--text-secondary) gap-3';

  if (isLoadingCommits) {
    return (
      <div className={emptyStateClass}>
        <p>Loading commits...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={emptyStateClass}>
        <GitCommit size={48} strokeWidth={1} />
        <p>Error loading commits</p>
        <p className="text-xs text-(--text-tertiary)">{error}</p>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className={emptyStateClass}>
        <GitCommit size={48} strokeWidth={1} />
        <p>No commits yet</p>
      </div>
    );
  }

  const commitListContent = (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
      <HistoryFilters />
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        ref={listRef}
        onScroll={handleScroll}
      >
        <div id="commitGraphContent" style={{ position: 'relative' }}>
          <CommitGraph
            commits={commits}
            commitHead={commitHead}
            expandedCommitIndex={null}
            config={defaultGraphConfig}
            muteConfig={defaultMuteConfig}
            onVertexHover={handleVertexHover}
            findCommitElem={findCommitElem}
          />
          <CommitTable
            commits={commits}
            vertexColours={graphData.vertexColours}
            widthsAtVertices={graphData.widthsAtVertices}
            mutedCommits={graphData.mutedCommits}
            commitHead={commitHead}
            onCommitClick={handleCommitClick}
            onGraphWidthChange={handleGraphWidthChange}
          />
        </div>
        {isLoadingMoreCommits && (
          <div className="flex items-center justify-center gap-2 p-3 text-(--text-secondary) text-xs">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading more commits...</span>
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
          <CommitDetailPanel commit={selectedCommit} onClose={clearCommitSelection} />
        </Panel>
      </PanelGroup>
    </div>
  );
}
