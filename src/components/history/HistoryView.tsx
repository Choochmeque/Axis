// Refactored to use DataTable with virtualization
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { GitBranch, GitCommit, Loader2, Tag } from 'lucide-react';

import { useRepositoryStore } from '@/store/repositoryStore';
import type { GraphCommit } from '@/types';
import { RefType } from '@/types';
import { CommitDetailPanel } from './CommitDetailPanel';
import { CommitContextMenu } from './CommitContextMenu';
import { HistoryFilters } from './HistoryFilters';
import {
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuPortal,
  ContextMenuContent,
} from '@/components/ui';
import { BisectBanner } from '../merge/BisectBanner';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { Avatar } from '@/components/ui';
import { formatShortDate } from '@/lib/dateUtils';

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

  // Define columns
  const columns = useMemo(
    (): ColumnDef<GraphCommit, unknown>[] => [
      {
        id: 'graph',
        header: () => t('history.table.graph'),
        size: 100,
        minSize: 40,
        cell: () => null, // Graph visualization placeholder
      },
      {
        id: 'summary',
        header: () => t('history.table.description'),
        meta: { autoSize: true },
        minSize: 200,
        cell: ({ row }) => {
          const commit = row.original;
          const isUncommitted = commit.oid === UNCOMMITTED;

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
                    color="var(--git-graph-color0)"
                    isActive={ref.isHead}
                  />
                ))}
                {remoteBranches.map((ref) => (
                  <GitRef
                    key={ref.name}
                    name={ref.name}
                    type="remote"
                    color="var(--git-graph-color0)"
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
    [t]
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
      <div className="historyEmptyState">
        <Loader2 size={48} strokeWidth={1} className="animate-spin" />
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

  const commitListContent = (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
      <HistoryFilters />
      <BisectBanner onComplete={handleBisectComplete} />
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
