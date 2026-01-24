// Re-export all types from generated bindings
export type {
  // Repository types
  Repository,
  RepositoryStatus,
  RepositorySettings,
  RecentRepository,
  FileStatus,

  // Commit types
  Commit,
  LogOptions,
  Signature,

  // Branch types
  Branch,
  BranchCompareResult,
  CreateBranchOptions,
  CheckoutOptions,

  // Diff types
  FileDiff,
  DiffHunk,
  DiffLine,
  DiffOptions,

  // Remote types
  Remote,
  FetchOptions,
  FetchProgress,
  FetchResult,
  UpdatedRef,
  PullOptions,
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
  RebaseAction,
  InteractiveRebaseEntry,
  InteractiveRebaseOptions,
  InteractiveRebasePreview,

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

  // Worktree types
  Worktree,
  AddWorktreeOptions,
  RemoveWorktreeOptions,
  WorktreeResult,

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

  // Gitignore types
  IgnoreOptions,
  IgnoreResult,
  IgnoreSuggestion,
  IgnoreSuggestionType,

  // Integration types
  DetectedProvider,
  IntegrationStatus,
  IntegrationRepoInfo,
  PullRequest,
  PullRequestDetail,
  Issue,
  IssueDetail,
  CIRun,
  CommitStatus,
  Notification,
  CreatePrOptions,
  MergePrOptions,
  CreateIssueOptions,
  IntegrationUser,
  IntegrationLabel,
  CiRunsPage,
  PullRequestsPage,
  IssuesPage,
  NotificationsPage,

  // Avatar types
  AvatarResponse,
  AvatarSource,

  // LFS types
  LfsStatus,
  LfsTrackedPattern,
  LfsFile,
  LfsFetchOptions,
  LfsPullOptions,
  LfsPushOptions,
  LfsMigrateOptions,
  LfsResult,
  LfsEnvironment,
  GitEnvironment,
  LfsPruneOptions,
  LfsPruneResult,

  // Progress types
  GitOperationProgressEvent,

  // Hook types
  HookInfo,
  HookDetails,
  HookTemplate,

  // Custom actions types
  CustomAction,
  ActionVariables,
  ActionExecutionResult,
} from '../bindings/api';

// Import types used locally
import type {
  ActionContext as ActionContextType,
  ActionStorageType as ActionStorageTypeType,
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
  // Integration types
  PrState as PrStateType,
  IssueState as IssueStateType,
  MergeMethod as MergeMethodType,
  ProviderType as ProviderTypeType,
  CIRunStatus as CIRunStatusType,
  CIConclusion as CIConclusionType,
  CommitStatusState as CommitStatusStateType,
  NotificationReason as NotificationReasonType,
  // LFS types
  LfsFileStatus as LfsFileStatusType,
  LfsMigrateMode as LfsMigrateModeType,
  // Reflog types
  ReflogAction as ReflogActionType,
  // Progress types
  ProgressStage as ProgressStageType,
  GitOperationType as GitOperationTypeType,
  // Hook types
  GitHookType as GitHookTypeType,
} from '../bindings/api';

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

// Integration enum helpers
export const PrState: { [K in PrStateType]: K } = {
  Open: 'Open',
  Closed: 'Closed',
  Merged: 'Merged',
  All: 'All',
};

export type PrState = PrStateType;

export const IssueState: { [K in IssueStateType]: K } = {
  Open: 'Open',
  Closed: 'Closed',
  All: 'All',
};

export type IssueState = IssueStateType;

export const MergeMethod: { [K in MergeMethodType]: K } = {
  Merge: 'Merge',
  Squash: 'Squash',
  Rebase: 'Rebase',
};

export type MergeMethod = MergeMethodType;

export const ProviderType: { [K in ProviderTypeType]: K } = {
  GitHub: 'GitHub',
  GitLab: 'GitLab',
  Bitbucket: 'Bitbucket',
  Gitea: 'Gitea',
};

export type ProviderType = ProviderTypeType;

export const CIRunStatus: { [K in CIRunStatusType]: K } = {
  Queued: 'Queued',
  InProgress: 'InProgress',
  Completed: 'Completed',
};

export type CIRunStatus = CIRunStatusType;

