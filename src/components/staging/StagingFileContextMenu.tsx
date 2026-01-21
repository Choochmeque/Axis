import { ReactNode, useState } from 'react';
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
import { IgnoreDialog } from './IgnoreDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

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
  const { repository } = useRepositoryStore();
  const deleteFile = useStagingStore((s) => s.deleteFile);
  const [showFileLog, setShowFileLog] = useState(false);
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
          Open
        </MenuItem>
        <MenuItem icon={FolderOpen} onSelect={handleShowInFinder}>
          Show In Finder
        </MenuItem>
        <MenuItem icon={Copy} onSelect={handleCopyPath}>
          Copy Path To Clipboard
        </MenuItem>
        <MenuItem icon={Terminal} disabled>
          Open In Terminal
        </MenuItem>
        <MenuItem icon={Eye} disabled>
          Quick Look
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Diff} disabled>
          External Diff
        </MenuItem>
        <MenuItem icon={FileText} disabled>
          Create Patch...
        </MenuItem>
        <MenuItem icon={FilePlus} disabled>
          Apply Patch...
        </MenuItem>
        <MenuSeparator />

        {/* Stage/Unstage */}
        {!isStaged && (
          <MenuItem icon={Plus} disabled={!onStage} onSelect={onStage}>
            Add to index
          </MenuItem>
        )}
        {isStaged && (
          <MenuItem icon={Minus} disabled={!onUnstage} onSelect={onUnstage}>
            Unstage from index
          </MenuItem>
        )}

        {/* Delete - only for untracked files */}
        {canDelete && (
          <MenuItem icon={XCircle} danger onSelect={() => setShowDeleteDialog(true)}>
            Delete
          </MenuItem>
        )}

        {/* Stop Tracking - only for tracked files */}
        {isTracked && (
          <MenuItem icon={EyeOff} disabled>
            Stop Tracking
          </MenuItem>
        )}

        <MenuItem icon={EyeOff} onSelect={() => setShowIgnoreDialog(true)}>
          Ignore...
        </MenuItem>
        <MenuSeparator />

        <MenuItem icon={GitCommit} disabled>
          Commit Selected...
        </MenuItem>

        {/* Reset - only for tracked files */}
        {isTracked && (
          <MenuItem icon={RotateCcw} danger disabled={!canReset} onSelect={onDiscard}>
            Reset...
          </MenuItem>
        )}

        {/* Reset to Commit - only for tracked files */}
        {isTracked && (
          <MenuItem icon={RotateCcw} disabled>
            Reset to Commit...
          </MenuItem>
        )}

        {/* Resolve Conflicts submenu - only for conflicted files */}
        {isConflicted && (
          <>
            <MenuSeparator />
            <SubMenu icon={Diff} label="Resolve Conflicts">
              <MenuItem disabled>Mark as Resolved</MenuItem>
            </SubMenu>
          </>
        )}

        <MenuSeparator />
        {isTracked && (
          <MenuItem icon={History} onSelect={() => setShowFileLog(true)}>
            Log Selected...
          </MenuItem>
        )}
        <MenuItem icon={FileSearch} disabled>
          Annotate Selected...
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Copy} disabled>
          Copy...
        </MenuItem>
        <MenuItem icon={Move} disabled>
          Move...
        </MenuItem>

        {isTreeView && (
          <>
            <MenuSeparator />
            <MenuItem icon={ChevronDown} disabled>
              Expand All
            </MenuItem>
            <MenuItem icon={ChevronUp} disabled>
              Collapse All
            </MenuItem>
          </>
        )}
      </ContextMenu>

      <FileLogDialog
        isOpen={showFileLog}
        onClose={() => setShowFileLog(false)}
        filePaths={[file.path]}
      />

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
