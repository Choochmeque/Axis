import type { ConflictContent, DiffHunk, DiffLine, FileDiff } from '@/types';
import { DiffLineType } from '@/types';

/**
 * Represents a single conflict section parsed from conflict markers.
 */
export interface ConflictSection {
  /** Unique identifier for the section */
  id: number;
  /** Lines from "ours" (current branch) side */
  oursContent: string[];
  /** Lines from "theirs" (incoming) side */
  theirsContent: string[];
  /** Starting line number (1-indexed) in the merged file */
  startLine: number;
  /** Ending line number (1-indexed) in the merged file */
  endLine: number;
}

/**
 * Result of parsing conflict markers from a merged file.
 */
export interface ParsedConflict {
  /** All conflict sections found in the file */
  sections: ConflictSection[];
  /** All lines including context and conflict content */
  allLines: string[];
}

/**
 * Parse conflict markers (<<<<<<< ======= >>>>>>>) from a merged file content.
 *
 * @param merged - The working tree content with conflict markers
 * @returns Parsed conflict sections
 */
export function parseConflictMarkers(merged: string): ParsedConflict {
  const lines = merged.split('\n');
  const sections: ConflictSection[] = [];
  let currentSection: {
    oursContent: string[];
    theirsContent: string[];
    startLine: number;
    inOurs: boolean;
    inTheirs: boolean;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    if (line.startsWith('<<<<<<<')) {
      currentSection = {
        oursContent: [],
        theirsContent: [],
        startLine: lineNumber,
        inOurs: true,
        inTheirs: false,
      };
    } else if (line.startsWith('=======') && currentSection) {
      currentSection.inOurs = false;
      currentSection.inTheirs = true;
    } else if (line.startsWith('>>>>>>>') && currentSection) {
      sections.push({
        id: sections.length,
        oursContent: currentSection.oursContent,
        theirsContent: currentSection.theirsContent,
        startLine: currentSection.startLine,
        endLine: lineNumber,
      });
      currentSection = null;
    } else if (currentSection) {
      if (currentSection.inOurs) {
        currentSection.oursContent.push(line);
      } else if (currentSection.inTheirs) {
        currentSection.theirsContent.push(line);
      }
    }
  }

  return {
    sections,
    allLines: lines,
  };
}

/**
 * Convert a ConflictContent to a FileDiff format for display in DiffView.
 *
 * Each conflict section becomes a hunk where:
 * - Ours lines → DiffLineType.Deletion (shown on left in split view)
 * - Theirs lines → DiffLineType.Addition (shown on right in split view)
 * - Context lines → DiffLineType.Context
 *
 * @param content - The ConflictContent from the API
 * @returns A FileDiff suitable for rendering in DiffView
 */
