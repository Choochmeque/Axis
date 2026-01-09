import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { graphApi } from '../../services/api';
import { CommitList } from './CommitList';
import { CommitDetail } from './CommitDetail';
import { SearchBar } from './SearchBar';
import type { GraphCommit, Commit, GraphResult } from '../../types';
import './HistoryView.css';

interface HistoryViewProps {
  onFileSelect?: (path: string) => void;
}

const PAGE_SIZE = 100;

export function HistoryView({ onFileSelect }: HistoryViewProps) {
  const [graphResult, setGraphResult] = useState<GraphResult | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<GraphCommit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial graph
  useEffect(() => {
    loadGraph();
  }, []);

  const loadGraph = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await graphApi.build({
        limit: PAGE_SIZE,
        all_branches: true,
      });
      setGraphResult(result);
    } catch (err) {
      console.error('Failed to load graph:', err);
      setError('Failed to load commit history');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (!graphResult || isLoadingMore || !graphResult.has_more) return;

    setIsLoadingMore(true);
    try {
      const result = await graphApi.build({
        limit: PAGE_SIZE,
        skip: graphResult.commits.length,
        all_branches: true,
      });

      setGraphResult((prev) =>
        prev
          ? {
              ...result,
              commits: [...prev.commits, ...result.commits],
              max_lane: Math.max(prev.max_lane, result.max_lane),
            }
          : result
      );
    } catch (err) {
      console.error('Failed to load more commits:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [graphResult, isLoadingMore]);

  const handleCommitSelect = useCallback((commit: GraphCommit) => {
    setSelectedCommit(commit);
  }, []);

  const handleSearchSelect = useCallback(
    (commit: Commit) => {
      // Find the commit in the graph or scroll to it
      const graphCommit = graphResult?.commits.find((c) => c.oid === commit.oid);
      if (graphCommit) {
        setSelectedCommit(graphCommit);
      }
      setShowSearch(false);
    },
    [graphResult]
  );

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => !prev);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  if (isLoading) {
    return (
      <div className="history-view-loading">
        <p>Loading commit history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-view-error">
        <p>{error}</p>
        <button onClick={loadGraph}>Retry</button>
      </div>
    );
  }

  if (!graphResult || graphResult.commits.length === 0) {
    return (
      <div className="history-view-empty">
        <p>No commits found</p>
      </div>
    );
  }

  return (
    <div className="history-view">
      <div className="history-view-toolbar">
        <button
          className={`toolbar-button ${showSearch ? 'is-active' : ''}`}
          onClick={toggleSearch}
          title="Search commits (Cmd/Ctrl+F)"
        >
          <Search size={16} />
        </button>

        {showSearch && (
          <div className="history-search-container">
            <SearchBar
              onResultSelect={handleSearchSelect}
              onClose={() => setShowSearch(false)}
            />
          </div>
        )}
      </div>

      <PanelGroup direction="vertical" className="history-view-panels">
        <Panel defaultSize={60} minSize={30}>
          <CommitList
            commits={graphResult.commits}
            maxLane={graphResult.max_lane}
            selectedOid={selectedCommit?.oid}
            onCommitSelect={handleCommitSelect}
            onLoadMore={loadMore}
            hasMore={graphResult.has_more}
            isLoading={isLoadingMore}
          />
        </Panel>

        <PanelResizeHandle className="resize-handle-horizontal" />

        <Panel defaultSize={40} minSize={20}>
          <CommitDetail
            commit={selectedCommit}
            onFileSelect={onFileSelect}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}
