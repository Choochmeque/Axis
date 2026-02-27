import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { StatusType } from '@/types';
import { useRepositoryStore } from '../../store/repositoryStore';
import { useStagingStore } from '../../store/stagingStore';
import { type DiffMode, DiffView } from '../diff';
import { StagingView } from '../staging';
import { CommitForm } from '../staging/CommitForm';
import { StashDiffView } from '../stash';

export function WorkspaceView() {
  const {
    selectedFile,
    selectedFileDiff,
    isLoadingDiff,
    isSelectedFileStaged,
    stageHunk,
    unstageHunk,
    discardHunk,
  } = useStagingStore();

  // Don't show discard for untracked files (they can only be deleted, not discarded)
  const isUntracked = selectedFile?.status === StatusType.Untracked;
  const canDiscard = !isUntracked;

  const { selectedStash, selectedStashFiles, isLoadingStashFiles, clearStashSelection, commits } =
    useRepositoryStore();

  // Get HEAD commit OID for image diff comparison
  // Skip the virtual "uncommitted" entry that may be first in the graph
  const headCommitOid = commits.find((c) => c.oid !== 'uncommitted')?.oid;

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
      <PanelGroup direction="vertical" autoSaveId="workspace-vertical-layout">
        <Panel defaultSize={80} minSize={50}>
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
                parentCommitOid={headCommitOid}
                onStageHunk={stageHunk}
                onUnstageHunk={unstageHunk}
                onDiscardHunk={canDiscard ? discardHunk : undefined}
              />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="resize-handle-vertical" />
        <Panel defaultSize={20} minSize={10} maxSize={50}>
          <CommitForm />
        </Panel>
      </PanelGroup>
    </div>
  );
}
