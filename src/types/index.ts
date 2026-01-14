// Re-export all types from generated bindings
export type {
  // Repository types
  Repository,
  RepositoryStatus,
  RecentRepository,
  FileStatus,

  // Commit types
  Commit,
  Signature,

  // Branch types
  Branch,
  BranchFilterType,
  SortOrder,

  // Diff types
  FileDiff,
  DiffHunk,
  DiffLine,
  DiffLineType,
  DiffStatus,
  DiffOptions,

  // Remote types
  Remote,
  FetchProgress,
  FetchResult,
  UpdatedRef,
  RefUpdateStatus,
  PushResult,
  PushedRef,
  PushStatus,

  // Graph types
  GraphCommit,
  GraphEdge,
  EdgeType,
  CommitRef,
  RefType,
  GraphOptions,
  GraphResult,

  // Blame types
  BlameResult,
  BlameLine,

  // Search types
  SearchOptions,
  SearchResult,
  GrepOptions,
  GrepMatch,
  GrepResult,

  // Merge types
  MergeOptions,
  MergeResult,
  MergeType,

  // Rebase types
  RebaseOptions,
  RebaseResult,
  RebasePreview,
  RebaseTarget,

  // Cherry-pick types
  CherryPickOptions,
  CherryPickResult,

  // Revert types
  RevertOptions,
  RevertResult,

  // Conflict types
  ConflictedFile,
  ConflictType,
  ConflictContent,
  ConflictResolution,

  // Operation state
  OperationState,

  // Reset types
  ResetMode,
  ResetOptions,

  // Stash types
  StashEntry,
  StashSaveOptions,
  StashApplyOptions,
  StashResult,

  // Tag types
  Tag,
  TagSignature,
  CreateTagOptions,
  TagResult,

  // Submodule types
  Submodule,
  SubmoduleStatus,
  AddSubmoduleOptions,
  UpdateSubmoduleOptions,
  SyncSubmoduleOptions,
  SubmoduleResult,

  // Git-flow types
  GitFlowConfig,
  GitFlowInitOptions,
  GitFlowFinishOptions,
  GitFlowResult,

  // Settings types
  Theme,
  AppSettings,
  SigningFormat,
  SigningConfig,
  GpgKey,
  SshKey,
  SigningTestResult,

  // Archive types
  ArchiveOptions,
  ArchiveResult,

  // Patch types
  FormatPatchOptions,
  CreatePatchOptions,
  ApplyPatchOptions,
  ApplyMailboxOptions,
  PatchResult,
} from '../bindings/api';

// Import types used locally
import type {
  BranchType as BranchTypeType,
  BranchFilterType,
  SortOrder,
  RepositoryState as RepositoryStateType,
  StatusType as StatusTypeType,
  MenuAction as MenuActionType,
} from '../bindings/api';

// Frontend-only types (not generated from Rust)

export interface LogOptions {
  limit?: number;
  skip?: number;
  fromRef?: string;
  branchFilter?: BranchFilterType;
  includeRemotes?: boolean;
  sortOrder?: SortOrder;
}

export interface CreateBranchOptions {
  startPoint?: string;
  force?: boolean;
  track?: string;
}

export interface CheckoutOptions {
  create?: boolean;
  force?: boolean;
  track?: string;
}

export interface FetchOptions {
  prune?: boolean;
  tags?: boolean;
  depth?: number;
}

export interface PushOptions {
  force?: boolean;
  setUpstream?: boolean;
  tags?: boolean;
}

export interface PullOptions {
  rebase?: boolean;
  ffOnly?: boolean;
}

export type GitFlowBranchType = 'Feature' | 'Release' | 'Hotfix' | 'Support';

export type ArchiveFormat = 'zip' | 'tar' | 'tar.gz' | 'tar.bz2';

// Re-export the type for type annotations
/* eslint-disable @typescript-eslint/naming-convention */

export const BranchType: { [K in BranchTypeType]: K } = {
  Local: 'Local',
  Remote: 'Remote',
};

export type BranchType = BranchTypeType;

export const RepositoryState: { [K in RepositoryStateType]: K } = {
  Clean: 'Clean',
  Merging: 'Merging',
  Rebasing: 'Rebasing',
  RebasingInteractive: 'RebasingInteractive',
  CherryPicking: 'CherryPicking',
  Reverting: 'Reverting',
  Bisecting: 'Bisecting',
  ApplyMailbox: 'ApplyMailbox',
  ApplyMailboxOrRebase: 'ApplyMailboxOrRebase',
};

export type RepositoryState = RepositoryStateType;

export const StatusType: { [K in StatusTypeType]: K } = {
  Untracked: 'Untracked',
  Added: 'Added',
  Modified: 'Modified',
  Deleted: 'Deleted',
  Renamed: 'Renamed',
  Copied: 'Copied',
  TypeChanged: 'TypeChanged',
  Ignored: 'Ignored',
  Conflicted: 'Conflicted',
};

export type StatusType = StatusTypeType;

export const MenuAction: { [K in MenuActionType]: K } = {
  NewWindow: 'NewWindow',
  OpenRepository: 'OpenRepository',
  CloseRepository: 'CloseRepository',
  Settings: 'Settings',
  Refresh: 'Refresh',
  ToggleSidebar: 'ToggleSidebar',
  Fetch: 'Fetch',
  Pull: 'Pull',
  Push: 'Push',
  StageAll: 'StageAll',
  UnstageAll: 'UnstageAll',
  Commit: 'Commit',
  NewBranch: 'NewBranch',
  NewTag: 'NewTag',
  Stash: 'Stash',
  PopStash: 'PopStash',
};

export type MenuAction = MenuActionType;
