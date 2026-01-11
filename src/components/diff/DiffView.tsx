import { useState } from 'react';
import { Columns, Rows, FileCode, Binary, Plus, Minus, X } from 'lucide-react';
import type { FileDiff, DiffHunk, DiffLine, DiffLineType } from '../../types';
import { cn } from '../../lib/utils';

export type DiffMode = 'workdir' | 'staged' | 'commit';

interface DiffViewProps {
  diff: FileDiff | null;
  isLoading?: boolean;
  mode?: DiffMode;
  onStageHunk?: (patch: string) => Promise<void>;
  onUnstageHunk?: (patch: string) => Promise<void>;
  onDiscardHunk?: (patch: string) => Promise<void>;
}

type DiffViewMode = 'unified' | 'split';

// Generate a patch string for a specific hunk
function generateHunkPatch(diff: FileDiff, hunk: DiffHunk): string {
  const oldPath = diff.old_path || diff.new_path || '';
  const newPath = diff.new_path || diff.old_path || '';

  let patch = `diff --git a/${oldPath} b/${newPath}\n`;
  patch += `--- a/${oldPath}\n`;
  patch += `+++ b/${newPath}\n`;
  patch += hunk.header;
  if (!hunk.header.endsWith('\n')) {
    patch += '\n';
  }

  for (const line of hunk.lines) {
    const prefix = getLinePrefix(line.line_type);
    patch += `${prefix}${line.content}\n`;
  }

  return patch;
}

export function DiffView({
  diff,
  isLoading,
  mode = 'commit',
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
}: DiffViewProps) {
  const [viewMode, setViewMode] = useState<DiffViewMode>('unified');
  const [loadingHunk, setLoadingHunk] = useState<number | null>(null);

  const handleStageHunk = async (hunkIndex: number) => {
    if (!diff || !onStageHunk) return;
    const hunk = diff.hunks[hunkIndex];
    const patch = generateHunkPatch(diff, hunk);
    setLoadingHunk(hunkIndex);
    try {
      await onStageHunk(patch);
    } finally {
      setLoadingHunk(null);
    }
  };

  const handleUnstageHunk = async (hunkIndex: number) => {
    if (!diff || !onUnstageHunk) return;
    const hunk = diff.hunks[hunkIndex];
    const patch = generateHunkPatch(diff, hunk);
    setLoadingHunk(hunkIndex);
    try {
      await onUnstageHunk(patch);
    } finally {
      setLoadingHunk(null);
    }
  };

  const handleDiscardHunk = async (hunkIndex: number) => {
    if (!diff || !onDiscardHunk) return;
    const hunk = diff.hunks[hunkIndex];
    const patch = generateHunkPatch(diff, hunk);
    setLoadingHunk(hunkIndex);
    try {
      await onDiscardHunk(patch);
    } finally {
      setLoadingHunk(null);
    }
  };

  const diffViewClass = 'flex flex-col h-full bg-(--bg-primary) overflow-hidden';
  const emptyStateClass =
    'flex flex-col items-center justify-center h-full gap-4 text-(--text-tertiary) text-sm';

  if (isLoading) {
    return (
      <div className={diffViewClass}>
        <div className={emptyStateClass}>Loading diff...</div>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className={diffViewClass}>
        <div className={emptyStateClass}>Select a file to view changes</div>
      </div>
    );
  }

  if (diff.binary) {
    return (
      <div className={diffViewClass}>
        <div className={cn(emptyStateClass, '[&>svg]:opacity-50')}>
          <Binary size={48} />
          <span>Binary file</span>
        </div>
      </div>
    );
  }

  return (
    <div className={diffViewClass}>
      <DiffHeader diff={diff} viewMode={viewMode} onViewModeChange={setViewMode} />
      <div className="flex-1 overflow-auto">
        {diff.hunks.length === 0 ? (
          <div className={emptyStateClass}>No changes in this file</div>
        ) : viewMode === 'unified' ? (
          <UnifiedDiff
            hunks={diff.hunks}
            mode={mode}
            loadingHunk={loadingHunk}
            onStageHunk={onStageHunk ? handleStageHunk : undefined}
            onUnstageHunk={onUnstageHunk ? handleUnstageHunk : undefined}
            onDiscardHunk={onDiscardHunk ? handleDiscardHunk : undefined}
          />
        ) : (
          <SplitDiff
            hunks={diff.hunks}
            mode={mode}
            loadingHunk={loadingHunk}
            onStageHunk={onStageHunk ? handleStageHunk : undefined}
            onUnstageHunk={onUnstageHunk ? handleUnstageHunk : undefined}
            onDiscardHunk={onDiscardHunk ? handleDiscardHunk : undefined}
          />
        )}
      </div>
    </div>
  );
}

