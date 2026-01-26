import { describe, it, expect } from 'vitest';
import {
  getMaxColumns,
  type RowGraphData,
  type PassingLane,
  type LineSegment,
} from './graphLayout';

// Test only getMaxColumns which is a pure function without DOM dependencies
// computeGraphLayout requires the Graph class which needs DOM

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
});
