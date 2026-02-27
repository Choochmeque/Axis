import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FileDiff, StashEntry } from '@/types';
import { DiffLineType, DiffStatus } from '@/types';
import { StashDiffView } from './StashDiffView';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('StashDiffView', () => {
  const mockStash: StashEntry = {
    index: 0,
    stashRef: 'stash@{0}',
    message: 'WIP on main: feat add new feature',
    branch: 'main',
    author: 'John Doe',
    timestamp: '2024-01-15T10:00:00Z',
    commitOid: 'abc123def456789',
    shortOid: 'abc123d',
  };

  const mockFiles: FileDiff[] = [
    {
      oldPath: 'src/file1.ts',
      newPath: 'src/file1.ts',
      oldOid: 'abc123',
      newOid: 'def456',
      status: DiffStatus.Modified,
      additions: 10,
      deletions: 5,
      binary: false,
      hunks: [
        {
          header: '@@ -1,5 +1,10 @@',
          oldStart: 1,
          oldLines: 5,
          newStart: 1,
          newLines: 10,
          lines: [
            { oldLineNo: 1, newLineNo: 1, content: 'const a = 1;', lineType: DiffLineType.Context },
            {
              oldLineNo: 2,
              newLineNo: null,
              content: 'const b = 2;',
              lineType: DiffLineType.Deletion,
            },
            {
              oldLineNo: null,
              newLineNo: 2,
              content: 'const b = 3;',
              lineType: DiffLineType.Addition,
            },
          ],
        },
      ],
    },
    {
      oldPath: null,
      newPath: 'src/file2.ts',
      oldOid: null,
      newOid: 'ghi789',
      status: DiffStatus.Added,
      additions: 20,
      deletions: 0,
      binary: false,
      hunks: [],
    },
  ];

  const defaultProps = {
    stash: mockStash,
    files: mockFiles,
    isLoading: false,
    onClose: vi.fn(),
  };

  it('should render stash message in header', () => {
    render(<StashDiffView {...defaultProps} />);

    expect(screen.getByText('WIP on main: feat add new feature')).toBeInTheDocument();
  });

  it('should display stash branch', () => {
    render(<StashDiffView {...defaultProps} />);

    // Branch appears in the "on branch · author" text
    expect(screen.getAllByText(/main/).length).toBeGreaterThanOrEqual(1);
  });

  it('should display stash author', () => {
    render(<StashDiffView {...defaultProps} />);

    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
  });

  it('should display total additions', () => {
    render(<StashDiffView {...defaultProps} />);

    // Total additions: 10 + 20 = 30
    expect(screen.getAllByText('+30').length).toBeGreaterThanOrEqual(1);
  });

  it('should display total deletions', () => {
    render(<StashDiffView {...defaultProps} />);

    // Total deletions: 5
    expect(screen.getAllByText('-5').length).toBeGreaterThanOrEqual(1);
  });

  it('should display files count', () => {
    render(<StashDiffView {...defaultProps} />);

    expect(screen.getByText('stash.diffView.filesCount {"count":2}')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<StashDiffView {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByTitle('stash.diffView.close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<StashDiffView {...defaultProps} isLoading={true} />);

    expect(screen.getByText('stash.diffView.loading')).toBeInTheDocument();
  });

  it('should show empty state when no files', () => {
    render(<StashDiffView {...defaultProps} files={[]} />);

    expect(screen.getByText('stash.diffView.noChanges')).toBeInTheDocument();
  });

  it('should display file names', () => {
    render(<StashDiffView {...defaultProps} />);

    expect(screen.getByText('src/file1.ts')).toBeInTheDocument();
    expect(screen.getByText('src/file2.ts')).toBeInTheDocument();
  });

  it('should display file status', () => {
    render(<StashDiffView {...defaultProps} />);

    expect(screen.getByText('diff.status.modified')).toBeInTheDocument();
    expect(screen.getByText('diff.status.added')).toBeInTheDocument();
  });

  it('should display file additions and deletions', () => {
    render(<StashDiffView {...defaultProps} />);

    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('+20')).toBeInTheDocument();
  });

  it('should display hunk header', () => {
    render(<StashDiffView {...defaultProps} />);

    expect(screen.getByText('@@ -1,5 +1,10 @@')).toBeInTheDocument();
  });

  it('should render binary file indicator', () => {
    const binaryFile: FileDiff = {
      oldPath: 'image.png',
      newPath: 'image.png',
      oldOid: 'abc123',
      newOid: 'def456',
      status: DiffStatus.Modified,
      additions: 0,
      deletions: 0,
      binary: true,
      hunks: [],
    };

    render(<StashDiffView {...defaultProps} files={[binaryFile]} />);

    expect(screen.getByText('stash.diffView.binaryFile')).toBeInTheDocument();
  });

  it('should render stash ref as fallback message', () => {
    const stashWithoutMessage: StashEntry = {
      ...mockStash,
      message: '',
    };

    render(<StashDiffView {...defaultProps} stash={stashWithoutMessage} />);

    expect(screen.getByText('stash@{0}')).toBeInTheDocument();
  });

  it('should display diff lines', () => {
    render(<StashDiffView {...defaultProps} />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
    expect(screen.getByText('const b = 2;')).toBeInTheDocument();
    expect(screen.getByText('const b = 3;')).toBeInTheDocument();
  });

  it('should show no file changes message when hunks are empty', () => {
    render(<StashDiffView {...defaultProps} />);

    // The second file has no hunks
    expect(screen.getByText('stash.diffView.noFileChanges')).toBeInTheDocument();
  });
});
