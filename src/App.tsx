import { useEffect, useCallback } from 'react';
import { AppLayout } from './components/layout';
import { HistoryView } from './components/history';
import { WorkspaceView } from './components/workspace';
import { WelcomeView } from './components/WelcomeView';
import { ContentSearch } from './components/search/ContentSearch';
import { TabBar } from './components/layout/TabBar';
import { useRepositoryStore } from './store/repositoryStore';
import { useSettingsStore } from './store/settingsStore';
import { useStagingStore } from './store/stagingStore';
import { useTabsStore, type Tab } from './store/tabsStore';
import { useMenuActions } from './hooks';
import './index.css';

function App() {
  const { repository, currentView, openRepository, closeRepository } = useRepositoryStore();
  const { loadSettings } = useSettingsStore();
  const { tabs, activeTabId, addTab, setActiveTab, updateTab, findTabByPath } = useTabsStore();

  // Handle menu actions from native menu
  useMenuActions();

  // Ensure welcome tab exists on mount (fix stale localStorage)
  useEffect(() => {
    const hasWelcome = tabs.some((t) => t.type === 'welcome');
    if (!hasWelcome) {
      useTabsStore.setState({
        tabs: [{ id: 'welcome', type: 'welcome', name: 'Welcome' }, ...tabs],
        activeTabId: 'welcome',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Load repository for active tab on startup (after rehydration from localStorage)
  useEffect(() => {
    // Skip if there's a ?repo= param (handled by the next effect)
    const params = new URLSearchParams(window.location.search);
    if (params.has('repo')) return;

    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (activeTab?.type === 'repository' && activeTab.path && !repository) {
      openRepository(activeTab.path)
        .then(() => useStagingStore.getState().loadStatus())
        .catch(console.error);
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
                type: 'repository',
                path: repo.path.toString(),
                name: repo.name,
                repository: repo,
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

  // Sync repository changes with tabs (only when repository actually changes)
  useEffect(() => {
    if (
      repository &&
      activeTab &&
      activeTab.type === 'repository' &&
      activeTab.path === repository.path.toString()
    ) {
      // Only update if repository data differs
      if (
        activeTab.repository?.currentBranch !== repository.currentBranch ||
        activeTab.name !== repository.name
      ) {
        updateTab(activeTab.id, { repository, name: repository.name });
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
          type: 'repository',
          path: repo.path.toString(),
          name: repo.name,
          repository: repo,
        });
      }
    },
    [findTabByPath, setActiveTab, openRepository, addTab]
  );

  // Handle tab switching
  const handleTabChange = useCallback(
    async (tab: Tab) => {
      // Reset staging store to clear stale data from previous repo
      useStagingStore.getState().reset();

      if (tab.type === 'welcome') {
        await closeRepository();
      } else if (tab.path) {
        await openRepository(tab.path);
        // Reload staging status for the new repository
        await useStagingStore.getState().loadStatus();
      }
    },
    [closeRepository, openRepository]
  );

  // Expose handleOpenRepository globally for other components
  useEffect(() => {
    (
      window as unknown as { openRepositoryInTab: typeof handleOpenRepository }
    ).openRepositoryInTab = handleOpenRepository;
  }, [handleOpenRepository]);

  const isWelcomeTab = activeTab?.type === 'welcome';

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
