import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SelectionKey } from './useListSelection';
import { useListSelection } from './useListSelection';

interface TestItem {
  id: string;
  name: string;
}

const getItemKey = (item: TestItem) => item.id;

const makeItems = (...ids: string[]): TestItem[] => ids.map((id) => ({ id, name: `Item ${id}` }));

describe('useListSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with empty selection by default', () => {
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
        })
      );

      expect(result.current.selectedKeys.size).toBe(0);
    });

    it('should start with defaultSelectedKeys when provided', () => {
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          defaultSelectedKeys: new Set<SelectionKey>(['2']),
        })
      );

      expect(result.current.selectedKeys).toEqual(new Set(['2']));
      expect(result.current.isSelected('2')).toBe(true);
      expect(result.current.isSelected('1')).toBe(false);
    });
  });

  describe('single mode', () => {
    it('should select an item on click', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'single',
          onSelectionChange,
        })
      );

      act(() => {
        result.current.handleItemClick('2');
      });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['2']));
    });

    it('should deselect when clicking the already selected item', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'single',
          defaultSelectedKeys: new Set<SelectionKey>(['2']),
          onSelectionChange,
        })
      );

      act(() => {
        result.current.handleItemClick('2');
      });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set());
    });

    it('should replace selection when clicking a different item', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'single',
          defaultSelectedKeys: new Set<SelectionKey>(['1']),
          onSelectionChange,
        })
      );

      act(() => {
        result.current.handleItemClick('3');
      });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['3']));
    });
  });

  describe('auto-deselection', () => {
    it('should clear selection when selected item is removed from items', () => {
      const onSelectionChange = vi.fn();
      const items = makeItems('1', '2', '3');

      const { rerender } = renderHook(
        ({ items: hookItems }) =>
          useListSelection({
            items: hookItems,
            getItemKey,
            selectionMode: 'single',
            defaultSelectedKeys: new Set<SelectionKey>(['2']),
            onSelectionChange,
          }),
        { initialProps: { items } }
      );

      // Remove item '2' from the list
      rerender({ items: makeItems('1', '3') });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set());
    });

    it('should not fire callback when items change but selection is still valid', () => {
      const onSelectionChange = vi.fn();
      const items = makeItems('1', '2', '3');

      const { rerender } = renderHook(
        ({ items: hookItems }) =>
          useListSelection({
            items: hookItems,
            getItemKey,
            selectionMode: 'single',
            defaultSelectedKeys: new Set<SelectionKey>(['2']),
            onSelectionChange,
          }),
        { initialProps: { items } }
      );

      // Remove item '3' — selected item '2' is still present
      rerender({ items: makeItems('1', '2') });

      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it('should prune only missing keys when multiple are selected', () => {
      const onSelectionChange = vi.fn();
      const items = makeItems('1', '2', '3', '4');

      const { rerender } = renderHook(
        ({ items: hookItems }) =>
          useListSelection({
            items: hookItems,
            getItemKey,
            selectionMode: 'multiple',
            defaultSelectedKeys: new Set<SelectionKey>(['2', '4']),
            onSelectionChange,
          }),
        { initialProps: { items } }
      );

      // Remove item '4', keep '2'
      rerender({ items: makeItems('1', '2', '3') });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['2']));
    });

    it('should not fire callback when items are the same reference', () => {
      const onSelectionChange = vi.fn();
      const items = makeItems('1', '2', '3');

      const { rerender } = renderHook(
        ({ items: hookItems }) =>
          useListSelection({
            items: hookItems,
            getItemKey,
            selectionMode: 'single',
            defaultSelectedKeys: new Set<SelectionKey>(['2']),
            onSelectionChange,
          }),
        { initialProps: { items } }
      );

      // Re-render with same items reference
      rerender({ items });

      expect(onSelectionChange).not.toHaveBeenCalled();
    });
  });

  describe('controlled mode', () => {
    it('should use controlled selectedKeys', () => {
      const controlledKeys = new Set<SelectionKey>(['1']);
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'single',
          selectedKeys: controlledKeys,
        })
      );

      expect(result.current.selectedKeys).toBe(controlledKeys);
      expect(result.current.isSelected('1')).toBe(true);
    });

    it('should call onSelectionChange but not update internal state in controlled mode', () => {
      const onSelectionChange = vi.fn();
      const controlledKeys = new Set<SelectionKey>(['1']);

      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'single',
          selectedKeys: controlledKeys,
          onSelectionChange,
        })
      );

      act(() => {
        result.current.handleItemClick('2');
      });

      // Should fire callback
      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['2']));
      // But selectedKeys still reflects the controlled prop
      expect(result.current.selectedKeys).toBe(controlledKeys);
    });
  });

  describe('none mode', () => {
    it('should ignore clicks in none mode', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'none',
          onSelectionChange,
        })
      );

      act(() => {
        result.current.handleItemClick('1');
      });

      expect(onSelectionChange).not.toHaveBeenCalled();
      expect(result.current.selectedKeys.size).toBe(0);
    });
  });

  describe('multiple mode', () => {
    it('should replace selection on plain click', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'multiple',
          defaultSelectedKeys: new Set<SelectionKey>(['1', '2']),
          onSelectionChange,
        })
      );

      act(() => {
        result.current.handleItemClick('3');
      });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['3']));
    });

    it('should toggle individual item on Ctrl+Click', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'multiple',
          defaultSelectedKeys: new Set<SelectionKey>(['1']),
          onSelectionChange,
        })
      );

      act(() => {
        result.current.handleItemClick('2', { ctrlKey: true } as React.MouseEvent);
      });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1', '2']));
    });

    it('should remove item on Ctrl+Click if already selected', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'multiple',
          defaultSelectedKeys: new Set<SelectionKey>(['1', '2']),
          onSelectionChange,
        })
      );

      act(() => {
        result.current.handleItemClick('1', { ctrlKey: true } as React.MouseEvent);
      });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['2']));
    });

    it('should toggle individual item on Meta+Click (macOS)', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'multiple',
          defaultSelectedKeys: new Set<SelectionKey>(['1']),
          onSelectionChange,
        })
      );

      act(() => {
        result.current.handleItemClick('3', { metaKey: true } as React.MouseEvent);
      });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1', '3']));
    });

    it('should select range on Shift+Click', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3', '4', '5'),
          getItemKey,
          selectionMode: 'multiple',
          defaultSelectedKeys: new Set<SelectionKey>(['2']),
          onSelectionChange,
        })
      );

      act(() => {
        result.current.handleItemClick('4', { shiftKey: true } as React.MouseEvent);
      });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['2', '3', '4']));
    });

    it('should select just the item on Shift+Click with no prior selection', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'multiple',
          onSelectionChange,
        })
      );

      act(() => {
        result.current.handleItemClick('2', { shiftKey: true } as React.MouseEvent);
      });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['2']));
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected keys', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'single',
          defaultSelectedKeys: new Set<SelectionKey>(['2']),
          onSelectionChange,
        })
      );

      act(() => {
        result.current.clearSelection();
      });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set());
    });
  });

  describe('selectAll', () => {
    it('should select all items in multiple mode', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'multiple',
          onSelectionChange,
        })
      );

      act(() => {
        result.current.selectAll();
      });

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1', '2', '3']));
    });

    it('should do nothing in single mode', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'single',
          onSelectionChange,
        })
      );

      act(() => {
        result.current.selectAll();
      });

      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it('should do nothing in none mode', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          selectionMode: 'none',
          onSelectionChange,
        })
      );

      act(() => {
        result.current.selectAll();
      });

      expect(onSelectionChange).not.toHaveBeenCalled();
    });
  });

  describe('isSelected', () => {
    it('should return true for selected keys', () => {
      const { result } = renderHook(() =>
        useListSelection({
          items: makeItems('1', '2', '3'),
          getItemKey,
          defaultSelectedKeys: new Set<SelectionKey>(['1', '3']),
          selectionMode: 'multiple',
        })
      );

      expect(result.current.isSelected('1')).toBe(true);
      expect(result.current.isSelected('2')).toBe(false);
      expect(result.current.isSelected('3')).toBe(true);
    });
  });
});
