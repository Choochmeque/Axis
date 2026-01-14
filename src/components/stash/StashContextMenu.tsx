import { ReactNode, useState } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { Play, Trash2, GitBranch, Copy, ChevronRight } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { StashEntry } from '../../types';
import { stashApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';

interface StashContextMenuProps {
  stash: StashEntry;
  children: ReactNode;
}

export function StashContextMenu({ stash, children }: StashContextMenuProps) {
  const { refreshRepository, loadStashes, clearStashSelection } = useRepositoryStore();
  const [branchName, setBranchName] = useState('');

  const handleApply = async () => {
    try {
      const result = await stashApi.apply({ index: stash.index, reinstateIndex: false });
      if (result.success) {
        await refreshRepository();
      } else {
        console.error('Failed to apply stash:', result.message);
      }
    } catch (err) {
      console.error('Failed to apply stash:', err);
    }
  };

  const handlePop = async () => {
    try {
      const result = await stashApi.pop({ index: stash.index, reinstateIndex: false });
      if (result.success) {
        clearStashSelection();
        await loadStashes();
        await refreshRepository();
      } else {
        console.error('Failed to pop stash:', result.message);
      }
    } catch (err) {
      console.error('Failed to pop stash:', err);
    }
  };

  const handleDrop = async () => {
    try {
      const result = await stashApi.drop(Number(stash.index));
      if (result.success) {
        clearStashSelection();
        await loadStashes();
      } else {
        console.error('Failed to drop stash:', result.message);
      }
    } catch (err) {
      console.error('Failed to drop stash:', err);
    }
  };

  const handleBranch = async (name: string) => {
    if (!name.trim()) return;
    try {
      const result = await stashApi.branch(name, Number(stash.index));
      if (result.success) {
        clearStashSelection();
        await loadStashes();
        await refreshRepository();
      } else {
        console.error('Failed to create branch from stash:', result.message);
      }
    } catch (err) {
      console.error('Failed to create branch from stash:', err);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(stash.message);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="menu-content">
          <ContextMenu.Item className="menu-item" onSelect={handleApply}>
            <Play size={14} />
            <span>Apply</span>
            <span className="menu-hint">Keep in list</span>
          </ContextMenu.Item>

          <ContextMenu.Item className="menu-item" onSelect={handlePop}>
            <Play size={14} />
            <span>Pop</span>
            <span className="menu-hint">Apply & remove</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="menu-separator" />

          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className="menu-item">
              <GitBranch size={14} />
              <span>Create Branch</span>
              <ChevronRight size={14} className="menu-chevron" />
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className="menu-content min-w-48">
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
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          <ContextMenu.Separator className="menu-separator" />

          <ContextMenu.Item className="menu-item" onSelect={handleCopyMessage}>
            <Copy size={14} />
            <span>Copy Message</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="menu-separator" />

          <ContextMenu.Item className="menu-item-danger" onSelect={handleDrop}>
            <Trash2 size={14} />
            <span>Drop Stash</span>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
