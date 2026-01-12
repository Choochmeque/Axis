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
  MergeOptions,
  MergeResult,
  RebaseOptions,
  RebaseResult,
  CherryPickOptions,
  CherryPickResult,
  RevertOptions,
  RevertResult,
  ConflictedFile,
  ConflictContent,
  ConflictResolution,
  OperationState,
  ResetOptions,
  StashEntry,
  StashSaveOptions,
  StashApplyOptions,
  StashResult,
  Tag,
  CreateTagOptions,
  TagResult,
  Submodule,
  AddSubmoduleOptions,
  UpdateSubmoduleOptions,
  SyncSubmoduleOptions,
  SubmoduleResult,
  GitFlowConfig,
  GitFlowInitOptions,
  GitFlowFinishOptions,
  GitFlowResult,
  GrepOptions,
  GrepResult,
  AppSettings,
  SigningConfig,
  GpgKey,
  SshKey,
  SigningTestResult,
} from '../types';

export const repositoryApi = {
  open: (path: string) => invoke<Repository>('open_repository', { path }),

  init: (path: string, bare: boolean = false) =>
    invoke<Repository>('init_repository', { path, bare }),

  clone: (url: string, path: string) => invoke<Repository>('clone_repository', { url, path }),

  close: () => invoke<void>('close_repository'),

  getInfo: () => invoke<Repository>('get_repository_info'),

  getStatus: () => invoke<RepositoryStatus>('get_repository_status'),

  getRecentRepositories: () => invoke<RecentRepository[]>('get_recent_repositories'),

  removeRecentRepository: (path: string) => invoke<void>('remove_recent_repository', { path }),

  startFileWatcher: () => invoke<void>('start_file_watcher'),

  stopFileWatcher: () => invoke<void>('stop_file_watcher'),

  isFileWatcherActive: () => invoke<boolean>('is_file_watcher_active'),
};

export const commitApi = {
  getHistory: (options?: LogOptions) =>
    invoke<Commit[]>('get_commit_history', {
      limit: options?.limit,
      skip: options?.skip,
      fromRef: options?.from_ref,
    }),

  getCommit: (oid: string) => invoke<Commit>('get_commit', { oid }),

  create: (message: string, authorName?: string, authorEmail?: string, sign?: boolean) =>
    invoke<string>('create_commit', {
      message,
      authorName,
      authorEmail,
      sign,
    }),

  amend: (message?: string) => invoke<string>('amend_commit', { message }),

  getUserSignature: () => invoke<[string, string]>('get_user_signature'),
};

export const branchApi = {
  list: (includeLocal: boolean = true, includeRemote: boolean = true) =>
    invoke<Branch[]>('get_branches', {
      includeLocal,
      includeRemote,
    }),

  create: (name: string, startPoint?: string, force?: boolean, track?: string) =>
    invoke<Branch>('create_branch', {
      name,
      startPoint,
      force,
      track,
    }),

  delete: (name: string, force?: boolean) => invoke<void>('delete_branch', { name, force }),

  rename: (oldName: string, newName: string, force?: boolean) =>
    invoke<Branch>('rename_branch', { oldName, newName, force }),

  checkout: (name: string, create?: boolean, force?: boolean, track?: string) =>
    invoke<void>('checkout_branch', { name, create, force, track }),

  checkoutRemote: (remoteName: string, branchName: string, localName?: string) =>
    invoke<void>('checkout_remote_branch', { remoteName, branchName, localName }),

  get: (name: string, branchType: BranchType) => invoke<Branch>('get_branch', { name, branchType }),

  setUpstream: (branchName: string, upstream?: string) =>
    invoke<void>('set_branch_upstream', { branchName, upstream }),
};

export const remoteApi = {
  list: () => invoke<Remote[]>('list_remotes'),

  get: (name: string) => invoke<Remote>('get_remote', { name }),

  add: (name: string, url: string) => invoke<Remote>('add_remote', { name, url }),

  remove: (name: string) => invoke<void>('remove_remote', { name }),

  rename: (oldName: string, newName: string) =>
    invoke<string[]>('rename_remote', { oldName, newName }),

  setUrl: (name: string, url: string) => invoke<void>('set_remote_url', { name, url }),

  setPushUrl: (name: string, url: string) => invoke<void>('set_remote_push_url', { name, url }),

  fetch: (remoteName: string, prune?: boolean, tags?: boolean, depth?: number) =>
    invoke<FetchResult>('fetch_remote', { remoteName, prune, tags, depth }),

  fetchAll: () => invoke<FetchResult[]>('fetch_all'),

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

  pushCurrentBranch: (remoteName: string, force?: boolean, setUpstream?: boolean) =>
    invoke<PushResult>('push_current_branch', {
      remoteName,
      force,
      setUpstream,
    }),

  pull: (remoteName: string, branchName: string, rebase?: boolean, ffOnly?: boolean) =>
    invoke<void>('pull_remote', { remoteName, branchName, rebase, ffOnly }),
};

