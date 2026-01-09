import { useRef, useCallback, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CommitGraph, LANE_WIDTH, GRAPH_PADDING } from './CommitGraph';
import { CommitRow } from './CommitRow';
import type { GraphCommit } from '../../types';
import './CommitList.css';

interface CommitListProps {
  commits: GraphCommit[];
  maxLane: number;
  selectedOid?: string;
  onCommitSelect?: (commit: GraphCommit) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const ROW_HEIGHT = 32;

export function CommitList({
  commits,
  maxLane,
  selectedOid,
  onCommitSelect,
  onLoadMore,
  hasMore,
  isLoading,
}: CommitListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  // Calculate graph width
  const graphWidth = GRAPH_PADDING * 2 + (maxLane + 1) * LANE_WIDTH;

  // Set up virtualizer
  const virtualizer = useVirtualizer({
    count: commits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const items = virtualizer.getVirtualItems();

  // Update visible range when items change
  useEffect(() => {
    if (items.length > 0) {
      setVisibleRange({
        start: items[0].index,
        end: items[items.length - 1].index,
      });
    }
  }, [items]);

  // Load more when scrolling near the bottom
  useEffect(() => {
    if (!hasMore || isLoading || !onLoadMore) return;

    const lastItem = items[items.length - 1];
    if (lastItem && lastItem.index >= commits.length - 10) {
      onLoadMore();
    }
  }, [items, commits.length, hasMore, isLoading, onLoadMore]);

  const handleCommitClick = useCallback(
    (oid: string) => {
      const commit = commits.find((c) => c.oid === oid);
      if (commit && onCommitSelect) {
        onCommitSelect(commit);
      }
    },
    [commits, onCommitSelect]
  );

  return (
    <div className="commit-list-container" ref={parentRef}>
      <div
        className="commit-list-content"
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
        }}
      >
        {/* Graph canvas - positioned absolutely */}
        <CommitGraph
          commits={commits}
          maxLane={maxLane}
          rowHeight={ROW_HEIGHT}
          selectedOid={selectedOid}
          onCommitClick={handleCommitClick}
          visibleStartIndex={visibleRange.start}
          visibleEndIndex={visibleRange.end}
        />

        {/* Virtualized commit rows */}
        {items.map((virtualItem) => {
          const commit = commits[virtualItem.index];
          return (
            <div
              key={commit.oid}
              className="commit-row-wrapper"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: ROW_HEIGHT,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <CommitRow
                commit={commit}
                graphWidth={graphWidth}
                isSelected={commit.oid === selectedOid}
                onClick={() => handleCommitClick(commit.oid)}
              />
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div
            className="commit-list-loading"
            style={{
              position: 'absolute',
              top: virtualizer.getTotalSize(),
              left: 0,
              right: 0,
            }}
          >
            Loading more commits...
          </div>
        )}
      </div>
    </div>
  );
}
