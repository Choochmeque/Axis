import { useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { useRepositoryStore } from '../store/repositoryStore';
import { useStagingStore } from '../store/stagingStore';
import { useSettingsStore } from '../store/settingsStore';
import { remoteApi, stashApi } from '../services/api';

// Menu action IDs - should match Rust menu.rs
const MENU_IDS = {
  NEW_WINDOW: 'new_window',
  OPEN_REPOSITORY: 'open_repository',
  CLOSE_REPOSITORY: 'close_repository',
  SETTINGS: 'settings',
  REFRESH: 'refresh',
  TOGGLE_SIDEBAR: 'toggle_sidebar',
  FETCH: 'fetch',
  PULL: 'pull',
  PUSH: 'push',
  STAGE_ALL: 'stage_all',
  UNSTAGE_ALL: 'unstage_all',
  COMMIT: 'commit',
  NEW_BRANCH: 'new_branch',
  NEW_TAG: 'new_tag',
  STASH: 'stash',
  POP_STASH: 'pop_stash',
} as const;

export function useMenuActions() {
  const { openRepository, closeRepository, refreshRepository, repository } = useRepositoryStore();
  const { stageAll, unstageAll } = useStagingStore();
  const { setShowSettings, showSettings } = useSettingsStore();

  const handleMenuAction = useCallback(
    async (action: string) => {
      switch (action) {
        case MENU_IDS.OPEN_REPOSITORY: {
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

        case MENU_IDS.CLOSE_REPOSITORY:
          await closeRepository();
          break;

        case MENU_IDS.REFRESH:
          await refreshRepository();
          break;

        case MENU_IDS.SETTINGS:
          setShowSettings(!showSettings);
          break;

        case MENU_IDS.TOGGLE_SIDEBAR:
          // TODO: Implement sidebar toggle
          break;

        case MENU_IDS.FETCH:
          if (repository) {
            try {
              await remoteApi.fetchAll();
              await refreshRepository();
            } catch (err) {
              console.error('Fetch failed:', err);
            }
          }
          break;

        case MENU_IDS.PULL:
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

        case MENU_IDS.PUSH:
          if (repository) {
            try {
              await remoteApi.pushCurrentBranch('origin');
              await refreshRepository();
            } catch (err) {
              console.error('Push failed:', err);
            }
          }
          break;

        case MENU_IDS.STAGE_ALL:
          await stageAll();
          break;

        case MENU_IDS.UNSTAGE_ALL:
          await unstageAll();
          break;

        case MENU_IDS.COMMIT:
          // Focus commit form - handled by component
          document.dispatchEvent(new CustomEvent('focus-commit-form'));
          break;

        case MENU_IDS.NEW_BRANCH:
          // Open branch dialog - handled by Sidebar component
          document.dispatchEvent(new CustomEvent('open-new-branch-dialog'));
          break;

        case MENU_IDS.NEW_TAG:
          // Open tag dialog - handled by Sidebar component
          document.dispatchEvent(new CustomEvent('open-new-tag-dialog'));
          break;

        case MENU_IDS.STASH:
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

        case MENU_IDS.POP_STASH:
          if (repository) {
            try {
              await stashApi.pop({ index: 0n, reinstateIndex: false });
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
