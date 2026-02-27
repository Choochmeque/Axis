// Re-export all types from generated bindings
export type {
  ActionExecutionResult,
  ActionVariables,
  AddSubmoduleOptions,
  AddWorktreeOptions,
  ApplyMailboxOptions,
  ApplyPatchOptions,
  // Settings types
  AppSettings,
  // Archive types
  ArchiveOptions,
  ArchiveResult,
  // Avatar types
  AvatarResponse,
  AvatarSource,
  BisectResult,
  // Bisect types
  BisectStartOptions,
  BisectState,
  BlameLine,
  // Blame types
  BlameResult,
  // Branch types
  Branch,
  BranchCompareResult,
  BranchFilter,
  CheckoutOptions,
  // Cherry-pick types
  CherryPickOptions,
  CherryPickResult,
  CIRun,
  CiRunsPage,
  // Commit types
  Commit,
  CommitRef,
  CommitStatus,
  ConflictContent,
  // Conflict types
  ConflictedFile,
  CreateBranchOptions,
  CreateIssueOptions,
  CreatePatchOptions,
  CreatePrOptions,
  CreateTagOptions,
  // Custom actions types
  CustomAction,
  DeleteBranchOptions,
  // Integration types
  DetectedProvider,
  DiffHunk,
  DiffLine,
  DiffOptions,
  ExportSshKeyOptions,
  FetchOptions,
  FetchProgress,
  FetchResult,
  // Diff types
  FileDiff,
  // File log types
  FileLogOptions,
  FileLogResult,
  FileStatus,
  // Patch types
  FormatPatchOptions,
  GenerateSshKeyOptions,
  GitEnvironment,
  // Git-flow types
  GitFlowConfig,
  GitFlowFinishOptions,
  GitFlowInitOptions,
  GitFlowResult,
  // Progress types
  GitOperationProgressEvent,
  GpgKey,
  // Graph types
  GraphCommit,
  GraphEdge,
  GraphOptions,
  GraphResult,
  GrepMatch,
  GrepOptions,
  GrepResult,
  HookDetails,
  // Hook types
  HookInfo,
  HookTemplate,
  // Gitignore types
  IgnoreOptions,
  IgnoreResult,
  IgnoreSuggestion,
  IgnoreSuggestionType,
  ImportSshKeyOptions,
  IntegrationLabel,
  IntegrationRepoInfo,
  IntegrationStatus,
  IntegrationUser,
  InteractiveRebaseEntry,
  InteractiveRebaseOptions,
  InteractiveRebasePreview,
  Issue,
  IssueDetail,
  IssuesPage,
  LargeBinaryFileInfo,
  LfsCheckResult,
  LfsEnvironment,
  LfsFetchOptions,
  LfsFile,
  LfsMigrateOptions,
  LfsPruneOptions,
  LfsPruneResult,
  LfsPullOptions,
  LfsPushOptions,
  LfsResult,
  // LFS types
  LfsStatus,
  LfsTrackedPattern,
  ListRemoteOptions,
  ListSubmoduleOptions,
  ListTagsOptions,
  LogOptions,
  // Merge types
  MergeOptions,
  MergePrOptions,
  MergeResult,
  Notification,
  NotificationsPage,
  // Operation state
  OperationState,
  PatchResult,
  PullOptions,
  PullRequest,
  PullRequestDetail,
  PullRequestsPage,
  PushedRef,
  PushOptions,
  PushResult,
  RebaseAction,
  RebaseOntoOptions,
  // Rebase types
  RebaseOptions,
  RebasePreview,
  RebaseProgress,
  RebaseResult,
  RebaseTarget,
  RecentRepository,
  // Reflog types
  ReflogEntry,
  ReflogOptions,
  // Remote types
  Remote,
  RemoteSshKeyMapping,
  RemoveWorktreeOptions,
  // Repository types
  Repository,
  RepositorySettings,
  RepositoryStatus,
  // Reset types
  ResetOptions,
  // Revert types
  RevertOptions,
  RevertResult,
  // Search types
  SearchOptions,
  SearchResult,
  Signature,
  SignatureVerification,
  SigningConfig,
  SigningTestResult,
  SshKey,
  // SSH Key Management types
  SshKeyInfo,
  StashApplyOptions,
  // Stash types
  StashEntry,
  StashResult,
  StashSaveOptions,
  // Submodule types
  Submodule,
  SubmoduleResult,
  SyncSubmoduleOptions,
  // Tag types
  Tag,
  TagResult,
  TagSignature,
  UpdateDownloadProgressEvent,
  UpdatedRef,
  // Update types
  UpdateInfo,
  UpdateSubmoduleOptions,
  // Worktree types
  Worktree,
  WorktreeResult,
} from '../bindings/api';

