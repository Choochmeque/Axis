import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [WELCOME_TAB],
      activeTabId: 'welcome',

      addTab: (tabData) => {
        const id = generateId();
        const newTab: Tab = { ...tabData, id };

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
          tabs: state.tabs.map((tab) =>
            tab.id === id ? { ...tab, ...updates } : tab
          ),
        }));
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find((t) => t.id === activeTabId);
      },

      findTabByPath: (path) => {
        return get().tabs.find((t) => t.path === path);
      },
    }),
    {
      name: 'axis-tabs',
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
    }
  )
);
