import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { StagingView } from '../staging';
import { CommitForm } from '../staging/CommitForm';
import { DiffView } from '../diff';
import { useStagingStore } from '../../store/stagingStore';
import './WorkspaceView.css';

export function WorkspaceView() {
  const { selectedFileDiff, isLoadingDiff } = useStagingStore();

  return (
    <div className="workspace-view">
      <div className="workspace-panels">
        <PanelGroup direction="horizontal" autoSaveId="workspace-layout">
          <Panel defaultSize={35} minSize={25} maxSize={50}>
            <StagingView />
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel minSize={50}>
            <DiffView diff={selectedFileDiff} isLoading={isLoadingDiff} />
          </Panel>
        </PanelGroup>
      </div>
      <CommitForm />
    </div>
  );
}
