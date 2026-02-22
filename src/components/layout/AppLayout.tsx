import { ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import {
  CheckoutConflictDialog,
  CreateBranchDialog,
  CheckoutBranchDialog,
  DeleteBranchDialog,
  RenameBranchDialog,
} from '../branches';
import { BranchCompareDialog } from '../branches/BranchCompareDialog';
import {
  CherryPickDialog,
  InteractiveRebaseDialog,
  RewordDialog,
  EditPauseDialog,
  MergeDialog,
  RebaseDialog,
  RebaseOntoDialog,
  ResetConfirmDialog,
  RevertCommitDialog,
} from '../merge';
import { ActionConfirmDialog, ActionOutputDialog } from '../custom-actions';
import { TagDialog, DeleteTagDialog } from '../tags';
import { ArchiveDialog } from '../history/ArchiveDialog';
import { PatchDialog } from '../history/PatchDialog';
import { BisectDialog } from '../merge/BisectDialog';
import { FetchDialog, PushDialog, PullDialog, PassphraseDialog } from '../remotes';
import { StashDialog } from '../stash/StashDialog';
import { DiscardConfirmDialog } from '../staging/DiscardConfirmDialog';
import { LargeBinaryWarningDialog } from '../staging/LargeBinaryWarningDialog';
import { SettingsDialog } from '../settings/SettingsDialog';
import { RepositorySettingsDialog } from '../settings/RepositorySettingsDialog';
import { useRepositoryStore } from '../../store/repositoryStore';
import { useDialogStore } from '../../store/dialogStore';
import { useFileWatcher, useGitProgress, useHookProgress } from '../../hooks';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Start file watcher and listen for changes
  useFileWatcher();
  // Listen for git operation progress events
  useGitProgress();
  // Listen for hook progress events
  useHookProgress();

  const {
    checkoutConflict,
    stashAndCheckout,
    discardAndCheckout,
    clearCheckoutConflict,
    loadTags,
    loadCommits,
  } = useRepositoryStore();
  const {
    tagDialog,
    closeTagDialog,
    createBranchDialog,
    closeCreateBranchDialog,
    cherryPickDialog,
    closeCherryPickDialog,
    resetConfirmDialog,
    closeResetConfirmDialog,
    revertCommitDialog,
    closeRevertCommitDialog,
    rebaseDialog,
    closeRebaseDialog,
    rebaseOntoDialog,
    closeRebaseOntoDialog,
    archiveDialog,
    closeArchiveDialog,
    patchDialog,
    closePatchDialog,
    bisectDialog,
    closeBisectDialog,
    fetchDialog,
    closeFetchDialog,
    pushDialog,
    closePushDialog,
    pullDialog,
    closePullDialog,
    checkoutBranchDialog,
    closeCheckoutBranchDialog,
    deleteBranchDialog,
    closeDeleteBranchDialog,
    deleteTagDialog,
    closeDeleteTagDialog,
    renameBranchDialog,
    closeRenameBranchDialog,
    branchCompareDialog,
    closeBranchCompareDialog,
    stashDialog,
    closeStashDialog,
    discardConfirmDialog,
    closeDiscardConfirmDialog,
    largeBinaryWarningDialog,
    closeLargeBinaryWarningDialog,
    settingsDialog,
    closeSettingsDialog,
    repositorySettingsDialog,
    closeRepositorySettingsDialog,
    mergeDialog,
    closeMergeDialog,
    passphraseDialog,
    closePassphraseDialog,
  } = useDialogStore();
  const { loadStatus, loadBranches, repository, remotes } = useRepositoryStore();

  return (
    <>
      <div className="flex flex-col h-full bg-(--bg-primary) text-(--text-primary)">
        <Toolbar />
        <div className="flex-1 flex overflow-hidden">
          <PanelGroup direction="horizontal" autoSaveId="main-layout">
            <Panel defaultSize={20} minSize={15} maxSize={40}>
              <Sidebar />
            </Panel>
            <PanelResizeHandle className="resize-handle" />
            <Panel minSize={50}>
              <main className="flex-1 h-full flex flex-col overflow-hidden bg-(--bg-secondary)">
                {children}
              </main>
            </Panel>
          </PanelGroup>
        </div>
        <StatusBar />
      </div>

      <CheckoutConflictDialog
        isOpen={checkoutConflict !== null}
        onClose={clearCheckoutConflict}
        targetBranch={checkoutConflict?.targetBranch ?? ''}
        conflictingFiles={checkoutConflict?.files ?? []}
        onStashAndSwitch={stashAndCheckout}
        onDiscardAndSwitch={discardAndCheckout}
      />
      <InteractiveRebaseDialog />
      <RewordDialog />
      <EditPauseDialog />
      <ActionConfirmDialog />
      <ActionOutputDialog />
      <TagDialog
        isOpen={tagDialog.isOpen}
        onClose={closeTagDialog}
        onTagCreated={async (result) => {
          tagDialog.onTagCreated?.(result);
          await loadTags();
          await loadCommits();
          closeTagDialog();
        }}
        targetCommit={tagDialog.targetCommit}
        targetCommitSummary={tagDialog.targetCommitSummary}
      />
      <CreateBranchDialog
        open={createBranchDialog.isOpen}
        onOpenChange={(open) => !open && closeCreateBranchDialog()}
        startPoint={createBranchDialog.startPoint}
      />
      <CherryPickDialog
        isOpen={cherryPickDialog.isOpen}
        onClose={closeCherryPickDialog}
        onCherryPickComplete={async (result) => {
          cherryPickDialog.onCherryPickComplete?.(result);
          await loadCommits();
          await loadStatus();
          closeCherryPickDialog();
        }}
        commits={cherryPickDialog.commits}
      />
      {resetConfirmDialog.commit && (
        <ResetConfirmDialog
          isOpen={resetConfirmDialog.isOpen}
          onClose={closeResetConfirmDialog}
          onResetComplete={async () => {
            resetConfirmDialog.onResetComplete?.();
            await loadCommits();
            await loadStatus();
            await loadBranches();
            closeResetConfirmDialog();
          }}
          commit={resetConfirmDialog.commit}
          mode={resetConfirmDialog.mode}
          currentBranch={resetConfirmDialog.currentBranch || repository?.currentBranch || 'unknown'}
        />
      )}
      <RevertCommitDialog
        isOpen={revertCommitDialog.isOpen}
        onClose={closeRevertCommitDialog}
        onRevertComplete={async (result) => {
          revertCommitDialog.onRevertComplete?.(result);
          await loadCommits();
          await loadStatus();
          closeRevertCommitDialog();
        }}
        commits={revertCommitDialog.commits}
      />
      <RebaseDialog
        isOpen={rebaseDialog.isOpen}
        onClose={closeRebaseDialog}
        onRebaseComplete={async (result) => {
          rebaseDialog.onRebaseComplete?.(result);
          await loadCommits();
          await loadStatus();
          await loadBranches();
          closeRebaseDialog();
        }}
        currentBranch={rebaseDialog.currentBranch || repository?.currentBranch || ''}
        targetCommit={rebaseDialog.targetCommit}
      />
      <RebaseOntoDialog
        isOpen={rebaseOntoDialog.isOpen}
        onClose={closeRebaseOntoDialog}
        onRebaseComplete={async (result) => {
          rebaseOntoDialog.onRebaseComplete?.(result);
          await loadCommits();
          await loadStatus();
          await loadBranches();
          closeRebaseOntoDialog();
        }}
        currentBranch={rebaseOntoDialog.currentBranch || repository?.currentBranch || ''}
        newBase={rebaseOntoDialog.newBase}
      />
      <MergeDialog
        isOpen={mergeDialog.isOpen}
        onClose={closeMergeDialog}
        onMergeComplete={async (result) => {
          mergeDialog.onMergeComplete?.(result);
          await loadCommits();
          await loadStatus();
          await loadBranches();
          closeMergeDialog();
        }}
        currentBranch={repository?.currentBranch || ''}
        sourceBranch={mergeDialog.sourceBranch}
      />
      <ArchiveDialog
        isOpen={archiveDialog.isOpen}
        onClose={closeArchiveDialog}
        commitOid={archiveDialog.commitOid}
        commitSummary={archiveDialog.commitSummary}
      />
      <PatchDialog
        isOpen={patchDialog.isOpen}
        onClose={closePatchDialog}
        mode={patchDialog.mode}
        commitOid={patchDialog.commitOid}
        commitSummary={patchDialog.commitSummary}
        onSuccess={() => {
          patchDialog.onSuccess?.();
          closePatchDialog();
        }}
      />
      <BisectDialog
        isOpen={bisectDialog.isOpen}
        onClose={closeBisectDialog}
        onBisectComplete={async (result) => {
          bisectDialog.onBisectComplete?.(result);
          await loadCommits();
          await loadStatus();
          closeBisectDialog();
        }}
        badCommit={bisectDialog.badCommit}
        goodCommit={bisectDialog.goodCommit}
      />
      <FetchDialog isOpen={fetchDialog.isOpen} onClose={closeFetchDialog} />
      <PushDialog isOpen={pushDialog.isOpen} onClose={closePushDialog} />
      <PullDialog isOpen={pullDialog.isOpen} onClose={closePullDialog} />
      <PassphraseDialog
        isOpen={passphraseDialog.isOpen}
        keyPath={passphraseDialog.keyPath}
        onSuccess={() => {
          passphraseDialog.onSuccess?.();
          closePassphraseDialog();
        }}
        onCancel={() => {
          passphraseDialog.onCancel?.();
          closePassphraseDialog();
        }}
      />
      <CheckoutBranchDialog
        isOpen={checkoutBranchDialog.isOpen}
        onClose={closeCheckoutBranchDialog}
      />
      <DeleteBranchDialog
        isOpen={deleteBranchDialog.isOpen}
        onClose={closeDeleteBranchDialog}
        branch={deleteBranchDialog.branch}
      />
      <DeleteTagDialog
        isOpen={deleteTagDialog.isOpen}
        onClose={closeDeleteTagDialog}
        tag={deleteTagDialog.tag}
        remotes={remotes}
      />
      <RenameBranchDialog
        isOpen={renameBranchDialog.isOpen}
        onClose={closeRenameBranchDialog}
        branch={renameBranchDialog.branch ?? null}
      />
      <BranchCompareDialog
        isOpen={branchCompareDialog.isOpen}
        onClose={closeBranchCompareDialog}
        baseBranch={branchCompareDialog.baseBranch ?? null}
        compareBranch={branchCompareDialog.compareBranch ?? null}
      />
      <StashDialog isOpen={stashDialog.isOpen} onClose={closeStashDialog} />
      <DiscardConfirmDialog
        isOpen={discardConfirmDialog.isOpen}
        onClose={closeDiscardConfirmDialog}
        mode={discardConfirmDialog.mode}
        filePath={discardConfirmDialog.filePath}
        onConfirm={() => {
          discardConfirmDialog.onConfirm?.();
          closeDiscardConfirmDialog();
        }}
      />
      <LargeBinaryWarningDialog
        isOpen={largeBinaryWarningDialog.isOpen}
        onClose={closeLargeBinaryWarningDialog}
        files={largeBinaryWarningDialog.files}
        lfsInstalled={largeBinaryWarningDialog.lfsInstalled}
        lfsInitialized={largeBinaryWarningDialog.lfsInitialized}
        onStageAnyway={() => {
          largeBinaryWarningDialog.onStageAnyway?.();
          closeLargeBinaryWarningDialog();
        }}
        onTrackWithLfs={(patterns) => {
          largeBinaryWarningDialog.onTrackWithLfs?.(patterns);
          closeLargeBinaryWarningDialog();
        }}
      />
      <SettingsDialog isOpen={settingsDialog.isOpen} onClose={closeSettingsDialog} />
      <RepositorySettingsDialog
        isOpen={repositorySettingsDialog.isOpen}
        onClose={closeRepositorySettingsDialog}
      />
    </>
  );
}
