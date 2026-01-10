import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { StagingView } from '../staging';
import { CommitForm } from '../staging/CommitForm';
import { DiffView, type DiffMode } from '../diff';
import { useStagingStore } from '../../store/stagingStore';

export function WorkspaceView() {
  const {
    selectedFileDiff,
    isLoadingDiff,
    isSelectedFileStaged,
    stageHunk,
    unstageHunk,
    discardHunk,
  } = useStagingStore();

  const diffMode: DiffMode = isSelectedFileStaged ? 'staged' : 'workdir';

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
