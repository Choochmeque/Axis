import { useEffect, useCallback } from 'react';
import { AppLayout } from './components/layout';
import { HistoryView } from './components/history';
import { WorkspaceView } from './components/workspace';
import { WelcomeView } from './components/WelcomeView';
import { ContentSearch } from './components/search/ContentSearch';
import { TabBar } from './components/layout/TabBar';
import { useRepositoryStore } from './store/repositoryStore';
import { useSettingsStore } from './store/settingsStore';
import { useTabsStore, type Tab } from './store/tabsStore';
import { useMenuActions } from './hooks';
import './index.css';

function App() {
  const { repository, currentView, openRepository, closeRepository } = useRepositoryStore();
  const { loadSettings } = useSettingsStore();
  const { tabs, getActiveTab, addTab, setActiveTab, updateTab, findTabByPath } = useTabsStore();

  // Handle menu actions from native menu
  useMenuActions();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Sync repository changes with tabs
  useEffect(() => {
    if (repository) {
      const activeTab = getActiveTab();
      if (activeTab && activeTab.type === 'repository' && activeTab.path === repository.path.toString()) {
        // Update tab with latest repository info
        updateTab(activeTab.id, { repository, name: repository.name });
      }
    }
  }, [repository, getActiveTab, updateTab]);

  // Handle opening a repository - creates or switches to tab
  const handleOpenRepository = useCallback(async (path: string) => {
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
  }, [findTabByPath, setActiveTab, openRepository, addTab]);

  // Handle tab switching
  const handleTabChange = useCallback(async (tab: Tab) => {
    if (tab.type === 'welcome') {
      await closeRepository();
    } else if (tab.path) {
      await openRepository(tab.path);
    }
  }, [closeRepository, openRepository]);

  // Expose handleOpenRepository globally for other components
  useEffect(() => {
    (window as unknown as { openRepositoryInTab: typeof handleOpenRepository }).openRepositoryInTab = handleOpenRepository;
  }, [handleOpenRepository]);

  const activeTab = getActiveTab();
  const isWelcomeTab = activeTab?.type === 'welcome' || !repository;

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
        <WelcomeView />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-(--bg-primary) text-(--text-primary)">
      <TabBar onTabChange={handleTabChange} />
      <div className="flex-1 overflow-hidden">
        <AppLayout>
          {renderView()}
        </AppLayout>
      </div>
    </div>
  );
}

export default App;
