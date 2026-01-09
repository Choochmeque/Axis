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
