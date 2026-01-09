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
import './FileStatusList.css';

interface FileStatusListProps {
  files: FileStatus[];
  title: string;
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
    <div className="file-status-list">
      <div className="file-status-list-header">
        <span className="file-status-list-title">{title}</span>
        <span className="file-status-list-count">{files.length}</span>
      </div>
      <div className="file-status-list-items">
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
  const statusClass = getStatusClass(status);

  const handleAction = (
    e: React.MouseEvent,
    action: (() => void) | undefined
  ) => {
    e.stopPropagation();
    action?.();
  };

  return (
    <div
      className={`file-status-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <StatusIcon className={`file-status-icon ${statusClass}`} size={14} />
      <span className="file-status-path" title={file.path}>
        {getFileName(file.path)}
        {file.old_path && (
          <span className="file-status-old-path"> ({file.old_path})</span>
        )}
      </span>
      <span className="file-status-dir" title={file.path}>
        {getDirectory(file.path)}
      </span>
      <div className="file-status-actions">
        {onStage && (
          <button
            className="file-status-action"
            onClick={(e) => handleAction(e, onStage)}
            title="Stage"
          >
            <Plus size={14} />
          </button>
        )}
        {onUnstage && (
          <button
            className="file-status-action"
            onClick={(e) => handleAction(e, onUnstage)}
            title="Unstage"
          >
            <ArrowRightLeft size={14} />
          </button>
        )}
        {onDiscard && (
          <button
            className="file-status-action danger"
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

function getStatusClass(status: StatusType): string {
  switch (status) {
    case 'added':
    case 'untracked':
      return 'status-added';
    case 'modified':
    case 'renamed':
    case 'copied':
    case 'type_changed':
      return 'status-modified';
    case 'deleted':
      return 'status-deleted';
    case 'conflicted':
      return 'status-conflicted';
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
