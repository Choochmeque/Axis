import { invoke } from '@tauri-apps/api/core';
import {
  commands,
  type AiProvider,
  type LfsFetchOptions,
  type LfsPullOptions,
  type LfsPushOptions,
  type LfsMigrateOptions,
  type LfsPruneOptions,
  type ProviderType,
  type PrState,
  type IssueState,
  type CreatePrOptions,
  type MergePrOptions,
  type CreateIssueOptions,
} from '../bindings/api';
import type {
  BranchType,
  LogOptions,
  DiffOptions,
  GraphOptions,
  SearchOptions,
  FileLogOptions,
  MergeOptions,
  RebaseOptions,
  CherryPickOptions,
  RevertOptions,
  ConflictResolution,
  ResetOptions,
  StashSaveOptions,
  StashApplyOptions,
  ReflogOptions,
  CreateTagOptions,
  AddSubmoduleOptions,
  UpdateSubmoduleOptions,
  SyncSubmoduleOptions,
  AddWorktreeOptions,
  RemoveWorktreeOptions,
  GitFlowInitOptions,
  GitFlowFinishOptions,
  GrepOptions,
  AppSettings,
  SigningConfig,
  ArchiveOptions,
  FormatPatchOptions,
  CreatePatchOptions,
  ApplyPatchOptions,
  ApplyMailboxOptions,
  PushOptions,
  DiffTarget,
  CreateBranchOptions,
  BisectStartOptions,
  BisectMarkType,
} from '../types';

export const repositoryApi = {
  open: (path: string) => commands.openRepository(path),

  init: (path: string, bare: boolean = false) => commands.initRepository(path, bare),

  clone: (url: string, path: string) => commands.cloneRepository(url, path),

  close: () => commands.closeRepository(),

  closePath: (path: string) => commands.closeRepositoryPath(path),

  switchActive: (path: string) => commands.switchActiveRepository(path),

  getInfo: () => commands.getRepositoryInfo(),

  getStatus: () => commands.getRepositoryStatus(),

  getRecentRepositories: () => commands.getRecentRepositories(),

  removeRecentRepository: (path: string) => commands.removeRecentRepository(path),
};

export const commitApi = {
  getHistory: (options: LogOptions) => commands.getCommitHistory(options),

  getCommit: (oid: string) => commands.getCommit(oid),

  create: (message: string, authorName?: string, authorEmail?: string, sign?: boolean) =>
    commands.createCommit(message, authorName ?? null, authorEmail ?? null, sign ?? null),

  amend: (message?: string) => commands.amendCommit(message ?? null),

  getUserSignature: () => commands.getUserSignature(),
};

export const branchApi = {
  list: (includeLocal: boolean = true, includeRemote: boolean = true) =>
    commands.getBranches(includeLocal, includeRemote),

  create: (name: string, options: CreateBranchOptions) => commands.createBranch(name, options),

  delete: (name: string, force?: boolean) => commands.deleteBranch(name, force ?? null),

  deleteRemote: (remoteName: string, branchName: string, force?: boolean) =>
    commands.deleteRemoteBranch(remoteName, branchName, force ?? null),

  rename: (oldName: string, newName: string, force?: boolean) =>
    commands.renameBranch(oldName, newName, force ?? null),

  checkout: (name: string, create?: boolean, force?: boolean, track?: string) =>
    commands.checkoutBranch(name, create ?? null, force ?? null, track ?? null),

  checkoutRemote: (remoteName: string, branchName: string, localName?: string) =>
    commands.checkoutRemoteBranch(remoteName, branchName, localName ?? null),

  get: (name: string, branchType: BranchType) => commands.getBranch(name, branchType),

  setUpstream: (branchName: string, upstream?: string) =>
    commands.setBranchUpstream(branchName, upstream ?? null),

  compare: (baseRef: string, compareRef: string) => commands.compareBranches(baseRef, compareRef),
};

export const remoteApi = {
  list: () => commands.listRemotes(),

  get: (name: string) => commands.getRemote(name),

  add: (name: string, url: string) => commands.addRemote(name, url),

  remove: (name: string) => commands.removeRemote(name),

  rename: (oldName: string, newName: string) => commands.renameRemote(oldName, newName),

  setUrl: (name: string, url: string) => commands.setRemoteUrl(name, url),

  setPushUrl: (name: string, url: string) => commands.setRemotePushUrl(name, url),

  fetch: (remoteName: string, prune?: boolean, tags?: boolean, depth?: number) =>
    commands.fetchRemote(remoteName, prune ?? null, tags ?? null, depth ?? null),

  fetchAll: () => commands.fetchAll(),

  push: (remoteName: string, refspecs: string[], options: PushOptions) =>
    commands.pushRemote(remoteName, refspecs, options),

  pushCurrentBranch: (remoteName: string, options: PushOptions) =>
    commands.pushCurrentBranch(remoteName, options),

  pull: (remoteName: string, branchName: string, rebase?: boolean, ffOnly?: boolean) =>
    commands.pullRemote(remoteName, branchName, rebase ?? null, ffOnly ?? null),
};