export function conflictToFileDiff(content: ConflictContent): FileDiff {
  const parsed = parseConflictMarkers(content.merged);
  const hunks: DiffHunk[] = [];

  if (parsed.sections.length === 0) {
    return createEmptyDiff(content.path);
  }

  // Process each conflict section as a separate hunk
  let prevEndLine = 0;

  for (const section of parsed.sections) {
    const lines: DiffLine[] = [];

    // Add context lines before this section (up to 3 lines)
    const contextStart = Math.max(prevEndLine, section.startLine - 4);
    for (let i = contextStart; i < section.startLine - 1; i++) {
      if (i >= 0 && i < parsed.allLines.length) {
        lines.push(createContextLine(parsed.allLines[i], i + 1, i + 1));
      }
    }

    // Add "ours" lines as deletions
    let oursLineNo = section.startLine;
    for (const oursLine of section.oursContent) {
      lines.push(createDeletionLine(oursLine, oursLineNo));
      oursLineNo++;
    }

    // Add "theirs" lines as additions
    let theirsLineNo = section.startLine;
    for (const theirsLine of section.theirsContent) {
      lines.push(createAdditionLine(theirsLine, theirsLineNo));
      theirsLineNo++;
    }

    // Add context lines after this section (up to 3 lines)
    const contextEnd = Math.min(section.endLine + 3, parsed.allLines.length);
    for (let i = section.endLine; i < contextEnd; i++) {
      lines.push(createContextLine(parsed.allLines[i], i + 1, i + 1));
    }

    prevEndLine = section.endLine;

    // Calculate hunk counts
    const deletions = section.oursContent.length;
    const additions = section.theirsContent.length;
    const contextCount = lines.filter((l) => l.lineType === DiffLineType.Context).length;

    hunks.push({
      header: `@@ -${section.startLine},${deletions + contextCount} +${section.startLine},${additions + contextCount} @@`,
      oldStart: section.startLine,
      oldLines: deletions + contextCount,
      newStart: section.startLine,
      newLines: additions + contextCount,
      lines,
    });
  }

  // Calculate total additions and deletions
  const totalAdditions = hunks.reduce(
    (sum, h) => sum + h.lines.filter((l) => l.lineType === DiffLineType.Addition).length,
    0
  );
  const totalDeletions = hunks.reduce(
    (sum, h) => sum + h.lines.filter((l) => l.lineType === DiffLineType.Deletion).length,
    0
  );

  return {
    oldPath: content.path,
    newPath: content.path,
    oldOid: null,
    newOid: null,
    status: 'Conflicted',
    binary: false,
    hunks,
    additions: totalAdditions,
    deletions: totalDeletions,
  };
}

/**
 * Build resolved content from the merged file with hunk resolutions applied.
 *
 * @param merged - The original merged content with conflict markers
 * @param resolutions - Map of section ID to resolution ('ours' or 'theirs')
 * @returns The resolved file content
 */
export function buildResolvedContent(
  merged: string,
  resolutions: Map<number, 'ours' | 'theirs'>
): string {
  const parsed = parseConflictMarkers(merged);
  const lines = parsed.allLines;
  const result: string[] = [];

  let i = 0;
  let sectionIndex = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('<<<<<<<')) {
      // Find the current section
      const section = parsed.sections[sectionIndex];
      if (!section) {
        // No more sections, just add the line
        result.push(line);
        i++;
        continue;
      }

      const resolution = resolutions.get(section.id);
      if (resolution === 'ours') {
        // Use ours content
        result.push(...section.oursContent);
      } else if (resolution === 'theirs') {
        // Use theirs content
        result.push(...section.theirsContent);
      } else {
        // No resolution - keep conflict markers
        result.push(line);
        i++;
        continue;
      }

      // Skip to the end of the conflict section
      i = section.endLine; // endLine is 1-indexed, so this moves past >>>>>>>
      sectionIndex++;
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n');
}

/**
 * Check if all conflict sections have resolutions.
 */
export function areAllSectionsResolved(
  merged: string,
  resolutions: Map<number, 'ours' | 'theirs'>
): boolean {
  const parsed = parseConflictMarkers(merged);
  return parsed.sections.every((section) => resolutions.has(section.id));
}

/**
 * Get the number of conflict sections in a merged file.
 */
export function getConflictCount(merged: string): number {
  return parseConflictMarkers(merged).sections.length;
}

// Helper functions
function createEmptyDiff(path: string): FileDiff {
  return {
    oldPath: path,
    newPath: path,
    oldOid: null,
    newOid: null,
    status: 'Conflicted',
    binary: false,
    hunks: [],
    additions: 0,
    deletions: 0,
  };
}

function createContextLine(content: string, oldLineNo: number, newLineNo: number): DiffLine {
  return {
    lineType: DiffLineType.Context,
    content,
    oldLineNo,
    newLineNo,
  };
}

function createDeletionLine(content: string, oldLineNo: number): DiffLine {
  return {
    lineType: DiffLineType.Deletion,
    content,
    oldLineNo,
    newLineNo: null,
  };
}

function createAdditionLine(content: string, newLineNo: number): DiffLine {
  return {
    lineType: DiffLineType.Addition,
    content,
    oldLineNo: null,
    newLineNo,
  };
}
