import { ReactNode, useState } from 'react';
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
  const { refreshRepository, loadStashes, clearStashSelection } = useRepositoryStore();
  const [branchName, setBranchName] = useState('');

  const handleApply = async () => {
    try {
      await stashApi.apply({ index: stash.index, reinstateIndex: false });
      await refreshRepository();
      toast.success('Stash applied');
    } catch (err) {
      toast.error('Apply stash failed', getErrorMessage(err));
    }
  };

  const handlePop = async () => {
    try {
      await stashApi.pop({ index: stash.index, reinstateIndex: false });
      clearStashSelection();
      await loadStashes();
      await refreshRepository();
      toast.success('Stash popped');
    } catch (err) {
      toast.error('Pop stash failed', getErrorMessage(err));
    }
  };

  const handleDrop = async () => {
    try {
      await stashApi.drop(Number(stash.index));
      clearStashSelection();
      await loadStashes();
      toast.success('Stash dropped');
    } catch (err) {
      toast.error('Drop stash failed', getErrorMessage(err));
    }
  };

  const handleBranch = async (name: string) => {
    if (!name.trim()) return;
    try {
      await stashApi.branch(name, Number(stash.index));
      clearStashSelection();
      await loadStashes();
      await refreshRepository();
      toast.success('Branch created from stash');
    } catch (err) {
      toast.error('Create branch failed', getErrorMessage(err));
    }
  };

  return (
    <ContextMenu trigger={children}>
      <MenuItem icon={Play} onSelect={handleApply} hint="Keep in list">
        Apply
      </MenuItem>
      <MenuItem icon={Play} onSelect={handlePop} hint="Apply & remove">
        Pop
      </MenuItem>
      <MenuSeparator />

      {/* Custom submenu with input form - using primitives */}
      <ContextMenuSub>
        <ContextMenuSubTrigger className="menu-item">
          <GitBranch size={14} />
          <span>Create Branch</span>
          <ChevronRight size={14} className="menu-chevron" />
        </ContextMenuSubTrigger>
        <ContextMenuPortal>
          <ContextMenuSubContent className="menu-content min-w-48">
            <div className="p-2">
              <Input
                placeholder="Branch name..."
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
                Create
              </Button>
            </div>
          </ContextMenuSubContent>
        </ContextMenuPortal>
      </ContextMenuSub>

      <MenuSeparator />
      <MenuItem icon={Copy} onSelect={() => copyToClipboard(stash.message)}>
        Copy Message
      </MenuItem>

      <CustomActionsMenuSection
        context={ActionContext.Stash}
        variables={{ stashRef: `stash@{${stash.index}}` }}
      />

      <MenuSeparator />
      <MenuItem icon={Trash2} danger onSelect={handleDrop}>
        Drop Stash
      </MenuItem>
    </ContextMenu>
  );
}
