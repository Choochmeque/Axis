import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileStatusList, FluidFileList } from './FileStatusList';
import { StatusType } from '@/types';
import type { FileStatus } from '@/types';
import type { SelectionKey } from '@/hooks';
import { StagingViewMode } from './StagingFilters';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  testId: (id: string) => ({ 'aria-label': id, 'data-testid': id }),
}));

vi.mock('./StagingFileContextMenu', () => ({
  StagingFileContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid="checkbox"
    />
  ),
  TreeView: ({
    data,
    renderItem: _renderItem,
  }: {
    data: unknown[];
    renderItem: (props: unknown) => React.ReactNode;
  }) => <div data-testid="tree-view">{JSON.stringify(data)}</div>,
  VirtualList: ({
    items,
    children,
    onSelectionChange,
    selectedKeys,
    emptyMessage,
  }: {
    items: FileStatus[];
    children: (item: FileStatus) => React.ReactNode;
    onSelectionChange?: (keys: Set<SelectionKey>) => void;
    selectedKeys?: Set<SelectionKey>;
    emptyMessage?: string;
  }) => (
    <div data-testid="virtual-list">
      {items.length === 0 && emptyMessage && <div>{emptyMessage}</div>}
      {items.map((item, idx) => (
        <div
          key={idx}
          data-testid={`file-item-${idx}`}
          data-selected={selectedKeys?.has(item.path) ? 'true' : 'false'}
          onClick={() => onSelectionChange?.(new Set([item.path]))}
        >
          {children(item)}
        </div>
      ))}
      <button data-testid="clear-selection" onClick={() => onSelectionChange?.(new Set())} />
    </div>
  ),
  buildTreeFromPaths: vi.fn(() => []),
}));