export const stagingApi = {
  stageFile: (path: string) => invoke<void>('stage_file', { path }),

  stageFiles: (paths: string[]) => invoke<void>('stage_files', { paths }),

  stageAll: () => invoke<void>('stage_all'),

  unstageFile: (path: string) => invoke<void>('unstage_file', { path }),

  unstageFiles: (paths: string[]) => invoke<void>('unstage_files', { paths }),

  unstageAll: () => invoke<void>('unstage_all'),

  discardFile: (path: string) => invoke<void>('discard_file', { path }),

  discardAll: () => invoke<void>('discard_all'),

  stageHunk: (patch: string) => invoke<void>('stage_hunk', { patch }),

  unstageHunk: (patch: string) => invoke<void>('unstage_hunk', { patch }),

  discardHunk: (patch: string) => invoke<void>('discard_hunk', { patch }),
};

export const diffApi = {
  getWorkdir: (options?: DiffOptions) => invoke<FileDiff[]>('get_diff_workdir', { options }),

  getStaged: (options?: DiffOptions) => invoke<FileDiff[]>('get_diff_staged', { options }),

  getHead: (options?: DiffOptions) => invoke<FileDiff[]>('get_diff_head', { options }),

  getCommit: (oid: string, options?: DiffOptions) =>
    invoke<FileDiff[]>('get_diff_commit', { oid, options }),

  getCommits: (fromOid: string, toOid: string, options?: DiffOptions) =>
    invoke<FileDiff[]>('get_diff_commits', { fromOid, toOid, options }),

  getFile: (path: string, staged: boolean, options?: DiffOptions) =>
    invoke<FileDiff | null>('get_file_diff', { path, staged, options }),

  getFileBlob: (path: string, commitOid?: string) =>
    invoke<ArrayBuffer>('get_file_blob', { path, commitOid }),
};

export const graphApi = {
  build: (options?: GraphOptions) => invoke<GraphResult>('build_graph', { options }),

  getCommitCount: (fromRef?: string) => invoke<number>('get_commit_count', { fromRef }),
};

export const searchApi = {
  commits: (options: SearchOptions) => invoke<SearchResult>('search_commits', { options }),
};

export const blameApi = {
  file: (path: string, commitOid?: string) =>
    invoke<BlameResult>('blame_file', { path, commitOid }),
};

export const mergeApi = {
  merge: (options: MergeOptions) => invoke<MergeResult>('merge_branch', { options }),

  abort: () => invoke<void>('merge_abort'),

  continue: () => invoke<MergeResult>('merge_continue'),
};

export const rebaseApi = {
  rebase: (options: RebaseOptions) => invoke<RebaseResult>('rebase_branch', { options }),

  abort: () => invoke<void>('rebase_abort'),

  continue: () => invoke<RebaseResult>('rebase_continue'),

  skip: () => invoke<RebaseResult>('rebase_skip'),
};

export const cherryPickApi = {
  cherryPick: (options: CherryPickOptions) => invoke<CherryPickResult>('cherry_pick', { options }),

  abort: () => invoke<void>('cherry_pick_abort'),

  continue: () => invoke<CherryPickResult>('cherry_pick_continue'),
};

export const revertApi = {
  revert: (options: RevertOptions) => invoke<RevertResult>('revert_commits', { options }),

  abort: () => invoke<void>('revert_abort'),

  continue: () => invoke<RevertResult>('revert_continue'),
};

export const conflictApi = {
  getConflictedFiles: () => invoke<ConflictedFile[]>('get_conflicted_files'),

  getConflictContent: (path: string) => invoke<ConflictContent>('get_conflict_content', { path }),

  resolveConflict: (path: string, resolution: ConflictResolution, customContent?: string) =>
    invoke<void>('resolve_conflict', { path, resolution, customContent }),

  markResolved: (path: string) => invoke<void>('mark_conflict_resolved', { path }),
};

export const operationApi = {
  getState: () => invoke<OperationState>('get_operation_state'),

  reset: (options: ResetOptions) => invoke<void>('reset_to_commit', { options }),
};

export const stashApi = {
  list: () => invoke<StashEntry[]>('stash_list'),

  save: (options?: StashSaveOptions) =>
    invoke<StashResult>('stash_save', { options: options ?? {} }),

  apply: (options?: StashApplyOptions) =>
    invoke<StashResult>('stash_apply', { options: options ?? {} }),

  pop: (options?: StashApplyOptions) =>
    invoke<StashResult>('stash_pop', { options: options ?? {} }),

  drop: (index?: number) => invoke<StashResult>('stash_drop', { index }),

  clear: () => invoke<StashResult>('stash_clear'),

  show: (index?: number, statOnly: boolean = false) =>
    invoke<string>('stash_show', { index, statOnly }),

  branch: (branchName: string, index?: number) =>
    invoke<StashResult>('stash_branch', { branchName, index }),
};

