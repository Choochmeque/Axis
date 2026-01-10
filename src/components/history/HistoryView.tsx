import { useRef, useCallback, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useRepositoryStore } from '../../store/repositoryStore';
import { formatDistanceToNow } from 'date-fns';
import { GitCommit, Loader2, GitBranch, Tag } from 'lucide-react';
import { clsx } from 'clsx';
import type { GraphCommit, GraphEdge } from '../../types';
import { CommitDetailPanel } from './CommitDetailPanel';
import './HistoryView.css';

const LANE_WIDTH = 18;
const ROW_HEIGHT = 28;
const NODE_RADIUS = 4;

// Colors for different lanes
const LANE_COLORS = [
  '#0078d4', // blue
  '#107c10', // green
  '#5c2d91', // purple
  '#d83b01', // orange
  '#008272', // teal
  '#b4009e', // magenta
  '#004e8c', // dark blue
  '#498205', // olive
];

function getLaneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length];
}

interface GraphCellProps {
  commit: GraphCommit;
  width: number;
}

function GraphCell({ commit, width, index, activeLanes }: GraphCellProps & { index: number; activeLanes: Set<number> }) {
  const height = ROW_HEIGHT;
  const nodeX = commit.lane * LANE_WIDTH + LANE_WIDTH / 2;
  const nodeY = height / 2;

  // Draw incoming line if this commit's lane was active before this row
  const hasIncomingLine = index > 0 && activeLanes.has(commit.lane);

  return (
    <svg width={width} height={height} className="graph-svg">
      {/* Draw line from top to node center (incoming from previous row) */}
      {hasIncomingLine && (
        <line
          x1={nodeX}
          y1={0}
          x2={nodeX}
          y2={nodeY}
          stroke={getLaneColor(commit.lane)}
          strokeWidth={2}
        />
      )}

      {/* Draw edges to parents (going down) */}
      {commit.parent_edges.map((edge, idx) => (
        <GraphEdgeLine
          key={idx}
          edge={edge}
          fromLane={commit.lane}
          height={height}
        />
      ))}

      {/* Draw pass-through lines for other active lanes */}
      {Array.from(activeLanes).map((lane) => {
        // Skip the commit's own lane (handled above)
        if (lane === commit.lane) return null;

        const x = lane * LANE_WIDTH + LANE_WIDTH / 2;
        return (
          <line
            key={`pass-${lane}`}
            x1={x}
            y1={0}
            x2={x}
            y2={height}
            stroke={getLaneColor(lane)}
            strokeWidth={2}
          />
        );
      })}

      {/* Draw the commit node */}
      {commit.is_merge ? (
        <circle
          cx={nodeX}
          cy={nodeY}
          r={NODE_RADIUS + 1}
          fill={getLaneColor(commit.lane)}
          stroke="var(--bg-secondary)"
          strokeWidth={2}
        />
      ) : (
        <circle
          cx={nodeX}
          cy={nodeY}
          r={NODE_RADIUS}
          fill={getLaneColor(commit.lane)}
          stroke="var(--bg-secondary)"
          strokeWidth={2}
        />
      )}
    </svg>
  );
}

interface GraphEdgeLineProps {
  edge: GraphEdge;
  fromLane: number;
  height: number;
}

function GraphEdgeLine({ edge, fromLane, height }: GraphEdgeLineProps) {
  const fromX = fromLane * LANE_WIDTH + LANE_WIDTH / 2;
  const toX = edge.parent_lane * LANE_WIDTH + LANE_WIDTH / 2;
  const fromY = height / 2;
  const toY = height;
  const color =
    edge.edge_type === 'branch'
      ? getLaneColor(fromLane)
      : getLaneColor(edge.parent_lane);

  if (fromLane === edge.parent_lane) {
    // Straight line down
    return (
      <line
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        stroke={color}
        strokeWidth={2}
      />
    );
  } else {
    // Curved line for merge/branch
    const midY = (fromY + toY) / 2;
    return (
      <path
        d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
    );
  }
}

function buildActiveLanes(commits: GraphCommit[]): Set<number>[] {
  const activeLanesPerRow: Set<number>[] = [];
  const activeLanes: Array<string | null> = [];
  const commitLanes = new Map<string, number>();

  const findLane = (oid: string): number | null => {
    const existing = commitLanes.get(oid);
    if (existing !== undefined) {
      return existing;
    }
    for (let i = 0; i < activeLanes.length; i += 1) {
      if (activeLanes[i] === oid) {
        return i;
      }
    }
    return null;
  };

  const allocateLane = (): number => {
    const freeIndex = activeLanes.findIndex((lane) => lane === null);
    if (freeIndex !== -1) {
      return freeIndex;
    }
    activeLanes.push(null);
    return activeLanes.length - 1;
  };

  commits.forEach((commit) => {
    activeLanesPerRow.push(
      new Set(
        activeLanes
          .map((lane, index) => (lane ? index : null))
          .filter((lane): lane is number => lane !== null)
      )
    );

    commitLanes.set(commit.oid, commit.lane);

    if (commit.lane >= activeLanes.length) {
      while (activeLanes.length <= commit.lane) {
        activeLanes.push(null);
      }
    }
    activeLanes[commit.lane] = null;

    if (commit.parent_oids.length === 0) {
      return;
    }

    const firstParent = commit.parent_oids[0];
    const parentLane = findLane(firstParent);
    if (parentLane === null || parentLane === commit.lane) {
      activeLanes[commit.lane] = firstParent;
    }

    commit.parent_oids.slice(1).forEach((parentOid) => {
      if (findLane(parentOid) !== null) {
        return;
      }
      const lane = allocateLane();
      activeLanes[lane] = parentOid;
    });
  });

  return activeLanesPerRow;
}

