import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type ColumnDef } from './data-table';
import type { SelectionKey } from '@/hooks';

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    scrollToIndex: vi.fn(),
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 20) }, (_, i) => ({
        index: i,
        start: i * 36,
        size: 36,
        key: i,
      })),
  }),
}));

interface TestData {
  id: string;
  name: string;
  value: number;
}

const mockData: TestData[] = [
  { id: '1', name: 'Item 1', value: 100 },
  { id: '2', name: 'Item 2', value: 200 },
  { id: '3', name: 'Item 3', value: 300 },
];

const mockColumns: ColumnDef<TestData, unknown>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Name',
    size: 150,
  },
  {
    id: 'value',
    accessorKey: 'value',
    header: 'Value',
    size: 100,
  },
];

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render table with data', () => {
    render(<DataTable data={mockData} columns={mockColumns} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('should show empty message when no data', () => {
    render(<DataTable data={[]} columns={mockColumns} emptyMessage="No items" />);

    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('should show loading message when loading with empty data', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        isLoading={true}
        loadingMessage="Loading data..."
      />
    );

    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('should call onSelectionChange when row is clicked', () => {
    const onSelectionChange = vi.fn();

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        selectionMode="single"
        selectedKeys={new Set<SelectionKey>()}
        onSelectionChange={onSelectionChange}
        getRowId={(row) => row.id}
      />
    );

    fireEvent.click(screen.getByText('Item 1'));

    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1']));
  });

  it('should call onRowContextMenu when row is right-clicked', () => {
    const onRowContextMenu = vi.fn();

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onRowContextMenu={onRowContextMenu}
        getRowId={(row) => row.id}
      />
    );

    fireEvent.contextMenu(screen.getByText('Item 1'));

    expect(onRowContextMenu).toHaveBeenCalled();
  });

  it('should highlight selected row', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        selectionMode="single"
        selectedKeys={new Set<SelectionKey>(['2'])}
        onSelectionChange={vi.fn()}
        getRowId={(row) => row.id}
      />
    );

    const selectedRow = screen.getByText('Item 2').closest('div[class*="flex items-center"]');
    expect(selectedRow?.className).toContain('bg-(--bg-active)');
  });

  it('should deselect when clicking selected row in single mode', () => {
    const onSelectionChange = vi.fn();

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        selectionMode="single"
        selectedKeys={new Set<SelectionKey>(['1'])}
        onSelectionChange={onSelectionChange}
        getRowId={(row) => row.id}
      />
    );

    fireEvent.click(screen.getByText('Item 1'));

    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it('should not fire selection when selectionMode is not set', () => {
    const onSelectionChange = vi.fn();

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onSelectionChange={onSelectionChange}
        getRowId={(row) => row.id}
      />
    );

    fireEvent.click(screen.getByText('Item 1'));

    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <DataTable data={mockData} columns={mockColumns} className="custom-table" />
    );

    expect(container.firstChild).toHaveClass('custom-table');
  });

  it('should apply custom headerClassName', () => {
    render(<DataTable data={mockData} columns={mockColumns} headerClassName="custom-header" />);

    const header = screen.getByText('Name').closest('[class*="flex items-center py-1.5"]');
    expect(header?.className).toContain('custom-header');
  });

  it('should apply rowClassName as string', () => {
    render(<DataTable data={mockData} columns={mockColumns} rowClassName="custom-row" />);

    const row = screen.getByText('Item 1').closest('div[class*="flex items-center border-b"]');
    expect(row?.className).toContain('custom-row');
  });

  it('should apply rowClassName as function', () => {
    const rowClassName = () => 'dynamic-row';

    render(<DataTable data={mockData} columns={mockColumns} rowClassName={rowClassName} />);

    const row = screen.getByText('Item 1').closest('div[class*="flex items-center border-b"]');
    expect(row?.className).toContain('dynamic-row');
  });

  it('should call onScroll when scrolling', () => {
    const onScroll = vi.fn();

    const { container } = render(
      <DataTable data={mockData} columns={mockColumns} onScroll={onScroll} />
    );

    const scrollContainer = container.querySelector('.overflow-auto');
    if (scrollContainer) {
      fireEvent.scroll(scrollContainer);
      expect(onScroll).toHaveBeenCalled();
    }
  });

  it('should use rowWrapper when provided', () => {
    const rowWrapper = (row: TestData, children: React.ReactNode) => (
      <div data-testid={`wrapper-${row.id}`}>{children}</div>
    );

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        rowWrapper={rowWrapper}
        getRowId={(row) => row.id}
      />
    );

    expect(screen.getByTestId('wrapper-1')).toBeInTheDocument();
    expect(screen.getByTestId('wrapper-2')).toBeInTheDocument();
  });

  it('should render with default empty message', () => {
    render(<DataTable data={[]} columns={mockColumns} />);

    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('should render with default loading message', () => {
    render(<DataTable data={[]} columns={mockColumns} isLoading={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should not show loading when has data even if isLoading is true', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        isLoading={true}
        loadingMessage="Loading..."
      />
    );

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
});
