import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BranchCompareDialog } from './BranchCompareDialog';

// Mock store
const mockCompare = vi.fn();
const mockSetActiveTab = vi.fn();
const mockSelectCommit = vi.fn();
const mockSelectFile = vi.fn();
const mockClear = vi.fn();

let mockStoreState = {
  compareResult: null as {
    aheadCommits: Array<{ oid: string; summary: string; parentOids: string[] }>;
    behindCommits: Array<{ oid: string; summary: string; parentOids: string[] }>;
    files: Array<{ path: string }>;
    baseOid: string;
    compareOid: string;
    mergeBaseOid: string;
  } | null,
  isLoading: false,
  error: null as string | null,
  activeTab: 'commits' as 'commits' | 'files',
  selectedCommit: null as { oid: string; summary: string; parentOids: string[] } | null,
  selectedCommitFiles: [] as Array<{ path: string }>,
  selectedFile: null as { path: string } | null,
  isLoadingFiles: false,
  compare: mockCompare,
  setActiveTab: mockSetActiveTab,
  selectCommit: mockSelectCommit,
  selectFile: mockSelectFile,
  clear: mockClear,
};

vi.mock('@/store/branchCompareStore', () => ({
  useBranchCompareStore: () => mockStoreState,
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
vi.mock('./CommitCompareList', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CommitCompareList: ({ aheadCommits, behindCommits }: any) => (
    <div data-testid="commit-compare-list">
      Ahead: {aheadCommits?.length}, Behind: {behindCommits?.length}
    </div>
  ),
}));

vi.mock('@/components/history/CommitFileList', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CommitFileList: ({ files }: any) => (
    <div data-testid="commit-file-list">Files: {files?.length}</div>
  ),
}));

vi.mock('@/components/diff', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DiffView: ({ diff }: any) => <div data-testid="diff-view">{diff ? 'Has diff' : 'No diff'}</div>,
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}));

describe('BranchCompareDialog', () => {
  const mockOnClose = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockBaseBranch: any = { name: 'main' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockCompareBranch: any = { name: 'feature' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      compareResult: null,
      isLoading: false,
      error: null,
      activeTab: 'commits',
      selectedCommit: null,
      selectedCommitFiles: [],
      selectedFile: null,
      isLoadingFiles: false,
      compare: mockCompare,
      setActiveTab: mockSetActiveTab,
      selectCommit: mockSelectCommit,
      selectFile: mockSelectFile,
      clear: mockClear,
    };
  });

  it('should not render when closed', () => {
    render(
      <BranchCompareDialog
        isOpen={false}
        onClose={mockOnClose}
        baseBranch={mockBaseBranch}
        compareBranch={mockCompareBranch}
      />
    );

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should not render when branches are null', () => {
    render(
      <BranchCompareDialog
        isOpen={true}
        onClose={mockOnClose}
        baseBranch={null}
        compareBranch={null}
      />
    );

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render when open with branches', () => {
    render(
      <BranchCompareDialog
        isOpen={true}
        onClose={mockOnClose}
        baseBranch={mockBaseBranch}
        compareBranch={mockCompareBranch}
      />
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('feature')).toBeInTheDocument();
  });

  it('should call compare when dialog opens', () => {
    render(
      <BranchCompareDialog
        isOpen={true}
        onClose={mockOnClose}
        baseBranch={mockBaseBranch}
        compareBranch={mockCompareBranch}
      />
    );

    expect(mockCompare).toHaveBeenCalledWith('main', 'feature');
  });

  it('should call clear when dialog closes', () => {
    const { rerender } = render(
      <BranchCompareDialog
        isOpen={true}
        onClose={mockOnClose}
        baseBranch={mockBaseBranch}
        compareBranch={mockCompareBranch}
      />
    );

    rerender(
      <BranchCompareDialog
        isOpen={false}
        onClose={mockOnClose}
        baseBranch={mockBaseBranch}
        compareBranch={mockCompareBranch}
      />
    );

    expect(mockClear).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    mockStoreState.isLoading = true;

    render(
      <BranchCompareDialog
        isOpen={true}
        onClose={mockOnClose}
        baseBranch={mockBaseBranch}
        compareBranch={mockCompareBranch}
      />
    );

    expect(screen.getByText('branches.compare.loading')).toBeInTheDocument();
  });

  it('should show error state', () => {
    mockStoreState.error = 'Compare failed';

    render(
      <BranchCompareDialog
        isOpen={true}
        onClose={mockOnClose}
        baseBranch={mockBaseBranch}
        compareBranch={mockCompareBranch}
      />
    );

    expect(screen.getByTestId('alert')).toHaveTextContent('Compare failed');
  });

  it('should show compare result with commits', () => {
    mockStoreState.compareResult = {
      aheadCommits: [{ oid: 'a1', summary: 'Ahead 1', parentOids: [] }],
      behindCommits: [
        { oid: 'b1', summary: 'Behind 1', parentOids: [] },
        { oid: 'b2', summary: 'Behind 2', parentOids: [] },
      ],
      files: [{ path: 'file.ts' }],
      baseOid: 'base123',
      compareOid: 'compare123',
      mergeBaseOid: 'merge123',
    };

    render(
      <BranchCompareDialog
        isOpen={true}
        onClose={mockOnClose}
        baseBranch={mockBaseBranch}
        compareBranch={mockCompareBranch}
      />
    );

    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('-2')).toBeInTheDocument();
    expect(screen.getByTestId('commit-compare-list')).toBeInTheDocument();
  });

  it('should switch to files tab', async () => {
    mockStoreState.compareResult = {
      aheadCommits: [],
      behindCommits: [],
      files: [{ path: 'file.ts' }],
      baseOid: 'base123',
      compareOid: 'compare123',
      mergeBaseOid: 'merge123',
    };

    render(
      <BranchCompareDialog
        isOpen={true}
        onClose={mockOnClose}
        baseBranch={mockBaseBranch}
        compareBranch={mockCompareBranch}
      />
    );

    // Find files tab button
    const filesButton = screen.getByText('branches.compare.files');
    fireEvent.click(filesButton);

    await waitFor(() => {
      expect(mockSetActiveTab).toHaveBeenCalledWith('files');
    });
  });

  it('should show select commit prompt when no commit selected', () => {
    mockStoreState.compareResult = {
      aheadCommits: [{ oid: 'a1', summary: 'Ahead 1', parentOids: [] }],
      behindCommits: [],
      files: [],
      baseOid: 'base123',
      compareOid: 'compare123',
      mergeBaseOid: 'merge123',
    };
    mockStoreState.activeTab = 'commits';
    mockStoreState.selectedCommit = null;

    render(
      <BranchCompareDialog
        isOpen={true}
        onClose={mockOnClose}
        baseBranch={mockBaseBranch}
        compareBranch={mockCompareBranch}
      />
    );

    expect(screen.getByText('branches.compare.selectCommitPrompt')).toBeInTheDocument();
  });
});
