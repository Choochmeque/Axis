import { useState, useEffect } from 'react';
import {
  Columns,
  Rows,
  FileCode,
  Binary,
  Plus,
  Minus,
  X,
  ChevronDown,
  Check,
  Image,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui';
import { DiffLineType, DiffStatus } from '@/types';
import type { FileDiff, DiffHunk, DiffLine, DiffLineType as DiffLineTypeType } from '@/types';
import { cn } from '../../lib/utils';
import { diffApi } from '@/services/api';
import {
  useStagingStore,
  type DiffSettings,
  type WhitespaceMode,
  type ContextLines,
  type DiffCompareMode,
} from '@/store/stagingStore';

// Re-export types for external use
export type { WhitespaceMode, ContextLines, DiffCompareMode, DiffSettings };

export type DiffMode = 'workdir' | 'staged' | 'commit';

interface DiffViewProps {
  diff: FileDiff | null;
  isLoading?: boolean;
  mode?: DiffMode;
  commitOid?: string; // For viewing files at specific commits (history view)
  parentCommitOid?: string; // Parent commit for before/after comparison
  onStageHunk?: (patch: string) => Promise<void>;
  onUnstageHunk?: (patch: string) => Promise<void>;
  onDiscardHunk?: (patch: string) => Promise<void>;
}

// Image extensions we support displaying
const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'avif',
]);

function isImageFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

function getMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    avif: 'image/avif',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

interface BinaryImageViewProps {
  path: string;
  oldPath?: string;
  commitOid?: string;
  parentCommitOid?: string;
  status: string;
}

