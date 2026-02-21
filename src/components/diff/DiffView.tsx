import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Columns,
  Rows,
  FileCode,
  Binary,
  Plus,
  Minus,
  X,
  ChevronDown,
  Image,
  ListChecks,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Checkbox,
} from '@/components/ui';
import { useLineSelection } from '@/hooks/useLineSelection';
import type { UseLineSelectionReturn } from '@/hooks/useLineSelection';
import { generatePartialPatch, isLineSelectable } from '@/lib/patchUtils';
import { DiffLineType, DiffStatus } from '@/types';
import type { FileDiff, DiffHunk, DiffLine, DiffLineType as DiffLineTypeType } from '@/types';
import { cn, testId } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errorUtils';
import { diffApi } from '@/services/api';
import { useStagingStore, DiffCompareMode, WhitespaceMode } from '@/store/stagingStore';
import { useSettingsStore } from '@/store/settingsStore';
import type {
  DiffSettings,
  ContextLines,
  DiffCompareMode as DiffCompareModeType,
  WhitespaceMode as WhitespaceModeType,
} from '@/store/stagingStore';

// Re-export types for external use
export type {
  WhitespaceModeType as WhitespaceMode,
  ContextLines,
  DiffCompareModeType as DiffCompareMode,
  DiffSettings,
};

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
  const { t } = useTranslation();
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
              .catch((err) => {
                console.warn(
                  `Failed to load previous image version for ${beforePath} at ${beforeCommit}:`,
                  err
                );
                if (mounted) setOldImageUrl(null);
              })
          );
        }

        await Promise.all(promises);
      } catch (err) {
        if (!mounted) return;
        setError(getErrorMessage(err));
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
        {t('diff.loadingImage')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-(--text-tertiary) text-sm">
        <Image size={48} className="opacity-50" />
        <span>{t('diff.failedToLoadImage')}</span>
        <span className="text-xs text-error">{error}</span>
      </div>
    );
  }

  const imageClass =
    'max-w-full max-h-full object-contain rounded border border-(--border-color) bg-[repeating-conic-gradient(var(--color-checkerboard)_0%_25%,transparent_0%_50%)] bg-size-[16px_16px]';

  // Side-by-side view for modified images
  if (showBefore && showAfter) {
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2 border-r border-(--border-color)">
          <span className="text-xs font-medium text-(--text-secondary) mb-2">
            {t('diff.before')}
          </span>
          {oldImageUrl ? (
            <img src={oldImageUrl} alt={t('diff.before')} className={imageClass} />
          ) : (
            <div className="flex items-center justify-center text-(--text-tertiary) text-sm">
              <span>{t('diff.notAvailable')}</span>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2">
          <span className="text-xs font-medium text-(--text-secondary) mb-2">
            {t('diff.after')}
          </span>
          {newImageUrl ? (
            <img src={newImageUrl} alt={t('diff.after')} className={imageClass} />
          ) : (
            <div className="flex items-center justify-center text-(--text-tertiary) text-sm">
              <span>{t('diff.notAvailable')}</span>
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
            <span>{t('diff.imageNotAvailable')}</span>
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
  const { t } = useTranslation();
  const fileName = diff.newPath || diff.oldPath || t('diff.unknownFile');
  const statusText = getStatusText(diff.status, t);
  const statusColorClass = getStatusColorClass(diff.status);

  return (
    <div className="flex items-center gap-3 h-10 px-3 bg-(--bg-header) border-b border-(--border-color) shrink-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Image size={16} className="text-(--text-secondary) shrink-0" />
        <span className="text-base font-medium whitespace-nowrap overflow-hidden text-ellipsis">
          {fileName}
        </span>
        <span
          className={cn('text-sm py-0.5 px-1.5 rounded uppercase font-medium', statusColorClass)}
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
  const { t } = useTranslation();
  const [loadingHunk, setLoadingHunk] = useState<number | null>(null);
  const [lineSelectionMode, setLineSelectionMode] = useState(false);
  const [isProcessingLines, setIsProcessingLines] = useState(false);
  const contextLinesInitialized = useRef(false);
  const viewModeInitialized = useRef(false);

  // Use store for diff settings (persists across file selections and triggers re-fetch)
  const { diffSettings, setDiffSettings } = useStagingStore();
  const { settings } = useSettingsStore();

  // Line selection hook
  const lineSelection = useLineSelection({
    hunks: diff?.hunks ?? [],
    enabled: lineSelectionMode,
  });

  // Initialize viewMode from settings (settings = default, button = session override)
  const [viewMode, setViewMode] = useState<DiffViewMode>('unified');
  useEffect(() => {
    if (!viewModeInitialized.current && settings?.diffSideBySide !== undefined) {
      viewModeInitialized.current = true;
      setViewMode(settings.diffSideBySide ? 'split' : 'unified');
    }
  }, [settings?.diffSideBySide]);

  // Initialize contextLines from settings once (settings = default, dropdown = session override)
  useEffect(() => {
    if (!contextLinesInitialized.current && settings?.diffContextLines !== undefined) {
      contextLinesInitialized.current = true;
      const settingsContextLines = settings.diffContextLines as ContextLines;
      if (diffSettings.contextLines !== settingsContextLines) {
        setDiffSettings({ ...diffSettings, contextLines: settingsContextLines });
      }
    }
  }, [settings?.diffContextLines, diffSettings, setDiffSettings]);

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

  const handleStageSelectedLines = useCallback(async () => {
    if (!diff || !onStageHunk || lineSelection.selectionCount === 0) return;
    const patch = generatePartialPatch(diff, lineSelection.selectedLines);
    if (!patch) return;
    setIsProcessingLines(true);
    try {
      await onStageHunk(patch);
      lineSelection.clearSelection();
    } finally {
      setIsProcessingLines(false);
    }
  }, [diff, onStageHunk, lineSelection]);

  const handleUnstageSelectedLines = useCallback(async () => {
    if (!diff || !onUnstageHunk || lineSelection.selectionCount === 0) return;
    const patch = generatePartialPatch(diff, lineSelection.selectedLines);
    if (!patch) return;
    setIsProcessingLines(true);
    try {
      await onUnstageHunk(patch);
      lineSelection.clearSelection();
    } finally {
      setIsProcessingLines(false);
    }
  }, [diff, onUnstageHunk, lineSelection]);

  const diffViewClass = 'flex flex-col h-full bg-(--bg-primary) overflow-hidden';
  const emptyStateClass =
    'flex flex-col items-center justify-center h-full gap-4 text-(--text-tertiary) text-sm';

  if (isLoading) {
    return (
      <div className={diffViewClass}>
        <div className={emptyStateClass}>{t('diff.loadingDiff')}</div>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className={diffViewClass}>
        <div className={emptyStateClass}>{t('diff.selectFile')}</div>
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
          <span>{t('diff.binaryFile')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={diffViewClass} {...testId('e2e-diff-view')}>
      <DiffHeader
        diff={diff}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        diffSettings={diffSettings}
        onDiffSettingsChange={setDiffSettings}
        mode={mode}
        lineSelectionMode={lineSelectionMode}
        onLineSelectionModeChange={setLineSelectionMode}
        lineSelection={lineSelection}
        isProcessingLines={isProcessingLines}
        onStageSelectedLines={handleStageSelectedLines}
        onUnstageSelectedLines={handleUnstageSelectedLines}
      />
      <div className="flex-1 overflow-auto">
        {diff.hunks.length === 0 ? (
          <div className={emptyStateClass}>{t('diff.noChanges')}</div>
        ) : viewMode === 'unified' ? (
          <UnifiedDiff
            hunks={diff.hunks}
            mode={mode}
            loadingHunk={loadingHunk}
            wordWrap={settings?.diffWordWrap}
            showLineNumbers={settings?.showLineNumbers}
            onStageHunk={onStageHunk ? handleStageHunk : undefined}
            onUnstageHunk={onUnstageHunk ? handleUnstageHunk : undefined}
            onDiscardHunk={onDiscardHunk ? handleDiscardHunk : undefined}
            lineSelectionMode={lineSelectionMode}
            lineSelection={lineSelection}
          />
        ) : (
          <SplitDiff
            hunks={diff.hunks}
            mode={mode}
            loadingHunk={loadingHunk}
            wordWrap={settings?.diffWordWrap}
            showLineNumbers={settings?.showLineNumbers}
            onStageHunk={onStageHunk ? handleStageHunk : undefined}
            onUnstageHunk={onUnstageHunk ? handleUnstageHunk : undefined}
            onDiscardHunk={onDiscardHunk ? handleDiscardHunk : undefined}
            lineSelectionMode={lineSelectionMode}
            lineSelection={lineSelection}
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
  mode: DiffMode;
  lineSelectionMode: boolean;
  onLineSelectionModeChange: (enabled: boolean) => void;
  lineSelection: UseLineSelectionReturn;
  isProcessingLines: boolean;
  onStageSelectedLines: () => Promise<void>;
  onUnstageSelectedLines: () => Promise<void>;
}

const contextLineOptions: ContextLines[] = [1, 3, 6, 12, 25, 50, 100];

function DiffHeader({
  diff,
  viewMode,
  onViewModeChange,
  diffSettings,
  onDiffSettingsChange,
  mode,
  lineSelectionMode,
  onLineSelectionModeChange,
  lineSelection,
  isProcessingLines,
  onStageSelectedLines,
  onUnstageSelectedLines,
}: DiffHeaderProps) {
  const { t } = useTranslation();
  const fileName = diff.newPath || diff.oldPath || t('diff.unknownFile');
  const statusText = getStatusText(diff.status, t);
  const statusColorClass = getStatusColorClass(diff.status);
  const showLineSelectionToggle = mode === 'workdir' || mode === 'staged';

  return (
    <div className="flex items-center gap-3 h-10 px-3 bg-(--bg-header) border-b border-(--border-color) shrink-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FileCode size={16} className="text-(--text-secondary) shrink-0" />
        <span className="text-base font-medium whitespace-nowrap overflow-hidden text-ellipsis">
          {fileName}
        </span>
        <span
          className={cn('text-sm py-0.5 px-1.5 rounded uppercase font-medium', statusColorClass)}
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

      {/* Line selection actions */}
      {lineSelectionMode && lineSelection.hasSelection && (
        <>
          {mode === 'workdir' && (
            <button
              className={hunkActionClass}
              onClick={onStageSelectedLines}
              disabled={isProcessingLines}
            >
              <Plus size={14} />
              <span>
                {t('diff.lineMode.stageSelected', { count: lineSelection.selectionCount })}
              </span>
            </button>
          )}
          {mode === 'staged' && (
            <button
              className={hunkActionClass}
              onClick={onUnstageSelectedLines}
              disabled={isProcessingLines}
            >
              <Minus size={14} />
              <span>
                {t('diff.lineMode.unstageSelected', { count: lineSelection.selectionCount })}
              </span>
            </button>
          )}
        </>
      )}

      {/* Line selection mode toggle */}
      {showLineSelectionToggle && (
        <button
          className={cn(
            'flex items-center gap-1 px-2 h-6 border rounded text-sm transition-colors',
            lineSelectionMode
              ? 'bg-(--accent-color) text-white border-(--accent-color)'
              : 'bg-transparent text-(--text-secondary) border-(--border-color) hover:bg-(--bg-hover) hover:text-(--text-primary)'
          )}
          onClick={() => onLineSelectionModeChange(!lineSelectionMode)}
          title={t('diff.lineMode.toggle')}
        >
          <ListChecks size={14} />
          <span>{t('diff.lineMode.label')}</span>
        </button>
      )}

      {/* Diff Settings Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="dropdown-button" title={t('diff.options.title')}>
            <span>{t('diff.options.context', { lines: diffSettings.contextLines })}</span>
            <ChevronDown size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* External Diff */}
          <DropdownMenuItem disabled shortcut="⌘D">
            {t('diff.options.externalDiff')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Whitespace */}
          <DropdownMenuRadioGroup
            value={diffSettings.whitespace}
            onValueChange={(value) =>
              onDiffSettingsChange({ ...diffSettings, whitespace: value as WhitespaceModeType })
            }
          >
            <DropdownMenuRadioItem value={WhitespaceMode.Show}>
              {t('diff.options.showWhitespace')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={WhitespaceMode.Ignore}>
              {t('diff.options.ignoreWhitespace')}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          {/* Lines of Context */}
          <DropdownMenuLabel>{t('diff.options.linesOfContext')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={String(diffSettings.contextLines)}
            onValueChange={(value) =>
              onDiffSettingsChange({ ...diffSettings, contextLines: Number(value) as ContextLines })
            }
          >
            {contextLineOptions.map((lines) => (
              <DropdownMenuRadioItem key={lines} value={String(lines)}>
                {lines}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          {/* Diff Compare Mode */}
          <DropdownMenuRadioGroup
            value={diffSettings.compareMode}
            onValueChange={(value) =>
              onDiffSettingsChange({ ...diffSettings, compareMode: value as DiffCompareModeType })
            }
          >
            <DropdownMenuRadioItem value={DiffCompareMode.Parent}>
              {t('diff.options.diffVsParent')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={DiffCompareMode.Merged}>
              {t('diff.options.diffVsMerged')}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
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
          title={t('diff.viewMode.unified')}
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
          title={t('diff.viewMode.split')}
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
  wordWrap?: boolean;
  showLineNumbers?: boolean;
  onStageHunk?: (hunkIndex: number) => Promise<void>;
  onUnstageHunk?: (hunkIndex: number) => Promise<void>;
  onDiscardHunk?: (hunkIndex: number) => Promise<void>;
  lineSelectionMode?: boolean;
  lineSelection?: UseLineSelectionReturn;
}

const hunkActionClass =
  'flex items-center gap-1 py-0.5 px-2 border border-(--border-color) rounded bg-(--bg-secondary) text-(--text-secondary) text-sm font-sans cursor-pointer transition-colors shrink-0 hover:not-disabled:bg-(--bg-hover) hover:not-disabled:border-(--accent-color) hover:not-disabled:text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed';

function UnifiedDiff({
  hunks,
  mode,
  loadingHunk,
  wordWrap,
  showLineNumbers,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
  lineSelectionMode,
  lineSelection,
}: UnifiedDiffProps) {
  const { t } = useTranslation();

  return (
    <div className={cn(!wordWrap && 'min-w-fit')}>
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
                title={t('diff.hunk.stageTitle')}
              >
                <Plus size={14} />
                <span>{t('diff.hunk.stage')}</span>
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
                title={t('diff.hunk.discardTitle')}
              >
                <X size={14} />
                <span>{t('diff.hunk.discard')}</span>
              </button>
            )}
            {mode === 'staged' && onUnstageHunk && (
              <button
                className={hunkActionClass}
                onClick={() => onUnstageHunk(hunkIndex)}
                disabled={loadingHunk !== null}
                title={t('diff.hunk.unstageTitle')}
              >
                <Minus size={14} />
                <span>{t('diff.hunk.unstage')}</span>
              </button>
            )}
          </div>
          <div className="flex flex-col">
            {hunk.lines.map((line, lineIndex) => {
              const isSelectable = isLineSelectable(line.lineType);
              const isSelected = lineSelection?.isLineSelected(hunkIndex, lineIndex) ?? false;
              return (
                <UnifiedDiffLine
                  key={lineIndex}
                  line={line}
                  wordWrap={wordWrap}
                  showLineNumbers={showLineNumbers}
                  lineSelectionMode={lineSelectionMode}
                  isSelectable={isSelectable}
                  isSelected={isSelected}
                  onToggle={(e) => lineSelection?.toggleLine(hunkIndex, lineIndex, e)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

interface UnifiedDiffLineProps {
  line: DiffLine;
  wordWrap?: boolean;
  showLineNumbers?: boolean;
  lineSelectionMode?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  onToggle?: (event?: React.MouseEvent) => void;
}

const lineNoClass =
  'shrink-0 w-12 py-0 px-2 text-right text-(--text-tertiary) border-r border-(--border-color) select-none tabular-nums';

function UnifiedDiffLine({
  line,
  wordWrap,
  showLineNumbers = true,
  lineSelectionMode,
  isSelectable,
  isSelected,
  onToggle,
}: UnifiedDiffLineProps) {
  const { bgClass, lineNoBgClass, prefixColorClass } = getLineClasses(line.lineType);
  const prefix = getLinePrefix(line.lineType);

  const handleClick = (e: React.MouseEvent) => {
    if (lineSelectionMode && isSelectable && onToggle) {
      onToggle(e);
    }
  };

  return (
    <div
      className={cn(
        'flex leading-5.5 font-mono diff-text',
        bgClass,
        isSelected && 'diff-line-selected',
        lineSelectionMode && isSelectable && 'diff-line-selectable'
      )}
      onClick={handleClick}
    >
      {/* Checkbox column */}
      {lineSelectionMode && (
        <span className="diff-line-checkbox">
          {isSelectable && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggle?.()}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </span>
      )}
      {showLineNumbers && (
        <>
          <span className={cn(lineNoClass, lineNoBgClass)}>{line.oldLineNo ?? ''}</span>
          <span className={cn(lineNoClass, lineNoBgClass)}>{line.newLineNo ?? ''}</span>
        </>
      )}
      <span className={cn('shrink-0 w-5 py-0 px-1 text-center select-none', prefixColorClass)}>
        {prefix}
      </span>
      <span
        className={cn(
          'flex-1 py-0 px-3',
          wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
        )}
      >
        <code className="font-inherit">{line.content}</code>
      </span>
    </div>
  );
}

interface SplitDiffProps {
  hunks: DiffHunk[];
  mode: DiffMode;
  loadingHunk: number | null;
  wordWrap?: boolean;
  showLineNumbers?: boolean;
  onStageHunk?: (hunkIndex: number) => Promise<void>;
  onUnstageHunk?: (hunkIndex: number) => Promise<void>;
  onDiscardHunk?: (hunkIndex: number) => Promise<void>;
  lineSelectionMode?: boolean;
  lineSelection?: UseLineSelectionReturn;
}

function SplitDiff({
  hunks,
  mode,
  loadingHunk,
  wordWrap,
  showLineNumbers,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
  lineSelectionMode,
  lineSelection,
}: SplitDiffProps) {
  const { t } = useTranslation();

  return (
    <div className={cn(!wordWrap && 'min-w-fit')}>
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
                title={t('diff.hunk.stageTitle')}
              >
                <Plus size={14} />
                <span>{t('diff.hunk.stage')}</span>
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
                title={t('diff.hunk.discardTitle')}
              >
                <X size={14} />
                <span>{t('diff.hunk.discard')}</span>
              </button>
            )}
            {mode === 'staged' && onUnstageHunk && (
              <button
                className={hunkActionClass}
                onClick={() => onUnstageHunk(hunkIndex)}
                disabled={loadingHunk !== null}
                title={t('diff.hunk.unstageTitle')}
              >
                <Minus size={14} />
                <span>{t('diff.hunk.unstage')}</span>
              </button>
            )}
          </div>
          <div className="flex flex-col">
            <SplitHunkLines
              lines={hunk.lines}
              hunkIndex={hunkIndex}
              wordWrap={wordWrap}
              showLineNumbers={showLineNumbers}
              lineSelectionMode={lineSelectionMode}
              lineSelection={lineSelection}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SplitHunkLinesProps {
  lines: DiffLine[];
  hunkIndex: number;
  wordWrap?: boolean;
  showLineNumbers?: boolean;
  lineSelectionMode?: boolean;
  lineSelection?: UseLineSelectionReturn;
}

function SplitHunkLines({
  lines,
  hunkIndex,
  wordWrap,
  showLineNumbers = true,
  lineSelectionMode,
  lineSelection,
}: SplitHunkLinesProps) {
  const pairs = pairLinesForSplit(lines);
  const contentClass = wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre';

  return (
    <>
      {pairs.map((pair, index) => {
        const leftLine = pair.left?.line;
        const rightLine = pair.right?.line;
        const leftClasses = getLineClasses(leftLine?.lineType || DiffLineType.Context);
        const rightClasses = getLineClasses(rightLine?.lineType || DiffLineType.Context);
        const leftEmpty = pair.left === null;
        const rightEmpty = pair.right === null;

        // Check if lines are selectable (only deletions on left, additions on right)
        const leftSelectable = leftLine?.lineType === DiffLineType.Deletion;
        const rightSelectable = rightLine?.lineType === DiffLineType.Addition;
        const leftSelected = !!(
          pair.left && lineSelection?.isLineSelected(hunkIndex, pair.left.originalIndex)
        );
        const rightSelected = !!(
          pair.right && lineSelection?.isLineSelected(hunkIndex, pair.right.originalIndex)
        );

        const handleLeftClick = (e: React.MouseEvent) => {
          if (lineSelectionMode && leftSelectable && pair.left) {
            lineSelection?.toggleLine(hunkIndex, pair.left.originalIndex, e);
          }
        };

        const handleRightClick = (e: React.MouseEvent) => {
          if (lineSelectionMode && rightSelectable && pair.right) {
            lineSelection?.toggleLine(hunkIndex, pair.right.originalIndex, e);
          }
        };

        return (
          <div key={index} className={cn('flex', !wordWrap && 'min-w-fit')}>
            {/* Left side (deletions) */}
            <div
              className={cn(
                'w-1/2 min-w-80 flex leading-5.5 font-mono diff-text border-r border-(--border-color)',
                leftEmpty ? 'bg-(--bg-secondary)' : leftClasses.bgClass,
                leftSelected && 'diff-line-selected',
                lineSelectionMode && leftSelectable && 'diff-line-selectable'
              )}
              onClick={handleLeftClick}
            >
              {lineSelectionMode && (
                <span className="diff-line-checkbox">
                  {leftSelectable && (
                    <Checkbox
                      checked={leftSelected}
                      onCheckedChange={() =>
                        pair.left && lineSelection?.toggleLine(hunkIndex, pair.left.originalIndex)
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </span>
              )}
              {showLineNumbers && (
                <span
                  className={cn(
                    'shrink-0 w-12 py-0 px-2 text-right text-(--text-tertiary) border-r border-(--border-color) select-none tabular-nums',
                    leftEmpty ? 'bg-(--bg-secondary)' : leftClasses.lineNoBgClass
                  )}
                >
                  {leftLine?.oldLineNo ?? ''}
                </span>
              )}
              <span className={cn('flex-1 py-0 px-3', contentClass)}>
                <code className="font-inherit">{leftLine?.content ?? ''}</code>
              </span>
            </div>
            {/* Right side (additions) */}
            <div
              className={cn(
                'w-1/2 min-w-80 flex leading-5.5 font-mono diff-text',
                rightEmpty ? 'bg-(--bg-secondary)' : rightClasses.bgClass,
                rightSelected && 'diff-line-selected',
                lineSelectionMode && rightSelectable && 'diff-line-selectable'
              )}
              onClick={handleRightClick}
            >
              {lineSelectionMode && (
                <span className="diff-line-checkbox">
                  {rightSelectable && (
                    <Checkbox
                      checked={rightSelected}
                      onCheckedChange={() =>
                        pair.right && lineSelection?.toggleLine(hunkIndex, pair.right.originalIndex)
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </span>
              )}
              {showLineNumbers && (
                <span
                  className={cn(
                    'shrink-0 w-12 py-0 px-2 text-right text-(--text-tertiary) border-r border-(--border-color) select-none tabular-nums',
                    rightEmpty ? 'bg-(--bg-secondary)' : rightClasses.lineNoBgClass
                  )}
                >
                  {rightLine?.newLineNo ?? ''}
                </span>
              )}
              <span className={cn('flex-1 py-0 px-3', contentClass)}>
                <code className="font-inherit">{rightLine?.content ?? ''}</code>
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

interface LinePairItem {
  line: DiffLine;
  originalIndex: number;
}

interface LinePair {
  left: LinePairItem | null;
  right: LinePairItem | null;
}

function pairLinesForSplit(lines: DiffLine[]): LinePair[] {
  const pairs: LinePair[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.lineType === DiffLineType.Context) {
      const item = { line, originalIndex: i };
      pairs.push({ left: item, right: item });
      i++;
    } else if (line.lineType === DiffLineType.Deletion) {
      // Collect consecutive deletions with their indices
      const deletions: LinePairItem[] = [];
      while (i < lines.length && lines[i].lineType === DiffLineType.Deletion) {
        deletions.push({ line: lines[i], originalIndex: i });
        i++;
      }

      // Collect consecutive additions with their indices
      const additions: LinePairItem[] = [];
      while (i < lines.length && lines[i].lineType === DiffLineType.Addition) {
        additions.push({ line: lines[i], originalIndex: i });
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
      pairs.push({ left: null, right: { line, originalIndex: i } });
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

function getStatusText(status: string, t: (key: string) => string): string {
  switch (status) {
    case DiffStatus.Added:
      return t('diff.status.added');
    case DiffStatus.Deleted:
      return t('diff.status.deleted');
    case DiffStatus.Modified:
      return t('diff.status.modified');
    case DiffStatus.Renamed:
      return t('diff.status.renamed');
    case DiffStatus.Copied:
      return t('diff.status.copied');
    case DiffStatus.TypeChanged:
      return t('diff.status.typeChanged');
    case DiffStatus.Untracked:
      return t('diff.status.untracked');
    case DiffStatus.Conflicted:
      return t('diff.status.conflicted');
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
