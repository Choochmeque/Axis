import { useRef, useEffect, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useListSelection } from '@/hooks';
import type { SelectionKey, SelectionMode } from '@/hooks';

interface VirtualListProps<T> {
  items: T[];
  getItemKey: (item: T, index: number) => string | number;
  children: (item: T, index: number) => ReactNode;
  itemHeight?: number;
  overscan?: number;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  loadingMoreMessage?: string;
  loadMoreThreshold?: number;
  className?: string;
  itemClassName?: string | ((item: T, index: number) => string);
  selectedClassName?: string;

  // Legacy selection API (preserved for backward compatibility)
  selectedItemKey?: string | number | null;
  onItemClick?: (item: T, index: number) => void;

  // New selection API
  selectionMode?: SelectionMode;
  selectedKeys?: Set<SelectionKey>;
  onSelectionChange?: (keys: Set<SelectionKey>) => void;
}

export function VirtualList<T>({
  items,
  getItemKey,
  children,
  itemHeight = 72,
  overscan = 5,
  isLoading = false,
  loadingMessage,
  emptyMessage,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  loadingMoreMessage,
  loadMoreThreshold = 200,
  selectedItemKey,
  onItemClick,
  selectionMode,
  selectedKeys: controlledSelectedKeys,
  onSelectionChange,
  className,
  itemClassName,
  selectedClassName,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const isNewSelectionApi = onSelectionChange !== undefined || controlledSelectedKeys !== undefined;

  // Warn if both APIs are used simultaneously
  if (isNewSelectionApi && (selectedItemKey !== undefined || onItemClick !== undefined)) {
    console.warn(
      'VirtualList: both legacy (selectedItemKey/onItemClick) and new (selectedKeys/onSelectionChange) selection APIs are provided. The new API will be used.'
    );
  }

  const selection = useListSelection({
    items,
    getItemKey,
    selectionMode: isNewSelectionApi ? (selectionMode ?? 'single') : 'none',
    selectedKeys: isNewSelectionApi ? controlledSelectedKeys : undefined,
    onSelectionChange: isNewSelectionApi ? onSelectionChange : undefined,
  });

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  });

  // Infinite scroll detection
  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement || !onLoadMore || !hasMore || isLoadingMore) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      if (scrollHeight - scrollTop - clientHeight < loadMoreThreshold) {
        onLoadMore();
      }
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, onLoadMore, loadMoreThreshold]);

  // Loading state
  if (isLoading && items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-(--text-muted) text-sm">{loadingMessage}</div>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-(--text-muted) text-sm">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className={cn('h-full overflow-auto', className)}>
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize() + (isLoadingMore ? 40 : 0)}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          const key = getItemKey(item, virtualRow.index);

          const isSelected = isNewSelectionApi
            ? selection.isSelected(key)
            : selectedItemKey != null && key === selectedItemKey;

          const dynamicClassName =
            typeof itemClassName === 'function'
              ? itemClassName(item, virtualRow.index)
              : itemClassName;

          const handleClick = isNewSelectionApi
            ? (e: React.MouseEvent) => selection.handleItemClick(key, e)
            : onItemClick
              ? () => onItemClick(item, virtualRow.index)
              : undefined;

          return (
            <div
              key={key}
              className={cn(
                'virtual-list-item',
                isSelected && (selectedClassName ?? 'virtual-list-item--selected'),
                dynamicClassName
              )}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onClick={handleClick}
            >
              {children(item, virtualRow.index)}
            </div>
          );
        })}

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div
            className="absolute left-0 w-full flex items-center justify-center py-3"
            style={{ top: `${virtualizer.getTotalSize()}px` }}
          >
            <Loader2 size={16} className="animate-spin text-(--text-muted)" />
            {loadingMoreMessage && (
              <span className="ml-2 text-sm text-(--text-muted)">{loadingMoreMessage}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
