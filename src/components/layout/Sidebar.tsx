import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  GitFork,
  Tag,
  Cloud,
  Archive,
  FileCode,
  History,
  Search,
  Folder,
  FolderGit2,
  Pointer,
  RotateCcw,
  Lock,
  HardDrive,
  Link2,
  GitPullRequest,
  CircleDot,
  Play,
  Bell,
  Github,
} from 'lucide-react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import {
  TreeView,
  buildTreeFromPaths,
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuPortal,
  ContextMenuContent,
  MenuItem,
} from '@/components/ui';
import { useRepositoryStore, type ViewType } from '../../store/repositoryStore';
import { useStagingStore } from '../../store/stagingStore';
import { useLfsStore } from '../../store/lfsStore';
import { useIntegrationStore, initIntegrationListeners } from '../../store/integrationStore';
import { cn, naturalCompare } from '../../lib/utils';
import type { Branch, Remote } from '../../types';
import { CreateBranchDialog, BranchContextMenu, RemoteBranchContextMenu } from '../branches';
import { TagDialog } from '../tags/TagDialog';
import { TagContextMenu } from '../tags/TagContextMenu';
import { AddRemoteDialog } from '../remotes/AddRemoteDialog';
import { AddSubmoduleDialog } from '../submodules/AddSubmoduleDialog';
import { StashContextMenu } from '../stash';
import { AddWorktreeDialog, WorktreeContextMenu } from '../worktrees';
import { tagApi, remoteApi, branchApi } from '../../services/api';
import { BranchType, PrState, IssueState, CIRunStatus } from '@/types';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';

// Tailwind class constants
const sidebarItemClass =
  'flex items-center gap-2 w-full py-1.5 pr-3 pl-10 text-base cursor-pointer transition-colors bg-transparent border-none text-(--text-primary) text-left hover:bg-(--bg-hover)';

// Remote branches tree using UI TreeView
interface RemoteTreeProps {
  branches: Branch[];
  onBranchClick?: (targetOid: string) => void;
}

