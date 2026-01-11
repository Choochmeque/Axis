import { X, Archive, FileCode, Binary } from 'lucide-react';
import type { StashEntry, FileDiff, DiffHunk, DiffLine, DiffLineType } from '../../types';
import { cn } from '../../lib/utils';

interface StashDiffViewProps {
  stash: StashEntry;
  files: FileDiff[];
  isLoading: boolean;
  onClose: () => void;
}

export function StashDiffView({ stash, files, isLoading, onClose }: StashDiffViewProps) {
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return (
    <div className="flex flex-col h-full bg-(--bg-primary) overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 py-2 px-3 bg-(--bg-header) border-b border-(--border-color) shrink-0">
        <Archive size={16} className="text-(--text-secondary) shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis block">
            {stash.message || `stash@{${stash.index}}`}
          </span>
          <span className="text-[11px] text-(--text-tertiary)">
            {stash.branch && `on ${stash.branch} · `}
            {stash.author}
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          {totalAdditions > 0 && (
            <span className="text-xs font-medium font-mono text-success">+{totalAdditions}</span>
          )}
          {totalDeletions > 0 && (
            <span className="text-xs font-medium font-mono text-error">-{totalDeletions}</span>
          )}
          <span className="text-xs text-(--text-secondary)">
            {files.length} {files.length === 1 ? 'file' : 'files'}
          </span>
        </div>
        <button
          className="flex items-center justify-center w-6 h-6 border-none bg-transparent text-(--text-secondary) cursor-pointer rounded transition-colors shrink-0 hover:bg-(--bg-hover) hover:text-(--text-primary)"
          onClick={onClose}
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-full text-(--text-tertiary) text-sm">
          Loading stash diff...
        </div>
      ) : files.length === 0 ? (
        <div className="flex items-center justify-center h-full text-(--text-tertiary) text-sm">
          No changes in this stash
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {files.map((file, fileIndex) => (
            <FileDiffSection key={fileIndex} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileDiffSectionProps {
  file: FileDiff;
}

function FileDiffSection({ file }: FileDiffSectionProps) {
  const fileName = file.new_path || file.old_path || 'Unknown file';
  const statusText = getStatusText(file.status);
  const statusColorClass = getStatusColorClass(file.status);

  if (file.binary) {
    return (
      <div className="border-b border-(--border-color)">
        <div className="flex items-center gap-2 py-2 px-3 bg-(--bg-header) border-b border-(--border-color)">
          <FileCode size={14} className="text-(--text-secondary) shrink-0" />
          <span className="text-[13px] font-medium flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
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
        <div className="flex items-center justify-center gap-2 py-6 text-(--text-tertiary) text-sm">
          <Binary size={16} />
          <span>Binary file</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-(--border-color)">
      {/* File header */}
      <div className="flex items-center gap-2 py-2 px-3 bg-(--bg-header) border-b border-(--border-color)">
        <FileCode size={14} className="text-(--text-secondary) shrink-0" />
        <span className="text-[13px] font-medium flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
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
        <div className="flex gap-2">
          {file.additions > 0 && (
            <span className="text-xs font-medium font-mono text-success">+{file.additions}</span>
          )}
          {file.deletions > 0 && (
            <span className="text-xs font-medium font-mono text-error">-{file.deletions}</span>
          )}
        </div>
      </div>

      {/* Hunks */}
      {file.hunks.length === 0 ? (
        <div className="py-4 text-center text-(--text-tertiary) text-sm">
          No changes in this file
        </div>
      ) : (
        <div className="min-w-fit">
          {file.hunks.map((hunk, hunkIndex) => (
            <HunkSection key={hunkIndex} hunk={hunk} />
          ))}
        </div>
      )}
    </div>
  );
}

interface HunkSectionProps {
  hunk: DiffHunk;
}

function HunkSection({ hunk }: HunkSectionProps) {
  return (
    <div>
      <div className="py-1.5 px-3 bg-(--diff-hunk-bg) text-(--text-secondary) font-mono text-xs border-b border-(--border-color)">
        {hunk.header.trim()}
      </div>
      <div className="flex flex-col">
        {hunk.lines.map((line, lineIndex) => (
          <DiffLineRow key={lineIndex} line={line} />
        ))}
      </div>
    </div>
  );
}

interface DiffLineRowProps {
  line: DiffLine;
}

const lineNoClass =
  'shrink-0 w-12 py-0 px-2 text-right text-(--text-tertiary) border-r border-(--border-color) select-none tabular-nums';

function DiffLineRow({ line }: DiffLineRowProps) {
  const { bgClass, lineNoBgClass, prefixColorClass } = getLineClasses(line.line_type);
  const prefix = getLinePrefix(line.line_type);

  return (
    <div className={cn('flex leading-5.5 font-mono text-xs', bgClass)}>
      <span className={cn(lineNoClass, lineNoBgClass)}>{line.old_line_no ?? ''}</span>
      <span className={cn(lineNoClass, lineNoBgClass)}>{line.new_line_no ?? ''}</span>
      <span className={cn('shrink-0 w-5 py-0 px-1 text-center select-none', prefixColorClass)}>
        {prefix}
      </span>
      <span className="flex-1 py-0 px-3 whitespace-pre">
        <code className="font-inherit">{line.content}</code>
      </span>
    </div>
  );
}

function getLineClasses(lineType: DiffLineType): {
  bgClass: string;
  lineNoBgClass: string;
  prefixColorClass: string;
} {
  switch (lineType) {
    case 'addition':
      return {
        bgClass: 'bg-(--diff-add-bg)',
        lineNoBgClass: 'bg-(--diff-add-bg)',
        prefixColorClass: 'text-(--diff-add-line)',
      };
    case 'deletion':
      return {
        bgClass: 'bg-(--diff-delete-bg)',
        lineNoBgClass: 'bg-(--diff-delete-bg)',
        prefixColorClass: 'text-(--diff-delete-line)',
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
