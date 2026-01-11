import { ReactNode } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { Copy, Check, Info, GitCompare, Upload, Trash2, ChevronRight } from 'lucide-react';
import type { Tag, Remote } from '../../types';
import { cn } from '../../lib/utils';

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

  const menuContentClass =
    'min-w-50 bg-(--bg-secondary) border border-(--border-color) rounded-md p-1 shadow-lg z-[10000] animate-in fade-in zoom-in-95 duration-100';
  const menuItemClass =
    'flex items-center gap-2 py-1.5 px-2 rounded text-xs text-(--text-primary) cursor-pointer outline-none select-none hover:bg-(--bg-tertiary) focus:bg-(--bg-tertiary) data-highlighted:bg-(--bg-tertiary) data-disabled:text-(--text-tertiary) data-disabled:cursor-not-allowed';
  const separatorClass = 'h-px bg-(--border-color) my-1';
  const chevronClass = 'ml-auto text-(--text-tertiary)';
  const dangerItemClass =
    'flex items-center gap-2 py-1.5 px-2 rounded text-xs text-error cursor-pointer outline-none select-none hover:bg-error/15 focus:bg-error/15 data-highlighted:bg-error/15';

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className={menuContentClass}>
          <ContextMenu.Item className={menuItemClass} onSelect={handleCopyName}>
            <Copy size={14} />
            <span>Copy Tag Name to Clipboard</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className={separatorClass} />

          <ContextMenu.Item className={menuItemClass} onSelect={onCheckout}>
            <Check size={14} />
            <span>Checkout {tag.name}</span>
          </ContextMenu.Item>

          <ContextMenu.Item className={menuItemClass} onSelect={onShowDetails}>
            <Info size={14} />
            <span>Details...</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className={separatorClass} />

          <ContextMenu.Item className={menuItemClass} onSelect={onDiffAgainstCurrent}>
            <GitCompare size={14} />
            <span>Diff Against Current</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className={separatorClass} />

          {remotes.length > 0 && (
            <ContextMenu.Sub>
              <ContextMenu.SubTrigger className={menuItemClass}>
                <Upload size={14} />
                <span>Push to</span>
                <ChevronRight size={14} className={chevronClass} />
              </ContextMenu.SubTrigger>
              <ContextMenu.Portal>
                <ContextMenu.SubContent className={cn(menuContentClass, 'min-w-32')}>
                  {remotes.map((remote) => (
                    <ContextMenu.Item
                      key={remote.name}
                      className={menuItemClass}
                      onSelect={() => onPush?.(remote.name)}
                    >
                      <span>{remote.name}</span>
                    </ContextMenu.Item>
                  ))}
                </ContextMenu.SubContent>
              </ContextMenu.Portal>
            </ContextMenu.Sub>
          )}

          <ContextMenu.Item className={dangerItemClass} onSelect={onDelete}>
            <Trash2 size={14} />
            <span>Delete {tag.name}</span>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
