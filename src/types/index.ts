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
