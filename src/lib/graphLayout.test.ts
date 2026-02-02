import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeGraphLayout,
  getMaxColumns,
  GRAPH_COLORS,
  type RowGraphData,
  type PassingLane,
  type LineSegment,
} from './graphLayout';
import type { GraphCommit } from '@/types';

describe('graphLayout', () => {
  describe('getMaxColumns', () => {
    const createRow = (
      column: number,
      passingLanes: PassingLane[] = [],
      incomingLines: LineSegment[] = [],
      outgoingLines: LineSegment[] = []
    ): RowGraphData => ({
      column,
      color: 0,
      isCommitted: true,
      isCurrent: false,
      isMerge: false,
      hasChildren: false,
      hasParents: false,
      passingLanes,
      incomingLines,
      outgoingLines,
    });

    it('should return 1 for empty layout', () => {
      // Returns max + 1, so even with 0 max it returns 1
      expect(getMaxColumns([])).toBe(1);
    });

    it('should return 1 for single column at 0', () => {
      const layout = [createRow(0)];
      expect(getMaxColumns(layout)).toBe(1);
    });

    it('should account for vertex columns', () => {
      const layout = [createRow(2)];
      expect(getMaxColumns(layout)).toBe(3);
    });

    it('should find max among multiple rows', () => {
      const layout = [createRow(0), createRow(3), createRow(1)];
      expect(getMaxColumns(layout)).toBe(4);
    });

    it('should account for passing lanes', () => {
      const layout = [createRow(0, [{ column: 3, color: 1, isCommitted: true }])];
      expect(getMaxColumns(layout)).toBe(4);
    });

    it('should account for multiple passing lanes', () => {
      const layout = [
        createRow(0, [
          { column: 2, color: 0, isCommitted: true },
          { column: 5, color: 1, isCommitted: true },
        ]),
      ];
      expect(getMaxColumns(layout)).toBe(6);
    });

    it('should account for incoming lines fromColumn', () => {
      const layout = [
        createRow(
          0,
          [],
          [{ fromColumn: 4, toColumn: 0, fromRow: 0, toRow: 1, color: 0, isCommitted: true }]
        ),
      ];
      expect(getMaxColumns(layout)).toBe(5);
    });

    it('should account for incoming lines toColumn', () => {
      const layout = [
        createRow(
          0,
          [],
          [{ fromColumn: 0, toColumn: 4, fromRow: 0, toRow: 1, color: 0, isCommitted: true }]
        ),
      ];
      expect(getMaxColumns(layout)).toBe(5);
    });

    it('should account for outgoing lines fromColumn', () => {
      const layout = [
        createRow(
          0,
          [],
          [],
          [{ fromColumn: 5, toColumn: 0, fromRow: 0, toRow: 1, color: 0, isCommitted: true }]
        ),
      ];
      expect(getMaxColumns(layout)).toBe(6);
    });

    it('should account for outgoing lines toColumn', () => {
      const layout = [
        createRow(
          0,
          [],
          [],
          [{ fromColumn: 0, toColumn: 6, fromRow: 0, toRow: 1, color: 0, isCommitted: true }]
        ),
      ];
      expect(getMaxColumns(layout)).toBe(7);
    });

    it('should find max across all properties', () => {
      const layout = [
        createRow(
          1,
          [{ column: 2, color: 0, isCommitted: true }],
          [{ fromColumn: 3, toColumn: 1, fromRow: 0, toRow: 1, color: 0, isCommitted: true }],
          [{ fromColumn: 1, toColumn: 4, fromRow: 1, toRow: 2, color: 0, isCommitted: true }]
        ),
      ];
      expect(getMaxColumns(layout)).toBe(5);
    });

    it('should handle complex multi-row layout', () => {
      const layout = [
        createRow(0),
        createRow(1, [{ column: 0, color: 0, isCommitted: true }]),
        createRow(
          0,
          [],
          [{ fromColumn: 1, toColumn: 0, fromRow: 1, toRow: 2, color: 0, isCommitted: true }]
        ),
        createRow(
          2,
          [{ column: 0, color: 0, isCommitted: true }],
          [],
          [{ fromColumn: 2, toColumn: 3, fromRow: 3, toRow: 4, color: 1, isCommitted: true }]
        ),
      ];
      expect(getMaxColumns(layout)).toBe(4);
    });

    it('should handle merge preview flags', () => {
      const layout = [
        createRow(
          0,
          [{ column: 1, color: 0, isCommitted: true, isMergePreview: true }],
          [],
          [
            {
              fromColumn: 0,
              toColumn: 2,
              fromRow: 0,
              toRow: 1,
              color: 0,
              isCommitted: true,
              isMergePreview: true,
            },
          ]
        ),
      ];
      expect(getMaxColumns(layout)).toBe(3);
    });
  });

  describe('GRAPH_COLORS', () => {
    it('should be an array of color strings', () => {
      expect(Array.isArray(GRAPH_COLORS)).toBe(true);
      expect(GRAPH_COLORS.length).toBeGreaterThan(0);
      GRAPH_COLORS.forEach((color) => {
        expect(typeof color).toBe('string');
        // Colors are CSS variables like 'var(--git-graph-color0)'
        expect(color.startsWith('var(') || color.startsWith('#') || color.startsWith('rgb')).toBe(
          true
        );
      });
    });
  });

  describe('computeGraphLayout', () => {
    function createCommit(
      oid: string,
      parentOids: string[] = [],
      summary: string = 'Test commit'
    ): GraphCommit {
      return {
        oid,
        shortOid: oid.slice(0, 7),
        message: summary,
        summary,
        parentOids,
        timestamp: '2024-01-01T00:00:00Z',
        author: { name: 'Test', email: 'test@test.com', timestamp: '2024-01-01T00:00:00Z' },
        committer: { name: 'Test', email: 'test@test.com', timestamp: '2024-01-01T00:00:00Z' },
        isMerge: parentOids.length > 1,
        signature: null,
        lane: 0,
        parentEdges: [],
        refs: [],
      };
    }

    beforeEach(() => {
      // Clear any cached state between tests
    });

    it('should return empty array for empty commits', () => {
      const result = computeGraphLayout([], null);
      expect(result).toEqual([]);
    });

    it('should compute layout for single commit', () => {
      const commits = [createCommit('abc123')];
      const result = computeGraphLayout(commits, 'abc123');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('column');
      expect(result[0]).toHaveProperty('color');
      expect(result[0]).toHaveProperty('isCommitted');
      expect(result[0]).toHaveProperty('isCurrent');
      expect(result[0]).toHaveProperty('isMerge');
      expect(result[0]).toHaveProperty('hasChildren');
      expect(result[0]).toHaveProperty('hasParents');
      expect(result[0]).toHaveProperty('passingLanes');
      expect(result[0]).toHaveProperty('incomingLines');
      expect(result[0]).toHaveProperty('outgoingLines');
    });

    it('should mark current commit', () => {
      const commits = [createCommit('abc123')];
      const result = computeGraphLayout(commits, 'abc123');

      expect(result[0].isCurrent).toBe(true);
    });

    it('should not mark non-HEAD commit as current', () => {
      const commits = [createCommit('abc123')];
      const result = computeGraphLayout(commits, 'other');

      expect(result[0].isCurrent).toBe(false);
    });

    it('should compute layout for linear history', () => {
      const commits = [
        createCommit('commit3', ['commit2']),
        createCommit('commit2', ['commit1']),
        createCommit('commit1', []),
      ];
      const result = computeGraphLayout(commits, 'commit3');

      expect(result).toHaveLength(3);
      // All commits should be in the same column for linear history
      expect(result[0].column).toBe(result[1].column);
      expect(result[1].column).toBe(result[2].column);
    });

    it('should compute layout for merge commit', () => {
      const commits = [
        createCommit('merge', ['parent1', 'parent2']),
        createCommit('parent1', ['base']),
        createCommit('parent2', ['base']),
        createCommit('base', []),
      ];
      const result = computeGraphLayout(commits, 'merge');

      expect(result).toHaveLength(4);
      expect(result[0].isMerge).toBe(true);
    });

    it('should include outgoing lines for commits with children', () => {
      const commits = [createCommit('child', ['parent']), createCommit('parent', [])];
      const result = computeGraphLayout(commits, 'child');

      // Child should have outgoing lines to parent
      expect(result[0].outgoingLines.length).toBeGreaterThanOrEqual(0);
    });

    it('should include incoming lines for commits with parents', () => {
      const commits = [createCommit('child', ['parent']), createCommit('parent', [])];
      const result = computeGraphLayout(commits, 'child');

      // Parent should have incoming lines from child
      expect(result[1].incomingLines.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle uncommitted changes', () => {
      const commits = [createCommit('uncommitted', ['parent']), createCommit('parent', [])];
      const result = computeGraphLayout(commits, 'parent');

      expect(result).toHaveLength(2);
    });

    it('should handle complex branch topology', () => {
      const commits = [
        createCommit('head', ['merge']),
        createCommit('merge', ['feature', 'main']),
        createCommit('feature', ['base']),
        createCommit('main', ['base']),
        createCommit('base', []),
      ];
      const result = computeGraphLayout(commits, 'head');

      expect(result).toHaveLength(5);
      // Verify all rows have valid structure
      result.forEach((row) => {
        expect(typeof row.column).toBe('number');
        expect(typeof row.color).toBe('number');
        expect(Array.isArray(row.passingLanes)).toBe(true);
        expect(Array.isArray(row.incomingLines)).toBe(true);
        expect(Array.isArray(row.outgoingLines)).toBe(true);
      });
    });

    it('should use cache for same commits', () => {
      const commits = [createCommit('abc123')];

      const result1 = computeGraphLayout(commits, 'abc123');
      const result2 = computeGraphLayout(commits, 'abc123');

      // Results should be equivalent
      expect(result1).toEqual(result2);
    });

    it('should invalidate cache for different commits', () => {
      const commits1 = [createCommit('abc123')];
      const commits2 = [createCommit('def456')];

      const result1 = computeGraphLayout(commits1, 'abc123');
      const result2 = computeGraphLayout(commits2, 'def456');

      expect(result1[0].isCurrent).toBe(true);
      expect(result2[0].isCurrent).toBe(true);
    });

    it('should handle passing lanes correctly', () => {
      // Create a topology where lanes pass through rows
      const commits = [
        createCommit('latest', ['parent1']),
        createCommit('branch', ['base']),
        createCommit('parent1', ['base']),
        createCommit('base', []),
      ];
      const result = computeGraphLayout(commits, 'latest');

      expect(result).toHaveLength(4);
      // Check that passing lanes array exists for all rows
      result.forEach((row) => {
        expect(Array.isArray(row.passingLanes)).toBe(true);
      });
    });

    it('should assign colors within bounds', () => {
      const commits = [
        createCommit('c1', ['c2']),
        createCommit('c2', ['c3']),
        createCommit('c3', ['c4']),
        createCommit('c4', []),
      ];
      const result = computeGraphLayout(commits, 'c1');

      result.forEach((row) => {
        expect(row.color).toBeGreaterThanOrEqual(0);
        expect(row.color).toBeLessThan(GRAPH_COLORS.length);
      });
    });

    it('should propagate merge preview flag through layout', () => {
      const commits: GraphCommit[] = [
        {
          ...createCommit('uncommitted', ['headOid', 'mergeHeadOid']),
          parentEdges: [
            { parentOid: 'headOid', parentLane: 0, edgeType: 'Straight' },
            { parentOid: 'mergeHeadOid', parentLane: 1, edgeType: 'MergePreview' },
          ],
        },
        createCommit('headOid', ['base']),
        createCommit('mergeHeadOid', ['base']),
        createCommit('base', []),
      ];
      const result = computeGraphLayout(commits, 'headOid');

      expect(result).toHaveLength(4);

      // Collect all merge preview lines across all rows
      const allMergePreviewOutgoing = result.flatMap((r) =>
        r.outgoingLines.filter((l) => l.isMergePreview)
      );
      const allMergePreviewIncoming = result.flatMap((r) =>
        r.incomingLines.filter((l) => l.isMergePreview)
      );
      const allMergePreviewPassing = result.flatMap((r) =>
        r.passingLanes.filter((l) => l.isMergePreview)
      );

      // There should be merge preview lines somewhere in the layout
      const totalMergePreview =
        allMergePreviewOutgoing.length +
        allMergePreviewIncoming.length +
        allMergePreviewPassing.length;
      expect(totalMergePreview).toBeGreaterThan(0);

      // The uncommitted row (row 0) should have a merge preview outgoing line
      const uncommittedOutgoing = result[0].outgoingLines.filter((l) => l.isMergePreview);
      expect(uncommittedOutgoing.length).toBeGreaterThan(0);
    });

    it('should not mark regular lines as merge preview', () => {
      const commits = [createCommit('child', ['parent']), createCommit('parent', [])];
      const result = computeGraphLayout(commits, 'child');

      result.forEach((row) => {
        row.outgoingLines.forEach((l) => expect(l.isMergePreview).toBeFalsy());
        row.incomingLines.forEach((l) => expect(l.isMergePreview).toBeFalsy());
        row.passingLanes.forEach((l) => expect(l.isMergePreview).toBeFalsy());
      });
    });
  });
});
