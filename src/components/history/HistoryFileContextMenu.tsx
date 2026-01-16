import { ReactNode } from 'react';
import { History, FileText, RotateCcw, FileCode, FolderOpen, Copy, Eye, Diff } from 'lucide-react';
import type { FileDiff } from '@/types';
import { useRepositoryStore } from '@/store/repositoryStore';
import { shellApi } from '@/services/api';
import { ContextMenu, MenuItem, MenuSeparator } from '@/components/ui';

interface HistoryFileContextMenuProps {
  file: FileDiff;
  children: ReactNode;
}

export function HistoryFileContextMenu({ file, children }: HistoryFileContextMenuProps) {
  const { repository } = useRepositoryStore();
  const filePath = file.newPath || file.oldPath || '';

  const handleCopyPath = () => {
    navigator.clipboard.writeText(filePath);
  };

  const handleShowInFinder = async () => {
    if (repository?.path && filePath) {
      const fullPath = `${repository.path}/${filePath}`;
      try {
        await shellApi.showInFolder(fullPath);
      } catch (err) {
        console.error('Failed to show in finder:', err);
      }
    }
  };

  return (
    <ContextMenu trigger={children}>
      <MenuItem icon={History} disabled>
        Log Selected...
      </MenuItem>
      <MenuItem icon={FileText} disabled>
        Annotate Selected...
      </MenuItem>
      <MenuItem icon={RotateCcw} disabled>
        Reset to Commit...
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={FileCode} disabled>
        Open Current Version
      </MenuItem>
      <MenuItem icon={FileCode} disabled>
        Open Selected Version
      </MenuItem>
      <MenuItem icon={FolderOpen} onSelect={handleShowInFinder}>
        Show In Finder
      </MenuItem>
      <MenuItem icon={Copy} onSelect={handleCopyPath}>
        Copy Path To Clipboard
      </MenuItem>
      <MenuItem icon={Eye} disabled>
        Quick Look
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Diff} disabled>
        External Diff
      </MenuItem>
    </ContextMenu>
  );
}
