import { useState, useMemo, useCallback, useRef, useInsertionEffect } from 'react';
import type { DiffHunk } from '@/types';
import { DiffLineType } from '@/types';
import { createLineKey } from '@/components/diff/types';

interface UseLineSelectionOptions {
  hunks: DiffHunk[];
  enabled: boolean;
}

export interface UseLineSelectionReturn {
  selectedLines: Set<string>;
  isLineSelected: (hunkIndex: number, lineIndex: number) => boolean;
  toggleLine: (hunkIndex: number, lineIndex: number, event?: React.MouseEvent) => void;
  selectAllInHunk: (hunkIndex: number) => void;
  clearSelection: () => void;
  hasSelection: boolean;
  selectionCount: number;
}

const EMPTY_SET = new Set<string>();

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const key of a) {
    if (!b.has(key)) return false;
  }
  return true;
}

/**
 * Hook for managing line selection in diff views.
 * Supports multi-select with Shift+Click and Cmd/Ctrl+Click.
 * Only Addition and Deletion lines are selectable.
 */
export function useLineSelection({
  hunks,
  enabled,
}: UseLineSelectionOptions): UseLineSelectionReturn {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(EMPTY_SET);
  const lastSelectedRef = useRef<string | null>(null);

  // Build flat list of selectable line keys
  const selectableKeys = useMemo(() => {
    const keys: string[] = [];
    hunks.forEach((hunk, hunkIndex) => {
      hunk.lines.forEach((line, lineIndex) => {
        if (line.lineType === DiffLineType.Addition || line.lineType === DiffLineType.Deletion) {
          keys.push(createLineKey(hunkIndex, lineIndex));
        }
      });
    });
    return keys;
  }, [hunks]);

  // Track previous enabled state and selectableKeys for "setState during render" pattern
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  const [prevSelectableKeys, setPrevSelectableKeys] = useState(selectableKeys);
  const [pendingClearRef, setPendingClearRef] = useState(false);

  // Clear selection when disabled (setState during render pattern)
  if (prevEnabled !== enabled) {
    setPrevEnabled(enabled);
    if (!enabled && selectedKeys.size > 0) {
      setSelectedKeys(EMPTY_SET);
      setPendingClearRef(true);
    }
  }

  // Clear lastSelectedRef in useInsertionEffect (refs can't be written during render)
  useInsertionEffect(() => {
    if (pendingClearRef) {
      lastSelectedRef.current = null;
    }
  }, [pendingClearRef]);

  // Prune selection when hunks change (setState during render pattern)
  if (!setsEqual(new Set(prevSelectableKeys), new Set(selectableKeys))) {
    setPrevSelectableKeys(selectableKeys);
    if (selectedKeys.size > 0) {
      const keySet = new Set(selectableKeys);
      const pruned = new Set<string>();
      let changed = false;
      for (const key of selectedKeys) {
        if (keySet.has(key)) {
          pruned.add(key);
        } else {
          changed = true;
        }
      }
      if (changed) {
        setSelectedKeys(pruned);
      }
    }
  }

  const isLineSelected = useCallback(
    (hunkIndex: number, lineIndex: number): boolean => {
      return selectedKeys.has(createLineKey(hunkIndex, lineIndex));
    },
    [selectedKeys]
  );

  const toggleLine = useCallback(
    (hunkIndex: number, lineIndex: number, event?: React.MouseEvent) => {
      if (!enabled) return;

      const key = createLineKey(hunkIndex, lineIndex);

      // Check if line is selectable
      if (!selectableKeys.includes(key)) return;

      if (event?.shiftKey && lastSelectedRef.current) {
        // Range selection
        const lastIndex = selectableKeys.indexOf(lastSelectedRef.current);
        const currentIndex = selectableKeys.indexOf(key);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          setSelectedKeys((prev) => {
            const newKeys = new Set(prev);
            for (let i = start; i <= end; i++) {
              newKeys.add(selectableKeys[i]);
            }
            return newKeys;
          });
        } else {
          setSelectedKeys(new Set([key]));
          lastSelectedRef.current = key;
        }
      } else {
        // Toggle individual item (checkbox behavior)
        // Works for: no event (checkbox click), Ctrl+click, Meta+click, or plain click
        setSelectedKeys((prev) => {
          const newKeys = new Set(prev);
          if (newKeys.has(key)) {
            newKeys.delete(key);
          } else {
            newKeys.add(key);
          }
          return newKeys;
        });
        lastSelectedRef.current = key;
      }
    },
    [enabled, selectableKeys]
  );

  const selectAllInHunk = useCallback(
    (hunkIndex: number) => {
      if (!enabled) return;

      const hunk = hunks[hunkIndex];
      if (!hunk) return;

      // Get all selectable lines in this hunk
      const hunkLineKeys: string[] = [];
      hunk.lines.forEach((line, lineIndex) => {
        if (line.lineType === DiffLineType.Addition || line.lineType === DiffLineType.Deletion) {
          hunkLineKeys.push(createLineKey(hunkIndex, lineIndex));
        }
      });

      if (hunkLineKeys.length === 0) return;

      setSelectedKeys((prev) => {
        // Check if all lines in this hunk are already selected
        const allSelected = hunkLineKeys.every((key) => prev.has(key));

        if (allSelected) {
          // Deselect all in this hunk
          const newKeys = new Set(prev);
          hunkLineKeys.forEach((key) => newKeys.delete(key));
          return newKeys;
        } else {
          // Select all in this hunk (add to existing selection)
          const newKeys = new Set(prev);
          hunkLineKeys.forEach((key) => newKeys.add(key));
          return newKeys;
        }
      });
    },
    [enabled, hunks]
  );

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
    lastSelectedRef.current = null;
  }, []);

  return {
    selectedLines: selectedKeys,
    isLineSelected,
    toggleLine,
    selectAllInHunk,
    clearSelection,
    hasSelection: selectedKeys.size > 0,
    selectionCount: selectedKeys.size,
  };
}
