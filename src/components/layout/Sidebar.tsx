import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
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
import { cn, naturalCompare } from '../../lib/utils';
import type { Branch, Remote } from '../../types';
import { CreateBranchDialog, BranchContextMenu, RemoteBranchContextMenu } from '../branches';
import { TagDialog } from '../tags/TagDialog';
import { TagContextMenu } from '../tags/TagContextMenu';
import { AddRemoteDialog } from '../remotes/AddRemoteDialog';
import { AddSubmoduleDialog } from '../submodules/AddSubmoduleDialog';
import { StashContextMenu } from '../stash';
import { tagApi, remoteApi, branchApi } from '../../services/api';
import { BranchType } from '@/types';
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
  const {
    repository,
    branches,
    tags,
    stashes,
    submodules,
    status,
    currentView,
    setCurrentView,
    selectCommit,
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
  const [remotes, setRemotes] = useState<Remote[]>([]);

  // Load remotes for tag context menu
  useEffect(() => {
    if (repository) {
      remoteApi
        .list()
        .then(setRemotes)
        .catch((err) => toast.error('Load remotes failed', getErrorMessage(err)));
    }
  }, [repository]);

  const handleBranchCheckout = useCallback(
    async (branchName: string) => {
      try {
        await branchApi.checkout(branchName);
        await loadBranches();
        await loadCommits();
        await loadStatus();
      } catch (err) {
        toast.error('Checkout branch failed', getErrorMessage(err));
      }
    },
    [loadBranches, loadCommits, loadStatus]
  );

  const handleTagCheckout = useCallback(
    async (tagName: string) => {
      try {
        await branchApi.checkout(tagName);
        await loadBranches();
        await loadCommits();
        await loadStatus();
      } catch (err) {
        toast.error('Checkout tag failed', getErrorMessage(err));
      }
    },
    [loadBranches, loadCommits, loadStatus]
  );

  const handleTagPush = useCallback(async (tagName: string, remote: string) => {
    try {
      await tagApi.push(tagName, remote);
      toast.success('Tag pushed');
    } catch (err) {
      toast.error('Push tag failed', getErrorMessage(err));
    }
  }, []);

  const handleTagDelete = useCallback(
    async (tagName: string) => {
      if (!confirm(`Delete tag '${tagName}'?`)) return;
      try {
        await tagApi.delete(tagName);
        await loadTags();
        toast.success('Tag deleted');
      } catch (err) {
        toast.error('Delete tag failed', getErrorMessage(err));
      }
    },
    [loadTags]
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

  if (!repository) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-(--bg-sidebar) border-r border-(--border-color) text-(--text-secondary) text-center p-6">
        <p>No repository open</p>
        <p className="text-xs mt-2 opacity-70">Open a repository to get started</p>
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
            <Section title="WORKSPACE" icon={<FileCode />} defaultExpanded={true}>
              <button
                className={cn(
                  sidebarItemClass,
                  currentView === 'file-status' && 'bg-(--bg-active) font-medium'
                )}
                onClick={() => handleViewClick('file-status')}
              >
                <FileCode size={12} />
                <span>File Status</span>
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
                <span>History</span>
              </button>
              <button
                className={cn(
                  sidebarItemClass,
                  currentView === 'search' && 'bg-(--bg-active) font-medium'
                )}
                onClick={() => handleViewClick('search')}
              >
                <Search size={12} />
                <span>Search</span>
              </button>
              <button
                className={cn(
                  sidebarItemClass,
                  currentView === 'reflog' && 'bg-(--bg-active) font-medium'
                )}
                onClick={() => handleViewClick('reflog')}
              >
                <RotateCcw size={12} />
                <span>Reflog</span>
              </button>
            </Section>

            <Section title="BRANCHES" icon={<GitBranch />} defaultExpanded={true}>
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
                  No branches
                </div>
              )}
            </Section>

            <Section title="TAGS" icon={<Tag />} defaultExpanded={false}>
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
                  No tags
                </div>
              )}
            </Section>

            <Section title="REMOTES" icon={<Cloud />} defaultExpanded={false}>
              {remoteBranches.length > 0 ? (
                <RemoteTree branches={remoteBranches} onBranchClick={handleRefClick} />
              ) : (
                <div
                  className={cn(
                    sidebarItemClass,
                    'text-(--text-secondary) italic cursor-default hover:bg-transparent'
                  )}
                >
                  No remotes
                </div>
              )}
            </Section>

            <Section title="STASHES" icon={<Archive />} defaultExpanded={false}>
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
                  No stashes
                </div>
              )}
            </Section>

            <Section title="SUBMODULES" icon={<FolderGit2 />} defaultExpanded={false}>
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
                  No submodules
                </div>
              )}
            </Section>
          </ScrollArea>
        </ContextMenuTrigger>

        <ContextMenuPortal>
          <ContextMenuContent className="menu-content">
            <MenuItem icon={GitBranch} onSelect={() => setShowBranchDialog(true)}>
              New Branch...
            </MenuItem>
            <MenuItem icon={Tag} onSelect={() => setShowTagDialog(true)}>
              New Tag...
            </MenuItem>
            <MenuItem icon={Cloud} onSelect={() => setShowRemoteDialog(true)}>
              New Remote...
            </MenuItem>
            <MenuItem icon={FolderGit2} onSelect={() => setShowSubmoduleDialog(true)}>
              Add Submodule...
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
    </>
  );
}
