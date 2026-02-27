import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { ExternalLink, FolderOpen, FolderSearch, Pin, PinOff, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ContextMenu, MenuItem, MenuSeparator } from '@/components/ui';
import { toast } from '@/hooks';
import { getErrorMessage } from '@/lib/errorUtils';
import { repositoryApi, shellApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import type { RecentRepository } from '@/types';

interface RecentRepoContextMenuProps {
  repo: RecentRepository;
  /** When provided, wraps children with ContextMenu. When omitted, renders just menu items. */
  children?: ReactNode;
  onOpenInTab: (path: string) => void;
}

export function RecentRepoContextMenu({ repo, children, onOpenInTab }: RecentRepoContextMenuProps) {
  const { t } = useTranslation();
  const { loadRecentRepositories, pinRepository, unpinRepository } = useRepositoryStore();

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

  const handleShowInFinder = async () => {
    try {
      await shellApi.showInFolder(repo.path);
    } catch (err) {
      toast.error(t('notifications.error.showInFinderFailed'), getErrorMessage(err));
    }
  };

  const handleTogglePin = async () => {
    if (repo.isPinned) {
      await unpinRepository(repo.path);
    } else {
      await pinRepository(repo.path);
    }
  };

  const handleRemove = async () => {
    try {
      await repositoryApi.removeRecentRepository(repo.path);
      await loadRecentRepositories();
    } catch (err) {
      toast.error(t('repository.contextMenu.removeFailed'), getErrorMessage(err));
    }
  };

  const menuItems = (
    <>
      <MenuItem icon={FolderOpen} onSelect={handleOpenInTab} disabled={!repo.exists}>
        {t('repository.contextMenu.open')}
      </MenuItem>
      <MenuItem icon={ExternalLink} onSelect={handleOpenInNewWindow} disabled={!repo.exists}>
        {t('repository.contextMenu.openInNewWindow')}
      </MenuItem>
      <MenuItem icon={FolderSearch} onSelect={handleShowInFinder} disabled={!repo.exists}>
        {t('repository.contextMenu.showInFinder')}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={repo.isPinned ? PinOff : Pin} onSelect={handleTogglePin}>
        {repo.isPinned ? t('welcome.unpin') : t('welcome.pin')}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Trash2} danger onSelect={handleRemove}>
        {t('repository.contextMenu.removeFromRecent')}
      </MenuItem>
    </>
  );

  if (children) {
    return <ContextMenu trigger={children}>{menuItems}</ContextMenu>;
  }

  return menuItems;
}
