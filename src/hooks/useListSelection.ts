import { useCallback, useEffect, useInsertionEffect, useMemo, useRef, useState } from 'react';

export type SelectionKey = string | number;
export type SelectionMode = 'none' | 'single' | 'multiple';

interface UseListSelectionOptions<T> {
  items: T[];
  getItemKey: (item: T, index: number) => SelectionKey;
  selectionMode?: SelectionMode;
  selectedKeys?: Set<SelectionKey>;
  defaultSelectedKeys?: Set<SelectionKey>;
  onSelectionChange?: (keys: Set<SelectionKey>) => void;
}

interface UseListSelectionReturn {
  selectedKeys: Set<SelectionKey>;
  isSelected: (key: SelectionKey) => boolean;
  handleItemClick: (key: SelectionKey, event?: React.MouseEvent) => void;
  clearSelection: () => void;
  selectAll: () => void;
}

const EMPTY_SET = new Set<SelectionKey>();

function setsEqual(a: Set<SelectionKey>, b: Set<SelectionKey>): boolean {
  if (a.size !== b.size) return false;
  for (const key of a) {
    if (!b.has(key)) return false;
  }
  return true;
}

export function useListSelection<T>({
  items,
  getItemKey,
  selectionMode = 'single',
  selectedKeys: controlledSelectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
}: UseListSelectionOptions<T>): UseListSelectionReturn {
  const isControlled = controlledSelectedKeys !== undefined;

  const [internalSelectedKeys, setInternalSelectedKeys] = useState<Set<SelectionKey>>(
    () => defaultSelectedKeys ?? new Set()
  );

  const selectedKeys = isControlled ? controlledSelectedKeys : internalSelectedKeys;

  const updateSelection = useCallback(
    (newKeys: Set<SelectionKey>) => {
      if (!isControlled) {
        setInternalSelectedKeys(newKeys);
      }
      onSelectionChange?.(newKeys);
    },
    [isControlled, onSelectionChange]
  );

  // Build current item key set for auto-deselection
  const currentKeySet = useMemo(() => {
    const keys = new Set<SelectionKey>();
    for (let i = 0; i < items.length; i++) {
      keys.add(getItemKey(items[i], i));
    }
    return keys;
  }, [items, getItemKey]);

  // Auto-deselect when items change and selected keys become stale.
  // Uses React's "setState during render" pattern instead of refs.
  // See: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  // Stable ref for onSelectionChange — written in useInsertionEffect (not during render)
  // to satisfy react-hooks/refs, read only in useEffect.
  const onSelectionChangeRef = useRef(onSelectionChange);
  useInsertionEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  });

  const [prevKeySet, setPrevKeySet] = useState(currentKeySet);
  const [pendingPrune, setPendingPrune] = useState<Set<SelectionKey> | null>(null);

  if (!setsEqual(prevKeySet, currentKeySet)) {
    setPrevKeySet(currentKeySet);

    if (selectedKeys.size > 0) {
      let changed = false;
      const prunedKeys = new Set<SelectionKey>();

      for (const key of selectedKeys) {
        if (currentKeySet.has(key)) {
          prunedKeys.add(key);
        } else {
          changed = true;
        }
      }

      if (changed) {
        if (!isControlled) {
          setInternalSelectedKeys(prunedKeys);
        }
        setPendingPrune(prunedKeys);
      }
    }
  }

  // Notify parent of pruned selection via callback (side effects not allowed during render).
  // Only depends on pendingPrune — onSelectionChange is read from a stable ref to prevent
  // infinite re-firing when the consumer passes an unstable callback reference.
  useEffect(() => {
    if (pendingPrune !== null) {
      onSelectionChangeRef.current?.(pendingPrune);
    }
  }, [pendingPrune]);

  const isSelected = useCallback(
    (key: SelectionKey): boolean => selectedKeys.has(key),
    [selectedKeys]
  );

  const handleItemClick = useCallback(
    (key: SelectionKey, event?: React.MouseEvent) => {
      if (selectionMode === 'none') return;

      if (selectionMode === 'single') {
        if (selectedKeys.has(key)) {
          updateSelection(EMPTY_SET);
        } else {
          updateSelection(new Set([key]));
        }
        return;
      }

      // Multiple mode
      if (event?.metaKey || event?.ctrlKey) {
        // Toggle individual item
        const newKeys = new Set(selectedKeys);
        if (newKeys.has(key)) {
          newKeys.delete(key);
        } else {
          newKeys.add(key);
        }
        updateSelection(newKeys);
      } else if (event?.shiftKey) {
        // Range selection: select from last selected to clicked
        const allKeys = Array.from(currentKeySet);
        const lastSelected = Array.from(selectedKeys).pop();
        const lastIndex = lastSelected !== undefined ? allKeys.indexOf(lastSelected) : -1;
        const clickedIndex = allKeys.indexOf(key);

        if (lastIndex === -1 || clickedIndex === -1) {
          updateSelection(new Set([key]));
          return;
        }

        const start = Math.min(lastIndex, clickedIndex);
        const end = Math.max(lastIndex, clickedIndex);
        const rangeKeys = new Set(selectedKeys);
        for (let i = start; i <= end; i++) {
          rangeKeys.add(allKeys[i]);
        }
        updateSelection(rangeKeys);
      } else {
        // Plain click: replace selection
        updateSelection(new Set([key]));
      }
    },
    [selectionMode, selectedKeys, currentKeySet, updateSelection]
  );

  const clearSelection = useCallback(() => {
    updateSelection(EMPTY_SET);
  }, [updateSelection]);

  const selectAll = useCallback(() => {
    if (selectionMode === 'none') return;
    if (selectionMode === 'single') return;
    updateSelection(new Set(currentKeySet));
  }, [selectionMode, currentKeySet, updateSelection]);

  return {
    selectedKeys,
    isSelected,
    handleItemClick,
    clearSelection,
    selectAll,
  };
}
