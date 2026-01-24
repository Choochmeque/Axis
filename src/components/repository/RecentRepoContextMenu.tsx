import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      toast.error(t('repository.contextMenu.openWindowFailed'), getErrorMessage(e));
    });
  };

  const handleRemove = async () => {
    try {
      await repositoryApi.removeRecentRepository(repo.path);
      await loadRecentRepositories();
    } catch (err) {
      toast.error(t('repository.contextMenu.removeFailed'), getErrorMessage(err));
    }
  };

  return (
    <ContextMenu trigger={children}>
      <MenuItem icon={FolderOpen} onSelect={handleOpenInTab}>
        {t('repository.contextMenu.open')}
      </MenuItem>
      <MenuItem icon={ExternalLink} onSelect={handleOpenInNewWindow}>
        {t('repository.contextMenu.openInNewWindow')}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Trash2} danger onSelect={handleRemove}>
        {t('repository.contextMenu.removeFromRecent')}
      </MenuItem>
    </ContextMenu>
  );
}
