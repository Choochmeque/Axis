import { useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useStagingStore } from '@/store/stagingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { remoteApi, stashApi } from '@/services/api';
import { MenuAction } from '@/types';

export function useMenuActions() {
  const { openRepository, closeRepository, refreshRepository, repository } = useRepositoryStore();
  const { stageAll, unstageAll } = useStagingStore();
  const { setShowSettings, showSettings } = useSettingsStore();

  const handleMenuAction = useCallback(
    async (action: string) => {
      switch (action) {
        case MenuAction.NewWindow: {
          const selected = await open({
            directory: true,
            multiple: false,
            title: 'Open Git Repository',
          });
          if (selected && typeof selected === 'string') {
            await openRepository(selected);
          }
          break;
        }

        case MenuAction.CloseRepository:
          await closeRepository();
          break;

        case MenuAction.Refresh:
          await refreshRepository();
          break;

        case MenuAction.Settings:
          setShowSettings(!showSettings);
          break;

        case MenuAction.ToggleSidebar:
          // TODO: Implement sidebar toggle
          break;

        case MenuAction.Fetch:
          if (repository) {
            try {
              await remoteApi.fetchAll();
              await refreshRepository();
            } catch (err) {
              console.error('Fetch failed:', err);
            }
          }
          break;

        case MenuAction.Pull:
          if (repository) {
            try {
              const branchName = repository.currentBranch || 'main';
              await remoteApi.pull('origin', branchName);
              await refreshRepository();
            } catch (err) {
              console.error('Pull failed:', err);
            }
          }
          break;

        case MenuAction.Push:
          if (repository) {
            try {
              await remoteApi.pushCurrentBranch('origin');
              await refreshRepository();
            } catch (err) {
              console.error('Push failed:', err);
            }
          }
          break;

        case MenuAction.StageAll:
          await stageAll();
          break;

        case MenuAction.UnstageAll:
          await unstageAll();
          break;

        case MenuAction.Commit:
          // Focus commit form - handled by component
          document.dispatchEvent(new CustomEvent('focus-commit-form'));
          break;

        case MenuAction.NewBranch:
          // Open branch dialog - handled by Sidebar component
          document.dispatchEvent(new CustomEvent('open-new-branch-dialog'));
          break;

        case MenuAction.NewTag:
          // Open tag dialog - handled by Sidebar component
          document.dispatchEvent(new CustomEvent('open-new-tag-dialog'));
          break;

        case MenuAction.Stash:
          if (repository) {
            try {
              await stashApi.save({
                message: null,
                includeUntracked: false,
                keepIndex: false,
                includeIgnored: false,
              });
              await refreshRepository();
            } catch (err) {
              console.error('Stash failed:', err);
            }
          }
          break;

        case MenuAction.PopStash:
          if (repository) {
            try {
              await stashApi.pop({ index: 0, reinstateIndex: false });
              await refreshRepository();
            } catch (err) {
              console.error('Pop stash failed:', err);
            }
          }
          break;

        default:
          console.log('Unhandled menu action:', action);
      }
    },
    [
      openRepository,
      closeRepository,
      refreshRepository,
      repository,
      stageAll,
      unstageAll,
      setShowSettings,
      showSettings,
    ]
  );

  useEffect(() => {
    const unlisten = listen<string>('menu-action', (event) => {
      handleMenuAction(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [handleMenuAction]);
}