interface DiffHeaderProps {
  diff: FileDiff;
  viewMode: DiffViewMode;
  onViewModeChange: (mode: DiffViewMode) => void;
}

function DiffHeader({ diff, viewMode, onViewModeChange }: DiffHeaderProps) {
  const fileName = diff.new_path || diff.old_path || 'Unknown file';
  const statusText = getStatusText(diff.status);
  const statusColorClass = getStatusColorClass(diff.status);

  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-(--bg-header) border-b border-(--border-color) shrink-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FileCode size={16} className="text-(--text-secondary) shrink-0" />
        <span className="text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis">
          {fileName}
        </span>
        <span
          className={cn(
            'text-[11px] py-0.5 px-1.5 rounded uppercase font-medium',
            statusColorClass
          )}
        >
          {statusText}
        </span>
      </div>
      <div className="flex gap-2">
        {diff.additions > 0 && (
          <span className="text-xs font-medium font-mono text-success">+{diff.additions}</span>
        )}
        {diff.deletions > 0 && (
          <span className="text-xs font-medium font-mono text-error">-{diff.deletions}</span>
        )}
      </div>
      <div className="flex border border-(--border-color) rounded overflow-hidden">
        <button
          className={cn(
            'flex items-center justify-center w-7 h-6 border-none bg-transparent text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary) border-r border-(--border-color) last:border-r-0',
            viewMode === 'unified' &&
              'bg-(--accent-color) text-white hover:bg-(--accent-color) hover:text-white'
          )}
          onClick={() => onViewModeChange('unified')}
          title="Unified view"
        >
          <Rows size={14} />
        </button>
        <button
          className={cn(
            'flex items-center justify-center w-7 h-6 border-none bg-transparent text-(--text-secondary) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)',
            viewMode === 'split' &&
              'bg-(--accent-color) text-white hover:bg-(--accent-color) hover:text-white'
          )}
          onClick={() => onViewModeChange('split')}
          title="Side-by-side view"
        >
          <Columns size={14} />
        </button>
      </div>
    </div>
  );
}

interface UnifiedDiffProps {
  hunks: DiffHunk[];
  mode: DiffMode;
  loadingHunk: number | null;
  onStageHunk?: (hunkIndex: number) => Promise<void>;
  onUnstageHunk?: (hunkIndex: number) => Promise<void>;
  onDiscardHunk?: (hunkIndex: number) => Promise<void>;
}

const hunkActionClass =
  'flex items-center gap-1 py-0.5 px-2 border border-(--border-color) rounded bg-(--bg-secondary) text-(--text-secondary) text-[11px] font-sans cursor-pointer transition-colors shrink-0 hover:not-disabled:bg-(--bg-hover) hover:not-disabled:border-(--accent-color) hover:not-disabled:text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed';

