import { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { useRepositoryStore, type ViewType } from '../../store/repositoryStore';
import { cn } from '../../lib/utils';
import type { Branch } from '../../types';
import { CreateBranchDialog } from '../branches/CreateBranchDialog';
import { TagDialog } from '../tags/TagDialog';
import { AddRemoteDialog } from '../remotes/AddRemoteDialog';
import { AddSubmoduleDialog } from '../submodules/AddSubmoduleDialog';

// Tailwind class constants
const sidebarItemClass = "flex items-center gap-2 w-full py-1.5 px-3 pl-6 text-[13px] cursor-pointer transition-colors bg-transparent border-none text-(--text-primary) text-left hover:bg-(--bg-hover)";
const sectionHeaderClass = "flex items-center gap-1.5 w-full py-2 px-3 bg-transparent border-none text-(--text-secondary) text-[11px] font-semibold uppercase tracking-wide cursor-pointer transition-colors hover:bg-(--bg-hover)";
const badgeClass = "py-0.5 px-1.5 rounded-full text-[10px] font-semibold bg-(--bg-badge) text-(--text-primary)";

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

  if (node.isLeaf && !hasChildren) {
    return (
      <button
        className={cn(sidebarItemClass, "[&>svg]:shrink-0 [&>svg]:opacity-70")}
        style={{ paddingLeft }}
        onClick={() => node.branch && onBranchClick?.(node.branch.target_oid)}
      >
        <GitBranch size={12} />
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{node.name}</span>
      </button>
    );
  }

  const sortedChildren = Array.from(node.children.values()).sort((a, b) => {
    // Folders first, then alphabetically
    const aIsFolder = a.children.size > 0 || !a.isLeaf;
    const bIsFolder = b.children.size > 0 || !b.isLeaf;
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col">
      <button
        className={cn(sidebarItemClass, "[&>svg:first-child]:shrink-0 [&>svg:first-child]:opacity-70")}
        style={{ paddingLeft }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={12} />
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{node.name}</span>
        {!expanded && node.children.size > 0 && (
          <span className="py-0.5 px-1.5 rounded-lg text-[10px] font-medium bg-(--bg-badge) text-(--text-secondary) ml-auto">{node.children.size}</span>
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
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      {sortedNodes.map((node) => (
        <TreeNodeView
          key={node.fullPath}
          node={node}
          depth={0}
          onBranchClick={onBranchClick}
        />
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
      <button
        className={sectionHeaderClass}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {icon}
        <span className="flex-1 text-left">{title}</span>
      </button>
      {expanded && <div className="pb-2">{children}</div>}
    </div>
  );
}

export function Sidebar() {
  const { repository, branches, tags, stashes, submodules, status, currentView, setCurrentView, selectCommit, loadTags } = useRepositoryStore();
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showRemoteDialog, setShowRemoteDialog] = useState(false);
  const [showSubmoduleDialog, setShowSubmoduleDialog] = useState(false);

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
    (status?.staged.length ?? 0) +
    (status?.unstaged.length ?? 0) +
    (status?.untracked.length ?? 0);

  if (!repository) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-(--bg-sidebar) border-r border-(--border-color) text-(--text-secondary) text-center p-6">
        <p>No repository open</p>
        <p className="text-xs mt-2 opacity-70">Open a repository to get started</p>
      </div>
    );
  }

  const handleViewClick = (view: ViewType) => {
    setCurrentView(view);
  };

  const handleRefClick = (targetOid: string) => {
    setCurrentView('history');
    selectCommit(targetOid);
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
      <Section
        title="WORKSPACE"
        icon={<FileCode size={14} />}
        defaultExpanded={true}
      >
        <button
          className={cn(sidebarItemClass, currentView === 'file-status' && "bg-(--bg-active) font-medium")}
          onClick={() => handleViewClick('file-status')}
        >
          <FileCode size={12} />
          <span>File Status</span>
          {changesCount > 0 && (
            <span className={badgeClass}>{changesCount}</span>
          )}
        </button>
        <button
          className={cn(sidebarItemClass, currentView === 'history' && "bg-(--bg-active) font-medium")}
          onClick={() => handleViewClick('history')}
        >
          <History size={12} />
          <span>History</span>
        </button>
        <button
          className={cn(sidebarItemClass, currentView === 'search' && "bg-(--bg-active) font-medium")}
          onClick={() => handleViewClick('search')}
        >
          <Search size={12} />
          <span>Search</span>
        </button>
      </Section>

      <Section
        title="BRANCHES"
        icon={<GitBranch size={14} />}
        defaultExpanded={true}
      >
        {localBranches.length > 0 ? (
          localBranches.map((branch) => (
            <button
              key={branch.name}
              className={cn(sidebarItemClass, branch.is_head && "font-semibold")}
              onClick={() => handleRefClick(branch.target_oid)}
            >
              {branch.is_head ? (
                <svg width={12} height={12} className="shrink-0">
                  <circle
                    cx={6}
                    cy={6}
                    r={4}
                    fill="var(--bg-sidebar)"
                    stroke="var(--accent-color)"
                    strokeWidth={2}
                  />
                </svg>
              ) : (
                <span className="w-3 shrink-0" />
              )}
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{branch.name}</span>
              {branch.ahead !== null && branch.ahead > 0 && (
                <span className={cn(badgeClass, "bg-(--bg-tertiary) text-(--text-secondary)")}>{branch.ahead}↑</span>
              )}
              {branch.behind !== null && branch.behind > 0 && (
                <span className={cn(badgeClass, "bg-(--bg-tertiary) text-(--text-secondary)")}>{branch.behind}↓</span>
              )}
            </button>
          ))
        ) : (
          <div className={cn(sidebarItemClass, "text-(--text-secondary) italic cursor-default hover:bg-transparent")}>No branches</div>
        )}
      </Section>

      <Section title="TAGS" icon={<Tag size={14} />} defaultExpanded={false}>
        {tags.length > 0 ? (
          tags.map((tag) => (
            <button
              key={tag.name}
              className={sidebarItemClass}
              onClick={() => handleRefClick(tag.target_oid)}
            >
              <Tag size={12} />
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{tag.name}</span>
            </button>
          ))
        ) : (
          <div className={cn(sidebarItemClass, "text-(--text-secondary) italic cursor-default hover:bg-transparent")}>No tags</div>
        )}
      </Section>

      <Section title="REMOTES" icon={<Cloud size={14} />} defaultExpanded={false}>
        {remoteBranches.length > 0 ? (
          <RemoteTree branches={remoteBranches} onBranchClick={handleRefClick} />
        ) : (
          <div className={cn(sidebarItemClass, "text-(--text-secondary) italic cursor-default hover:bg-transparent")}>No remotes</div>
        )}
      </Section>

      <Section title="STASHES" icon={<Archive size={14} />} defaultExpanded={false}>
        {stashes.length > 0 ? (
          stashes.map((stash) => (
            <div key={stash.stash_ref} className={sidebarItemClass}>
              <Archive size={12} />
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{stash.message || `stash@{${stash.index}}`}</span>
            </div>
          ))
        ) : (
          <div className={cn(sidebarItemClass, "text-(--text-secondary) italic cursor-default hover:bg-transparent")}>No stashes</div>
        )}
      </Section>

      <Section title="SUBMODULES" icon={<FolderGit2 size={14} />} defaultExpanded={false}>
        {submodules.length > 0 ? (
          submodules.map((submodule) => (
            <div key={submodule.path} className={sidebarItemClass}>
              <FolderGit2 size={12} />
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{submodule.name}</span>
              {submodule.status !== 'current' && (
                <span className={cn(badgeClass, submodule.status === 'modified' && "bg-warning text-white")}>{submodule.status}</span>
              )}
            </div>
          ))
        ) : (
          <div className={cn(sidebarItemClass, "text-(--text-secondary) italic cursor-default hover:bg-transparent")}>No submodules</div>
        )}
      </Section>
    </ScrollArea>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-48 bg-(--bg-secondary) border border-(--border-color) rounded-md shadow-lg py-1 z-50">
          <ContextMenu.Item className="flex items-center gap-2 px-3 py-1.5 text-sm text-(--text-primary) cursor-pointer outline-none hover:bg-(--bg-hover) focus:bg-(--bg-hover)" onSelect={() => setShowBranchDialog(true)}>
            <GitBranch size={14} />
            <span>New Branch...</span>
          </ContextMenu.Item>

          <ContextMenu.Item className="flex items-center gap-2 px-3 py-1.5 text-sm text-(--text-primary) cursor-pointer outline-none hover:bg-(--bg-hover) focus:bg-(--bg-hover)" onSelect={() => setShowTagDialog(true)}>
            <Tag size={14} />
            <span>New Tag...</span>
          </ContextMenu.Item>

          <ContextMenu.Item className="flex items-center gap-2 px-3 py-1.5 text-sm text-(--text-primary) cursor-pointer outline-none hover:bg-(--bg-hover) focus:bg-(--bg-hover)" onSelect={() => setShowRemoteDialog(true)}>
            <Cloud size={14} />
            <span>New Remote...</span>
          </ContextMenu.Item>

          <ContextMenu.Item className="flex items-center gap-2 px-3 py-1.5 text-sm text-(--text-primary) cursor-pointer outline-none hover:bg-(--bg-hover) focus:bg-(--bg-hover)" onSelect={() => setShowSubmoduleDialog(true)}>
            <FolderGit2 size={14} />
            <span>Add Submodule...</span>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>

    <CreateBranchDialog
      open={showBranchDialog}
      onOpenChange={setShowBranchDialog}
    />

    <TagDialog
      isOpen={showTagDialog}
      onClose={() => setShowTagDialog(false)}
      onTagCreated={handleTagCreated}
    />

    <AddRemoteDialog
      open={showRemoteDialog}
      onOpenChange={setShowRemoteDialog}
    />

    <AddSubmoduleDialog
      open={showSubmoduleDialog}
      onOpenChange={setShowSubmoduleDialog}
    />
    </>
  );
}
