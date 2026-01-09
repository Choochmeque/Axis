import { invoke } from '@tauri-apps/api/core';
import type {
  Repository,
  RepositoryStatus,
  Commit,
  Branch,
  RecentRepository,
  LogOptions,
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
};

export const branchApi = {
  list: (includeLocal: boolean = true, includeRemote: boolean = true) =>
    invoke<Branch[]>('get_branches', {
      includeLocal,
      includeRemote,
    }),
};
