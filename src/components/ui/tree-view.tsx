import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { SelectionKey, SelectionMode } from '@/hooks';
import { useListSelection } from '@/hooks';
import { cn } from '@/lib/utils';

export interface TreeNode<T = unknown> {
  id: string;
  name: string;
  data?: T;
  children?: TreeNode<T>[];
}

interface TreeItemRenderProps<T> {
  node: TreeNode<T>;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  toggleExpand: () => void;
  select: () => void;
}

interface TreeViewProps<T> {
  data: TreeNode<T>[];
  renderItem?: (props: TreeItemRenderProps<T>) => React.ReactNode;
  expandedIds?: Set<string>;
  onExpandedChange?: (expandedIds: Set<string>) => void;
  defaultExpandedIds?: Set<string>;
  defaultExpandAll?: boolean;
  className?: string;
  itemClassName?: string;

  // Selection API
  selectionMode?: SelectionMode;
  selectedKeys?: Set<SelectionKey>;
  onSelectionChange?: (keys: Set<SelectionKey>) => void;
}

function getAllIds<T>(nodes: TreeNode<T>[]): string[] {
  const ids: string[] = [];
  const traverse = (nodeList: TreeNode<T>[]) => {
    for (const node of nodeList) {
      if (node.children && node.children.length > 0) {
        ids.push(node.id);
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return ids;
}

function collectLeafIds<T>(nodes: TreeNode<T>[]): string[] {
  const ids: string[] = [];
  const traverse = (nodeList: TreeNode<T>[]) => {
    for (const node of nodeList) {
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      } else {
        ids.push(node.id);
      }
    }
  };
  traverse(nodes);
  return ids;
}

function getInitialExpandedIds<T>(
  data: TreeNode<T>[],
  defaultExpandedIds?: Set<string>,
  defaultExpandAll?: boolean
): Set<string> {
  if (defaultExpandedIds) return defaultExpandedIds;
  if (defaultExpandAll) return new Set(getAllIds(data));
  return new Set<string>();
}

export function TreeView<T>({
  data,
  renderItem,
  expandedIds: controlledExpandedIds,
  onExpandedChange,
  defaultExpandedIds,
  defaultExpandAll = true,
  className,
  itemClassName,
  selectionMode,
  selectedKeys: controlledSelectedKeys,
  onSelectionChange,
}: TreeViewProps<T>) {
  const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(() =>
    getInitialExpandedIds(data, defaultExpandedIds, defaultExpandAll)
  );

  const expandedIds = controlledExpandedIds ?? internalExpandedIds;
  const setExpandedIds = onExpandedChange ?? setInternalExpandedIds;

  const toggleExpand = useCallback(
    (id: string) => {
      const next = new Set(expandedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setExpandedIds(next);
    },
    [expandedIds, setExpandedIds]
  );

  const isExpanded = useCallback((id: string) => expandedIds.has(id), [expandedIds]);

  // Flatten leaf node IDs for selection tracking
  const leafIds = useMemo(() => collectLeafIds(data), [data]);
  const getItemKey = useCallback((id: string) => id, []);

  const selection = useListSelection({
    items: leafIds,
    getItemKey,
    selectionMode: selectionMode ?? 'none',
    selectedKeys: controlledSelectedKeys,
    onSelectionChange,
  });

  const renderNode = (node: TreeNode<T>, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const expanded = isExpanded(node.id);
    const selected = selection.isSelected(node.id);
    const selectNode = () => selection.handleItemClick(node.id);

    if (renderItem) {
      return (
        <div key={node.id}>
          {renderItem({
            node,
            depth,
            isExpanded: expanded,
            isSelected: selected,
            toggleExpand: () => toggleExpand(node.id),
            select: selectNode,
          })}
          {hasChildren && expanded && node.children!.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }

    // Default rendering
    if (hasChildren) {
      return (
        <div key={node.id}>
          <div
            className={cn(
              'flex items-center gap-1.5 py-1 px-2 cursor-pointer transition-colors hover:bg-(--bg-hover)',
              selected && 'bg-(--bg-active)',
              itemClassName
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => toggleExpand(node.id)}
          >
            {expanded ? (
              <ChevronDown size={14} className="text-(--text-secondary) shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-(--text-secondary) shrink-0" />
            )}
            <Folder size={14} className="text-(--text-secondary) shrink-0" />
            <span className="text-base text-(--text-primary)">{node.name}</span>
          </div>
          {expanded && node.children!.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }

    // Leaf node
    return (
      <div
        key={node.id}
        className={cn(
          'flex items-center gap-1.5 py-1 px-2 cursor-pointer transition-colors hover:bg-(--bg-hover)',
          selected && 'bg-(--bg-active)',
          itemClassName
        )}
        style={{ paddingLeft: `${depth * 16 + 24}px` }}
        onClick={selectNode}
      >
        <span className="text-base text-(--text-primary)">{node.name}</span>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col flex-1 overflow-y-auto', className)}>
      {data.map((node) => renderNode(node))}
    </div>
  );
}

// Utility function to build a tree from flat file paths
export function buildTreeFromPaths<T>(
  items: T[],
  getPath: (item: T) => string,
  getId?: (item: T) => string
): TreeNode<T>[] {
  const root: TreeNode<T>[] = [];

  for (const item of items) {
    const path = getPath(item);
    const parts = path.split('/');
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLastPart = i === parts.length - 1;

      let node = currentLevel.find((n) => n.name === part && !isLastPart === !!n.children?.length);

      if (!node) {
        node = {
          id: isLastPart && getId ? getId(item) : currentPath,
          name: part,
          data: isLastPart ? item : undefined,
          children: isLastPart ? undefined : [],
        };
        currentLevel.push(node);
      }

      if (!isLastPart && node.children) {
        currentLevel = node.children;
      }
    }
  }

  // Sort: folders first, then files, alphabetically
  const sortNodes = (nodes: TreeNode<T>[]) => {
    nodes.sort((a, b) => {
      const aIsFolder = !!a.children?.length;
      const bIsFolder = !!b.children?.length;
      if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };
  sortNodes(root);

  return root;
}
