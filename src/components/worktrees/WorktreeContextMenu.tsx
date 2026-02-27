import { Copy, FolderOpen, Lock, Play, Trash2, Unlock } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ContextMenu, MenuItem, MenuSeparator } from '@/components/ui';
import { toast } from '@/hooks';
import { copyToClipboard, showInFinder } from '@/lib/actions';
import { getErrorMessage } from '@/lib/errorUtils';
import { worktreeApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import type { Worktree } from '@/types';
import { RemoveWorktreeDialog } from './RemoveWorktreeDialog';

interface WorktreeContextMenuProps {
  worktree: Worktree;
  children: ReactNode;
  onSwitch?: () => void;
}

export function WorktreeContextMenu({ worktree, children, onSwitch }: WorktreeContextMenuProps) {
  const { t } = useTranslation();
  const { loadWorktrees } = useRepositoryStore();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const handleSwitch = () => {
    onSwitch?.();
  };

  const handleLock = async () => {
    try {
      await worktreeApi.lock(worktree.path);
      await loadWorktrees();
      toast.success(t('worktrees.notifications.locked'));
    } catch (err) {
      toast.error(t('worktrees.notifications.lockFailed'), getErrorMessage(err));
    }
  };

  const handleUnlock = async () => {
    try {
      await worktreeApi.unlock(worktree.path);
      await loadWorktrees();
      toast.success(t('worktrees.notifications.unlocked'));
    } catch (err) {
      toast.error(t('worktrees.notifications.unlockFailed'), getErrorMessage(err));
    }
  };

  return (
    <>
      <ContextMenu trigger={children}>
        {!worktree.isMain && (
          <>
            <MenuItem icon={Play} onSelect={handleSwitch}>
              {t('worktrees.contextMenu.switch')}
            </MenuItem>
            <MenuSeparator />
          </>
        )}

        <MenuItem icon={FolderOpen} onSelect={() => showInFinder(worktree.path)}>
          {t('worktrees.contextMenu.openInFinder')}
        </MenuItem>

        <MenuItem icon={Copy} onSelect={() => copyToClipboard(worktree.path)}>
          {t('worktrees.contextMenu.copyPath')}
        </MenuItem>

        <MenuSeparator />

        {worktree.isLocked ? (
          <MenuItem icon={Unlock} onSelect={handleUnlock}>
            {t('worktrees.contextMenu.unlock')}
          </MenuItem>
        ) : (
          <MenuItem icon={Lock} onSelect={handleLock}>
            {t('worktrees.contextMenu.lock')}
          </MenuItem>
        )}

        {!worktree.isMain && !worktree.isLocked && (
          <>
            <MenuSeparator />
            <MenuItem icon={Trash2} danger onSelect={() => setShowRemoveDialog(true)}>
              {t('worktrees.contextMenu.remove')}
            </MenuItem>
          </>
        )}
      </ContextMenu>

      <RemoveWorktreeDialog
        open={showRemoveDialog}
        onOpenChange={setShowRemoveDialog}
        worktree={worktree}
      />
    </>
  );
}