export const CIConclusion: { [K in CIConclusionType]: K } = {
  Success: 'Success',
  Failure: 'Failure',
  Cancelled: 'Cancelled',
  Skipped: 'Skipped',
  Neutral: 'Neutral',
  TimedOut: 'TimedOut',
  ActionRequired: 'ActionRequired',
};

export type CIConclusion = CIConclusionType;

export const CommitStatusState: { [K in CommitStatusStateType]: K } = {
  Pending: 'Pending',
  Success: 'Success',
  Failure: 'Failure',
  Error: 'Error',
};

export type CommitStatusState = CommitStatusStateType;

export const NotificationReason: { [K in NotificationReasonType]: K } = {
  Assigned: 'Assigned',
  Author: 'Author',
  Comment: 'Comment',
  Invitation: 'Invitation',
  Manual: 'Manual',
  Mention: 'Mention',
  ReviewRequested: 'ReviewRequested',
  SecurityAlert: 'SecurityAlert',
  StateChange: 'StateChange',
  Subscribed: 'Subscribed',
  TeamMention: 'TeamMention',
  CiActivity: 'CiActivity',
};

export type NotificationReason = NotificationReasonType;

// LFS enum helpers
export const LfsFileStatus: { [K in LfsFileStatusType]: K } = {
  Downloaded: 'Downloaded',
  Pointer: 'Pointer',
  NotLfs: 'NotLfs',
  Unknown: 'Unknown',
};

export type LfsFileStatus = LfsFileStatusType;

export const LfsMigrateMode: { [K in LfsMigrateModeType]: K } = {
  Import: 'Import',
  Export: 'Export',
  Info: 'Info',
};

export type LfsMigrateMode = LfsMigrateModeType;

// Reflog enum helper (excluding Other variant which has data)
export const ReflogAction: {
  [K in Exclude<ReflogActionType, { Other: string }>]: K;
} = {
  Commit: 'Commit',
  CommitAmend: 'CommitAmend',
  CommitInitial: 'CommitInitial',
  Checkout: 'Checkout',
  Merge: 'Merge',
  Rebase: 'Rebase',
  Reset: 'Reset',
  CherryPick: 'CherryPick',
  Revert: 'Revert',
  Pull: 'Pull',
  Clone: 'Clone',
  Branch: 'Branch',
  Stash: 'Stash',
};

export type ReflogAction = ReflogActionType;

// Progress enum helpers
export const ProgressStage: { [K in ProgressStageType]: K } = {
  Connecting: 'Connecting',
  Counting: 'Counting',
  Compressing: 'Compressing',
  Receiving: 'Receiving',
  Resolving: 'Resolving',
  Writing: 'Writing',
  Complete: 'Complete',
  Failed: 'Failed',
  Cancelled: 'Cancelled',
};

export type ProgressStage = ProgressStageType;

export const GitOperationType: { [K in GitOperationTypeType]: K } = {
  Clone: 'Clone',
  Fetch: 'Fetch',
  Push: 'Push',
  Pull: 'Pull',
};

export type GitOperationType = GitOperationTypeType;

// Hook enum helpers
export const GitHookType: { [K in GitHookTypeType]: K } = {
  PreCommit: 'PreCommit',
  PrepareCommitMsg: 'PrepareCommitMsg',
  CommitMsg: 'CommitMsg',
  PostCommit: 'PostCommit',
  PrePush: 'PrePush',
  PostMerge: 'PostMerge',
  PreRebase: 'PreRebase',
  PostCheckout: 'PostCheckout',
  PostRewrite: 'PostRewrite',
};

export type GitHookType = GitHookTypeType;

// Custom actions enum helpers
export const ActionContext: { [K in ActionContextType]: K } = {
  File: 'File',
  Commit: 'Commit',
  Branch: 'Branch',
  Tag: 'Tag',
  Stash: 'Stash',
  Repository: 'Repository',
};

export type ActionContext = ActionContextType;

export const ActionStorageType: { [K in ActionStorageTypeType]: K } = {
  Global: 'Global',
  Repository: 'Repository',
};

export type ActionStorageType = ActionStorageTypeType;

/* eslint-enable @typescript-eslint/naming-convention */
