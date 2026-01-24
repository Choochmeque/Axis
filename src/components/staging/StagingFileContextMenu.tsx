import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileCode,
  FolderOpen,
  Copy,
  Terminal,
  Eye,
  Diff,
  FileText,
  FilePlus,
  Plus,
  Minus,
  XCircle,
  EyeOff,
  GitCommit,
  RotateCcw,
  History,
  FileSearch,
  Move,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ContextMenu, MenuItem, MenuSeparator, SubMenu } from '@/components/ui';
import { copyToClipboard, showInFinder } from '@/lib/actions';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useStagingStore } from '@/store/stagingStore';
import { StatusType } from '@/types';
import type { FileStatus } from '@/types';
import { FileLogDialog } from '../history/FileLogDialog';
import { BlameDialog } from '../blame';
import { IgnoreDialog } from './IgnoreDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { CustomActionsMenuSection } from '@/components/custom-actions';
import { ActionContext } from '@/types';

interface StagingFileContextMenuProps {
  file: FileStatus;
  children: ReactNode;
  isStaged: boolean;
  isTreeView?: boolean;
  onStage?: () => void;
  onUnstage?: () => void;
  onDiscard?: () => void;
}

export function StagingFileContextMenu({
  file,
  children,
  isStaged,
  isTreeView = false,
  onStage,
  onUnstage,
  onDiscard,
}: StagingFileContextMenuProps) {
  const { t } = useTranslation();
  const { repository } = useRepositoryStore();
  const deleteFile = useStagingStore((s) => s.deleteFile);
  const [showFileLog, setShowFileLog] = useState(false);
  const [showBlame, setShowBlame] = useState(false);
  const [showIgnoreDialog, setShowIgnoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Computed flags for menu item visibility
  const isUntracked = file.status === StatusType.Untracked;
  const isConflicted = file.status === StatusType.Conflicted;
  const isTracked = !isUntracked;
  const canReset = isTracked && !!onDiscard;
  const canDelete = isUntracked;

  const handleCopyPath = () => {
    copyToClipboard(file.path);
  };

  const handleShowInFinder = () => {
    if (repository?.path) {
      showInFinder(`${repository.path}/${file.path}`);
    }
  };

  return (
    <>
      <ContextMenu trigger={children}>
        <MenuItem icon={FileCode} disabled>
          {t('staging.contextMenu.open')}
        </MenuItem>
        <MenuItem icon={FolderOpen} onSelect={handleShowInFinder}>
          {t('staging.contextMenu.showInFinder')}
        </MenuItem>
        <MenuItem icon={Copy} onSelect={handleCopyPath}>
          {t('staging.contextMenu.copyPath')}
        </MenuItem>
        <MenuItem icon={Terminal} disabled>
          {t('staging.contextMenu.openInTerminal')}
        </MenuItem>
        <MenuItem icon={Eye} disabled>
          {t('staging.contextMenu.quickLook')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Diff} disabled>
          {t('staging.contextMenu.externalDiff')}
        </MenuItem>
        <MenuItem icon={FileText} disabled>
          {t('staging.contextMenu.createPatch')}
        </MenuItem>
        <MenuItem icon={FilePlus} disabled>
          {t('staging.contextMenu.applyPatch')}
        </MenuItem>
        <MenuSeparator />

        {/* Stage/Unstage */}
        {!isStaged && (
          <MenuItem icon={Plus} disabled={!onStage} onSelect={onStage}>
            {t('staging.contextMenu.addToIndex')}
          </MenuItem>
        )}
        {isStaged && (
          <MenuItem icon={Minus} disabled={!onUnstage} onSelect={onUnstage}>
            {t('staging.contextMenu.unstageFromIndex')}
          </MenuItem>
        )}

        {/* Delete - only for untracked files */}
        {canDelete && (
          <MenuItem icon={XCircle} danger onSelect={() => setShowDeleteDialog(true)}>
            {t('staging.contextMenu.delete')}
          </MenuItem>
        )}

        {/* Stop Tracking - only for tracked files */}
        {isTracked && (
          <MenuItem icon={EyeOff} disabled>
            {t('staging.contextMenu.stopTracking')}
          </MenuItem>
        )}

        <MenuItem icon={EyeOff} onSelect={() => setShowIgnoreDialog(true)}>
          {t('staging.contextMenu.ignore')}
        </MenuItem>
        <MenuSeparator />

        <MenuItem icon={GitCommit} disabled>
          {t('staging.contextMenu.commitSelected')}
        </MenuItem>

        {/* Reset - only for tracked files */}
        {isTracked && (
          <MenuItem icon={RotateCcw} danger disabled={!canReset} onSelect={onDiscard}>
            {t('staging.contextMenu.reset')}
          </MenuItem>
        )}

        {/* Reset to Commit - only for tracked files */}
        {isTracked && (
          <MenuItem icon={RotateCcw} disabled>
            {t('staging.contextMenu.resetToCommit')}
          </MenuItem>
        )}

        {/* Resolve Conflicts submenu - only for conflicted files */}
        {isConflicted && (
          <>
            <MenuSeparator />
            <SubMenu icon={Diff} label={t('staging.contextMenu.resolveConflicts')}>
              <MenuItem disabled>{t('staging.contextMenu.markAsResolved')}</MenuItem>
            </SubMenu>
          </>
        )}

        <MenuSeparator />
        {isTracked && (
          <MenuItem icon={History} onSelect={() => setShowFileLog(true)}>
            {t('staging.contextMenu.logSelected')}
          </MenuItem>
        )}
        {isTracked && (
          <MenuItem icon={FileSearch} onSelect={() => setShowBlame(true)}>
            {t('staging.contextMenu.annotateSelected')}
          </MenuItem>
        )}
        <MenuSeparator />
        <MenuItem icon={Copy} disabled>
          {t('staging.contextMenu.copy')}
        </MenuItem>
        <MenuItem icon={Move} disabled>
          {t('staging.contextMenu.move')}
        </MenuItem>

        <CustomActionsMenuSection context={ActionContext.File} variables={{ file: file.path }} />

        {isTreeView && (
          <>
            <MenuSeparator />
            <MenuItem icon={ChevronDown} disabled>
              {t('staging.contextMenu.expandAll')}
            </MenuItem>
            <MenuItem icon={ChevronUp} disabled>
              {t('staging.contextMenu.collapseAll')}
            </MenuItem>
          </>
        )}
      </ContextMenu>

      <FileLogDialog
        isOpen={showFileLog}
        onClose={() => setShowFileLog(false)}
        filePaths={[file.path]}
      />

      <BlameDialog isOpen={showBlame} onClose={() => setShowBlame(false)} filePath={file.path} />

      <IgnoreDialog
        isOpen={showIgnoreDialog}
        onClose={() => setShowIgnoreDialog(false)}
        filePath={file.path}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => deleteFile(file.path)}
        filePath={file.path}
      />
    </>
  );
}
