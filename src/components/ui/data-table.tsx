import { useRef, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type ColumnResizeMode,
  type Row,
} from '@tanstack/react-table';
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
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  loadingMessage?: string;
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
  onScroll,
  emptyMessage = 'No data',
  isLoading = false,
  loadingMessage = 'Loading...',
}: DataTableProps<TData>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: resizable ? columnResizeMode : undefined,
    getRowId,
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
      <div className="flex items-center justify-center p-8 text-(--text-tertiary) text-[13px] italic">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={tableContainerRef}
      className={cn('flex flex-col flex-1 min-h-0 overflow-auto', className)}
      onScroll={handleScroll}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center py-1.5 px-3 border-b border-(--border-color) bg-(--bg-header) text-[11px] font-medium uppercase text-(--text-secondary) sticky top-0 z-10',
          headerClassName
        )}
        style={{ width: table.getCenterTotalSize() }}
      >
        {table.getHeaderGroups().map((headerGroup) =>
          headerGroup.headers.map((header) => (
            <div
              key={header.id}
              className="relative"
              style={{
                width: header.getSize(),
                minWidth: header.column.columnDef.minSize,
                maxWidth: header.column.columnDef.maxSize,
              }}
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

      {/* Body */}
      <div className="flex flex-col">
        {table.getRowModel().rows.map((row) => (
          <div
            key={row.id}
            className={getRowClassName(row)}
            onClick={() => onRowClick?.(row.original)}
            style={{ width: table.getCenterTotalSize() }}
          >
            {row.getVisibleCells().map((cell) => (
              <div
                key={cell.id}
                style={{
                  width: cell.column.getSize(),
                  minWidth: cell.column.columnDef.minSize,
                  maxWidth: cell.column.columnDef.maxSize,
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ))}
          </div>
        ))}
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