// Import types used locally
import type {
  ActionContext as ActionContextType,
  ActionStorageType as ActionStorageTypeType,
  AiProvider as AiProviderType,
  BisectMarkType as BisectMarkTypeType,
  BranchFilterType as BranchFilterTypeType,
  BranchType as BranchTypeType,
  CIConclusion as CIConclusionType,
  CIRunStatus as CIRunStatusType,
  CommitStatusState as CommitStatusStateType,
  ConflictResolution as ConflictResolutionType,
  ConflictType as ConflictTypeType,
  DiffLineType as DiffLineTypeType,
  DiffStatus as DiffStatusType,
  DiffTarget as DiffTargetType,
  EdgeType as EdgeTypeType,
  // Hook types
  GitHookType as GitHookTypeType,
  GitOperationType as GitOperationTypeType,
  HookStage as HookStageType,
  IssueState as IssueStateType,
  // LFS types
  LfsFileStatus as LfsFileStatusType,
  LfsMigrateMode as LfsMigrateModeType,
  MenuAction as MenuActionType,
  MergeMethod as MergeMethodType,
  MergeType as MergeTypeType,
  NotificationReason as NotificationReasonType,
  // Progress types
  ProgressStage as ProgressStageType,
  ProviderType as ProviderTypeType,
  // Integration types
  PrState as PrStateType,
  PushStatus as PushStatusType,
  // Reflog types
  ReflogAction as ReflogActionType,
  RefType as RefTypeType,
  RefUpdateStatus as RefUpdateStatusType,
  RemoteSortOrder as RemoteSortOrderType,
  RepositoryState as RepositoryStateType,
  ResetMode as ResetModeType,
  SigningFormat as SigningFormatType,
  SortOrder as SortOrderType,
  // SSH Key types
  SshKeyAlgorithm as SshKeyAlgorithmType,
  SshKeyFormat as SshKeyFormatType,
  StatusType as StatusTypeType,
  SubmoduleSortOrder as SubmoduleSortOrderType,
  SubmoduleStatus as SubmoduleStatusType,
  Theme as ThemeType,
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
  MergePreview: 'MergePreview',
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

export const SubmoduleSortOrder: { [K in SubmoduleSortOrderType]: K } = {
  Alphabetical: 'Alphabetical',
  AlphabeticalDesc: 'AlphabeticalDesc',
  Path: 'Path',
  PathDesc: 'PathDesc',
};

export type SubmoduleSortOrder = SubmoduleSortOrderType;

export const RemoteSortOrder: { [K in RemoteSortOrderType]: K } = {
  Alphabetical: 'Alphabetical',
  AlphabeticalDesc: 'AlphabeticalDesc',
};

export type RemoteSortOrder = RemoteSortOrderType;

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

// SSH Key enum helpers
export const SshKeyAlgorithm: { [K in SshKeyAlgorithmType]: K } = {
  Ed25519: 'Ed25519',
  Rsa: 'Rsa',
  Ecdsa: 'Ecdsa',
};

export type SshKeyAlgorithm = SshKeyAlgorithmType;

export const SshKeyFormat: { [K in SshKeyFormatType]: K } = {
  Unencrypted: 'Unencrypted',
  EncryptedPem: 'EncryptedPem',
  OpenSsh: 'OpenSsh',
  EncryptedOpenSsh: 'EncryptedOpenSsh',
  Unknown: 'Unknown',
};

export type SshKeyFormat = SshKeyFormatType;

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

// Hook stage enum helpers
export const HookStage: { [K in HookStageType]: K } = {
  Running: 'Running',
  Complete: 'Complete',
  Failed: 'Failed',
  Cancelled: 'Cancelled',
};

export type HookStage = HookStageType;

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
