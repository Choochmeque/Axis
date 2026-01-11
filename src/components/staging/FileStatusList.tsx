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
  MoreHorizontal,
  FileX,
  EyeOff,
  FolderOpen,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import type { FileStatus, StatusType } from '../../types';
import { cn } from '../../lib/utils';
import type { StagingViewMode } from './StagingFilters';
import { useRepositoryStore } from '../../store/repositoryStore';

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
  const { repository } = useRepositoryStore();
  const status = file.staged_status || file.unstaged_status || file.status;
  const statusColorClass = getStatusColorClass(status);

  const handleShowInFinder = async () => {
    if (repository?.path) {
      const fullPath = `${repository.path}/${file.path}`;
      try {
        await invoke('show_in_folder', { path: fullPath });
      } catch (err) {
        console.error('Failed to show in finder:', err);
      }
    }
  };

  const renderStatusIcon = () => {
    const Icon = getStatusIcon(status);
    return <Icon className={cn('shrink-0', statusColorClass)} size={compact ? 12 : 14} />;
  };

  // Check if this is an unstaged file (has stage and discard actions)
  const isUnstaged = onStage && onDiscard;
  // Check if this is a staged file (has only unstage action)
  const isStaged = onUnstage && !onStage;

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      // Checking = stage the file
      onStage?.();
    } else {
      // Unchecking = unstage the file
      onUnstage?.();
    }
  };

  const dropdownContentClass =
    'min-w-40 bg-(--bg-secondary) border border-(--border-color) rounded-md p-1 shadow-lg z-50';
  const dropdownItemClass =
    'flex items-center gap-2 py-1.5 px-2 rounded text-xs text-(--text-primary) cursor-pointer outline-none hover:bg-(--bg-hover) focus:bg-(--bg-hover) data-highlighted:bg-(--bg-hover)';
  const dropdownItemDisabledClass =
    'flex items-center gap-2 py-1.5 px-2 rounded text-xs text-(--text-tertiary) cursor-not-allowed outline-none';

  const checkboxClass =
    'flex items-center justify-center w-4 h-4 rounded border border-(--border-color) bg-(--bg-primary) shrink-0 transition-colors data-[state=checked]:bg-(--accent-color) data-[state=checked]:border-(--accent-color)';

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
        <Checkbox.Root
          className={checkboxClass}
          checked={isStaged}
          onCheckedChange={(checked: boolean | 'indeterminate') => {
            handleCheckboxChange(checked === true);
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <Checkbox.Indicator>
            <Check size={10} className="text-white" />
          </Checkbox.Indicator>
        </Checkbox.Root>
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
      <Checkbox.Root
        className={checkboxClass}
        checked={isStaged}
        onCheckedChange={(checked: boolean | 'indeterminate') => {
          handleCheckboxChange(checked === true);
        }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Checkbox.Indicator>
          <Check size={10} className="text-white" />
        </Checkbox.Indicator>
      </Checkbox.Root>
      {renderStatusIcon()}
      <span
        className="flex-1 text-[13px] whitespace-nowrap overflow-hidden text-ellipsis text-(--text-primary)"
        title={file.path}
      >
        {getFileName(file.path)}
      </span>
      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 [.flex:hover_&]:opacity-100">
        {isUnstaged && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className={fileActionClass}
                onClick={(e) => e.stopPropagation()}
                title="Actions"
              >
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={dropdownContentClass} align="end" sideOffset={4}>
                <DropdownMenu.Item
                  className={dropdownItemClass}
                  onSelect={() => onStage?.()}
                >
                  <Plus size={14} />
                  <span>Stage file</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={cn(dropdownItemClass, 'text-error hover:bg-error/10 data-highlighted:bg-error/10')}
                  onSelect={() => onDiscard?.()}
                >
                  <Trash2 size={14} />
                  <span>Discard file</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={cn(dropdownItemClass, 'text-error hover:bg-error/10 data-highlighted:bg-error/10')}
                  onSelect={() => onDiscard?.()}
                >
                  <FileX size={14} />
                  <span>Remove file</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item className={dropdownItemDisabledClass} disabled>
                  <EyeOff size={14} />
                  <span>Ignore file</span>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-(--border-color) my-1" />
                <DropdownMenu.Item
                  className={dropdownItemClass}
                  onSelect={handleShowInFinder}
                >
                  <FolderOpen size={14} />
                  <span>Show in Finder</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
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
  onStage,
  onUnstage,
}: MultiColumnFileItemProps) {
  const status = file.staged_status || file.unstaged_status || file.status;
  const statusColorClass = getStatusColorClass(status);

  // Check if this is a staged file (has only unstage action)
  const isStaged = onUnstage && !onStage;

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      onStage?.();
    } else {
      onUnstage?.();
    }
  };

  const renderStatusIcon = () => {
    const Icon = getStatusIcon(status);
    return <Icon className={cn('shrink-0', statusColorClass)} size={14} />;
  };

  const checkboxClass =
    'flex items-center justify-center w-4 h-4 rounded border border-(--border-color) bg-(--bg-primary) shrink-0 transition-colors data-[state=checked]:bg-(--accent-color) data-[state=checked]:border-(--accent-color)';

  return (
    <div
      className={cn(
        'flex items-center py-1.5 px-3 cursor-pointer border-b border-(--border-color) transition-colors hover:bg-(--bg-hover)',
        isSelected && 'bg-(--bg-active)'
      )}
      onClick={onSelect}
    >
      <div className="w-6 shrink-0 flex items-center justify-center">
        <Checkbox.Root
          className={checkboxClass}
          checked={isStaged}
          onCheckedChange={(checked: boolean | 'indeterminate') => {
            handleCheckboxChange(checked === true);
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <Checkbox.Indicator>
            <Check size={10} className="text-white" />
          </Checkbox.Indicator>
        </Checkbox.Root>
      </div>
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
