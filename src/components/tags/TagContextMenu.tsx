import { ReactNode } from 'react';
import { Copy, Check, Info, GitCompare, Upload, Trash2 } from 'lucide-react';
import type { Tag, Remote } from '@/types';
import { ContextMenu, MenuItem, MenuSeparator, SubMenu } from '@/components/ui';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';

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
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Copy failed', getErrorMessage(err));
    }
  };

  return (
    <ContextMenu trigger={children}>
      <MenuItem icon={Copy} onSelect={handleCopyName}>
        Copy Tag Name to Clipboard
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Check} onSelect={onCheckout}>
        Checkout {tag.name}
      </MenuItem>
      <MenuItem icon={Info} disabled={!onShowDetails} onSelect={onShowDetails}>
        Details...
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={GitCompare} disabled={!onDiffAgainstCurrent} onSelect={onDiffAgainstCurrent}>
        Diff Against Current
      </MenuItem>
      <MenuSeparator />
      {remotes.length > 0 && (
        <SubMenu icon={Upload} label="Push to" minWidth="sm">
          {remotes.map((remote) => (
            <MenuItem key={remote.name} onSelect={() => onPush?.(remote.name)}>
              {remote.name}
            </MenuItem>
          ))}
        </SubMenu>
      )}
      <MenuItem icon={Trash2} danger onSelect={onDelete}>
        Delete {tag.name}
      </MenuItem>
    </ContextMenu>
  );
}
