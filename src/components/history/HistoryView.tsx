import { useRef, useCallback, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useRepositoryStore } from '../../store/repositoryStore';
import { formatDistanceToNow } from 'date-fns';
import { GitCommit, Loader2, GitBranch, Tag } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { GraphCommit, GraphEdge } from '../../types';
import { CommitDetailPanel } from './CommitDetailPanel';
import { CommitContextMenu } from './CommitContextMenu';
import { HistoryFilters } from './HistoryFilters';

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

function GraphCell({
  commit,
  width,
  index,
  activeLanes,
}: GraphCellProps & { index: number; activeLanes: Set<number> }) {
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
        <GraphEdgeLine key={idx} edge={edge} fromLane={commit.lane} height={height} />
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
    edge.edge_type === 'branch' ? getLaneColor(fromLane) : getLaneColor(edge.parent_lane);

  if (fromLane === edge.parent_lane) {
    // Straight line down
    return <line x1={fromX} y1={fromY} x2={toX} y2={toY} stroke={color} strokeWidth={2} />;
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
    status,
    setCurrentView,
  } = useRepositoryStore();

  // Check if there are uncommitted changes
  const hasUncommittedChanges =
    status &&
    (status.staged.length > 0 ||
      status.unstaged.length > 0 ||
      status.untracked.length > 0 ||
      status.conflicted.length > 0);

  const uncommittedChangeCount = status
    ? status.staged.length +
      status.unstaged.length +
      status.untracked.length +
      status.conflicted.length
    : 0;

  const listRef = useRef<HTMLDivElement>(null);

  // Use commit from list if available, otherwise fall back to fetched data
  const selectedCommit = selectedCommitOid
    ? (commits.find((c) => c.oid === selectedCommitOid) ?? selectedCommitData)
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

  const activeLanesPerRow = buildActiveLanes(commits);

  const computedMaxLane = Math.max(maxLane, ...commits.map((commit) => commit.lane));
  const graphWidth = (computedMaxLane + 1) * LANE_WIDTH + 6;

  const colClass = 'overflow-hidden text-ellipsis whitespace-nowrap';

  const commitListContent = (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
      <HistoryFilters />
      <div className="flex py-2 px-3 bg-(--bg-header) border-b border-(--border-color) text-[11px] font-semibold uppercase text-(--text-secondary)">
        <div className={cn(colClass, 'shrink-0')} style={{ width: graphWidth }}>
          Graph
        </div>
        <div className={cn(colClass, 'flex-1 min-w-50')}>Description</div>
        <div className={cn(colClass, 'w-30 shrink-0 text-right pr-4')}>Date</div>
        <div className={cn(colClass, 'w-37 shrink-0')}>Author</div>
        <div className={cn(colClass, 'w-18 shrink-0')}>SHA</div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto" ref={listRef} onScroll={handleScroll}>
        {hasUncommittedChanges && (
          <div
            className="flex items-center h-7 px-3 border-b border-(--border-color) transition-colors cursor-pointer hover:bg-(--bg-hover) bg-(--bg-uncommitted)"
            onClick={() => setCurrentView('file-status')}
          >
            <div className={cn(colClass, 'shrink-0')} style={{ width: graphWidth }}>
              <svg width={graphWidth} height={ROW_HEIGHT} className="graph-svg">
                {/* Uncommitted changes node - hollow circle */}
                <circle
                  cx={LANE_WIDTH / 2}
                  cy={ROW_HEIGHT / 2}
                  r={NODE_RADIUS + 1}
                  fill="var(--bg-secondary)"
                  stroke={LANE_COLORS[0]}
                  strokeWidth={2}
                />
                {/* Line going down to first commit */}
                <line
                  x1={LANE_WIDTH / 2}
                  y1={ROW_HEIGHT / 2 + NODE_RADIUS + 1}
                  x2={LANE_WIDTH / 2}
                  y2={ROW_HEIGHT}
                  stroke={LANE_COLORS[0]}
                  strokeWidth={2}
                />
              </svg>
            </div>
            <div className={cn(colClass, 'flex-1 min-w-50')}>
              <span className="text-[13px] font-medium text-(--text-uncommitted)">
                Uncommitted changes
              </span>
              <span className="ml-2 text-xs text-(--text-secondary)">
                ({uncommittedChangeCount} {uncommittedChangeCount === 1 ? 'file' : 'files'})
              </span>
            </div>
            <div className={cn(colClass, 'w-30 shrink-0 text-right pr-4')}>
              <span className="text-xs text-(--text-secondary)">–</span>
            </div>
            <div className={cn(colClass, 'w-37 shrink-0')}>
              <span className="text-xs text-(--text-secondary)">–</span>
            </div>
            <div className={cn(colClass, 'w-18 shrink-0')}>
              <code className="font-mono text-[11px] text-(--text-secondary)">*</code>
            </div>
          </div>
        )}
        {commits.map((commit, index) => (
          <CommitContextMenu key={commit.oid} commit={commit}>
            <div
              data-commit-oid={commit.oid}
              className={cn(
                'flex items-center h-7 px-3 border-b border-(--border-color) transition-colors cursor-pointer hover:bg-(--bg-hover)',
                commit.is_merge && 'bg-(--bg-merge)',
                selectedCommitOid === commit.oid && 'bg-(--bg-active) hover:bg-(--bg-active)'
              )}
              onClick={() => handleRowClick(commit)}
            >
              <div className={cn(colClass, 'shrink-0')} style={{ width: graphWidth }}>
                <GraphCell
                  commit={commit}
                  width={graphWidth}
                  index={index}
                  activeLanes={activeLanesPerRow[index]}
                />
              </div>
              <div className={cn(colClass, 'flex-1 min-w-50')}>
                {commit.refs && commit.refs.length > 0 && (
                  <span className="inline-flex gap-1 mr-2">
                    {commit.refs.map((ref, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          'inline-flex items-center gap-0.5 text-[11px] py-0.5 px-1.5 rounded font-medium [&>svg]:shrink-0',
                          ref.ref_type === 'local_branch' && 'bg-[#107c10] text-white',
                          ref.ref_type === 'remote_branch' && 'bg-[#5c2d91] text-white',
                          ref.ref_type === 'tag' && 'bg-[#d83b01] text-white',
                          ref.is_head && 'font-bold'
                        )}
                      >
                        {ref.ref_type === 'tag' ? <Tag size={10} /> : <GitBranch size={10} />}
                        {ref.name}
                      </span>
                    ))}
                  </span>
                )}
                <span className="text-[13px]">{commit.summary}</span>
              </div>
              <div className={cn(colClass, 'w-30 shrink-0 text-right pr-4')}>
                <span className="text-xs text-(--text-secondary)">
                  {formatDistanceToNow(new Date(commit.timestamp), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className={cn(colClass, 'w-37 shrink-0')}>
                <span className="text-xs text-(--text-secondary)">{commit.author.name}</span>
              </div>
              <div className={cn(colClass, 'w-18 shrink-0')}>
                <code className="font-mono text-[11px] text-(--text-secondary) bg-(--bg-code) py-0.5 px-1.5 rounded">
                  {commit.short_oid}
                </code>
              </div>
            </div>
          </CommitContextMenu>
        ))}
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
        <PanelResizeHandle className="h-1 bg-(--border-color) cursor-row-resize transition-colors hover:bg-(--accent-color) data-[resize-handle-state=hover]:bg-(--accent-color) data-[resize-handle-state=drag]:bg-(--accent-color)" />
        <Panel defaultSize={50} minSize={30}>
          <CommitDetailPanel commit={selectedCommit} onClose={clearCommitSelection} />
        </Panel>
      </PanelGroup>
    </div>
  );
}
