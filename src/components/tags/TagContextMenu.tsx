import { ReactNode } from 'react';
import { Copy, Check, Info, GitCompare, Upload, Trash2 } from 'lucide-react';
import type { Tag, Remote } from '@/types';
import { ActionContext } from '@/types';
import { ContextMenu, MenuItem, MenuSeparator, SubMenu } from '@/components/ui';
import { CustomActionsMenuSection } from '@/components/custom-actions';
import { copyToClipboard } from '@/lib/actions';

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
  return (
    <ContextMenu trigger={children}>
      <MenuItem icon={Copy} onSelect={() => copyToClipboard(tag.name)}>
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

      <CustomActionsMenuSection context={ActionContext.Tag} variables={{ tag: tag.name }} />
    </ContextMenu>
  );
}
