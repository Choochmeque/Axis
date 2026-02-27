import { Copy, Diff, Eye, FileCode, FileText, FolderOpen, History, RotateCcw } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BlameDialog } from '@/components/blame';
import { ContextMenu, MenuItem, MenuSeparator } from '@/components/ui';
import { copyToClipboard, showInFinder } from '@/lib/actions';
import { useRepositoryStore } from '@/store/repositoryStore';
import type { FileDiff } from '@/types';

interface HistoryFileContextMenuProps {
  file: FileDiff;
  children: ReactNode;
  commitOid?: string;
}

export function HistoryFileContextMenu({ file, children, commitOid }: HistoryFileContextMenuProps) {
  const { t } = useTranslation();
  const { repository } = useRepositoryStore();
  const [showBlame, setShowBlame] = useState(false);
  const filePath = file.newPath || file.oldPath || '';

  return (
    <>
      <ContextMenu trigger={children}>
        <MenuItem icon={History} disabled>
          {t('history.fileContextMenu.logSelected')}
        </MenuItem>
        <MenuItem icon={FileText} onSelect={() => setShowBlame(true)}>
          {t('history.fileContextMenu.annotateSelected')}
        </MenuItem>
        <MenuItem icon={RotateCcw} disabled>
          {t('history.fileContextMenu.resetToCommit')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={FileCode} disabled>
          {t('history.fileContextMenu.openCurrentVersion')}
        </MenuItem>
        <MenuItem icon={FileCode} disabled>
          {t('history.fileContextMenu.openSelectedVersion')}
        </MenuItem>
        <MenuItem
          icon={FolderOpen}
          onSelect={() => showInFinder(`${repository?.path}/${filePath}`)}
        >
          {t('history.fileContextMenu.showInFinder')}
        </MenuItem>
        <MenuItem icon={Copy} onSelect={() => copyToClipboard(filePath)}>
          {t('history.fileContextMenu.copyPath')}
        </MenuItem>
        <MenuItem icon={Eye} disabled>
          {t('history.fileContextMenu.quickLook')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Diff} disabled>
          {t('history.fileContextMenu.externalDiff')}
        </MenuItem>
      </ContextMenu>

      <BlameDialog
        isOpen={showBlame}
        onClose={() => setShowBlame(false)}
        filePath={filePath}
        commitOid={commitOid}
      />
    </>
  );
}
