import { ReactNode } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
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
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StatusType } from '@/types';
import type { FileStatus } from '@/types';
import { useRepositoryStore } from '@/store/repositoryStore';
import { shellApi } from '@/services/api';

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

  // Computed flags for menu item visibility
  const isUntracked = file.status === StatusType.Untracked;
  const isConflicted = file.status === StatusType.Conflicted;
  const isTracked = !isUntracked;
  const canReset = isTracked && !!onDiscard;
  const canDelete = isUntracked;

  const handleCopyPath = () => {
    navigator.clipboard.writeText(file.path);
  };

  const handleShowInFinder = async () => {
    if (repository?.path) {
      const fullPath = `${repository.path}/${file.path}`;
      try {
        await shellApi.showInFolder(fullPath);
      } catch (err) {
        console.error('Failed to show in finder:', err);
      }
    }
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="menu-content">
          {/* Open */}
          <ContextMenu.Item className="menu-item" disabled>
            <FileCode size={14} />
            <span>Open</span>
          </ContextMenu.Item>

          {/* Show In Finder */}
          <ContextMenu.Item className="menu-item" onSelect={handleShowInFinder}>
            <FolderOpen size={14} />
            <span>Show In Finder</span>
          </ContextMenu.Item>

          {/* Copy Path To Clipboard */}
          <ContextMenu.Item className="menu-item" onSelect={handleCopyPath}>
            <Copy size={14} />
            <span>Copy Path To Clipboard</span>
          </ContextMenu.Item>

          {/* Open In Terminal */}
          <ContextMenu.Item className="menu-item" disabled>
            <Terminal size={14} />
            <span>Open In Terminal</span>
          </ContextMenu.Item>

          {/* Quick Look */}
          <ContextMenu.Item className="menu-item" disabled>
            <Eye size={14} />
            <span>Quick Look</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="menu-separator" />

          {/* External Diff */}
          <ContextMenu.Item className="menu-item" disabled>
            <Diff size={14} />
            <span>External Diff</span>
          </ContextMenu.Item>

          {/* Create Patch */}
          <ContextMenu.Item className="menu-item" disabled>
            <FileText size={14} />
            <span>Create Patch...</span>
          </ContextMenu.Item>

          {/* Apply Patch */}
          <ContextMenu.Item className="menu-item" disabled>
            <FilePlus size={14} />
            <span>Apply Patch...</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="menu-separator" />

          {/* Add to index (Stage) - only show for unstaged files */}
          {!isStaged && (
            <ContextMenu.Item className="menu-item" disabled={!onStage} onSelect={onStage}>
              <Plus size={14} />
              <span>Add to index</span>
            </ContextMenu.Item>
          )}

          {/* Unstage from index - only show for staged files */}
          {isStaged && (
            <ContextMenu.Item className="menu-item" disabled={!onUnstage} onSelect={onUnstage}>
              <Minus size={14} />
              <span>Unstage from index</span>
            </ContextMenu.Item>
          )}

          {/* Delete - only for untracked files */}
          {canDelete && (
            <ContextMenu.Item className="menu-item-danger" disabled>
              <XCircle size={14} />
              <span>Delete</span>
            </ContextMenu.Item>
          )}

          {/* Stop Tracking - only for tracked files */}
          {isTracked && (
            <ContextMenu.Item className="menu-item" disabled>
              <EyeOff size={14} />
              <span>Stop Tracking</span>
            </ContextMenu.Item>
          )}

          {/* Ignore */}
          <ContextMenu.Item className="menu-item" disabled>
            <EyeOff size={14} />
            <span>Ignore...</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="menu-separator" />

          {/* Commit Selected */}
          <ContextMenu.Item className="menu-item" disabled>
            <GitCommit size={14} />
            <span>Commit Selected...</span>
          </ContextMenu.Item>

          {/* Reset - only for tracked files */}
          {isTracked && (
            <ContextMenu.Item
              className="menu-item-danger"
              disabled={!canReset}
              onSelect={onDiscard}
            >
              <RotateCcw size={14} />
              <span>Reset...</span>
            </ContextMenu.Item>
          )}

          {/* Reset to Commit - only for tracked files */}
          {isTracked && (
            <ContextMenu.Item className="menu-item" disabled>
              <RotateCcw size={14} />
              <span>Reset to Commit...</span>
            </ContextMenu.Item>
          )}

          {/* Resolve Conflicts submenu - only for conflicted files */}
          {isConflicted && (
            <>
              <ContextMenu.Separator className="menu-separator" />

              <ContextMenu.Sub>
                <ContextMenu.SubTrigger className="menu-item">
                  <Diff size={14} />
                  <span>Resolve Conflicts</span>
                  <ChevronRight size={14} className="menu-chevron" />
                </ContextMenu.SubTrigger>
                <ContextMenu.Portal>
                  <ContextMenu.SubContent className="menu-content">
                    <ContextMenu.Item className="menu-item" disabled>
                      <span>Mark as Resolved</span>
                    </ContextMenu.Item>
                  </ContextMenu.SubContent>
                </ContextMenu.Portal>
              </ContextMenu.Sub>
            </>
          )}

          <ContextMenu.Separator className="menu-separator" />

          {/* Log Selected */}
          <ContextMenu.Item className="menu-item" disabled>
            <History size={14} />
            <span>Log Selected...</span>
          </ContextMenu.Item>

          {/* Annotate Selected (Blame) */}
          <ContextMenu.Item className="menu-item" disabled>
            <FileSearch size={14} />
            <span>Annotate Selected...</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="menu-separator" />

          {/* Copy */}
          <ContextMenu.Item className="menu-item" disabled>
            <Copy size={14} />
            <span>Copy...</span>
          </ContextMenu.Item>

          {/* Move */}
          <ContextMenu.Item className="menu-item" disabled>
            <Move size={14} />
            <span>Move...</span>
          </ContextMenu.Item>

          {isTreeView && (
            <>
              <ContextMenu.Separator className="menu-separator" />

              {/* Expand All */}
              <ContextMenu.Item className="menu-item" disabled>
                <ChevronDown size={14} />
                <span>Expand All</span>
              </ContextMenu.Item>

              {/* Collapse All */}
              <ContextMenu.Item className="menu-item" disabled>
                <ChevronUp size={14} />
                <span>Collapse All</span>
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
