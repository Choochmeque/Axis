// Re-export all types from generated bindings
export type {
  // Repository types
  Repository,
  RepositoryStatus,
  RecentRepository,
  FileStatus,

  // Commit types
  Commit,
  LogOptions,
  Signature,

  // Branch types
  Branch,
  CreateBranchOptions,

  // Diff types
  FileDiff,
  DiffHunk,
  DiffLine,
  DiffOptions,

  // Remote types
  Remote,
  FetchProgress,
  FetchResult,
  UpdatedRef,
  PushOptions,
  PushResult,
  PushedRef,

  // Graph types
  GraphCommit,
  GraphEdge,
  CommitRef,
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

  // File log types
  FileLogOptions,
  FileLogResult,

  // Merge types
  MergeOptions,
  MergeResult,

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
  ConflictContent,

  // Operation state
  OperationState,

  // Bisect types
  BisectStartOptions,
  BisectResult,
  BisectState,

  // Reset types
  ResetOptions,

  // Stash types
  StashEntry,
  StashSaveOptions,
  StashApplyOptions,
  StashResult,

  // Reflog types
  ReflogEntry,
  ReflogAction,
  ReflogOptions,

  // Tag types
  Tag,
  TagSignature,
  CreateTagOptions,
  TagResult,

  // Submodule types
  Submodule,
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
  AppSettings,
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
  AiProvider as AiProviderType,
  BranchType as BranchTypeType,
  BranchFilterType as BranchFilterTypeType,
  SortOrder as SortOrderType,
  RepositoryState as RepositoryStateType,
  StatusType as StatusTypeType,
  DiffTarget as DiffTargetType,
  DiffStatus as DiffStatusType,
  DiffLineType as DiffLineTypeType,
  EdgeType as EdgeTypeType,
  RefType as RefTypeType,
  ConflictResolution as ConflictResolutionType,
  MergeType as MergeTypeType,
  PushStatus as PushStatusType,
  RefUpdateStatus as RefUpdateStatusType,
  ResetMode as ResetModeType,
  Theme as ThemeType,
  SigningFormat as SigningFormatType,
  SubmoduleStatus as SubmoduleStatusType,
  ConflictType as ConflictTypeType,
  MenuAction as MenuActionType,
  BisectMarkType as BisectMarkTypeType,
} from '../bindings/api';

// Frontend-only types (not generated from Rust)

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

export interface PullOptions {
  rebase?: boolean;
  ffOnly?: boolean;
}

export type GitFlowBranchType = 'Feature' | 'Release' | 'Hotfix' | 'Support';

export type ArchiveFormat = 'zip' | 'tar' | 'tar.gz' | 'tar.bz2';

// Re-export the type for type annotations
/* eslint-disable @typescript-eslint/naming-convention */

export const AiProvider: { [K in AiProviderType]: K } = {
  OpenAi: 'OpenAi',
  Anthropic: 'Anthropic',
  Ollama: 'Ollama',
};

export type AiProvider = AiProviderType;

export const BranchType: { [K in BranchTypeType]: K } = {
  Local: 'Local',
  Remote: 'Remote',
};

export type BranchType = BranchTypeType;

export const BranchFilterType: {
  [K in Exclude<BranchFilterTypeType, { Specific: string }>]: K;
} = {
  All: 'All',
  Current: 'Current',
};

export type BranchFilterType = BranchFilterTypeType;

export const SortOrder: { [K in SortOrderType]: K } = {
  DateOrder: 'DateOrder',
  AncestorOrder: 'AncestorOrder',
};

export type SortOrder = SortOrderType;

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

export const DiffTarget: {
  [K in Exclude<
    DiffTargetType,
    { CommitToCommit: { from: string; to: string } } | { Commit: { oid: string } }
  >]: K;
} = {
  WorkdirToIndex: 'WorkdirToIndex',
  IndexToHead: 'IndexToHead',
  WorkdirToHead: 'WorkdirToHead',
};

