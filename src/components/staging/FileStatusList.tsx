import {
  AlertTriangle,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Copy,
  FileQuestion,
  FileType,
  Folder,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { buildTreeFromPaths, Checkbox, TreeView as UITreeView, VirtualList } from '@/components/ui';
import type { SelectionKey } from '@/hooks';
import { cn, testId } from '@/lib/utils';
import type { FileStatus, StatusType as StatusTypeType } from '@/types';
import { StatusType } from '@/types';
import { StagingFileContextMenu } from './StagingFileContextMenu';
import { StagingViewMode } from './StagingFilters';

// Extended file type for fluid staging
export interface FluidFile extends FileStatus {
  isStaged: boolean;
}

interface FileStatusListProps {
  files: FileStatus[];
  title?: string;
  emptyMessage?: string;
  selectedFile: FileStatus | null;
  onSelectFile: (file: FileStatus | null) => void;
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
  emptyMessage,
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
  const { t } = useTranslation();

  const selectedKeys = useMemo(
    () => (selectedFile ? new Set<SelectionKey>([selectedFile.path]) : new Set<SelectionKey>()),
    [selectedFile]
  );

  const handleSelectionChange = (keys: Set<SelectionKey>) => {
    if (keys.size === 0) {
      onSelectFile(null);
      return;
    }
    const key = keys.values().next().value;
    const file = files.find((f) => f.path === key);
    if (file) {
      onSelectFile(file);
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case StagingViewMode.FlatMulti:
        return (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Table header */}
            <div className="flex items-center py-1.5 px-3 border-b border-(--border-color) bg-(--bg-header) text-sm font-medium uppercase text-(--text-secondary) shrink-0">
              <div className="w-6 shrink-0" />
              <div className="w-6 shrink-0" />
              <div className="flex-1 min-w-0 px-2">{t('staging.fileList.filename')}</div>
              <div className="col-divider" />
              <div className="flex-1 min-w-0 px-2">{t('staging.fileList.path')}</div>
            </div>
            {/* Table rows */}
            <VirtualList
              items={files}
              getItemKey={(file) => file.path}
              itemHeight={36}
              emptyMessage={emptyMessage}
              selectionMode="single"
              selectedKeys={selectedKeys}
              onSelectionChange={handleSelectionChange}
              itemClassName="!py-1.5 !gap-0 !px-3"
            >
              {(file) => (
                <MultiColumnFileItemContent
                  file={file}
                  onStage={showStageButton && onStage ? () => onStage(file.path) : undefined}
                  onUnstage={
                    showUnstageButton && onUnstage ? () => onUnstage(file.path) : undefined
                  }
                  onDiscard={
                    showDiscardButton && onDiscard ? () => onDiscard(file.path) : undefined
                  }
                />
              )}
            </VirtualList>
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
          <VirtualList
            items={files}
            getItemKey={(file) => file.path}
            itemHeight={36}
            emptyMessage={emptyMessage}
            selectionMode="single"
            selectedKeys={selectedKeys}
            onSelectionChange={handleSelectionChange}
            itemClassName="!py-1.5 !gap-2"
          >
            {(file) => (
              <FileStatusItemContent
                file={file}
                onStage={showStageButton && onStage ? () => onStage(file.path) : undefined}
                onUnstage={showUnstageButton && onUnstage ? () => onUnstage(file.path) : undefined}
                onDiscard={showDiscardButton && onDiscard ? () => onDiscard(file.path) : undefined}
              />
            )}
          </VirtualList>
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

interface FileStatusItemContentProps {
  file: FileStatus;
  onStage?: () => void;
  onUnstage?: () => void;
  onDiscard?: () => void;
}

function FileStatusItemContent({
  file,
  onStage,
  onUnstage,
  onDiscard,
}: FileStatusItemContentProps) {
  // Determine if displaying in staged or unstaged context based on available actions
  const isInStagedContext = onUnstage && !onStage;
  // Use appropriate status based on context
  const status = isInStagedContext
    ? file.stagedStatus || file.unstagedStatus || file.status
    : file.unstagedStatus || file.stagedStatus || file.status;
  const statusColorClass = getStatusColorClass(status);
  const isStaged = isInStagedContext;

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      onStage?.();
    } else {
      onUnstage?.();
    }
  };

  return (
    <StagingFileContextMenu
      file={file}
      isStaged={!!isStaged}
      onStage={onStage}
      onUnstage={onUnstage}
      onDiscard={onDiscard}
    >
      <div className="contents">
        <Checkbox
          {...testId('e2e-staging-file-checkbox')}
          checked={isStaged}
          onCheckedChange={(checked: boolean | 'indeterminate') => {
            handleCheckboxChange(checked === true);
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
        <StatusIcon status={status} className={cn('shrink-0', statusColorClass)} />
        <span
          {...testId(`e2e-staging-file-${getFileName(file.path)}`)}
          className="flex-1 text-base whitespace-nowrap overflow-hidden text-ellipsis text-(--text-primary)"
          title={getDisplayTooltip(file, status)}
        >
          {getDisplayFileName(file, status)}
        </span>
      </div>
    </StagingFileContextMenu>
  );
}

interface MultiColumnFileItemContentProps {
  file: FileStatus;
  onStage?: () => void;
  onUnstage?: () => void;
  onDiscard?: () => void;
}

function MultiColumnFileItemContent({
  file,
  onStage,
  onUnstage,
  onDiscard,
}: MultiColumnFileItemContentProps) {
  // Determine if displaying in staged or unstaged context based on available actions
  const isInStagedContext = onUnstage && !onStage;
  // Use appropriate status based on context
  const status = isInStagedContext
    ? file.stagedStatus || file.unstagedStatus || file.status
    : file.unstagedStatus || file.stagedStatus || file.status;
  const statusColorClass = getStatusColorClass(status);
  const isStaged = isInStagedContext;

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      onStage?.();
    } else {
      onUnstage?.();
    }
  };

  return (
    <StagingFileContextMenu
      file={file}
      isStaged={!!isStaged}
      onStage={onStage}
      onUnstage={onUnstage}
      onDiscard={onDiscard}
    >
      <div className="contents">
        <div className="w-6 shrink-0 flex items-center justify-center">
          <Checkbox
            checked={isStaged}
            onCheckedChange={(checked: boolean | 'indeterminate') => {
              handleCheckboxChange(checked === true);
            }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        </div>
        <div className="w-6 shrink-0 flex items-center justify-center">
          <StatusIcon status={status} className={cn('shrink-0', statusColorClass)} />
        </div>
        <div className="flex-1 min-w-0 px-2">
          <span className="text-base text-(--text-primary) whitespace-nowrap overflow-hidden text-ellipsis block">
            {getDisplayFileName(file, status)}
          </span>
        </div>
        <div className="flex-1 min-w-0 px-2">
          <span
            className="text-base text-(--text-tertiary) whitespace-nowrap overflow-hidden text-ellipsis block"
            title={getDisplayTooltip(file, status)}
          >
            {getDirectory(file.path) || '.'}
          </span>
        </div>
      </div>
    </StagingFileContextMenu>
  );
}

// FileStatusItem for tree view (needs different styling with indent)
interface FileStatusItemProps {
  file: FileStatus;
  isSelected: boolean;
  onSelect: () => void;
  onStage?: () => void;
  onUnstage?: () => void;
  onDiscard?: () => void;
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
  const isStaged = isInStagedContext;

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      onStage?.();
    } else {
      onUnstage?.();
    }
  };

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
          'flex items-center gap-2 py-1.5 px-3 cursor-pointer border-b border-(--border-color) transition-colors hover:bg-(--bg-hover)',
          isSelected && 'bg-(--bg-active)'
        )}
        onClick={onSelect}
        style={{ paddingLeft: indent > 0 ? `${indent * 16 + 8}px` : undefined }}
      >
        {indent > 0 && <span className="w-3.5 shrink-0" />}
        <Checkbox
          checked={isStaged}
          onCheckedChange={(checked: boolean | 'indeterminate') => {
            handleCheckboxChange(checked === true);
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
        <StatusIcon status={status} className={cn('shrink-0', statusColorClass)} />
        <span
          className="flex-1 text-base whitespace-nowrap overflow-hidden text-ellipsis text-(--text-primary)"
          title={getDisplayTooltip(file, status)}
        >
          {getDisplayFileName(file, status)}
        </span>
      </div>
    </StagingFileContextMenu>
  );
}

