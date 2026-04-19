import { useEffect, useMemo, useState } from 'react';
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';
import {
  areAllSectionsResolved,
  buildResolvedContent,
  conflictToFileDiff,
} from '@/lib/conflictParser';
import { operationApi } from '@/services/api';
import { ConflictResolution, StatusType } from '@/types';
import type { OperationState } from '@/types';
import { OperationBanners } from '../merge/OperationBanners';
import { useRepositoryStore } from '../../store/repositoryStore';
import { useStagingStore } from '../../store/stagingStore';
import { type DiffMode, DiffView } from '../diff';
import { StagingView } from '../staging';
import { CommitForm } from '../staging/CommitForm';
import { StashDiffView } from '../stash';

export function WorkspaceView() {
  const { defaultLayout: verticalLayout, onLayoutChanged: onVerticalLayoutChanged } =
    useDefaultLayout({
      groupId: 'workspace-vertical-layout',
      storage: localStorage,
    });
  const { defaultLayout: horizontalLayout, onLayoutChanged: onHorizontalLayoutChanged } =
    useDefaultLayout({
      groupId: 'workspace-layout',
      storage: localStorage,
    });
  const {
    status,
    selectedFile,
    selectedFileDiff,
    isLoadingDiff,
    isSelectedFileStaged,
    stageHunk,
    unstageHunk,
    discardHunk,
    loadStatus,
    // Conflict resolution
    selectedConflictContent,
    hunkResolutions,
    resolveHunk,
    resolveAllHunks,
    resolveConflict,
  } = useStagingStore();

  // Check operation state to hide CommitForm panel during rebase/cherry-pick
  const [operationState, setOperationState] = useState<OperationState | null>(null);

  useEffect(() => {
    const loadOperationState = async () => {
      try {
        const state = await operationApi.getState();
        setOperationState(state);
      } catch {
        setOperationState(null);
      }
    };
    loadOperationState();
  }, [status]);

  const showCommitForm = !(
    operationState &&
    typeof operationState === 'object' &&
    ('Rebasing' in operationState || 'CherryPicking' in operationState)
  );

  // Don't show discard for untracked files (they can only be deleted, not discarded)
  const isUntracked = selectedFile?.status === StatusType.Untracked;
  const isConflicted = selectedFile?.status === StatusType.Conflicted;
  const canDiscard = !isUntracked;

  const { selectedStash, selectedStashFiles, isLoadingStashFiles, clearStashSelection, commits } =
    useRepositoryStore();

  // Get HEAD commit OID for image diff comparison
  // Skip the virtual "uncommitted" entry that may be first in the graph
  const headCommitOid = commits.find((c) => c.oid !== 'uncommitted')?.oid;

  // Compute conflict diff if in conflict mode
  const conflictDiff = useMemo(() => {
    if (!selectedConflictContent) return null;
    return conflictToFileDiff(selectedConflictContent);
  }, [selectedConflictContent]);

  // Check if all hunks are resolved
  const allHunksResolved = useMemo(() => {
    if (!selectedConflictContent) return false;
    return areAllSectionsResolved(selectedConflictContent.merged, hunkResolutions);
  }, [selectedConflictContent, hunkResolutions]);

  // Handle marking conflict as resolved
  const handleMarkResolved = async () => {
    if (!selectedConflictContent || !allHunksResolved) return;
    const resolvedContent = buildResolvedContent(selectedConflictContent.merged, hunkResolutions);
    await resolveConflict(ConflictResolution.Merged, resolvedContent);
  };

  // Determine diff mode
  const diffMode: DiffMode = isConflicted
    ? 'conflict'
    : isSelectedFileStaged
      ? 'staged'
      : 'workdir';

  // Get the appropriate diff to display
  const displayDiff = isConflicted ? conflictDiff : selectedFileDiff;

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
      <OperationBanners onComplete={loadStatus} />
      <Group
        orientation="vertical"
        defaultLayout={verticalLayout}
        onLayoutChange={onVerticalLayoutChanged}
      >
        <Panel id="top" defaultSize="80%" minSize="50%">
          <Group
            orientation="horizontal"
            defaultLayout={horizontalLayout}
            onLayoutChange={onHorizontalLayoutChanged}
          >
            <Panel id="staging" defaultSize="35%" minSize="25%" maxSize="50%">
              <StagingView />
            </Panel>
            <Separator className="resize-handle" />
            <Panel id="diff" minSize="50%">
              <DiffView
                diff={displayDiff}
                isLoading={isLoadingDiff}
                mode={diffMode}
                parentCommitOid={headCommitOid}
                onStageHunk={!isConflicted ? stageHunk : undefined}
                onUnstageHunk={!isConflicted ? unstageHunk : undefined}
                onDiscardHunk={!isConflicted && canDiscard ? discardHunk : undefined}
                // Conflict resolution props
                hunkResolutions={isConflicted ? hunkResolutions : undefined}
                onResolveHunk={isConflicted ? resolveHunk : undefined}
                onResolveAll={isConflicted ? resolveAllHunks : undefined}
                onMarkResolved={isConflicted ? handleMarkResolved : undefined}
                allHunksResolved={isConflicted ? allHunksResolved : undefined}
              />
            </Panel>
          </Group>
        </Panel>
        {showCommitForm && (
          <>
            <Separator className="resize-handle-vertical" />
            <Panel id="commit-form" defaultSize="20%" minSize="10%" maxSize="50%">
              <CommitForm />
            </Panel>
          </>
        )}
      </Group>
    </div>
  );
}
