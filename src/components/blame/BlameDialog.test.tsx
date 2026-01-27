import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BlameDialog } from './BlameDialog';

// Mock blame store
const mockLoadBlame = vi.fn();
const mockSetHoveredCommit = vi.fn();
const mockClear = vi.fn();
let mockBlameState = {
  result: null as { lines: Array<{ content: string; commitOid: string }> } | null,
  isLoading: false,
  error: null as string | null,
  hoveredCommitOid: null as string | null,
  loadBlame: mockLoadBlame,
  setHoveredCommit: mockSetHoveredCommit,
  clear: mockClear,
};

vi.mock('@/store/blameStore', () => ({
  useBlameStore: () => mockBlameState,
}));

// Mock commit API
const mockGetCommit = vi.fn();
vi.mock('@/services/api', () => ({
  commitApi: {
    getCommit: (oid: string) => mockGetCommit(oid),
  },
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
vi.mock('./BlameView', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BlameView: ({ lines, isLoading, error }: any) => (
    <div data-testid="blame-view">
      {isLoading && 'Loading...'}
      {error && `Error: ${error}`}
      {lines?.length > 0 && `${lines.length} lines`}
    </div>
  ),
}));

vi.mock('@/components/history/CommitInfo', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CommitInfo: ({ commit }: any) => <div data-testid="commit-info">{commit.summary}</div>,
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
}));

describe('BlameDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockBlameState = {
      result: null,
      isLoading: false,
      error: null,
      hoveredCommitOid: null,
      loadBlame: mockLoadBlame,
      setHoveredCommit: mockSetHoveredCommit,
      clear: mockClear,
    };
  });

  it('should not render when closed', () => {
    render(<BlameDialog isOpen={false} onClose={mockOnClose} filePath="src/file.ts" />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(<BlameDialog isOpen={true} onClose={mockOnClose} filePath="src/file.ts" />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('blame.title file.ts');
  });

  it('should load blame when dialog opens', () => {
    render(<BlameDialog isOpen={true} onClose={mockOnClose} filePath="src/file.ts" />);

    expect(mockLoadBlame).toHaveBeenCalledWith('src/file.ts', undefined);
  });

  it('should load blame with commit OID when provided', () => {
    render(
      <BlameDialog isOpen={true} onClose={mockOnClose} filePath="src/file.ts" commitOid="abc1234" />
    );

    expect(mockLoadBlame).toHaveBeenCalledWith('src/file.ts', 'abc1234');
  });

  it('should clear blame when dialog closes', () => {
    const { rerender } = render(
      <BlameDialog isOpen={true} onClose={mockOnClose} filePath="src/file.ts" />
    );

    rerender(<BlameDialog isOpen={false} onClose={mockOnClose} filePath="src/file.ts" />);

    expect(mockClear).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    mockBlameState = {
      ...mockBlameState,
      isLoading: true,
    };

    render(<BlameDialog isOpen={true} onClose={mockOnClose} filePath="src/file.ts" />);

    expect(screen.getByTestId('blame-view')).toHaveTextContent('Loading...');
  });

  it('should show error state', () => {
    mockBlameState = {
      ...mockBlameState,
      error: 'Failed to load blame',
    };

    render(<BlameDialog isOpen={true} onClose={mockOnClose} filePath="src/file.ts" />);

    expect(screen.getByTestId('blame-view')).toHaveTextContent('Error: Failed to load blame');
  });

  it('should show blame lines', () => {
    mockBlameState = {
      ...mockBlameState,
      result: {
        lines: [
          { content: 'line 1', commitOid: 'abc123' },
          { content: 'line 2', commitOid: 'def456' },
        ],
      },
    };

    render(<BlameDialog isOpen={true} onClose={mockOnClose} filePath="src/file.ts" />);

    expect(screen.getByTestId('blame-view')).toHaveTextContent('2 lines');
  });

  it('should fetch commit details when hovering', async () => {
    const mockCommit = {
      oid: 'abc1234',
      summary: 'Test commit',
      author: { name: 'John', email: 'john@test.com' },
    };
    mockGetCommit.mockResolvedValue(mockCommit);

    mockBlameState = {
      ...mockBlameState,
      hoveredCommitOid: 'abc1234',
    };

    render(<BlameDialog isOpen={true} onClose={mockOnClose} filePath="src/file.ts" />);

    await waitFor(() => {
      expect(mockGetCommit).toHaveBeenCalledWith('abc1234');
    });
  });

  it('should show select commit message when no commit is hovered', () => {
    render(<BlameDialog isOpen={true} onClose={mockOnClose} filePath="src/file.ts" />);

    expect(screen.getByText('blame.selectCommitForDetails')).toBeInTheDocument();
  });

  it('should extract filename from path for title', () => {
    render(
      <BlameDialog
        isOpen={true}
        onClose={mockOnClose}
        filePath="src/components/deep/nested/Component.tsx"
      />
    );

    expect(screen.getByTestId('dialog-title')).toHaveTextContent('blame.title Component.tsx');
  });

  it('should use full path as filename if no slashes', () => {
    render(<BlameDialog isOpen={true} onClose={mockOnClose} filePath="README.md" />);

    expect(screen.getByTestId('dialog-title')).toHaveTextContent('blame.title README.md');
  });
});