export type DiffTarget = DiffTargetType;

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

export const DiffStatus: { [K in DiffStatusType]: K } = {
  Added: 'Added',
  Deleted: 'Deleted',
  Modified: 'Modified',
  Renamed: 'Renamed',
  Copied: 'Copied',
  TypeChanged: 'TypeChanged',
  Untracked: 'Untracked',
  Conflicted: 'Conflicted',
};

export type DiffStatus = DiffStatusType;

export const DiffLineType: { [K in DiffLineTypeType]: K } = {
  Context: 'Context',
  Addition: 'Addition',
  Deletion: 'Deletion',
  Header: 'Header',
  Binary: 'Binary',
};

export type DiffLineType = DiffLineTypeType;

export const EdgeType: { [K in EdgeTypeType]: K } = {
  Straight: 'Straight',
  Merge: 'Merge',
  Branch: 'Branch',
};

export type EdgeType = EdgeTypeType;

export const RefType: { [K in RefTypeType]: K } = {
  LocalBranch: 'LocalBranch',
  RemoteBranch: 'RemoteBranch',
  Tag: 'Tag',
};

export type RefType = RefTypeType;

export const ConflictResolution: { [K in ConflictResolutionType]: K } = {
  Ours: 'Ours',
  Theirs: 'Theirs',
  Merged: 'Merged',
};

export type ConflictResolution = ConflictResolutionType;

export const MergeType: { [K in MergeTypeType]: K } = {
  UpToDate: 'UpToDate',
  FastForward: 'FastForward',
  Normal: 'Normal',
  Conflicted: 'Conflicted',
};

export type MergeType = MergeTypeType;

export const PushStatus: { [K in PushStatusType]: K } = {
  Ok: 'Ok',
  Rejected: 'Rejected',
  UpToDate: 'UpToDate',
  RemoteRejected: 'RemoteRejected',
};

export type PushStatus = PushStatusType;

export const RefUpdateStatus: { [K in RefUpdateStatusType]: K } = {
  FastForward: 'FastForward',
  Forced: 'Forced',
  New: 'New',
  Deleted: 'Deleted',
  Rejected: 'Rejected',
  UpToDate: 'UpToDate',
};

export type RefUpdateStatus = RefUpdateStatusType;

export const ResetMode: { [K in ResetModeType]: K } = {
  Soft: 'Soft',
  Mixed: 'Mixed',
  Hard: 'Hard',
};

export type ResetMode = ResetModeType;

export const Theme: { [K in ThemeType]: K } = {
  Light: 'Light',
  Dark: 'Dark',
  System: 'System',
};

export type Theme = ThemeType;

export const SigningFormat: { [K in SigningFormatType]: K } = {
  Gpg: 'Gpg',
  Ssh: 'Ssh',
};

export type SigningFormat = SigningFormatType;

export const SubmoduleStatus: { [K in SubmoduleStatusType]: K } = {
  Current: 'Current',
  Modified: 'Modified',
  Uninitialized: 'Uninitialized',
  Missing: 'Missing',
  Conflict: 'Conflict',
  Dirty: 'Dirty',
  Unknown: 'Unknown',
};

export type SubmoduleStatus = SubmoduleStatusType;

export const ConflictType: { [K in ConflictTypeType]: K } = {
  Content: 'Content',
  DeleteModify: 'DeleteModify',
  AddAdd: 'AddAdd',
  RenameRename: 'RenameRename',
  RenameModify: 'RenameModify',
  Binary: 'Binary',
};

export type ConflictType = ConflictTypeType;

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

export const BisectMarkType: { [K in BisectMarkTypeType]: K } = {
  Good: 'Good',
  Bad: 'Bad',
  Skip: 'Skip',
};

export type BisectMarkType = BisectMarkTypeType;

/* eslint-enable @typescript-eslint/naming-convention */
