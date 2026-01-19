import { invoke } from '@tauri-apps/api/core';
import { commands } from '../bindings/api';
import type {
  BranchType,
  LogOptions,
  DiffOptions,
  GraphOptions,
  SearchOptions,
  MergeOptions,
  RebaseOptions,
  CherryPickOptions,
  RevertOptions,
  ConflictResolution,
  ResetOptions,
  StashSaveOptions,
  StashApplyOptions,
  CreateTagOptions,
  AddSubmoduleOptions,
  UpdateSubmoduleOptions,
  SyncSubmoduleOptions,
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
} from '../types';

export const repositoryApi = {
  open: (path: string) => commands.openRepository(path),

  init: (path: string, bare: boolean = false) => commands.initRepository(path, bare),

  clone: (url: string, path: string) => commands.cloneRepository(url, path),

  close: () => commands.closeRepository(),

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

  create: (name: string, startPoint?: string, force?: boolean, track?: string) =>
    commands.createBranch(name, startPoint ?? null, force ?? null, track ?? null),

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

  push: (remoteName: string, refspecs: string[], options?: PushOptions) =>
    commands.pushRemote(remoteName, refspecs, options ?? null),

  pushCurrentBranch: (remoteName: string, options?: PushOptions) =>
    commands.pushCurrentBranch(remoteName, options ?? null),

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
