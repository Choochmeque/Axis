import {
  Plus,
  Pencil,
  Trash2,
  FileQuestion,
  ArrowRightLeft,
  Copy,
  AlertTriangle,
  FileType,
} from 'lucide-react';
import type { FileStatus, StatusType } from '../../types';
import { cn } from '../../lib/utils';

const fileItemClass = "flex items-center gap-2 py-1.5 px-3 cursor-pointer border-b border-(--border-color) transition-colors hover:bg-(--bg-hover)";
const fileActionClass = "flex items-center justify-center w-6 h-6 border-none bg-transparent text-(--text-secondary) cursor-pointer rounded transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary)";

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
}: FileStatusListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {title && (
        <div className="flex items-center gap-2 py-2 px-3 bg-(--bg-toolbar) border-b border-(--border-color) text-xs font-semibold uppercase text-(--text-secondary) shrink-0">
          <span>{title}</span>
          <span className="bg-(--bg-badge) py-0.5 px-1.5 rounded-full text-[11px]">{files.length}</span>
        </div>
      )}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {files.map((file) => (
          <FileStatusItem
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
}

function FileStatusItem({
  file,
  isSelected,
  onSelect,
  onStage,
  onUnstage,
  onDiscard,
}: FileStatusItemProps) {
  const status = file.staged_status || file.unstaged_status || file.status;
  const StatusIcon = getStatusIcon(status);
  const statusColorClass = getStatusColorClass(status);

  const handleAction = (
    e: React.MouseEvent,
    action: (() => void) | undefined
  ) => {
    e.stopPropagation();
    action?.();
  };

  return (
    <div
      className={cn(fileItemClass, isSelected && "bg-(--bg-active)")}
      onClick={onSelect}
    >
      <StatusIcon className={cn("shrink-0", statusColorClass)} size={14} />
      <span className="flex-1 text-[13px] whitespace-nowrap overflow-hidden text-ellipsis text-(--text-primary)" title={file.path}>
        {getFileName(file.path)}
        {file.old_path && (
          <span className="text-(--text-secondary) text-xs"> ({file.old_path})</span>
        )}
      </span>
      <span className="text-(--text-tertiary) text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-50" title={file.path}>
        {getDirectory(file.path)}
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
            className={cn(fileActionClass, "hover:bg-error/10 hover:text-error")}
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