export const stagingApi = {
  stageFile: (path: string) => commands.stageFile(path),

  stageFiles: (paths: string[]) => commands.stageFiles(paths),

  stageAll: () => commands.stageAll(),

  unstageFile: (path: string) => commands.unstageFile(path),

  unstageFiles: (paths: string[]) => commands.unstageFiles(paths),

  unstageAll: () => commands.unstageAll(),

  discardFile: (path: string) => commands.discardFile(path),

  discardAll: () => commands.discardAll(),

  deleteFile: (path: string) => commands.deleteFile(path),

  stageHunk: (patch: string) => commands.stageHunk(patch),

  unstageHunk: (patch: string) => commands.unstageHunk(patch),

  discardHunk: (patch: string) => commands.discardHunk(patch),
};

export const diffApi = {
  getDiff: (target: DiffTarget, options?: DiffOptions) => commands.getDiff(target, options ?? null),

  getWorkdir: (options?: DiffOptions) => commands.getDiffWorkdir(options ?? null),

  getStaged: (options?: DiffOptions) => commands.getDiffStaged(options ?? null),

  getHead: (options?: DiffOptions) => commands.getDiffHead(options ?? null),

  getCommit: (oid: string, options?: DiffOptions) => commands.getDiffCommit(oid, options ?? null),

  getCommits: (fromOid: string, toOid: string, options?: DiffOptions) =>
    commands.getDiffCommits(fromOid, toOid, options ?? null),

  getFile: (path: string, staged: boolean, options?: DiffOptions) =>
    commands.getFileDiff(path, staged, options ?? null),

  getFileBlob: (path: string, commitOid?: string) =>
    invoke<ArrayBuffer>('get_file_blob', { path, commitOid: commitOid ?? null }),
};

export const graphApi = {
  build: (options?: GraphOptions) => commands.buildGraph(options ?? null),

  getCommitCount: (fromRef?: string) => commands.getCommitCount(fromRef ?? null),

  getFileHistory: (options: FileLogOptions) => commands.getFileHistory(options),

  getFileDiffInCommit: (commitOid: string, path: string, options?: DiffOptions) =>
    commands.getFileDiffInCommit(commitOid, path, options ?? null),
};

export const searchApi = {
  commits: (options: SearchOptions) => commands.searchCommits(options),
};

export const blameApi = {
  file: (path: string, commitOid?: string) => commands.blameFile(path, commitOid ?? null),
};

export const mergeApi = {
  merge: (options: MergeOptions) => commands.mergeBranch(options),

  abort: () => commands.mergeAbort(),

  continue: () => commands.mergeContinue(),
};

export const rebaseApi = {
  rebase: (options: RebaseOptions) => commands.rebaseBranch(options),

  abort: () => commands.rebaseAbort(),

  continue: () => commands.rebaseContinue(),

  skip: () => commands.rebaseSkip(),

  getPreview: (onto: string) => commands.getRebasePreview(onto),
};

export const cherryPickApi = {
  cherryPick: (options: CherryPickOptions) => commands.cherryPick(options),

  abort: () => commands.cherryPickAbort(),

  continue: () => commands.cherryPickContinue(),

  skip: () => commands.cherryPickSkip(),
};

export const revertApi = {
  revert: (options: RevertOptions) => commands.revertCommits(options),

  abort: () => commands.revertAbort(),

  continue: () => commands.revertContinue(),
};

export const conflictApi = {
  getConflictedFiles: () => commands.getConflictedFiles(),

  getConflictContent: (path: string) => commands.getConflictContent(path),

  resolveConflict: (path: string, resolution: ConflictResolution, customContent?: string) =>
    commands.resolveConflict(path, resolution, customContent ?? null),

  markResolved: (path: string) => commands.markConflictResolved(path),
};

export const operationApi = {
  getState: () => commands.getOperationState(),

  reset: (options: ResetOptions) => commands.resetToCommit(options),
};

export const bisectApi = {
  start: (options: BisectStartOptions) => commands.bisectStart(options),

  mark: (mark: BisectMarkType, commit?: string) => commands.bisectMark(mark, commit ?? null),

  reset: (commit?: string) => commands.bisectReset(commit ?? null),

  getState: () => commands.bisectState(),

  getLog: () => commands.bisectLog(),
};

