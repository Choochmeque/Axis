import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as Tabs from '@radix-ui/react-tabs';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { type Tab } from '@/store/tabsStore';

interface DraggableTabProps {
  tab: Tab;
  onClose: (e: React.MouseEvent, tabId: string) => void;
}

export function DraggableTab({ tab, onClose }: DraggableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Tabs.Trigger
      ref={setNodeRef}
      style={style}
      value={tab.id}
      asChild
      className={cn(
        'group flex items-center gap-2 h-full px-3 border-r border-(--border-color) cursor-grab transition-colors min-w-0',
        'hover:bg-(--bg-hover)',
        'data-[state=active]:bg-(--bg-primary) data-[state=active]:border-b-2 data-[state=active]:border-b-(--accent-color)',
        'data-[state=inactive]:bg-(--bg-toolbar)',
        isDragging && 'tab-dragging'
      )}
    >
      <div {...attributes} {...listeners} title={tab.name}>
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
          {tab.isDirty && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </div>
        <span className="text-base text-(--text-primary) truncate max-w-40">{tab.name}</span>
        <button
          className={cn(
            'flex items-center justify-center w-4 h-4 rounded shrink-0 transition-colors',
            'text-(--text-tertiary) hover:text-(--text-primary) hover:bg-(--bg-active)',
            'opacity-0 group-hover:opacity-100',
            'group-data-[state=active]:opacity-100'
          )}
          onClick={(e) => onClose(e, tab.id)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <X size={12} />
        </button>
      </div>
    </Tabs.Trigger>
  );
}
