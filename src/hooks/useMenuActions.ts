import { useEffect, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

import { events } from '@/bindings/api';
import { toast } from '@/hooks';
import { notifyNewCommits } from '@/lib/actions';
import { getErrorMessage } from '@/lib/errorUtils';
import { remoteApi, stashApi } from '@/services/api';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useStagingStore } from '@/store/stagingStore';
import { MenuAction } from '@/types';

export function useMenuActions() {
  const { openRepository, closeRepository, refreshRepository, repository, branches } =
    useRepositoryStore();
  const { stageAll, unstageAll } = useStagingStore();
  const { setShowSettings, showSettings } = useSettingsStore();
  const currentBranch = branches.find((b) => b.isHead);

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
              notifyNewCommits(useRepositoryStore.getState().branches);
            } catch (err) {
              toast.error(getErrorMessage(err));
            }
          }
          break;

        case MenuAction.Pull:
          if (repository) {
            try {
              const branchName = repository.currentBranch || 'main';
              await remoteApi.pull('origin', branchName, { rebase: false, ffOnly: false });
              await refreshRepository();
              toast.success('Pull complete');
            } catch (err) {
              toast.error(getErrorMessage(err));
            }
          }
          break;

        case MenuAction.Push:
          if (repository) {
            try {
              // Set upstream tracking if branch doesn't have one yet
              const needsUpstream = !currentBranch?.upstream;
              await remoteApi.pushCurrentBranch('origin', {
                force: false,
                setUpstream: needsUpstream,
                tags: false,
              });
              await refreshRepository();
              toast.success('Push complete');
            } catch (err) {
              toast.error(getErrorMessage(err));
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
              toast.success('Changes stashed');
            } catch (err) {
              toast.error(getErrorMessage(err));
            }
          }
          break;

        case MenuAction.PopStash:
          if (repository) {
            try {
              await stashApi.pop({ index: 0, reinstateIndex: false });
              await refreshRepository();
              toast.success('Stash applied');
            } catch (err) {
              toast.error(getErrorMessage(err));
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
      currentBranch,
      stageAll,
      unstageAll,
      setShowSettings,
      showSettings,
    ]
  );

  useEffect(() => {
    const unlisten = events.menuActionEvent.listen((event) => {
      handleMenuAction(event.payload.actionId);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [handleMenuAction]);
}
