import { ReactNode } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { FolderOpen, ExternalLink, Trash2 } from 'lucide-react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { RecentRepository } from '../../types';
import { repositoryApi } from '../../services/api';
import { useRepositoryStore } from '../../store/repositoryStore';

interface RecentRepoContextMenuProps {
  repo: RecentRepository;
  children: ReactNode;
  onOpenInTab: (path: string) => void;
}

export function RecentRepoContextMenu({ repo, children, onOpenInTab }: RecentRepoContextMenuProps) {
  const { loadRecentRepositories } = useRepositoryStore();

  const handleOpenInTab = () => {
    onOpenInTab(repo.path);
  };

  const handleOpenInNewWindow = async () => {
    const windowLabel = `repo-${Date.now()}`;
    const repoParam = encodeURIComponent(repo.path);
    const webview = new WebviewWindow(windowLabel, {
      url: `index.html?repo=${repoParam}`,
      title: repo.name,
    });

    webview.once('tauri://error', (e) => {
      console.error('Failed to create window:', e);
    });
  };

  const handleRemove = async () => {
    try {
      await repositoryApi.removeRecentRepository(repo.path);
      await loadRecentRepositories();
    } catch (err) {
      console.error('Failed to remove recent repository:', err);
    }
  };

  const menuContentClass =
    'min-w-50 bg-(--bg-secondary) border border-(--border-color) rounded-md p-1 shadow-lg z-[10000] animate-in fade-in zoom-in-95 duration-100';
  const menuItemClass =
    'flex items-center gap-2 py-1.5 px-2 rounded text-xs text-(--text-primary) cursor-pointer outline-none select-none hover:bg-(--bg-tertiary) focus:bg-(--bg-tertiary) data-highlighted:bg-(--bg-tertiary)';
  const separatorClass = 'h-px bg-(--border-color) my-1';
  const dangerItemClass =
    'flex items-center gap-2 py-1.5 px-2 rounded text-xs text-error cursor-pointer outline-none select-none hover:bg-error/15 focus:bg-error/15 data-highlighted:bg-error/15';

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className={menuContentClass}>
          <ContextMenu.Item className={menuItemClass} onSelect={handleOpenInTab}>
            <FolderOpen size={14} />
            <span>Open</span>
          </ContextMenu.Item>

          <ContextMenu.Item className={menuItemClass} onSelect={handleOpenInNewWindow}>
            <ExternalLink size={14} />
            <span>Open in New Window</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className={separatorClass} />

          <ContextMenu.Item className={dangerItemClass} onSelect={handleRemove}>
            <Trash2 size={14} />
            <span>Remove from Recent</span>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
