import { useRef, useMemo } from 'react';
import { Stage, Layer, Circle, Line } from 'react-konva';
import type { GraphCommit, EdgeType } from '../../types';

interface CommitGraphProps {
  commits: GraphCommit[];
  maxLane: number;
  rowHeight: number;
  selectedOid?: string;
  onCommitClick?: (oid: string) => void;
  visibleStartIndex: number;
  visibleEndIndex: number;
}

// Graph styling constants
const LANE_WIDTH = 16;
const NODE_RADIUS = 4;
const GRAPH_PADDING = 8;

// Lane colors (cycling through for different lanes)
const LANE_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

function getLaneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length];
}

function getLaneX(lane: number): number {
  return GRAPH_PADDING + lane * LANE_WIDTH + LANE_WIDTH / 2;
}

export function CommitGraph({
  commits,
  maxLane,
  rowHeight,
  selectedOid,
  onCommitClick,
  visibleStartIndex,
  visibleEndIndex,
}: CommitGraphProps) {
  const stageRef = useRef<any>(null);

  // Calculate graph width based on max lane
  const graphWidth = useMemo(() => {
    return GRAPH_PADDING * 2 + (maxLane + 1) * LANE_WIDTH;
  }, [maxLane]);

  // Create a map of commit OID to index for quick lookup
  const commitIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    commits.forEach((commit, index) => {
      map.set(commit.oid, index);
    });
    return map;
  }, [commits]);

  // Only render visible commits plus some buffer
  const bufferSize = 5;
  const startIndex = Math.max(0, visibleStartIndex - bufferSize);
  const endIndex = Math.min(commits.length, visibleEndIndex + bufferSize);
  const visibleCommits = commits.slice(startIndex, endIndex);

  // Build edges for visible commits
  const edges = useMemo(() => {
    const result: Array<{
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      color: string;
      type: EdgeType;
    }> = [];

    visibleCommits.forEach((commit, localIndex) => {
      const globalIndex = startIndex + localIndex;
      const fromY = globalIndex * rowHeight + rowHeight / 2;
      const fromX = getLaneX(commit.lane);

      commit.parent_edges.forEach((edge) => {
        const parentIndex = commitIndexMap.get(edge.parent_oid);
        if (parentIndex !== undefined) {
          const toY = parentIndex * rowHeight + rowHeight / 2;
          const toX = getLaneX(edge.parent_lane);

          // Only render if at least one end is visible
          const minVisibleY = (visibleStartIndex - bufferSize) * rowHeight;
          const maxVisibleY = (visibleEndIndex + bufferSize) * rowHeight;

          if (
            (fromY >= minVisibleY && fromY <= maxVisibleY) ||
            (toY >= minVisibleY && toY <= maxVisibleY)
          ) {
            result.push({
              fromX,
              fromY,
              toX,
              toY,
              color: getLaneColor(commit.lane),
              type: edge.edge_type,
            });
          }
        }
      });
    });

    return result;
  }, [visibleCommits, startIndex, rowHeight, commitIndexMap, visibleStartIndex, visibleEndIndex]);

  // Calculate total height
  const totalHeight = commits.length * rowHeight;

  return (
    <Stage
      ref={stageRef}
      width={graphWidth}
      height={totalHeight}
      style={{ position: 'absolute', left: 0, top: 0 }}
    >
      <Layer>
        {/* Render edges first (behind nodes) */}
        {edges.map((edge, index) => {
          if (edge.type === 'straight') {
            // Straight line
            return (
              <Line
                key={`edge-${index}`}
                points={[edge.fromX, edge.fromY, edge.toX, edge.toY]}
                stroke={edge.color}
                strokeWidth={2}
                lineCap="round"
              />
            );
          } else {
            // Curved line for branch/merge
            const midY = (edge.fromY + edge.toY) / 2;
            return (
              <Line
                key={`edge-${index}`}
                points={[
                  edge.fromX,
                  edge.fromY,
                  edge.fromX,
                  midY,
                  edge.toX,
                  midY,
                  edge.toX,
                  edge.toY,
                ]}
                stroke={edge.color}
                strokeWidth={2}
                lineCap="round"
                tension={0.4}
                bezier
              />
            );
          }
        })}

        {/* Render commit nodes */}
        {visibleCommits.map((commit, localIndex) => {
          const globalIndex = startIndex + localIndex;
          const x = getLaneX(commit.lane);
          const y = globalIndex * rowHeight + rowHeight / 2;
          const isSelected = commit.oid === selectedOid;
          const color = getLaneColor(commit.lane);

          return (
            <Circle
              key={commit.oid}
              x={x}
              y={y}
              radius={isSelected ? NODE_RADIUS + 2 : NODE_RADIUS}
              fill={isSelected ? '#ffffff' : color}
              stroke={color}
              strokeWidth={isSelected ? 3 : 2}
              onClick={() => onCommitClick?.(commit.oid)}
              onTap={() => onCommitClick?.(commit.oid)}
              style={{ cursor: 'pointer' }}
            />
          );
        })}
      </Layer>
    </Stage>
  );
}

// Export constants for use in parent components
export { LANE_WIDTH, GRAPH_PADDING };
