// Extracted from vscode-git-graph main.ts renderTable()
import { memo, useRef, useCallback, useLayoutEffect, useMemo, forwardRef } from 'react';
import { GitBranch, Tag } from 'lucide-react';
import type { GraphCommit } from '@/types';
import { RefType } from '@/types';
import { Avatar } from '@/components/ui';
import { formatShortDate } from '@/lib/dateUtils';
import { CommitContextMenu } from './CommitContextMenu';

const UNCOMMITTED = 'uncommitted';
const COLUMN_MIN_WIDTH = 40;
const COLUMN_LEFT_RIGHT_PADDING = 24;
const COLUMN_AUTO = -101;

function abbrevCommit(hash: string): string {
  return hash.substring(0, 7);
}

interface BranchLabel {
  name: string;
  remotes: string[];
  isHead: boolean;
}

interface RemoteLabel {
  name: string;
  remote: string | null;
}

function getBranchLabels(commit: GraphCommit): { heads: BranchLabel[]; remotes: RemoteLabel[] } {
  const heads =
    commit.refs
      ?.filter((r) => r.refType === RefType.LocalBranch)
      .map((r) => ({ name: r.name, remotes: [], isHead: r.isHead ?? false })) ?? [];
  const remotes =
    commit.refs
      ?.filter((r) => r.refType === RefType.RemoteBranch)
      .map((r) => ({ name: r.name, remote: null })) ?? [];
  return { heads, remotes };
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

interface CommitRowProps {
  commit: GraphCommit;
  index: number;
  vertexColour: number;
  widthAtVertex: number;
  isMuted: boolean;
  isCurrent: boolean;
  isSelected: boolean;
  commitHead: string | null;
  onClick: (e: React.MouseEvent, index: number, commit: GraphCommit) => void;
}

const CommitRow = memo(
  forwardRef<
    HTMLTableRowElement,
    CommitRowProps & Omit<React.HTMLAttributes<HTMLTableRowElement>, 'onClick'>
  >(function CommitRow(
    {
      commit,
      index,
      vertexColour,
      widthAtVertex,
      isMuted,
      isCurrent,
      isSelected,
      commitHead,
      onClick,
      ...rest
    },
    ref
  ) {
    const isUncommitted = commit.oid === UNCOMMITTED;
    const color = `var(--git-graph-color${vertexColour % 8})`;

    // Memoize expensive computations
    const date = useMemo(() => formatShortDate(commit.timestamp), [commit.timestamp]);
    const branchLabels = useMemo(() => getBranchLabels(commit), [commit]);
    const tags = useMemo(
      () => commit.refs?.filter((r) => r.refType === RefType.Tag) ?? [],
      [commit.refs]
    );

    // Find if any branch is checked out at this commit
    const branchCheckedOutAtCommit = useMemo(
      () => branchLabels.heads.find((h) => h.isHead)?.name ?? null,
      [branchLabels.heads]
    );

    // Build class name
    const rowClassName = useMemo(
      () =>
        ['commit', isCurrent ? 'current' : '', isSelected ? 'selected' : '', isMuted ? 'mute' : '']
          .filter(Boolean)
          .join(' '),
      [isCurrent, isSelected, isMuted]
    );

    // Commit dot for HEAD
    const showCommitDot = commit.oid === commitHead;
    const commitDotTitle = branchCheckedOutAtCommit
      ? `The branch "${branchCheckedOutAtCommit}" is currently checked out at this commit.`
      : 'This commit is currently checked out.';

    // Display values
    const authorDisplay = isUncommitted ? '*' : commit.author.name;
    const authorTitle = isUncommitted
      ? 'Uncommitted changes'
      : `${commit.author.name} <${commit.author.email}>`;
    const commitDisplay = isUncommitted ? '*' : abbrevCommit(commit.oid);
    const commitTitle = isUncommitted ? 'Uncommitted changes' : commit.oid;

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        onClick(e, index, commit);
      },
      [onClick, index, commit]
    );

    // Sort refs: active branch first
    const sortedHeads = useMemo(() => {
      return [...branchLabels.heads].sort((a, b) => {
        if (a.isHead) return -1;
        if (b.isHead) return 1;
        return 0;
      });
    }, [branchLabels]);

    return (
      <tr
        {...rest}
        ref={ref}
        className={rowClassName}
        id={isUncommitted ? 'uncommittedChanges' : undefined}
        data-id={index}
        data-oid={commit.oid}
        data-color={vertexColour}
        onClick={handleClick}
      >
        <td style={{ minWidth: widthAtVertex }} />
        <td>
          <span className="description">
            {showCommitDot && <span className="commitHeadDot" title={commitDotTitle} />}
            {sortedHeads.map((head) => (
              <GitRef
                key={head.name}
                name={head.name}
                type="head"
                color={color}
                isActive={head.isHead}
                remotes={head.remotes}
              />
            ))}
            {branchLabels.remotes.map((remote) => (
              <GitRef key={remote.name} name={remote.name} type="remote" color={color} />
            ))}
            {tags.map((tag) => (
              <GitRef key={tag.name} name={tag.name} type="tag" color="var(--color-tag)" />
            ))}
            <span className="text">{commit.summary}</span>
          </span>
        </td>
        <td className="dateCol text" title={date.title}>
          {date.formatted}
        </td>
        <td className="authorCol text" title={authorTitle}>
          <span className="authorCell">
            {!isUncommitted && (
              <Avatar
                email={commit.author.email}
                sha={commit.oid}
                name={commit.author.name}
                size={16}
              />
            )}
            {authorDisplay}
          </span>
        </td>
        <td className="text" title={commitTitle}>
          {commitDisplay}
        </td>
      </tr>
    );
  })
);

