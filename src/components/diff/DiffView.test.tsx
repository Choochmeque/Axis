import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DiffView } from './DiffView';
import { DiffStatus, DiffLineType } from '@/types';
import type { FileDiff } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  // eslint-disable-next-line @typescript-eslint/naming-convention -- aria-label is a DOM attribute
  testId: (id: string) => ({ 'aria-label': id }),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/services/api', () => ({
  diffApi: {
    getFileContent: vi.fn(),
    getFileBlob: vi.fn(),
  },
}));

const mockSetDiffSettings = vi.fn();
const mockDiffSettings = {
  contextLines: 3,
  whitespace: 'show',
  compareMode: 'parent',
};

vi.mock('@/store/stagingStore', () => ({
  useStagingStore: () => ({
    diffSettings: mockDiffSettings,
    setDiffSettings: mockSetDiffSettings,
  }),
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Mock matches actual module exports
  DiffCompareMode: { Parent: 'parent', Merged: 'merged' },
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Mock matches actual module exports
  WhitespaceMode: { Show: 'show', Ignore: 'ignore' },
}));

let mockSettings = {
  diffSideBySide: false,
  diffContextLines: 3,
  diffWordWrap: true,
  showLineNumbers: true,
};

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: mockSettings,
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

  it('should render no changes message when hunks are empty', () => {
    const emptyDiff: FileDiff = {
      ...mockDiff,
      hunks: [],
    };

    render(<DiffView diff={emptyDiff} />);

    expect(screen.getByText('diff.noChanges')).toBeInTheDocument();
  });

  it('should render with parentCommitOid prop', () => {
    render(<DiffView diff={mockDiff} commitOid="abc123" parentCommitOid="def456" />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('should render copied file status', () => {
    const copiedDiff: FileDiff = {
      ...mockDiff,
      status: DiffStatus.Copied,
      oldPath: 'src/old-test.ts',
    };

    render(<DiffView diff={copiedDiff} />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('should render type changed file status', () => {
    const typeChangedDiff: FileDiff = {
      ...mockDiff,
      status: DiffStatus.TypeChanged,
    };

    render(<DiffView diff={typeChangedDiff} />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('should render untracked file status', () => {
    const untrackedDiff: FileDiff = {
      ...mockDiff,
      status: DiffStatus.Untracked,
    };

    render(<DiffView diff={untrackedDiff} />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('should render conflicted file status', () => {
    const conflictedDiff: FileDiff = {
      ...mockDiff,
      status: DiffStatus.Conflicted,
    };

    render(<DiffView diff={conflictedDiff} />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('should render file path in header', () => {
    render(<DiffView diff={mockDiff} />);

    expect(screen.getByText('src/test.ts')).toBeInTheDocument();
  });

  it('should render additions count', () => {
    render(<DiffView diff={mockDiff} />);

    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('should render deletions count', () => {
    render(<DiffView diff={mockDiff} />);

    expect(screen.getByText('-1')).toBeInTheDocument();
  });

  it('should render hunk header', () => {
    render(<DiffView diff={mockDiff} />);

    expect(screen.getByText('@@ -1,3 +1,4 @@')).toBeInTheDocument();
  });

  it('should render deletion line with minus prefix', () => {
    render(<DiffView diff={mockDiff} />);

    expect(screen.getByText('const b = 2;')).toBeInTheDocument();
  });

  it('should render addition lines with plus prefix', () => {
    render(<DiffView diff={mockDiff} />);

    expect(screen.getByText('const b = 3;')).toBeInTheDocument();
    expect(screen.getByText('const c = 4;')).toBeInTheDocument();
  });

  it('should render context lines', () => {
    render(<DiffView diff={mockDiff} />);

    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
    expect(screen.getByText('const d = 5;')).toBeInTheDocument();
  });
});

describe('DiffView workdir mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
        oldLines: 1,
        newStart: 1,
        newLines: 2,
        header: '@@ -1,1 +1,2 @@',
        lines: [
          { lineType: DiffLineType.Context, content: 'line 1', oldLineNo: 1, newLineNo: 1 },
          { lineType: DiffLineType.Addition, content: 'line 2', oldLineNo: null, newLineNo: 2 },
        ],
      },
    ],
    additions: 1,
    deletions: 0,
  };

  it('should render stage hunk button in workdir mode', () => {
    const onStageHunk = vi.fn();
    render(<DiffView diff={mockDiff} mode="workdir" onStageHunk={onStageHunk} />);

    expect(screen.getByText('diff.hunk.stage')).toBeInTheDocument();
  });

  it('should render discard hunk button in workdir mode', () => {
    const onDiscardHunk = vi.fn();
    render(<DiffView diff={mockDiff} mode="workdir" onDiscardHunk={onDiscardHunk} />);

    expect(screen.getByText('diff.hunk.discard')).toBeInTheDocument();
  });

  it('should call onStageHunk when stage button is clicked', async () => {
    const onStageHunk = vi.fn().mockResolvedValue(undefined);
    render(<DiffView diff={mockDiff} mode="workdir" onStageHunk={onStageHunk} />);

    const stageButton = screen.getByText('diff.hunk.stage');
    fireEvent.click(stageButton);

    await waitFor(() => {
      expect(onStageHunk).toHaveBeenCalled();
    });
  });

  it('should call onDiscardHunk when discard button is clicked', async () => {
    const onDiscardHunk = vi.fn().mockResolvedValue(undefined);
    render(<DiffView diff={mockDiff} mode="workdir" onDiscardHunk={onDiscardHunk} />);

    const discardButton = screen.getByText('diff.hunk.discard');
    fireEvent.click(discardButton);

    await waitFor(() => {
      expect(onDiscardHunk).toHaveBeenCalled();
    });
  });
});

describe('DiffView staged mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
        oldLines: 1,
        newStart: 1,
        newLines: 2,
        header: '@@ -1,1 +1,2 @@',
        lines: [
          { lineType: DiffLineType.Context, content: 'line 1', oldLineNo: 1, newLineNo: 1 },
          { lineType: DiffLineType.Addition, content: 'line 2', oldLineNo: null, newLineNo: 2 },
        ],
      },
    ],
    additions: 1,
    deletions: 0,
  };

  it('should render unstage hunk button in staged mode', () => {
    const onUnstageHunk = vi.fn();
    render(<DiffView diff={mockDiff} mode="staged" onUnstageHunk={onUnstageHunk} />);

    expect(screen.getByText('diff.hunk.unstage')).toBeInTheDocument();
  });

  it('should call onUnstageHunk when unstage button is clicked', async () => {
    const onUnstageHunk = vi.fn().mockResolvedValue(undefined);
    render(<DiffView diff={mockDiff} mode="staged" onUnstageHunk={onUnstageHunk} />);

    const unstageButton = screen.getByText('diff.hunk.unstage');
    fireEvent.click(unstageButton);

    await waitFor(() => {
      expect(onUnstageHunk).toHaveBeenCalled();
    });
  });
});

describe('DiffView view modes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = {
      diffSideBySide: false,
      diffContextLines: 3,
      diffWordWrap: true,
      showLineNumbers: true,
    };
  });

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
        oldLines: 2,
        newStart: 1,
        newLines: 2,
        header: '@@ -1,2 +1,2 @@',
        lines: [
          { lineType: DiffLineType.Deletion, content: 'old line', oldLineNo: 1, newLineNo: null },
          { lineType: DiffLineType.Addition, content: 'new line', oldLineNo: null, newLineNo: 1 },
          { lineType: DiffLineType.Context, content: 'context', oldLineNo: 2, newLineNo: 2 },
        ],
      },
    ],
    additions: 1,
    deletions: 1,
  };

  it('should render unified view mode button', () => {
    render(<DiffView diff={mockDiff} />);

    // Unified view button has Rows icon
    expect(screen.getByTitle('diff.viewMode.unified')).toBeInTheDocument();
  });

  it('should render split view mode button', () => {
    render(<DiffView diff={mockDiff} />);

    // Split view button has Columns icon
    expect(screen.getByTitle('diff.viewMode.split')).toBeInTheDocument();
  });

  it('should switch to split view when split button is clicked', () => {
    render(<DiffView diff={mockDiff} />);

    const splitButton = screen.getByTitle('diff.viewMode.split');
    fireEvent.click(splitButton);

    // The diff should still render
    expect(screen.getByText('old line')).toBeInTheDocument();
    expect(screen.getByText('new line')).toBeInTheDocument();
  });

  it('should switch back to unified view when unified button is clicked', () => {
    render(<DiffView diff={mockDiff} />);

    // First switch to split
    const splitButton = screen.getByTitle('diff.viewMode.split');
    fireEvent.click(splitButton);

    // Then switch back to unified
    const unifiedButton = screen.getByTitle('diff.viewMode.unified');
    fireEvent.click(unifiedButton);

    expect(screen.getByText('old line')).toBeInTheDocument();
  });
});

