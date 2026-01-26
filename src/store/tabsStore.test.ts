import { describe, it, expect, beforeEach } from 'vitest';
import { useTabsStore, TabType } from './tabsStore';

describe('tabsStore', () => {
  const welcomeTab = {
    id: 'welcome',
    type: TabType.Welcome,
    name: 'Welcome',
  };

  beforeEach(() => {
    useTabsStore.setState({
      tabs: [welcomeTab],
      activeTabId: 'welcome',
    });
  });

  describe('addTab', () => {
    it('should add a new tab and make it active', () => {
      const id = useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Test Repo',
        path: '/path/to/repo',
      });

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(2);
      expect(state.activeTabId).toBe(id);
      expect(state.tabs[1].name).toBe('Test Repo');
    });

    it('should return existing tab id if path already exists', () => {
      const id1 = useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo 1',
        path: '/path/to/repo',
      });

      const id2 = useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo 2',
        path: '/path/to/repo',
      });

      expect(id1).toBe(id2);
      expect(useTabsStore.getState().tabs).toHaveLength(2);
    });

    it('should normalize paths by removing trailing slash', () => {
      const id1 = useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo 1',
        path: '/path/to/repo/',
      });

      const id2 = useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo 2',
        path: '/path/to/repo',
      });

      expect(id1).toBe(id2);
    });

    it('should allow tabs without path', () => {
      const id = useTabsStore.getState().addTab({
        type: TabType.Welcome,
        name: 'Another Welcome',
      });

      expect(useTabsStore.getState().tabs).toHaveLength(2);
      expect(useTabsStore.getState().activeTabId).toBe(id);
    });
  });

  describe('removeTab', () => {
    it('should remove tab and switch to adjacent tab', () => {
      const id = useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo',
        path: '/repo',
      });
      useTabsStore.setState({ activeTabId: id });

      useTabsStore.getState().removeTab(id);

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.activeTabId).toBe('welcome');
    });

    it('should switch to next tab when removing first tab', () => {
      const id = useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo',
        path: '/repo',
      });

      // Set active to welcome (first tab)
      useTabsStore.setState({ activeTabId: 'welcome' });
      useTabsStore.getState().removeTab('welcome');

      const state = useTabsStore.getState();
      expect(state.activeTabId).toBe(id);
    });

    it('should reset to welcome tab if removing last tab', () => {
      useTabsStore.setState({
        tabs: [{ id: 'only-tab', type: TabType.Repository, name: 'Only', path: '/only' }],
        activeTabId: 'only-tab',
      });

      useTabsStore.getState().removeTab('only-tab');

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].type).toBe(TabType.Welcome);
      expect(state.activeTabId).toBe('welcome');
    });

    it('should not change active tab if removing non-active tab', () => {
      const id = useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo',
        path: '/repo',
      });

      // Keep welcome active
      useTabsStore.setState({ activeTabId: 'welcome' });

      useTabsStore.getState().removeTab(id);

      expect(useTabsStore.getState().activeTabId).toBe('welcome');
    });
  });

  describe('setActiveTab', () => {
    it('should update active tab id', () => {
      const id = useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo',
        path: '/repo',
      });

      useTabsStore.getState().setActiveTab('welcome');

      expect(useTabsStore.getState().activeTabId).toBe('welcome');

      useTabsStore.getState().setActiveTab(id);

      expect(useTabsStore.getState().activeTabId).toBe(id);
    });
  });

  describe('updateTab', () => {
    it('should update tab properties', () => {
      const id = useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Old Name',
        path: '/repo',
      });

      useTabsStore.getState().updateTab(id, { name: 'New Name' });

      const tab = useTabsStore.getState().tabs.find((t) => t.id === id);
      expect(tab?.name).toBe('New Name');
    });

    it('should not affect other tabs', () => {
      const id = useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo',
        path: '/repo',
      });

      useTabsStore.getState().updateTab(id, { name: 'Updated' });

      const welcomeTab = useTabsStore.getState().tabs.find((t) => t.id === 'welcome');
      expect(welcomeTab?.name).toBe('Welcome');
    });
  });

  describe('getActiveTab', () => {
    it('should return active tab', () => {
      const tab = useTabsStore.getState().getActiveTab();

      expect(tab?.id).toBe('welcome');
      expect(tab?.type).toBe(TabType.Welcome);
    });

    it('should return undefined if no matching tab', () => {
      useTabsStore.setState({ activeTabId: 'non-existent' });

      const tab = useTabsStore.getState().getActiveTab();

      expect(tab).toBeUndefined();
    });
  });

  describe('findTabByPath', () => {
    it('should find tab by path', () => {
      useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo',
        path: '/path/to/repo',
      });

      const tab = useTabsStore.getState().findTabByPath('/path/to/repo');

      expect(tab?.name).toBe('Repo');
    });

    it('should normalize path for lookup', () => {
      useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo',
        path: '/path/to/repo/',
      });

      const tab = useTabsStore.getState().findTabByPath('/path/to/repo');

      expect(tab?.name).toBe('Repo');
    });

    it('should return undefined if no tab with path', () => {
      const tab = useTabsStore.getState().findTabByPath('/non/existent');

      expect(tab).toBeUndefined();
    });
  });

  describe('markTabDirty', () => {
    it('should mark tab as dirty', () => {
      useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo',
        path: '/path/to/repo',
      });

      useTabsStore.getState().markTabDirty('/path/to/repo');

      const tab = useTabsStore.getState().findTabByPath('/path/to/repo');
      expect(tab?.isDirty).toBe(true);
    });

    it('should normalize path for marking', () => {
      useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo',
        path: '/path/to/repo',
      });

      useTabsStore.getState().markTabDirty('/path/to/repo/');

      const tab = useTabsStore.getState().findTabByPath('/path/to/repo');
      expect(tab?.isDirty).toBe(true);
    });
  });

  describe('clearTabDirty', () => {
    it('should clear dirty flag', () => {
      const id = useTabsStore.getState().addTab({
        type: TabType.Repository,
        name: 'Repo',
        path: '/path/to/repo',
      });

      useTabsStore.getState().updateTab(id, { isDirty: true });
      useTabsStore.getState().clearTabDirty('/path/to/repo');

      const tab = useTabsStore.getState().findTabByPath('/path/to/repo');
      expect(tab?.isDirty).toBe(false);
    });
  });
});
