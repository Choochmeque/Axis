import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnResizeMode,
} from '@tanstack/react-table';
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
  const lane = Number(commit.lane);
  const nodeX = lane * LANE_WIDTH + LANE_WIDTH / 2;
  const nodeY = height / 2;

  // Draw incoming line if this commit's lane was active before this row
  const hasIncomingLine = index > 0 && activeLanes.has(lane);

  return (
    <svg width={width} height={height} className="graph-svg">
      {/* Draw line from top to node center (incoming from previous row) */}
      {hasIncomingLine && (
        <line x1={nodeX} y1={0} x2={nodeX} y2={nodeY} stroke={getLaneColor(lane)} strokeWidth={2} />
      )}

      {/* Draw edges to parents (going down) */}
      {commit.parentEdges.map((edge, idx) => (
        <GraphEdgeLine key={idx} edge={edge} fromLane={lane} height={height} />
      ))}

      {/* Draw pass-through lines for other active lanes */}
      {Array.from(activeLanes).map((activeLane) => {
        // Skip the commit's own lane (handled above)
        if (activeLane === lane) return null;

        const x = activeLane * LANE_WIDTH + LANE_WIDTH / 2;
        return (
          <line
            key={`pass-${activeLane}`}
            x1={x}
            y1={0}
            x2={x}
            y2={height}
            stroke={getLaneColor(activeLane)}
            strokeWidth={2}
          />
        );
      })}

      {/* Draw the commit node */}
      {commit.isMerge ? (
        <circle
          cx={nodeX}
          cy={nodeY}
          r={NODE_RADIUS + 1}
          fill={getLaneColor(lane)}
          stroke="var(--bg-secondary)"
          strokeWidth={2}
        />
      ) : (
        <circle
          cx={nodeX}
          cy={nodeY}
          r={NODE_RADIUS}
          fill={getLaneColor(lane)}
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
  const parentLane = Number(edge.parentLane);
  const fromX = fromLane * LANE_WIDTH + LANE_WIDTH / 2;
  const toX = parentLane * LANE_WIDTH + LANE_WIDTH / 2;
  const fromY = height / 2;
  const toY = height;
  const color = edge.edgeType === 'branch' ? getLaneColor(fromLane) : getLaneColor(parentLane);

  if (fromLane === parentLane) {
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

    const lane = Number(commit.lane);
    commitLanes.set(commit.oid, lane);

    if (lane >= activeLanes.length) {
      while (activeLanes.length <= lane) {
        activeLanes.push(null);
      }
    }
    activeLanes[lane] = null;

    if (commit.parentOids.length === 0) {
      return;
    }

    const firstParent = commit.parentOids[0];
    const parentLane = findLane(firstParent);
    if (parentLane === null || parentLane === lane) {
      activeLanes[lane] = firstParent;
    }

    commit.parentOids.slice(1).forEach((parentOid) => {
      if (findLane(parentOid) !== null) {
        return;
      }
      const lane = allocateLane();
      activeLanes[lane] = parentOid;
    });
  });

  return activeLanesPerRow;
}

// Extended type for table rows (includes index and activeLanes for graph rendering)
interface CommitRow {
  commit: GraphCommit;
  index: number;
  activeLanes: Set<number>;
}

const columnHelper = createColumnHelper<CommitRow>();

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
    branches,
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

  // Compute graph data
  const activeLanesPerRow = useMemo(() => buildActiveLanes(commits), [commits]);
  const computedMaxLane = useMemo(
    () => Math.max(Number(maxLane), ...commits.map((commit) => Number(commit.lane))),
    [commits, maxLane]
  );
  const minGraphWidth = (computedMaxLane + 1) * LANE_WIDTH + 6;

  // Prepare table data
  const tableData = useMemo<CommitRow[]>(
    () =>
      commits.map((commit, index) => ({
        commit,
        index,
        activeLanes: activeLanesPerRow[index] || new Set(),
      })),
    [commits, activeLanesPerRow]
  );

  // Define columns
  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.commit, {
        id: 'graph',
        header: 'Graph',
        size: minGraphWidth,
        minSize: minGraphWidth,
        maxSize: 300,
        cell: ({ row, column }) => (
          <GraphCell
            commit={row.original.commit}
            width={column.getSize()}
            index={row.original.index}
            activeLanes={row.original.activeLanes}
          />
        ),
      }),
      columnHelper.accessor((row) => row.commit.summary, {
        id: 'description',
        header: 'Description',
        size: 400,
        minSize: 200,
        cell: ({ row }) => {
          const commit = row.original.commit;
          return (
            <>
              {commit.refs && commit.refs.length > 0 && (
                <span className="inline-flex gap-1 mr-2">
                  {commit.refs.map((ref, idx) => {
                    // Get behind count for local branches
                    const behindCount =
                      ref.refType === 'LocalBranch'
                        ? branches.find((b) => b.name === ref.name && b.branchType === 'Local')
                            ?.behind
                        : null;

                    return (
                      <span
                        key={idx}
                        className={cn(
                          'inline-flex items-center gap-0.5 text-[11px] py-0.5 px-1.5 rounded font-medium [&>svg]:shrink-0',
                          ref.refType === 'LocalBranch' && 'bg-[#107c10] text-white',
                          ref.refType === 'RemoteBranch' && 'bg-[#5c2d91] text-white',
                          ref.refType === 'Tag' && 'bg-[#d83b01] text-white',
                          ref.isHead && 'font-bold'
                        )}
                      >
                        {ref.refType === 'Tag' ? <Tag size={10} /> : <GitBranch size={10} />}
                        {ref.name}
                        {behindCount != null && behindCount > 0 && (
                          <span className="ml-1 pl-1 border-l border-white/30">
                            {behindCount} behind
                          </span>
                        )}
                      </span>
                    );
                  })}
                </span>
              )}
              <span className="text-[13px]">{commit.summary}</span>
            </>
          );
        },
      }),
      columnHelper.accessor((row) => row.commit.timestamp, {
        id: 'date',
        header: 'Date',
        size: 120,
        minSize: 80,
        maxSize: 200,
        cell: ({ row }) => (
          <span className="text-xs text-(--text-secondary)">
            {formatDistanceToNow(new Date(row.original.commit.timestamp), {
              addSuffix: true,
            })}
          </span>
        ),
      }),
      columnHelper.accessor((row) => row.commit.author.name, {
        id: 'author',
        header: 'Author',
        size: 148,
        minSize: 80,
        maxSize: 300,
        cell: ({ row }) => (
          <span className="text-xs text-(--text-secondary)">{row.original.commit.author.name}</span>
        ),
      }),
      columnHelper.accessor((row) => row.commit.shortOid, {
        id: 'sha',
        header: 'SHA',
        size: 72,
        minSize: 60,
        maxSize: 120,
        cell: ({ row }) => (
          <code className="font-mono text-[11px] text-(--text-secondary) bg-(--bg-code) py-0.5 px-1.5 rounded">
            {row.original.commit.shortOid}
          </code>
        ),
      }),
    ],
    [minGraphWidth]
  );

  const columnResizeMode: ColumnResizeMode = 'onChange';

  const table = useReactTable({
    data: tableData,
    columns,
    columnResizeMode,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      minSize: 50,
      maxSize: 500,
    },
  });

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
      {/* Table Header */}
      <div className="bg-(--bg-header) border-b border-(--border-color) shrink-0">
        {table.getHeaderGroups().map((headerGroup) => (
          <div key={headerGroup.id} className="flex items-center h-8 px-3">
            {headerGroup.headers.map((header) => (
              <div
                key={header.id}
                className={cn(
                  'relative overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold uppercase text-(--text-secondary) shrink-0',
                  header.id === 'date' && 'text-right pr-4'
                )}
                style={{ width: header.getSize() }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
                {/* Resize handle */}
                {header.column.getCanResize() && (
                  <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className="col-divider absolute -right-1 top-0 h-full"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Table Body */}
      <div className="flex-1 min-h-0 overflow-y-auto" ref={listRef} onScroll={handleScroll}>
        {/* Uncommitted changes row */}
        {hasUncommittedChanges && (
          <div
            className="flex items-center h-7 px-3 transition-colors cursor-pointer hover:bg-(--bg-hover) bg-(--bg-uncommitted)"
            onClick={() => setCurrentView('file-status')}
          >
            {table.getAllColumns().map((column) => {
              const size = column.getSize();
              return (
                <div
                  key={column.id}
                  className={cn(
                    'overflow-hidden text-ellipsis whitespace-nowrap shrink-0',
                    column.id === 'date' && 'text-right pr-4'
                  )}
                  style={{ width: size }}
                >
                  {column.id === 'graph' && (
                    <svg width={size} height={ROW_HEIGHT} className="graph-svg">
                      <circle
                        cx={LANE_WIDTH / 2}
                        cy={ROW_HEIGHT / 2}
                        r={NODE_RADIUS + 1}
                        fill="var(--bg-secondary)"
                        stroke={LANE_COLORS[0]}
                        strokeWidth={2}
                      />
                      <line
                        x1={LANE_WIDTH / 2}
                        y1={ROW_HEIGHT / 2 + NODE_RADIUS + 1}
                        x2={LANE_WIDTH / 2}
                        y2={ROW_HEIGHT}
                        stroke={LANE_COLORS[0]}
                        strokeWidth={2}
                      />
                    </svg>
                  )}
                  {column.id === 'description' && (
                    <>
                      <span className="text-[13px] font-medium text-(--text-uncommitted)">
                        Uncommitted changes
                      </span>
                      <span className="ml-2 text-xs text-(--text-secondary)">
                        ({uncommittedChangeCount} {uncommittedChangeCount === 1 ? 'file' : 'files'})
                      </span>
                    </>
                  )}
                  {column.id === 'date' && (
                    <span className="text-xs text-(--text-secondary)">–</span>
                  )}
                  {column.id === 'author' && (
                    <span className="text-xs text-(--text-secondary)">–</span>
                  )}
                  {column.id === 'sha' && (
                    <code className="font-mono text-[11px] text-(--text-secondary)">*</code>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* Commit rows */}
        {table.getRowModel().rows.map((row) => {
          const commit = row.original.commit;
          return (
            <CommitContextMenu key={commit.oid} commit={commit}>
              <div
                data-commit-oid={commit.oid}
                className={cn(
                  'flex items-center h-7 px-3 transition-colors cursor-pointer hover:bg-(--bg-hover)',
                  selectedCommitOid === commit.oid && 'bg-(--bg-active) hover:bg-(--bg-active)'
                )}
                onClick={() => handleRowClick(commit)}
              >
                {row.getVisibleCells().map((cell) => {
                  return (
                    <div
                      key={cell.id}
                      className={cn(
                        'overflow-hidden text-ellipsis whitespace-nowrap shrink-0',
                        cell.column.id === 'date' && 'text-right pr-4'
                      )}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  );
                })}
              </div>
            </CommitContextMenu>
          );
        })}
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