describe('DiffView image files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render image header for png file', () => {
    const imageDiff: FileDiff = {
      oldPath: null,
      newPath: 'image.png',
      oldOid: null,
      newOid: 'abc123',
      status: DiffStatus.Added,
      binary: true,
      hunks: [],
      additions: 0,
      deletions: 0,
    };

    render(<DiffView diff={imageDiff} />);

    // Image files are shown with ImageDiffHeader
    expect(screen.getByText('image.png')).toBeInTheDocument();
  });

  it('should render image header for jpg file', () => {
    const imageDiff: FileDiff = {
      oldPath: null,
      newPath: 'photo.jpg',
      oldOid: null,
      newOid: 'abc123',
      status: DiffStatus.Added,
      binary: true,
      hunks: [],
      additions: 0,
      deletions: 0,
    };

    render(<DiffView diff={imageDiff} />);

    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
  });

  it('should render image header for svg file', () => {
    const imageDiff: FileDiff = {
      oldPath: null,
      newPath: 'icon.svg',
      oldOid: null,
      newOid: 'abc123',
      status: DiffStatus.Added,
      binary: false, // SVG is text-based
      hunks: [],
      additions: 0,
      deletions: 0,
    };

    render(<DiffView diff={imageDiff} />);

    expect(screen.getByText('icon.svg')).toBeInTheDocument();
  });

  it('should render image header for gif file', () => {
    const imageDiff: FileDiff = {
      oldPath: null,
      newPath: 'animation.gif',
      oldOid: null,
      newOid: 'abc123',
      status: DiffStatus.Added,
      binary: true,
      hunks: [],
      additions: 0,
      deletions: 0,
    };

    render(<DiffView diff={imageDiff} />);

    expect(screen.getByText('animation.gif')).toBeInTheDocument();
  });

  it('should render image header for webp file', () => {
    const imageDiff: FileDiff = {
      oldPath: null,
      newPath: 'image.webp',
      oldOid: null,
      newOid: 'abc123',
      status: DiffStatus.Added,
      binary: true,
      hunks: [],
      additions: 0,
      deletions: 0,
    };

    render(<DiffView diff={imageDiff} />);

    expect(screen.getByText('image.webp')).toBeInTheDocument();
  });
});

