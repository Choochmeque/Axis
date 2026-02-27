import { Check, Copy, GitCompare, Info, Trash2, Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomActionsMenuSection } from '@/components/custom-actions';
import { ContextMenu, MenuItem, MenuSeparator, SubMenu } from '@/components/ui';
import { copyToClipboard } from '@/lib/actions';
import type { Remote, Tag } from '@/types';
import { ActionContext } from '@/types';

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
  const { t } = useTranslation();

  return (
    <ContextMenu trigger={children}>
      <MenuItem icon={Copy} onSelect={() => copyToClipboard(tag.name)}>
        {t('sidebar.tag.contextMenu.copyName')}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Check} onSelect={onCheckout}>
        {t('sidebar.tag.contextMenu.checkout', { name: tag.name })}
      </MenuItem>
      <MenuItem icon={Info} disabled={!onShowDetails} onSelect={onShowDetails}>
        {t('sidebar.tag.contextMenu.details')}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={GitCompare} disabled={!onDiffAgainstCurrent} onSelect={onDiffAgainstCurrent}>
        {t('sidebar.tag.contextMenu.diffAgainstCurrent')}
      </MenuItem>
      <MenuSeparator />
      {remotes.length > 0 && (
        <SubMenu icon={Upload} label={t('sidebar.tag.contextMenu.pushTo')} minWidth="sm">
          {remotes.map((remote) => (
            <MenuItem key={remote.name} onSelect={() => onPush?.(remote.name)}>
              {remote.name}
            </MenuItem>
          ))}
        </SubMenu>
      )}
      <MenuItem icon={Trash2} danger onSelect={onDelete}>
        {t('sidebar.tag.contextMenu.delete', { name: tag.name })}
      </MenuItem>

      <CustomActionsMenuSection context={ActionContext.Tag} variables={{ tag: tag.name }} />
    </ContextMenu>
  );
}
