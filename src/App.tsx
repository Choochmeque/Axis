import { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ExternalLink } from 'lucide-react';

import { AppLayout } from './components/layout';
import { HistoryView } from './components/history';
import { WorkspaceView } from './components/workspace';
import { WelcomeView } from './components/WelcomeView';
import { ContentSearch } from './components/search/ContentSearch';
import { ReflogView } from './components/reflog';
import { LfsView } from './components/lfs';
import { GitFlowView } from './components/gitflow';
import { PullRequestsView, IssuesView, CIView, NotificationsView } from './components/integrations';
import { ConflictResolver } from './components/merge';
import { TabBar } from './components/layout/TabBar';
import { UpdateBanner } from './components/update';
import { useMenuActions, useCustomActionShortcuts, toast } from './hooks';
import { getErrorMessage } from './lib/errorUtils';
import { notifyNewCommits } from './lib/actions';
import { normalizePath } from './lib/utils';
import { useRepositoryStore } from './store/repositoryStore';
import { useSettingsStore } from './store/settingsStore';
import { useStagingStore } from './store/stagingStore';
import { useIntegrationStore } from './store/integrationStore';
import { useCustomActionsStore } from './store/customActionsStore';
import { useUpdateStore } from './store/updateStore';
import { TabType, useTabsStore, type Tab } from './store/tabsStore';
import { events } from '@/bindings/api';
import { lfsApi } from './services/api';
import './index.css';

function App() {
  const { t } = useTranslation();
  const [gitInstalled, setGitInstalled] = useState<boolean | null>(null);

  const { repository, currentView, openRepository, switchRepository, closeRepository } =
    useRepositoryStore();
  const { loadSettings } = useSettingsStore();
  const { loadAllActions } = useCustomActionsStore();
  const {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    setActiveTab,
    updateTab,
    findTabByPath,
    markTabDirty,
    clearTabDirty,
  } = useTabsStore();
  // Handle menu actions from native menu
  useMenuActions();

  // Handle custom action keyboard shortcuts
  useCustomActionShortcuts();

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
    loadSettings().then(() => {
      // Check for updates on startup (if enabled)
      const settings = useSettingsStore.getState().settings;
      if (settings?.autoUpdateEnabled) {
        useUpdateStore.getState().checkForUpdate();
      }
    });
    loadAllActions();
  }, [loadSettings, loadAllActions]);

  // Check if git CLI is installed
  useEffect(() => {
    lfsApi.getGitEnvironment().then((env) => {
      setGitInstalled(env.gitVersion !== null);
    });
  }, []);

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
      const currentPath = useRepositoryStore.getState().repository?.path.toString();
      if (currentPath && normalizePath(currentPath) === normalizePath(path)) {
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
        .catch((err) => {
          console.error(
            `Failed to restore tab for repository at ${activeTab.path}: ${getErrorMessage(err)}`
          );
          toast.error(getErrorMessage(err));
          // Remove the invalid tab so the app falls back to welcome
          removeTab(activeTab.id);
        });
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
      activeTab.path &&
      normalizePath(activeTab.path) === normalizePath(repository.path.toString())
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

      // Save current repo's UI state to cache before switching
      const currentRepoPath = useRepositoryStore.getState().repository?.path.toString();
      if (currentRepoPath) {
        useRepositoryStore.getState().saveToCache(currentRepoPath);
        useIntegrationStore.getState().saveToCache(currentRepoPath);
        useStagingStore.getState().saveToCache(currentRepoPath);
      }

      // Try to restore cached state for target repo (instant UI)
      const hadRepoCache = useRepositoryStore.getState().restoreFromCache(tab.path);
      const hadIntegrationCache = useIntegrationStore.getState().restoreFromCache(tab.path);
      useStagingStore.getState().restoreFromCache(tab.path);

      // Switch repository (uses backend cache for fast switching)
      try {
        try {
          await switchRepository(tab.path);
        } catch {
          // Fallback to openRepository if switchRepository fails
          await openRepository(tab.path);
        }
      } catch (err) {
        // Both switchRepository and openRepository failed — remove invalid tab
        console.error(`Failed to open repository at ${tab.path}: ${getErrorMessage(err)}`);
        toast.error(getErrorMessage(err));
        removeTab(tab.id);
        return;
      }

      // Soft refresh in background - if no cache, force reload
      useRepositoryStore.getState().refresh(!hadRepoCache);
      useStagingStore.getState().loadStatus();
      useIntegrationStore.getState().refresh(!hadIntegrationCache);

      if (tab.isDirty) {
        clearTabDirty(tab.path);
      }
    },
    [closeRepository, switchRepository, openRepository, removeTab, clearTabDirty]
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
        return <WorkspaceView key="workspace" />;
      case 'history':
        return <HistoryView key="history" />;
      case 'search':
        return <ContentSearch key="search" />;
      case 'reflog':
        return <ReflogView key="reflog" />;
      case 'lfs':
        return <LfsView key="lfs" />;
      case 'gitflow':
        return <GitFlowView key="gitflow" />;
      case 'pull-requests':
        return <PullRequestsView key="pull-requests" />;
      case 'issues':
        return <IssuesView key="issues" />;
      case 'ci':
        return <CIView key="ci" />;
      case 'notifications':
        return <NotificationsView key="notifications" />;
      case 'conflicts':
        return (
          <ConflictResolver
            key="conflicts"
            onAllResolved={() => {
              useRepositoryStore.getState().setCurrentView('file-status');
              useStagingStore.getState().loadStatus();
            }}
          />
        );
      default:
        return <WorkspaceView key="workspace" />;
    }
  };

  // Git CLI not installed - show error
  if (gitInstalled === false) {
    return (
      <div className="flex flex-col h-screen bg-(--bg-primary) text-(--text-primary) items-center justify-center">
        <div className="text-center max-w-md p-6">
          <AlertCircle size={64} className="mx-auto mb-4 text-error" />
          <h1 className="text-2xl font-semibold mb-2">{t('errors.gitNotInstalled.title')}</h1>
          <p className="text-(--text-secondary) mb-6">{t('errors.gitNotInstalled.message')}</p>
          <a
            href="https://git-scm.com/downloads"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-(--accent-color) text-white rounded hover:opacity-90 transition-opacity"
          >
            <ExternalLink size={16} />
            {t('errors.gitNotInstalled.downloadLink')}
          </a>
        </div>
      </div>
    );
  }

  // Welcome view without AppLayout when it's the only tab
  if (isWelcomeTab && tabs.length <= 1) {
    return (
      <>
        <UpdateBanner />
        <WelcomeView />
      </>
    );
  }

  // Welcome tab content within AppLayout (when multiple tabs)
  if (isWelcomeTab) {
    return (
      <div className="flex flex-col h-screen bg-(--bg-primary) text-(--text-primary)">
        <UpdateBanner />
        <TabBar onTabChange={handleTabChange} />
        <div className="flex-1 overflow-hidden">
          <WelcomeView />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-(--bg-primary) text-(--text-primary)">
      <UpdateBanner />
      <TabBar onTabChange={handleTabChange} />
      <div className="flex-1 overflow-hidden">
        <AppLayout>{renderView()}</AppLayout>
      </div>
    </div>
  );
}

export default App;
