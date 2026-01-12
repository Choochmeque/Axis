import { ReactNode } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { History, FileText, RotateCcw, FileCode, FolderOpen, Copy, Eye, Diff } from 'lucide-react';
import type { FileDiff } from '../../types';

interface HistoryFileContextMenuProps {
  file: FileDiff;
  children: ReactNode;
}

export function HistoryFileContextMenu({ file, children }: HistoryFileContextMenuProps) {
  const filePath = file.new_path || file.old_path || '';

  const handleCopyPath = () => {
    navigator.clipboard.writeText(filePath);
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="menu-content">
          {/* Log Selected */}
          <ContextMenu.Item className="menu-item" disabled>
            <History size={14} />
            <span>Log Selected...</span>
          </ContextMenu.Item>

          {/* Annotate Selected (Blame) */}
          <ContextMenu.Item className="menu-item" disabled>
            <FileText size={14} />
            <span>Annotate Selected...</span>
          </ContextMenu.Item>

          {/* Reset to Commit */}
          <ContextMenu.Item className="menu-item" disabled>
            <RotateCcw size={14} />
            <span>Reset to Commit...</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="menu-separator" />

          {/* Open Current Version */}
          <ContextMenu.Item className="menu-item" disabled>
            <FileCode size={14} />
            <span>Open Current Version</span>
          </ContextMenu.Item>

          {/* Open Selected Version */}
          <ContextMenu.Item className="menu-item" disabled>
            <FileCode size={14} />
            <span>Open Selected Version</span>
          </ContextMenu.Item>

          {/* Show In Finder */}
          <ContextMenu.Item className="menu-item" disabled>
            <FolderOpen size={14} />
            <span>Show In Finder</span>
          </ContextMenu.Item>

          {/* Copy Path To Clipboard */}
          <ContextMenu.Item className="menu-item" onSelect={handleCopyPath}>
            <Copy size={14} />
            <span>Copy Path To Clipboard</span>
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
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
