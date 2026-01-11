import { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  FileQuestion,
  ArrowRightLeft,
  Copy,
  AlertTriangle,
  FileType,
  ChevronRight,
  ChevronDown,
  Folder,
} from 'lucide-react';
import type { FileStatus, StatusType } from '../../types';
import { cn } from '../../lib/utils';
import type { StagingViewMode } from './StagingFilters';

const fileItemClass =
  'flex items-center gap-2 py-1.5 px-3 cursor-pointer border-b border-(--border-color) transition-colors hover:bg-(--bg-hover)';
const fileActionClass =
  'flex items-center justify-center w-6 h-6 border-none bg-transparent text-(--text-secondary) cursor-pointer rounded transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)';

interface FileStatusListProps {
  files: FileStatus[];
  title?: string;
  selectedFile: FileStatus | null;
  onSelectFile: (file: FileStatus) => void;
  onStage?: (path: string) => void;
  onUnstage?: (path: string) => void;
  onDiscard?: (path: string) => void;
  showStageButton?: boolean;
  showUnstageButton?: boolean;
  showDiscardButton?: boolean;
  viewMode?: StagingViewMode;
}

export function FileStatusList({
  files,
  title,
  selectedFile,
  onSelectFile,
  onStage,
  onUnstage,
  onDiscard,
  showStageButton = false,
  showUnstageButton = false,
  showDiscardButton = false,
  viewMode = 'flat_single',
}: FileStatusListProps) {
  // Track collapsed folders (inverted logic - folders are expanded by default)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  if (files.length === 0) {
    return null;
  }

  const toggleFolder = (folder: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) {
        next.delete(folder);
      } else {
        next.add(folder);
      }
      return next;
    });
  };

  // Helper to check if folder is expanded (not in collapsed set)
  const isFolderExpanded = (folder: string) => !collapsedFolders.has(folder);

  const renderFileItem = (file: FileStatus) => (
    <FileStatusItem
      key={file.path}
      file={file}
      isSelected={selectedFile?.path === file.path}
      onSelect={() => onSelectFile(file)}
      onStage={showStageButton && onStage ? () => onStage(file.path) : undefined}
      onUnstage={showUnstageButton && onUnstage ? () => onUnstage(file.path) : undefined}
      onDiscard={showDiscardButton && onDiscard ? () => onDiscard(file.path) : undefined}
      compact={viewMode === 'flat_multi'}
    />
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'flat_multi':
        return (
          <div className="flex flex-col flex-1 overflow-y-auto">
            {/* Table header */}
            <div className="flex items-center py-1.5 px-3 border-b border-(--border-color) bg-(--bg-header) text-[11px] font-medium text-(--text-secondary) sticky top-0">
              <div className="w-6 shrink-0" />
              <div className="flex-1 min-w-0 px-2">Filename</div>
              <div className="flex-1 min-w-0 px-2">Path</div>
            </div>
            {/* Table rows */}
            {files.map((file) => (
              <MultiColumnFileItem
                key={file.path}
                file={file}
                isSelected={selectedFile?.path === file.path}
                onSelect={() => onSelectFile(file)}
                onStage={showStageButton && onStage ? () => onStage(file.path) : undefined}
                onUnstage={showUnstageButton && onUnstage ? () => onUnstage(file.path) : undefined}
                onDiscard={showDiscardButton && onDiscard ? () => onDiscard(file.path) : undefined}
              />
            ))}
          </div>
        );
      case 'tree':
        return (
          <TreeView
            files={files}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            isFolderExpanded={isFolderExpanded}
            onToggleFolder={toggleFolder}
            onStage={showStageButton ? onStage : undefined}
            onUnstage={showUnstageButton ? onUnstage : undefined}
            onDiscard={showDiscardButton ? onDiscard : undefined}
          />
        );
      case 'flat_single':
      default:
        return (
          <div className="flex flex-col flex-1 overflow-y-auto">
            {files.map(renderFileItem)}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {title && (
        <div className="flex items-center gap-2 py-2 px-3 bg-(--bg-toolbar) border-b border-(--border-color) text-xs font-semibold uppercase text-(--text-secondary) shrink-0">
          <span>{title}</span>
          <span className="bg-(--bg-badge) py-0.5 px-1.5 rounded-full text-[11px]">
            {files.length}
          </span>
        </div>
      )}
      {renderContent()}
    </div>
  );
}

