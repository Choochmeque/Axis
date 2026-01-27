import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConflictResolver } from './ConflictResolver';
import type { ConflictedFile, ConflictContent, OperationState } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

const mockGetConflictedFiles = vi.fn();
const mockGetState = vi.fn();
const mockGetConflictContent = vi.fn();
const mockResolveConflict = vi.fn();

vi.mock('@/services/api', () => ({
  conflictApi: {
    getConflictedFiles: () => mockGetConflictedFiles(),
    getConflictContent: (path: string) => mockGetConflictContent(path),
    resolveConflict: (...args: unknown[]) => mockResolveConflict(...args),
  },
  operationApi: {
    getState: () => mockGetState(),
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('react-resizable-panels', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelResizeHandle: () => <div data-testid="resize-handle" />,
}));

describe('ConflictResolver', () => {
  const mockConflicts: ConflictedFile[] = [
    { path: 'src/file1.ts', isResolved: false },
    { path: 'src/file2.ts', isResolved: false },
  ];

  const mockContent: ConflictContent = {
    ours: 'const a = 1;',
    theirs: 'const a = 2;',
    merged: '<<<<<<< HEAD\nconst a = 1;\n=======\nconst a = 2;\n>>>>>>> branch',
    ancestor: null,
  };

  const mockMergingState: OperationState = {
    Merging: { branch: 'feature-branch' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConflictedFiles.mockResolvedValue(mockConflicts);
    mockGetState.mockResolvedValue(mockMergingState);
    mockGetConflictContent.mockResolvedValue(mockContent);
  });

  it('should render conflict resolver title', async () => {
    render(<ConflictResolver />);

    await waitFor(() => {
      expect(screen.getByText('merge.conflictResolver.title')).toBeInTheDocument();
    });
  });

  it('should load and display conflicts', async () => {
    render(<ConflictResolver />);

    await waitFor(() => {
      expect(screen.getByText('src/file1.ts')).toBeInTheDocument();
      expect(screen.getByText('src/file2.ts')).toBeInTheDocument();
    });
  });

  it('should display conflict count', async () => {
    render(<ConflictResolver />);

    await waitFor(() => {
      expect(
        screen.getByText('merge.conflictResolver.conflictedFilesPlural {"count":2}')
      ).toBeInTheDocument();
    });
  });

  it('should display operation label for merging', async () => {
    render(<ConflictResolver />);

    await waitFor(() => {
      expect(
        screen.getByText('merge.conflictResolver.operations.merging feature-branch')
      ).toBeInTheDocument();
    });
  });

  it('should display operation label for rebasing', async () => {
    mockGetState.mockResolvedValue({
      Rebasing: { current: 2, total: 5 },
    });

    render(<ConflictResolver />);

    await waitFor(() => {
      expect(
        screen.getByText('merge.conflictResolver.operations.rebasing (2/5)')
      ).toBeInTheDocument();
    });
  });

  it('should load conflict content when file selected', async () => {
    render(<ConflictResolver />);

    await waitFor(() => {
      expect(mockGetConflictContent).toHaveBeenCalledWith('src/file1.ts');
    });
  });

  it('should display ours and theirs content', async () => {
    render(<ConflictResolver />);

    await waitFor(() => {
      expect(screen.getByText('merge.conflictResolver.ours')).toBeInTheDocument();
      expect(screen.getByText('merge.conflictResolver.theirs')).toBeInTheDocument();
    });
  });

  it('should display merged section', async () => {
    render(<ConflictResolver />);

    await waitFor(() => {
      expect(screen.getByText('merge.conflictResolver.merged')).toBeInTheDocument();
    });
  });

  it('should render use this buttons', async () => {
    render(<ConflictResolver />);

    await waitFor(() => {
      const useThisButtons = screen.getAllByText('merge.conflictResolver.useThis');
      expect(useThisButtons.length).toBe(2);
    });
  });

  it('should render mark resolved button', async () => {
    render(<ConflictResolver />);

    await waitFor(() => {
      expect(screen.getByText('merge.conflictResolver.markResolved')).toBeInTheDocument();
    });
  });

  it('should show select file message when no content loaded', async () => {
    mockGetConflictedFiles.mockResolvedValue([]);
    mockGetState.mockResolvedValue(mockMergingState);

    render(<ConflictResolver />);

    await waitFor(() => {
      expect(screen.getByText('merge.conflictResolver.selectFile')).toBeInTheDocument();
    });
  });

  it('should render refresh button', async () => {
    render(<ConflictResolver />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.conflictResolver.refresh')).toBeInTheDocument();
    });
  });

  it('should call onAllResolved when no conflicts remain', async () => {
    mockGetConflictedFiles.mockResolvedValue([]);
    const onAllResolved = vi.fn();

    render(<ConflictResolver onAllResolved={onAllResolved} />);

    await waitFor(() => {
      expect(onAllResolved).toHaveBeenCalled();
    });
  });

  it('should not render when no conflicts and no operation', async () => {
    mockGetConflictedFiles.mockResolvedValue([]);
    mockGetState.mockResolvedValue('None');

    const { container } = render(<ConflictResolver />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should display resolved indicator for resolved files', async () => {
    mockGetConflictedFiles.mockResolvedValue([
      { path: 'src/file1.ts', isResolved: true },
      { path: 'src/file2.ts', isResolved: false },
    ]);

    render(<ConflictResolver />);

    await waitFor(() => {
      expect(screen.getByText('src/file1.ts')).toBeInTheDocument();
    });
  });
});
