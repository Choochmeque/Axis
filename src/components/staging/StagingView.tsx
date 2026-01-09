import { useEffect } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { useStagingStore } from '../../store/stagingStore';
import { FileStatusList } from './FileStatusList';
import { CommitForm } from './CommitForm';
import './StagingView.css';

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
      <div className="staging-view">
        <div className="staging-loading">Loading status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="staging-view">
        <div className="staging-error">
          <span>{error}</span>
          <button onClick={clearError}>Dismiss</button>
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
    <div className="staging-view">
      {/* Unstaged changes section */}
      <div className="staging-section">
        <div className="staging-section-header">
          <span className="staging-section-title">Unstaged Changes</span>
          <div className="staging-section-actions">
            {hasUnstaged && (
              <>
                <button
                  className="staging-action-btn"
                  onClick={stageAll}
                  title="Stage all"
                >
                  <Plus size={14} />
                  Stage All
                </button>
                <button
                  className="staging-action-btn danger"
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
            title=""
            selectedFile={selectedFile}
            onSelectFile={(file) => selectFile(file, false)}
            onStage={stageFile}
            onDiscard={discardFile}
            showStageButton
            showDiscardButton
          />
        ) : (
          <div className="staging-empty">No unstaged changes</div>
        )}
      </div>

      {/* Staged changes section */}
      <div className="staging-section">
        <div className="staging-section-header">
          <span className="staging-section-title">Staged Changes</span>
          <div className="staging-section-actions">
            {hasStaged && (
              <button
                className="staging-action-btn"
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
            title=""
            selectedFile={selectedFile}
            onSelectFile={(file) => selectFile(file, true)}
            onUnstage={unstageFile}
            showUnstageButton
          />
        ) : (
          <div className="staging-empty">No staged changes</div>
        )}
      </div>

      {/* Conflicts section */}
      {hasConflicts && (
        <div className="staging-section conflicts">
          <div className="staging-section-header">
            <span className="staging-section-title">Conflicts</span>
          </div>
          <FileStatusList
            files={conflictedFiles}
            title=""
            selectedFile={selectedFile}
            onSelectFile={(file) => selectFile(file, false)}
          />
        </div>
      )}

      {/* Commit form */}
      <CommitForm />
    </div>
  );
}