interface FileStatusItemProps {
  file: FileStatus;
  isSelected: boolean;
  onSelect: () => void;
  onStage?: () => void;
  onUnstage?: () => void;
  onDiscard?: () => void;
  compact?: boolean;
  indent?: number;
}

function FileStatusItem({
  file,
  isSelected,
  onSelect,
  onStage,
  onUnstage,
  onDiscard,
  compact = false,
  indent = 0,
}: FileStatusItemProps) {
  const status = file.staged_status || file.unstaged_status || file.status;
  const statusColorClass = getStatusColorClass(status);

  const handleAction = (e: React.MouseEvent, action: (() => void) | undefined) => {
    e.stopPropagation();
    action?.();
  };

  const renderStatusIcon = () => {
    const Icon = getStatusIcon(status);
    return <Icon className={cn('shrink-0', statusColorClass)} size={compact ? 12 : 14} />;
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 py-1 px-2 cursor-pointer border-b border-r border-(--border-color) transition-colors hover:bg-(--bg-hover)',
          isSelected && 'bg-(--bg-active)'
        )}
        onClick={onSelect}
        title={file.path}
      >
        {renderStatusIcon()}
        <span className="flex-1 text-[12px] whitespace-nowrap overflow-hidden text-ellipsis text-(--text-primary)">
          {getFileName(file.path)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(fileItemClass, isSelected && 'bg-(--bg-active)')}
      onClick={onSelect}
      style={{ paddingLeft: indent > 0 ? `${indent * 16 + 12}px` : undefined }}
    >
      {renderStatusIcon()}
      <span
        className="flex-1 text-[13px] whitespace-nowrap overflow-hidden text-ellipsis text-(--text-primary)"
        title={file.path}
      >
        {getFileName(file.path)}
      </span>
      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 [.flex:hover_&]:opacity-100">
        {onStage && (
          <button
            className={fileActionClass}
            onClick={(e) => handleAction(e, onStage)}
            title="Stage"
          >
            <Plus size={14} />
          </button>
        )}
        {onUnstage && (
          <button
            className={fileActionClass}
            onClick={(e) => handleAction(e, onUnstage)}
            title="Unstage"
          >
            <ArrowRightLeft size={14} />
          </button>
        )}
        {onDiscard && (
          <button
            className={cn(fileActionClass, 'hover:bg-error/10 hover:text-error')}
            onClick={(e) => handleAction(e, onDiscard)}
            title="Discard changes"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// Multi-Column File Item Component (table row)
interface MultiColumnFileItemProps {
  file: FileStatus;
  isSelected: boolean;
  onSelect: () => void;
  onStage?: () => void;
  onUnstage?: () => void;
  onDiscard?: () => void;
}

function MultiColumnFileItem({
  file,
  isSelected,
  onSelect,
}: MultiColumnFileItemProps) {
  const status = file.staged_status || file.unstaged_status || file.status;
  const statusColorClass = getStatusColorClass(status);

  const renderStatusIcon = () => {
    const Icon = getStatusIcon(status);
    return <Icon className={cn('shrink-0', statusColorClass)} size={14} />;
  };

  return (
    <div
      className={cn(
        'flex items-center py-1.5 px-3 cursor-pointer border-b border-(--border-color) transition-colors hover:bg-(--bg-hover)',
        isSelected && 'bg-(--bg-active)'
      )}
      onClick={onSelect}
    >
      <div className="w-6 shrink-0 flex items-center justify-center">
        {renderStatusIcon()}
      </div>
      <div className="flex-1 min-w-0 px-2">
        <span className="text-[13px] text-(--text-primary) whitespace-nowrap overflow-hidden text-ellipsis block">
          {getFileName(file.path)}
        </span>
      </div>
      <div className="flex-1 min-w-0 px-2">
        <span
          className="text-[13px] text-(--text-tertiary) whitespace-nowrap overflow-hidden text-ellipsis block"
          title={file.path}
        >
          {getDirectory(file.path) || '.'}
        </span>
      </div>
    </div>
  );
}

// Tree View Component
interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  file?: FileStatus;
}

interface TreeViewProps {
  files: FileStatus[];
  selectedFile: FileStatus | null;
  onSelectFile: (file: FileStatus) => void;
  isFolderExpanded: (folder: string) => boolean;
  onToggleFolder: (folder: string) => void;
  onStage?: (path: string) => void;
  onUnstage?: (path: string) => void;
  onDiscard?: (path: string) => void;
}

function buildTree(files: FileStatus[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLastPart = i === parts.length - 1;

      let node = currentLevel.find((n) => n.name === part);

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          isFolder: !isLastPart,
          children: [],
          file: isLastPart ? file : undefined,
        };
        currentLevel.push(node);
      }

      if (!isLastPart) {
        currentLevel = node.children;
      }
    }
  }

  // Sort: folders first, then files, alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };
  sortNodes(root);

  return root;
}

