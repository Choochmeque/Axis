import { ReactNode, useState } from 'react';
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
import { ArchiveDialog } from './ArchiveDialog';
import { PatchDialog } from './PatchDialog';

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
  const { repository, loadBranches, loadTags, loadCommits, loadStatus } = useRepositoryStore();
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [showCherryPickDialog, setShowCherryPickDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetMode, setResetMode] = useState<ResetModeType>(ResetMode.Mixed);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [showRebaseDialog, setShowRebaseDialog] = useState(false);
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
        await branchApi.checkout(commit.oid);
        await loadBranches();
        await loadCommits();
        await loadStatus();
      } catch (err) {
        toast.error('Checkout failed', getErrorMessage(err));
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
          Checkout
        </MenuItem>
        <MenuItem icon={ArrowUpFromLine} disabled>
          Push revision...
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={GitMerge} disabled onSelect={handleMerge}>
          Merge into {repository?.currentBranch ?? 'current branch'}...
        </MenuItem>
        <MenuItem icon={GitMerge} className="[&>svg]:rotate-180" onSelect={handleRebase}>
          Rebase...
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Tag} onSelect={handleCreateTag}>
          Tag...
        </MenuItem>
        <MenuItem icon={PenTool} disabled>
          Sign...
        </MenuItem>
        <MenuItem icon={GitBranch} onSelect={handleCreateBranch}>
          Branch...
        </MenuItem>
        <MenuSeparator />

        <SubMenu icon={RotateCcw} label={`Reset ${repository?.currentBranch ?? 'branch'} to here`}>
          <MenuItem onSelect={() => handleReset(ResetMode.Soft)} hint="Keep all changes staged">
            Soft
          </MenuItem>
          <MenuItem onSelect={() => handleReset(ResetMode.Mixed)} hint="Keep changes unstaged">
            Mixed
          </MenuItem>
          <MenuItem danger onSelect={() => handleReset(ResetMode.Hard)} hint="Discard all changes">
            Hard
          </MenuItem>
        </SubMenu>

        <MenuItem icon={Undo2} onSelect={handleRevert}>
          Revert commit...
        </MenuItem>
        <MenuItem icon={CherryIcon} onSelect={handleCherryPick}>
          Cherry Pick
        </MenuItem>
        <MenuItem icon={FileText} onSelect={() => setShowPatchDialog(true)}>
          Create Patch...
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Archive} onSelect={() => setShowArchiveDialog(true)}>
          Archive...
        </MenuItem>
        <MenuSeparator />

        <SubMenu icon={Copy} label="Copy">
          <MenuItem onSelect={handleCopyShortSha} shortcut={commit.shortOid}>
            Short SHA
          </MenuItem>
          <MenuItem onSelect={handleCopySha}>Full SHA</MenuItem>
          <MenuItem onSelect={() => copyToClipboard(commit.summary)}>Commit Message</MenuItem>
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
    </>
  );
}
