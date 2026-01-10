import { useState } from 'react';
import { Columns, Rows, FileCode, Binary, Plus, Minus, X } from 'lucide-react';
import type { FileDiff, DiffHunk, DiffLine, DiffLineType } from '../../types';
import './DiffView.css';

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

export function DiffView({ diff, isLoading, mode = 'commit', onStageHunk, onUnstageHunk, onDiscardHunk }: DiffViewProps) {
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

  if (isLoading) {
    return (
      <div className="diff-view">
        <div className="diff-loading">Loading diff...</div>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="diff-view">
        <div className="diff-empty">Select a file to view changes</div>
      </div>
    );
  }

  if (diff.binary) {
    return (
      <div className="diff-view">
        <div className="diff-binary">
          <Binary size={48} />
          <span>Binary file</span>
        </div>
      </div>
    );
  }

  return (
    <div className="diff-view">
      <DiffHeader
        diff={diff}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <div className="diff-content">
        {diff.hunks.length === 0 ? (
          <div className="diff-no-changes">No changes in this file</div>
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

  return (
    <div className="diff-header">
      <div className="diff-file-info">
        <FileCode size={16} className="diff-file-icon" />
        <span className="diff-file-name">{fileName}</span>
        <span className={`diff-status diff-status-${diff.status}`}>
          {statusText}
        </span>
      </div>
      <div className="diff-stats">
        {diff.additions > 0 && (
          <span className="diff-stat additions">+{diff.additions}</span>
        )}
        {diff.deletions > 0 && (
          <span className="diff-stat deletions">-{diff.deletions}</span>
        )}
      </div>
      <div className="diff-view-toggle">
        <button
          className={`diff-view-btn ${viewMode === 'unified' ? 'active' : ''}`}
          onClick={() => onViewModeChange('unified')}
          title="Unified view"
        >
          <Rows size={14} />
        </button>
        <button
          className={`diff-view-btn ${viewMode === 'split' ? 'active' : ''}`}
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

function UnifiedDiff({ hunks, mode, loadingHunk, onStageHunk, onUnstageHunk, onDiscardHunk }: UnifiedDiffProps) {
  return (
    <div className="diff-unified">
      {hunks.map((hunk, hunkIndex) => (
        <div key={hunkIndex} className="diff-hunk">
          <div className="diff-hunk-header">
            <span className="diff-hunk-header-text">{hunk.header.trim()}</span>
            {mode === 'workdir' && onStageHunk && (
              <button
                className="diff-hunk-action"
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
                className="diff-hunk-action diff-hunk-action-discard"
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
                className="diff-hunk-action"
                onClick={() => onUnstageHunk(hunkIndex)}
                disabled={loadingHunk !== null}
                title="Unstage hunk"
              >
                <Minus size={14} />
                <span>Unstage</span>
              </button>
            )}
          </div>
          <div className="diff-hunk-lines">
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

function UnifiedDiffLine({ line }: UnifiedDiffLineProps) {
  const lineClass = getLineClass(line.line_type);
  const prefix = getLinePrefix(line.line_type);

  return (
    <div className={`diff-line ${lineClass}`}>
      <span className="diff-line-no diff-line-no-old">
        {line.old_line_no ?? ''}
      </span>
      <span className="diff-line-no diff-line-no-new">
        {line.new_line_no ?? ''}
      </span>
      <span className="diff-line-prefix">{prefix}</span>
      <span className="diff-line-content">
        <code>{line.content}</code>
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

function SplitDiff({ hunks, mode, loadingHunk, onStageHunk, onUnstageHunk, onDiscardHunk }: SplitDiffProps) {
  return (
    <div className="diff-split">
      {hunks.map((hunk, hunkIndex) => (
        <div key={hunkIndex} className="diff-hunk">
          <div className="diff-hunk-header diff-split-header">
            <span className="diff-hunk-header-text">{hunk.header.trim()}</span>
            {mode === 'workdir' && onStageHunk && (
              <button
                className="diff-hunk-action"
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
                className="diff-hunk-action diff-hunk-action-discard"
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
                className="diff-hunk-action"
                onClick={() => onUnstageHunk(hunkIndex)}
                disabled={loadingHunk !== null}
                title="Unstage hunk"
              >
                <Minus size={14} />
                <span>Unstage</span>
              </button>
            )}
          </div>
          <div className="diff-hunk-lines diff-split-lines">
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
      {pairs.map((pair, index) => (
        <div key={index} className="diff-split-row">
          <div className={`diff-split-side left ${getLineClass(pair.left?.line_type || 'context')}`}>
            <span className="diff-line-no">{pair.left?.old_line_no ?? ''}</span>
            <span className="diff-line-content">
              <code>{pair.left?.content ?? ''}</code>
            </span>
          </div>
          <div className={`diff-split-side right ${getLineClass(pair.right?.line_type || 'context')}`}>
            <span className="diff-line-no">{pair.right?.new_line_no ?? ''}</span>
            <span className="diff-line-content">
              <code>{pair.right?.content ?? ''}</code>
            </span>
          </div>
        </div>
      ))}
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

function getLineClass(lineType: DiffLineType): string {
  switch (lineType) {
    case 'addition':
      return 'diff-addition';
    case 'deletion':
      return 'diff-deletion';
    case 'header':
      return 'diff-header-line';
    default:
      return 'diff-context';
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
