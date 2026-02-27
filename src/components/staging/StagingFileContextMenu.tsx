import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Diff,
  Eye,
  EyeOff,
  FileCode,
  FilePlus,
  FileSearch,
  FileText,
  FolderOpen,
  GitCommit,
  GitMerge,
  History,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Terminal,
  XCircle,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomActionsMenuSection } from '@/components/custom-actions';
import { ContextMenu, MenuItem, MenuSeparator } from '@/components/ui';
import { toast } from '@/hooks';
import { copyToClipboard, showInFinder } from '@/lib/actions';
import { getErrorMessage } from '@/lib/errorUtils';
import { conflictApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useStagingStore } from '@/store/stagingStore';
import type { FileStatus } from '@/types';
import { ActionContext, StatusType } from '@/types';
import { BlameDialog } from '../blame';
import { FileLogDialog } from '../history/FileLogDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { IgnoreDialog } from './IgnoreDialog';

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
        {/* Basic file actions - hide some for conflicted files */}
        {!isConflicted && (
          <MenuItem icon={FileCode} disabled>
            {t('staging.contextMenu.open')}
          </MenuItem>
        )}
        <MenuItem icon={FolderOpen} onSelect={handleShowInFinder}>
          {t('staging.contextMenu.showInFinder')}
        </MenuItem>
        <MenuItem icon={Copy} onSelect={handleCopyPath}>
          {t('staging.contextMenu.copyPath')}
        </MenuItem>
        {!isConflicted && (
          <>
            <MenuItem icon={Terminal} disabled>
              {t('staging.contextMenu.openInTerminal')}
            </MenuItem>
            <MenuItem icon={Eye} disabled>
              {t('staging.contextMenu.quickLook')}
            </MenuItem>
          </>
        )}
        <MenuSeparator />

        {/* Diff/Patch - hide Create/Apply Patch for conflicted */}
        <MenuItem icon={Diff} disabled>
          {t('staging.contextMenu.externalDiff')}
        </MenuItem>
        {!isConflicted && (
          <>
            <MenuItem icon={FileText} disabled>
              {t('staging.contextMenu.createPatch')}
            </MenuItem>
            <MenuItem icon={FilePlus} disabled>
              {t('staging.contextMenu.applyPatch')}
            </MenuItem>
          </>
        )}
        <MenuSeparator />

        {/* Conflict resolution actions - only for conflicted files */}
        {isConflicted && (
          <>
            <MenuItem
              icon={ArrowLeft}
              onSelect={async () => {
                try {
                  await conflictApi.resolveConflict(file.path, 'Ours', undefined);
                  await useStagingStore.getState().loadStatus();
                  useStagingStore.getState().selectFile(null, false);
                  toast.success(t('staging.contextMenu.conflictResolved'));
                } catch (err) {
                  toast.error(t('staging.contextMenu.resolveConflictFailed'), getErrorMessage(err));
                }
              }}
            >
              {t('staging.contextMenu.useOurs')}
            </MenuItem>
            <MenuItem
              icon={ArrowRight}
              onSelect={async () => {
                try {
                  await conflictApi.resolveConflict(file.path, 'Theirs', undefined);
                  await useStagingStore.getState().loadStatus();
                  useStagingStore.getState().selectFile(null, false);
                  toast.success(t('staging.contextMenu.conflictResolved'));
                } catch (err) {
                  toast.error(t('staging.contextMenu.resolveConflictFailed'), getErrorMessage(err));
                }
              }}
            >
              {t('staging.contextMenu.useTheirs')}
            </MenuItem>
            <MenuItem
              icon={GitMerge}
              onSelect={() => {
                useRepositoryStore.getState().setCurrentView('conflicts');
              }}
            >
              {t('staging.contextMenu.openConflictResolver')}
            </MenuItem>
            <MenuSeparator />
          </>
        )}

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

        {/* Non-conflict file actions */}
        {!isConflicted && (
          <>
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
            {isTracked && (
              <MenuItem icon={RotateCcw} danger disabled={!canReset} onSelect={onDiscard}>
                {t('staging.contextMenu.reset')}
              </MenuItem>
            )}
            {isTracked && (
              <MenuItem icon={RotateCcw} disabled>
                {t('staging.contextMenu.resetToCommit')}
              </MenuItem>
            )}
          </>
        )}

        {isTracked && (
          <>
            <MenuSeparator />
            <MenuItem icon={History} onSelect={() => setShowFileLog(true)}>
              {t('staging.contextMenu.logSelected')}
            </MenuItem>
            <MenuItem icon={FileSearch} onSelect={() => setShowBlame(true)}>
              {t('staging.contextMenu.annotateSelected')}
            </MenuItem>
          </>
        )}

        {/* Copy/Move - not for conflicted files */}
        {!isConflicted && (
          <>
            <MenuSeparator />
            <MenuItem icon={Copy} disabled>
              {t('staging.contextMenu.copy')}
            </MenuItem>
            <MenuItem icon={Move} disabled>
              {t('staging.contextMenu.move')}
            </MenuItem>
          </>
        )}

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
