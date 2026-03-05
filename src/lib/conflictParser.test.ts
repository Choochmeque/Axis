import { describe, expect, it } from 'vitest';

import { DiffLineType } from '@/types';

import {
  areAllSectionsResolved,
  buildResolvedContent,
  conflictToFileDiff,
  getConflictCount,
  parseConflictMarkers,
} from './conflictParser';

describe('conflictParser', () => {
  describe('parseConflictMarkers', () => {
    it('should parse single conflict section', () => {
      const merged = `line1
<<<<<<< HEAD
our change
=======
their change
>>>>>>> branch
line2`;
      const result = parseConflictMarkers(merged);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].id).toBe(0);
      expect(result.sections[0].oursContent).toEqual(['our change']);
      expect(result.sections[0].theirsContent).toEqual(['their change']);
      expect(result.sections[0].startLine).toBe(2);
      expect(result.sections[0].endLine).toBe(6);
    });

    it('should parse multiple conflict sections', () => {
      const merged = `context1
<<<<<<< HEAD
ours1
=======
theirs1
>>>>>>> branch
between
<<<<<<< HEAD
ours2
=======
theirs2
>>>>>>> branch
context2`;
      const result = parseConflictMarkers(merged);

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].oursContent).toEqual(['ours1']);
      expect(result.sections[0].theirsContent).toEqual(['theirs1']);
      expect(result.sections[1].oursContent).toEqual(['ours2']);
      expect(result.sections[1].theirsContent).toEqual(['theirs2']);
    });

    it('should handle empty ours side', () => {
      const merged = `line1
<<<<<<< HEAD
=======
their change
>>>>>>> branch
line2`;
      const result = parseConflictMarkers(merged);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].oursContent).toEqual([]);
      expect(result.sections[0].theirsContent).toEqual(['their change']);
    });

    it('should handle empty theirs side', () => {
      const merged = `line1
<<<<<<< HEAD
our change
=======
>>>>>>> branch
line2`;
      const result = parseConflictMarkers(merged);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].oursContent).toEqual(['our change']);
      expect(result.sections[0].theirsContent).toEqual([]);
    });

    it('should handle both sides empty', () => {
      const merged = `line1
<<<<<<< HEAD
=======
>>>>>>> branch
line2`;
      const result = parseConflictMarkers(merged);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].oursContent).toEqual([]);
      expect(result.sections[0].theirsContent).toEqual([]);
    });

    it('should preserve multi-line content in sections', () => {
      const merged = `context
<<<<<<< HEAD
ours line 1
ours line 2
ours line 3
=======
theirs line 1
theirs line 2
>>>>>>> branch
more context`;
      const result = parseConflictMarkers(merged);

      expect(result.sections[0].oursContent).toEqual(['ours line 1', 'ours line 2', 'ours line 3']);
      expect(result.sections[0].theirsContent).toEqual(['theirs line 1', 'theirs line 2']);
    });

    it('should return empty sections for non-conflicted content', () => {
      const merged = `line1
line2
line3`;
      const result = parseConflictMarkers(merged);

      expect(result.sections).toHaveLength(0);
      expect(result.allLines).toEqual(['line1', 'line2', 'line3']);
    });

    it('should preserve all lines in allLines', () => {
      const merged = `line1
<<<<<<< HEAD
our change
=======
their change
>>>>>>> branch
line2`;
      const result = parseConflictMarkers(merged);

      expect(result.allLines).toHaveLength(7);
      expect(result.allLines[0]).toBe('line1');
      expect(result.allLines[1]).toBe('<<<<<<< HEAD');
      expect(result.allLines[6]).toBe('line2');
    });
  });

  describe('conflictToFileDiff', () => {
    it('should convert ours lines to DiffLineType.Deletion', () => {
      const content = {
        path: 'test.txt',
        base: null,
        ours: 'our change',
        theirs: 'their change',
        merged: `line1
<<<<<<< HEAD
our change
=======
their change
>>>>>>> branch
line2`,
      };

      const diff = conflictToFileDiff(content);

      const deletionLines = diff.hunks[0].lines.filter((l) => l.lineType === DiffLineType.Deletion);
      expect(deletionLines).toHaveLength(1);
      expect(deletionLines[0].content).toBe('our change');
    });

    it('should convert theirs lines to DiffLineType.Addition', () => {
      const content = {
        path: 'test.txt',
        base: null,
        ours: 'our change',
        theirs: 'their change',
        merged: `line1
<<<<<<< HEAD
our change
=======
their change
>>>>>>> branch
line2`,
      };

      const diff = conflictToFileDiff(content);

      const additionLines = diff.hunks[0].lines.filter((l) => l.lineType === DiffLineType.Addition);
      expect(additionLines).toHaveLength(1);
      expect(additionLines[0].content).toBe('their change');
    });

    it('should include context lines as DiffLineType.Context', () => {
      const content = {
        path: 'test.txt',
        base: null,
        ours: 'our change',
        theirs: 'their change',
        merged: `line1
<<<<<<< HEAD
our change
=======
their change
>>>>>>> branch
line2`,
      };

      const diff = conflictToFileDiff(content);

      const contextLines = diff.hunks[0].lines.filter((l) => l.lineType === DiffLineType.Context);
      expect(contextLines.length).toBeGreaterThan(0);
    });

    it('should create separate hunks for each conflict section', () => {
      const content = {
        path: 'test.txt',
        base: null,
        ours: null,
        theirs: null,
        merged: `context1
<<<<<<< HEAD
ours1
=======
theirs1
>>>>>>> branch
between
<<<<<<< HEAD
ours2
=======
theirs2
>>>>>>> branch
context2`,
      };

      const diff = conflictToFileDiff(content);

      expect(diff.hunks).toHaveLength(2);
    });

    it('should set correct path in FileDiff', () => {
      const content = {
        path: 'src/file.ts',
        base: null,
        ours: null,
        theirs: null,
        merged: `<<<<<<< HEAD
ours
=======
theirs
>>>>>>> branch`,
      };

      const diff = conflictToFileDiff(content);

      expect(diff.oldPath).toBe('src/file.ts');
      expect(diff.newPath).toBe('src/file.ts');
    });

    it('should set status to Conflicted', () => {
      const content = {
        path: 'test.txt',
        base: null,
        ours: null,
        theirs: null,
        merged: `<<<<<<< HEAD
ours
=======
theirs
>>>>>>> branch`,
      };

      const diff = conflictToFileDiff(content);

      expect(diff.status).toBe('Conflicted');
    });

    it('should calculate additions and deletions correctly', () => {
      const content = {
        path: 'test.txt',
        base: null,
        ours: null,
        theirs: null,
        merged: `<<<<<<< HEAD
ours1
ours2
=======
theirs1
>>>>>>> branch`,
      };

      const diff = conflictToFileDiff(content);

      expect(diff.deletions).toBe(2);
      expect(diff.additions).toBe(1);
    });

    it('should return empty diff for non-conflicted content', () => {
      const content = {
        path: 'test.txt',
        base: null,
        ours: null,
        theirs: null,
        merged: 'no conflict here',
      };

      const diff = conflictToFileDiff(content);

      expect(diff.hunks).toHaveLength(0);
      expect(diff.additions).toBe(0);
      expect(diff.deletions).toBe(0);
    });
  });

  describe('buildResolvedContent', () => {
    it('should build content with ours resolution', () => {
      const merged = `line1
<<<<<<< HEAD
our change
=======
their change
>>>>>>> branch
line2`;
      const resolutions = new Map<number, 'ours' | 'theirs'>([[0, 'ours']]);

      const result = buildResolvedContent(merged, resolutions);

      expect(result).toBe('line1\nour change\nline2');
    });

    it('should build content with theirs resolution', () => {
      const merged = `line1
<<<<<<< HEAD
our change
=======
their change
>>>>>>> branch
line2`;
      const resolutions = new Map<number, 'ours' | 'theirs'>([[0, 'theirs']]);

      const result = buildResolvedContent(merged, resolutions);

      expect(result).toBe('line1\ntheir change\nline2');
    });

    it('should build content with mixed resolutions', () => {
      const merged = `context1
<<<<<<< HEAD
ours1
=======
theirs1
>>>>>>> branch
between
<<<<<<< HEAD
ours2
=======
theirs2
>>>>>>> branch
context2`;
      const resolutions = new Map<number, 'ours' | 'theirs'>([
        [0, 'ours'],
        [1, 'theirs'],
      ]);

      const result = buildResolvedContent(merged, resolutions);

      expect(result).toBe('context1\nours1\nbetween\ntheirs2\ncontext2');
    });

    it('should preserve non-conflict lines exactly', () => {
      const merged = `first line
second line
<<<<<<< HEAD
our change
=======
their change
>>>>>>> branch
third line
fourth line`;
      const resolutions = new Map<number, 'ours' | 'theirs'>([[0, 'ours']]);

      const result = buildResolvedContent(merged, resolutions);

      expect(result).toBe('first line\nsecond line\nour change\nthird line\nfourth line');
    });

    it('should handle multi-line ours content', () => {
      const merged = `start
<<<<<<< HEAD
line1
line2
line3
=======
other
>>>>>>> branch
end`;
      const resolutions = new Map<number, 'ours' | 'theirs'>([[0, 'ours']]);

      const result = buildResolvedContent(merged, resolutions);

      expect(result).toBe('start\nline1\nline2\nline3\nend');
    });

    it('should handle multi-line theirs content', () => {
      const merged = `start
<<<<<<< HEAD
our
=======
their1
their2
their3
>>>>>>> branch
end`;
      const resolutions = new Map<number, 'ours' | 'theirs'>([[0, 'theirs']]);

      const result = buildResolvedContent(merged, resolutions);

      expect(result).toBe('start\ntheir1\ntheir2\ntheir3\nend');
    });

    it('should handle empty ours resolution', () => {
      const merged = `line1
<<<<<<< HEAD
=======
their change
>>>>>>> branch
line2`;
      const resolutions = new Map<number, 'ours' | 'theirs'>([[0, 'ours']]);

      const result = buildResolvedContent(merged, resolutions);

      expect(result).toBe('line1\nline2');
    });

    it('should handle empty theirs resolution', () => {
      const merged = `line1
<<<<<<< HEAD
our change
=======
>>>>>>> branch
line2`;
      const resolutions = new Map<number, 'ours' | 'theirs'>([[0, 'theirs']]);

      const result = buildResolvedContent(merged, resolutions);

      expect(result).toBe('line1\nline2');
    });

    it('should keep conflict markers for unresolved sections', () => {
      const merged = `line1
<<<<<<< HEAD
our change
=======
their change
>>>>>>> branch
line2`;
      const resolutions = new Map<number, 'ours' | 'theirs'>();

      const result = buildResolvedContent(merged, resolutions);

      expect(result).toContain('<<<<<<<');
    });
  });

  describe('areAllSectionsResolved', () => {
    it('should return true when all sections are resolved', () => {
      const merged = `<<<<<<< HEAD
ours1
=======
theirs1
>>>>>>> branch
<<<<<<< HEAD
ours2
=======
theirs2
>>>>>>> branch`;
      const resolutions = new Map<number, 'ours' | 'theirs'>([
        [0, 'ours'],
        [1, 'theirs'],
      ]);

      expect(areAllSectionsResolved(merged, resolutions)).toBe(true);
    });

    it('should return false when some sections are unresolved', () => {
      const merged = `<<<<<<< HEAD
ours1
=======
theirs1
>>>>>>> branch
<<<<<<< HEAD
ours2
=======
theirs2
>>>>>>> branch`;
      const resolutions = new Map<number, 'ours' | 'theirs'>([[0, 'ours']]);

      expect(areAllSectionsResolved(merged, resolutions)).toBe(false);
    });

    it('should return false when no sections are resolved', () => {
      const merged = `<<<<<<< HEAD
ours
=======
theirs
>>>>>>> branch`;
      const resolutions = new Map<number, 'ours' | 'theirs'>();

      expect(areAllSectionsResolved(merged, resolutions)).toBe(false);
    });

    it('should return true when there are no conflict sections', () => {
      const merged = 'no conflict here';
      const resolutions = new Map<number, 'ours' | 'theirs'>();

      expect(areAllSectionsResolved(merged, resolutions)).toBe(true);
    });
  });

  describe('getConflictCount', () => {
    it('should return correct count for single conflict', () => {
      const merged = `<<<<<<< HEAD
ours
=======
theirs
>>>>>>> branch`;

      expect(getConflictCount(merged)).toBe(1);
    });

    it('should return correct count for multiple conflicts', () => {
      const merged = `<<<<<<< HEAD
ours1
=======
theirs1
>>>>>>> branch
between
<<<<<<< HEAD
ours2
=======
theirs2
>>>>>>> branch
more
<<<<<<< HEAD
ours3
=======
theirs3
>>>>>>> branch`;

      expect(getConflictCount(merged)).toBe(3);
    });

    it('should return 0 for non-conflicted content', () => {
      const merged = 'no conflict here';

      expect(getConflictCount(merged)).toBe(0);
    });
  });
});
