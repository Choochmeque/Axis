import { describe, it, expect, beforeEach } from 'vitest';
import { useDialogStore } from './dialogStore';
import { ResetMode } from '@/types';
import type { Branch, Commit } from '@/types';

describe('dialogStore', () => {
  const mockCommit: Commit = {
    oid: 'abc123',
    shortOid: 'abc123',
    message: 'This is a test commit message',
    summary: 'Test commit',
    author: { name: 'Test', email: 'test@example.com', timestamp: new Date().toISOString() },
    committer: { name: 'Test', email: 'test@example.com', timestamp: new Date().toISOString() },
    parentOids: [],
    timestamp: new Date().toISOString(),
    isMerge: false,
    signature: null,
  };

  const mockBranch: Branch = {
    name: 'main',
    fullName: 'refs/heads/main',
    branchType: 'Local',
    isHead: true,
    upstream: null,
    ahead: null,
    behind: null,
    targetOid: 'abc123',
    lastCommitSummary: 'Initial commit',
    lastCommitTime: new Date().toISOString(),
  };

  beforeEach(() => {
    // Reset all dialogs to initial state
    useDialogStore.setState({
      tagDialog: {
        isOpen: false,
        targetCommit: undefined,
        targetCommitSummary: undefined,
        onTagCreated: undefined,
      },
      createBranchDialog: { isOpen: false, startPoint: undefined },
      cherryPickDialog: { isOpen: false, commits: [], onCherryPickComplete: undefined },
      resetConfirmDialog: {
        isOpen: false,
        commit: null,
        mode: ResetMode.Mixed,
        currentBranch: '',
        onResetComplete: undefined,
      },
      revertCommitDialog: { isOpen: false, commits: [], onRevertComplete: undefined },
      rebaseDialog: {
        isOpen: false,
        currentBranch: '',
        targetCommit: undefined,
        onRebaseComplete: undefined,
      },
      archiveDialog: { isOpen: false, commitOid: undefined, commitSummary: undefined },
      patchDialog: {
        isOpen: false,
        mode: 'create',
        commitOid: undefined,
        commitSummary: undefined,
        onSuccess: undefined,
      },
      bisectDialog: {
        isOpen: false,
        badCommit: undefined,
        goodCommit: undefined,
        onBisectComplete: undefined,
      },
      fetchDialog: { isOpen: false },
      pushDialog: { isOpen: false },
      pullDialog: { isOpen: false },
      checkoutBranchDialog: { isOpen: false },
      deleteBranchDialog: { isOpen: false, branch: undefined },
      renameBranchDialog: { isOpen: false, branch: undefined },
      branchCompareDialog: { isOpen: false, baseBranch: undefined, compareBranch: undefined },
      stashDialog: { isOpen: false },
      discardConfirmDialog: {
        isOpen: false,
        mode: 'file',
        filePath: undefined,
        onConfirm: undefined,
      },
      settingsDialog: { isOpen: false },
      repositorySettingsDialog: { isOpen: false },
      mergeDialog: { isOpen: false, sourceBranch: undefined, onMergeComplete: undefined },
    });
  });

  describe('tagDialog', () => {
    it('should open tag dialog without options', () => {
      useDialogStore.getState().openTagDialog();

      expect(useDialogStore.getState().tagDialog.isOpen).toBe(true);
    });

    it('should open tag dialog with options', () => {
      const callback = vi.fn();
      useDialogStore.getState().openTagDialog({
        targetCommit: 'abc123',
        targetCommitSummary: 'Test commit',
        onTagCreated: callback,
      });

      const dialog = useDialogStore.getState().tagDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.targetCommit).toBe('abc123');
      expect(dialog.targetCommitSummary).toBe('Test commit');
      expect(dialog.onTagCreated).toBe(callback);
    });

    it('should close tag dialog and reset state', () => {
      useDialogStore.getState().openTagDialog({ targetCommit: 'abc123' });
      useDialogStore.getState().closeTagDialog();

      const dialog = useDialogStore.getState().tagDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.targetCommit).toBeUndefined();
    });
  });

  describe('createBranchDialog', () => {
    it('should open create branch dialog', () => {
      useDialogStore.getState().openCreateBranchDialog();

      expect(useDialogStore.getState().createBranchDialog.isOpen).toBe(true);
    });

    it('should open create branch dialog with startPoint', () => {
      useDialogStore.getState().openCreateBranchDialog({ startPoint: 'abc123' });

      const dialog = useDialogStore.getState().createBranchDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.startPoint).toBe('abc123');
    });

    it('should close create branch dialog', () => {
      useDialogStore.getState().openCreateBranchDialog({ startPoint: 'abc123' });
      useDialogStore.getState().closeCreateBranchDialog();

      const dialog = useDialogStore.getState().createBranchDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.startPoint).toBeUndefined();
    });
  });

  describe('cherryPickDialog', () => {
    it('should open cherry pick dialog with commits', () => {
      const callback = vi.fn();
      useDialogStore.getState().openCherryPickDialog({
        commits: [mockCommit],
        onCherryPickComplete: callback,
      });

      const dialog = useDialogStore.getState().cherryPickDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.commits).toHaveLength(1);
      expect(dialog.onCherryPickComplete).toBe(callback);
    });

    it('should close cherry pick dialog', () => {
      useDialogStore.getState().openCherryPickDialog({ commits: [mockCommit] });
      useDialogStore.getState().closeCherryPickDialog();

      const dialog = useDialogStore.getState().cherryPickDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.commits).toHaveLength(0);
    });
  });

  describe('resetConfirmDialog', () => {
    it('should open reset confirm dialog', () => {
      const callback = vi.fn();
      useDialogStore.getState().openResetConfirmDialog({
        commit: mockCommit,
        mode: ResetMode.Hard,
        currentBranch: 'main',
        onResetComplete: callback,
      });

      const dialog = useDialogStore.getState().resetConfirmDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.commit).toEqual(mockCommit);
      expect(dialog.mode).toBe(ResetMode.Hard);
      expect(dialog.currentBranch).toBe('main');
      expect(dialog.onResetComplete).toBe(callback);
    });

    it('should close reset confirm dialog', () => {
      useDialogStore.getState().openResetConfirmDialog({
        commit: mockCommit,
        mode: ResetMode.Hard,
        currentBranch: 'main',
      });
      useDialogStore.getState().closeResetConfirmDialog();

      const dialog = useDialogStore.getState().resetConfirmDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.commit).toBeNull();
    });
  });

  describe('revertCommitDialog', () => {
    it('should open revert commit dialog', () => {
      const callback = vi.fn();
      useDialogStore.getState().openRevertCommitDialog({
        commits: [mockCommit],
        onRevertComplete: callback,
      });

      const dialog = useDialogStore.getState().revertCommitDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.commits).toHaveLength(1);
      expect(dialog.onRevertComplete).toBe(callback);
    });

    it('should close revert commit dialog', () => {
      useDialogStore.getState().openRevertCommitDialog({ commits: [mockCommit] });
      useDialogStore.getState().closeRevertCommitDialog();

      const dialog = useDialogStore.getState().revertCommitDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.commits).toHaveLength(0);
    });
  });

  describe('rebaseDialog', () => {
    it('should open rebase dialog', () => {
      const callback = vi.fn();
      useDialogStore.getState().openRebaseDialog({
        currentBranch: 'feature',
        targetCommit: mockCommit,
        onRebaseComplete: callback,
      });

      const dialog = useDialogStore.getState().rebaseDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.currentBranch).toBe('feature');
      expect(dialog.targetCommit).toEqual(mockCommit);
      expect(dialog.onRebaseComplete).toBe(callback);
    });

    it('should close rebase dialog', () => {
      useDialogStore.getState().openRebaseDialog({ currentBranch: 'feature' });
      useDialogStore.getState().closeRebaseDialog();

      const dialog = useDialogStore.getState().rebaseDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.currentBranch).toBe('');
    });
  });

  describe('archiveDialog', () => {
    it('should open archive dialog', () => {
      useDialogStore.getState().openArchiveDialog({
        commitOid: 'abc123',
        commitSummary: 'Test commit',
      });

      const dialog = useDialogStore.getState().archiveDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.commitOid).toBe('abc123');
      expect(dialog.commitSummary).toBe('Test commit');
    });

    it('should close archive dialog', () => {
      useDialogStore.getState().openArchiveDialog({ commitOid: 'abc123' });
      useDialogStore.getState().closeArchiveDialog();

      const dialog = useDialogStore.getState().archiveDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.commitOid).toBeUndefined();
    });
  });

  describe('patchDialog', () => {
    it('should open patch dialog with create mode', () => {
      const callback = vi.fn();
      useDialogStore.getState().openPatchDialog({
        mode: 'create',
        commitOid: 'abc123',
        commitSummary: 'Test',
        onSuccess: callback,
      });

      const dialog = useDialogStore.getState().patchDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.mode).toBe('create');
      expect(dialog.commitOid).toBe('abc123');
      expect(dialog.onSuccess).toBe(callback);
    });

    it('should open patch dialog with apply mode', () => {
      useDialogStore.getState().openPatchDialog({ mode: 'apply' });

      expect(useDialogStore.getState().patchDialog.mode).toBe('apply');
    });

    it('should default to create mode', () => {
      useDialogStore.getState().openPatchDialog({});

      expect(useDialogStore.getState().patchDialog.mode).toBe('create');
    });

    it('should close patch dialog', () => {
      useDialogStore.getState().openPatchDialog({ mode: 'apply' });
      useDialogStore.getState().closePatchDialog();

      const dialog = useDialogStore.getState().patchDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.mode).toBe('create');
    });
  });

  describe('bisectDialog', () => {
    it('should open bisect dialog', () => {
      const callback = vi.fn();
      useDialogStore.getState().openBisectDialog({
        badCommit: 'bad123',
        goodCommit: 'good456',
        onBisectComplete: callback,
      });

      const dialog = useDialogStore.getState().bisectDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.badCommit).toBe('bad123');
      expect(dialog.goodCommit).toBe('good456');
      expect(dialog.onBisectComplete).toBe(callback);
    });

    it('should close bisect dialog', () => {
      useDialogStore.getState().openBisectDialog({ badCommit: 'bad123' });
      useDialogStore.getState().closeBisectDialog();

      const dialog = useDialogStore.getState().bisectDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.badCommit).toBeUndefined();
    });
  });

  describe('simple dialogs', () => {
    it('should open and close fetch dialog', () => {
      useDialogStore.getState().openFetchDialog();
      expect(useDialogStore.getState().fetchDialog.isOpen).toBe(true);

      useDialogStore.getState().closeFetchDialog();
      expect(useDialogStore.getState().fetchDialog.isOpen).toBe(false);
    });

    it('should open and close push dialog', () => {
      useDialogStore.getState().openPushDialog();
      expect(useDialogStore.getState().pushDialog.isOpen).toBe(true);

      useDialogStore.getState().closePushDialog();
      expect(useDialogStore.getState().pushDialog.isOpen).toBe(false);
    });

    it('should open and close pull dialog', () => {
      useDialogStore.getState().openPullDialog();
      expect(useDialogStore.getState().pullDialog.isOpen).toBe(true);

      useDialogStore.getState().closePullDialog();
      expect(useDialogStore.getState().pullDialog.isOpen).toBe(false);
    });

    it('should open and close checkout branch dialog', () => {
      useDialogStore.getState().openCheckoutBranchDialog();
      expect(useDialogStore.getState().checkoutBranchDialog.isOpen).toBe(true);

      useDialogStore.getState().closeCheckoutBranchDialog();
      expect(useDialogStore.getState().checkoutBranchDialog.isOpen).toBe(false);
    });

    it('should open and close stash dialog', () => {
      useDialogStore.getState().openStashDialog();
      expect(useDialogStore.getState().stashDialog.isOpen).toBe(true);

      useDialogStore.getState().closeStashDialog();
      expect(useDialogStore.getState().stashDialog.isOpen).toBe(false);
    });

    it('should open and close settings dialog', () => {
      useDialogStore.getState().openSettingsDialog();
      expect(useDialogStore.getState().settingsDialog.isOpen).toBe(true);

      useDialogStore.getState().closeSettingsDialog();
      expect(useDialogStore.getState().settingsDialog.isOpen).toBe(false);
    });

    it('should open and close repository settings dialog', () => {
      useDialogStore.getState().openRepositorySettingsDialog();
      expect(useDialogStore.getState().repositorySettingsDialog.isOpen).toBe(true);

      useDialogStore.getState().closeRepositorySettingsDialog();
      expect(useDialogStore.getState().repositorySettingsDialog.isOpen).toBe(false);
    });
  });

  describe('deleteBranchDialog', () => {
    it('should open delete branch dialog with branch', () => {
      useDialogStore.getState().openDeleteBranchDialog({ branch: mockBranch });

      const dialog = useDialogStore.getState().deleteBranchDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.branch).toEqual(mockBranch);
    });

    it('should close delete branch dialog', () => {
      useDialogStore.getState().openDeleteBranchDialog({ branch: mockBranch });
      useDialogStore.getState().closeDeleteBranchDialog();

      const dialog = useDialogStore.getState().deleteBranchDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.branch).toBeUndefined();
    });
  });

  describe('renameBranchDialog', () => {
    it('should open rename branch dialog with branch', () => {
      useDialogStore.getState().openRenameBranchDialog({ branch: mockBranch });

      const dialog = useDialogStore.getState().renameBranchDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.branch).toEqual(mockBranch);
    });

    it('should close rename branch dialog', () => {
      useDialogStore.getState().openRenameBranchDialog({ branch: mockBranch });
      useDialogStore.getState().closeRenameBranchDialog();

      const dialog = useDialogStore.getState().renameBranchDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.branch).toBeUndefined();
    });
  });

  describe('branchCompareDialog', () => {
    it('should open branch compare dialog', () => {
      const compareBranch: Branch = { ...mockBranch, name: 'feature' };
      useDialogStore.getState().openBranchCompareDialog({
        baseBranch: mockBranch,
        compareBranch,
      });

      const dialog = useDialogStore.getState().branchCompareDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.baseBranch).toEqual(mockBranch);
      expect(dialog.compareBranch).toEqual(compareBranch);
    });

    it('should close branch compare dialog', () => {
      useDialogStore.getState().openBranchCompareDialog({
        baseBranch: mockBranch,
        compareBranch: mockBranch,
      });
      useDialogStore.getState().closeBranchCompareDialog();

      const dialog = useDialogStore.getState().branchCompareDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.baseBranch).toBeUndefined();
    });
  });

  describe('discardConfirmDialog', () => {
    it('should open discard confirm dialog for file', () => {
      const callback = vi.fn();
      useDialogStore.getState().openDiscardConfirmDialog({
        mode: 'file',
        filePath: 'src/test.ts',
        onConfirm: callback,
      });

      const dialog = useDialogStore.getState().discardConfirmDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.mode).toBe('file');
      expect(dialog.filePath).toBe('src/test.ts');
      expect(dialog.onConfirm).toBe(callback);
    });

    it('should open discard confirm dialog for all', () => {
      useDialogStore.getState().openDiscardConfirmDialog({ mode: 'all' });

      const dialog = useDialogStore.getState().discardConfirmDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.mode).toBe('all');
    });

    it('should close discard confirm dialog', () => {
      useDialogStore.getState().openDiscardConfirmDialog({ mode: 'all' });
      useDialogStore.getState().closeDiscardConfirmDialog();

      const dialog = useDialogStore.getState().discardConfirmDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.mode).toBe('file');
    });
  });

  describe('mergeDialog', () => {
    it('should open merge dialog without options', () => {
      useDialogStore.getState().openMergeDialog();

      expect(useDialogStore.getState().mergeDialog.isOpen).toBe(true);
    });

    it('should open merge dialog with options', () => {
      const callback = vi.fn();
      useDialogStore.getState().openMergeDialog({
        sourceBranch: 'feature',
        onMergeComplete: callback,
      });

      const dialog = useDialogStore.getState().mergeDialog;
      expect(dialog.isOpen).toBe(true);
      expect(dialog.sourceBranch).toBe('feature');
      expect(dialog.onMergeComplete).toBe(callback);
    });

    it('should close merge dialog', () => {
      useDialogStore.getState().openMergeDialog({ sourceBranch: 'feature' });
      useDialogStore.getState().closeMergeDialog();

      const dialog = useDialogStore.getState().mergeDialog;
      expect(dialog.isOpen).toBe(false);
      expect(dialog.sourceBranch).toBeUndefined();
    });
  });
});
