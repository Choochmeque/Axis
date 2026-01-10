import { useEffect } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { useStagingStore } from '../../store/stagingStore';
import { FileStatusList } from './FileStatusList';
import { cn } from '../../lib/utils';

const sectionHeaderClass = "flex items-center justify-between py-2 px-3 bg-(--bg-header) border-b border-(--border-color) shrink-0";
const sectionTitleClass = "text-xs font-semibold uppercase text-(--text-secondary)";
const sectionCountClass = "bg-(--bg-badge) py-0.5 px-1.5 rounded-full text-[11px] text-(--text-secondary)";
const actionBtnClass = "flex items-center gap-1 py-1 px-2 border-none rounded bg-transparent text-(--text-secondary) text-[11px] cursor-pointer transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)";

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

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (isLoadingStatus && !status) {
    return (
      <div className="flex flex-col h-full bg-(--bg-secondary) overflow-hidden">
        <div className="flex items-center justify-center h-full text-(--text-secondary)">Loading status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-(--bg-secondary) overflow-hidden">
        <div className="flex flex-col items-center justify-center h-full gap-3 text-error">
          <span>{error}</span>
          <button className="py-1 px-3 border border-(--border-color) rounded bg-transparent text-(--text-primary) cursor-pointer" onClick={clearError}>Dismiss</button>
        </div>
      </div>
    );
  }

  const unstagedFiles = [...(status?.unstaged ?? []), ...(status?.untracked ?? [])];
  const stagedFiles = status?.staged ?? [];
  const conflictedFiles = status?.conflicted ?? [];

  const hasUnstaged = unstagedFiles.length > 0;
  const hasStaged = stagedFiles.length > 0;
  const hasConflicts = conflictedFiles.length > 0;

  return (
    <div className="flex flex-col h-full bg-(--bg-secondary) overflow-hidden">
      <div className="grid grid-rows-2 flex-1 min-h-0 overflow-hidden">
        {/* Staged changes section */}
        <div className="flex flex-col min-h-0 overflow-hidden border-b border-(--border-color)">
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2">
              <span className={sectionTitleClass}>Staged Changes</span>
              {hasStaged && (
                <span className={sectionCountClass}>{stagedFiles.length}</span>
              )}
            </div>
            <div className="flex gap-1">
              {hasStaged && (
                <button
                  className={actionBtnClass}
                  onClick={unstageAll}
                  title="Unstage all"
                >
                  <Minus size={14} />
                  Unstage All
                </button>
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
            />
          ) : (
            <div className="p-4 text-center text-(--text-tertiary) text-[13px] italic">No staged changes</div>
          )}
        </div>

        {/* Unstaged changes section */}
        <div className="flex flex-col min-h-0 overflow-hidden border-b border-(--border-color) last:border-b-0">
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2">
              <span className={sectionTitleClass}>Unstaged Changes</span>
              {hasUnstaged && (
                <span className={sectionCountClass}>{unstagedFiles.length}</span>
              )}
            </div>
            <div className="flex gap-1">
              {hasUnstaged && (
                <>
                  <button
                    className={actionBtnClass}
                    onClick={stageAll}
                    title="Stage all"
                  >
                    <Plus size={14} />
                    Stage All
                  </button>
                  <button
                    className={cn(actionBtnClass, "hover:bg-error/10 hover:text-error")}
                    onClick={discardAll}
                    title="Discard all changes"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
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
            />
          ) : (
            <div className="p-4 text-center text-(--text-tertiary) text-[13px] italic">No unstaged changes</div>
          )}
        </div>

        {/* Conflicts section */}
        {hasConflicts && (
          <div className="flex flex-col shrink-0 max-h-50 overflow-hidden">
            <div className={cn(sectionHeaderClass, "bg-error/10")}>
              <div className="flex items-center gap-2">
                <span className={sectionTitleClass}>Conflicts</span>
                <span className={sectionCountClass}>{conflictedFiles.length}</span>
              </div>
            </div>
            <FileStatusList
              files={conflictedFiles}
              selectedFile={selectedFile}
              onSelectFile={(file) => selectFile(file, false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
