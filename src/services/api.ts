import { invoke } from '@tauri-apps/api/core';
import type {
  Repository,
  RepositoryStatus,
  Commit,
  Branch,
  BranchType,
  RecentRepository,
  LogOptions,
  FileDiff,
  DiffOptions,
  Remote,
  FetchResult,
  PushResult,
  GraphOptions,
  GraphResult,
  SearchOptions,
  SearchResult,
  BlameResult,
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

  create: (
    name: string,
    startPoint?: string,
    force?: boolean,
    track?: string
  ) =>
    invoke<Branch>('create_branch', {
      name,
      startPoint,
      force,
      track,
    }),

  delete: (name: string, force?: boolean) =>
    invoke<void>('delete_branch', { name, force }),

  rename: (oldName: string, newName: string, force?: boolean) =>
    invoke<Branch>('rename_branch', { oldName, newName, force }),

  checkout: (
    name: string,
    create?: boolean,
    force?: boolean,
    track?: string
  ) =>
    invoke<void>('checkout_branch', { name, create, force, track }),

  checkoutRemote: (
    remoteName: string,
    branchName: string,
    localName?: string
  ) =>
    invoke<void>('checkout_remote_branch', { remoteName, branchName, localName }),

  get: (name: string, branchType: BranchType) =>
    invoke<Branch>('get_branch', { name, branchType }),

  setUpstream: (branchName: string, upstream?: string) =>
    invoke<void>('set_branch_upstream', { branchName, upstream }),
};

export const remoteApi = {
  list: () =>
    invoke<Remote[]>('list_remotes'),

  get: (name: string) =>
    invoke<Remote>('get_remote', { name }),

  add: (name: string, url: string) =>
    invoke<Remote>('add_remote', { name, url }),

  remove: (name: string) =>
    invoke<void>('remove_remote', { name }),

  rename: (oldName: string, newName: string) =>
    invoke<string[]>('rename_remote', { oldName, newName }),

  setUrl: (name: string, url: string) =>
    invoke<void>('set_remote_url', { name, url }),

  setPushUrl: (name: string, url: string) =>
    invoke<void>('set_remote_push_url', { name, url }),

  fetch: (
    remoteName: string,
    prune?: boolean,
    tags?: boolean,
    depth?: number
  ) =>
    invoke<FetchResult>('fetch_remote', { remoteName, prune, tags, depth }),

  fetchAll: () =>
    invoke<FetchResult[]>('fetch_all'),

  push: (
    remoteName: string,
    refspecs: string[],
    force?: boolean,
    setUpstream?: boolean,
    tags?: boolean
  ) =>
    invoke<PushResult>('push_remote', {
      remoteName,
      refspecs,
      force,
      setUpstream,
      tags,
    }),

  pushCurrentBranch: (
    remoteName: string,
    force?: boolean,
    setUpstream?: boolean
  ) =>
    invoke<PushResult>('push_current_branch', {
      remoteName,
      force,
      setUpstream,
    }),

  pull: (
    remoteName: string,
    branchName: string,
    rebase?: boolean,
    ffOnly?: boolean
  ) =>
    invoke<void>('pull_remote', { remoteName, branchName, rebase, ffOnly }),
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

export const graphApi = {
  build: (options?: GraphOptions) =>
    invoke<GraphResult>('build_graph', { options }),

  getCommitCount: (fromRef?: string) =>
    invoke<number>('get_commit_count', { fromRef }),
};

export const searchApi = {
  commits: (options: SearchOptions) =>
    invoke<SearchResult>('search_commits', { options }),
};

export const blameApi = {
  file: (path: string, commitOid?: string) =>
    invoke<BlameResult>('blame_file', { path, commitOid }),
};
