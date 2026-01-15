import { ReactNode, useState } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import {
  GitBranch,
  GitMerge,
  GitPullRequest,
  ArrowDownToLine,
  ArrowUpFromLine,
  Diff,
  Pencil,
  Trash2,
  Copy,
  ChevronRight,
  Check,
} from 'lucide-react';
import type { Branch, Remote } from '../../types';
import { useRepositoryStore } from '../../store/repositoryStore';
import { remoteApi, branchApi } from '../../services/api';
import { RenameBranchDialog } from './RenameBranchDialog';
import { DeleteBranchDialog } from './DeleteBranchDialog';
import { PullDialog } from '../remotes/PullDialog';
import { PushDialog } from '../remotes/PushDialog';

interface BranchContextMenuProps {
  branch: Branch;
  children: ReactNode;
  onCheckout?: () => void;
}

export function BranchContextMenu({ branch, children, onCheckout }: BranchContextMenuProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPullDialog, setShowPullDialog] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [remoteBranches, setRemoteBranches] = useState<Branch[]>([]);
  const [isSettingUpstream, setIsSettingUpstream] = useState(false);

  const { branches, loadBranches, loadCommits, refreshRepository } = useRepositoryStore();
  const currentBranch = branches.find((b) => b.isHead);
  const hasUpstream = !!branch.upstream;
  const isCurrentBranch = branch.isHead;

  // Load remotes and remote branches when menu opens
  const handleMenuOpen = async (open: boolean) => {
    if (open) {
      try {
        const [remotesData, branchesData] = await Promise.all([
          remoteApi.list(),
          branchApi.list(false, true), // Only remote branches
        ]);
        setRemotes(remotesData);
        setRemoteBranches(branchesData);
      } catch (err) {
        console.error('Failed to load remotes/branches:', err);
      }
    }
  };

  const handlePullTracked = () => {
    // Open pull dialog - it will auto-select the upstream
    setShowPullDialog(true);
  };

  const handlePushTracked = () => {
    // Open push dialog - it will auto-select the upstream
    setShowPushDialog(true);
  };

  const handlePushToRemote = async (remoteName: string) => {
    try {
      // Push the specific branch (works for both current and non-current branches)
      const refspec = `refs/heads/${branch.name}:refs/heads/${branch.name}`;
      await remoteApi.push(remoteName, [refspec], {
        force: false,
        setUpstream: !hasUpstream,
        tags: false,
      });
      await Promise.all([loadBranches(), loadCommits(), refreshRepository()]);
    } catch (err) {
      console.error('Push failed:', err);
    }
  };

  const handleTrackRemoteBranch = async (remoteBranch: Branch) => {
    if (isSettingUpstream) return;
    setIsSettingUpstream(true);
    try {
      // Set the upstream for the current branch
      await branchApi.setUpstream(branch.name, remoteBranch.fullName);
      await loadBranches();
    } catch (err) {
      console.error('Failed to set upstream:', err);
    } finally {
      setIsSettingUpstream(false);
    }
  };

  return (
    <>
      <ContextMenu.Root onOpenChange={handleMenuOpen}>
        <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content className="menu-content">
            {/* Checkout */}
            <ContextMenu.Item
              className="menu-item"
              disabled={isCurrentBranch}
              onSelect={onCheckout}
            >
              <GitBranch size={14} />
              <span>Checkout {branch.name}</span>
            </ContextMenu.Item>

            {/* Merge */}
            <ContextMenu.Item className="menu-item" disabled>
              <GitMerge size={14} />
              <span>
                Merge {branch.name} into {currentBranch?.name ?? 'current'}
              </span>
            </ContextMenu.Item>

            {/* Rebase */}
            <ContextMenu.Item className="menu-item" disabled>
              <GitMerge size={14} className="rotate-180" />
              <span>Rebase current changes onto {branch.name}</span>
            </ContextMenu.Item>

            <ContextMenu.Separator className="menu-separator" />

            {/* Pull (if has upstream) */}
            {hasUpstream && isCurrentBranch && (
              <ContextMenu.Item className="menu-item" onSelect={handlePullTracked}>
                <ArrowDownToLine size={14} />
                <span>Pull {branch.upstream} (tracked)</span>
              </ContextMenu.Item>
            )}

            {/* Push (if has upstream) */}
            {hasUpstream && isCurrentBranch && (
              <ContextMenu.Item className="menu-item" onSelect={handlePushTracked}>
                <ArrowUpFromLine size={14} />
                <span>Push to {branch.upstream} (tracked)</span>
              </ContextMenu.Item>
            )}

            {/* Push to submenu */}
            <ContextMenu.Sub>
              <ContextMenu.SubTrigger className="menu-item" disabled={remotes.length === 0}>
                <ArrowUpFromLine size={14} />
                <span>Push to</span>
                <ChevronRight size={14} className="menu-chevron" />
              </ContextMenu.SubTrigger>
              <ContextMenu.Portal>
                <ContextMenu.SubContent className="menu-content">
                  {remotes.length === 0 ? (
                    <ContextMenu.Item className="menu-item" disabled>
                      <span className="text-(--text-tertiary)">No remotes configured</span>
                    </ContextMenu.Item>
                  ) : (
                    remotes.map((remote) => (
                      <ContextMenu.Item
                        key={remote.name}
                        className="menu-item"
                        onSelect={() => handlePushToRemote(remote.name)}
                      >
                        <span>{remote.name}</span>
                      </ContextMenu.Item>
                    ))
                  )}
                </ContextMenu.SubContent>
              </ContextMenu.Portal>
            </ContextMenu.Sub>

            {/* Track Remote Branch submenu */}
            <ContextMenu.Sub>
              <ContextMenu.SubTrigger className="menu-item" disabled={remoteBranches.length === 0}>
                <GitBranch size={14} />
                <span>Track Remote Branch</span>
                <ChevronRight size={14} className="menu-chevron" />
              </ContextMenu.SubTrigger>
              <ContextMenu.Portal>
                <ContextMenu.SubContent className="menu-content max-h-64 overflow-y-auto">
                  {remoteBranches.length === 0 ? (
                    <ContextMenu.Item className="menu-item" disabled>
                      <span className="text-(--text-tertiary)">No remote branches</span>
                    </ContextMenu.Item>
                  ) : (
                    remoteBranches.map((remoteBranch) => (
                      <ContextMenu.Item
                        key={remoteBranch.fullName}
                        className="menu-item"
                        onSelect={() => handleTrackRemoteBranch(remoteBranch)}
                        disabled={isSettingUpstream}
                      >
                        {branch.upstream === remoteBranch.fullName && (
                          <Check size={14} className="text-success" />
                        )}
                        <span
                          className={branch.upstream === remoteBranch.fullName ? 'font-medium' : ''}
                        >
                          {remoteBranch.name}
                        </span>
                      </ContextMenu.Item>
                    ))
                  )}
                </ContextMenu.SubContent>
              </ContextMenu.Portal>
            </ContextMenu.Sub>

            <ContextMenu.Separator className="menu-separator" />

            {/* Diff Against Current */}
            <ContextMenu.Item className="menu-item" disabled>
              <Diff size={14} />
              <span>Diff Against Current</span>
            </ContextMenu.Item>

            <ContextMenu.Separator className="menu-separator" />

            {/* Rename */}
            <ContextMenu.Item className="menu-item" onSelect={() => setShowRenameDialog(true)}>
              <Pencil size={14} />
              <span>Rename...</span>
            </ContextMenu.Item>

            {/* Delete */}
            {!isCurrentBranch && (
              <ContextMenu.Item
                className="menu-item-danger"
                onSelect={() => setShowDeleteDialog(true)}
              >
                <Trash2 size={14} />
                <span>Delete {branch.name}</span>
              </ContextMenu.Item>
            )}

            <ContextMenu.Separator className="menu-separator" />

            {/* Copy Branch Name */}
            <ContextMenu.Item
              className="menu-item"
              onSelect={() => navigator.clipboard.writeText(branch.name)}
            >
              <Copy size={14} />
              <span>Copy Branch Name to Clipboard</span>
            </ContextMenu.Item>

            <ContextMenu.Separator className="menu-separator" />

            {/* Create Pull Request */}
            <ContextMenu.Item className="menu-item" disabled>
              <GitPullRequest size={14} />
              <span>Create Pull Request...</span>
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      <RenameBranchDialog
        open={showRenameDialog}
        onOpenChange={setShowRenameDialog}
        branch={branch}
      />

      <PullDialog open={showPullDialog} onOpenChange={setShowPullDialog} />

      <PushDialog open={showPushDialog} onOpenChange={setShowPushDialog} />

      <DeleteBranchDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        branch={branch}
      />
    </>
  );
}
