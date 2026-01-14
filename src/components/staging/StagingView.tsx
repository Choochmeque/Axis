import { useEffect, useState, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Trash2 } from 'lucide-react';
import { useStagingStore } from '@/store/stagingStore';
import { Checkbox } from '@/components/ui';
import { FileStatusList, FluidFileList, type FluidFile } from './FileStatusList';
import {
  StagingFilters,
  StagingSortBy,
  StagingShowOnly,
  StagingViewMode,
  StagingMode,
} from './StagingFilters';
import { StatusType } from '@/types';
import type { FileStatus, StatusType as StatusTypeType } from '@/types';
import { cn, naturalCompare } from '@/lib/utils';

// Helper to get filename from path
function getFilename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

// Status priority for sorting
const statusPriority: Record<StatusTypeType, number> = {
  [StatusType.Conflicted]: 0,
  [StatusType.Modified]: 1,
  [StatusType.Added]: 2,
  [StatusType.Deleted]: 3,
  [StatusType.Renamed]: 4,
  [StatusType.Copied]: 5,
  [StatusType.TypeChanged]: 6,
  [StatusType.Untracked]: 7,
  [StatusType.Ignored]: 8,
};

// Sort files based on sortBy option
function sortFiles(files: FileStatus[], sortBy: StagingSortBy): FileStatus[] {
  const sorted = [...files];

  switch (sortBy) {
    case StagingSortBy.Path:
      return sorted.sort((a, b) => naturalCompare(a.path, b.path));
    case StagingSortBy.PathReversed:
      return sorted.sort((a, b) => naturalCompare(b.path, a.path));
    case StagingSortBy.Filename:
      return sorted.sort((a, b) => naturalCompare(getFilename(a.path), getFilename(b.path)));
    case StagingSortBy.FilenameReversed:
      return sorted.sort((a, b) => naturalCompare(getFilename(b.path), getFilename(a.path)));
    case StagingSortBy.Status:
      return sorted.sort((a, b) => {
        const aPriority = statusPriority[a.status] ?? 99;
        const bPriority = statusPriority[b.status] ?? 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return naturalCompare(a.path, b.path);
      });
    case StagingSortBy.Checked:
      // When sorting by checked, staged files come first (they are "checked")
      // Since we already split staged/unstaged sections, within each section just sort by path
      return sorted.sort((a, b) => naturalCompare(a.path, b.path));
    default:
      return sorted;
  }
}

// Filter files based on showOnly option
function filterFiles(
  files: FileStatus[],
  showOnly: StagingShowOnly,
  source: 'staged' | 'unstaged' | 'untracked' | 'conflicted'
): FileStatus[] {
  switch (showOnly) {
    case StagingShowOnly.All:
    case StagingShowOnly.Pending:
      // Show all files (pending means all changes, which is everything we have)
      return files;
    case StagingShowOnly.Conflicts:
      return source === 'conflicted' ? files : files.filter((f) => f.isConflict);
    case StagingShowOnly.Untracked:
      return source === 'untracked'
        ? files
        : files.filter((f) => f.status === StatusType.Untracked);
    case StagingShowOnly.Modified:
      return files.filter((f) => f.status === StatusType.Modified);
    case StagingShowOnly.Ignored:
      return files.filter((f) => f.status === StatusType.Ignored);
    case StagingShowOnly.Clean:
      // Clean files are not in any of our lists, so return empty
      return [];
    default:
      return files;
  }
}

const sectionHeaderClass =
  'flex items-center justify-between py-2 px-3 bg-(--bg-header) border-b border-(--border-color) shrink-0';
const sectionTitleClass = 'text-xs font-semibold uppercase text-(--text-secondary)';
const actionBtnClass =
  'flex items-center gap-1 py-1 px-2 border-none rounded bg-transparent text-(--text-secondary) text-[11px] cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)';

