import { create } from 'zustand';

import type {
  BisectResult,
  Branch,
  Commit,
  CherryPickResult,
  LargeBinaryFileInfo,
  MergeResult,
  RebaseResult,
  ResetMode,
  RevertResult,
  Tag,
  TagResult,
} from '@/types';
import { ResetMode as ResetModeEnum } from '@/types';

// Tag dialog state
interface TagDialogState {
  isOpen: boolean;
  targetCommit?: string;
  targetCommitSummary?: string;
  onTagCreated?: (result: TagResult) => void;
}

// Create branch dialog state
interface CreateBranchDialogState {
  isOpen: boolean;
  startPoint?: string;
}

// Cherry pick dialog state
interface CherryPickDialogState {
  isOpen: boolean;
  commits: Commit[];
  onCherryPickComplete?: (result: CherryPickResult) => void;
}

// Reset confirm dialog state
interface ResetConfirmDialogState {
  isOpen: boolean;
  commit: Commit | null;
  mode: ResetMode;
  currentBranch: string;
  onResetComplete?: () => void;
}

// Revert commit dialog state
interface RevertCommitDialogState {
  isOpen: boolean;
  commits: Commit[];
  onRevertComplete?: (result: RevertResult) => void;
}

// Rebase dialog state
interface RebaseDialogState {
  isOpen: boolean;
  currentBranch: string;
  targetCommit?: Commit;
  onRebaseComplete?: (result: RebaseResult) => void;
}

// Rebase onto dialog state
interface RebaseOntoDialogState {
  isOpen: boolean;
  currentBranch: string;
  newBase: string;
  onRebaseComplete?: (result: RebaseResult) => void;
}

// Archive dialog state
interface ArchiveDialogState {
  isOpen: boolean;
  commitOid?: string;
  commitSummary?: string;
}

// Patch dialog state
interface PatchDialogState {
  isOpen: boolean;
  mode: 'create' | 'apply';
  commitOid?: string;
  commitSummary?: string;
  onSuccess?: () => void;
}

// Bisect dialog state
interface BisectDialogState {
  isOpen: boolean;
  badCommit?: string;
  goodCommit?: string;
  onBisectComplete?: (result: BisectResult) => void;
}

// Fetch dialog state
interface FetchDialogState {
  isOpen: boolean;
}

// Push dialog state
interface PushDialogState {
  isOpen: boolean;
}

// Pull dialog state
interface PullDialogState {
  isOpen: boolean;
}

// Checkout branch dialog state
interface CheckoutBranchDialogState {
  isOpen: boolean;
}

// Delete branch dialog state
interface DeleteBranchDialogState {
  isOpen: boolean;
  branch?: Branch;
}

// Delete tag dialog state
interface DeleteTagDialogState {
  isOpen: boolean;
  tag?: Tag;
}

// Rename branch dialog state
interface RenameBranchDialogState {
  isOpen: boolean;
  branch?: Branch;
}

// Branch compare dialog state
interface BranchCompareDialogState {
  isOpen: boolean;
  baseBranch?: Branch;
  compareBranch?: Branch;
}

// Stash dialog state
interface StashDialogState {
  isOpen: boolean;
}

// Discard confirm dialog state
interface DiscardConfirmDialogState {
  isOpen: boolean;
  mode: 'file' | 'all';
  filePath?: string;
  onConfirm?: () => void;
}

// Settings dialog state
interface SettingsDialogState {
  isOpen: boolean;
}

// Repository settings dialog state
interface RepositorySettingsDialogState {
  isOpen: boolean;
}

// Merge dialog state
interface MergeDialogState {
  isOpen: boolean;
  sourceBranch?: string;
  onMergeComplete?: (result: MergeResult) => void;
}

// Large binary warning dialog state
interface LargeBinaryWarningDialogState {
  isOpen: boolean;
  files: LargeBinaryFileInfo[];
  pendingPaths: string[];
  lfsInstalled: boolean;
  lfsInitialized: boolean;
  onStageAnyway?: () => void;
  onTrackWithLfs?: (patterns: string[]) => void;
}

