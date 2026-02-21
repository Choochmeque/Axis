import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLineSelection } from './useLineSelection';
import type { DiffHunk, DiffLine } from '@/types';
import { DiffLineType } from '@/types';

// Helper to create a DiffLine
function createLine(
  lineType: string,
  content: string,
  oldLineNo?: number,
  newLineNo?: number
): DiffLine {
  return {
    lineType: lineType as DiffLine['lineType'],
    content,
    oldLineNo: oldLineNo ?? null,
    newLineNo: newLineNo ?? null,
  };
}

// Helper to create a DiffHunk
function createHunk(lines: DiffLine[]): DiffHunk {
  return {
    header: '@@ -1,1 +1,1 @@',
    oldStart: 1,
    oldLines: 1,
    newStart: 1,
    newLines: 1,
    lines,
  };
}

describe('useLineSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with empty selection', () => {
      const hunks = [
        createHunk([
          createLine(DiffLineType.Context, 'line 1', 1, 1),
          createLine(DiffLineType.Addition, 'added', undefined, 2),
        ]),
      ];

      const { result } = renderHook(() => useLineSelection({ hunks, enabled: true }));

      expect(result.current.selectedLines.size).toBe(0);
      expect(result.current.hasSelection).toBe(false);
      expect(result.current.selectionCount).toBe(0);
    });

    it('should have empty selection when disabled', () => {
      const hunks = [createHunk([createLine(DiffLineType.Addition, 'added', undefined, 1)])];

      const { result } = renderHook(() => useLineSelection({ hunks, enabled: false }));

      expect(result.current.selectedLines.size).toBe(0);
    });
  });

  describe('toggleLine', () => {
    it('should select a line on toggle', () => {
      const hunks = [
        createHunk([
          createLine(DiffLineType.Context, 'context', 1, 1),
          createLine(DiffLineType.Addition, 'added', undefined, 2),
        ]),
      ];

      const { result } = renderHook(() => useLineSelection({ hunks, enabled: true }));

      act(() => {
        result.current.toggleLine(0, 1); // Select the addition
      });

      expect(result.current.isLineSelected(0, 1)).toBe(true);
      expect(result.current.selectionCount).toBe(1);
    });

    it('should deselect a line on second toggle with Ctrl/Meta', () => {
      const hunks = [createHunk([createLine(DiffLineType.Addition, 'added', undefined, 1)])];

      const { result } = renderHook(() => useLineSelection({ hunks, enabled: true }));

      // Select first
      act(() => {
        result.current.toggleLine(0, 0);
      });
      expect(result.current.isLineSelected(0, 0)).toBe(true);

      // Toggle with Ctrl to deselect
      act(() => {
        result.current.toggleLine(0, 0, { ctrlKey: true } as React.MouseEvent);
      });
      expect(result.current.isLineSelected(0, 0)).toBe(false);
    });
  });

  describe('isLineSelected', () => {
    it('should return correct selection status', () => {
      const hunks = [
        createHunk([
          createLine(DiffLineType.Addition, 'added 1', undefined, 1),
          createLine(DiffLineType.Addition, 'added 2', undefined, 2),
        ]),
      ];

      const { result } = renderHook(() => useLineSelection({ hunks, enabled: true }));

      act(() => {
        result.current.toggleLine(0, 0);
      });

      expect(result.current.isLineSelected(0, 0)).toBe(true);
      expect(result.current.isLineSelected(0, 1)).toBe(false);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected lines', () => {
      const hunks = [
        createHunk([
          createLine(DiffLineType.Addition, 'added 1', undefined, 1),
          createLine(DiffLineType.Addition, 'added 2', undefined, 2),
        ]),
      ];

      const { result } = renderHook(() => useLineSelection({ hunks, enabled: true }));

      // Select first line
      act(() => {
        result.current.toggleLine(0, 0);
      });

      // Select second line (Ctrl+click to add to selection)
      act(() => {
        result.current.toggleLine(0, 1, { ctrlKey: true } as React.MouseEvent);
      });
      expect(result.current.selectionCount).toBe(2);

      // Clear
      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectionCount).toBe(0);
      expect(result.current.hasSelection).toBe(false);
    });
  });

  describe('enabled state', () => {
    it('should clear selection when disabled', () => {
      const hunks = [createHunk([createLine(DiffLineType.Addition, 'added', undefined, 1)])];

      const { result, rerender } = renderHook(
        ({ enabled }) => useLineSelection({ hunks, enabled }),
        { initialProps: { enabled: true } }
      );

      // Select a line
      act(() => {
        result.current.toggleLine(0, 0);
      });
      expect(result.current.selectionCount).toBe(1);

      // Disable
      rerender({ enabled: false });
      expect(result.current.selectionCount).toBe(0);
    });
  });

  describe('selectable lines', () => {
    it('should only include Addition and Deletion lines in selectable items', () => {
      const hunks = [
        createHunk([
          createLine(DiffLineType.Context, 'context 1', 1, 1),
          createLine(DiffLineType.Addition, 'added', undefined, 2),
          createLine(DiffLineType.Context, 'context 2', 2, 3),
          createLine(DiffLineType.Deletion, 'deleted', 3, undefined),
          createLine(DiffLineType.Context, 'context 3', 4, 4),
        ]),
      ];

      const { result } = renderHook(() => useLineSelection({ hunks, enabled: true }));

      // Try to select context - won't work (not in selectable items)
      act(() => {
        result.current.toggleLine(0, 0);
      });
      // Selection should be empty because context lines aren't selectable
      expect(result.current.selectionCount).toBe(0);

      // Select addition - works
      act(() => {
        result.current.toggleLine(0, 1);
      });
      expect(result.current.selectionCount).toBe(1);
      expect(result.current.isLineSelected(0, 1)).toBe(true);

      // Add deletion to selection - works
      act(() => {
        result.current.toggleLine(0, 3, { ctrlKey: true } as React.MouseEvent);
      });
      expect(result.current.selectionCount).toBe(2);
      expect(result.current.isLineSelected(0, 1)).toBe(true);
      expect(result.current.isLineSelected(0, 3)).toBe(true);
    });
  });

  describe('multiple hunks', () => {
    it('should handle selection across multiple hunks', () => {
      const hunks = [
        createHunk([createLine(DiffLineType.Addition, 'added in hunk 0', undefined, 1)]),
        createHunk([createLine(DiffLineType.Deletion, 'deleted in hunk 1', 1, undefined)]),
      ];

      const { result } = renderHook(() => useLineSelection({ hunks, enabled: true }));

      act(() => {
        result.current.toggleLine(0, 0);
      });

      act(() => {
        result.current.toggleLine(1, 0, { ctrlKey: true } as React.MouseEvent);
      });

      expect(result.current.selectionCount).toBe(2);
      expect(result.current.isLineSelected(0, 0)).toBe(true);
      expect(result.current.isLineSelected(1, 0)).toBe(true);
    });
  });

  describe('selectAllInHunk', () => {
    it('should select all stageable lines in a hunk', () => {
      const hunks = [
        createHunk([
          createLine(DiffLineType.Context, 'context', 1, 1),
          createLine(DiffLineType.Addition, 'added 1', undefined, 2),
          createLine(DiffLineType.Addition, 'added 2', undefined, 3),
          createLine(DiffLineType.Deletion, 'deleted', 2, undefined),
          createLine(DiffLineType.Context, 'context', 3, 4),
        ]),
      ];

      const { result } = renderHook(() => useLineSelection({ hunks, enabled: true }));

      act(() => {
        result.current.selectAllInHunk(0);
      });

      // Should select: addition at index 1, addition at index 2, deletion at index 3
      expect(result.current.selectionCount).toBe(3);
      expect(result.current.isLineSelected(0, 1)).toBe(true);
      expect(result.current.isLineSelected(0, 2)).toBe(true);
      expect(result.current.isLineSelected(0, 3)).toBe(true);
      // Context lines should not be selected
      expect(result.current.isLineSelected(0, 0)).toBe(false);
      expect(result.current.isLineSelected(0, 4)).toBe(false);
    });
  });

  describe('hasSelection and selectionCount', () => {
    it('should track selection state correctly', () => {
      const hunks = [
        createHunk([
          createLine(DiffLineType.Addition, 'added 1', undefined, 1),
          createLine(DiffLineType.Addition, 'added 2', undefined, 2),
        ]),
      ];

      const { result } = renderHook(() => useLineSelection({ hunks, enabled: true }));

      expect(result.current.hasSelection).toBe(false);
      expect(result.current.selectionCount).toBe(0);

      act(() => {
        result.current.toggleLine(0, 0);
      });

      expect(result.current.hasSelection).toBe(true);
      expect(result.current.selectionCount).toBe(1);

      act(() => {
        result.current.toggleLine(0, 1, { ctrlKey: true } as React.MouseEvent);
      });

      expect(result.current.selectionCount).toBe(2);
    });
  });
});