export function HistoryView() {
  const {
    commits,
    maxLane,
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
    ? commits.find((c) => c.oid === selectedCommitOid) ?? selectedCommitData
    : null;

  const handleRowClick = (commit: GraphCommit) => {
    if (selectedCommitOid === commit.oid) {
      clearCommitSelection();
    } else {
      selectCommit(commit.oid);
    }
  };

  const handleScroll = useCallback(() => {
    if (!listRef.current || isLoadingMoreCommits || !hasMoreCommits) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const scrollThreshold = 200; // pixels from bottom

    if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
      loadMoreCommits();
    }
  }, [isLoadingMoreCommits, hasMoreCommits, loadMoreCommits]);

  // Scroll to selected commit when it changes
  useEffect(() => {
    if (!selectedCommitOid || !listRef.current) return;

    const row = listRef.current.querySelector(`[data-commit-oid="${selectedCommitOid}"]`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedCommitOid]);

  if (isLoadingCommits) {
    return (
      <div className="history-loading">
        <p>Loading commits...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-empty">
        <GitCommit size={48} strokeWidth={1} />
        <p>Error loading commits</p>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{error}</p>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="history-empty">
        <GitCommit size={48} strokeWidth={1} />
        <p>No commits yet</p>
      </div>
    );
  }

  const activeLanesPerRow = buildActiveLanes(commits);

  const computedMaxLane = Math.max(
    maxLane,
    ...commits.map((commit) => commit.lane)
  );
  const graphWidth = (computedMaxLane + 1) * LANE_WIDTH + 6;

  const commitListContent = (
    <div className="history-view-list">
      <div className="history-header">
        <div className="history-col history-col-graph" style={{ width: graphWidth }}>
          Graph
        </div>
        <div className="history-col history-col-description">Description</div>
        <div className="history-col history-col-date">Date</div>
        <div className="history-col history-col-author">Author</div>
        <div className="history-col history-col-sha">SHA</div>
      </div>
      <div className="history-list" ref={listRef} onScroll={handleScroll}>
        {commits.map((commit, index) => (
          <div
            key={commit.oid}
            data-commit-oid={commit.oid}
            className={clsx('history-row', {
              'is-merge': commit.is_merge,
              'is-selected': selectedCommitOid === commit.oid,
            })}
            onClick={() => handleRowClick(commit)}
          >
            <div className="history-col history-col-graph" style={{ width: graphWidth }}>
              <GraphCell
                commit={commit}
                width={graphWidth}
                index={index}
                activeLanes={activeLanesPerRow[index]}
              />
            </div>
            <div className="history-col history-col-description">
              {commit.refs && commit.refs.length > 0 && (
                <span className="commit-refs">
                  {commit.refs.map((ref, idx) => (
                    <span
                      key={idx}
                      className={clsx('commit-ref', `ref-${ref.ref_type}`, {
                        'is-head': ref.is_head,
                      })}
                    >
                      {ref.ref_type === 'tag' ? (
                        <Tag size={10} />
                      ) : (
                        <GitBranch size={10} />
                      )}
                      {ref.name}
                    </span>
                  ))}
                </span>
              )}
              <span className="commit-summary">{commit.summary}</span>
            </div>
            <div className="history-col history-col-date">
              <span className="commit-date">
                {formatDistanceToNow(new Date(commit.timestamp), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <div className="history-col history-col-author">
              <span className="commit-author">{commit.author.name}</span>
            </div>
            <div className="history-col history-col-sha">
              <code className="commit-sha">{commit.short_oid}</code>
            </div>
          </div>
        ))}
        {isLoadingMoreCommits && (
          <div className="history-loading-more">
            <Loader2 size={16} className="spinner" />
            <span>Loading more commits...</span>
          </div>
        )}
      </div>
    </div>
  );

  if (!selectedCommit) {
    return <div className="history-view">{commitListContent}</div>;
  }

  return (
    <div className="history-view">
      <PanelGroup direction="vertical" autoSaveId="history-layout">
        <Panel defaultSize={50} minSize={20}>
          {commitListContent}
        </Panel>
        <PanelResizeHandle className="resize-handle-horizontal" />
        <Panel defaultSize={50} minSize={30}>
          <CommitDetailPanel
            commit={selectedCommit}
            onClose={clearCommitSelection}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}