function RemoteTree({ branches, onBranchClick }: RemoteTreeProps) {
  const treeData = useMemo(
    () =>
      buildTreeFromPaths(
        branches,
        (b) => b.name,
        (b) => b.name
      ),
    [branches]
  );

  return (
    <TreeView<Branch>
      data={treeData}
      defaultExpandAll={false}
      renderItem={({ node, depth, isExpanded, toggleExpand }) => {
        const paddingLeft = 24 + depth * 16;

        // Folder node
        if (node.children && node.children.length > 0) {
          return (
            <button
              className={cn(
                sidebarItemClass,
                '[&>svg:first-child]:shrink-0 [&>svg:first-child]:opacity-70'
              )}
              style={{ paddingLeft }}
              onClick={toggleExpand}
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Folder size={12} />
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {node.name}
              </span>
              {!isExpanded && (
                <span
                  className={cn('badge', 'rounded-lg font-medium text-(--text-secondary) ml-auto')}
                >
                  {node.children.length}
                </span>
              )}
            </button>
          );
        }

        // Branch leaf node
        if (node.data) {
          return (
            <RemoteBranchContextMenu branch={node.data}>
              <button
                className={cn(sidebarItemClass, '[&>svg]:shrink-0 [&>svg]:opacity-70')}
                style={{ paddingLeft }}
                onClick={() => onBranchClick?.(node.data!.targetOid)}
              >
                <span className="w-3 shrink-0" />
                <GitBranch size={12} />
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {node.name}
                </span>
              </button>
            </RemoteBranchContextMenu>
          );
        }

        return null;
      }}
    />
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function Section({ title, icon, children, defaultExpanded = true }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div>
      <button className="sidebar-section-header" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {icon}
        <span className="flex-1 text-left">{title}</span>
      </button>
      {expanded && <div className="pb-2">{children}</div>}
    </div>
  );
}

export function Sidebar() {
  const { t } = useTranslation();
  const {
    repository,
    branches,
    tags,
    stashes,
    submodules,
    worktrees,
    status,
    currentView,
    setCurrentView,
    selectCommit,
    setScrollTarget,
    selectStash,
    selectedStash,
    clearStashSelection,
    loadTags,
    loadBranches,
    loadCommits,
    loadStatus,
  } = useRepositoryStore();
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showRemoteDialog, setShowRemoteDialog] = useState(false);
  const [showSubmoduleDialog, setShowSubmoduleDialog] = useState(false);
  const [showWorktreeDialog, setShowWorktreeDialog] = useState(false);
  const [remotes, setRemotes] = useState<Remote[]>([]);

  // Load remotes for tag context menu
  useEffect(() => {
    if (repository) {
      remoteApi
        .list()
        .then(setRemotes)
        .catch((err) =>
          toast.error(t('notifications.error.loadRemotesFailed'), getErrorMessage(err))
        );
    }
  }, [repository, t]);

  // Load LFS status when repository changes
  useEffect(() => {
    if (repository) {
      useLfsStore.getState().loadStatus();
    } else {
      useLfsStore.getState().reset();
    }
  }, [repository]);

  // Initialize integration listeners and detect provider
  useEffect(() => {
    initIntegrationListeners();
    if (repository) {
      useIntegrationStore.getState().detectProvider();
    } else {
      useIntegrationStore.getState().reset();
    }
  }, [repository]);

  const handleBranchCheckout = useCallback(
    async (branchName: string) => {
      try {
        await branchApi.checkout(branchName, { create: false, force: false, track: null });
        await loadBranches();
        await loadCommits();
        await loadStatus();
      } catch (err) {
        toast.error(t('notifications.error.operationFailed'), getErrorMessage(err));
      }
    },
    [loadBranches, loadCommits, loadStatus, t]
  );

  const handleTagCheckout = useCallback(
    async (tagName: string) => {
      try {
        await branchApi.checkout(tagName, { create: false, force: false, track: null });
        await loadBranches();
        await loadCommits();
        await loadStatus();
      } catch (err) {
        toast.error(t('notifications.error.operationFailed'), getErrorMessage(err));
      }
    },
    [loadBranches, loadCommits, loadStatus, t]
  );

  const handleTagPush = useCallback(
    async (tagName: string, remote: string) => {
      try {
        await tagApi.push(tagName, remote);
        toast.success(t('notifications.success.tagPushed'));
      } catch (err) {
        toast.error(t('notifications.error.operationFailed'), getErrorMessage(err));
      }
    },
    [t]
  );

  const handleTagDelete = useCallback(
    async (tagName: string) => {
      if (!confirm(`Delete tag '${tagName}'?`)) return;
      try {
        await tagApi.delete(tagName);
        await loadTags();
        toast.success(t('notifications.success.tagDeleted', { name: tagName }));
      } catch (err) {
        toast.error(t('notifications.error.operationFailed'), getErrorMessage(err));
      }
    },
    [loadTags, t]
  );

  // Listen for menu events
  useEffect(() => {
    const handleOpenBranchDialog = () => setShowBranchDialog(true);
    const handleOpenTagDialog = () => setShowTagDialog(true);

    document.addEventListener('open-new-branch-dialog', handleOpenBranchDialog);
    document.addEventListener('open-new-tag-dialog', handleOpenTagDialog);

    return () => {
      document.removeEventListener('open-new-branch-dialog', handleOpenBranchDialog);
      document.removeEventListener('open-new-tag-dialog', handleOpenTagDialog);
    };
  }, []);

  const localBranches = branches.filter((b) => b.branchType === BranchType.Local);
  const remoteBranches = branches.filter((b) => b.branchType === BranchType.Remote);

  const changesCount =
    (status?.staged.length ?? 0) + (status?.unstaged.length ?? 0) + (status?.untracked.length ?? 0);

  const handleWorktreeSwitch = useCallback(
    async (worktreePath: string) => {
      try {
        // Reset staging store to clear old worktree's state
        useStagingStore.getState().reset();
        const { switchRepository } = useRepositoryStore.getState();
        await switchRepository(worktreePath);
        toast.success(t('notifications.success.worktreeSwitched'));
      } catch (err) {
        toast.error(t('notifications.error.operationFailed'), getErrorMessage(err));
      }
    },
    [t]
  );

  if (!repository) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-(--bg-sidebar) border-r border-(--border-color) text-(--text-secondary) text-center p-6">
        <p>{t('sidebar.noRepository')}</p>
        <p className="text-xs mt-2 opacity-70">{t('sidebar.noRepositoryHint')}</p>
      </div>
    );
  }

  const handleViewClick = (view: ViewType) => {
    clearStashSelection();
    setCurrentView(view);
  };

  const handleRefClick = (targetOid: string) => {
    clearStashSelection();
    setCurrentView('history');
    selectCommit(targetOid);
    setScrollTarget(targetOid);
  };

  const handleStashClick = (stash: (typeof stashes)[0]) => {
    if (selectedStash?.stashRef === stash.stashRef) {
      clearStashSelection();
    } else {
      setCurrentView('file-status');
      selectStash(stash);
    }
  };

  const handleTagCreated = async () => {
    await loadTags();
    setShowTagDialog(false);
  };

  return (
    <>
      <ContextMenuRoot>
        <ContextMenuTrigger asChild>
          <ScrollArea className="flex flex-col h-full bg-(--bg-sidebar) border-r border-(--border-color) overflow-y-auto">
            <Section
              title={t('sidebar.sections.workspace')}
              icon={<FileCode />}
              defaultExpanded={true}
            >
              <button
                className={cn(
                  sidebarItemClass,
                  currentView === 'file-status' && 'bg-(--bg-active) font-medium'
                )}
                onClick={() => handleViewClick('file-status')}
              >
                <FileCode size={12} />
                <span>{t('sidebar.views.fileStatus')}</span>
                {changesCount > 0 && <span className="badge">{changesCount}</span>}
              </button>
              <button
                className={cn(
                  sidebarItemClass,
                  currentView === 'history' && 'bg-(--bg-active) font-medium'
                )}
                onClick={() => handleViewClick('history')}
              >
                <History size={12} />
                <span>{t('sidebar.views.history')}</span>
              </button>
              <button
                className={cn(
                  sidebarItemClass,
                  currentView === 'search' && 'bg-(--bg-active) font-medium'
                )}
                onClick={() => handleViewClick('search')}
              >
                <Search size={12} />
                <span>{t('sidebar.views.search')}</span>
              </button>
              <button
                className={cn(
                  sidebarItemClass,
                  currentView === 'reflog' && 'bg-(--bg-active) font-medium'
                )}
                onClick={() => handleViewClick('reflog')}
              >
                <RotateCcw size={12} />
                <span>{t('sidebar.views.reflog')}</span>
              </button>
              <button
                className={cn(
                  sidebarItemClass,
                  currentView === 'lfs' && 'bg-(--bg-active) font-medium'
                )}
                onClick={() => handleViewClick('lfs')}
              >
                <HardDrive size={12} />
                <span>{t('sidebar.views.gitLfs')}</span>
                <LfsStatusBadge />
              </button>
            </Section>

            <Section
              title={t('sidebar.sections.branches')}
              icon={<GitBranch />}
              defaultExpanded={true}
            >
              {localBranches.length > 0 ? (
                [...localBranches]
                  .sort((a, b) => naturalCompare(a.name, b.name))
                  .map((branch) => (
                    <BranchContextMenu
                      key={branch.name}
                      branch={branch}
                      onCheckout={() => handleBranchCheckout(branch.name)}
                    >
                      <button
                        className={cn(sidebarItemClass, branch.isHead && 'font-semibold')}
                        onClick={() => handleRefClick(branch.targetOid)}
                        onDoubleClick={() => {
                          if (!branch.isHead) {
                            handleBranchCheckout(branch.name);
                          }
                        }}
                      >
                        {branch.isHead ? (
                          <Pointer size={12} className="shrink-0 rotate-90" />
                        ) : (
                          <span className="w-3 shrink-0" />
                        )}
                        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                          {branch.name}
                        </span>
                        {branch.ahead !== null && branch.ahead > 0 && (
                          <span
                            className={cn('badge', 'bg-(--bg-tertiary) text-(--text-secondary)')}
                          >
                            {branch.ahead}↑
                          </span>
                        )}
                        {branch.behind !== null && branch.behind > 0 && (
                          <span
                            className={cn('badge', 'bg-(--bg-tertiary) text-(--text-secondary)')}
                          >
                            {branch.behind}↓
                          </span>
                        )}
                      </button>
                    </BranchContextMenu>
                  ))
              ) : (
                <div
                  className={cn(
                    sidebarItemClass,
                    'text-(--text-secondary) italic cursor-default hover:bg-transparent'
                  )}
                >
                  {t('sidebar.empty.noBranches')}
                </div>
              )}
            </Section>

            <Section title={t('sidebar.sections.tags')} icon={<Tag />} defaultExpanded={false}>
              {tags.length > 0 ? (
                [...tags]
                  .sort((a, b) => naturalCompare(a.name, b.name))
                  .map((tag) => (
                    <TagContextMenu
                      key={tag.name}
                      tag={tag}
                      remotes={remotes}
                      onCheckout={() => handleTagCheckout(tag.name)}
                      onPush={(remote) => handleTagPush(tag.name, remote)}
                      onDelete={() => handleTagDelete(tag.name)}
                    >
                      <button
                        className={sidebarItemClass}
                        onClick={() => handleRefClick(tag.targetOid)}
                      >
                        <Tag size={12} />
                        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                          {tag.name}
                        </span>
                      </button>
                    </TagContextMenu>
                  ))
              ) : (
                <div
                  className={cn(
                    sidebarItemClass,
                    'text-(--text-secondary) italic cursor-default hover:bg-transparent'
                  )}
                >
                  {t('sidebar.empty.noTags')}
                </div>
              )}
            </Section>

            <Section title={t('sidebar.sections.remotes')} icon={<Cloud />} defaultExpanded={false}>
              {remoteBranches.length > 0 ? (
                <RemoteTree branches={remoteBranches} onBranchClick={handleRefClick} />
              ) : (
                <div
                  className={cn(
                    sidebarItemClass,
                    'text-(--text-secondary) italic cursor-default hover:bg-transparent'
                  )}
                >
                  {t('sidebar.empty.noRemotes')}
                </div>
              )}
            </Section>

            <Section
              title={t('sidebar.sections.stashes')}
              icon={<Archive />}
              defaultExpanded={false}
            >
              {stashes.length > 0 ? (
                stashes.map((stash) => (
                  <StashContextMenu key={stash.stashRef} stash={stash}>
                    <button
                      className={cn(
                        sidebarItemClass,
                        selectedStash?.stashRef === stash.stashRef && 'bg-(--bg-active) font-medium'
                      )}
                      onClick={() => handleStashClick(stash)}
                    >
                      <Archive size={12} />
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {stash.message || `stash@{${stash.index}}`}
                      </span>
                    </button>
                  </StashContextMenu>
                ))
              ) : (
                <div
                  className={cn(
                    sidebarItemClass,
                    'text-(--text-secondary) italic cursor-default hover:bg-transparent'
                  )}
                >
                  {t('sidebar.empty.noStashes')}
                </div>
              )}
            </Section>

            <Section
              title={t('sidebar.sections.worktrees')}
              icon={<GitFork />}
              defaultExpanded={false}
            >
              {worktrees.length > 0 ? (
                worktrees.map((worktree) => {
                  // Normalize paths for comparison (remove trailing slashes)
                  const normalizePath = (p: string) => p.replace(/\/+$/, '');
                  const isCurrent = normalizePath(worktree.path) === normalizePath(repository.path);
                  return (
                    <WorktreeContextMenu
                      key={worktree.path}
                      worktree={worktree}
                      onSwitch={() => !isCurrent && handleWorktreeSwitch(worktree.path)}
                    >
                      <button
                        className={cn(
                          sidebarItemClass,
                          isCurrent && 'bg-(--bg-active) font-medium'
                        )}
                        onClick={() => !isCurrent && handleWorktreeSwitch(worktree.path)}
                      >
                        <GitFork size={12} />
                        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                          {worktree.branch || `(${worktree.shortOid})`}
                        </span>
                        {worktree.isMain && (
                          <span className="badge bg-(--bg-tertiary) text-(--text-secondary)">
                            {t('sidebar.badges.main')}
                          </span>
                        )}
                        {worktree.isLocked && (
                          <Lock size={10} className="text-(--text-secondary)" />
                        )}
                      </button>
                    </WorktreeContextMenu>
                  );
                })
              ) : (
                <div
                  className={cn(
                    sidebarItemClass,
                    'text-(--text-secondary) italic cursor-default hover:bg-transparent'
                  )}
                >
                  {t('sidebar.empty.noWorktrees')}
                </div>
              )}
            </Section>

            <IntegrationsSection />

            <Section
              title={t('sidebar.sections.submodules')}
              icon={<FolderGit2 />}
              defaultExpanded={false}
            >
              {submodules.length > 0 ? (
                [...submodules]
                  .sort((a, b) => naturalCompare(a.name, b.name))
                  .map((submodule) => (
                    <div key={submodule.path} className={sidebarItemClass}>
                      <FolderGit2 size={12} />
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {submodule.name}
                      </span>
                      {submodule.status !== 'Current' && (
                        <span
                          className={cn(
                            'badge',
                            submodule.status === 'Modified' && 'bg-warning text-white'
                          )}
                        >
                          {submodule.status}
                        </span>
                      )}
                    </div>
                  ))
              ) : (
                <div
                  className={cn(
                    sidebarItemClass,
                    'text-(--text-secondary) italic cursor-default hover:bg-transparent'
                  )}
                >
                  {t('sidebar.empty.noSubmodules')}
                </div>
              )}
            </Section>
          </ScrollArea>
        </ContextMenuTrigger>

        <ContextMenuPortal>
          <ContextMenuContent className="menu-content">
            <MenuItem icon={GitBranch} onSelect={() => setShowBranchDialog(true)}>
              {t('sidebar.contextMenu.newBranch')}
            </MenuItem>
            <MenuItem icon={Tag} onSelect={() => setShowTagDialog(true)}>
              {t('sidebar.contextMenu.newTag')}
            </MenuItem>
            <MenuItem icon={Cloud} onSelect={() => setShowRemoteDialog(true)}>
              {t('sidebar.contextMenu.newRemote')}
            </MenuItem>
            <MenuItem icon={FolderGit2} onSelect={() => setShowSubmoduleDialog(true)}>
              {t('sidebar.contextMenu.addSubmodule')}
            </MenuItem>
            <MenuItem icon={GitFork} onSelect={() => setShowWorktreeDialog(true)}>
              {t('sidebar.contextMenu.addWorktree')}
            </MenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenuRoot>

      <CreateBranchDialog open={showBranchDialog} onOpenChange={setShowBranchDialog} />

      <TagDialog
        isOpen={showTagDialog}
        onClose={() => setShowTagDialog(false)}
        onTagCreated={handleTagCreated}
      />

      <AddRemoteDialog open={showRemoteDialog} onOpenChange={setShowRemoteDialog} />

      <AddSubmoduleDialog open={showSubmoduleDialog} onOpenChange={setShowSubmoduleDialog} />

      <AddWorktreeDialog open={showWorktreeDialog} onOpenChange={setShowWorktreeDialog} />
    </>
  );
}