function TreeView({
  files,
  selectedFile,
  onSelectFile,
  isFolderExpanded,
  onToggleFolder,
  onStage,
  onUnstage,
  onDiscard,
}: TreeViewProps) {
  const tree = buildTree(files);

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    if (node.isFolder) {
      const isExpanded = isFolderExpanded(node.path);
      return (
        <div key={node.path}>
          <div
            className="flex items-center gap-1.5 py-1 px-2 cursor-pointer transition-colors hover:bg-(--bg-hover)"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => onToggleFolder(node.path)}
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-(--text-secondary) shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-(--text-secondary) shrink-0" />
            )}
            <Folder size={14} className="text-(--text-secondary) shrink-0" />
            <span className="text-[13px] text-(--text-primary)">{node.name}</span>
          </div>
          {isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }

    if (node.file) {
      return (
        <FileStatusItem
          key={node.path}
          file={node.file}
          isSelected={selectedFile?.path === node.file.path}
          onSelect={() => onSelectFile(node.file!)}
          onStage={onStage ? () => onStage(node.file!.path) : undefined}
          onUnstage={onUnstage ? () => onUnstage(node.file!.path) : undefined}
          onDiscard={onDiscard ? () => onDiscard(node.file!.path) : undefined}
          indent={depth}
        />
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">{tree.map((node) => renderNode(node))}</div>
  );
}

function getStatusIcon(status: StatusType) {
  switch (status) {
    case 'added':
      return Plus;
    case 'modified':
      return Pencil;
    case 'deleted':
      return Trash2;
    case 'untracked':
      return FileQuestion;
    case 'renamed':
      return ArrowRightLeft;
    case 'copied':
      return Copy;
    case 'conflicted':
      return AlertTriangle;
    case 'type_changed':
      return FileType;
    default:
      return FileQuestion;
  }
}

function getStatusColorClass(status: StatusType): string {
  switch (status) {
    case 'added':
    case 'untracked':
      return 'text-success';
    case 'modified':
    case 'renamed':
    case 'copied':
    case 'type_changed':
      return 'text-warning';
    case 'deleted':
    case 'conflicted':
      return 'text-error';
    default:
      return '';
  }
}

function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

function getDirectory(path: string): string {
  const parts = path.split('/');
  if (parts.length <= 1) return '';
  parts.pop();
  return parts.join('/') + '/';
}
