import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DiffStatus } from '@/types';
import type { FileDiff, DiffStatus as DiffStatusType } from '@/types';
import { cn } from '@/lib/utils';
import { VirtualList } from '@/components/ui';
import type { SelectionKey } from '@/hooks';
import { HistoryFileContextMenu } from './HistoryFileContextMenu';

interface CommitFileListProps {
  files: FileDiff[];
  selectedFile: FileDiff | null;
  onSelectFile: (file: FileDiff | null) => void;
  isLoading?: boolean;
  commitOid?: string;
}

const listClass = 'flex flex-col h-full min-h-0 overflow-hidden bg-(--bg-primary)';
const headerClass =
  'flex items-center gap-2 py-2 px-3 bg-(--bg-toolbar) border-b border-(--border-color) text-xs font-semibold uppercase text-(--text-secondary) shrink-0';
const emptyClass = 'p-6 text-center text-(--text-secondary) text-base';

export function CommitFileList({
  files,
  selectedFile,
  onSelectFile,
  isLoading = false,
  commitOid,
}: CommitFileListProps) {
  const { t } = useTranslation();
  const totalAdditions = files.reduce((sum, f) => sum + Number(f.additions), 0);
  const totalDeletions = files.reduce((sum, f) => sum + Number(f.deletions), 0);

  const getFileKey = (file: FileDiff) => `${file.newPath ?? ''}|${file.oldPath ?? ''}`;
  const selectedKeys = useMemo(
    () =>
      selectedFile ? new Set<SelectionKey>([getFileKey(selectedFile)]) : new Set<SelectionKey>(),
    [selectedFile]
  );

  if (isLoading) {
    return (
      <div className={listClass}>
        <div className={headerClass}>
          <span className="flex-1">{t('history.fileList.title')}</span>
        </div>
        <div className={emptyClass}>{t('history.fileList.loading')}</div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={listClass}>
        <div className={headerClass}>
          <span className="flex-1">{t('history.fileList.title')}</span>
        </div>
        <div className={emptyClass}>{t('history.fileList.noChanges')}</div>
      </div>
    );
  }

  return (
    <div className={listClass}>
      <div className={headerClass}>
        <span className="flex-1">{t('history.fileList.title')}</span>
        <span className={cn('badge', 'text-sm font-normal')}>{files.length}</span>
        <span className="flex gap-1.5 text-sm font-medium">
          <span className="text-success">+{totalAdditions}</span>
          <span className="text-error">-{totalDeletions}</span>
        </span>
      </div>
      <VirtualList
        items={files}
        getItemKey={getFileKey}
        itemHeight={36}
        selectionMode="single"
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) => {
          if (keys.size === 0) {
            onSelectFile(null);
            return;
          }
          const key = keys.values().next().value;
          const file = files.find((f) => getFileKey(f) === key);
          if (file) onSelectFile(file);
        }}
        itemClassName="!py-1.5 !gap-2"
      >
        {(file) => (
          <HistoryFileContextMenu file={file} commitOid={commitOid}>
            <CommitFileItemContent file={file} />
          </HistoryFileContextMenu>
        )}
      </VirtualList>
    </div>
  );
}

interface CommitFileItemContentProps {
  file: FileDiff;
}

function CommitFileItemContent({ file }: CommitFileItemContentProps) {
  const path = file.newPath || file.oldPath || '';
  const statusColors = getStatusColors(file.status);
  const statusChar = getStatusChar(file.status);

  return (
    <>
      <span
        className={cn(
          'flex items-center justify-center w-4.5 h-4.5 text-sm font-semibold rounded shrink-0',
          statusColors.bg,
          statusColors.text
        )}
        title={file.status}
      >
        {statusChar}
      </span>
      <span
        className="flex-1 text-base whitespace-nowrap overflow-hidden text-ellipsis text-(--text-primary)"
        title={path}
      >
        {getFileName(path)}
        {file.oldPath && file.newPath && file.oldPath !== file.newPath && (
          <span className="text-(--text-secondary) text-xs"> ({getFileName(file.oldPath)})</span>
        )}
      </span>
      <span
        className="text-(--text-tertiary) text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-37.5"
        title={path}
      >
        {getDirectory(path)}
      </span>
      <span className="flex gap-1 text-sm font-medium shrink-0">
        {file.additions > 0 && <span className="text-success">+{String(file.additions)}</span>}
        {file.deletions > 0 && <span className="text-error">-{String(file.deletions)}</span>}
      </span>
    </>
  );
}

function getStatusChar(status: DiffStatusType): string {
  switch (status) {
    case DiffStatus.Added:
      return 'A';
    case DiffStatus.Modified:
      return 'M';
    case DiffStatus.Deleted:
      return 'D';
    case DiffStatus.Renamed:
      return 'R';
    case DiffStatus.Copied:
      return 'C';
    case DiffStatus.TypeChanged:
      return 'T';
    case DiffStatus.Untracked:
      return '?';
    case DiffStatus.Conflicted:
      return '!';
    default:
      return 'M';
  }
}

function getStatusColors(status: DiffStatusType): { bg: string; text: string } {
  switch (status) {
    case DiffStatus.Added:
      return { bg: 'bg-success/15', text: 'text-success' };
    case DiffStatus.Modified:
    case DiffStatus.Renamed:
    case DiffStatus.Copied:
    case DiffStatus.TypeChanged:
      return { bg: 'bg-warning/15', text: 'text-warning' };
    case DiffStatus.Deleted:
    case DiffStatus.Conflicted:
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
