import { useRef, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type ColumnResizeMode,
  type Row,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  selectedRowId?: string | null;
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
  resizable?: boolean;
  columnResizeMode?: ColumnResizeMode;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: Row<TData>) => string);
  rowWrapper?: (row: TData, children: React.ReactNode) => React.ReactNode;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  rowHeight?: number;
}

export function DataTable<TData>({
  data,
  columns,
  selectedRowId,
  onRowClick,
  getRowId,
  resizable = true,
  columnResizeMode = 'onChange',
  className,
  headerClassName,
  rowClassName,
  rowWrapper,
  onScroll,
  emptyMessage = 'No data',
  isLoading = false,
  loadingMessage = 'Loading...',
  rowHeight = 36,
}: DataTableProps<TData>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: resizable ? columnResizeMode : undefined,
    getRowId,
  });

  const { rows } = table.getRowModel();

  const totalHeight = rows.length * rowHeight;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      onScroll?.(event);
    },
    [onScroll]
  );

  const getRowClassName = useCallback(
    (row: Row<TData>) => {
      const baseClass =
        'flex items-center border-b border-(--border-color) cursor-pointer transition-colors hover:bg-(--bg-hover)';
      const selectedClass =
        getRowId && selectedRowId === getRowId(row.original) ? 'bg-(--bg-active)' : '';
      const customClass = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName;
      return cn(baseClass, selectedClass, customClass);
    },
    [selectedRowId, getRowId, rowClassName]
  );

  if (isLoading && data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-(--text-secondary)">
        {loadingMessage}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-(--text-tertiary) text-base italic">
        {emptyMessage}
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={cn('flex flex-col flex-1 min-h-0', className)}>
      {/* Header - fixed outside scroll area */}
      <div
        className={cn(
          'flex items-center py-1.5 px-3 border-b border-(--border-color) bg-(--bg-header) text-sm font-medium uppercase text-(--text-secondary) shrink-0',
          headerClassName
        )}
      >
        {table.getHeaderGroups().map((headerGroup) =>
          headerGroup.headers.map((header) => (
            <div
              key={header.id}
              className={cn(
                'relative',
                (header.column.columnDef.meta as { autoSize?: boolean })?.autoSize
                  ? 'flex-1 min-w-0'
                  : 'shrink-0'
              )}
              style={
                (header.column.columnDef.meta as { autoSize?: boolean })?.autoSize
                  ? { minWidth: header.column.columnDef.minSize }
                  : {
                      width: header.getSize(),
                      minWidth: header.column.columnDef.minSize,
                      maxWidth: header.column.columnDef.maxSize,
                    }
              }
            >
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
              {resizable && header.column.getCanResize() && (
                <div
                  onMouseDown={header.getResizeHandler()}
                  onTouchStart={header.getResizeHandler()}
                  className={cn(
                    'col-divider absolute right-0 top-0 h-full',
                    header.column.getIsResizing() && 'bg-(--accent-color)'
                  )}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Body - Scrollable virtualized area */}
      <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-0" onScroll={handleScroll}>
        <div style={{ height: totalHeight, position: 'relative' }}>
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index];
            const rowContent = (
              <div
                key={row.id}
                className={getRowClassName(row)}
                onClick={() => onRowClick?.(row.original)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: rowHeight,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className={
                      (cell.column.columnDef.meta as { autoSize?: boolean })?.autoSize
                        ? 'flex-1 min-w-0'
                        : 'shrink-0'
                    }
                    style={
                      (cell.column.columnDef.meta as { autoSize?: boolean })?.autoSize
                        ? { minWidth: cell.column.columnDef.minSize }
                        : {
                            width: cell.column.getSize(),
                            minWidth: cell.column.columnDef.minSize,
                            maxWidth: cell.column.columnDef.maxSize,
                          }
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
            return rowWrapper ? rowWrapper(row.original, rowContent) : rowContent;
          })}
        </div>
      </div>
    </div>
  );
}

// Re-export useful types and utilities from @tanstack/react-table
export {
  createColumnHelper,
  type ColumnDef,
  type Row,
  type Table,
  type CellContext,
  type HeaderContext,
} from '@tanstack/react-table';
