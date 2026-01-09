import { invoke } from '@tauri-apps/api/core';
import type {
  Repository,
  RepositoryStatus,
  Commit,
  Branch,
  RecentRepository,
  LogOptions,
  FileDiff,
  DiffOptions,
} from '../types';

export const repositoryApi = {
  open: (path: string) =>
    invoke<Repository>('open_repository', { path }),

  init: (path: string, bare: boolean = false) =>
    invoke<Repository>('init_repository', { path, bare }),

  close: () =>
    invoke<void>('close_repository'),

  getInfo: () =>
    invoke<Repository>('get_repository_info'),

  getStatus: () =>
    invoke<RepositoryStatus>('get_repository_status'),

  getRecentRepositories: () =>
    invoke<RecentRepository[]>('get_recent_repositories'),

  startFileWatcher: () =>
    invoke<void>('start_file_watcher'),

  stopFileWatcher: () =>
    invoke<void>('stop_file_watcher'),

  isFileWatcherActive: () =>
    invoke<boolean>('is_file_watcher_active'),
};

export const commitApi = {
  getHistory: (options?: LogOptions) =>
    invoke<Commit[]>('get_commit_history', {
      limit: options?.limit,
      skip: options?.skip,
      fromRef: options?.from_ref,
    }),

  getCommit: (oid: string) =>
    invoke<Commit>('get_commit', { oid }),

  create: (message: string, authorName?: string, authorEmail?: string) =>
    invoke<string>('create_commit', {
      message,
      authorName,
      authorEmail,
    }),

  amend: (message?: string) =>
    invoke<string>('amend_commit', { message }),
};

export const branchApi = {
  list: (includeLocal: boolean = true, includeRemote: boolean = true) =>
    invoke<Branch[]>('get_branches', {
      includeLocal,
      includeRemote,
    }),
};

export const stagingApi = {
  stageFile: (path: string) =>
    invoke<void>('stage_file', { path }),

  stageFiles: (paths: string[]) =>
    invoke<void>('stage_files', { paths }),

  stageAll: () =>
    invoke<void>('stage_all'),

  unstageFile: (path: string) =>
    invoke<void>('unstage_file', { path }),

  unstageFiles: (paths: string[]) =>
    invoke<void>('unstage_files', { paths }),

  unstageAll: () =>
    invoke<void>('unstage_all'),

  discardFile: (path: string) =>
    invoke<void>('discard_file', { path }),

  discardAll: () =>
    invoke<void>('discard_all'),
};

export const diffApi = {
  getWorkdir: (options?: DiffOptions) =>
    invoke<FileDiff[]>('get_diff_workdir', { options }),

  getStaged: (options?: DiffOptions) =>
    invoke<FileDiff[]>('get_diff_staged', { options }),

  getHead: (options?: DiffOptions) =>
    invoke<FileDiff[]>('get_diff_head', { options }),

  getCommit: (oid: string, options?: DiffOptions) =>
    invoke<FileDiff[]>('get_diff_commit', { oid, options }),

  getCommits: (fromOid: string, toOid: string, options?: DiffOptions) =>
    invoke<FileDiff[]>('get_diff_commits', { fromOid, toOid, options }),

  getFile: (path: string, staged: boolean, options?: DiffOptions) =>
    invoke<FileDiff | null>('get_file_diff', { path, staged, options }),
};