describe('FileStatusList', () => {
  const mockFiles: FileStatus[] = [
    {
      path: 'src/file1.ts',
      status: StatusType.Modified,
      stagedStatus: StatusType.Modified,
      unstagedStatus: null,
      isConflict: false,
      oldPath: null,
    },
    {
      path: 'src/file2.ts',
      status: StatusType.Added,
      stagedStatus: null,
      unstagedStatus: StatusType.Added,
      isConflict: false,
      oldPath: null,
    },
  ];

  const defaultProps = {
    files: mockFiles,
    selectedFile: null,
    onSelectFile: vi.fn(),
  };

  it('should render VirtualList with empty message when files array is empty', () => {
    render(<FileStatusList {...defaultProps} files={[]} emptyMessage="No changes" />);

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    expect(screen.getByText('No changes')).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    render(<FileStatusList {...defaultProps} title="Staged Files" />);

    expect(screen.getByText('Staged Files')).toBeInTheDocument();
  });

  it('should show file count in badge', () => {
    render(<FileStatusList {...defaultProps} title="Staged Files" />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render VirtualList in FlatSingle mode', () => {
    render(<FileStatusList {...defaultProps} viewMode={StagingViewMode.FlatSingle} />);

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
  });

  it('should render table header in FlatMulti mode', () => {
    render(<FileStatusList {...defaultProps} viewMode={StagingViewMode.FlatMulti} />);

    expect(screen.getByText('staging.fileList.filename')).toBeInTheDocument();
    expect(screen.getByText('staging.fileList.path')).toBeInTheDocument();
  });

  it('should render files', () => {
    render(<FileStatusList {...defaultProps} />);

    expect(screen.getByTestId('file-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-1')).toBeInTheDocument();
  });

  it('should pass onStage callback when showStageButton is true', () => {
    const onStage = vi.fn();

    render(<FileStatusList {...defaultProps} showStageButton onStage={onStage} />);

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
  });

  it('should pass onUnstage callback when showUnstageButton is true', () => {
    const onUnstage = vi.fn();

    render(<FileStatusList {...defaultProps} showUnstageButton onUnstage={onUnstage} />);

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
  });

  it('should pass onDiscard callback when showDiscardButton is true', () => {
    const onDiscard = vi.fn();

    render(<FileStatusList {...defaultProps} showDiscardButton onDiscard={onDiscard} />);

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
  });

  it('should call onSelectFile with file when item is selected', () => {
    const onSelectFile = vi.fn();

    render(<FileStatusList {...defaultProps} onSelectFile={onSelectFile} />);

    fireEvent.click(screen.getByTestId('file-item-0'));

    expect(onSelectFile).toHaveBeenCalledWith(mockFiles[0]);
  });

  it('should call onSelectFile with null when selection is cleared', () => {
    const onSelectFile = vi.fn();

    render(<FileStatusList {...defaultProps} onSelectFile={onSelectFile} />);

    fireEvent.click(screen.getByTestId('clear-selection'));

    expect(onSelectFile).toHaveBeenCalledWith(null);
  });

  it('should display renamed files as OldName → NewName', () => {
    const renamedFiles: FileStatus[] = [
      {
        path: 'src/components/new-name.tsx',
        status: StatusType.Renamed,
        stagedStatus: StatusType.Renamed,
        unstagedStatus: null,
        isConflict: false,
        oldPath: 'src/components/OldName.tsx',
      },
    ];

    render(
      <FileStatusList
        {...defaultProps}
        files={renamedFiles}
        showUnstageButton
        onUnstage={vi.fn()}
      />
    );

    expect(screen.getByText('OldName.tsx → new-name.tsx')).toBeInTheDocument();
  });

  it('should display non-renamed files with just the filename', () => {
    render(<FileStatusList {...defaultProps} showStageButton onStage={vi.fn()} />);

    expect(screen.getByText('file1.ts')).toBeInTheDocument();
    expect(screen.getByText('file2.ts')).toBeInTheDocument();
  });

  it('should show full path tooltip for renamed files', () => {
    const renamedFiles: FileStatus[] = [
      {
        path: 'src/ui/new-name.tsx',
        status: StatusType.Renamed,
        stagedStatus: StatusType.Renamed,
        unstagedStatus: null,
        isConflict: false,
        oldPath: 'src/ui/OldName.tsx',
      },
    ];

    render(
      <FileStatusList
        {...defaultProps}
        files={renamedFiles}
        showUnstageButton
        onUnstage={vi.fn()}
      />
    );

    const fileSpan = screen.getByText('OldName.tsx → new-name.tsx');
    expect(fileSpan).toHaveAttribute('title', 'src/ui/OldName.tsx → src/ui/new-name.tsx');
  });
});

describe('FluidFileList', () => {
  const mockFluidFiles = [
    {
      path: 'src/file1.ts',
      status: StatusType.Modified,
      stagedStatus: StatusType.Modified,
      unstagedStatus: null,
      isStaged: true,
      isConflict: false,
      oldPath: null,
    },
    {
      path: 'src/file2.ts',
      status: StatusType.Added,
      stagedStatus: null,
      unstagedStatus: StatusType.Added,
      isStaged: false,
      isConflict: false,
      oldPath: null,
    },
  ];

  const defaultProps = {
    files: mockFluidFiles,
    selectedFile: null,
    onSelectFile: vi.fn(),
    onStage: vi.fn(),
    onUnstage: vi.fn(),
    onDiscard: vi.fn(),
  };

  it('should show empty message when no files', () => {
    render(<FluidFileList {...defaultProps} files={[]} emptyMessage="No changes" />);

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    expect(screen.getByText('No changes')).toBeInTheDocument();
  });

  it('should render VirtualList in FlatSingle mode', () => {
    render(<FluidFileList {...defaultProps} viewMode={StagingViewMode.FlatSingle} />);

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
  });

  it('should render files', () => {
    render(<FluidFileList {...defaultProps} />);

    expect(screen.getByTestId('file-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-1')).toBeInTheDocument();
  });

  it('should call onSelectFile with file and isStaged when item is selected', () => {
    const onSelectFile = vi.fn();

    render(<FluidFileList {...defaultProps} onSelectFile={onSelectFile} />);

    fireEvent.click(screen.getByTestId('file-item-0'));

    expect(onSelectFile).toHaveBeenCalledWith(mockFluidFiles[0], true);
  });

  it('should call onSelectFile with null when selection is cleared', () => {
    const onSelectFile = vi.fn();

    render(<FluidFileList {...defaultProps} onSelectFile={onSelectFile} />);

    fireEvent.click(screen.getByTestId('clear-selection'));

    expect(onSelectFile).toHaveBeenCalledWith(null, false);
  });

  it('should display renamed files as OldName → NewName in fluid view', () => {
    const renamedFluidFiles = [
      {
        path: 'src/components/new-name.tsx',
        status: StatusType.Renamed,
        stagedStatus: StatusType.Renamed,
        unstagedStatus: null,
        isStaged: true,
        isConflict: false,
        oldPath: 'src/components/OldName.tsx',
      },
    ];

    render(<FluidFileList {...defaultProps} files={renamedFluidFiles} />);

    expect(screen.getByText('OldName.tsx → new-name.tsx')).toBeInTheDocument();
  });

  it('should display non-renamed files with just the filename in fluid view', () => {
    render(<FluidFileList {...defaultProps} />);

    expect(screen.getByText('file1.ts')).toBeInTheDocument();
    expect(screen.getByText('file2.ts')).toBeInTheDocument();
  });
});