function LfsStatusBadge() {
  const { t } = useTranslation();
  const { status } = useLfsStore();

  if (!status?.isInstalled) {
    return null;
  }

  if (!status.isInitialized) {
    return (
      <span className="badge bg-(--bg-tertiary) text-(--text-muted)">
        {t('sidebar.badges.off')}
      </span>
    );
  }

  const total = status.lfsFilesCount;
  if (total > 0) {
    return <span className="badge bg-(--accent-color)/20 text-(--accent-color)">{total}</span>;
  }

  return null;
}

// Type for IntegrationsSection tree items
type IntegrationItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  view?: string;
  badge?: { count: number; className: string };
  disabled?: boolean;
  onClick?: () => void;
};

function getProviderName(provider: string, t: (key: string) => string) {
  switch (provider) {
    case 'github':
      return t('sidebar.providers.github');
    case 'gitlab':
      return t('sidebar.providers.gitlab');
    case 'bitbucket':
      return t('sidebar.providers.bitbucket');
    case 'gitea':
      return t('sidebar.providers.gitea');
    default:
      return provider;
  }
}

function getProviderIcon(provider: string, size: number = 12) {
  switch (provider) {
    case 'github':
      return <Github size={size} />;
    case 'gitlab':
    case 'bitbucket':
    case 'gitea':
    default:
      return <Cloud size={size} />;
  }
}

