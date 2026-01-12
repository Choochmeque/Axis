import { ReactNode } from 'react';
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
} from 'lucide-react';
import type { Branch } from '../../types';
import { useRepositoryStore } from '../../store/repositoryStore';

interface BranchContextMenuProps {
  branch: Branch;
  children: ReactNode;
  onCheckout?: () => void;
}

export function BranchContextMenu({ branch, children, onCheckout }: BranchContextMenuProps) {
  const { branches } = useRepositoryStore();
  const currentBranch = branches.find((b) => b.is_head);
  const hasUpstream = !!branch.upstream;
  const isCurrentBranch = branch.is_head;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="menu-content">
          {/* Checkout */}
          <ContextMenu.Item className="menu-item" disabled={isCurrentBranch} onSelect={onCheckout}>
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
          {hasUpstream && (
            <ContextMenu.Item className="menu-item" disabled>
              <ArrowDownToLine size={14} />
              <span>Pull {branch.upstream} (tracked)</span>
            </ContextMenu.Item>
          )}

          {/* Push (if has upstream) */}
          {hasUpstream && (
            <ContextMenu.Item className="menu-item" disabled>
              <ArrowUpFromLine size={14} />
              <span>Push to {branch.upstream} (tracked)</span>
            </ContextMenu.Item>
          )}

          {/* Push to submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className="menu-item" disabled>
              <ArrowUpFromLine size={14} />
              <span>Push to</span>
              <ChevronRight size={14} className="menu-chevron" />
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className="menu-content">
                <ContextMenu.Item className="menu-item" disabled>
                  <span>origin</span>
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          {/* Track Remote Branch submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className="menu-item" disabled>
              <GitBranch size={14} />
              <span>Track Remote Branch</span>
              <ChevronRight size={14} className="menu-chevron" />
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className="menu-content">
                <ContextMenu.Item className="menu-item" disabled>
                  <span>origin/main</span>
                </ContextMenu.Item>
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
          <ContextMenu.Item className="menu-item" disabled>
            <Pencil size={14} />
            <span>Rename...</span>
          </ContextMenu.Item>

          {/* Delete */}
          <ContextMenu.Item className="menu-item-danger" disabled>
            <Trash2 size={14} />
            <span>Delete {branch.name}</span>
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