export const stashApi = {
  list: () => commands.stashList(),

  save: (options: StashSaveOptions) => commands.stashSave(options),

  apply: (options: StashApplyOptions) => commands.stashApply(options),

  pop: (options: StashApplyOptions) => commands.stashPop(options),

  drop: (index?: number) => commands.stashDrop(index ?? null),

  clear: () => commands.stashClear(),

  show: (index?: number, statOnly: boolean = false) => commands.stashShow(index ?? null, statOnly),

  branch: (branchName: string, index?: number) => commands.stashBranch(branchName, index ?? null),
};

export const reflogApi = {
  list: (options: ReflogOptions) => commands.reflogList(options),

  refs: () => commands.reflogRefs(),

  checkout: (reflogRef: string) => commands.reflogCheckout(reflogRef),
};

export const tagApi = {
  list: () => commands.tagList(),

  create: (name: string, options: CreateTagOptions) => commands.tagCreate(name, options),

  delete: (name: string) => commands.tagDelete(name),

  push: (name: string, remote: string) => commands.tagPush(name, remote),

  pushAll: (remote: string) => commands.tagPushAll(remote),

  deleteRemote: (name: string, remote: string) => commands.tagDeleteRemote(name, remote),
};

export const submoduleApi = {
  list: () => commands.submoduleList(),

  add: (options: AddSubmoduleOptions) => commands.submoduleAdd(options),

  init: (paths: string[] = []) => commands.submoduleInit(paths),

  update: (options: UpdateSubmoduleOptions) => commands.submoduleUpdate(options),

  sync: (options: SyncSubmoduleOptions) => commands.submoduleSync(options),

  deinit: (paths: string[], force: boolean = false) => commands.submoduleDeinit(paths, force),

  remove: (path: string) => commands.submoduleRemove(path),

  summary: () => commands.submoduleSummary(),
};

export const worktreeApi = {
  list: () => commands.worktreeList(),

  add: (options: AddWorktreeOptions) => commands.worktreeAdd(options),

  remove: (options: RemoveWorktreeOptions) => commands.worktreeRemove(options),

  lock: (path: string, reason?: string) => commands.worktreeLock(path, reason ?? null),

  unlock: (path: string) => commands.worktreeUnlock(path),

  prune: (dryRun: boolean = false) => commands.worktreePrune(dryRun),
};

export const gitflowApi = {
  isInitialized: () => commands.gitflowIsInitialized(),

  getConfig: () => commands.gitflowConfig(),

  init: (options?: GitFlowInitOptions) => commands.gitflowInit(options ?? {}),

  feature: {
    start: (name: string, base?: string) => commands.gitflowFeatureStart(name, base ?? null),

    finish: (name: string, options?: GitFlowFinishOptions) =>
      commands.gitflowFeatureFinish(name, options ?? {}),

    publish: (name: string) => commands.gitflowFeaturePublish(name),

    list: () => commands.gitflowFeatureList(),
  },

  release: {
    start: (name: string, base?: string) => commands.gitflowReleaseStart(name, base ?? null),

    finish: (name: string, options?: GitFlowFinishOptions) =>
      commands.gitflowReleaseFinish(name, options ?? {}),

    publish: (name: string) => commands.gitflowReleasePublish(name),

    list: () => commands.gitflowReleaseList(),
  },

  hotfix: {
    start: (name: string, base?: string) => commands.gitflowHotfixStart(name, base ?? null),

    finish: (name: string, options?: GitFlowFinishOptions) =>
      commands.gitflowHotfixFinish(name, options ?? {}),

    publish: (name: string) => commands.gitflowHotfixPublish(name),

    list: () => commands.gitflowHotfixList(),
  },
};

export const grepApi = {
  search: (options: GrepOptions) => commands.grepContent(options),

  searchCommit: (commitOid: string, options: GrepOptions) =>
    commands.grepCommit(commitOid, options),
};

export const settingsApi = {
  get: () => commands.getSettings(),

  save: (settings: AppSettings) => commands.saveSettings(settings),
};

export const repoSettingsApi = {
  get: () => commands.getRepositorySettings(),

  saveUserConfig: (userName: string | null, userEmail: string | null) =>
    commands.saveRepositoryUserConfig(userName, userEmail),
};

export const signingApi = {
  getConfig: () => commands.getSigningConfig(),

  listGpgKeys: () => commands.listGpgKeys(),

  listSshKeys: () => commands.listSshKeys(),

  testSigning: (config: SigningConfig) => commands.testSigning(config),

  isAvailable: (config: SigningConfig) => commands.isSigningAvailable(config),
};

export const shellApi = {
  showInFolder: (path: string) => commands.showInFolder(path),

  openTerminal: (path: string) => commands.openTerminal(path),

  openUrl: (url: string) => commands.openUrl(url),
};

export const archiveApi = {
  create: (options: ArchiveOptions) => commands.createArchive(options),
};