// Tree View Component using UI TreeView
interface TreeViewProps {
  files: FileStatus[];
  selectedFile: FileStatus | null;
  onSelectFile: (file: FileStatus | null) => void;
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

  const selectedKeys = useMemo(
    () => (selectedFile ? new Set<SelectionKey>([selectedFile.path]) : new Set<SelectionKey>()),
    [selectedFile]
  );

  const handleSelectionChange = (keys: Set<SelectionKey>) => {
    if (keys.size === 0) {
      onSelectFile(null);
      return;
    }
    const key = keys.values().next().value;
    const file = files.find((f) => f.path === key);
    if (file) {
      onSelectFile(file);
    }
  };

  return (
    <UITreeView<FileStatus>
      data={treeData}
      selectionMode="single"
      selectedKeys={selectedKeys}
      onSelectionChange={handleSelectionChange}
      defaultExpandAll
      renderItem={({ node, depth, isExpanded, isSelected, toggleExpand, select }) => {
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
              isSelected={isSelected}
              onSelect={select}
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
  emptyMessage?: string;
  selectedFile: FileStatus | null;
  onSelectFile: (file: FileStatus | null, isStaged: boolean) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onDiscard: (path: string) => void;
  viewMode?: StagingViewMode;
}

export function FluidFileList({
  files,
  emptyMessage,
  selectedFile,
  onSelectFile,
  onStage,
  onUnstage,
  onDiscard,
  viewMode = StagingViewMode.FlatSingle,
}: FluidFileListProps) {
  const selectedKeys = useMemo(
    () => (selectedFile ? new Set<SelectionKey>([selectedFile.path]) : new Set<SelectionKey>()),
    [selectedFile]
  );

  const handleSelectionChange = (keys: Set<SelectionKey>) => {
    if (keys.size === 0) {
      onSelectFile(null, false);
      return;
    }
    const key = keys.values().next().value;
    const file = files.find((f) => f.path === key);
    if (file) {
      onSelectFile(file, file.isStaged);
    }
  };

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
    <VirtualList
      items={files}
      getItemKey={(file) => file.path}
      itemHeight={36}
      emptyMessage={emptyMessage}
      selectionMode="single"
      selectedKeys={selectedKeys}
      onSelectionChange={handleSelectionChange}
      itemClassName="!py-1.5 !gap-2"
    >
      {(file) => (
        <FluidFileItemContent
          file={file}
          onStage={() => onStage(file.path)}
          onUnstage={() => onUnstage(file.path)}
          onDiscard={() => onDiscard(file.path)}
        />
      )}
    </VirtualList>
  );
}

// Fluid File Item Content Component
interface FluidFileItemContentProps {
  file: FluidFile;
  onStage: () => void;
  onUnstage: () => void;
  onDiscard: () => void;
}

function FluidFileItemContent({ file, onStage, onUnstage, onDiscard }: FluidFileItemContentProps) {
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

  return (
    <StagingFileContextMenu
      file={file}
      isStaged={file.isStaged}
      onStage={onStage}
      onUnstage={onUnstage}
      onDiscard={onDiscard}
    >
      <div className="contents">
        <Checkbox
          checked={file.isStaged}
          onCheckedChange={(checked: boolean | 'indeterminate') => {
            handleCheckboxChange(checked === true);
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
        <StatusIcon status={status} className={cn('shrink-0', statusColorClass)} />
        <span
          className="flex-1 text-base whitespace-nowrap overflow-hidden text-ellipsis text-(--text-primary)"
          title={getDisplayTooltip(file, status)}
        >
          {getDisplayFileName(file, status)}
        </span>
        <span
          className="text-sm text-(--text-tertiary) whitespace-nowrap overflow-hidden text-ellipsis max-w-40"
          title={getDisplayTooltip(file, status)}
        >
          {getDirectory(file.path)}
        </span>
      </div>
    </StagingFileContextMenu>
  );
}

// Fluid File Item for tree view (needs different styling with indent)
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

  return (
    <StagingFileContextMenu
      file={file}
      isStaged={file.isStaged}
      onStage={onStage}
      onUnstage={onUnstage}
      onDiscard={onDiscard}
    >
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-3 cursor-pointer border-b border-(--border-color) transition-colors hover:bg-(--bg-hover)',
          isSelected && 'bg-(--bg-active)'
        )}
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
        <StatusIcon status={status} className={cn('shrink-0', statusColorClass)} />
        <span
          className="flex-1 text-base whitespace-nowrap overflow-hidden text-ellipsis text-(--text-primary)"
          title={getDisplayTooltip(file, status)}
        >
          {getDisplayFileName(file, status)}
        </span>
        <span
          className="text-sm text-(--text-tertiary) whitespace-nowrap overflow-hidden text-ellipsis max-w-40"
          title={getDisplayTooltip(file, status)}
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
  onSelectFile: (file: FileStatus | null, isStaged: boolean) => void;
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

  const selectedKeys = useMemo(
    () => (selectedFile ? new Set<SelectionKey>([selectedFile.path]) : new Set<SelectionKey>()),
    [selectedFile]
  );

  const handleSelectionChange = (keys: Set<SelectionKey>) => {
    if (keys.size === 0) {
      onSelectFile(null, false);
      return;
    }
    const key = keys.values().next().value;
    const file = files.find((f) => f.path === key);
    if (file) {
      onSelectFile(file, file.isStaged);
    }
  };

  return (
    <UITreeView<FluidFile>
      data={treeData}
      selectionMode="single"
      selectedKeys={selectedKeys}
      onSelectionChange={handleSelectionChange}
      defaultExpandAll
      renderItem={({ node, depth, isExpanded, isSelected, toggleExpand, select }) => {
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
              isSelected={isSelected}
              onSelect={select}
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

interface StatusIconProps {
  status: StatusTypeType;
  className?: string;
  size?: number;
}

function StatusIcon({ status, className, size = 14 }: StatusIconProps) {
  switch (status) {
    case StatusType.Added:
      return <Plus className={className} size={size} />;
    case StatusType.Modified:
      return <Pencil className={className} size={size} />;
    case StatusType.Deleted:
      return <Trash2 className={className} size={size} />;
    case StatusType.Untracked:
      return <FileQuestion className={className} size={size} />;
    case StatusType.Renamed:
      return <ArrowRightLeft className={className} size={size} />;
    case StatusType.Copied:
      return <Copy className={className} size={size} />;
    case StatusType.Conflicted:
      return <AlertTriangle className={className} size={size} />;
    case StatusType.TypeChanged:
      return <FileType className={className} size={size} />;
    default:
      return <FileQuestion className={className} size={size} />;
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

function getDisplayFileName(file: FileStatus, status: StatusTypeType): string {
  if (status === StatusType.Renamed && file.oldPath) {
    return `${getFileName(file.oldPath)} → ${getFileName(file.path)}`;
  }
  return getFileName(file.path);
}

function getDisplayTooltip(file: FileStatus, status: StatusTypeType): string {
  if (status === StatusType.Renamed && file.oldPath) {
    return `${file.oldPath} → ${file.path}`;
  }
  return file.path;
}
