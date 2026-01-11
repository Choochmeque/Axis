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

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="menu-content">
          <ContextMenu.Item className="menu-item" onSelect={handleOpenInTab}>
            <FolderOpen size={14} />
            <span>Open</span>
          </ContextMenu.Item>

          <ContextMenu.Item className="menu-item" onSelect={handleOpenInNewWindow}>
            <ExternalLink size={14} />
            <span>Open in New Window</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="menu-separator" />

          <ContextMenu.Item className="menu-item-danger" onSelect={handleRemove}>
            <Trash2 size={14} />
            <span>Remove from Recent</span>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
