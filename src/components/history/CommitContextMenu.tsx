import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GitBranch,
  GitMerge,
  Tag,
  RotateCcw,
  Copy,
  CherryIcon,
  Undo2,
  Check,
  Archive,
  FileText,
  ArrowUpFromLine,
  PenTool,
  Search,
} from 'lucide-react';
import { ContextMenu, MenuItem, MenuSeparator, SubMenu } from '@/components/ui';
import { toast } from '@/hooks';
import { copyToClipboard } from '@/lib/actions';
import { getErrorMessage } from '@/lib/errorUtils';
import { branchApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useDialogStore } from '@/store/dialogStore';
import { ResetMode } from '@/types';
import type { GraphCommit, ResetMode as ResetModeType } from '@/types';
import { CustomActionsMenuSection } from '@/components/custom-actions';
import { ActionContext } from '@/types';

interface CommitContextMenuProps {
  commit: GraphCommit;
  /** When provided, wraps children with ContextMenu. When omitted, renders just menu items. */
  children?: ReactNode;
  onCheckout?: () => void;
  onMerge?: () => void;
}

export function CommitContextMenu({
  commit,
  children,
  onCheckout,
  onMerge,
}: CommitContextMenuProps) {
  const { t } = useTranslation();
  const { repository, loadBranches, loadCommits, loadStatus, reloadRepositoryInfo } =
    useRepositoryStore();
  const {
    openTagDialog,
    openCreateBranchDialog,
    openCherryPickDialog,
    openResetConfirmDialog,
    openRevertCommitDialog,
    openRebaseDialog,
    openArchiveDialog,
    openPatchDialog,
    openBisectDialog,
    openMergeDialog,
  } = useDialogStore();

  const handleCopySha = () => {
    copyToClipboard(commit.oid);
  };

  const handleCopyShortSha = () => {
    copyToClipboard(commit.shortOid);
  };

  const handleCheckout = async () => {
    if (onCheckout) {
      onCheckout();
    } else {
      try {
        await branchApi.checkout(commit.oid, { create: false, force: false, track: null });
        await Promise.all([reloadRepositoryInfo(), loadBranches(), loadCommits(), loadStatus()]);
      } catch (err) {
        toast.error(t('history.contextMenu.checkoutFailed'), getErrorMessage(err));
      }
    }
  };

  const handleCreateBranch = () => {
    openCreateBranchDialog({ startPoint: commit.oid });
  };

  const handleCreateTag = () => {
    openTagDialog({
      targetCommit: commit.oid,
      targetCommitSummary: commit.summary,
    });
  };

  const handleMerge = () => {
    if (onMerge) {
      onMerge();
    } else {
      // Find a local branch ref from this commit (excluding current branch)
      const branchRef = commit.refs.find(
        (ref) => ref.refType === 'LocalBranch' && ref.name !== repository?.currentBranch
      );
      openMergeDialog({ sourceBranch: branchRef?.name });
    }
  };

  const handleRebase = () => {
    openRebaseDialog({
      currentBranch: repository?.currentBranch ?? '',
      targetCommit: commit,
    });
  };

  const handleBisectGood = () => {
    openBisectDialog({ goodCommit: commit.oid });
  };

  const handleArchive = () => {
    openArchiveDialog({ commitOid: commit.oid, commitSummary: commit.summary });
  };

  const handlePatch = () => {
    openPatchDialog({ mode: 'create', commitOid: commit.oid, commitSummary: commit.summary });
  };

  const handleRevert = () => {
    openRevertCommitDialog({ commits: [commit] });
  };

  const handleCherryPick = () => {
    openCherryPickDialog({ commits: [commit] });
  };

  const handleReset = (mode: ResetModeType) => {
    openResetConfirmDialog({
      commit,
      mode,
      currentBranch: repository?.currentBranch ?? 'unknown',
    });
  };

  const menuItems = (
    <>
      <MenuItem icon={Check} onSelect={handleCheckout} shortcut={commit.shortOid}>
        {t('history.contextMenu.checkout')}
      </MenuItem>
      <MenuItem icon={ArrowUpFromLine} disabled>
        {t('history.contextMenu.pushRevision')}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={GitMerge} onSelect={handleMerge}>
        {t('history.contextMenu.merge')}
      </MenuItem>
      <MenuItem icon={GitMerge} className="[&>svg]:rotate-180" onSelect={handleRebase}>
        {t('history.contextMenu.rebase')}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Tag} onSelect={handleCreateTag}>
        {t('history.contextMenu.tag')}
      </MenuItem>
      <MenuItem icon={PenTool} disabled>
        {t('history.contextMenu.sign')}
      </MenuItem>
      <MenuItem icon={GitBranch} onSelect={handleCreateBranch}>
        {t('history.contextMenu.branch')}
      </MenuItem>
      <MenuSeparator />

      <SubMenu
        icon={RotateCcw}
        label={t('history.contextMenu.resetToHere', {
          branch: repository?.currentBranch ?? 'branch',
        })}
      >
        <MenuItem
          onSelect={() => handleReset(ResetMode.Soft)}
          hint={t('history.contextMenu.resetSoftHint')}
        >
          {t('history.contextMenu.resetSoft')}
        </MenuItem>
        <MenuItem
          onSelect={() => handleReset(ResetMode.Mixed)}
          hint={t('history.contextMenu.resetMixedHint')}
        >
          {t('history.contextMenu.resetMixed')}
        </MenuItem>
        <MenuItem
          danger
          onSelect={() => handleReset(ResetMode.Hard)}
          hint={t('history.contextMenu.resetHardHint')}
        >
          {t('history.contextMenu.resetHard')}
        </MenuItem>
      </SubMenu>

      <MenuItem icon={Undo2} onSelect={handleRevert}>
        {t('history.contextMenu.revertCommit')}
      </MenuItem>
      <MenuItem icon={CherryIcon} onSelect={handleCherryPick}>
        {t('history.contextMenu.cherryPick')}
      </MenuItem>
      <MenuItem icon={Search} onSelect={handleBisectGood}>
        {t('history.contextMenu.bisectFromHere')}
      </MenuItem>
      <MenuItem icon={FileText} onSelect={handlePatch}>
        {t('history.contextMenu.createPatch')}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Archive} onSelect={handleArchive}>
        {t('history.contextMenu.archive')}
      </MenuItem>

      <CustomActionsMenuSection
        context={ActionContext.Commit}
        variables={{
          commitHash: commit.oid,
          commitShort: commit.shortOid,
          commitMessage: commit.summary,
        }}
      />

      <MenuSeparator />

      <SubMenu icon={Copy} label={t('history.contextMenu.copy')}>
        <MenuItem onSelect={handleCopyShortSha} shortcut={commit.shortOid}>
          {t('history.contextMenu.shortSha')}
        </MenuItem>
        <MenuItem onSelect={handleCopySha}>{t('history.contextMenu.fullSha')}</MenuItem>
        <MenuItem onSelect={() => copyToClipboard(commit.summary)}>
          {t('history.contextMenu.commitMessage')}
        </MenuItem>
      </SubMenu>
    </>
  );

  // When children provided, wrap with ContextMenu (original behavior)
  // When children omitted, just render menu items (for use in external ContextMenuContent)
  if (children) {
    return <ContextMenu trigger={children}>{menuItems}</ContextMenu>;
  }

  return menuItems;
}
