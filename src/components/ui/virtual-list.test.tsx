import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualList } from './virtual-list';
import type { SelectionKey } from '@/hooks';

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 72,
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 10) }, (_, i) => ({
        index: i,
        start: i * 72,
        size: 72,
        key: i,
      })),
  }),
}));

describe('VirtualList', () => {
  const mockItems = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
  ];

  const defaultProps = {
    items: mockItems,
    getItemKey: (item: { id: string }) => item.id,
    children: (item: { id: string; name: string }) => <div>{item.name}</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render items', () => {
    render(<VirtualList {...defaultProps} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('should show loading state when loading with empty items', () => {
    render(
      <VirtualList {...defaultProps} items={[]} isLoading={true} loadingMessage="Loading..." />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show empty message when no items', () => {
    render(<VirtualList {...defaultProps} items={[]} emptyMessage="No items found" />);

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should call onItemClick when item is clicked', () => {
    const onItemClick = vi.fn();

    render(<VirtualList {...defaultProps} onItemClick={onItemClick} />);

    fireEvent.click(screen.getByText('Item 1'));

    expect(onItemClick).toHaveBeenCalledWith(mockItems[0], 0);
  });

  it('should apply selected class to selected item', () => {
    render(<VirtualList {...defaultProps} selectedItemKey="2" selectedClassName="selected" />);

    const selectedItem = screen.getByText('Item 2').parentElement;
    expect(selectedItem?.className).toContain('selected');
  });

  it('should apply custom className', () => {
    const { container } = render(<VirtualList {...defaultProps} className="custom-list" />);

    expect(container.firstChild).toHaveClass('custom-list');
  });

  it('should apply itemClassName as string', () => {
    render(<VirtualList {...defaultProps} itemClassName="custom-item" />);

    const item = screen.getByText('Item 1').parentElement;
    expect(item?.className).toContain('custom-item');
  });

  it('should apply itemClassName as function', () => {
    const itemClassName = (item: { id: string }) => `item-${item.id}`;

    render(<VirtualList {...defaultProps} itemClassName={itemClassName} />);

    const item = screen.getByText('Item 1').parentElement;
    expect(item?.className).toContain('item-1');
  });

  it('should show loading more indicator', () => {
    render(
      <VirtualList {...defaultProps} isLoadingMore={true} loadingMoreMessage="Loading more..." />
    );

    expect(screen.getByText('Loading more...')).toBeInTheDocument();
  });

  it('should not show loading state when loading but has items', () => {
    render(<VirtualList {...defaultProps} isLoading={true} loadingMessage="Loading..." />);

    // Should show items, not loading message
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should use default selected className when not provided', () => {
    render(<VirtualList {...defaultProps} selectedItemKey="1" />);

    const selectedItem = screen.getByText('Item 1').parentElement;
    expect(selectedItem?.className).toContain('virtual-list-item--selected');
  });

  // New selection API tests
  describe('new selection API', () => {
    it('should call onSelectionChange when item is clicked', () => {
      const onSelectionChange = vi.fn();

      render(
        <VirtualList
          {...defaultProps}
          selectionMode="single"
          selectedKeys={new Set<SelectionKey>()}
          onSelectionChange={onSelectionChange}
        />
      );

      fireEvent.click(screen.getByText('Item 2'));

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['2']));
    });

    it('should apply selected class to items using selectedKeys', () => {
      render(
        <VirtualList
          {...defaultProps}
          selectionMode="single"
          selectedKeys={new Set<SelectionKey>(['2'])}
          onSelectionChange={vi.fn()}
          selectedClassName="selected"
        />
      );

      const selectedItem = screen.getByText('Item 2').parentElement;
      expect(selectedItem?.className).toContain('selected');

      const unselectedItem = screen.getByText('Item 1').parentElement;
      expect(unselectedItem?.className).not.toContain('selected');
    });

    it('should call onSelectionChange with empty set when selected item is removed', () => {
      const onSelectionChange = vi.fn();

      const { rerender } = render(
        <VirtualList
          {...defaultProps}
          selectionMode="single"
          selectedKeys={new Set<SelectionKey>(['2'])}
          onSelectionChange={onSelectionChange}
        />
      );

      // Re-render without item '2'
      const newItems = [
        { id: '1', name: 'Item 1' },
        { id: '3', name: 'Item 3' },
      ];

      rerender(
        <VirtualList
          {...defaultProps}
          items={newItems}
          selectionMode="single"
          selectedKeys={new Set<SelectionKey>(['2'])}
          onSelectionChange={onSelectionChange}
        />
      );

      expect(onSelectionChange).toHaveBeenCalledWith(new Set());
    });

    it('should deselect when clicking the already selected item in single mode', () => {
      const onSelectionChange = vi.fn();

      render(
        <VirtualList
          {...defaultProps}
          selectionMode="single"
          selectedKeys={new Set<SelectionKey>(['1'])}
          onSelectionChange={onSelectionChange}
        />
      );

      fireEvent.click(screen.getByText('Item 1'));

      expect(onSelectionChange).toHaveBeenCalledWith(new Set());
    });

    it('should warn when both legacy and new APIs are provided', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(
        <VirtualList
          {...defaultProps}
          selectedItemKey="1"
          onItemClick={vi.fn()}
          selectedKeys={new Set<SelectionKey>(['1'])}
          onSelectionChange={vi.fn()}
        />
      );

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('both legacy'));
    });

    it('should use default selected className with new API', () => {
      render(
        <VirtualList
          {...defaultProps}
          selectionMode="single"
          selectedKeys={new Set<SelectionKey>(['1'])}
          onSelectionChange={vi.fn()}
        />
      );

      const selectedItem = screen.getByText('Item 1').parentElement;
      expect(selectedItem?.className).toContain('virtual-list-item--selected');
    });

    it('should not select in none mode', () => {
      const onSelectionChange = vi.fn();

      render(
        <VirtualList
          {...defaultProps}
          selectionMode="none"
          selectedKeys={new Set<SelectionKey>()}
          onSelectionChange={onSelectionChange}
        />
      );

      fireEvent.click(screen.getByText('Item 1'));

      expect(onSelectionChange).not.toHaveBeenCalled();
    });
  });
});
