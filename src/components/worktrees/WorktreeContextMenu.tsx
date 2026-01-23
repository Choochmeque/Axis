import { ReactNode, useState } from 'react';
import { Play, Lock, Unlock, Trash2, FolderOpen, Copy } from 'lucide-react';

import { ContextMenu, MenuItem, MenuSeparator } from '@/components/ui';
import type { Worktree } from '@/types';
import { worktreeApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { copyToClipboard, showInFinder } from '@/lib/actions';
import { RemoveWorktreeDialog } from './RemoveWorktreeDialog';

interface WorktreeContextMenuProps {
  worktree: Worktree;
  children: ReactNode;
  onSwitch?: () => void;
}

export function WorktreeContextMenu({ worktree, children, onSwitch }: WorktreeContextMenuProps) {
  const { loadWorktrees } = useRepositoryStore();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const handleSwitch = () => {
    onSwitch?.();
  };

  const handleLock = async () => {
    try {
      await worktreeApi.lock(worktree.path);
      await loadWorktrees();
      toast.success('Worktree locked');
    } catch (err) {
      toast.error('Lock worktree failed', getErrorMessage(err));
    }
  };

  const handleUnlock = async () => {
    try {
      await worktreeApi.unlock(worktree.path);
      await loadWorktrees();
      toast.success('Worktree unlocked');
    } catch (err) {
      toast.error('Unlock worktree failed', getErrorMessage(err));
    }
  };

  return (
    <>
      <ContextMenu trigger={children}>
        {!worktree.isMain && (
          <>
            <MenuItem icon={Play} onSelect={handleSwitch}>
              Switch to Worktree
            </MenuItem>
            <MenuSeparator />
          </>
        )}

        <MenuItem icon={FolderOpen} onSelect={() => showInFinder(worktree.path)}>
          Open in Finder
        </MenuItem>

        <MenuItem icon={Copy} onSelect={() => copyToClipboard(worktree.path)}>
          Copy Path
        </MenuItem>

        <MenuSeparator />

        {worktree.isLocked ? (
          <MenuItem icon={Unlock} onSelect={handleUnlock}>
            Unlock
          </MenuItem>
        ) : (
          <MenuItem icon={Lock} onSelect={handleLock}>
            Lock
          </MenuItem>
        )}

        {!worktree.isMain && !worktree.isLocked && (
          <>
            <MenuSeparator />
            <MenuItem icon={Trash2} danger onSelect={() => setShowRemoveDialog(true)}>
              Remove Worktree
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
