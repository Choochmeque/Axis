import { ReactNode } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { GitBranch, GitPullRequest, ArrowDownToLine, Diff, Trash2, Copy } from 'lucide-react';
import type { Branch } from '../../types';
import { useRepositoryStore } from '../../store/repositoryStore';

interface RemoteBranchContextMenuProps {
  branch: Branch;
  children: ReactNode;
}

export function RemoteBranchContextMenu({ branch, children }: RemoteBranchContextMenuProps) {
  const { branches } = useRepositoryStore();
  const currentBranch = branches.find((b) => b.is_head);

  // Extract remote and branch name from full name (e.g., "origin/main" -> remote="origin", name="main")
  const parts = branch.name.split('/');
  const remoteName = parts[0];
  const branchName = parts.slice(1).join('/');

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="menu-content">
          {/* Checkout */}
          <ContextMenu.Item className="menu-item" disabled>
            <GitBranch size={14} />
            <span>Checkout...</span>
          </ContextMenu.Item>

          {/* Pull */}
          <ContextMenu.Item className="menu-item" disabled>
            <ArrowDownToLine size={14} />
            <span>
              Pull {remoteName}/{branchName} into {currentBranch?.name ?? 'current'}
            </span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="menu-separator" />

          {/* Copy Branch Name */}
          <ContextMenu.Item
            className="menu-item"
            onSelect={() => navigator.clipboard.writeText(branch.name)}
          >
            <Copy size={14} />
            <span>Copy Branch Name to Clipboard</span>
          </ContextMenu.Item>

          {/* Diff Against Current */}
          <ContextMenu.Item className="menu-item" disabled>
            <Diff size={14} />
            <span>Diff Against Current</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="menu-separator" />

          {/* Delete */}
          <ContextMenu.Item className="menu-item-danger" disabled>
            <Trash2 size={14} />
            <span>Delete...</span>
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
  );
}
