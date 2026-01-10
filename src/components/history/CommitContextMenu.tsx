import { ReactNode, useState } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import {
  GitBranch,
  GitMerge,
  Tag,
  RotateCcw,
  Copy,
  ChevronRight,
  CherryIcon,
  Undo2,
  Check,
} from 'lucide-react';
import type { GraphCommit } from '../../types';
import { useRepositoryStore } from '../../store/repositoryStore';
import { branchApi } from '../../services/api';
import { TagDialog } from '../tags/TagDialog';
import { CreateBranchDialog } from '../branches/CreateBranchDialog';
import { cn } from '../../lib/utils';

interface CommitContextMenuProps {
  commit: GraphCommit;
  children: ReactNode;
  onCheckout?: () => void;
  onCreateBranch?: () => void;
  onCreateTag?: () => void;
  onMerge?: () => void;
  onRevert?: () => void;
  onCherryPick?: () => void;
  onReset?: (mode: 'soft' | 'mixed' | 'hard') => void;
}

export function CommitContextMenu({
  commit,
  children,
  onCheckout,
  onCreateBranch,
  onCreateTag,
  onMerge,
  onRevert,
  onCherryPick,
  onReset,
}: CommitContextMenuProps) {
  const { repository, loadBranches, loadTags, loadCommits, loadStatus } = useRepositoryStore();
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);

  const handleCopySha = async () => {
    try {
      await navigator.clipboard.writeText(commit.oid);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyShortSha = async () => {
    try {
      await navigator.clipboard.writeText(commit.short_oid);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCheckout = async () => {
    if (onCheckout) {
      onCheckout();
    } else {
      try {
        await branchApi.checkout(commit.oid);
        await loadBranches();
        await loadCommits();
        await loadStatus();
      } catch (err) {
        console.error('Checkout failed:', err);
      }
    }
  };

  const handleCreateBranch = () => {
    if (onCreateBranch) {
      onCreateBranch();
    } else {
      setShowBranchDialog(true);
    }
  };

  const handleCreateTag = () => {
    if (onCreateTag) {
      onCreateTag();
    } else {
      setShowTagDialog(true);
    }
  };

  const handleTagCreated = async () => {
    await loadTags();
    await loadCommits();
    setShowTagDialog(false);
  };

  const handleMerge = () => {
    if (onMerge) {
      onMerge();
    }
    // TODO: Open merge dialog
  };

  const handleRevert = () => {
    if (onRevert) {
      onRevert();
    }
    // TODO: Implement revert
  };

  const handleCherryPick = () => {
    if (onCherryPick) {
      onCherryPick();
    }
    // TODO: Implement cherry-pick
  };

  const handleReset = (mode: 'soft' | 'mixed' | 'hard') => {
    if (onReset) {
      onReset(mode);
    }
    // TODO: Implement reset with confirmation dialog
  };

  const menuContentClass = "min-w-50 bg-(--bg-secondary) border border-(--border-color) rounded-md p-1 shadow-lg z-[10000] animate-in fade-in zoom-in-95 duration-100";
  const menuItemClass = "flex items-center gap-2 py-1.5 px-2 rounded text-xs text-(--text-primary) cursor-pointer outline-none select-none hover:bg-(--bg-tertiary) focus:bg-(--bg-tertiary) data-highlighted:bg-(--bg-tertiary) data-disabled:text-(--text-tertiary) data-disabled:cursor-not-allowed";
  const separatorClass = "h-px bg-(--border-color) my-1";
  const hintClass = "ml-auto text-[11px] text-(--text-tertiary)";
  const chevronClass = "ml-auto text-(--text-tertiary)";

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content className={menuContentClass}>
          <ContextMenu.Item className={menuItemClass} onSelect={handleCheckout}>
            <Check size={14} />
            <span>Checkout</span>
            <span className="ml-auto text-[11px] text-(--text-tertiary) font-mono">{commit.short_oid}</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className={separatorClass} />

          <ContextMenu.Item className={menuItemClass} onSelect={handleMerge}>
            <GitMerge size={14} />
            <span>Merge into {repository?.current_branch ?? 'current branch'}...</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className={separatorClass} />

          <ContextMenu.Item className={menuItemClass} onSelect={handleCreateTag}>
            <Tag size={14} />
            <span>Tag...</span>
          </ContextMenu.Item>

          <ContextMenu.Item className={menuItemClass} onSelect={handleCreateBranch}>
            <GitBranch size={14} />
            <span>Branch...</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className={separatorClass} />

          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className={menuItemClass}>
              <RotateCcw size={14} />
              <span>Reset {repository?.current_branch ?? 'branch'} to here</span>
              <ChevronRight size={14} className={chevronClass} />
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={cn(menuContentClass, "min-w-40")}>
                <ContextMenu.Item
                  className={menuItemClass}
                  onSelect={() => handleReset('soft')}
                >
                  <span>Soft</span>
                  <span className={hintClass}>Keep all changes staged</span>
                </ContextMenu.Item>
                <ContextMenu.Item
                  className={menuItemClass}
                  onSelect={() => handleReset('mixed')}
                >
                  <span>Mixed</span>
                  <span className={hintClass}>Keep changes unstaged</span>
                </ContextMenu.Item>
                <ContextMenu.Item
                  className={cn(menuItemClass, "text-error hover:bg-error/15 focus:bg-error/15 data-highlighted:bg-error/15")}
                  onSelect={() => handleReset('hard')}
                >
                  <span>Hard</span>
                  <span className={hintClass}>Discard all changes</span>
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          <ContextMenu.Item className={menuItemClass} onSelect={handleRevert}>
            <Undo2 size={14} />
            <span>Revert commit...</span>
          </ContextMenu.Item>

          <ContextMenu.Item className={menuItemClass} onSelect={handleCherryPick}>
            <CherryIcon size={14} />
            <span>Cherry Pick</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className={separatorClass} />

          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className={menuItemClass}>
              <Copy size={14} />
              <span>Copy</span>
              <ChevronRight size={14} className={chevronClass} />
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={cn(menuContentClass, "min-w-40")}>
                <ContextMenu.Item className={menuItemClass} onSelect={handleCopyShortSha}>
                  <span>Short SHA</span>
                  <span className="ml-auto text-[11px] text-(--text-secondary) font-mono">{commit.short_oid}</span>
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={handleCopySha}>
                  <span>Full SHA</span>
                </ContextMenu.Item>
                <ContextMenu.Item
                  className={menuItemClass}
                  onSelect={() => navigator.clipboard.writeText(commit.summary)}
                >
                  <span>Commit Message</span>
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      <TagDialog
        isOpen={showTagDialog}
        onClose={() => setShowTagDialog(false)}
        onTagCreated={handleTagCreated}
        targetCommit={commit.oid}
        targetCommitSummary={commit.summary}
      />

      <CreateBranchDialog
        open={showBranchDialog}
        onOpenChange={setShowBranchDialog}
        startPoint={commit.oid}
      />
    </>
  );
}
