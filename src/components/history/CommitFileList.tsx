import type { FileDiff, DiffStatus } from '../../types';
import { cn } from '../../lib/utils';

interface CommitFileListProps {
  files: FileDiff[];
  selectedFile: FileDiff | null;
  onSelectFile: (file: FileDiff) => void;
  isLoading?: boolean;
}

const listClass = "flex flex-col h-full min-h-0 overflow-hidden bg-(--bg-primary)";
const headerClass = "flex items-center gap-2 py-2 px-3 bg-(--bg-toolbar) border-b border-(--border-color) text-xs font-semibold uppercase text-(--text-secondary) shrink-0";
const emptyClass = "p-6 text-center text-(--text-secondary) text-[13px]";

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
      <div className={listClass}>
        <div className={headerClass}>
          <span className="flex-1">Changed Files</span>
        </div>
        <div className={emptyClass}>Loading...</div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={listClass}>
        <div className={headerClass}>
          <span className="flex-1">Changed Files</span>
        </div>
        <div className={emptyClass}>No files changed</div>
      </div>
    );
  }

  return (
    <div className={listClass}>
      <div className={headerClass}>
        <span className="flex-1">Changed Files</span>
        <span className="bg-(--bg-badge) py-0.5 px-1.5 rounded-full text-[11px]">{files.length}</span>
        <span className="flex gap-1.5 text-[11px] font-medium">
          <span className="text-success">+{totalAdditions}</span>
          <span className="text-error">-{totalDeletions}</span>
        </span>
      </div>
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
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
  const statusColors = getStatusColors(file.status);
  const statusChar = getStatusChar(file.status);

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1.5 px-3 cursor-pointer border-b border-(--border-color) transition-colors hover:bg-(--bg-hover)",
        isSelected && "bg-(--bg-active)"
      )}
      onClick={onSelect}
    >
      <span
        className={cn(
          "flex items-center justify-center w-4.5 h-4.5 text-[11px] font-semibold rounded shrink-0",
          statusColors.bg,
          statusColors.text
        )}
        title={file.status}
      >
        {statusChar}
      </span>
      <span className="flex-1 text-[13px] whitespace-nowrap overflow-hidden text-ellipsis text-(--text-primary)" title={path}>
        {getFileName(path)}
        {file.old_path && file.new_path && file.old_path !== file.new_path && (
          <span className="text-(--text-secondary) text-xs"> ({getFileName(file.old_path)})</span>
        )}
      </span>
      <span className="text-(--text-tertiary) text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-37.5" title={path}>
        {getDirectory(path)}
      </span>
      <span className="flex gap-1 text-[11px] font-medium shrink-0">
        {file.additions > 0 && (
          <span className="text-success">+{file.additions}</span>
        )}
        {file.deletions > 0 && (
          <span className="text-error">-{file.deletions}</span>
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

function getStatusColors(status: DiffStatus): { bg: string; text: string } {
  switch (status) {
    case 'added':
      return { bg: 'bg-success/15', text: 'text-success' };
    case 'modified':
    case 'renamed':
    case 'copied':
    case 'type_changed':
      return { bg: 'bg-warning/15', text: 'text-warning' };
    case 'deleted':
    case 'conflicted':
      return { bg: 'bg-error/15', text: 'text-error' };
    default:
      return { bg: '', text: '' };
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
