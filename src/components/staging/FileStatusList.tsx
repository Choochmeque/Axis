import type React from 'react';
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
import { Checkbox, TreeView as UITreeView, buildTreeFromPaths } from '@/components/ui';
import { StatusType } from '@/types';
import type { FileStatus, StatusType as StatusTypeType } from '@/types';
import { cn } from '@/lib/utils';
import { StagingViewMode } from './StagingFilters';
import { StagingFileContextMenu } from './StagingFileContextMenu';

// Extended file type for fluid staging
export interface FluidFile extends FileStatus {
  isStaged: boolean;
}

const fileItemClass =
  'flex items-center gap-2 py-1.5 px-3 cursor-pointer border-b border-(--border-color) transition-colors hover:bg-(--bg-hover)';

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
  viewMode = StagingViewMode.FlatSingle,
}: FileStatusListProps) {
  if (files.length === 0) {
    return null;
  }

  const renderFileItem = (file: FileStatus) => (
    <FileStatusItem
      key={file.path}
      file={file}
      isSelected={selectedFile?.path === file.path}
      onSelect={() => onSelectFile(file)}
      onStage={showStageButton && onStage ? () => onStage(file.path) : undefined}
      onUnstage={showUnstageButton && onUnstage ? () => onUnstage(file.path) : undefined}
      onDiscard={showDiscardButton && onDiscard ? () => onDiscard(file.path) : undefined}
      compact={viewMode === StagingViewMode.FlatMulti}
    />
  );

  const renderContent = () => {
    switch (viewMode) {
      case StagingViewMode.FlatMulti:
        return (
          <div className="flex flex-col flex-1 overflow-y-auto">
            {/* Table header */}
            <div className="flex items-center py-1.5 px-3 border-b border-(--border-color) bg-(--bg-header) text-sm font-medium uppercase text-(--text-secondary) sticky top-0">
              <div className="w-6 shrink-0" />
              <div className="w-6 shrink-0" />
              <div className="flex-1 min-w-0 px-2">Filename</div>
              <div className="col-divider" />
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
      case StagingViewMode.Tree:
        return (
          <TreeView
            files={files}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            onStage={showStageButton ? onStage : undefined}
            onUnstage={showUnstageButton ? onUnstage : undefined}
            onDiscard={showDiscardButton ? onDiscard : undefined}
          />
        );
      case StagingViewMode.FlatSingle:
      default:
        return (
          <div className="flex flex-col flex-1 overflow-y-auto">{files.map(renderFileItem)}</div>
        );
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {title && (
        <div className="flex items-center gap-2 py-2 px-3 bg-(--bg-toolbar) border-b border-(--border-color) text-xs font-semibold uppercase text-(--text-secondary) shrink-0">
          <span>{title}</span>
          <span className={cn('badge', 'text-sm font-normal')}>{files.length}</span>
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
  isTreeView?: boolean;
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
  isTreeView = false,
}: FileStatusItemProps) {
  // Determine if displaying in staged or unstaged context based on available actions
  const isInStagedContext = onUnstage && !onStage;
  // Use appropriate status based on context
  const status = isInStagedContext
    ? file.stagedStatus || file.unstagedStatus || file.status
    : file.unstagedStatus || file.stagedStatus || file.status;
  const statusColorClass = getStatusColorClass(status);

  const renderStatusIcon = () => {
    const Icon = getStatusIcon(status);
    return <Icon className={cn('shrink-0', statusColorClass)} size={compact ? 12 : 14} />;
  };

  // Reuse the context check for isStaged
  const isStaged = isInStagedContext;

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      // Checking = stage the file
      onStage?.();
    } else {
      // Unchecking = unstage the file
      onUnstage?.();
    }
  };

  if (compact) {
    return (
      <StagingFileContextMenu
        file={file}
        isStaged={!!isStaged}
        isTreeView={isTreeView}
        onStage={onStage}
        onUnstage={onUnstage}
        onDiscard={onDiscard}
      >
        <div
          className={cn(
            'flex items-center gap-1.5 py-1 px-2 cursor-pointer border-b border-r border-(--border-color) transition-colors hover:bg-(--bg-hover)',
            isSelected && 'bg-(--bg-active)'
          )}
          onClick={onSelect}
          title={file.path}
        >
          <Checkbox
            checked={isStaged}
            onCheckedChange={(checked: boolean | 'indeterminate') => {
              handleCheckboxChange(checked === true);
            }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
          {renderStatusIcon()}
          <span className="flex-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis text-(--text-primary)">
            {getFileName(file.path)}
          </span>
        </div>
      </StagingFileContextMenu>
    );
  }

  return (
    <StagingFileContextMenu
      file={file}
      isStaged={!!isStaged}
      isTreeView={isTreeView}
      onStage={onStage}
      onUnstage={onUnstage}
      onDiscard={onDiscard}
    >
      <div
        className={cn(fileItemClass, isSelected && 'bg-(--bg-active)')}
        onClick={onSelect}
        style={{ paddingLeft: indent > 0 ? `${indent * 16 + 8}px` : undefined }}
      >
        {indent > 0 && <span className="w-3.5 shrink-0" />}{' '}
        {/* Spacer to align with folder chevrons */}
        <Checkbox
          checked={isStaged}
          onCheckedChange={(checked: boolean | 'indeterminate') => {
            handleCheckboxChange(checked === true);
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
        {renderStatusIcon()}
        <span
          className="flex-1 text-base whitespace-nowrap overflow-hidden text-ellipsis text-(--text-primary)"
          title={file.path}
        >
          {getFileName(file.path)}
        </span>
      </div>
    </StagingFileContextMenu>
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
  onDiscard,
}: MultiColumnFileItemProps) {
  // Determine if displaying in staged or unstaged context based on available actions
  const isInStagedContext = onUnstage && !onStage;
  // Use appropriate status based on context
  const status = isInStagedContext
    ? file.stagedStatus || file.unstagedStatus || file.status
    : file.unstagedStatus || file.stagedStatus || file.status;
  const statusColorClass = getStatusColorClass(status);

  // Check if this is a staged file (has only unstage action)
  const isStaged = isInStagedContext;

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

  return (
    <StagingFileContextMenu
      file={file}
      isStaged={!!isStaged}
      onStage={onStage}
      onUnstage={onUnstage}
      onDiscard={onDiscard}
    >
      <div
        className={cn(
          'flex items-center py-1.5 px-3 cursor-pointer border-b border-(--border-color) transition-colors hover:bg-(--bg-hover)',
          isSelected && 'bg-(--bg-active)'
        )}
        onClick={onSelect}
      >
        <div className="w-6 shrink-0 flex items-center justify-center">
          <Checkbox
            checked={isStaged}
            onCheckedChange={(checked: boolean | 'indeterminate') => {
              handleCheckboxChange(checked === true);
            }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        </div>
        <div className="w-6 shrink-0 flex items-center justify-center">{renderStatusIcon()}</div>
        <div className="flex-1 min-w-0 px-2">
          <span className="text-base text-(--text-primary) whitespace-nowrap overflow-hidden text-ellipsis block">
            {getFileName(file.path)}
          </span>
        </div>
        <div className="flex-1 min-w-0 px-2">
          <span
            className="text-base text-(--text-tertiary) whitespace-nowrap overflow-hidden text-ellipsis block"
            title={file.path}
          >
            {getDirectory(file.path) || '.'}
          </span>
        </div>
      </div>
    </StagingFileContextMenu>
  );
}

// Tree View Component using UI TreeView
interface TreeViewProps {
  files: FileStatus[];
  selectedFile: FileStatus | null;
  onSelectFile: (file: FileStatus) => void;
  onStage?: (path: string) => void;
  onUnstage?: (path: string) => void;
  onDiscard?: (path: string) => void;
}

function TreeView({
  files,
  selectedFile,
  onSelectFile,
  onStage,
  onUnstage,
  onDiscard,
}: TreeViewProps) {
  const treeData = buildTreeFromPaths(
    files,
    (f) => f.path,
    (f) => f.path
  );

  return (
    <UITreeView<FileStatus>
      data={treeData}
      selectedId={selectedFile?.path ?? null}
      defaultExpandAll
      renderItem={({ node, depth, isExpanded, toggleExpand }) => {
        // Folder node
        if (node.children && node.children.length > 0) {
          return (
            <div
              className="flex items-center gap-1.5 py-1 px-2 cursor-pointer transition-colors hover:bg-(--bg-hover)"
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={toggleExpand}
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-(--text-secondary) shrink-0" />
              ) : (
                <ChevronRight size={14} className="text-(--text-secondary) shrink-0" />
              )}
              <Folder size={14} className="text-(--text-secondary) shrink-0" />
              <span className="text-base text-(--text-primary)">{node.name}</span>
            </div>
          );
        }

        // File node
        if (node.data) {
          return (
            <FileStatusItem
              file={node.data}
              isSelected={selectedFile?.path === node.data.path}
              onSelect={() => onSelectFile(node.data!)}
              onStage={onStage ? () => onStage(node.data!.path) : undefined}
              onUnstage={onUnstage ? () => onUnstage(node.data!.path) : undefined}
              isTreeView
              onDiscard={onDiscard ? () => onDiscard(node.data!.path) : undefined}
              indent={depth}
            />
          );
        }

        return null;
      }}
    />
  );
}

// Fluid File List Component for unified staging view
interface FluidFileListProps {
  files: FluidFile[];
  selectedFile: FileStatus | null;
  onSelectFile: (file: FileStatus, isStaged: boolean) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onDiscard: (path: string) => void;
  viewMode?: StagingViewMode;
}

export function FluidFileList({
  files,
  selectedFile,
  onSelectFile,
  onStage,
  onUnstage,
  onDiscard,
  viewMode = StagingViewMode.FlatSingle,
}: FluidFileListProps) {
  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-(--text-tertiary) text-base italic">No changes</div>
    );
  }

  const renderFileItem = (file: FluidFile) => (
    <FluidFileItem
      key={file.path}
      file={file}
      isSelected={selectedFile?.path === file.path}
      onSelect={() => onSelectFile(file, file.isStaged)}
      onStage={() => onStage(file.path)}
      onUnstage={() => onUnstage(file.path)}
      onDiscard={() => onDiscard(file.path)}
    />
  );

  if (viewMode === StagingViewMode.Tree) {
    return (
      <FluidTreeView
        files={files}
        selectedFile={selectedFile}
        onSelectFile={onSelectFile}
        onStage={onStage}
        onUnstage={onUnstage}
        onDiscard={onDiscard}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">{files.map(renderFileItem)}</div>
  );
}

// Fluid File Item Component
interface FluidFileItemProps {
  file: FluidFile;
  isSelected: boolean;
  onSelect: () => void;
  onStage: () => void;
  onUnstage: () => void;
  onDiscard: () => void;
  indent?: number;
}

function FluidFileItem({
  file,
  isSelected,
  onSelect,
  onStage,
  onUnstage,
  onDiscard,
  indent = 0,
}: FluidFileItemProps) {
  // Use appropriate status based on whether file is staged
  const status = file.isStaged
    ? file.stagedStatus || file.unstagedStatus || file.status
    : file.unstagedStatus || file.stagedStatus || file.status;
  const statusColorClass = getStatusColorClass(status);

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      onStage();
    } else {
      onUnstage();
    }
  };

  const renderStatusIcon = () => {
    const Icon = getStatusIcon(status);
    return <Icon className={cn('shrink-0', statusColorClass)} size={14} />;
  };

  return (
    <StagingFileContextMenu
      file={file}
      isStaged={file.isStaged}
      onStage={onStage}
      onUnstage={onUnstage}
      onDiscard={onDiscard}
    >
      <div
        className={cn(fileItemClass, isSelected && 'bg-(--bg-active)')}
        onClick={onSelect}
        style={{ paddingLeft: indent > 0 ? `${indent * 16 + 8}px` : undefined }}
      >
        {indent > 0 && <span className="w-3.5 shrink-0" />}
        <Checkbox
          checked={file.isStaged}
          onCheckedChange={(checked: boolean | 'indeterminate') => {
            handleCheckboxChange(checked === true);
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
        {renderStatusIcon()}
        <span
          className="flex-1 text-base whitespace-nowrap overflow-hidden text-ellipsis text-(--text-primary)"
          title={file.path}
        >
          {getFileName(file.path)}
        </span>
        <span
          className="text-sm text-(--text-tertiary) whitespace-nowrap overflow-hidden text-ellipsis max-w-40"
          title={file.path}
        >
          {getDirectory(file.path)}
        </span>
      </div>
    </StagingFileContextMenu>
  );
}

// Fluid Tree View Component using UI TreeView
interface FluidTreeViewProps {
  files: FluidFile[];
  selectedFile: FileStatus | null;
  onSelectFile: (file: FileStatus, isStaged: boolean) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onDiscard: (path: string) => void;
}

function FluidTreeView({
  files,
  selectedFile,
  onSelectFile,
  onStage,
  onUnstage,
  onDiscard,
}: FluidTreeViewProps) {
  const treeData = buildTreeFromPaths(
    files,
    (f) => f.path,
    (f) => f.path
  );

  return (
    <UITreeView<FluidFile>
      data={treeData}
      selectedId={selectedFile?.path ?? null}
      defaultExpandAll
      renderItem={({ node, depth, isExpanded, toggleExpand }) => {
        // Folder node
        if (node.children && node.children.length > 0) {
          return (
            <div
              className="flex items-center gap-1.5 py-1 px-2 cursor-pointer transition-colors hover:bg-(--bg-hover)"
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={toggleExpand}
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-(--text-secondary) shrink-0" />
              ) : (
                <ChevronRight size={14} className="text-(--text-secondary) shrink-0" />
              )}
              <Folder size={14} className="text-(--text-secondary) shrink-0" />
              <span className="text-base text-(--text-primary)">{node.name}</span>
            </div>
          );
        }

        // File node
        if (node.data) {
          return (
            <FluidFileItem
              file={node.data}
              isSelected={selectedFile?.path === node.data.path}
              onSelect={() => onSelectFile(node.data!, node.data!.isStaged)}
              onStage={() => onStage(node.data!.path)}
              onUnstage={() => onUnstage(node.data!.path)}
              onDiscard={() => onDiscard(node.data!.path)}
              indent={depth}
            />
          );
        }

        return null;
      }}
    />
  );
}

function getStatusIcon(status: StatusTypeType) {
  switch (status) {
    case StatusType.Added:
      return Plus;
    case StatusType.Modified:
      return Pencil;
    case StatusType.Deleted:
      return Trash2;
    case StatusType.Untracked:
      return FileQuestion;
    case StatusType.Renamed:
      return ArrowRightLeft;
    case StatusType.Copied:
      return Copy;
    case StatusType.Conflicted:
      return AlertTriangle;
    case StatusType.TypeChanged:
      return FileType;
    default:
      return FileQuestion;
  }
}

function getStatusColorClass(status: StatusTypeType): string {
  switch (status) {
    case StatusType.Added:
    case StatusType.Untracked:
      return 'text-success';
    case StatusType.Modified:
    case StatusType.Renamed:
    case StatusType.Copied:
    case StatusType.TypeChanged:
      return 'text-warning';
    case StatusType.Deleted:
    case StatusType.Conflicted:
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
