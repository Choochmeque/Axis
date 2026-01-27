import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualList } from './virtual-list';

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
});
