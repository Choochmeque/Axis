import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Repository } from '../types';

export interface Tab {
  id: string;
  type: 'welcome' | 'repository';
  path?: string;
  name: string;
  repository?: Repository;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string;

  // Actions
  addTab: (tab: Omit<Tab, 'id'>) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  getActiveTab: () => Tab | undefined;
  findTabByPath: (path: string) => Tab | undefined;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const WELCOME_TAB: Tab = {
  id: 'welcome',
  type: 'welcome',
  name: 'Welcome',
};

// Check if this is a repo window (opened via "Open in New Window")
// These windows should NOT share state with main window
const isRepoWindow = () => {
  const params = new URLSearchParams(window.location.search);
  return params.has('repo');
};

// Core store logic (shared between persisted and non-persisted versions)
const createTabsSlice: StateCreator<TabsState> = (set, get) => ({
  tabs: [WELCOME_TAB],
  activeTabId: 'welcome',

  addTab: (tabData) => {
    // Normalize path (remove trailing slash)
    const normalizedPath = tabData.path?.replace(/\/$/, '');

    // Check for duplicate tab with same path
    if (normalizedPath) {
      const existing = get().tabs.find((t) => t.path?.replace(/\/$/, '') === normalizedPath);
      if (existing) {
        set({ activeTabId: existing.id });
        return existing.id;
      }
    }

    const id = generateId();
    const newTab: Tab = { ...tabData, id, path: normalizedPath };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    }));

    return id;
  },

  removeTab: (id) => {
    const { tabs, activeTabId } = get();

    // Can't remove the last tab - switch to welcome
    if (tabs.length === 1) {
      set({ tabs: [WELCOME_TAB], activeTabId: 'welcome' });
      return;
    }

    // If removing active tab, switch to adjacent tab
    const tabIndex = tabs.findIndex((t) => t.id === id);
    let newActiveId = activeTabId;

    if (activeTabId === id) {
      // Switch to previous tab, or next if at start
      const newIndex = tabIndex > 0 ? tabIndex - 1 : tabIndex + 1;
      newActiveId = tabs[newIndex]?.id ?? 'welcome';
    }

    const newTabs = tabs.filter((t) => t.id !== id);

    // If no tabs left, add welcome tab
    if (newTabs.length === 0) {
      set({ tabs: [WELCOME_TAB], activeTabId: 'welcome' });
    } else {
      set({ tabs: newTabs, activeTabId: newActiveId });
    }
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },

  updateTab: (id, updates) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, ...updates } : tab)),
    }));
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId);
  },

  findTabByPath: (path) => {
    // Normalize path for comparison (remove trailing slash)
    const normalizedPath = path.replace(/\/$/, '');
    return get().tabs.find((t) => t.path?.replace(/\/$/, '') === normalizedPath);
  },
});

// Create store: use localStorage persistence only for main window
// Repo windows get independent, non-persisted state
export const useTabsStore = isRepoWindow()
  ? create<TabsState>()(createTabsSlice)
  : create<TabsState>()(
      persist(createTabsSlice, {
        name: 'axis-tabs',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist tab structure, not full repository data
          tabs: state.tabs.map((t) => ({
            id: t.id,
            type: t.type,
            path: t.path,
            name: t.name,
          })),
          activeTabId: state.activeTabId,
        }),
        onRehydrateStorage: () => (state, error) => {
          if (!error && state) {
            let tabs = state.tabs || [];
            let activeTabId = state.activeTabId;

            // Ensure welcome tab exists
            const hasWelcome = tabs.some((t) => t.type === 'welcome');
            if (!hasWelcome) {
              tabs = [WELCOME_TAB, ...tabs];
            }

            // If no tabs at all, just welcome
            if (tabs.length === 0) {
              tabs = [WELCOME_TAB];
              activeTabId = 'welcome';
            }

            // If active tab doesn't exist, switch to welcome
            const activeExists = tabs.some((t) => t.id === activeTabId);
            if (!activeExists) {
              activeTabId = 'welcome';
            }

            useTabsStore.setState({ tabs, activeTabId });
          }
        },
      })
    );
