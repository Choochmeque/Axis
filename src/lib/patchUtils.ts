import type { FileDiff, DiffHunk } from '@/types';
import { DiffLineType } from '@/types';
import { deserializeLineKey } from '@/components/diff/types';

/**
 * Generate a valid unified diff patch for selected lines.
 *
 * Algorithm:
 * 1. Group selected lines by hunk
 * 2. For each hunk with selections:
 *    a. Include all context lines
 *    b. Include selected additions/deletions
 *    c. Convert non-selected deletions to context lines (they exist in both versions)
 *    d. Omit non-selected additions (not in original file)
 *    e. Recalculate hunk header (@@ -old,count +new,count @@)
 * 3. Combine into final patch
 */
export function generatePartialPatch(diff: FileDiff, selectedLines: Set<string>): string {
  if (selectedLines.size === 0) {
    return '';
  }

  // Group selected lines by hunk index
  const linesByHunk = new Map<number, Set<number>>();
  for (const key of selectedLines) {
    const { hunkIndex, lineIndex } = deserializeLineKey(key);
    if (!linesByHunk.has(hunkIndex)) {
      linesByHunk.set(hunkIndex, new Set());
    }
    linesByHunk.get(hunkIndex)!.add(lineIndex);
  }

  const oldPath = diff.oldPath || diff.newPath || '';
  const newPath = diff.newPath || diff.oldPath || '';

  let patch = `diff --git a/${oldPath} b/${newPath}\n`;
  patch += `--- a/${oldPath}\n`;
  patch += `+++ b/${newPath}\n`;

  // Process each hunk that has selected lines
  const sortedHunkIndices = Array.from(linesByHunk.keys()).sort((a, b) => a - b);

  for (const hunkIndex of sortedHunkIndices) {
    const hunk = diff.hunks[hunkIndex];
    if (!hunk) continue;

    const selectedInHunk = linesByHunk.get(hunkIndex)!;
    const hunkPatch = generatePartialHunkPatch(hunk, selectedInHunk);

    if (hunkPatch) {
      patch += hunkPatch;
    }
  }

  return patch;
}

/**
 * Generate a partial patch for a single hunk with selected lines.
 */
function generatePartialHunkPatch(hunk: DiffHunk, selectedLineIndices: Set<number>): string {
  const processedLines: { prefix: string; content: string }[] = [];
  let oldCount = 0;
  let newCount = 0;

  for (let i = 0; i < hunk.lines.length; i++) {
    const line = hunk.lines[i];
    const isSelected = selectedLineIndices.has(i);

    if (line.lineType === DiffLineType.Context) {
      // Context lines always included
      processedLines.push({ prefix: ' ', content: line.content });
      oldCount++;
      newCount++;
    } else if (line.lineType === DiffLineType.Addition) {
      if (isSelected) {
        // Include selected additions
        processedLines.push({ prefix: '+', content: line.content });
        newCount++;
      }
      // Non-selected additions are omitted entirely
    } else if (line.lineType === DiffLineType.Deletion) {
      if (isSelected) {
        // Include selected deletions
        processedLines.push({ prefix: '-', content: line.content });
        oldCount++;
      } else {
        // Convert non-selected deletions to context (line exists in both)
        processedLines.push({ prefix: ' ', content: line.content });
        oldCount++;
        newCount++;
      }
    }
  }

  // Check if we have any actual changes (not just context)
  const hasChanges = processedLines.some((l) => l.prefix !== ' ');
  if (!hasChanges) {
    return '';
  }

  // Generate hunk header with recalculated counts
  const header = `@@ -${hunk.oldStart},${oldCount} +${hunk.newStart},${newCount} @@\n`;

  let result = header;
  for (const line of processedLines) {
    result += `${line.prefix}${line.content}\n`;
  }

  return result;
}

/**
 * Check if a line type is selectable for staging (only additions and deletions)
 */
export function isLineSelectable(lineType: string): boolean {
  return lineType === DiffLineType.Addition || lineType === DiffLineType.Deletion;
}
