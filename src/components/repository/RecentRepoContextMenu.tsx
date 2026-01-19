import { ReactNode } from 'react';
import { FolderOpen, ExternalLink, Trash2 } from 'lucide-react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { RecentRepository } from '@/types';
import { repositoryApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import { ContextMenu, MenuItem, MenuSeparator } from '@/components/ui';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';

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
      toast.error('Open window failed', getErrorMessage(e));
    });
  };

  const handleRemove = async () => {
    try {
      await repositoryApi.removeRecentRepository(repo.path);
      await loadRecentRepositories();
    } catch (err) {
      toast.error('Remove repository failed', getErrorMessage(err));
    }
  };

  return (
    <ContextMenu trigger={children}>
      <MenuItem icon={FolderOpen} onSelect={handleOpenInTab}>
        Open
      </MenuItem>
      <MenuItem icon={ExternalLink} onSelect={handleOpenInNewWindow}>
        Open in New Window
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Trash2} danger onSelect={handleRemove}>
        Remove from Recent
      </MenuItem>
    </ContextMenu>
  );
}
