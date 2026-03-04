import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import * as Tabs from '@radix-ui/react-tabs';
import { Home, X } from 'lucide-react';
import { useState } from 'react';

import { commands } from '@/bindings/api';
import { cn } from '@/lib/utils';
import { useIntegrationStore } from '@/store/integrationStore';
import { useRepositoryStore } from '@/store/repositoryStore';
import { useStagingStore } from '@/store/stagingStore';
import { type Tab, TabType, useTabsStore } from '@/store/tabsStore';

import { DraggableTab } from './DraggableTab';

interface TabBarProps {
  onTabChange: (tab: Tab) => void;
}

export function TabBar({ onTabChange }: TabBarProps) {
  const { tabs, activeTabId, setActiveTab, removeTab, reorderTabs } = useTabsStore();
  const [draggedTab, setDraggedTab] = useState<Tab | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.path) {
      // Clear frontend caches
      useRepositoryStore.getState().clearCache(tab.path);
      useIntegrationStore.getState().clearCache(tab.path);
      useStagingStore.getState().clearCache(tab.path);
      // Close backend (frees GitService and CommitCache)
      commands.closeRepositoryPath(tab.path);
    }
    removeTab(tabId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const tab = tabs.find((t) => t.id === active.id);
    if (tab) {
      setDraggedTab(tab);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTab(null);

    if (over && active.id !== over.id) {
      reorderTabs(String(active.id), String(over.id));
    }
  };

  const handleDragCancel = () => {
    setDraggedTab(null);
  };

  const welcomeTab = tabs.find((t) => t.type === TabType.Welcome);
  const repoTabs = tabs.filter((t) => t.type === TabType.Repository);
  const sortableIds = repoTabs.map((t) => t.id);

  return (
    <Tabs.Root value={activeTabId} onValueChange={handleTabChange}>
      <Tabs.List className="flex items-center h-9 bg-(--bg-toolbar) border-b border-(--border-color) overflow-x-auto">
        {/* Welcome tab - not draggable */}
        {welcomeTab && (
          <Tabs.Trigger
            value={welcomeTab.id}
            asChild
            className={cn(
              'group flex items-center gap-2 h-full px-3 border-r border-(--border-color) cursor-pointer transition-colors min-w-0',
              'hover:bg-(--bg-hover)',
              'data-[state=active]:bg-(--bg-primary) data-[state=active]:border-b-2 data-[state=active]:border-b-(--accent-color)',
              'data-[state=inactive]:bg-(--bg-toolbar)'
            )}
          >
            <div>
              <Home size={14} className="shrink-0 text-(--text-secondary)" />
              <span className="text-base text-(--text-primary) truncate max-w-40">
                {welcomeTab.name}
              </span>
            </div>
          </Tabs.Trigger>
        )}

        {/* Draggable repository tabs */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
            {repoTabs.map((tab) => (
              <DraggableTab key={tab.id} tab={tab} onClose={handleCloseTab} />
            ))}
          </SortableContext>

          <DragOverlay>
            {draggedTab && (
              <div className="tab-drag-overlay flex items-center gap-2 h-9 px-3">
                <div className="relative shrink-0">
                  <svg width={14} height={14}>
                    <circle
                      cx={7}
                      cy={7}
                      r={5}
                      fill="var(--bg-toolbar)"
                      stroke="var(--accent-color)"
                      strokeWidth={2}
                    />
                  </svg>
                  {draggedTab.isDirty && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
                <span className="text-base text-(--text-primary) truncate max-w-40">
                  {draggedTab.name}
                </span>
                <X size={12} className="text-(--text-tertiary)" />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </Tabs.List>
    </Tabs.Root>
  );
}
