import { ReactNode, useState } from 'react';
import { GitBranch, ArrowDownToLine, Diff, Trash2, Copy } from 'lucide-react';
import type { Branch } from '@/types';
import { useRepositoryStore } from '@/store/repositoryStore';
import { DeleteRemoteBranchDialog } from './DeleteRemoteBranchDialog';
import { ContextMenu, MenuItem, MenuSeparator } from '@/components/ui';

interface RemoteBranchContextMenuProps {
  branch: Branch;
  children: ReactNode;
}

export function RemoteBranchContextMenu({ branch, children }: RemoteBranchContextMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { branches } = useRepositoryStore();
  const currentBranch = branches.find((b) => b.isHead);

  // Extract remote and branch name from full name (e.g., "origin/main" -> remote="origin", name="main")
  const parts = branch.name.split('/');
  const remoteName = parts[0];
  const branchName = parts.slice(1).join('/');

  return (
    <>
      <ContextMenu trigger={children}>
        <MenuItem icon={GitBranch} disabled>
          Checkout...
        </MenuItem>
        <MenuItem icon={ArrowDownToLine} disabled>
          Pull {remoteName}/{branchName} into {currentBranch?.name ?? 'current'}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Copy} onSelect={() => navigator.clipboard.writeText(branch.name)}>
          Copy Branch Name to Clipboard
        </MenuItem>
        <MenuItem icon={Diff} disabled>
          Diff Against Current
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={Trash2} danger onSelect={() => setShowDeleteDialog(true)}>
          Delete {branch.name}...
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
