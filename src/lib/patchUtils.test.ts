import { describe, it, expect } from 'vitest';
import { generatePartialPatch, isLineSelectable } from './patchUtils';
import type { FileDiff, DiffHunk, DiffLine } from '@/types';
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
function createHunk(
  oldStart: number,
  oldLines: number,
  newStart: number,
  newLines: number,
  lines: DiffLine[]
): DiffHunk {
  return {
    header: `@@ -${oldStart},${oldLines} +${newStart},${newLines} @@`,
    oldStart,
    oldLines,
    newStart,
    newLines,
    lines,
  };
}

// Helper to create a FileDiff
function createDiff(hunks: DiffHunk[], oldPath = 'file.txt', newPath = 'file.txt'): FileDiff {
  return {
    oldPath,
    newPath,
    oldOid: null,
    newOid: null,
    status: 'Modified',
    binary: false,
    hunks,
    additions: hunks.reduce(
      (sum, h) => sum + h.lines.filter((l) => l.lineType === DiffLineType.Addition).length,
      0
    ),
    deletions: hunks.reduce(
      (sum, h) => sum + h.lines.filter((l) => l.lineType === DiffLineType.Deletion).length,
      0
    ),
  };
}

describe('patchUtils', () => {
  describe('isLineSelectable', () => {
    it('should return true for Addition lines', () => {
      expect(isLineSelectable(DiffLineType.Addition)).toBe(true);
    });

    it('should return true for Deletion lines', () => {
      expect(isLineSelectable(DiffLineType.Deletion)).toBe(true);
    });

    it('should return false for Context lines', () => {
      expect(isLineSelectable(DiffLineType.Context)).toBe(false);
    });

    it('should return false for Header lines', () => {
      expect(isLineSelectable(DiffLineType.Header)).toBe(false);
    });

    it('should return false for Binary lines', () => {
      expect(isLineSelectable(DiffLineType.Binary)).toBe(false);
    });
  });

  describe('generatePartialPatch', () => {
    it('should return empty string for empty selection', () => {
      const diff = createDiff([
        createHunk(1, 3, 1, 4, [
          createLine(DiffLineType.Context, 'line 1', 1, 1),
          createLine(DiffLineType.Addition, 'new line', undefined, 2),
          createLine(DiffLineType.Context, 'line 2', 2, 3),
        ]),
      ]);

      const result = generatePartialPatch(diff, new Set());
      expect(result).toBe('');
    });

    it('should generate patch for single addition', () => {
      const diff = createDiff([
        createHunk(1, 2, 1, 3, [
          createLine(DiffLineType.Context, 'line 1', 1, 1),
          createLine(DiffLineType.Addition, 'new line', undefined, 2),
          createLine(DiffLineType.Context, 'line 2', 2, 3),
        ]),
      ]);

      const selectedLines = new Set(['0:1']); // hunkIndex:lineIndex
      const result = generatePartialPatch(diff, selectedLines);

      expect(result).toContain('diff --git a/file.txt b/file.txt');
      expect(result).toContain('--- a/file.txt');
      expect(result).toContain('+++ b/file.txt');
      expect(result).toContain('@@ -1,2 +1,3 @@');
      expect(result).toContain('+new line');
    });

    it('should generate patch for single deletion', () => {
      const diff = createDiff([
        createHunk(1, 3, 1, 2, [
          createLine(DiffLineType.Context, 'line 1', 1, 1),
          createLine(DiffLineType.Deletion, 'deleted line', 2, undefined),
          createLine(DiffLineType.Context, 'line 3', 3, 2),
        ]),
      ]);

      const selectedLines = new Set(['0:1']);
      const result = generatePartialPatch(diff, selectedLines);

      expect(result).toContain('@@ -1,3 +1,2 @@');
      expect(result).toContain('-deleted line');
    });

    it('should convert non-selected deletions to context', () => {
      const diff = createDiff([
        createHunk(1, 4, 1, 2, [
          createLine(DiffLineType.Context, 'line 1', 1, 1),
          createLine(DiffLineType.Deletion, 'deleted 1', 2, undefined),
          createLine(DiffLineType.Deletion, 'deleted 2', 3, undefined),
          createLine(DiffLineType.Context, 'line 4', 4, 2),
        ]),
      ]);

      // Only select the first deletion
      const selectedLines = new Set(['0:1']);
      const result = generatePartialPatch(diff, selectedLines);

      // Should have: context + deletion + context (from non-selected deletion) + context
      // Old: 4 lines, New: 3 lines (1 deletion)
      expect(result).toContain('@@ -1,4 +1,3 @@');
      expect(result).toContain('-deleted 1');
      // Non-selected deletion becomes context
      expect(result).toContain(' deleted 2');
    });

    it('should omit non-selected additions', () => {
      const diff = createDiff([
        createHunk(1, 2, 1, 4, [
          createLine(DiffLineType.Context, 'line 1', 1, 1),
          createLine(DiffLineType.Addition, 'added 1', undefined, 2),
          createLine(DiffLineType.Addition, 'added 2', undefined, 3),
          createLine(DiffLineType.Context, 'line 2', 2, 4),
        ]),
      ]);

      // Only select the first addition
      const selectedLines = new Set(['0:1']);
      const result = generatePartialPatch(diff, selectedLines);

      // Should have: context + addition + context
      // Old: 2 lines, New: 3 lines (1 addition)
      expect(result).toContain('@@ -1,2 +1,3 @@');
      expect(result).toContain('+added 1');
      expect(result).not.toContain('+added 2');
      expect(result).not.toContain('added 2');
    });

    it('should handle multiple selected lines', () => {
      const diff = createDiff([
        createHunk(1, 3, 1, 4, [
          createLine(DiffLineType.Context, 'line 1', 1, 1),
          createLine(DiffLineType.Deletion, 'deleted', 2, undefined),
          createLine(DiffLineType.Addition, 'added', undefined, 2),
          createLine(DiffLineType.Context, 'line 3', 3, 4),
        ]),
      ]);

      const selectedLines = new Set(['0:1', '0:2']); // Both deletion and addition
      const result = generatePartialPatch(diff, selectedLines);

      expect(result).toContain('-deleted');
      expect(result).toContain('+added');
    });

    it('should handle selections from multiple hunks', () => {
      const diff = createDiff([
        createHunk(1, 2, 1, 3, [
          createLine(DiffLineType.Context, 'line 1', 1, 1),
          createLine(DiffLineType.Addition, 'added in hunk 1', undefined, 2),
          createLine(DiffLineType.Context, 'line 2', 2, 3),
        ]),
        createHunk(10, 2, 11, 3, [
          createLine(DiffLineType.Context, 'line 10', 10, 11),
          createLine(DiffLineType.Addition, 'added in hunk 2', undefined, 12),
          createLine(DiffLineType.Context, 'line 11', 11, 13),
        ]),
      ]);

      const selectedLines = new Set(['0:1', '1:1']); // One from each hunk
      const result = generatePartialPatch(diff, selectedLines);

      expect(result).toContain('+added in hunk 1');
      expect(result).toContain('+added in hunk 2');
      // Should have two hunk headers
      expect((result.match(/@@ /g) || []).length).toBe(2);
    });

    it('should return empty string when no actual changes after filtering', () => {
      const diff = createDiff([
        createHunk(1, 2, 1, 2, [
          createLine(DiffLineType.Context, 'line 1', 1, 1),
          createLine(DiffLineType.Context, 'line 2', 2, 2),
        ]),
      ]);

      // No selectable lines exist
      const selectedLines = new Set<string>();
      const result = generatePartialPatch(diff, selectedLines);

      expect(result).toBe('');
    });

    it('should handle all lines selected in a hunk (full hunk)', () => {
      const diff = createDiff([
        createHunk(1, 3, 1, 3, [
          createLine(DiffLineType.Context, 'line 1', 1, 1),
          createLine(DiffLineType.Deletion, 'old line', 2, undefined),
          createLine(DiffLineType.Addition, 'new line', undefined, 2),
          createLine(DiffLineType.Context, 'line 3', 3, 3),
        ]),
      ]);

      const selectedLines = new Set(['0:1', '0:2']); // Both changes
      const result = generatePartialPatch(diff, selectedLines);

      expect(result).toContain('-old line');
      expect(result).toContain('+new line');
    });

    it('should use correct paths in patch header', () => {
      const diff = createDiff(
        [
          createHunk(1, 2, 1, 3, [
            createLine(DiffLineType.Context, 'line 1', 1, 1),
            createLine(DiffLineType.Addition, 'new line', undefined, 2),
            createLine(DiffLineType.Context, 'line 2', 2, 3),
          ]),
        ],
        'old/path.txt',
        'new/path.txt'
      );

      const selectedLines = new Set(['0:1']);
      const result = generatePartialPatch(diff, selectedLines);

      expect(result).toContain('diff --git a/old/path.txt b/new/path.txt');
      expect(result).toContain('--- a/old/path.txt');
      expect(result).toContain('+++ b/new/path.txt');
    });

    it('should handle consecutive additions with partial selection', () => {
      const diff = createDiff([
        createHunk(1, 2, 1, 5, [
          createLine(DiffLineType.Context, 'line 1', 1, 1),
          createLine(DiffLineType.Addition, 'added 1', undefined, 2),
          createLine(DiffLineType.Addition, 'added 2', undefined, 3),
          createLine(DiffLineType.Addition, 'added 3', undefined, 4),
          createLine(DiffLineType.Context, 'line 2', 2, 5),
        ]),
      ]);

      // Select only middle addition
      const selectedLines = new Set(['0:2']);
      const result = generatePartialPatch(diff, selectedLines);

      expect(result).not.toContain('added 1');
      expect(result).toContain('+added 2');
      expect(result).not.toContain('added 3');
    });

    it('should handle consecutive deletions with partial selection', () => {
      const diff = createDiff([
        createHunk(1, 5, 1, 2, [
          createLine(DiffLineType.Context, 'line 1', 1, 1),
          createLine(DiffLineType.Deletion, 'deleted 1', 2, undefined),
          createLine(DiffLineType.Deletion, 'deleted 2', 3, undefined),
          createLine(DiffLineType.Deletion, 'deleted 3', 4, undefined),
          createLine(DiffLineType.Context, 'line 5', 5, 2),
        ]),
      ]);

      // Select only middle deletion
      const selectedLines = new Set(['0:2']);
      const result = generatePartialPatch(diff, selectedLines);

      // Non-selected deletions become context
      expect(result).toContain(' deleted 1');
      expect(result).toContain('-deleted 2');
      expect(result).toContain(' deleted 3');
    });
  });
});
