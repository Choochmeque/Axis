import { ReactNode } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { Copy, Check, Info, GitCompare, Upload, Trash2, ChevronRight } from 'lucide-react';
import type { Tag, Remote } from '../../types';

interface TagContextMenuProps {
  tag: Tag;
  remotes: Remote[];
  children: ReactNode;
  onCheckout?: () => void;
  onShowDetails?: () => void;
  onDiffAgainstCurrent?: () => void;
  onPush?: (remote: string) => void;
  onDelete?: () => void;
}

export function TagContextMenu({
  tag,
  remotes,
  children,
  onCheckout,
  onShowDetails,
  onDiffAgainstCurrent,
  onPush,
  onDelete,
}: TagContextMenuProps) {
  const handleCopyName = async () => {
    try {
      await navigator.clipboard.writeText(tag.name);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="menu-content">
          <ContextMenu.Item className="menu-item" onSelect={handleCopyName}>
            <Copy size={14} />
            <span>Copy Tag Name to Clipboard</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="menu-separator" />

          <ContextMenu.Item className="menu-item" onSelect={onCheckout}>
            <Check size={14} />
            <span>Checkout {tag.name}</span>
          </ContextMenu.Item>

          <ContextMenu.Item className="menu-item" onSelect={onShowDetails}>
            <Info size={14} />
            <span>Details...</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="menu-separator" />

          <ContextMenu.Item className="menu-item" onSelect={onDiffAgainstCurrent}>
            <GitCompare size={14} />
            <span>Diff Against Current</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="menu-separator" />

          {remotes.length > 0 && (
            <ContextMenu.Sub>
              <ContextMenu.SubTrigger className="menu-item">
                <Upload size={14} />
                <span>Push to</span>
                <ChevronRight size={14} className="menu-chevron" />
              </ContextMenu.SubTrigger>
              <ContextMenu.Portal>
                <ContextMenu.SubContent className="menu-content min-w-32">
                  {remotes.map((remote) => (
                    <ContextMenu.Item
                      key={remote.name}
                      className="menu-item"
                      onSelect={() => onPush?.(remote.name)}
                    >
                      <span>{remote.name}</span>
                    </ContextMenu.Item>
                  ))}
                </ContextMenu.SubContent>
              </ContextMenu.Portal>
            </ContextMenu.Sub>
          )}

          <ContextMenu.Item className="menu-item-danger" onSelect={onDelete}>
            <Trash2 size={14} />
            <span>Delete {tag.name}</span>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
