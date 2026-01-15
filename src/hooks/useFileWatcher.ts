import { useEffect, useRef } from 'react';
import { UnlistenFn } from '@tauri-apps/api/event';
import { repositoryApi } from '../services/api';
import { useRepositoryStore } from '../store/repositoryStore';
import { useStagingStore } from '../store/stagingStore';
import { events } from '@/bindings/api';

export function useFileWatcher() {
  const repository = useRepositoryStore((state) => state.repository);
  const loadStatus = useRepositoryStore((state) => state.loadStatus);
  const loadCommits = useRepositoryStore((state) => state.loadCommits);
  const loadBranches = useRepositoryStore((state) => state.loadBranches);
  const loadTags = useRepositoryStore((state) => state.loadTags);
  const loadStashes = useRepositoryStore((state) => state.loadStashes);
  const stagingLoadStatus = useStagingStore((state) => state.loadStatus);

  const unlistenRefs = useRef<UnlistenFn[]>([]);

  useEffect(() => {
    if (!repository) {
      // Cleanup listeners when no repository
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];
      return;
    }

    const setupListeners = async () => {
      // Start the file watcher
      try {
        await repositoryApi.startFileWatcher();
      } catch (err) {
        console.error('Failed to start file watcher:', err);
        return;
      }

      // Listen for files_changed events (working directory changes)
      const unlistenFiles = await events.filesChangedEvent.listen(() => {
        // Reload status when files change
        loadStatus();
        stagingLoadStatus();
      });

      // Listen for index_changed events (staging area changes)
      const unlistenIndex = await events.indexChangedEvent.listen(() => {
        // Reload status when index changes
        loadStatus();
        stagingLoadStatus();
      });

      // Listen for head_changed events (commits, checkouts)
      const unlistenHead = await events.headChangedEvent.listen(() => {
        // Reload commits and status
        loadCommits();
        loadStatus();
        stagingLoadStatus();
        loadBranches();
      });

      // Listen for ref_changed events (branch/tag changes)
      const unlistenRef = await events.refChangedEvent.listen((event) => {
        const refName = event.payload.refName;
        if (refName?.startsWith('refs/tags/')) {
          loadTags();
        } else if (refName?.startsWith('refs/heads/') || refName?.startsWith('refs/remotes/')) {
          loadBranches();
          loadCommits();
          loadStatus();
          stagingLoadStatus();
        }
        // Also check for stash refs
        if (refName?.startsWith('refs/stash')) {
          loadStashes();
        }
      });

      // Listen for watch errors
      const unlistenError = await events.watchErrorEvent.listen((event) => {
        console.error('File watcher error:', event.payload.message);
      });

      unlistenRefs.current = [
        unlistenFiles,
        unlistenIndex,
        unlistenHead,
        unlistenRef,
        unlistenError,
      ];
    };

    setupListeners();

    // Cleanup on unmount or repository change
    return () => {
      unlistenRefs.current.forEach((unlisten) => unlisten());
      unlistenRefs.current = [];
      repositoryApi.stopFileWatcher().catch(console.error);
    };
  }, [repository, loadStatus, loadCommits, loadBranches, loadTags, loadStashes, stagingLoadStatus]);
}
