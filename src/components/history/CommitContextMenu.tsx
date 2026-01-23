import { ReactNode, useState } from 'react';
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
import { ResetMode } from '@/types';
import type { GraphCommit, ResetMode as ResetModeType } from '@/types';
import { TagDialog } from '../tags/TagDialog';
import { CreateBranchDialog } from '../branches/CreateBranchDialog';
import { CherryPickDialog } from '../merge/CherryPickDialog';
import { ResetConfirmDialog } from '../merge/ResetConfirmDialog';
import { RevertCommitDialog } from '../merge/RevertCommitDialog';
import { RebaseDialog } from '../merge/RebaseDialog';
import { BisectDialog } from '../merge/BisectDialog';
import { ArchiveDialog } from './ArchiveDialog';
import { PatchDialog } from './PatchDialog';
import { CustomActionsMenuSection } from '@/components/custom-actions';
import { ActionContext } from '@/types';

interface CommitContextMenuProps {
  commit: GraphCommit;
  children: ReactNode;
  onCheckout?: () => void;
  onCreateBranch?: () => void;
  onCreateTag?: () => void;
  onMerge?: () => void;
  onRevert?: () => void;
  onCherryPick?: () => void;
  onReset?: (mode: ResetMode) => void;
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
  const { t } = useTranslation();
  const { repository, loadBranches, loadTags, loadCommits, loadStatus } = useRepositoryStore();
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [showCherryPickDialog, setShowCherryPickDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetMode, setResetMode] = useState<ResetModeType>(ResetMode.Mixed);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [showRebaseDialog, setShowRebaseDialog] = useState(false);
  const [showBisectDialog, setShowBisectDialog] = useState(false);
  const [bisectGoodCommit, setBisectGoodCommit] = useState<string | undefined>();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showPatchDialog, setShowPatchDialog] = useState(false);

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
        await loadBranches();
        await loadCommits();
        await loadStatus();
      } catch (err) {
        toast.error(t('history.contextMenu.checkoutFailed'), getErrorMessage(err));
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

  const handleRebase = () => {
    setShowRebaseDialog(true);
  };

  const handleRebaseComplete = async () => {
    setShowRebaseDialog(false);
    await loadCommits();
    await loadStatus();
    await loadBranches();
  };

  const handleBisectGood = () => {
    setBisectGoodCommit(commit.oid);
    setShowBisectDialog(true);
  };

  const handleBisectComplete = async () => {
    setShowBisectDialog(false);
    await loadCommits();
    await loadStatus();
  };

  const handleRevert = () => {
    if (onRevert) {
      onRevert();
    } else {
      setShowRevertDialog(true);
    }
  };

  const handleRevertComplete = async () => {
    setShowRevertDialog(false);
    await loadCommits();
    await loadStatus();
  };

  const handleCherryPick = () => {
    if (onCherryPick) {
      onCherryPick();
    } else {
      setShowCherryPickDialog(true);
    }
  };

  const handleCherryPickComplete = async () => {
    setShowCherryPickDialog(false);
    await loadCommits();
    await loadStatus();
  };

  const handleReset = (mode: ResetModeType) => {
    if (onReset) {
      onReset(mode);
    } else {
      setResetMode(mode);
      setShowResetDialog(true);
    }
  };

  const handleResetComplete = async () => {
    setShowResetDialog(false);
    await loadCommits();
    await loadStatus();
    await loadBranches();
  };

  return (
    <>
      <ContextMenu trigger={children}>
        <MenuItem icon={Check} onSelect={handleCheckout} shortcut={commit.shortOid}>
          {t('history.contextMenu.checkout')}
        </MenuItem>
        <MenuItem icon={ArrowUpFromLine} disabled>
          {t('history.contextMenu.pushRevision')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={GitMerge} disabled onSelect={handleMerge}>
          {t('history.contextMenu.mergeInto', {
            branch: repository?.currentBranch ?? 'current branch',
          })}
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
        <MenuItem icon={FileText} onSelect={() => setShowPatchDialog(true)}>
          {t('history.contextMenu.createPatch')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Archive} onSelect={() => setShowArchiveDialog(true)}>
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
      </ContextMenu>

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

      <CherryPickDialog
        isOpen={showCherryPickDialog}
        onClose={() => setShowCherryPickDialog(false)}
        onCherryPickComplete={handleCherryPickComplete}
        commits={[commit]}
      />

      <ResetConfirmDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onResetComplete={handleResetComplete}
        commit={commit}
        mode={resetMode}
        currentBranch={repository?.currentBranch ?? 'unknown'}
      />

      <RevertCommitDialog
        isOpen={showRevertDialog}
        onClose={() => setShowRevertDialog(false)}
        onRevertComplete={handleRevertComplete}
        commits={[commit]}
      />

      <RebaseDialog
        isOpen={showRebaseDialog}
        onClose={() => setShowRebaseDialog(false)}
        onRebaseComplete={handleRebaseComplete}
        currentBranch={repository?.currentBranch ?? ''}
        targetCommit={commit}
      />

      <ArchiveDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        commitOid={commit.oid}
        commitSummary={commit.summary}
      />

      <PatchDialog
        isOpen={showPatchDialog}
        onClose={() => setShowPatchDialog(false)}
        mode="create"
        commitOid={commit.oid}
        commitSummary={commit.summary}
      />

      <BisectDialog
        isOpen={showBisectDialog}
        onClose={() => setShowBisectDialog(false)}
        onBisectComplete={handleBisectComplete}
        goodCommit={bisectGoodCommit}
      />
    </>
  );
}
