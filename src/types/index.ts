export interface Repository {
  id: string;
  name: string;
  path: string;
  is_bare: boolean;
  current_branch: string | null;
  state: RepositoryState;
}

export type RepositoryState =
  | 'clean'
  | 'merging'
  | 'rebasing'
  | 'rebasing_interactive'
  | 'cherry_picking'
  | 'reverting'
  | 'bisecting'
  | 'apply_mailbox'
  | 'apply_mailbox_or_rebase';

export interface Commit {
  oid: string;
  short_oid: string;
  message: string;
  summary: string;
  author: Signature;
  committer: Signature;
  parent_oids: string[];
  timestamp: string;
  is_merge: boolean;
}

export interface Signature {
  name: string;
  email: string;
  timestamp: string;
}

export interface Branch {
  name: string;
  full_name: string;
  branch_type: BranchType;
  is_head: boolean;
  upstream: string | null;
  ahead: number | null;
  behind: number | null;
  target_oid: string;
  last_commit_summary: string;
  last_commit_time: string;
}

export type BranchType = 'local' | 'remote';

export interface FileStatus {
  path: string;
  status: StatusType;
  staged_status: StatusType | null;
  unstaged_status: StatusType | null;
  is_conflict: boolean;
  old_path: string | null;
}

export type StatusType =
  | 'untracked'
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'type_changed'
  | 'ignored'
  | 'conflicted';

export interface RepositoryStatus {
  staged: FileStatus[];
  unstaged: FileStatus[];
  untracked: FileStatus[];
  conflicted: FileStatus[];
}

export interface RecentRepository {
  path: string;
  name: string;
  last_opened: string;
}

export interface LogOptions {
  limit?: number;
  skip?: number;
  from_ref?: string;
}

