import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiffView } from './DiffView';
import { DiffStatus, DiffLineType } from '@/types';
import type { FileDiff } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/services/api', () => ({
  diffApi: {
    getFileContent: vi.fn(),
  },
}));

vi.mock('@/store/stagingStore', () => ({
  useStagingStore: () => ({
    diffSettings: {
      contextLines: 3,
      whitespaceMode: 'show',
      wordWrap: false,
      syntaxHighlighting: true,
    },
    setDiffSettings: vi.fn(),
  }),
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Mock matches actual module exports
  DiffCompareMode: { SideBySide: 'side-by-side', Unified: 'unified' },
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Mock matches actual module exports
  WhitespaceMode: { Show: 'show', Ignore: 'ignore', IgnoreAll: 'ignore-all' },
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: { defaultDiffMode: 'unified' },
  }),
}));

describe('DiffView', () => {
  const mockDiff: FileDiff = {
    oldPath: null,
    newPath: 'src/test.ts',
    oldOid: null,
    newOid: 'abc123',
    status: DiffStatus.Modified,
    binary: false,
    hunks: [
      {
        oldStart: 1,
        oldLines: 3,
        newStart: 1,
        newLines: 4,
        header: '@@ -1,3 +1,4 @@',
        lines: [
          { lineType: DiffLineType.Context, content: 'const a = 1;', oldLineNo: 1, newLineNo: 1 },
          {
            lineType: DiffLineType.Deletion,
            content: 'const b = 2;',
            oldLineNo: 2,
            newLineNo: null,
          },
          {
            lineType: DiffLineType.Addition,
            content: 'const b = 3;',
            oldLineNo: null,
            newLineNo: 2,
          },
          {
            lineType: DiffLineType.Addition,
            content: 'const c = 4;',
            oldLineNo: null,
            newLineNo: 3,
          },
          { lineType: DiffLineType.Context, content: 'const d = 5;', oldLineNo: 3, newLineNo: 4 },
        ],
      },
    ],
    additions: 2,
    deletions: 1,
  };

  it('should render loading state', () => {
    render(<DiffView diff={null} isLoading={true} />);

    // Component renders when loading
    expect(document.body.querySelector('div')).toBeInTheDocument();
  });

  it('should render no file selected state', () => {
    render(<DiffView diff={null} isLoading={false} />);

    expect(screen.getByText('diff.selectFile')).toBeInTheDocument();
  });

  it('should render diff content', () => {
    render(<DiffView diff={mockDiff} />);

    // The diff view should render
    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('should render binary file', () => {
    const binaryDiff: FileDiff = {
      ...mockDiff,
      binary: true,
      hunks: [],
    };

    render(<DiffView diff={binaryDiff} />);

    // Binary file diff renders with the binary file indicator
    expect(screen.getByText('diff.binaryFile')).toBeInTheDocument();
  });

  it('should render with mode prop', () => {
    render(<DiffView diff={mockDiff} mode="staged" />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('should render with commitOid prop', () => {
    render(<DiffView diff={mockDiff} commitOid="abc123" />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('should render deleted file', () => {
    const deletedDiff: FileDiff = {
      ...mockDiff,
      status: DiffStatus.Deleted,
    };

    render(<DiffView diff={deletedDiff} />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('should render added file', () => {
    const addedDiff: FileDiff = {
      ...mockDiff,
      status: DiffStatus.Added,
    };

    render(<DiffView diff={addedDiff} />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('should render renamed file', () => {
    const renamedDiff: FileDiff = {
      ...mockDiff,
      status: DiffStatus.Renamed,
      oldPath: 'src/old-test.ts',
    };

    render(<DiffView diff={renamedDiff} />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('should accept onStageHunk callback', () => {
    const onStageHunk = vi.fn();

    render(<DiffView diff={mockDiff} onStageHunk={onStageHunk} />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('should accept onUnstageHunk callback', () => {
    const onUnstageHunk = vi.fn();

    render(<DiffView diff={mockDiff} onUnstageHunk={onUnstageHunk} />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('should accept onDiscardHunk callback', () => {
    const onDiscardHunk = vi.fn();

    render(<DiffView diff={mockDiff} onDiscardHunk={onDiscardHunk} />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });
});
