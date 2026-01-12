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
} from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { ScrollArea } from '@radix-ui/react-scroll-area';
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

// Tailwind class constants
const sidebarItemClass =
  'flex items-center gap-2 w-full py-1.5 pr-3 pl-10 text-[13px] cursor-pointer transition-colors bg-transparent border-none text-(--text-primary) text-left hover:bg-(--bg-hover)';

// Tree node for hierarchical display
interface TreeNode {
  name: string;
  fullPath: string;
  isLeaf: boolean;
  branch?: Branch;
  children: Map<string, TreeNode>;
}

function buildTree(branches: Branch[]): Map<string, TreeNode> {
  const root = new Map<string, TreeNode>();

  for (const branch of branches) {
    const parts = branch.name.split('/');
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      if (!currentLevel.has(part)) {
        currentLevel.set(part, {
          name: part,
          fullPath: currentPath,
          isLeaf: isLast,
          branch: isLast ? branch : undefined,
          children: new Map(),
        });
      } else if (isLast) {
        const node = currentLevel.get(part)!;
        node.isLeaf = true;
        node.branch = branch;
      }

      currentLevel = currentLevel.get(part)!.children;
    }
  }

  return root;
}

interface TreeNodeViewProps {
  node: TreeNode;
  depth: number;
  onBranchClick?: (targetOid: string) => void;
}

function TreeNodeView({ node, depth, onBranchClick }: TreeNodeViewProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.size > 0;
  const paddingLeft = 24 + depth * 16;

  if (node.isLeaf && !hasChildren && node.branch) {
    return (
      <RemoteBranchContextMenu branch={node.branch}>
        <button
          className={cn(sidebarItemClass, '[&>svg]:shrink-0 [&>svg]:opacity-70')}
          style={{ paddingLeft }}
          onClick={() => onBranchClick?.(node.branch!.target_oid)}
        >
          <span className="w-3 shrink-0" /> {/* Spacer to align with folder chevrons */}
          <GitBranch size={12} />
          <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
            {node.name}
          </span>
        </button>
      </RemoteBranchContextMenu>
    );
  }

  const sortedChildren = Array.from(node.children.values()).sort((a, b) => {
    // Folders first, then alphabetically
    const aIsFolder = a.children.size > 0 || !a.isLeaf;
    const bIsFolder = b.children.size > 0 || !b.isLeaf;
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return naturalCompare(a.name, b.name);
  });

  return (
    <div className="flex flex-col">
      <button
        className={cn(
          sidebarItemClass,
          '[&>svg:first-child]:shrink-0 [&>svg:first-child]:opacity-70'
        )}
        style={{ paddingLeft }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={12} />
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{node.name}</span>
        {!expanded && node.children.size > 0 && (
          <span className={cn('badge', 'rounded-lg font-medium text-(--text-secondary) ml-auto')}>
            {node.children.size}
          </span>
        )}
      </button>
      {expanded && (
        <div className="flex flex-col">
          {sortedChildren.map((child) => (
            <TreeNodeView
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              onBranchClick={onBranchClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RemoteTreeProps {
  branches: Branch[];
  onBranchClick?: (targetOid: string) => void;
}

function RemoteTree({ branches, onBranchClick }: RemoteTreeProps) {
  const tree = useMemo(() => buildTree(branches), [branches]);

  const sortedNodes = Array.from(tree.values()).sort((a, b) => {
    const aIsFolder = a.children.size > 0;
    const bIsFolder = b.children.size > 0;
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return naturalCompare(a.name, b.name);
  });

  return (
    <>
      {sortedNodes.map((node) => (
        <TreeNodeView key={node.fullPath} node={node} depth={0} onBranchClick={onBranchClick} />
      ))}
    </>
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
    <div className="border-b border-(--border-color)">
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
      remoteApi.list().then(setRemotes).catch(console.error);
    }
  }, [repository]);

  const handleTagCheckout = useCallback(
    async (tagName: string) => {
      try {
        await branchApi.checkout(tagName);
        await loadBranches();
        await loadCommits();
        await loadStatus();
      } catch (err) {
        console.error('Failed to checkout tag:', err);
      }
    },
    [loadBranches, loadCommits, loadStatus]
  );

  const handleTagPush = useCallback(async (tagName: string, remote: string) => {
    try {
      await tagApi.push(tagName, remote);
    } catch (err) {
      console.error('Failed to push tag:', err);
    }
  }, []);

  const handleTagDelete = useCallback(
    async (tagName: string) => {
      if (!confirm(`Delete tag '${tagName}'?`)) return;
      try {
        await tagApi.delete(tagName);
        await loadTags();
      } catch (err) {
        console.error('Failed to delete tag:', err);
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

  const localBranches = branches.filter((b) => b.branch_type === 'local');
  const remoteBranches = branches.filter((b) => b.branch_type === 'remote');

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
    if (selectedStash?.stash_ref === stash.stash_ref) {
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
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
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
            </Section>

            <Section title="BRANCHES" icon={<GitBranch />} defaultExpanded={true}>
              {localBranches.length > 0 ? (
                [...localBranches]
                  .sort((a, b) => {
                    // Current branch (HEAD) always first
                    if (a.is_head) return -1;
                    if (b.is_head) return 1;
                    return naturalCompare(a.name, b.name);
                  })
                  .map((branch) => (
                    <BranchContextMenu key={branch.name} branch={branch}>
                      <button
                        className={cn(sidebarItemClass, branch.is_head && 'font-semibold')}
                        onClick={() => handleRefClick(branch.target_oid)}
                      >
                        {branch.is_head ? (
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
                        onClick={() => handleRefClick(tag.target_oid)}
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
                  <StashContextMenu key={stash.stash_ref} stash={stash}>
                    <button
                      className={cn(
                        sidebarItemClass,
                        selectedStash?.stash_ref === stash.stash_ref &&
                          'bg-(--bg-active) font-medium'
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
                      {submodule.status !== 'current' && (
                        <span
                          className={cn(
                            'badge',
                            submodule.status === 'modified' && 'bg-warning text-white'
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
        </ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content className="menu-content">
            <ContextMenu.Item className="menu-item" onSelect={() => setShowBranchDialog(true)}>
              <GitBranch size={14} />
              <span>New Branch...</span>
            </ContextMenu.Item>

            <ContextMenu.Item className="menu-item" onSelect={() => setShowTagDialog(true)}>
              <Tag size={14} />
              <span>New Tag...</span>
            </ContextMenu.Item>

            <ContextMenu.Item className="menu-item" onSelect={() => setShowRemoteDialog(true)}>
              <Cloud size={14} />
              <span>New Remote...</span>
            </ContextMenu.Item>

            <ContextMenu.Item className="menu-item" onSelect={() => setShowSubmoduleDialog(true)}>
              <FolderGit2 size={14} />
              <span>Add Submodule...</span>
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

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