// Diff types
export interface FileDiff {
  old_path: string | null;
  new_path: string | null;
  old_oid: string | null;
  new_oid: string | null;
  status: DiffStatus;
  binary: boolean;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

export type DiffStatus =
  | 'added'
  | 'deleted'
  | 'modified'
  | 'renamed'
  | 'copied'
  | 'type_changed'
  | 'untracked'
  | 'conflicted';

export interface DiffHunk {
  header: string;
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  line_type: DiffLineType;
  content: string;
  old_line_no: number | null;
  new_line_no: number | null;
}

export type DiffLineType =
  | 'context'
  | 'addition'
  | 'deletion'
  | 'header'
  | 'binary';

export interface DiffOptions {
  context_lines?: number;
  ignore_whitespace?: boolean;
  ignore_whitespace_eol?: boolean;
}

// File watcher events
export type FileWatchEvent =
  | { type: 'files_changed'; paths: string[] }
  | { type: 'index_changed' }
  | { type: 'ref_changed'; ref_name: string }
  | { type: 'head_changed' }
  | { type: 'watch_error'; message: string };

// Remote types
export interface Remote {
  name: string;
  url: string | null;
  push_url: string | null;
  fetch_refspecs: string[];
  push_refspecs: string[];
}

export interface FetchProgress {
  total_objects: number;
  indexed_objects: number;
  received_objects: number;
  local_objects: number;
  total_deltas: number;
  indexed_deltas: number;
  received_bytes: number;
}

export interface FetchResult {
  remote: string;
  updated_refs: UpdatedRef[];
  stats: FetchProgress;
}

export interface UpdatedRef {
  ref_name: string;
  old_oid: string | null;
  new_oid: string | null;
  status: RefUpdateStatus;
}

export type RefUpdateStatus =
  | 'fast_forward'
  | 'forced'
  | 'new'
  | 'deleted'
  | 'rejected'
  | 'up_to_date';

export interface PushResult {
  remote: string;
  pushed_refs: PushedRef[];
}

export interface PushedRef {
  ref_name: string;
  status: PushStatus;
  message: string | null;
}

export type PushStatus = 'ok' | 'rejected' | 'up_to_date' | 'remote_rejected';

// Branch operation options
export interface CreateBranchOptions {
  start_point?: string;
  force?: boolean;
  track?: string;
}

export interface CheckoutOptions {
  create?: boolean;
  force?: boolean;
  track?: string;
}

// Remote operation options
export interface FetchOptions {
  prune?: boolean;
  tags?: boolean;
  depth?: number;
}

export interface PushOptions {
  force?: boolean;
  set_upstream?: boolean;
  tags?: boolean;
}

export interface PullOptions {
  rebase?: boolean;
  ff_only?: boolean;
}

// Graph types
export interface GraphCommit extends Commit {
  lane: number;
  parent_edges: GraphEdge[];
  refs: CommitRef[];
}

export interface GraphEdge {
  parent_oid: string;
  parent_lane: number;
  edge_type: EdgeType;
}

export type EdgeType = 'straight' | 'merge' | 'branch';

export interface CommitRef {
  name: string;
  ref_type: RefType;
  is_head: boolean;
}

export type RefType = 'local_branch' | 'remote_branch' | 'tag';

export interface GraphOptions {
  limit?: number;
  skip?: number;
  from_ref?: string;
  all_branches?: boolean;
}

export interface GraphResult {
  commits: GraphCommit[];
  total_count: number;
  max_lane: number;
  has_more: boolean;
}

// Search types
export interface SearchOptions {
  query: string;
  search_message?: boolean;
  search_author?: boolean;
  search_hash?: boolean;
  limit?: number;
}

export interface SearchResult {
  commits: Commit[];
  total_matches: number;
}

// Blame types
export interface BlameResult {
  path: string;
  lines: BlameLine[];
}

export interface BlameLine {
  line_number: number;
  commit_oid: string;
  short_oid: string;
  author: string;
  timestamp: string;
  content: string;
  original_line: number;
  is_group_start: boolean;
}

// Merge types
export interface MergeOptions {
  branch: string;
  message?: string;
  no_ff?: boolean;
  squash?: boolean;
  ff_only?: boolean;
}

export interface MergeResult {
  success: boolean;
  merge_type: MergeType;
  commit_oid: string | null;
  conflicts: ConflictedFile[];
  message: string;
}

export type MergeType = 'up_to_date' | 'fast_forward' | 'normal' | 'conflicted';

// Rebase types
export interface RebaseOptions {
  onto: string;
  interactive?: boolean;
  preserve_merges?: boolean;
  autosquash?: boolean;
}

export interface RebaseResult {
  success: boolean;
  commits_rebased: number;
  current_commit: string | null;
  total_commits: number | null;
  conflicts: ConflictedFile[];
  message: string;
}

// Cherry-pick types
export interface CherryPickOptions {
  commits: string[];
  no_commit?: boolean;
  allow_empty?: boolean;
}

export interface CherryPickResult {
  success: boolean;
  commit_oids: string[];
  conflicts: ConflictedFile[];
  message: string;
}

// Revert types
export interface RevertOptions {
  commits: string[];
  no_commit?: boolean;
}

export interface RevertResult {
  success: boolean;
  commit_oids: string[];
  conflicts: ConflictedFile[];
  message: string;
}

// Conflict types
export interface ConflictedFile {
  path: string;
  conflict_type: ConflictType;
  is_resolved: boolean;
}

export type ConflictType =
  | 'content'
  | 'delete_modify'
  | 'add_add'
  | 'rename_rename'
  | 'rename_modify'
  | 'binary';

export interface ConflictContent {
  path: string;
  base: string | null;
  ours: string | null;
  theirs: string | null;
  merged: string;
}

export type ConflictResolution = 'ours' | 'theirs' | 'merged';

// Operation state
export type OperationState =
  | { type: 'none' }
  | { type: 'merging'; branch: string | null }
  | { type: 'rebasing'; onto: string | null; current: number | null; total: number | null }
  | { type: 'cherry_picking'; commit: string | null }
  | { type: 'reverting'; commit: string | null };

// Reset types
export type ResetMode = 'soft' | 'mixed' | 'hard';

export interface ResetOptions {
  target: string;
  mode: ResetMode;
}

// Stash types
export interface StashEntry {
  index: number;
  stash_ref: string;
  message: string;
  commit_oid: string;
  short_oid: string;
  branch: string | null;
  author: string;
  timestamp: string;
}

export interface StashSaveOptions {
  message?: string;
  include_untracked?: boolean;
  keep_index?: boolean;
  include_ignored?: boolean;
}

export interface StashApplyOptions {
  index?: number;
  reinstate_index?: boolean;
}

export interface StashResult {
  success: boolean;
  message: string;
  files_affected: number;
  conflicts: string[];
}

// Tag types
export interface Tag {
  name: string;
  full_name: string;
  target_oid: string;
  short_oid: string;
  is_annotated: boolean;
  message: string | null;
  tagger: TagSignature | null;
  target_summary: string | null;
  target_time: string | null;
}

export interface TagSignature {
  name: string;
  email: string;
  timestamp: string;
}

export interface CreateTagOptions {
  target?: string;
  annotated?: boolean;
  message?: string;
  force?: boolean;
}

export interface TagResult {
  success: boolean;
  message: string;
  tag: Tag | null;
}

// Submodule types
export interface Submodule {
  name: string;
  path: string;
  url: string | null;
  head_oid: string | null;
  short_oid: string | null;
  indexed_oid: string | null;
  branch: string | null;
  status: SubmoduleStatus;
}

export type SubmoduleStatus =
  | 'current'
  | 'modified'
  | 'uninitialized'
  | 'missing'
  | 'conflict'
  | 'dirty'
  | 'unknown';

export interface AddSubmoduleOptions {
  url: string;
  path: string;
  branch?: string;
  name?: string;
  depth?: number;
}

export interface UpdateSubmoduleOptions {
  paths?: string[];
  init?: boolean;
  recursive?: boolean;
  force?: boolean;
  remote?: boolean;
  rebase?: boolean;
  merge?: boolean;
}

export interface SyncSubmoduleOptions {
  paths?: string[];
  recursive?: boolean;
}

export interface SubmoduleResult {
  success: boolean;
  message: string;
  submodules: string[];
}

// Git-flow types
export interface GitFlowConfig {
  master: string;
  develop: string;
  feature_prefix: string;
  release_prefix: string;
  hotfix_prefix: string;
  support_prefix: string;
  version_tag_prefix: string;
}

export interface GitFlowInitOptions {
  master?: string;
  develop?: string;
  feature_prefix?: string;
  release_prefix?: string;
  hotfix_prefix?: string;
  support_prefix?: string;
  version_tag_prefix?: string;
  force?: boolean;
}

export interface GitFlowFinishOptions {
  fetch?: boolean;
  rebase?: boolean;
  keep?: boolean;
  force_delete?: boolean;
  squash?: boolean;
  no_ff?: boolean;
  message?: string;
  tag_message?: string;
  push?: boolean;
}

export interface GitFlowResult {
  success: boolean;
  message: string;
  branch: string | null;
}

export type GitFlowBranchType = 'feature' | 'release' | 'hotfix' | 'support';

// Content search types
export interface GrepOptions {
  pattern: string;
  paths?: string[];
  ignore_case?: boolean;
  word_regexp?: boolean;
  extended_regexp?: boolean;
  invert_match?: boolean;
  show_line_numbers?: boolean;
  max_count?: number;
  context_lines?: number;
}

export interface GrepMatch {
  path: string;
  line_number: number | null;
  content: string;
}

export interface GrepResult {
  matches: GrepMatch[];
  total_matches: number;
}
