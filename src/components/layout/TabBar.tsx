import * as Tabs from '@radix-ui/react-tabs';
import { X, Home } from 'lucide-react';
import { TabType, useTabsStore, type Tab } from '@/store/tabsStore';
import { cn } from '@/lib/utils';

interface TabBarProps {
  onTabChange: (tab: Tab) => void;
}

export function TabBar({ onTabChange }: TabBarProps) {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabsStore();

  // Hide tab bar when only 1 tab
  if (tabs.length <= 1) {
    return null;
  }

  const handleTabChange = (tabId: string) => {
    if (tabId !== activeTabId) {
      setActiveTab(tabId);
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) {
        onTabChange(tab);
      }
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  return (
    <Tabs.Root value={activeTabId} onValueChange={handleTabChange}>
      <Tabs.List className="flex items-center h-9 bg-(--bg-toolbar) border-b border-(--border-color) overflow-x-auto">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            asChild
            className={cn(
              'group flex items-center gap-2 h-full px-3 border-r border-(--border-color) cursor-pointer transition-colors min-w-0',
              'hover:bg-(--bg-hover)',
              'data-[state=active]:bg-(--bg-primary) data-[state=active]:border-b-2 data-[state=active]:border-b-(--accent-color)',
              'data-[state=inactive]:bg-(--bg-toolbar)'
            )}
          >
            <div>
              {tab.type === TabType.Welcome ? (
                <Home size={14} className="shrink-0 text-(--text-secondary)" />
              ) : (
                <svg width={14} height={14} className="shrink-0">
                  <circle
                    cx={7}
                    cy={7}
                    r={5}
                    fill="var(--bg-toolbar)"
                    stroke="var(--accent-color)"
                    strokeWidth={2}
                  />
                </svg>
              )}
              <span className="text-base text-(--text-primary) truncate max-w-40">{tab.name}</span>
              {tab.type !== TabType.Welcome && (
                <button
                  className={cn(
                    'flex items-center justify-center w-4 h-4 rounded shrink-0 transition-colors',
                    'text-(--text-tertiary) hover:text-(--text-primary) hover:bg-(--bg-active)',
                    'opacity-0 group-hover:opacity-100',
                    'group-data-[state=active]:opacity-100'
                  )}
                  onClick={(e) => handleCloseTab(e, tab.id)}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