describe('DiffView with multiple hunks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const multiHunkDiff: FileDiff = {
    oldPath: null,
    newPath: 'src/test.ts',
    oldOid: null,
    newOid: 'abc123',
    status: DiffStatus.Modified,
    binary: false,
    hunks: [
      {
        oldStart: 1,
        oldLines: 1,
        newStart: 1,
        newLines: 2,
        header: '@@ -1,1 +1,2 @@',
        lines: [
          { lineType: DiffLineType.Context, content: 'first', oldLineNo: 1, newLineNo: 1 },
          {
            lineType: DiffLineType.Addition,
            content: 'added first',
            oldLineNo: null,
            newLineNo: 2,
          },
        ],
      },
      {
        oldStart: 10,
        oldLines: 1,
        newStart: 11,
        newLines: 2,
        header: '@@ -10,1 +11,2 @@',
        lines: [
          { lineType: DiffLineType.Context, content: 'tenth', oldLineNo: 10, newLineNo: 11 },
          {
            lineType: DiffLineType.Addition,
            content: 'added tenth',
            oldLineNo: null,
            newLineNo: 12,
          },
        ],
      },
    ],
    additions: 2,
    deletions: 0,
  };

  it('should render multiple hunk headers', () => {
    render(<DiffView diff={multiHunkDiff} />);

    expect(screen.getByText('@@ -1,1 +1,2 @@')).toBeInTheDocument();
    expect(screen.getByText('@@ -10,1 +11,2 @@')).toBeInTheDocument();
  });

  it('should render content from all hunks', () => {
    render(<DiffView diff={multiHunkDiff} />);

    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('added first')).toBeInTheDocument();
    expect(screen.getByText('tenth')).toBeInTheDocument();
    expect(screen.getByText('added tenth')).toBeInTheDocument();
  });

  it('should render stage buttons for each hunk in workdir mode', () => {
    const onStageHunk = vi.fn();
    render(<DiffView diff={multiHunkDiff} mode="workdir" onStageHunk={onStageHunk} />);

    const stageButtons = screen.getAllByText('diff.hunk.stage');
    expect(stageButtons.length).toBe(2);
  });
});

describe('DiffView with file using oldPath', () => {
  it('should use oldPath when newPath is null', () => {
    const deletedFileDiff: FileDiff = {
      oldPath: 'src/deleted.ts',
      newPath: null,
      oldOid: 'abc123',
      newOid: null,
      status: DiffStatus.Deleted,
      binary: false,
      hunks: [
        {
          oldStart: 1,
          oldLines: 1,
          newStart: 0,
          newLines: 0,
          header: '@@ -1,1 +0,0 @@',
          lines: [
            {
              lineType: DiffLineType.Deletion,
              content: 'deleted content',
              oldLineNo: 1,
              newLineNo: null,
            },
          ],
        },
      ],
      additions: 0,
      deletions: 1,
    };

    render(<DiffView diff={deletedFileDiff} />);

    expect(screen.getByText('src/deleted.ts')).toBeInTheDocument();
  });
});