// Passphrase dialog state
interface PassphraseDialogState {
  isOpen: boolean;
  keyPath: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface DialogState {
  // Tag dialog
  tagDialog: TagDialogState;

  // Create branch dialog
  createBranchDialog: CreateBranchDialogState;

  // Cherry pick dialog
  cherryPickDialog: CherryPickDialogState;

  // Reset confirm dialog
  resetConfirmDialog: ResetConfirmDialogState;

  // Revert commit dialog
  revertCommitDialog: RevertCommitDialogState;

  // Rebase dialog
  rebaseDialog: RebaseDialogState;

  // Rebase onto dialog
  rebaseOntoDialog: RebaseOntoDialogState;

  // Archive dialog
  archiveDialog: ArchiveDialogState;

  // Patch dialog
  patchDialog: PatchDialogState;

  // Bisect dialog
  bisectDialog: BisectDialogState;

  // Fetch dialog
  fetchDialog: FetchDialogState;

  // Push dialog
  pushDialog: PushDialogState;

  // Pull dialog
  pullDialog: PullDialogState;

  // Checkout branch dialog
  checkoutBranchDialog: CheckoutBranchDialogState;

  // Delete branch dialog
  deleteBranchDialog: DeleteBranchDialogState;

  // Delete tag dialog
  deleteTagDialog: DeleteTagDialogState;

  // Rename branch dialog
  renameBranchDialog: RenameBranchDialogState;

  // Branch compare dialog
  branchCompareDialog: BranchCompareDialogState;

  // Stash dialog
  stashDialog: StashDialogState;

  // Discard confirm dialog
  discardConfirmDialog: DiscardConfirmDialogState;

  // Settings dialog
  settingsDialog: SettingsDialogState;

  // Repository settings dialog
  repositorySettingsDialog: RepositorySettingsDialogState;

  // Merge dialog
  mergeDialog: MergeDialogState;

  // Large binary warning dialog
  largeBinaryWarningDialog: LargeBinaryWarningDialogState;

  // Passphrase dialog
  passphraseDialog: PassphraseDialogState;

  // Tag dialog actions
  openTagDialog: (options?: {
    targetCommit?: string;
    targetCommitSummary?: string;
    onTagCreated?: (result: TagResult) => void;
  }) => void;
  closeTagDialog: () => void;

  // Create branch dialog actions
  openCreateBranchDialog: (options?: { startPoint?: string }) => void;
  closeCreateBranchDialog: () => void;

  // Cherry pick dialog actions
  openCherryPickDialog: (options: {
    commits: Commit[];
    onCherryPickComplete?: (result: CherryPickResult) => void;
  }) => void;
  closeCherryPickDialog: () => void;

  // Reset confirm dialog actions
  openResetConfirmDialog: (options: {
    commit: Commit;
    mode: ResetMode;
    currentBranch: string;
    onResetComplete?: () => void;
  }) => void;
  closeResetConfirmDialog: () => void;

  // Revert commit dialog actions
  openRevertCommitDialog: (options: {
    commits: Commit[];
    onRevertComplete?: (result: RevertResult) => void;
  }) => void;
  closeRevertCommitDialog: () => void;

  // Rebase dialog actions
  openRebaseDialog: (options: {
    currentBranch: string;
    targetCommit?: Commit;
    onRebaseComplete?: (result: RebaseResult) => void;
  }) => void;
  closeRebaseDialog: () => void;

  // Rebase onto dialog actions
  openRebaseOntoDialog: (options: {
    currentBranch: string;
    newBase: string;
    onRebaseComplete?: (result: RebaseResult) => void;
  }) => void;
  closeRebaseOntoDialog: () => void;

  // Archive dialog actions
  openArchiveDialog: (options: { commitOid?: string; commitSummary?: string }) => void;
  closeArchiveDialog: () => void;

  // Patch dialog actions
  openPatchDialog: (options: {
    mode?: 'create' | 'apply';
    commitOid?: string;
    commitSummary?: string;
    onSuccess?: () => void;
  }) => void;
  closePatchDialog: () => void;

  // Bisect dialog actions
  openBisectDialog: (options: {
    badCommit?: string;
    goodCommit?: string;
    onBisectComplete?: (result: BisectResult) => void;
  }) => void;
  closeBisectDialog: () => void;

  // Fetch dialog actions
  openFetchDialog: () => void;
  closeFetchDialog: () => void;

  // Push dialog actions
  openPushDialog: () => void;
  closePushDialog: () => void;

  // Pull dialog actions
  openPullDialog: () => void;
  closePullDialog: () => void;

  // Checkout branch dialog actions
  openCheckoutBranchDialog: () => void;
  closeCheckoutBranchDialog: () => void;

  // Delete branch dialog actions
  openDeleteBranchDialog: (options: { branch: Branch }) => void;
  closeDeleteBranchDialog: () => void;

  // Delete tag dialog actions
  openDeleteTagDialog: (options: { tag: Tag }) => void;
  closeDeleteTagDialog: () => void;

  // Rename branch dialog actions
  openRenameBranchDialog: (options: { branch: Branch }) => void;
  closeRenameBranchDialog: () => void;

  // Branch compare dialog actions
  openBranchCompareDialog: (options: { baseBranch: Branch; compareBranch: Branch }) => void;
  closeBranchCompareDialog: () => void;

  // Stash dialog actions
  openStashDialog: () => void;
  closeStashDialog: () => void;

  // Discard confirm dialog actions
  openDiscardConfirmDialog: (options: {
    mode: 'file' | 'all';
    filePath?: string;
    onConfirm?: () => void;
  }) => void;
  closeDiscardConfirmDialog: () => void;

  // Settings dialog actions
  openSettingsDialog: () => void;
  closeSettingsDialog: () => void;

  // Repository settings dialog actions
  openRepositorySettingsDialog: () => void;
  closeRepositorySettingsDialog: () => void;

  // Merge dialog actions
  openMergeDialog: (options?: {
    sourceBranch?: string;
    onMergeComplete?: (result: MergeResult) => void;
  }) => void;
  closeMergeDialog: () => void;

  // Large binary warning dialog actions
  openLargeBinaryWarningDialog: (options: {
    files: LargeBinaryFileInfo[];
    pendingPaths: string[];
    lfsInstalled: boolean;
    lfsInitialized: boolean;
    onStageAnyway?: () => void;
    onTrackWithLfs?: (patterns: string[]) => void;
  }) => void;
  closeLargeBinaryWarningDialog: () => void;

  // Passphrase dialog actions
  openPassphraseDialog: (options: {
    keyPath: string;
    onSuccess?: () => void;
    onCancel?: () => void;
  }) => void;
  closePassphraseDialog: () => void;
}

const initialTagDialogState: TagDialogState = {
  isOpen: false,
  targetCommit: undefined,
  targetCommitSummary: undefined,
  onTagCreated: undefined,
};

const initialCreateBranchDialogState: CreateBranchDialogState = {
  isOpen: false,
  startPoint: undefined,
};

const initialCherryPickDialogState: CherryPickDialogState = {
  isOpen: false,
  commits: [],
  onCherryPickComplete: undefined,
};

const initialResetConfirmDialogState: ResetConfirmDialogState = {
  isOpen: false,
  commit: null,
  mode: ResetModeEnum.Mixed,
  currentBranch: '',
  onResetComplete: undefined,
};

const initialRevertCommitDialogState: RevertCommitDialogState = {
  isOpen: false,
  commits: [],
  onRevertComplete: undefined,
};

const initialRebaseDialogState: RebaseDialogState = {
  isOpen: false,
  currentBranch: '',
  targetCommit: undefined,
  onRebaseComplete: undefined,
};

const initialRebaseOntoDialogState: RebaseOntoDialogState = {
  isOpen: false,
  currentBranch: '',
  newBase: '',
  onRebaseComplete: undefined,
};

const initialArchiveDialogState: ArchiveDialogState = {
  isOpen: false,
  commitOid: undefined,
  commitSummary: undefined,
};

const initialPatchDialogState: PatchDialogState = {
  isOpen: false,
  mode: 'create',
  commitOid: undefined,
  commitSummary: undefined,
  onSuccess: undefined,
};

const initialBisectDialogState: BisectDialogState = {
  isOpen: false,
  badCommit: undefined,
  goodCommit: undefined,
  onBisectComplete: undefined,
};

const initialFetchDialogState: FetchDialogState = {
  isOpen: false,
};

const initialPushDialogState: PushDialogState = {
  isOpen: false,
};

const initialPullDialogState: PullDialogState = {
  isOpen: false,
};

const initialCheckoutBranchDialogState: CheckoutBranchDialogState = {
  isOpen: false,
};

const initialDeleteBranchDialogState: DeleteBranchDialogState = {
  isOpen: false,
  branch: undefined,
};

const initialDeleteTagDialogState: DeleteTagDialogState = {
  isOpen: false,
  tag: undefined,
};

const initialRenameBranchDialogState: RenameBranchDialogState = {
  isOpen: false,
  branch: undefined,
};

const initialBranchCompareDialogState: BranchCompareDialogState = {
  isOpen: false,
  baseBranch: undefined,
  compareBranch: undefined,
};

const initialStashDialogState: StashDialogState = {
  isOpen: false,
};

const initialDiscardConfirmDialogState: DiscardConfirmDialogState = {
  isOpen: false,
  mode: 'file',
  filePath: undefined,
  onConfirm: undefined,
};

const initialSettingsDialogState: SettingsDialogState = {
  isOpen: false,
};

const initialRepositorySettingsDialogState: RepositorySettingsDialogState = {
  isOpen: false,
};

const initialMergeDialogState: MergeDialogState = {
  isOpen: false,
  sourceBranch: undefined,
  onMergeComplete: undefined,
};

const initialLargeBinaryWarningDialogState: LargeBinaryWarningDialogState = {
  isOpen: false,
  files: [],
  pendingPaths: [],
  lfsInstalled: false,
  lfsInitialized: false,
  onStageAnyway: undefined,
  onTrackWithLfs: undefined,
};

const initialPassphraseDialogState: PassphraseDialogState = {
  isOpen: false,
  keyPath: null,
  onSuccess: undefined,
  onCancel: undefined,
};

export const useDialogStore = create<DialogState>((set) => ({
  tagDialog: initialTagDialogState,
  createBranchDialog: initialCreateBranchDialogState,
  cherryPickDialog: initialCherryPickDialogState,
  resetConfirmDialog: initialResetConfirmDialogState,
  revertCommitDialog: initialRevertCommitDialogState,
  rebaseDialog: initialRebaseDialogState,
  rebaseOntoDialog: initialRebaseOntoDialogState,
  archiveDialog: initialArchiveDialogState,
  patchDialog: initialPatchDialogState,
  bisectDialog: initialBisectDialogState,
  fetchDialog: initialFetchDialogState,
  pushDialog: initialPushDialogState,
  pullDialog: initialPullDialogState,
  checkoutBranchDialog: initialCheckoutBranchDialogState,
  deleteBranchDialog: initialDeleteBranchDialogState,
  deleteTagDialog: initialDeleteTagDialogState,
  renameBranchDialog: initialRenameBranchDialogState,
  branchCompareDialog: initialBranchCompareDialogState,
  stashDialog: initialStashDialogState,
  discardConfirmDialog: initialDiscardConfirmDialogState,
  settingsDialog: initialSettingsDialogState,
  repositorySettingsDialog: initialRepositorySettingsDialogState,
  mergeDialog: initialMergeDialogState,
  largeBinaryWarningDialog: initialLargeBinaryWarningDialogState,
  passphraseDialog: initialPassphraseDialogState,

  openTagDialog: (options) => {
    set({
      tagDialog: {
        isOpen: true,
        targetCommit: options?.targetCommit,
        targetCommitSummary: options?.targetCommitSummary,
        onTagCreated: options?.onTagCreated,
      },
    });
  },

  closeTagDialog: () => {
    set({ tagDialog: initialTagDialogState });
  },

  openCreateBranchDialog: (options) => {
    set({
      createBranchDialog: {
        isOpen: true,
        startPoint: options?.startPoint,
      },
    });
  },

  closeCreateBranchDialog: () => {
    set({ createBranchDialog: initialCreateBranchDialogState });
  },

  openCherryPickDialog: (options) => {
    set({
      cherryPickDialog: {
        isOpen: true,
        commits: options.commits,
        onCherryPickComplete: options.onCherryPickComplete,
      },
    });
  },

  closeCherryPickDialog: () => {
    set({ cherryPickDialog: initialCherryPickDialogState });
  },

  openResetConfirmDialog: (options) => {
    set({
      resetConfirmDialog: {
        isOpen: true,
        commit: options.commit,
        mode: options.mode,
        currentBranch: options.currentBranch,
        onResetComplete: options.onResetComplete,
      },
    });
  },

  closeResetConfirmDialog: () => {
    set({ resetConfirmDialog: initialResetConfirmDialogState });
  },

  openRevertCommitDialog: (options) => {
    set({
      revertCommitDialog: {
        isOpen: true,
        commits: options.commits,
        onRevertComplete: options.onRevertComplete,
      },
    });
  },

  closeRevertCommitDialog: () => {
    set({ revertCommitDialog: initialRevertCommitDialogState });
  },

  openRebaseDialog: (options) => {
    set({
      rebaseDialog: {
        isOpen: true,
        currentBranch: options.currentBranch,
        targetCommit: options.targetCommit,
        onRebaseComplete: options.onRebaseComplete,
      },
    });
  },

  closeRebaseDialog: () => {
    set({ rebaseDialog: initialRebaseDialogState });
  },

  openRebaseOntoDialog: (options) => {
    set({
      rebaseOntoDialog: {
        isOpen: true,
        currentBranch: options.currentBranch,
        newBase: options.newBase,
        onRebaseComplete: options.onRebaseComplete,
      },
    });
  },

  closeRebaseOntoDialog: () => {
    set({ rebaseOntoDialog: initialRebaseOntoDialogState });
  },

  openArchiveDialog: (options) => {
    set({
      archiveDialog: {
        isOpen: true,
        commitOid: options.commitOid,
        commitSummary: options.commitSummary,
      },
    });
  },

  closeArchiveDialog: () => {
    set({ archiveDialog: initialArchiveDialogState });
  },

  openPatchDialog: (options) => {
    set({
      patchDialog: {
        isOpen: true,
        mode: options.mode ?? 'create',
        commitOid: options.commitOid,
        commitSummary: options.commitSummary,
        onSuccess: options.onSuccess,
      },
    });
  },

  closePatchDialog: () => {
    set({ patchDialog: initialPatchDialogState });
  },

  openBisectDialog: (options) => {
    set({
      bisectDialog: {
        isOpen: true,
        badCommit: options.badCommit,
        goodCommit: options.goodCommit,
        onBisectComplete: options.onBisectComplete,
      },
    });
  },

  closeBisectDialog: () => {
    set({ bisectDialog: initialBisectDialogState });
  },

  openFetchDialog: () => {
    set({ fetchDialog: { isOpen: true } });
  },

  closeFetchDialog: () => {
    set({ fetchDialog: initialFetchDialogState });
  },

  openPushDialog: () => {
    set({ pushDialog: { isOpen: true } });
  },

  closePushDialog: () => {
    set({ pushDialog: initialPushDialogState });
  },

  openPullDialog: () => {
    set({ pullDialog: { isOpen: true } });
  },

  closePullDialog: () => {
    set({ pullDialog: initialPullDialogState });
  },

  openCheckoutBranchDialog: () => {
    set({ checkoutBranchDialog: { isOpen: true } });
  },

  closeCheckoutBranchDialog: () => {
    set({ checkoutBranchDialog: initialCheckoutBranchDialogState });
  },

  openDeleteBranchDialog: (options) => {
    set({
      deleteBranchDialog: {
        isOpen: true,
        branch: options.branch,
      },
    });
  },

  closeDeleteBranchDialog: () => {
    set({ deleteBranchDialog: initialDeleteBranchDialogState });
  },

  openDeleteTagDialog: (options) => {
    set({
      deleteTagDialog: {
        isOpen: true,
        tag: options.tag,
      },
    });
  },

  closeDeleteTagDialog: () => {
    set({ deleteTagDialog: initialDeleteTagDialogState });
  },

  openRenameBranchDialog: (options) => {
    set({
      renameBranchDialog: {
        isOpen: true,
        branch: options.branch,
      },
    });
  },

  closeRenameBranchDialog: () => {
    set({ renameBranchDialog: initialRenameBranchDialogState });
  },

  openBranchCompareDialog: (options) => {
    set({
      branchCompareDialog: {
        isOpen: true,
        baseBranch: options.baseBranch,
        compareBranch: options.compareBranch,
      },
    });
  },

  closeBranchCompareDialog: () => {
    set({ branchCompareDialog: initialBranchCompareDialogState });
  },

  openStashDialog: () => {
    set({ stashDialog: { isOpen: true } });
  },

  closeStashDialog: () => {
    set({ stashDialog: initialStashDialogState });
  },

  openDiscardConfirmDialog: (options) => {
    set({
      discardConfirmDialog: {
        isOpen: true,
        mode: options.mode,
        filePath: options.filePath,
        onConfirm: options.onConfirm,
      },
    });
  },

  closeDiscardConfirmDialog: () => {
    set({ discardConfirmDialog: initialDiscardConfirmDialogState });
  },

  openSettingsDialog: () => {
    set({ settingsDialog: { isOpen: true } });
  },

  closeSettingsDialog: () => {
    set({ settingsDialog: initialSettingsDialogState });
  },

  openRepositorySettingsDialog: () => {
    set({ repositorySettingsDialog: { isOpen: true } });
  },

  closeRepositorySettingsDialog: () => {
    set({ repositorySettingsDialog: initialRepositorySettingsDialogState });
  },

  openMergeDialog: (options) => {
    set({
      mergeDialog: {
        isOpen: true,
        sourceBranch: options?.sourceBranch,
        onMergeComplete: options?.onMergeComplete,
      },
    });
  },

  closeMergeDialog: () => {
    set({ mergeDialog: initialMergeDialogState });
  },

  openLargeBinaryWarningDialog: (options) => {
    set({
      largeBinaryWarningDialog: {
        isOpen: true,
        files: options.files,
        pendingPaths: options.pendingPaths,
        lfsInstalled: options.lfsInstalled,
        lfsInitialized: options.lfsInitialized,
        onStageAnyway: options.onStageAnyway,
        onTrackWithLfs: options.onTrackWithLfs,
      },
    });
  },

  closeLargeBinaryWarningDialog: () => {
    set({ largeBinaryWarningDialog: initialLargeBinaryWarningDialogState });
  },

  openPassphraseDialog: (options) => {
    set({
      passphraseDialog: {
        isOpen: true,
        keyPath: options.keyPath,
        onSuccess: options.onSuccess,
        onCancel: options.onCancel,
      },
    });
  },

  closePassphraseDialog: () => {
    set({ passphraseDialog: initialPassphraseDialogState });
  },
}));
