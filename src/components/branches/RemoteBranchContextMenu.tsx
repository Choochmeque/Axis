import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GitBranch, ArrowDownToLine, Diff, Trash2, Copy } from 'lucide-react';
import type { Branch } from '@/types';
import { useRepositoryStore } from '@/store/repositoryStore';
import { DeleteRemoteBranchDialog } from './DeleteRemoteBranchDialog';
import { ContextMenu, MenuItem, MenuSeparator } from '@/components/ui';
import { copyToClipboard } from '@/lib/actions';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';

interface RemoteBranchContextMenuProps {
  branch: Branch;
  children: ReactNode;
}

export function RemoteBranchContextMenu({ branch, children }: RemoteBranchContextMenuProps) {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { branches, checkoutBranch } = useRepositoryStore();
  const currentBranch = branches.find((b) => b.isHead);

  // Extract remote and branch name from full name (e.g., "origin/main" -> remote="origin", name="main")
  const parts = branch.name.split('/');
  const remoteName = parts[0];
  const branchName = parts.slice(1).join('/');

  const handleCheckout = async () => {
    try {
      await checkoutBranch(branch.name, true);
    } catch (err) {
      toast.error(t('notifications.error.operationFailed'), getErrorMessage(err));
    }
  };

  return (
    <>
      <ContextMenu trigger={children}>
        <MenuItem icon={GitBranch} onSelect={handleCheckout}>
          {t('branches.remoteContextMenu.checkout')}
        </MenuItem>
        <MenuItem icon={ArrowDownToLine} disabled>
          {t('branches.remoteContextMenu.pullInto', {
            remote: remoteName,
            branch: branchName,
            current: currentBranch?.name ?? 'current',
          })}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Copy} onSelect={() => copyToClipboard(branch.name)}>
          {t('branches.contextMenu.copyBranchName')}
        </MenuItem>
        <MenuItem icon={Diff} disabled>
          {t('branches.remoteContextMenu.diffAgainstCurrent')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Trash2} danger onSelect={() => setShowDeleteDialog(true)}>
          {t('branches.remoteContextMenu.delete', { name: branch.name })}
        </MenuItem>
      </ContextMenu>

      <DeleteRemoteBranchDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        branch={branch}
      />
    </>
  );
}
