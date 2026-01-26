// Refactored to use DataTable with virtualization
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { GitBranch, GitCommit, Loader2, Tag } from 'lucide-react';
import { Skeleton } from '@/components/ui';

import { useRepositoryStore } from '@/store/repositoryStore';
import type { GraphCommit } from '@/types';
import { RefType } from '@/types';
import { CommitDetailPanel } from './CommitDetailPanel';
import { CommitContextMenu } from './CommitContextMenu';
import { HistoryFilters } from './HistoryFilters';
import { GraphCell } from './GraphCell';
import {
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuPortal,
  ContextMenuContent,
} from '@/components/ui';
import { BisectBanner } from '../merge/BisectBanner';
import { MergeBanner } from '../merge/MergeBanner';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { Avatar } from '@/components/ui';
import { formatShortDate } from '@/lib/dateUtils';
import { computeGraphLayout, getMaxColumns, type RowGraphData } from '@/lib/graphLayout';

const UNCOMMITTED = 'uncommitted';

function abbrevCommit(hash: string): string {
  return hash.substring(0, 7);
}

interface GitRefProps {
  name: string;
  type: 'head' | 'remote' | 'tag';
  color: string;
  isActive?: boolean;
  remotes?: string[];
}

function GitRef({ name, type, color, isActive, remotes }: GitRefProps) {
  const Icon = type === 'tag' ? Tag : type === 'head' ? GitBranch : GitBranch;
  const className = `gitRef ${type}${isActive ? ' active' : ''}`;
  const style =
    type === 'tag' ? { backgroundColor: 'var(--color-tag)' } : { backgroundColor: color };

  return (
    <span className={className} data-name={name} style={style}>
      <Icon size={10} />
      <span className="gitRefName" data-fullref={name}>
        {name}
      </span>
      {remotes?.map((remote) => (
        <span
          key={remote}
          className="gitRefHeadRemote"
          data-remote={remote}
          data-fullref={`${remote}/${name}`}
        >
          {remote}
        </span>
      ))}
    </span>
  );
}

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

  // Use commit from list if available, otherwise fall back to fetched data
  const selectedCommit = selectedCommitOid
    ? (commits.find((c) => c.oid === selectedCommitOid) ?? selectedCommitData)
    : null;

  // Track commit for context menu
  const [contextMenuCommit, setContextMenuCommit] = useState<GraphCommit | null>(null);

  // Find HEAD commit OID from refs
  const headOid = useMemo(() => {
    for (const commit of commits) {
      const headRef = commit.refs?.find((r) => r.isHead);
      if (headRef) return commit.oid;
    }
    return null;
  }, [commits]);

  // Compute graph layout for all commits
  const graphLayout = useMemo((): RowGraphData[] => {
    if (commits.length === 0) return [];
    return computeGraphLayout(commits, headOid);
  }, [commits, headOid]);

  const maxGraphColumns = useMemo(() => getMaxColumns(graphLayout), [graphLayout]);

  // Create lookup map for graph data by commit oid
  const graphDataMap = useMemo(() => {
    const map = new Map<string, RowGraphData>();
    commits.forEach((commit, i) => {
      if (graphLayout[i]) {
        map.set(commit.oid, graphLayout[i]);
      }
    });
    return map;
  }, [commits, graphLayout]);

  // Create lookup map for local branch names to their colors
  const branchColorMap = useMemo(() => {
    const map = new Map<string, number>();
    commits.forEach((commit, i) => {
      const graphData = graphLayout[i];
      if (!graphData) return;
      commit.refs?.forEach((ref) => {
        if (ref.refType === RefType.LocalBranch && !map.has(ref.name)) {
          map.set(ref.name, graphData.color);
        }
      });
    });
    return map;
  }, [commits, graphLayout]);

  // Define columns
  const columns = useMemo(
    (): ColumnDef<GraphCommit, unknown>[] => [
      {
        id: 'graph',
        header: () => t('history.table.graph'),
        size: Math.max((maxGraphColumns + 1) * 16, 32),
        minSize: 32,
        cell: ({ row }) => {
          const data = graphDataMap.get(row.original.oid);
          if (!data) return null;
          return (
            <GraphCell
              data={data}
              rowHeight={36}
              maxColumns={maxGraphColumns}
              columnWidth={16}
              rowIndex={row.index}
            />
          );
        },
      },
      {
        id: 'summary',
        header: () => t('history.table.description'),
        meta: { autoSize: true },
        minSize: 200,
        cell: ({ row }) => {
          const commit = row.original;
          const isUncommitted = commit.oid === UNCOMMITTED;
          const graphData = graphDataMap.get(commit.oid);
          const defaultColor = graphData?.color ?? 0;

          // Helper to get color for a branch
          const getBranchColor = (refName: string, isRemote: boolean) => {
            if (isRemote) {
              // Extract branch name from remote ref (e.g., "origin/main" -> "main")
              const branchName = refName.includes('/')
                ? refName.split('/').slice(1).join('/')
                : refName;
              const trackedColor = branchColorMap.get(branchName);
              if (trackedColor !== undefined) {
                return `var(--git-graph-color${trackedColor % 8})`;
              }
            }
            return `var(--git-graph-color${defaultColor % 8})`;
          };

          // Get refs
          const localBranches = commit.refs?.filter((r) => r.refType === RefType.LocalBranch) ?? [];
          const remoteBranches =
            commit.refs?.filter((r) => r.refType === RefType.RemoteBranch) ?? [];
          const tags = commit.refs?.filter((r) => r.refType === RefType.Tag) ?? [];

          return (
            <div className="flex items-center gap-2 px-2 overflow-hidden">
              <div className="flex items-center gap-1 shrink-0 flex-wrap">
                {localBranches.map((ref) => (
                  <GitRef
                    key={ref.name}
                    name={ref.name}
                    type="head"
                    color={getBranchColor(ref.name, false)}
                    isActive={ref.isHead}
                  />
                ))}
                {remoteBranches.map((ref) => (
                  <GitRef
                    key={ref.name}
                    name={ref.name}
                    type="remote"
                    color={getBranchColor(ref.name, true)}
                  />
                ))}
                {tags.map((ref) => (
                  <GitRef key={ref.name} name={ref.name} type="tag" color="var(--color-tag)" />
                ))}
              </div>
              <span className="truncate text-(--text-primary)">
                {isUncommitted ? t('history.table.uncommittedChanges') : commit.summary}
              </span>
            </div>
          );
        },
      },
      {
        id: 'timestamp',
        header: () => t('history.table.date'),
        size: 100,
        minSize: 80,
        cell: ({ row }) => {
          const date = formatShortDate(row.original.timestamp);
          return (
            <span className="px-2 text-(--text-secondary) text-sm" title={date.title}>
              {date.formatted}
            </span>
          );
        },
      },
      {
        id: 'author',
        header: () => t('history.table.author'),
        size: 150,
        minSize: 100,
        cell: ({ row }) => {
          const commit = row.original;
          const isUncommitted = commit.oid === UNCOMMITTED;

          return (
            <div
              className="flex items-center gap-2 px-2 overflow-hidden"
              title={isUncommitted ? '' : `${commit.author.name} <${commit.author.email}>`}
            >
              {!isUncommitted && (
                <Avatar
                  email={commit.author.email}
                  sha={commit.oid}
                  name={commit.author.name}
                  size={18}
                />
              )}
              <span className="truncate text-(--text-secondary) text-sm">
                {isUncommitted ? '*' : commit.author.name}
              </span>
            </div>
          );
        },
      },
      {
        id: 'oid',
        header: () => t('history.table.commit'),
        size: 80,
        minSize: 70,
        cell: ({ row }) => {
          const oid = row.original.oid;
          const isUncommitted = oid === UNCOMMITTED;
          return (
            <span
              className="px-2 font-mono text-xs text-(--text-tertiary)"
              title={isUncommitted ? '' : oid}
            >
              {isUncommitted ? '*' : abbrevCommit(oid)}
            </span>
          );
        },
      },
    ],
    [t, graphDataMap, maxGraphColumns, branchColorMap]
  );

  const handleCommitClick = useCallback(
    (commit: GraphCommit) => {
      if (selectedCommitOid === commit.oid) {
        clearCommitSelection();
      } else {
        selectCommit(commit.oid);
      }
    },
    [selectedCommitOid, selectCommit, clearCommitSelection]
  );

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      if (isLoadingMoreCommits || !hasMoreCommits) return;

      const { scrollTop, scrollHeight, clientHeight } = target;
      const scrollThreshold = 200;

      if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
        loadMoreCommits();
      }
    },
    [isLoadingMoreCommits, hasMoreCommits, loadMoreCommits]
  );

  const handleBisectComplete = async () => {
    await loadCommits();
    await loadStatus();
  };

  const handleRowContextMenu = useCallback((commit: GraphCommit) => {
    setContextMenuCommit(commit);
  }, []);

  if (isLoadingCommits && commits.length === 0) {
    return (
      <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
        <HistoryFilters />
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header row */}
          <div className="flex items-center h-9 px-2 border-b border-(--border-color) bg-(--bg-tertiary)">
            <div className="w-25 px-2">
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex-1 px-2">
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="w-25 px-2">
              <Skeleton className="h-3 w-10" />
            </div>
            <div className="w-37.5 px-2">
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="w-20 px-2">
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
          {/* Skeleton rows */}
          <div className="flex-1 overflow-hidden">
            {[65, 45, 80, 55, 70, 40, 75, 50, 60, 85, 48, 72, 58, 68, 52].map((width, i) => (
              <div key={i} className="flex items-center h-9 px-2 border-b border-(--border-color)">
                <div className="w-25 px-2">
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex-1 px-2">
                  <Skeleton className="h-3" style={{ width: `${width}%` }} />
                </div>
                <div className="w-25 px-2">
                  <Skeleton className="h-3 w-14" />
                </div>
                <div className="w-37.5 px-2 flex items-center gap-2">
                  <Skeleton className="h-4.5 w-4.5 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="w-20 px-2">
                  <Skeleton className="h-3 w-14 font-mono" />
                </div>
              </div>
            ))}
          </div>
        </div>
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

  const commitListContent = (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
      <HistoryFilters />
      <BisectBanner onComplete={handleBisectComplete} />
      <MergeBanner onComplete={handleBisectComplete} />
      <ContextMenuRoot>
        <ContextMenuTrigger asChild>
          <div className="flex flex-col flex-1 min-h-0">
            <DataTable
              data={commits}
              columns={columns}
              selectedRowId={selectedCommitOid}
              onRowClick={handleCommitClick}
              onRowContextMenu={handleRowContextMenu}
              getRowId={(commit) => commit.oid}
              onScroll={handleScroll}
              rowHeight={36}
              emptyMessage={t('history.noCommits')}
              isLoading={isLoadingCommits}
              loadingMessage={t('history.loading')}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent className="menu-content">
            {contextMenuCommit && <CommitContextMenu commit={contextMenuCommit} />}
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenuRoot>
      {isLoadingMoreCommits && (
        <div className="flex items-center justify-center gap-2 p-3 text-(--text-secondary) text-xs border-t border-(--border-color)">
          <Loader2 size={16} className="animate-spin" />
          <span>{t('history.loadingMore')}</span>
        </div>
      )}
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
