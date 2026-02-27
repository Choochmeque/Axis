import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FileDiff } from '@/types';
import { DiffStatus } from '@/types';
import { CommitFileList } from './CommitFileList';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/components/ui', () => ({
  VirtualList: ({
    items,
    children,
    isLoading,
    loadingMessage,
    emptyMessage,
  }: {
    items: FileDiff[];
    children: (item: FileDiff) => React.ReactNode;
    isLoading?: boolean;
    loadingMessage?: string;
    emptyMessage?: string;
  }) => (
    <div data-testid="virtual-list">
      {isLoading && items.length === 0 && loadingMessage && <div>{loadingMessage}</div>}
      {!isLoading && items.length === 0 && emptyMessage && <div>{emptyMessage}</div>}
      {items.map((item, idx) => (
        <div key={idx} data-testid={`file-item-${idx}`}>
          {children(item)}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('./HistoryFileContextMenu', () => ({
  HistoryFileContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('CommitFileList', () => {
  const mockFiles: FileDiff[] = [
    {
      oldPath: null,
      newPath: 'src/components/Test.tsx',
      oldOid: null,
      newOid: 'abc123',
      status: DiffStatus.Added,
      binary: false,
      hunks: [],
      additions: 50,
      deletions: 0,
    },
    {
      oldPath: 'src/utils/helper.ts',
      newPath: 'src/utils/helper.ts',
      oldOid: 'def456',
      newOid: 'ghi789',
      status: DiffStatus.Modified,
      binary: false,
      hunks: [],
      additions: 10,
      deletions: 5,
    },
    {
      oldPath: 'src/old.ts',
      newPath: null,
      oldOid: 'jkl012',
      newOid: null,
      status: DiffStatus.Deleted,
      binary: false,
      hunks: [],
      additions: 0,
      deletions: 20,
    },
  ];

  const defaultProps = {
    files: mockFiles,
    selectedFile: null,
    onSelectFile: vi.fn(),
  };

  it('should render loading state', () => {
    render(<CommitFileList {...defaultProps} files={[]} isLoading={true} />);

    expect(screen.getByText('history.fileList.loading')).toBeInTheDocument();
  });

  it('should render empty state', () => {
    render(<CommitFileList {...defaultProps} files={[]} />);

    expect(screen.getByText('history.fileList.noChanges')).toBeInTheDocument();
  });

  it('should render file list header', () => {
    render(<CommitFileList {...defaultProps} />);

    expect(screen.getByText('history.fileList.title')).toBeInTheDocument();
  });

  it('should render file count badge', () => {
    render(<CommitFileList {...defaultProps} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render total additions', () => {
    render(<CommitFileList {...defaultProps} />);

    expect(screen.getByText('+60')).toBeInTheDocument();
  });

  it('should render total deletions', () => {
    render(<CommitFileList {...defaultProps} />);

    expect(screen.getByText('-25')).toBeInTheDocument();
  });

  it('should render files via VirtualList', () => {
    render(<CommitFileList {...defaultProps} />);

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('file-item-2')).toBeInTheDocument();
  });

  it('should render file names', () => {
    render(<CommitFileList {...defaultProps} />);

    expect(screen.getByText('Test.tsx')).toBeInTheDocument();
    expect(screen.getByText('helper.ts')).toBeInTheDocument();
    expect(screen.getByText('old.ts')).toBeInTheDocument();
  });

  it('should render status indicators', () => {
    render(<CommitFileList {...defaultProps} />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('should render file additions/deletions', () => {
    render(<CommitFileList {...defaultProps} />);

    expect(screen.getByText('+50')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('-5')).toBeInTheDocument();
    expect(screen.getByText('-20')).toBeInTheDocument();
  });

  it('should render directory paths', () => {
    render(<CommitFileList {...defaultProps} />);

    const dirs = screen.getAllByTitle('src/components/Test.tsx');
    expect(dirs.length).toBeGreaterThan(0);
  });

  it('should pass commitOid to context menu', () => {
    render(<CommitFileList {...defaultProps} commitOid="abc123" />);

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
  });

  it('should render renamed files as OldName → NewName', () => {
    const renamedFile: FileDiff = {
      oldPath: 'src/oldName.ts',
      newPath: 'src/newName.ts',
      oldOid: 'abc',
      newOid: 'def',
      status: DiffStatus.Renamed,
      binary: false,
      hunks: [],
      additions: 0,
      deletions: 0,
    };

    render(<CommitFileList {...defaultProps} files={[renamedFile]} />);

    expect(screen.getByText('oldName.ts → newName.ts')).toBeInTheDocument();
  });

  it('should show full path tooltip for renamed files', () => {
    const renamedFile: FileDiff = {
      oldPath: 'src/old/oldName.ts',
      newPath: 'src/new/newName.ts',
      oldOid: 'abc',
      newOid: 'def',
      status: DiffStatus.Renamed,
      binary: false,
      hunks: [],
      additions: 0,
      deletions: 0,
    };

    render(<CommitFileList {...defaultProps} files={[renamedFile]} />);

    const fileSpan = screen.getByText('oldName.ts → newName.ts');
    expect(fileSpan).toHaveAttribute('title', 'src/old/oldName.ts → src/new/newName.ts');
  });

  it('should render non-renamed files with just the filename', () => {
    render(<CommitFileList {...defaultProps} />);

    expect(screen.getByText('Test.tsx')).toBeInTheDocument();
    expect(screen.getByText('helper.ts')).toBeInTheDocument();
  });
});
