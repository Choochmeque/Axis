import { create } from 'zustand';

import type {
  BisectResult,
  Commit,
  CherryPickResult,
  RebaseResult,
  ResetMode,
  RevertResult,
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

  // Archive dialog
  archiveDialog: ArchiveDialogState;

  // Patch dialog
  patchDialog: PatchDialogState;

  // Bisect dialog
  bisectDialog: BisectDialogState;

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

export const useDialogStore = create<DialogState>((set) => ({
  tagDialog: initialTagDialogState,
  createBranchDialog: initialCreateBranchDialogState,
  cherryPickDialog: initialCherryPickDialogState,
  resetConfirmDialog: initialResetConfirmDialogState,
  revertCommitDialog: initialRevertCommitDialogState,
  rebaseDialog: initialRebaseDialogState,
  archiveDialog: initialArchiveDialogState,
  patchDialog: initialPatchDialogState,
  bisectDialog: initialBisectDialogState,

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
}));
