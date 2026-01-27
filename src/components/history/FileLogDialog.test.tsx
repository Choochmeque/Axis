import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileLogDialog } from './FileLogDialog';

// Mock API
const mockGetFileHistory = vi.fn();
const mockGetFileDiffInCommit = vi.fn();
vi.mock('@/services/api', () => ({
  graphApi: {
    getFileHistory: (params: unknown) => mockGetFileHistory(params),
    getFileDiffInCommit: (oid: string, path: string) => mockGetFileDiffInCommit(oid, path),
  },
}));

// Mock dateUtils
vi.mock('@/lib/dateUtils', () => ({
  formatMediumDate: (date: number) => new Date(date * 1000).toLocaleDateString(),
}));

// Mock react-resizable-panels
vi.mock('react-resizable-panels', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Panel: ({ children }: any) => <div data-testid="panel">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PanelGroup: ({ children }: any) => <div data-testid="panel-group">{children}</div>,
  PanelResizeHandle: () => <div data-testid="resize-handle" />,
}));

// Mock child components
vi.mock('./CommitInfo', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CommitInfo: ({ commit }: any) => <div data-testid="commit-info">{commit.summary}</div>,
}));

vi.mock('../diff', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DiffView: ({ diff, isLoading }: any) => (
    <div data-testid="diff-view">
      {isLoading ? 'Loading diff...' : diff ? 'Diff content' : 'No diff'}
    </div>
  ),
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.path) return `${key} ${params.path}`;
      return key;
    },
  }),
}));

// Mock UI components
vi.mock('@/components/ui', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogBody: ({ children }: any) => <div data-testid="dialog-body">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CheckboxField: ({ id, label, checked, onCheckedChange }: any) => (
    <div>
      <input
        type="checkbox"
        id={id}
        data-testid={id}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Avatar: ({ name }: any) => <span data-testid="avatar">{name}</span>,
}));

const mockCommits = [
  {
    oid: 'abc1234567890',
    summary: 'First commit',
    author: { name: 'John Doe', email: 'john@example.com' },
    timestamp: 1700000000,
    parentOids: ['def4567890123'],
  },
  {
    oid: 'def4567890123',
    summary: 'Second commit',
    author: { name: 'Jane Doe', email: 'jane@example.com' },
    timestamp: 1699900000,
    parentOids: [],
  },
];

describe('FileLogDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFileHistory.mockResolvedValue({
      commits: mockCommits,
      hasMore: false,
    });
    mockGetFileDiffInCommit.mockResolvedValue({ content: 'diff content' });
  });

  it('should not render when closed', () => {
    render(<FileLogDialog isOpen={false} onClose={mockOnClose} filePaths={['src/file.ts']} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render when open', async () => {
    render(<FileLogDialog isOpen={true} onClose={mockOnClose} filePaths={['src/file.ts']} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent(
      'history.fileLog.title src/file.ts'
    );
  });

  it('should show loading state initially', () => {
    mockGetFileHistory.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<FileLogDialog isOpen={true} onClose={mockOnClose} filePaths={['src/file.ts']} />);

    expect(screen.getByText('history.fileLog.loading')).toBeInTheDocument();
  });

  it('should load and display commits', async () => {
    render(<FileLogDialog isOpen={true} onClose={mockOnClose} filePaths={['src/file.ts']} />);

    await waitFor(() => {
      expect(mockGetFileHistory).toHaveBeenCalledWith({
        paths: ['src/file.ts'],
        limit: 50,
        skip: 0,
        followRenames: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('First commit')).toBeInTheDocument();
      expect(screen.getByText('Second commit')).toBeInTheDocument();
    });
  });

  it('should show error when loading fails', async () => {
    mockGetFileHistory.mockRejectedValue(new Error('Failed to load'));

    render(<FileLogDialog isOpen={true} onClose={mockOnClose} filePaths={['src/file.ts']} />);

    await waitFor(() => {
      expect(screen.getByText('history.fileLog.errorLoading')).toBeInTheDocument();
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
  });

  it('should show no commits message when empty', async () => {
    mockGetFileHistory.mockResolvedValue({ commits: [], hasMore: false });

    render(<FileLogDialog isOpen={true} onClose={mockOnClose} filePaths={['src/file.ts']} />);

    await waitFor(() => {
      expect(screen.getByText('history.fileLog.noCommits')).toBeInTheDocument();
    });
  });

  it('should select commit and load diff', async () => {
    render(<FileLogDialog isOpen={true} onClose={mockOnClose} filePaths={['src/file.ts']} />);

    await waitFor(() => {
      expect(screen.getByText('First commit')).toBeInTheDocument();
    });

    // Click on commit row
    fireEvent.click(screen.getByText('First commit'));

    await waitFor(() => {
      expect(mockGetFileDiffInCommit).toHaveBeenCalledWith('abc1234567890', 'src/file.ts');
    });
  });

  it('should toggle follow renames checkbox', async () => {
    render(<FileLogDialog isOpen={true} onClose={mockOnClose} filePaths={['src/file.ts']} />);

    await waitFor(() => {
      expect(screen.getByText('First commit')).toBeInTheDocument();
    });

    // Click follow renames checkbox
    fireEvent.click(screen.getByTestId('follow-renames'));

    await waitFor(() => {
      // Should reload with followRenames: true
      expect(mockGetFileHistory).toHaveBeenLastCalledWith({
        paths: ['src/file.ts'],
        limit: 50,
        skip: 0,
        followRenames: true,
      });
    });
  });

  it('should show multiple files count in title', async () => {
    render(
      <FileLogDialog
        isOpen={true}
        onClose={mockOnClose}
        filePaths={['src/file1.ts', 'src/file2.ts', 'src/file3.ts']}
      />
    );

    expect(screen.getByTestId('dialog-title')).toHaveTextContent('history.fileLog.title 3 files');
  });

  it('should toggle commit selection when clicked', async () => {
    render(<FileLogDialog isOpen={true} onClose={mockOnClose} filePaths={['src/file.ts']} />);

    await waitFor(() => {
      expect(screen.getByText('First commit')).toBeInTheDocument();
    });

    // Click on the commit row (use the first instance found in the table)
    const firstCommitCells = screen.getAllByText('First commit');
    fireEvent.click(firstCommitCells[0]);

    await waitFor(() => {
      expect(mockGetFileDiffInCommit).toHaveBeenCalled();
    });

    // After selection, commit info panel shows the commit, so there are 2 "First commit" texts
    // Click the first one again (the table row) to toggle
    const allFirstCommitTexts = screen.getAllByText('First commit');
    const callCountBefore = mockGetFileDiffInCommit.mock.calls.length;
    fireEvent.click(allFirstCommitTexts[0]);

    // The selection logic toggles - clicking the same commit should not make additional API calls
    expect(mockGetFileDiffInCommit.mock.calls.length).toBe(callCountBefore);
  });

  it('should show commit short hash', async () => {
    render(<FileLogDialog isOpen={true} onClose={mockOnClose} filePaths={['src/file.ts']} />);

    await waitFor(() => {
      expect(screen.getByText('abc1234')).toBeInTheDocument();
      expect(screen.getByText('def4567')).toBeInTheDocument();
    });
  });
});
