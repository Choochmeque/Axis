import { X, Home } from 'lucide-react';
import { useTabsStore, type Tab } from '../../store/tabsStore';
import { cn } from '../../lib/utils';

interface TabBarProps {
  onTabChange: (tab: Tab) => void;
}

export function TabBar({ onTabChange }: TabBarProps) {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabsStore();

  // Hide tab bar when only 1 tab
  if (tabs.length <= 1) {
    return null;
  }

  const handleTabClick = (tab: Tab) => {
    if (tab.id !== activeTabId) {
      setActiveTab(tab.id);
      onTabChange(tab);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  return (
    <div className="flex items-center h-9 bg-(--bg-toolbar) border-b border-(--border-color) overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "group flex items-center gap-2 h-full px-3 border-r border-(--border-color) cursor-pointer transition-colors min-w-0",
            "hover:bg-(--bg-hover)",
            activeTabId === tab.id
              ? "bg-(--bg-primary) border-b-2 border-b-(--accent-color)"
              : "bg-(--bg-toolbar)"
          )}
          onClick={() => handleTabClick(tab)}
        >
          {tab.type === 'welcome' ? (
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
          <span className="text-[13px] text-(--text-primary) truncate max-w-40">
            {tab.name}
          </span>
          <button
            className={cn(
              "flex items-center justify-center w-4 h-4 rounded shrink-0 transition-colors",
              "text-(--text-tertiary) hover:text-(--text-primary) hover:bg-(--bg-active)",
              "opacity-0 group-hover:opacity-100",
              activeTabId === tab.id && "opacity-100"
            )}
            onClick={(e) => handleCloseTab(e, tab.id)}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