export function StagingView() {
  const {
    status,
    isLoadingStatus,
    selectedFile,
    error,
    loadStatus,
    selectFile,
    stageFile,
    stageAll,
    unstageFile,
    unstageAll,
    discardFile,
    discardAll,
    clearError,
  } = useStagingStore();

  // Filter state (UI only for now, filtering logic to be implemented)
  const [sortBy, setSortBy] = useState<StagingSortBy>(StagingSortBy.Path);
  const [showOnly, setShowOnly] = useState<StagingShowOnly>(StagingShowOnly.Pending);
  const [viewMode, setViewMode] = useState<StagingViewMode>(StagingViewMode.FlatSingle);
  const [stagingMode, setStagingMode] = useState<StagingMode>(StagingMode.SplitView);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Apply filters and sorting - hooks must be called before any conditional returns
  const stagedFiles = useMemo(() => {
    const raw = status?.staged ?? [];
    const filtered = filterFiles(raw, showOnly, 'staged');
    return sortFiles(filtered, sortBy);
  }, [status?.staged, showOnly, sortBy]);

  const unstagedFiles = useMemo(() => {
    const rawUnstaged = status?.unstaged ?? [];
    const rawUntracked = status?.untracked ?? [];
    const filteredUnstaged = filterFiles(rawUnstaged, showOnly, 'unstaged');
    const filteredUntracked = filterFiles(rawUntracked, showOnly, 'untracked');
    const combined = [...filteredUnstaged, ...filteredUntracked];
    return sortFiles(combined, sortBy);
  }, [status?.unstaged, status?.untracked, showOnly, sortBy]);

  const conflictedFiles = useMemo(() => {
    const raw = status?.conflicted ?? [];
    const filtered = filterFiles(raw, showOnly, 'conflicted');
    return sortFiles(filtered, sortBy);
  }, [status?.conflicted, showOnly, sortBy]);

  // Unified file list for fluid mode
  const fluidFiles = useMemo((): FluidFile[] => {
    const staged = (status?.staged ?? []).map((f) => ({ ...f, isStaged: true }));
    const unstaged = (status?.unstaged ?? []).map((f) => ({ ...f, isStaged: false }));
    const untracked = (status?.untracked ?? []).map((f) => ({ ...f, isStaged: false }));
    const combined = [...staged, ...unstaged, ...untracked];

    // Apply sorting
    if (sortBy === StagingSortBy.Checked) {
      // Staged files first, then unstaged
      return combined.sort((a, b) => {
        if (a.isStaged !== b.isStaged) return a.isStaged ? -1 : 1;
        return naturalCompare(a.path, b.path);
      });
    }

    return sortFiles(combined, sortBy) as FluidFile[];
  }, [status?.staged, status?.unstaged, status?.untracked, sortBy]);

  // Original count for discard all action (before filtering)
  const totalUnstaged = (status?.unstaged?.length ?? 0) + (status?.untracked?.length ?? 0);
  const totalStaged = status?.staged?.length ?? 0;

  if (isLoadingStatus && !status) {
    return (
      <div className="flex flex-col h-full bg-(--bg-secondary) overflow-hidden">
        <div className="flex items-center justify-center h-full text-(--text-secondary)">
          Loading status...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-(--bg-secondary) overflow-hidden">
        <div className="flex flex-col items-center justify-center h-full gap-3 text-error">
          <span>{error}</span>
          <button
            className="py-1 px-3 border border-(--border-color) rounded bg-transparent text-(--text-primary) cursor-pointer"
            onClick={clearError}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  const hasUnstaged = unstagedFiles.length > 0;
  const hasStaged = stagedFiles.length > 0;
  const hasConflicts = conflictedFiles.length > 0;
  const totalFiles = fluidFiles.length;

  // Render fluid staging view
  const renderFluidView = () => (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header with counts and actions */}
      <div className={sectionHeaderClass}>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={totalStaged === totalFiles ? true : totalStaged > 0 ? 'indeterminate' : false}
            onCheckedChange={(checked: boolean | 'indeterminate') => {
              if (checked === true) {
                stageAll();
              } else if (checked === false) {
                unstageAll();
              }
            }}
          />
          <span className={sectionTitleClass}>Changes</span>
          {totalFiles > 0 && (
            <span className={cn('badge', 'text-[11px] font-normal text-(--text-secondary)')}>
              {totalStaged}/{totalFiles}
            </span>
          )}
        </div>
        {totalUnstaged > 0 && (
          <button
            className={cn(actionBtnClass, 'hover:bg-error/10 hover:text-error')}
            onClick={discardAll}
            title="Discard all changes"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* File list */}
      <FluidFileList
        files={fluidFiles}
        selectedFile={selectedFile}
        onSelectFile={selectFile}
        onStage={stageFile}
        onUnstage={unstageFile}
        onDiscard={discardFile}
        viewMode={viewMode}
      />

      {/* Conflicts section */}
      {hasConflicts && (
        <div className="flex flex-col shrink-0 max-h-50 overflow-hidden border-t border-(--border-color)">
          <div className={cn(sectionHeaderClass, 'bg-error/10')}>
            <div className="flex items-center gap-2">
              <span className={sectionTitleClass}>Conflicts</span>
              <span className={cn('badge', 'text-[11px] font-normal text-(--text-secondary)')}>
                {conflictedFiles.length}
              </span>
            </div>
          </div>
          <FileStatusList
            files={conflictedFiles}
            selectedFile={selectedFile}
            onSelectFile={(file) => selectFile(file, false)}
            viewMode={viewMode}
          />
        </div>
      )}
    </div>
  );

  // Render split view staging
  const renderSplitView = () => (
    <PanelGroup direction="vertical" autoSaveId="staging-layout" className="flex-1 min-h-0">
      {/* Staged changes section */}
      <Panel defaultSize={50} minSize={20}>
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={hasStaged}
                onCheckedChange={(checked: boolean | 'indeterminate') => {
                  if (checked === false) {
                    unstageAll();
                  }
                }}
              />
              <span className={sectionTitleClass}>Staged files</span>
              {hasStaged && (
                <span className={cn('badge', 'text-[11px] font-normal text-(--text-secondary)')}>
                  {stagedFiles.length}
                </span>
              )}
            </div>
          </div>

          {hasStaged ? (
            <FileStatusList
              files={stagedFiles}
              selectedFile={selectedFile}
              onSelectFile={(file) => selectFile(file, true)}
              onUnstage={unstageFile}
              showUnstageButton
              viewMode={viewMode}
            />
          ) : (
            <div className="p-4 text-center text-(--text-tertiary) text-[13px] italic">
              No staged changes
            </div>
          )}
        </div>
      </Panel>

      <PanelResizeHandle className="resize-handle-vertical" />

      {/* Unstaged changes section */}
      <Panel defaultSize={50} minSize={20}>
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={false}
                onCheckedChange={(checked: boolean | 'indeterminate') => {
                  if (checked === true) {
                    stageAll();
                  }
                }}
              />
              <span className={sectionTitleClass}>Unstaged files</span>
              {hasUnstaged && (
                <span className={cn('badge', 'text-[11px] font-normal text-(--text-secondary)')}>
                  {unstagedFiles.length}
                </span>
              )}
            </div>
            {totalUnstaged > 0 && (
              <button
                className={cn(actionBtnClass, 'hover:bg-error/10 hover:text-error')}
                onClick={discardAll}
                title="Discard all changes"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {hasUnstaged ? (
            <FileStatusList
              files={unstagedFiles}
              selectedFile={selectedFile}
              onSelectFile={(file) => selectFile(file, false)}
              onStage={stageFile}
              onDiscard={discardFile}
              showStageButton
              showDiscardButton
              viewMode={viewMode}
            />
          ) : (
            <div className="p-4 text-center text-(--text-tertiary) text-[13px] italic">
              No unstaged changes
            </div>
          )}

          {/* Conflicts section */}
          {hasConflicts && (
            <div className="flex flex-col shrink-0 max-h-50 overflow-hidden border-t border-(--border-color)">
              <div className={cn(sectionHeaderClass, 'bg-error/10')}>
                <div className="flex items-center gap-2">
                  <span className={sectionTitleClass}>Conflicts</span>
                  <span className={cn('badge', 'text-[11px] font-normal text-(--text-secondary)')}>
                    {conflictedFiles.length}
                  </span>
                </div>
              </div>
              <FileStatusList
                files={conflictedFiles}
                selectedFile={selectedFile}
                onSelectFile={(file) => selectFile(file, false)}
                viewMode={viewMode}
              />
            </div>
          )}
        </div>
      </Panel>
    </PanelGroup>
  );

  return (
    <div className="flex flex-col h-full bg-(--bg-secondary) overflow-hidden">
      <StagingFilters
        sortBy={sortBy}
        showOnly={showOnly}
        viewMode={viewMode}
        stagingMode={stagingMode}
        onSortByChange={setSortBy}
        onShowOnlyChange={setShowOnly}
        onViewModeChange={setViewMode}
        onStagingModeChange={setStagingMode}
      />
      {stagingMode === StagingMode.Fluid ? renderFluidView() : renderSplitView()}
    </div>
  );
}
