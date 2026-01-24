import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Trash2, GitBranch, Copy, ChevronRight } from 'lucide-react';
import {
  Button,
  Input,
  ContextMenu,
  MenuItem,
  MenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuPortal,
  ContextMenuSubContent,
} from '@/components/ui';
import type { StashEntry } from '@/types';
import { ActionContext } from '@/types';
import { CustomActionsMenuSection } from '@/components/custom-actions';
import { stashApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { copyToClipboard } from '@/lib/actions';

interface StashContextMenuProps {
  stash: StashEntry;
  children: ReactNode;
}

export function StashContextMenu({ stash, children }: StashContextMenuProps) {
  const { t } = useTranslation();
  const { applyStash, popStash, loadStashes, clearStashSelection, refreshRepository } =
    useRepositoryStore();
  const [branchName, setBranchName] = useState('');

  const handleDrop = async () => {
    try {
      await stashApi.drop(Number(stash.index));
      clearStashSelection();
      await loadStashes();
      toast.success(t('stash.dropSuccess'));
    } catch (err) {
      toast.error(t('stash.contextMenu.dropFailed'), getErrorMessage(err));
    }
  };

  const handleBranch = async (name: string) => {
    if (!name.trim()) return;
    try {
      await stashApi.branch(name, Number(stash.index));
      clearStashSelection();
      await loadStashes();
      await refreshRepository();
      toast.success(t('stash.contextMenu.branchSuccess'));
    } catch (err) {
      toast.error(t('stash.contextMenu.branchFailed'), getErrorMessage(err));
    }
  };

  return (
    <ContextMenu trigger={children}>
      <MenuItem
        icon={Play}
        onSelect={() => applyStash(stash.index)}
        hint={t('stash.contextMenu.applyHint')}
      >
        {t('stash.apply')}
      </MenuItem>
      <MenuItem
        icon={Play}
        onSelect={() => popStash(stash.index)}
        hint={t('stash.contextMenu.popHint')}
      >
        {t('stash.pop')}
      </MenuItem>
      <MenuSeparator />

      {/* Custom submenu with input form - using primitives */}
      <ContextMenuSub>
        <ContextMenuSubTrigger className="menu-item">
          <GitBranch size={14} />
          <span>{t('stash.contextMenu.createBranch')}</span>
          <ChevronRight size={14} className="menu-chevron" />
        </ContextMenuSubTrigger>
        <ContextMenuPortal>
          <ContextMenuSubContent className="menu-content min-w-48">
            <div className="p-2">
              <Input
                placeholder={t('stash.contextMenu.branchPlaceholder')}
                className="text-sm"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    handleBranch(branchName);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                variant="primary"
                className="w-full mt-2 text-xs"
                onClick={() => handleBranch(branchName)}
                disabled={!branchName.trim()}
              >
                {t('stash.contextMenu.createButton')}
              </Button>
            </div>
          </ContextMenuSubContent>
        </ContextMenuPortal>
      </ContextMenuSub>

      <MenuSeparator />
      <MenuItem icon={Copy} onSelect={() => copyToClipboard(stash.message)}>
        {t('stash.contextMenu.copyMessage')}
      </MenuItem>

      <CustomActionsMenuSection
        context={ActionContext.Stash}
        variables={{ stashRef: `stash@{${stash.index}}` }}
      />

      <MenuSeparator />
      <MenuItem icon={Trash2} danger onSelect={handleDrop}>
        {t('stash.contextMenu.dropStash')}
      </MenuItem>
    </ContextMenu>
  );
}
