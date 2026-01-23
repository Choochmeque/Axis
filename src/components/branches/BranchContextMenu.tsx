import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { ContextMenu, MenuItem, MenuSeparator, SubMenu } from '@/components/ui';
import { toast } from '@/hooks';
import { copyToClipboard } from '@/lib/actions';
import { getErrorMessage } from '@/lib/errorUtils';
import { remoteApi, branchApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import type { Branch, Remote } from '@/types';
import { RenameBranchDialog } from './RenameBranchDialog';
import { DeleteBranchDialog } from './DeleteBranchDialog';
import { BranchCompareDialog } from './BranchCompareDialog';
import { PullDialog } from '../remotes/PullDialog';
import { PushDialog } from '../remotes/PushDialog';
import { CustomActionsMenuSection } from '@/components/custom-actions';
import { ActionContext } from '@/types';

interface BranchContextMenuProps {
  branch: Branch;
  children: ReactNode;
  onCheckout?: () => void;
}

export function BranchContextMenu({ branch, children, onCheckout }: BranchContextMenuProps) {
  const { t } = useTranslation();
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPullDialog, setShowPullDialog] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
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
        toast.error(t('notifications.error.loadRemotesFailed'), getErrorMessage(err));
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
      toast.success(t('notifications.success.pushComplete'));
    } catch (err) {
      toast.error(t('notifications.error.pushFailed'), getErrorMessage(err));
    }
  };

  const handleTrackRemoteBranch = async (remoteBranch: Branch) => {
    if (isSettingUpstream) return;
    setIsSettingUpstream(true);
    try {
      await branchApi.setUpstream(branch.name, remoteBranch.fullName);
      await loadBranches();
      toast.success(t('notifications.success.upstreamSet'));
    } catch (err) {
      toast.error(t('notifications.error.setUpstreamFailed'), getErrorMessage(err));
    } finally {
      setIsSettingUpstream(false);
    }
  };

  return (
    <>
      <ContextMenu trigger={children} onOpenChange={handleMenuOpen}>
        <MenuItem icon={GitBranch} disabled={isCurrentBranch} onSelect={onCheckout}>
          {t('branches.contextMenu.checkout', { name: branch.name })}
        </MenuItem>
        <MenuItem icon={GitMerge} disabled>
          {t('branches.contextMenu.mergeInto', {
            source: branch.name,
            target: currentBranch?.name ?? 'current',
          })}
        </MenuItem>
        <MenuItem icon={GitMerge} disabled className="[&>svg]:rotate-180">
          {t('branches.contextMenu.rebaseOnto', { name: branch.name })}
        </MenuItem>
        <MenuSeparator />

        {hasUpstream && isCurrentBranch && (
          <MenuItem icon={ArrowDownToLine} onSelect={handlePullTracked}>
            {t('branches.contextMenu.pullTracked', { upstream: branch.upstream })}
          </MenuItem>
        )}
        {hasUpstream && isCurrentBranch && (
          <MenuItem icon={ArrowUpFromLine} onSelect={handlePushTracked}>
            {t('branches.contextMenu.pushTracked', { upstream: branch.upstream })}
          </MenuItem>
        )}

        <SubMenu
          icon={ArrowUpFromLine}
          label={t('branches.contextMenu.pushTo')}
          disabled={remotes.length === 0}
          minWidth="md"
        >
          {remotes.length === 0 ? (
            <MenuItem disabled>
              <span className="text-(--text-tertiary)">
                {t('branches.contextMenu.noRemotesConfigured')}
              </span>
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
          label={t('branches.contextMenu.trackRemoteBranch')}
          disabled={remoteBranches.length === 0}
          minWidth="md"
          className="max-h-64 overflow-y-auto"
        >
          {remoteBranches.length === 0 ? (
            <MenuItem disabled>
              <span className="text-(--text-tertiary)">
                {t('branches.contextMenu.noRemoteBranches')}
              </span>
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
        {!isCurrentBranch && (
          <MenuItem icon={Diff} onSelect={() => setShowCompareDialog(true)}>
            {t('branches.contextMenu.diffAgainstCurrent')}
          </MenuItem>
        )}
        {!isCurrentBranch && <MenuSeparator />}
        <MenuItem icon={Pencil} onSelect={() => setShowRenameDialog(true)}>
          {t('branches.contextMenu.rename')}
        </MenuItem>
        {!isCurrentBranch && (
          <MenuItem icon={Trash2} danger onSelect={() => setShowDeleteDialog(true)}>
            {t('branches.contextMenu.delete', { name: branch.name })}
          </MenuItem>
        )}
        <MenuSeparator />
        <MenuItem icon={Copy} onSelect={() => copyToClipboard(branch.name)}>
          {t('branches.contextMenu.copyBranchName')}
        </MenuItem>

        <CustomActionsMenuSection
          context={ActionContext.Branch}
          variables={{ branch: branch.name }}
        />

        <MenuSeparator />
        <MenuItem icon={GitPullRequest} disabled>
          {t('branches.contextMenu.createPullRequest')}
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

      <BranchCompareDialog
        open={showCompareDialog}
        onOpenChange={setShowCompareDialog}
        baseBranch={currentBranch ?? null}
        compareBranch={branch}
      />
    </>
  );
}
