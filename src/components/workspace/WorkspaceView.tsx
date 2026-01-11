import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { StagingView } from '../staging';
import { CommitForm } from '../staging/CommitForm';
import { DiffView, type DiffMode } from '../diff';
import { StashDiffView } from '../stash';
import { useStagingStore } from '../../store/stagingStore';
import { useRepositoryStore } from '../../store/repositoryStore';

export function WorkspaceView() {
  const {
    selectedFileDiff,
    isLoadingDiff,
    isSelectedFileStaged,
    stageHunk,
    unstageHunk,
    discardHunk,
  } = useStagingStore();

  const { selectedStash, selectedStashFiles, isLoadingStashFiles, clearStashSelection } =
    useRepositoryStore();

  const diffMode: DiffMode = isSelectedFileStaged ? 'staged' : 'workdir';

  // Show stash diff view when a stash is selected
  if (selectedStash) {
    return (
      <StashDiffView
        stash={selectedStash}
        files={selectedStashFiles}
        isLoading={isLoadingStashFiles}
        onClose={clearStashSelection}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="workspace-layout">
          <Panel defaultSize={35} minSize={25} maxSize={50}>
            <StagingView />
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel minSize={50}>
            <DiffView
              diff={selectedFileDiff}
              isLoading={isLoadingDiff}
              mode={diffMode}
              onStageHunk={stageHunk}
              onUnstageHunk={unstageHunk}
              onDiscardHunk={discardHunk}
            />
          </Panel>
        </PanelGroup>
      </div>
      <CommitForm />
    </div>
  );
}
