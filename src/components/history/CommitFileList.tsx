import type { FileDiff, DiffStatus } from '../../types';
import './CommitFileList.css';

interface CommitFileListProps {
  files: FileDiff[];
  selectedFile: FileDiff | null;
  onSelectFile: (file: FileDiff) => void;
  isLoading?: boolean;
}

export function CommitFileList({
  files,
  selectedFile,
  onSelectFile,
  isLoading = false,
}: CommitFileListProps) {
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  if (isLoading) {
    return (
      <div className="commit-file-list">
        <div className="commit-file-list-header">
          <span className="commit-file-list-title">Changed Files</span>
        </div>
        <div className="commit-file-list-loading">Loading...</div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="commit-file-list">
        <div className="commit-file-list-header">
          <span className="commit-file-list-title">Changed Files</span>
        </div>
        <div className="commit-file-list-empty">No files changed</div>
      </div>
    );
  }

  return (
    <div className="commit-file-list">
      <div className="commit-file-list-header">
        <span className="commit-file-list-title">Changed Files</span>
        <span className="commit-file-list-count">{files.length}</span>
        <span className="commit-file-list-stats">
          <span className="stat-additions">+{totalAdditions}</span>
          <span className="stat-deletions">-{totalDeletions}</span>
        </span>
      </div>
      <div className="commit-file-list-items">
        {files.map((file) => (
          <CommitFileItem
            key={file.new_path || file.old_path}
            file={file}
            isSelected={
              selectedFile?.new_path === file.new_path &&
              selectedFile?.old_path === file.old_path
            }
            onSelect={() => onSelectFile(file)}
          />
        ))}
      </div>
    </div>
  );
}

interface CommitFileItemProps {
  file: FileDiff;
  isSelected: boolean;
  onSelect: () => void;
}

function CommitFileItem({ file, isSelected, onSelect }: CommitFileItemProps) {
  const path = file.new_path || file.old_path || '';
  const statusClass = getStatusClass(file.status);
  const statusChar = getStatusChar(file.status);

  return (
    <div
      className={`commit-file-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <span className={`commit-file-status ${statusClass}`} title={file.status}>
        {statusChar}
      </span>
      <span className="commit-file-path" title={path}>
        {getFileName(path)}
        {file.old_path && file.new_path && file.old_path !== file.new_path && (
          <span className="commit-file-old-path"> ({getFileName(file.old_path)})</span>
        )}
      </span>
      <span className="commit-file-dir" title={path}>
        {getDirectory(path)}
      </span>
      <span className="commit-file-stats">
        {file.additions > 0 && (
          <span className="stat-additions">+{file.additions}</span>
        )}
        {file.deletions > 0 && (
          <span className="stat-deletions">-{file.deletions}</span>
        )}
      </span>
    </div>
  );
}

function getStatusChar(status: DiffStatus): string {
  switch (status) {
    case 'added':
      return 'A';
    case 'modified':
      return 'M';
    case 'deleted':
      return 'D';
    case 'renamed':
      return 'R';
    case 'copied':
      return 'C';
    case 'type_changed':
      return 'T';
    case 'untracked':
      return '?';
    case 'conflicted':
      return '!';
    default:
      return 'M';
  }
}

function getStatusClass(status: DiffStatus): string {
  switch (status) {
    case 'added':
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