function BinaryImageView({
  path,
  oldPath,
  commitOid,
  parentCommitOid,
  status,
}: BinaryImageViewProps) {
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [oldImageUrl, setOldImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showBefore = status === DiffStatus.Modified || status === DiffStatus.Deleted;
  const showAfter =
    status === DiffStatus.Modified ||
    status === DiffStatus.Added ||
    status === DiffStatus.Untracked;

  useEffect(() => {
    let mounted = true;
    const objectUrls: string[] = [];

    async function loadImages() {
      setIsLoading(true);
      setError(null);

      try {
        const promises: Promise<void>[] = [];

        // Load new/current version
        if (showAfter) {
          promises.push(
            diffApi.getFileBlob(path, commitOid).then((data) => {
              if (!mounted) return;
              const mimeType = getMimeType(path);
              const blob = new Blob([data], { type: mimeType });
              const url = URL.createObjectURL(blob);
              objectUrls.push(url);
              setNewImageUrl(url);
            })
          );
        }

        // Load old/previous version
        if (showBefore) {
          const beforePath = oldPath || path;
          // For working directory, parentCommitOid should be 'HEAD' or similar
          // For commit view, it's the parent commit
          const beforeCommit = parentCommitOid || 'HEAD';
          promises.push(
            diffApi
              .getFileBlob(beforePath, beforeCommit)
              .then((data) => {
                if (!mounted) return;
                const mimeType = getMimeType(beforePath);
                const blob = new Blob([data], { type: mimeType });
                const url = URL.createObjectURL(blob);
                objectUrls.push(url);
                setOldImageUrl(url);
              })
              .catch(() => {
                // Old version might not exist (e.g., renamed from non-existent)
                if (mounted) setOldImageUrl(null);
              })
          );
        }

        await Promise.all(promises);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load image');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadImages();

    return () => {
      mounted = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [path, oldPath, commitOid, parentCommitOid, status, showBefore, showAfter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-(--text-tertiary) text-sm">
        Loading image...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-(--text-tertiary) text-sm">
        <Image size={48} className="opacity-50" />
        <span>Failed to load image</span>
        <span className="text-xs text-error">{error}</span>
      </div>
    );
  }

  const imageClass =
    'max-w-full max-h-full object-contain rounded border border-(--border-color) bg-[repeating-conic-gradient(#808080_0%_25%,transparent_0%_50%)] bg-size-[16px_16px]';

  // Side-by-side view for modified images
  if (showBefore && showAfter) {
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2 border-r border-(--border-color)">
          <span className="text-xs font-medium text-(--text-secondary) mb-2">Before</span>
          {oldImageUrl ? (
            <img src={oldImageUrl} alt="Before" className={imageClass} />
          ) : (
            <div className="flex items-center justify-center text-(--text-tertiary) text-sm">
              <span>Not available</span>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2">
          <span className="text-xs font-medium text-(--text-secondary) mb-2">After</span>
          {newImageUrl ? (
            <img src={newImageUrl} alt="After" className={imageClass} />
          ) : (
            <div className="flex items-center justify-center text-(--text-tertiary) text-sm">
              <span>Not available</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Single image view for added/deleted
  return (
    <div className="flex items-center justify-center h-full p-6">
      {status === DiffStatus.Deleted ? (
        oldImageUrl ? (
          <img src={oldImageUrl} alt={path} className={imageClass} />
        ) : (
          <div className="flex flex-col items-center gap-2 text-(--text-tertiary)">
            <Image size={48} className="opacity-50" />
            <span>Image not available</span>
          </div>
        )
      ) : (
        newImageUrl && <img src={newImageUrl} alt={path} className={imageClass} />
      )}
    </div>
  );
}

type DiffViewMode = 'unified' | 'split';

interface ImageDiffHeaderProps {
  diff: FileDiff;
}

function ImageDiffHeader({ diff }: ImageDiffHeaderProps) {
  const fileName = diff.newPath || diff.oldPath || 'Unknown file';
  const statusText = getStatusText(diff.status);
  const statusColorClass = getStatusColorClass(diff.status);

  return (
    <div className="flex items-center gap-3 h-10 px-3 bg-(--bg-header) border-b border-(--border-color) shrink-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Image size={16} className="text-(--text-secondary) shrink-0" />
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
    </div>
  );
}

// Generate a patch string for a specific hunk
function generateHunkPatch(diff: FileDiff, hunk: DiffHunk): string {
  const oldPath = diff.oldPath || diff.newPath || '';
  const newPath = diff.newPath || diff.oldPath || '';

  let patch = `diff --git a/${oldPath} b/${newPath}\n`;
  patch += `--- a/${oldPath}\n`;
  patch += `+++ b/${newPath}\n`;
  patch += hunk.header;
  if (!hunk.header.endsWith('\n')) {
    patch += '\n';
  }

  for (const line of hunk.lines) {
    const prefix = getLinePrefix(line.lineType);
    patch += `${prefix}${line.content}\n`;
  }

  return patch;
}

export function DiffView({
  diff,
  isLoading,
  mode = 'commit',
  commitOid,
  parentCommitOid,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
}: DiffViewProps) {
  const [viewMode, setViewMode] = useState<DiffViewMode>('unified');
  const [loadingHunk, setLoadingHunk] = useState<number | null>(null);

  // Use store for diff settings (persists across file selections and triggers re-fetch)
  const { diffSettings, setDiffSettings } = useStagingStore();

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

  const filePath = diff.newPath || diff.oldPath || '';

  // Show image preview for image files (including SVG which is text-based)
  if (isImageFile(filePath)) {
    return (
      <div className={diffViewClass}>
        <ImageDiffHeader diff={diff} />
        <div className="flex-1 overflow-auto">
          <BinaryImageView
            path={filePath}
            oldPath={diff.oldPath || undefined}
            commitOid={commitOid}
            parentCommitOid={parentCommitOid}
            status={diff.status}
          />
        </div>
      </div>
    );
  }

  // Generic binary file message for non-images
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
      <DiffHeader
        diff={diff}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        diffSettings={diffSettings}
        onDiffSettingsChange={setDiffSettings}
      />
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
  diffSettings: DiffSettings;
  onDiffSettingsChange: (settings: DiffSettings) => void;
}

const contextLineOptions: ContextLines[] = [1, 3, 6, 12, 25, 50, 100];

function DiffHeader({
  diff,
  viewMode,
  onViewModeChange,
  diffSettings,
  onDiffSettingsChange,
}: DiffHeaderProps) {
  const fileName = diff.newPath || diff.oldPath || 'Unknown file';
  const statusText = getStatusText(diff.status);
  const statusColorClass = getStatusColorClass(diff.status);

  return (
    <div className="flex items-center gap-3 h-10 px-3 bg-(--bg-header) border-b border-(--border-color) shrink-0">
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

      {/* Diff Settings Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="dropdown-button" title="Diff options">
            <span>Context: {diffSettings.contextLines}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* External Diff */}
          <DropdownMenuItem disabled>
            <span className="flex-1">External Diff</span>
            <span className="text-[11px] text-(--text-tertiary)">⌘D</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Whitespace */}
          <DropdownMenuItem
            onSelect={() => onDiffSettingsChange({ ...diffSettings, whitespace: 'show' })}
          >
            {diffSettings.whitespace === 'show' && <Check size={12} className="absolute left-2" />}
            Show whitespace
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onDiffSettingsChange({ ...diffSettings, whitespace: 'ignore' })}
          >
            {diffSettings.whitespace === 'ignore' && (
              <Check size={12} className="absolute left-2" />
            )}
            Ignore whitespace
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Lines of Context */}
          <DropdownMenuLabel>Lines of context</DropdownMenuLabel>
          {contextLineOptions.map((lines) => (
            <DropdownMenuItem
              key={lines}
              onSelect={() => onDiffSettingsChange({ ...diffSettings, contextLines: lines })}
            >
              {diffSettings.contextLines === lines && (
                <Check size={12} className="absolute left-2" />
              )}
              {lines}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Diff Compare Mode */}
          <DropdownMenuItem
            onSelect={() => onDiffSettingsChange({ ...diffSettings, compareMode: 'parent' })}
          >
            {diffSettings.compareMode === 'parent' && (
              <Check size={12} className="absolute left-2" />
            )}
            Diff vs parent
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onDiffSettingsChange({ ...diffSettings, compareMode: 'merged' })}
          >
            {diffSettings.compareMode === 'merged' && (
              <Check size={12} className="absolute left-2" />
            )}
            Diff vs merged
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
          <div className="flex items-center justify-between gap-2 py-1.5 px-3 bg-(--diff-hunk-bg) text-(--text-secondary) font-mono text-xs border-y border-(--border-color)">
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
  'shrink-0 w-12 py-0 px-2 text-right text-(--text-tertiary) border-r border-(--border-color) select-none tabular-nums';

function UnifiedDiffLine({ line }: UnifiedDiffLineProps) {
  const { bgClass, lineNoBgClass, prefixColorClass } = getLineClasses(line.lineType);
  const prefix = getLinePrefix(line.lineType);

  return (
    <div className={cn('flex leading-5.5 font-mono text-xs', bgClass)}>
      <span className={cn(lineNoClass, lineNoBgClass)}>{line.oldLineNo ?? ''}</span>
      <span className={cn(lineNoClass, lineNoBgClass)}>{line.newLineNo ?? ''}</span>
      <span className={cn('shrink-0 w-5 py-0 px-1 text-center select-none', prefixColorClass)}>
        {prefix}
      </span>
      <span className="flex-1 py-0 px-3 whitespace-pre">
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
    <div className="min-w-fit">
      {hunks.map((hunk, hunkIndex) => (
        <div key={hunkIndex} className="mb-1">
          <div className="flex items-center gap-2 py-1 px-3 bg-(--diff-hunk-bg) text-(--text-secondary) font-mono text-xs border-y border-(--border-color)">
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
        const leftClasses = getLineClasses(pair.left?.lineType || DiffLineType.Context);
        const rightClasses = getLineClasses(pair.right?.lineType || DiffLineType.Context);
        const leftEmpty = pair.left === null;
        const rightEmpty = pair.right === null;
        return (
          <div key={index} className="flex min-w-fit">
            <div
              className={cn(
                'w-1/2 min-w-80 flex leading-5.5 font-mono text-xs border-r border-(--border-color)',
                leftEmpty ? 'bg-(--bg-secondary)' : leftClasses.bgClass
              )}
            >
              <span
                className={cn(
                  'shrink-0 w-12 py-0 px-2 text-right text-(--text-tertiary) border-r border-(--border-color) select-none tabular-nums',
                  leftEmpty ? 'bg-(--bg-secondary)' : leftClasses.lineNoBgClass
                )}
              >
                {pair.left?.oldLineNo ?? ''}
              </span>
              <span className="flex-1 py-0 px-3 whitespace-pre">
                <code className="font-inherit">{pair.left?.content ?? ''}</code>
              </span>
            </div>
            <div
              className={cn(
                'w-1/2 min-w-80 flex leading-5.5 font-mono text-xs',
                rightEmpty ? 'bg-(--bg-secondary)' : rightClasses.bgClass
              )}
            >
              <span
                className={cn(
                  'shrink-0 w-12 py-0 px-2 text-right text-(--text-tertiary) border-r border-(--border-color) select-none tabular-nums',
                  rightEmpty ? 'bg-(--bg-secondary)' : rightClasses.lineNoBgClass
                )}
              >
                {pair.right?.newLineNo ?? ''}
              </span>
              <span className="flex-1 py-0 px-3 whitespace-pre">
                <code className="font-inherit">{pair.right?.content ?? ''}</code>
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

    if (line.lineType === DiffLineType.Context) {
      pairs.push({ left: line, right: line });
      i++;
    } else if (line.lineType === DiffLineType.Deletion) {
      // Collect consecutive deletions
      const deletions: DiffLine[] = [];
      while (i < lines.length && lines[i].lineType === DiffLineType.Deletion) {
        deletions.push(lines[i]);
        i++;
      }

      // Collect consecutive additions
      const additions: DiffLine[] = [];
      while (i < lines.length && lines[i].lineType === DiffLineType.Addition) {
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
    } else if (line.lineType === DiffLineType.Addition) {
      pairs.push({ left: null, right: line });
      i++;
    } else {
      i++;
    }
  }

  return pairs;
}

function getLineClasses(lineType: DiffLineTypeType): {
  bgClass: string;
  lineNoBgClass: string;
  prefixColorClass: string;
} {
  switch (lineType) {
    case DiffLineType.Addition:
      return {
        bgClass: 'bg-(--diff-add-bg)',
        lineNoBgClass: 'bg-(--diff-add-bg)',
        prefixColorClass: 'text-(--diff-add-line)',
      };
    case DiffLineType.Deletion:
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

function getLinePrefix(lineType: DiffLineTypeType): string {
  switch (lineType) {
    case DiffLineType.Addition:
      return '+';
    case DiffLineType.Deletion:
      return '-';
    default:
      return ' ';
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case DiffStatus.Added:
      return 'Added';
    case DiffStatus.Deleted:
      return 'Deleted';
    case DiffStatus.Modified:
      return 'Modified';
    case DiffStatus.Renamed:
      return 'Renamed';
    case DiffStatus.Copied:
      return 'Copied';
    case DiffStatus.TypeChanged:
      return 'Type Changed';
    case DiffStatus.Untracked:
      return 'Untracked';
    case DiffStatus.Conflicted:
      return 'Conflicted';
    default:
      return status;
  }
}

function getStatusColorClass(status: string): string {
  switch (status) {
    case DiffStatus.Added:
    case DiffStatus.Untracked:
      return 'bg-success/20 text-success';
    case DiffStatus.Deleted:
    case DiffStatus.Conflicted:
      return 'bg-error/20 text-error';
    case DiffStatus.Modified:
      return 'bg-warning/20 text-warning';
    case DiffStatus.Renamed:
    case DiffStatus.Copied:
      return 'bg-(--accent-color)/20 text-(--accent-color)';
    default:
      return '';
  }
}