function UnifiedDiff({
  hunks,
  mode,
  loadingHunk,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
}: UnifiedDiffProps) {
  return (
    <div className="min-w-fit">
      {hunks.map((hunk, hunkIndex) => (
        <div key={hunkIndex} className="mb-1">
          <div className="flex items-center justify-between gap-2 py-1 px-3 bg-(--bg-toolbar) text-(--text-secondary) font-mono text-xs border-y border-(--border-color)">
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {hunk.header.trim()}
            </span>
            {mode === 'workdir' && onStageHunk && (
              <button
                className={hunkActionClass}
                onClick={() => onStageHunk(hunkIndex)}
                disabled={loadingHunk !== null}
                title="Stage hunk"
              >
                <Plus size={14} />
                <span>Stage</span>
              </button>
            )}
            {mode === 'workdir' && onDiscardHunk && (
              <button
                className={cn(
                  hunkActionClass,
                  'hover:not-disabled:border-error hover:not-disabled:text-error'
                )}
                onClick={() => onDiscardHunk(hunkIndex)}
                disabled={loadingHunk !== null}
                title="Discard hunk"
              >
                <X size={14} />
                <span>Discard</span>
              </button>
            )}
            {mode === 'staged' && onUnstageHunk && (
              <button
                className={hunkActionClass}
                onClick={() => onUnstageHunk(hunkIndex)}
                disabled={loadingHunk !== null}
                title="Unstage hunk"
              >
                <Minus size={14} />
                <span>Unstage</span>
              </button>
            )}
          </div>
          <div className="flex flex-col">
            {hunk.lines.map((line, lineIndex) => (
              <UnifiedDiffLine key={lineIndex} line={line} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface UnifiedDiffLineProps {
  line: DiffLine;
}

const lineNoClass =
  'shrink-0 w-10 py-0 px-2 text-right text-(--text-tertiary) bg-(--bg-secondary) border-r border-(--border-color) select-none';

function UnifiedDiffLine({ line }: UnifiedDiffLineProps) {
  const { bgClass, lineNoBgClass, prefixColorClass } = getLineClasses(line.line_type);
  const prefix = getLinePrefix(line.line_type);

  return (
    <div className={cn('flex leading-5 font-mono text-xs', bgClass)}>
      <span className={cn(lineNoClass, lineNoBgClass)}>{line.old_line_no ?? ''}</span>
      <span className={cn(lineNoClass, lineNoBgClass)}>{line.new_line_no ?? ''}</span>
      <span className={cn('shrink-0 w-4 py-0 px-1 text-center select-none', prefixColorClass)}>
        {prefix}
      </span>
      <span className="flex-1 py-0 px-2 whitespace-pre overflow-x-auto">
        <code className="font-inherit">{line.content}</code>
      </span>
    </div>
  );
}

interface SplitDiffProps {
  hunks: DiffHunk[];
  mode: DiffMode;
  loadingHunk: number | null;
  onStageHunk?: (hunkIndex: number) => Promise<void>;
  onUnstageHunk?: (hunkIndex: number) => Promise<void>;
  onDiscardHunk?: (hunkIndex: number) => Promise<void>;
}

function SplitDiff({
  hunks,
  mode,
  loadingHunk,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
}: SplitDiffProps) {
  return (
    <div>
      {hunks.map((hunk, hunkIndex) => (
        <div key={hunkIndex} className="mb-1">
          <div className="flex items-center justify-center gap-2 py-1 px-3 bg-(--bg-toolbar) text-(--text-secondary) font-mono text-xs border-y border-(--border-color)">
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {hunk.header.trim()}
            </span>
            {mode === 'workdir' && onStageHunk && (
              <button
                className={hunkActionClass}
                onClick={() => onStageHunk(hunkIndex)}
                disabled={loadingHunk !== null}
                title="Stage hunk"
              >
                <Plus size={14} />
                <span>Stage</span>
              </button>
            )}
            {mode === 'workdir' && onDiscardHunk && (
              <button
                className={cn(
                  hunkActionClass,
                  'hover:not-disabled:border-error hover:not-disabled:text-error'
                )}
                onClick={() => onDiscardHunk(hunkIndex)}
                disabled={loadingHunk !== null}
                title="Discard hunk"
              >
                <X size={14} />
                <span>Discard</span>
              </button>
            )}
            {mode === 'staged' && onUnstageHunk && (
              <button
                className={hunkActionClass}
                onClick={() => onUnstageHunk(hunkIndex)}
                disabled={loadingHunk !== null}
                title="Unstage hunk"
              >
                <Minus size={14} />
                <span>Unstage</span>
              </button>
            )}
          </div>
          <div className="flex flex-col">
            <SplitHunkLines lines={hunk.lines} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SplitHunkLinesProps {
  lines: DiffLine[];
}

function SplitHunkLines({ lines }: SplitHunkLinesProps) {
  const pairs = pairLinesForSplit(lines);

  return (
    <>
      {pairs.map((pair, index) => {
        const leftClasses = getLineClasses(pair.left?.line_type || 'context');
        const rightClasses = getLineClasses(pair.right?.line_type || 'context');
        return (
          <div key={index} className="flex">
            <div
              className={cn(
                'flex-1 flex leading-5 font-mono text-xs border-r-2 border-(--border-color)',
                leftClasses.bgClass
              )}
            >
              <span
                className={cn(
                  'w-10 py-0 px-2 text-right text-(--text-tertiary) bg-(--bg-secondary) border-r border-(--border-color) select-none',
                  leftClasses.lineNoBgClass
                )}
              >
                {pair.left?.old_line_no ?? ''}
              </span>
              <span className="flex-1 py-0 px-2 whitespace-pre overflow-hidden text-ellipsis">
                <code>{pair.left?.content ?? ''}</code>
              </span>
            </div>
            <div className={cn('flex-1 flex leading-5 font-mono text-xs', rightClasses.bgClass)}>
              <span
                className={cn(
                  'w-10 py-0 px-2 text-right text-(--text-tertiary) bg-(--bg-secondary) border-r border-(--border-color) select-none',
                  rightClasses.lineNoBgClass
                )}
              >
                {pair.right?.new_line_no ?? ''}
              </span>
              <span className="flex-1 py-0 px-2 whitespace-pre overflow-hidden text-ellipsis">
                <code>{pair.right?.content ?? ''}</code>
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

interface LinePair {
  left: DiffLine | null;
  right: DiffLine | null;
}

function pairLinesForSplit(lines: DiffLine[]): LinePair[] {
  const pairs: LinePair[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.line_type === 'context') {
      pairs.push({ left: line, right: line });
      i++;
    } else if (line.line_type === 'deletion') {
      // Collect consecutive deletions
      const deletions: DiffLine[] = [];
      while (i < lines.length && lines[i].line_type === 'deletion') {
        deletions.push(lines[i]);
        i++;
      }

      // Collect consecutive additions
      const additions: DiffLine[] = [];
      while (i < lines.length && lines[i].line_type === 'addition') {
        additions.push(lines[i]);
        i++;
      }

      // Pair them up
      const maxLen = Math.max(deletions.length, additions.length);
      for (let j = 0; j < maxLen; j++) {
        pairs.push({
          left: deletions[j] || null,
          right: additions[j] || null,
        });
      }
    } else if (line.line_type === 'addition') {
      pairs.push({ left: null, right: line });
      i++;
    } else {
      i++;
    }
  }

  return pairs;
}

function getLineClasses(lineType: DiffLineType): {
  bgClass: string;
  lineNoBgClass: string;
  prefixColorClass: string;
} {
  switch (lineType) {
    case 'addition':
      return {
        bgClass: 'bg-success/15',
        lineNoBgClass: 'bg-success/20',
        prefixColorClass: 'text-success',
      };
    case 'deletion':
      return {
        bgClass: 'bg-error/15',
        lineNoBgClass: 'bg-error/20',
        prefixColorClass: 'text-error',
      };
    default:
      return {
        bgClass: 'bg-transparent',
        lineNoBgClass: '',
        prefixColorClass: '',
      };
  }
}

function getLinePrefix(lineType: DiffLineType): string {
  switch (lineType) {
    case 'addition':
      return '+';
    case 'deletion':
      return '-';
    default:
      return ' ';
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'added':
      return 'Added';
    case 'deleted':
      return 'Deleted';
    case 'modified':
      return 'Modified';
    case 'renamed':
      return 'Renamed';
    case 'copied':
      return 'Copied';
    case 'type_changed':
      return 'Type Changed';
    case 'untracked':
      return 'Untracked';
    case 'conflicted':
      return 'Conflicted';
    default:
      return status;
  }
}

function getStatusColorClass(status: string): string {
  switch (status) {
    case 'added':
    case 'untracked':
      return 'bg-success/20 text-success';
    case 'deleted':
    case 'conflicted':
      return 'bg-error/20 text-error';
    case 'modified':
      return 'bg-warning/20 text-warning';
    case 'renamed':
    case 'copied':
      return 'bg-(--accent-color)/20 text-(--accent-color)';
    default:
      return '';
  }
}
