import { useEffect, useCallback } from 'react';

import { AppLayout } from './components/layout';
import { HistoryView } from './components/history';
import { WorkspaceView } from './components/workspace';
import { WelcomeView } from './components/WelcomeView';
import { ContentSearch } from './components/search/ContentSearch';
import { TabBar } from './components/layout/TabBar';
import { useMenuActions, toast } from './hooks';
import { getErrorMessage } from './lib/errorUtils';
import { notifyNewCommits } from './lib/actions';
import { useRepositoryStore } from './store/repositoryStore';
import { useSettingsStore } from './store/settingsStore';
import { useStagingStore } from './store/stagingStore';
import { TabType, useTabsStore, type Tab } from './store/tabsStore';
import { events } from '@/bindings/api';
import './index.css';

function App() {
  const { repository, currentView, openRepository, switchRepository, closeRepository } =
    useRepositoryStore();
  const { loadSettings } = useSettingsStore();
  const {
    tabs,
    activeTabId,
    addTab,
    setActiveTab,
    updateTab,
    findTabByPath,
    markTabDirty,
    clearTabDirty,
  } = useTabsStore();
  // Handle menu actions from native menu
  useMenuActions();

  // Ensure welcome tab exists on mount (fix stale localStorage)
  useEffect(() => {
    const hasWelcome = tabs.some((t) => t.type === TabType.Welcome);
    if (!hasWelcome) {
      useTabsStore.setState({
        tabs: [{ id: 'welcome', type: TabType.Welcome, name: 'Welcome' }, ...tabs],
        activeTabId: 'welcome',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Listen for RepositoryDirtyEvent (inactive repos have changes)
  useEffect(() => {
    const unlisten = events.repositoryDirtyEvent.listen((event) => {
      markTabDirty(event.payload.path);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [markTabDirty]);

  // Listen for RemoteFetchedEvent (background fetch found new commits)
  useEffect(() => {
    const unlisten = events.remoteFetchedEvent.listen(async (event) => {
      const { path } = event.payload;

      // Mark tab as having remote changes
      markTabDirty(path);

      // If this is the active repo, reload branches and notify
      if (useRepositoryStore.getState().repository?.path.toString() === path) {
        await useRepositoryStore.getState().loadBranches();
        notifyNewCommits(useRepositoryStore.getState().branches);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [markTabDirty]);

  // Load repository for active tab on startup (after rehydration from localStorage)
  useEffect(() => {
    // Skip if there's a ?repo= param (handled by the next effect)
    const params = new URLSearchParams(window.location.search);
    if (params.has('repo')) return;

    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (activeTab?.type === TabType.Repository && activeTab.path && !repository) {
      openRepository(activeTab.path)
        .then(() => useStagingStore.getState().loadStatus())
        .catch((err) => toast.error(getErrorMessage(err)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle ?repo= query param for new windows (run once on mount)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const repoPath = params.get('repo');
    if (repoPath) {
      const decoded = decodeURIComponent(repoPath);
      openRepository(decoded).then(() => {
        const repo = useRepositoryStore.getState().repository;
        if (repo) {
          // Set only the repo tab (no welcome tab)
          useTabsStore.setState({
            tabs: [
              {
                id: 'repo-main',
                type: TabType.Repository,
                path: repo.path.toString(),
                name: repo.name,
              },
            ],
            activeTabId: 'repo-main',
          });
        }
        // Clear the query param from URL
        window.history.replaceState({}, '', window.location.pathname);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive active tab from tabs and activeTabId
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Sync repository name changes with tabs
  useEffect(() => {
    if (
      repository &&
      activeTab &&
      activeTab.type === TabType.Repository &&
      activeTab.path === repository.path.toString()
    ) {
      // Only update if name differs
      if (activeTab.name !== repository.name) {
        updateTab(activeTab.id, { name: repository.name });
      }
    }
  }, [repository, activeTab, updateTab]);

  // Handle opening a repository - creates or switches to tab
  const handleOpenRepository = useCallback(
    async (path: string) => {
      // Check if tab already exists for this repo
      const existingTab = findTabByPath(path);
      if (existingTab) {
        setActiveTab(existingTab.id);
        await openRepository(path);
        return;
      }

      // Open repository first
      await openRepository(path);

      // Create new tab
      const repo = useRepositoryStore.getState().repository;
      if (repo) {
        addTab({
          type: TabType.Repository,
          path: repo.path.toString(),
          name: repo.name,
        });
      }
    },
    [findTabByPath, setActiveTab, openRepository, addTab]
  );

  // Handle tab switching
  const handleTabChange = useCallback(
    async (tab: Tab) => {
      if (tab.type === TabType.Welcome) {
        await closeRepository();
        return;
      }

      if (!tab.path) return;

      // Switch repository (uses backend cache for fast switching)
      try {
        useStagingStore.getState().reset();
        await switchRepository(tab.path);
        await useStagingStore.getState().loadStatus();
      } catch {
        // Fallback to openRepository if switchRepository fails
        await openRepository(tab.path);
        await useStagingStore.getState().loadStatus();
      }

      if (tab.isDirty) {
        clearTabDirty(tab.path);
      }
    },
    [closeRepository, switchRepository, openRepository, clearTabDirty]
  );

  // Expose handleOpenRepository globally for other components
  useEffect(() => {
    (
      window as unknown as { openRepositoryInTab: typeof handleOpenRepository }
    ).openRepositoryInTab = handleOpenRepository;
  }, [handleOpenRepository]);

  const isWelcomeTab = activeTab?.type === TabType.Welcome;

  const renderView = () => {
    switch (currentView) {
      case 'file-status':
        return <WorkspaceView />;
      case 'history':
        return <HistoryView />;
      case 'search':
        return <ContentSearch />;
      default:
        return <WorkspaceView />;
    }
  };

  // Welcome view without AppLayout when it's the only tab
  if (isWelcomeTab && tabs.length <= 1) {
    return <WelcomeView />;
  }

  // Welcome tab content within AppLayout (when multiple tabs)
  if (isWelcomeTab) {
    return (
      <div className="flex flex-col h-screen bg-(--bg-primary) text-(--text-primary)">
        <TabBar onTabChange={handleTabChange} />
        <div className="flex-1 overflow-hidden">
          <WelcomeView />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-(--bg-primary) text-(--text-primary)">
      <TabBar onTabChange={handleTabChange} />
      <div className="flex-1 overflow-hidden">
        <AppLayout>{renderView()}</AppLayout>
      </div>
    </div>
  );
}

export default App;
