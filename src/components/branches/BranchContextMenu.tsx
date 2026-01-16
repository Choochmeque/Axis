import { ReactNode, useState } from 'react';
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
  Check,
} from 'lucide-react';
import type { Branch, Remote } from '@/types';
import { useRepositoryStore } from '@/store/repositoryStore';
import { remoteApi, branchApi } from '@/services/api';
import { RenameBranchDialog } from './RenameBranchDialog';
import { DeleteBranchDialog } from './DeleteBranchDialog';
import { PullDialog } from '../remotes/PullDialog';
import { PushDialog } from '../remotes/PushDialog';
import { ContextMenu, MenuItem, MenuSeparator, SubMenu } from '@/components/ui';

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
    setShowPullDialog(true);
  };

  const handlePushTracked = () => {
    setShowPushDialog(true);
  };

  const handlePushToRemote = async (remoteName: string) => {
    try {
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
      <ContextMenu trigger={children} onOpenChange={handleMenuOpen}>
        <MenuItem icon={GitBranch} disabled={isCurrentBranch} onSelect={onCheckout}>
          Checkout {branch.name}
        </MenuItem>
        <MenuItem icon={GitMerge} disabled>
          Merge {branch.name} into {currentBranch?.name ?? 'current'}
        </MenuItem>
        <MenuItem icon={GitMerge} disabled className="[&>svg]:rotate-180">
          Rebase current changes onto {branch.name}
        </MenuItem>
        <MenuSeparator />

        {hasUpstream && isCurrentBranch && (
          <MenuItem icon={ArrowDownToLine} onSelect={handlePullTracked}>
            Pull {branch.upstream} (tracked)
          </MenuItem>
        )}
        {hasUpstream && isCurrentBranch && (
          <MenuItem icon={ArrowUpFromLine} onSelect={handlePushTracked}>
            Push to {branch.upstream} (tracked)
          </MenuItem>
        )}

        <SubMenu
          icon={ArrowUpFromLine}
          label="Push to"
          disabled={remotes.length === 0}
          minWidth="md"
        >
          {remotes.length === 0 ? (
            <MenuItem disabled>
              <span className="text-(--text-tertiary)">No remotes configured</span>
            </MenuItem>
          ) : (
            remotes.map((remote) => (
              <MenuItem key={remote.name} onSelect={() => handlePushToRemote(remote.name)}>
                {remote.name}
              </MenuItem>
            ))
          )}
        </SubMenu>

        <SubMenu
          icon={GitBranch}
          label="Track Remote Branch"
          disabled={remoteBranches.length === 0}
          minWidth="md"
          className="max-h-64 overflow-y-auto"
        >
          {remoteBranches.length === 0 ? (
            <MenuItem disabled>
              <span className="text-(--text-tertiary)">No remote branches</span>
            </MenuItem>
          ) : (
            remoteBranches.map((remoteBranch) => (
              <MenuItem
                key={remoteBranch.fullName}
                onSelect={() => handleTrackRemoteBranch(remoteBranch)}
                disabled={isSettingUpstream}
                icon={branch.upstream === remoteBranch.fullName ? Check : undefined}
                className={branch.upstream === remoteBranch.fullName ? 'font-medium' : ''}
              >
                {remoteBranch.name}
              </MenuItem>
            ))
          )}
        </SubMenu>

        <MenuSeparator />
        <MenuItem icon={Diff} disabled>
          Diff Against Current
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Pencil} onSelect={() => setShowRenameDialog(true)}>
          Rename...
        </MenuItem>
        {!isCurrentBranch && (
          <MenuItem icon={Trash2} danger onSelect={() => setShowDeleteDialog(true)}>
            Delete {branch.name}
          </MenuItem>
        )}
        <MenuSeparator />
        <MenuItem icon={Copy} onSelect={() => navigator.clipboard.writeText(branch.name)}>
          Copy Branch Name to Clipboard
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={GitPullRequest} disabled>
          Create Pull Request...
        </MenuItem>
      </ContextMenu>

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