interface CommitTableProps {
  commits: GraphCommit[];
  vertexColours: number[];
  widthsAtVertices: number[];
  mutedCommits: boolean[];
  commitHead: string | null;
  selectedCommitOid: string | null;
  onCommitClick: (index: number, commit: GraphCommit) => void;
  onGraphWidthChange?: (width: number) => void;
  tableHeaderRef?: React.RefObject<HTMLTableRowElement | null>;
}

export const CommitTable = memo(function CommitTable({
  commits,
  vertexColours,
  widthsAtVertices,
  mutedCommits,
  commitHead,
  selectedCommitOid,
  onCommitClick,
  onGraphWidthChange,
  tableHeaderRef,
}: CommitTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const columnWidthsRef = useRef<number[]>([
    COLUMN_AUTO,
    COLUMN_AUTO,
    COLUMN_AUTO,
    COLUMN_AUTO,
    COLUMN_AUTO,
  ]);
  const resizeStateRef = useRef<{
    col: number;
    colIndex: number;
    mouseX: number;
    overlay: HTMLElement | null;
  }>({ col: -1, colIndex: -1, mouseX: -1, overlay: null });

  const getColHeaders = useCallback(() => {
    if (!tableRef.current) return [];
    return Array.from(tableRef.current.querySelectorAll('.tableColHeader')) as HTMLElement[];
  }, []);

  const makeTableFixedLayout = useCallback(() => {
    const cols = getColHeaders();
    if (!tableRef.current || cols.length === 0) return;

    const columnWidths = columnWidthsRef.current;
    cols[0].style.width = columnWidths[0] + 'px';
    cols[0].style.padding = '';
    for (let i = 2; i < cols.length; i++) {
      const colNum = parseInt(cols[i].dataset.col ?? '0');
      cols[i].style.width = columnWidths[colNum] + 'px';
    }
    tableRef.current.className = 'fixedLayout';
  }, [getColHeaders]);

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      const state = resizeStateRef.current;
      const columnWidths = columnWidthsRef.current;
      const cols = getColHeaders();

      if (state.col > -1 && cols.length > 0) {
        let mouseDeltaX = e.clientX - state.mouseX;

        if (state.col === 0) {
          if (columnWidths[0] + mouseDeltaX < COLUMN_MIN_WIDTH) {
            mouseDeltaX = -columnWidths[0] + COLUMN_MIN_WIDTH;
          }
          if (cols[1].clientWidth - COLUMN_LEFT_RIGHT_PADDING - mouseDeltaX < COLUMN_MIN_WIDTH) {
            mouseDeltaX = cols[1].clientWidth - COLUMN_LEFT_RIGHT_PADDING - COLUMN_MIN_WIDTH;
          }
          columnWidths[0] += mouseDeltaX;
          cols[0].style.width = columnWidths[0] + 'px';

          // Notify parent about graph width change
          onGraphWidthChange?.(columnWidths[0]);
        } else {
          const colWidth =
            state.col !== 1
              ? columnWidths[state.col]
              : cols[1].clientWidth - COLUMN_LEFT_RIGHT_PADDING;
          let nextCol = state.col + 1;
          while (nextCol < columnWidths.length && columnWidths[nextCol] < 0) nextCol++;

          if (colWidth + mouseDeltaX < COLUMN_MIN_WIDTH) {
            mouseDeltaX = -colWidth + COLUMN_MIN_WIDTH;
          }
          if (columnWidths[nextCol] - mouseDeltaX < COLUMN_MIN_WIDTH) {
            mouseDeltaX = columnWidths[nextCol] - COLUMN_MIN_WIDTH;
          }
          if (state.col !== 1) {
            columnWidths[state.col] += mouseDeltaX;
            cols[state.colIndex].style.width = columnWidths[state.col] + 'px';
          }
          columnWidths[nextCol] -= mouseDeltaX;
          cols[state.colIndex + 1].style.width = columnWidths[nextCol] + 'px';
        }
        state.mouseX = e.clientX;
      }
    },
    [getColHeaders, onGraphWidthChange]
  );

  const handleResizeEnd = useCallback(() => {
    const state = resizeStateRef.current;
    if (state.col > -1) {
      state.col = -1;
      state.colIndex = -1;
      state.mouseX = -1;
      if (state.overlay) {
        state.overlay.remove();
        state.overlay = null;
      }
    }
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('resizeCol')) return;

      const col = parseInt(target.dataset.col ?? '-1');
      if (col < 0) return;

      const cols = getColHeaders();
      const columnWidths = columnWidthsRef.current;
      const state = resizeStateRef.current;

      state.col = col;
      state.mouseX = e.clientX;

      const isAuto = columnWidths[0] === COLUMN_AUTO;
      for (let j = 0; j < cols.length; j++) {
        const curCol = parseInt(cols[j].dataset.col ?? '0');
        if (isAuto && curCol !== 1) {
          columnWidths[curCol] = cols[j].clientWidth - COLUMN_LEFT_RIGHT_PADDING;
        }
        if (curCol === col) {
          state.colIndex = j;
        }
      }
      if (isAuto) makeTableFixedLayout();

      // Create overlay for capturing mouse events
      const overlay = document.createElement('div');
      overlay.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;cursor:col-resize;';
      overlay.addEventListener('mousemove', handleResizeMove);
      overlay.addEventListener('mouseup', handleResizeEnd);
      overlay.addEventListener('mouseleave', handleResizeEnd);
      document.body.appendChild(overlay);
      state.overlay = overlay;
    },
    [getColHeaders, makeTableFixedLayout, handleResizeMove, handleResizeEnd]
  );

  // Set auto layout on mount
  useLayoutEffect(() => {
    if (tableRef.current && commits.length > 0) {
      tableRef.current.className = 'autoLayout';
    }
  }, [commits.length]);

  // Cleanup on unmount
  useLayoutEffect(() => {
    const state = resizeStateRef.current;
    return () => {
      if (state.overlay) {
        state.overlay.remove();
        state.overlay = null;
      }
    };
  }, []);

  const currentHash =
    commits.length > 0 && commits[0].oid === UNCOMMITTED ? UNCOMMITTED : commitHead;

  const handleRowClick = useCallback(
    (e: React.MouseEvent, index: number, commit: GraphCommit) => {
      // Don't handle clicks on resize handles
      if ((e.target as HTMLElement).classList.contains('resizeCol')) return;
      onCommitClick(index, commit);
    },
    [onCommitClick]
  );

  return (
    <div id="commitTable">
      <table ref={tableRef}>
        <thead>
          <tr
            id="tableColHeaders"
            ref={tableHeaderRef as React.RefObject<HTMLTableRowElement>}
            onMouseDown={handleResizeStart}
          >
            <th id="tableHeaderGraphCol" className="tableColHeader" data-col="0">
              Graph
              <span className="resizeCol right" data-col="0" />
            </th>
            <th className="tableColHeader" data-col="1">
              <span className="resizeCol left" data-col="0" />
              Description
              <span className="resizeCol right" data-col="1" />
            </th>
            <th className="tableColHeader dateCol" data-col="2">
              <span className="resizeCol left" data-col="1" />
              Date
              <span className="resizeCol right" data-col="2" />
            </th>
            <th className="tableColHeader authorCol" data-col="3">
              <span className="resizeCol left" data-col="2" />
              Author
              <span className="resizeCol right" data-col="3" />
            </th>
            <th className="tableColHeader" data-col="4">
              <span className="resizeCol left" data-col="3" />
              Commit
            </th>
          </tr>
        </thead>
        <tbody>
          {commits.map((commit, i) => (
            <CommitContextMenu key={commit.oid} commit={commit}>
              <CommitRow
                commit={commit}
                index={i}
                vertexColour={vertexColours[i]}
                widthAtVertex={widthsAtVertices[i]}
                isMuted={mutedCommits[i]}
                isCurrent={commit.oid === currentHash}
                isSelected={commit.oid === selectedCommitOid}
                commitHead={commitHead}
                onClick={handleRowClick}
              />
            </CommitContextMenu>
          ))}
        </tbody>
      </table>
    </div>
  );
});
