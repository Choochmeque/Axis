import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { useRepositoryStore, type ViewType } from '../../store/repositoryStore';
import { clsx } from 'clsx';
import type { Branch } from '../../types';
import './Sidebar.css';

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
        className="sidebar-item tree-leaf"
        style={{ paddingLeft }}
        onClick={() => node.branch && onBranchClick?.(node.branch.target_oid)}
      >
        <GitBranch size={12} />
        <span className="branch-name">{node.name}</span>
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
    <div className="tree-node">
      <button
        className="sidebar-item tree-folder"
        style={{ paddingLeft }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={12} />
        <span className="branch-name">{node.name}</span>
        {!expanded && node.children.size > 0 && (
          <span className="tree-count">{node.children.size}</span>
        )}
      </button>
      {expanded && (
        <div className="tree-children">
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
    <div className="sidebar-section">
      <button
        className="section-header"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {icon}
        <span className="section-title">{title}</span>
      </button>
      {expanded && <div className="section-content">{children}</div>}
    </div>
  );
}

export function Sidebar() {
  const { repository, branches, tags, stashes, status, currentView, setCurrentView, selectCommit } = useRepositoryStore();

  const localBranches = branches.filter((b) => b.branch_type === 'local');
  const remoteBranches = branches.filter((b) => b.branch_type === 'remote');

  const changesCount =
    (status?.staged.length ?? 0) +
    (status?.unstaged.length ?? 0) +
    (status?.untracked.length ?? 0);

  if (!repository) {
    return (
      <div className="sidebar sidebar-empty">
        <p>No repository open</p>
        <p className="sidebar-hint">Open a repository to get started</p>
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

  return (
    <ScrollArea className="sidebar">
      <Section
        title="WORKSPACE"
        icon={<FileCode size={14} />}
        defaultExpanded={true}
      >
        <button
          className={clsx('sidebar-item', { 'is-active': currentView === 'file-status' })}
          onClick={() => handleViewClick('file-status')}
        >
          <FileCode size={12} />
          <span>File Status</span>
          {changesCount > 0 && (
            <span className="badge">{changesCount}</span>
          )}
        </button>
        <button
          className={clsx('sidebar-item', { 'is-active': currentView === 'history' })}
          onClick={() => handleViewClick('history')}
        >
          <History size={12} />
          <span>History</span>
        </button>
        <button
          className={clsx('sidebar-item', { 'is-active': currentView === 'search' })}
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
              className={clsx('sidebar-item', { 'is-current': branch.is_head })}
              onClick={() => handleRefClick(branch.target_oid)}
            >
              <GitBranch size={12} />
              <span className="branch-name">{branch.name}</span>
              {branch.ahead !== null && branch.ahead > 0 && (
                <span className="badge badge-ahead">↑{branch.ahead}</span>
              )}
              {branch.behind !== null && branch.behind > 0 && (
                <span className="badge badge-behind">↓{branch.behind}</span>
              )}
            </button>
          ))
        ) : (
          <div className="sidebar-item sidebar-empty-item">No branches</div>
        )}
      </Section>

      <Section title="TAGS" icon={<Tag size={14} />} defaultExpanded={false}>
        {tags.length > 0 ? (
          tags.map((tag) => (
            <button
              key={tag.name}
              className="sidebar-item"
              onClick={() => handleRefClick(tag.target_oid)}
            >
              <Tag size={12} />
              <span className="branch-name">{tag.name}</span>
            </button>
          ))
        ) : (
          <div className="sidebar-item sidebar-empty-item">No tags</div>
        )}
      </Section>

      <Section title="REMOTES" icon={<Cloud size={14} />} defaultExpanded={false}>
        {remoteBranches.length > 0 ? (
          <RemoteTree branches={remoteBranches} onBranchClick={handleRefClick} />
        ) : (
          <div className="sidebar-item sidebar-empty-item">No remotes</div>
        )}
      </Section>

      <Section title="STASHES" icon={<Archive size={14} />} defaultExpanded={false}>
        {stashes.length > 0 ? (
          stashes.map((stash) => (
            <div key={stash.stash_ref} className="sidebar-item">
              <Archive size={12} />
              <span className="branch-name">{stash.message || `stash@{${stash.index}}`}</span>
            </div>
          ))
        ) : (
          <div className="sidebar-item sidebar-empty-item">No stashes</div>
        )}
      </Section>
    </ScrollArea>
  );
}