export const tagApi = {
  list: () => invoke<Tag[]>('tag_list'),

  create: (name: string, options?: CreateTagOptions) =>
    invoke<TagResult>('tag_create', { name, options: options ?? {} }),

  delete: (name: string) => invoke<TagResult>('tag_delete', { name }),

  push: (name: string, remote: string) => invoke<TagResult>('tag_push', { name, remote }),

  pushAll: (remote: string) => invoke<TagResult>('tag_push_all', { remote }),

  deleteRemote: (name: string, remote: string) =>
    invoke<TagResult>('tag_delete_remote', { name, remote }),
};

export const submoduleApi = {
  list: () => invoke<Submodule[]>('submodule_list'),

  add: (options: AddSubmoduleOptions) => invoke<SubmoduleResult>('submodule_add', { options }),

  init: (paths: string[] = []) => invoke<SubmoduleResult>('submodule_init', { paths }),

  update: (options?: UpdateSubmoduleOptions) =>
    invoke<SubmoduleResult>('submodule_update', { options: options ?? {} }),

  sync: (options?: SyncSubmoduleOptions) =>
    invoke<SubmoduleResult>('submodule_sync', { options: options ?? {} }),

  deinit: (paths: string[], force: boolean = false) =>
    invoke<SubmoduleResult>('submodule_deinit', { paths, force }),

  remove: (path: string) => invoke<SubmoduleResult>('submodule_remove', { path }),

  summary: () => invoke<string>('submodule_summary'),
};

export const gitflowApi = {
  isInitialized: () => invoke<boolean>('gitflow_is_initialized'),

  getConfig: () => invoke<GitFlowConfig | null>('gitflow_config'),

  init: (options?: GitFlowInitOptions) =>
    invoke<GitFlowResult>('gitflow_init', { options: options ?? {} }),

  feature: {
    start: (name: string, base?: string) =>
      invoke<GitFlowResult>('gitflow_feature_start', { name, base }),

    finish: (name: string, options?: GitFlowFinishOptions) =>
      invoke<GitFlowResult>('gitflow_feature_finish', { name, options: options ?? {} }),

    publish: (name: string) => invoke<GitFlowResult>('gitflow_feature_publish', { name }),

    list: () => invoke<string[]>('gitflow_feature_list'),
  },

  release: {
    start: (name: string, base?: string) =>
      invoke<GitFlowResult>('gitflow_release_start', { name, base }),

    finish: (name: string, options?: GitFlowFinishOptions) =>
      invoke<GitFlowResult>('gitflow_release_finish', { name, options: options ?? {} }),

    publish: (name: string) => invoke<GitFlowResult>('gitflow_release_publish', { name }),

    list: () => invoke<string[]>('gitflow_release_list'),
  },

  hotfix: {
    start: (name: string, base?: string) =>
      invoke<GitFlowResult>('gitflow_hotfix_start', { name, base }),

    finish: (name: string, options?: GitFlowFinishOptions) =>
      invoke<GitFlowResult>('gitflow_hotfix_finish', { name, options: options ?? {} }),

    publish: (name: string) => invoke<GitFlowResult>('gitflow_hotfix_publish', { name }),

    list: () => invoke<string[]>('gitflow_hotfix_list'),
  },
};

export const grepApi = {
  search: (options: GrepOptions) => invoke<GrepResult>('grep_content', { options }),

  searchCommit: (commitOid: string, options: GrepOptions) =>
    invoke<GrepResult>('grep_commit', { commitOid, options }),
};

export const settingsApi = {
  get: () => invoke<AppSettings>('get_settings'),

  save: (settings: AppSettings) => invoke<void>('save_settings', { settings }),
};

export const signingApi = {
  getConfig: () => invoke<SigningConfig>('get_signing_config'),

  listGpgKeys: () => invoke<GpgKey[]>('list_gpg_keys'),

  listSshKeys: () => invoke<SshKey[]>('list_ssh_keys'),

  testSigning: (config: SigningConfig) => invoke<SigningTestResult>('test_signing', { config }),

  isAvailable: (config: SigningConfig) => invoke<boolean>('is_signing_available', { config }),
};

export const shellApi = {
  showInFolder: (path: string) => invoke<void>('show_in_folder', { path }),

  openTerminal: (path: string) => invoke<void>('open_terminal', { path }),
};
