/**
 * Graph layout calculator that extracts per-row rendering data from the Graph class.
 * Reuses the existing graph.ts algorithm for lane assignment and color computation.
 */
import type { GraphCommit } from '@/types';
import { Graph } from '@/lib/graph';
import {
  defaultGraphConfig,
  defaultMuteConfig,
  buildCommitLookup,
} from '@/components/history/CommitGraph';

// Per-row layout data for rendering
export interface RowGraphData {
  column: number; // Lane/column position (0, 1, 2, ...)
  color: number; // Color index for this commit's branch
  isCommitted: boolean; // Whether this is a committed node (vs uncommitted changes)
  isCurrent: boolean; // Whether this is the HEAD commit
  isMerge: boolean; // Whether this commit has multiple parents
  hasChildren: boolean; // Whether this commit has children (line from above)
  hasParents: boolean; // Whether this commit has parents (line going down)
  // Lines passing through this row (vertical segments that don't stop here)
  passingLanes: PassingLane[];
  // Lines coming into this row from above (for curved/diagonal connections)
  incomingLines: LineSegment[];
  // Lines going out from this row to below (for curved/diagonal connections)
  outgoingLines: LineSegment[];
}

export interface PassingLane {
  column: number;
  color: number;
  isCommitted: boolean;
  isMergePreview?: boolean;
}

export interface LineSegment {
  fromColumn: number;
  toColumn: number;
  fromRow: number;
  toRow: number;
  color: number;
  isCommitted: boolean;
  isMergePreview?: boolean;
}

// Re-export for compatibility
export interface ParentConnection {
  fromColumn: number;
  toColumn: number;
  color: number;
}

// Graph colors (reuse from graph.ts config)
export const GRAPH_COLORS = defaultGraphConfig.colours;

// Cached graph instance and data for reuse
let cachedGraph: Graph | null = null;
let cachedCommitsKey: string | null = null;
let cachedDummyElement: HTMLElement | null = null;

/**
 * Get or create the dummy element used for Graph initialization.
 */
function getDummyElement(): HTMLElement {
  if (!cachedDummyElement) {
    cachedDummyElement = document.createElement('div');
  }
  return cachedDummyElement;
}

/**
 * Create a cache key from commits to detect changes.
 */
function createCommitsKey(commits: GraphCommit[]): string {
  if (commits.length === 0) return '';
  // Use first/last commit oid and count as a quick cache key
  return `${commits.length}:${commits[0].oid}:${commits[commits.length - 1].oid}`;
}

/**
 * Compute graph layout for all commits using the existing Graph class.
 * Returns an array of RowGraphData, one per commit.
 */
export function computeGraphLayout(commits: GraphCommit[], headOid: string | null): RowGraphData[] {
  if (commits.length === 0) return [];

  // Check cache
  const commitsKey = createCommitsKey(commits);

  // Create or reuse graph with cached computation
  if (cachedGraph === null || cachedCommitsKey !== commitsKey) {
    const dummyElement = getDummyElement();
    const commitLookup = buildCommitLookup(commits);

    cachedGraph = new Graph(dummyElement, defaultGraphConfig, defaultMuteConfig);
    cachedGraph.loadCommits(commits, headOid, commitLookup, false);
    cachedCommitsKey = commitsKey;
  }

  const graph = cachedGraph;

  // Get vertex data (positions, colors) and branch lines from Graph
  const vertexData = graph.getVertexData();
  const branchLines = graph.getBranchLines();

  // Build per-row rendering data
  const result: RowGraphData[] = [];

  for (let rowIdx = 0; rowIdx < vertexData.length; rowIdx++) {
    const vertex = vertexData[rowIdx];
    const commit = commits[rowIdx];

    // Find all line segments that interact with this row
    const passingLanes: PassingLane[] = [];
    const incomingLines: LineSegment[] = [];
    const outgoingLines: LineSegment[] = [];
    const seenPassingColumns = new Set<number>();

    for (const line of branchLines) {
      const minRow = Math.min(line.fromRow, line.toRow);
      const maxRow = Math.max(line.fromRow, line.toRow);

      // Check if line interacts with this row
      if (minRow <= rowIdx && maxRow >= rowIdx) {
        // Merge preview flag comes directly from the graph layout engine
        const isMergePreview = line.isMergePreview;

        // Line starts at this row (going down)
        if (line.fromRow === rowIdx) {
          outgoingLines.push({
            fromColumn: line.fromColumn,
            toColumn: line.toColumn,
            fromRow: line.fromRow,
            toRow: line.toRow,
            color: line.color % GRAPH_COLORS.length,
            isCommitted: line.isCommitted,
            isMergePreview,
          });
        }
        // Line ends at this row (coming from above)
        else if (line.toRow === rowIdx) {
          incomingLines.push({
            fromColumn: line.fromColumn,
            toColumn: line.toColumn,
            fromRow: line.fromRow,
            toRow: line.toRow,
            color: line.color % GRAPH_COLORS.length,
            isCommitted: line.isCommitted,
            isMergePreview,
          });
        }
        // Line passes through this row (doesn't start or end here)
        else if (minRow < rowIdx && maxRow > rowIdx) {
          // For passing lines, use the column where it passes through
          // If it's a straight vertical line, use either column
          // If it's diagonal, we need to determine where it is at this row
          if (line.fromColumn === line.toColumn) {
            // Vertical line
            const col = line.fromColumn;
            if (!seenPassingColumns.has(col)) {
              seenPassingColumns.add(col);
              passingLanes.push({
                column: col,
                color: line.color % GRAPH_COLORS.length,
                isCommitted: line.isCommitted,
                isMergePreview,
              });
            }
          } else {
            // Diagonal line - it transitions at some point
            // The line goes from fromColumn at fromRow to toColumn at toRow
            // At rowIdx, it could be at either column depending on the curve
            // For simplicity, use the column at the start of this segment
            const col = line.fromRow < rowIdx ? line.toColumn : line.fromColumn;
            if (!seenPassingColumns.has(col)) {
              seenPassingColumns.add(col);
              passingLanes.push({
                column: col,
                color: line.color % GRAPH_COLORS.length,
                isCommitted: line.isCommitted,
                isMergePreview,
              });
            }
          }
        }
      }
    }

    // Remove the vertex's own column from passing lanes (it's not passing, it's the node)
    const filteredPassingLanes = passingLanes.filter((lane) => lane.column !== vertex.column);

    result.push({
      column: vertex.column,
      color: vertex.color,
      isCommitted: vertex.isCommitted,
      isCurrent: commit.oid === headOid,
      isMerge: vertex.isMerge,
      hasChildren: vertex.hasChildren,
      hasParents: vertex.hasParents,
      passingLanes: filteredPassingLanes,
      incomingLines,
      outgoingLines,
    });
  }

  return result;
}

/**
 * Get the maximum number of columns needed for the graph.
 */
export function getMaxColumns(layout: RowGraphData[]): number {
  let max = 0;
  for (const row of layout) {
    if (row.column > max) max = row.column;
    for (const lane of row.passingLanes) {
      if (lane.column > max) max = lane.column;
    }
    for (const line of row.incomingLines) {
      if (line.fromColumn > max) max = line.fromColumn;
      if (line.toColumn > max) max = line.toColumn;
    }
    for (const line of row.outgoingLines) {
      if (line.fromColumn > max) max = line.fromColumn;
      if (line.toColumn > max) max = line.toColumn;
    }
  }
  return max + 1;
}