function IntegrationsSection() {
  const { t } = useTranslation();
  const { currentView, setCurrentView } = useRepositoryStore();
  const {
    detectedProvider,
    connectionStatus,
    pullRequests,
    issues,
    ciRuns,
    unreadCount,
    isLoadingPrs,
    isLoadingIssues,
    isLoadingCiRuns,
    isLoadingNotifications,
    loadPullRequests,
    loadIssues,
    loadCiRuns,
    loadNotifications,
  } = useIntegrationStore();

  const openPrCount = pullRequests.filter((pr) => pr.state === PrState.Open).length;
  const openIssueCount = issues.filter((issue) => issue.state === IssueState.Open).length;
  const runningCiCount = ciRuns.filter((run) => run.status === CIRunStatus.InProgress).length;

  // Build tree data for TreeView - must be before early return
  const treeData = useMemo(() => {
    if (!detectedProvider) return [];

    const children = connectionStatus?.connected
      ? [
          {
            id: 'pull-requests',
            name: 'pull-requests',
            data: {
              id: 'pull-requests',
              label: t('sidebar.integration.pullRequests'),
              icon: <GitPullRequest size={12} />,
              view: 'pull-requests',
              badge:
                openPrCount > 0
                  ? {
                      count: openPrCount,
                      className: 'bg-(--accent-color)/20 text-(--accent-color)',
                    }
                  : undefined,
              disabled: isLoadingPrs,
              onClick: () => {
                useIntegrationStore.getState().clearPrView();
                setCurrentView('pull-requests');
              },
            },
          },
          {
            id: 'issues',
            name: 'issues',
            data: {
              id: 'issues',
              label: t('sidebar.integration.issues'),
              icon: <CircleDot size={12} />,
              view: 'issues',
              badge:
                openIssueCount > 0
                  ? {
                      count: openIssueCount,
                      className: 'bg-(--bg-tertiary) text-(--text-secondary)',
                    }
                  : undefined,
              disabled: isLoadingIssues,
              onClick: () => {
                useIntegrationStore.getState().clearIssueView();
                setCurrentView('issues');
              },
            },
          },
          {
            id: 'ci',
            name: 'ci',
            data: {
              id: 'ci',
              label: t('sidebar.integration.ciActions'),
              icon: <Play size={12} />,
              view: 'ci',
              badge:
                runningCiCount > 0
                  ? { count: runningCiCount, className: 'bg-warning/20 text-warning' }
                  : undefined,
              disabled: isLoadingCiRuns,
              onClick: () => {
                useIntegrationStore.getState().clearCiView();
                setCurrentView('ci');
              },
            },
          },
          {
            id: 'notifications',
            name: 'notifications',
            data: {
              id: 'notifications',
              label: t('sidebar.integration.notifications'),
              icon: <Bell size={12} />,
              view: 'notifications',
              badge:
                unreadCount > 0
                  ? { count: unreadCount, className: 'bg-(--accent-color) text-white' }
                  : undefined,
              disabled: isLoadingNotifications,
              onClick: () => {
                useIntegrationStore.setState({
                  notifications: [],
                  isLoadingNotifications: false,
                });
                setCurrentView('notifications');
              },
            },
          },
        ]
      : [
          {
            id: 'not-connected',
            name: 'not-connected',
            data: {
              id: 'not-connected',
              label: t('sidebar.integration.connectInSettings'),
              icon: null,
              disabled: true,
            },
          },
        ];

    return [
      {
        id: `provider-${detectedProvider.provider}`,
        name: getProviderName(detectedProvider.provider, t),
        children,
      },
    ];
  }, [
    connectionStatus?.connected,
    detectedProvider,
    openPrCount,
    openIssueCount,
    runningCiCount,
    unreadCount,
    isLoadingPrs,
    isLoadingIssues,
    isLoadingCiRuns,
    isLoadingNotifications,
    setCurrentView,
    t,
  ]);

  // Load data when connected
  useEffect(() => {
    if (connectionStatus?.connected && detectedProvider) {
      loadPullRequests();
      loadIssues();
      loadCiRuns();
      loadNotifications();
    }
  }, [
    connectionStatus?.connected,
    detectedProvider,
    loadPullRequests,
    loadIssues,
    loadCiRuns,
    loadNotifications,
  ]);

  // Don't show section if no provider detected
  if (!detectedProvider) {
    return null;
  }

  return (
    <Section title={t('sidebar.sections.integrations')} icon={<Link2 />} defaultExpanded={true}>
      <TreeView<IntegrationItem>
        data={treeData}
        defaultExpandAll={connectionStatus?.connected}
        renderItem={({ node, depth, isExpanded, toggleExpand }) => {
          const paddingLeft = 40 + depth * 16;

          // Provider folder node
          if (node.children) {
            return (
              <button
                className={cn(
                  sidebarItemClass,
                  '[&>svg:first-child]:shrink-0 [&>svg:first-child]:opacity-70'
                )}
                style={{ paddingLeft }}
                onClick={toggleExpand}
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {getProviderIcon(detectedProvider?.provider ?? '', 12)}
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {node.name}
                </span>
                {!connectionStatus?.connected && (
                  <span className="badge bg-(--bg-tertiary) text-(--text-muted)">
                    {t('sidebar.badges.notConnected')}
                  </span>
                )}
              </button>
            );
          }

          // Leaf item node
          if (node.data) {
            const item = node.data;
            // "Not connected" placeholder
            if (item.id === 'not-connected') {
              return (
                <div
                  className={cn(
                    sidebarItemClass,
                    'text-(--text-secondary) italic cursor-default hover:bg-transparent'
                  )}
                  style={{ paddingLeft }}
                >
                  {item.label}
                </div>
              );
            }
            return (
              <button
                className={cn(sidebarItemClass, currentView === item.view && 'bg-(--bg-hover)')}
                style={{ paddingLeft }}
                disabled={item.disabled}
                onClick={item.onClick}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className={cn('badge', item.badge.className)}>{item.badge.count}</span>
                )}
              </button>
            );
          }

          return null;
        }}
      />
    </Section>
  );
}