export const patchApi = {
  formatPatch: (options: FormatPatchOptions) => commands.formatPatch(options),

  createPatch: (options: CreatePatchOptions) => commands.createPatch(options),

  applyPatch: (options: ApplyPatchOptions) => commands.applyPatch(options),

  applyMailbox: (options: ApplyMailboxOptions) => commands.applyMailbox(options),

  abort: () => commands.amAbort(),

  continue: () => commands.amContinue(),

  skip: () => commands.amSkip(),
};

export const aiApi = {
  generateCommitMessage: () => commands.generateCommitMessage(),

  setApiKey: (provider: AiProvider, apiKey: string) => commands.setAiApiKey(provider, apiKey),

  hasApiKey: (provider: AiProvider) => commands.hasAiApiKey(provider),

  deleteApiKey: (provider: AiProvider) => commands.deleteAiApiKey(provider),

  testConnection: (provider: AiProvider) => commands.testAiConnection(provider),

  listOllamaModels: (ollamaUrl?: string) => commands.listOllamaModels(ollamaUrl ?? null),
};

export const lfsApi = {
  checkInstalled: () => commands.lfsCheckInstalled(),

  getGitEnvironment: () => commands.getGitEnvironment(),

  getStatus: () => commands.lfsStatus(),

  install: () => commands.lfsInstall(),

  track: (pattern: string) => commands.lfsTrack(pattern),

  untrack: (pattern: string) => commands.lfsUntrack(pattern),

  listPatterns: () => commands.lfsListPatterns(),

  listFiles: () => commands.lfsListFiles(),

  fetch: (options: LfsFetchOptions) => commands.lfsFetch(options),

  pull: (options: LfsPullOptions) => commands.lfsPull(options),

  push: (options: LfsPushOptions) => commands.lfsPush(options),

  migrate: (options: LfsMigrateOptions) => commands.lfsMigrate(options),

  getEnv: () => commands.lfsEnv(),

  isPointer: (path: string) => commands.lfsIsPointer(path),

  prune: (options: LfsPruneOptions) => commands.lfsPrune(options),
};

export const integrationApi = {
  // OAuth / Connection
  setGithubClientId: (clientId: string) => commands.integrationSetGithubClientId(clientId),

  startOauth: () => commands.integrationStartOauth(),

  cancelOauth: () => commands.integrationCancelOauth(),

  isConnected: (provider: ProviderType) => commands.integrationIsConnected(provider),

  getStatus: (provider: ProviderType) => commands.integrationGetStatus(provider),

  disconnect: (provider: ProviderType) => commands.integrationDisconnect(provider),

  // Provider Detection
  detectProvider: () => commands.integrationDetectProvider(),

  // Repository
  getRepoInfo: (owner: string, repo: string) => commands.integrationGetRepoInfo(owner, repo),

  // Pull Requests
  listPrs: (owner: string, repo: string, state: PrState, page: number) =>
    commands.integrationListPrs(owner, repo, state, page),

  getPr: (owner: string, repo: string, number: number) =>
    commands.integrationGetPr(owner, repo, number),

  createPr: (owner: string, repo: string, options: CreatePrOptions) =>
    commands.integrationCreatePr(owner, repo, options),

  mergePr: (owner: string, repo: string, number: number, options: MergePrOptions) =>
    commands.integrationMergePr(owner, repo, number, options),

  // Issues
  listIssues: (owner: string, repo: string, state: IssueState, page: number) =>
    commands.integrationListIssues(owner, repo, state, page),

  getIssue: (owner: string, repo: string, number: number) =>
    commands.integrationGetIssue(owner, repo, number),

  createIssue: (owner: string, repo: string, options: CreateIssueOptions) =>
    commands.integrationCreateIssue(owner, repo, options),

  // CI/CD
  listCiRuns: (owner: string, repo: string, page: number) =>
    commands.integrationListCiRuns(owner, repo, page),

  getCommitStatus: (owner: string, repo: string, sha: string) =>
    commands.integrationGetCommitStatus(owner, repo, sha),

  // Notifications
  listNotifications: (owner: string, repo: string, all: boolean, page: number) =>
    commands.integrationListNotifications(owner, repo, all, page),

  markNotificationRead: (threadId: string) => commands.integrationMarkNotificationRead(threadId),

  markAllNotificationsRead: (owner: string, repo: string) =>
    commands.integrationMarkAllNotificationsRead(owner, repo),

  getUnreadCount: (owner: string, repo: string) => commands.integrationGetUnreadCount(owner, repo),
};

export const gitignoreApi = {
  addPattern: (pattern: string, gitignorePath: string) =>
    commands.addToGitignore(pattern, gitignorePath),

  addToGlobal: (pattern: string) => commands.addToGlobalGitignore(pattern),

  getOptions: (filePath: string) => commands.getIgnoreOptions(filePath),
};

export const avatarApi = {
  get: (email: string, sha?: string) => commands.getAvatar(email, sha ?? null),

  clearCache: () => commands.clearAvatarCache(),
};
