import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RebaseDialog } from './RebaseDialog';
import { BranchType } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

const mockRebase = vi.fn();
const mockAbort = vi.fn();
const mockContinue = vi.fn();
const mockSkip = vi.fn();
const mockGetPreview = vi.fn();
const mockList = vi.fn();
const mockTrackOperation = vi.fn();
const mockOpenInteractiveRebase = vi.fn();

vi.mock('../../services/api', () => ({
  rebaseApi: {
    rebase: (...args: unknown[]) => mockRebase(...args),
    abort: () => mockAbort(),
    continue: () => mockContinue(),
    skip: () => mockSkip(),
    getPreview: (...args: unknown[]) => mockGetPreview(...args),
  },
  branchApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

vi.mock('@/store/interactiveRebaseStore', () => ({
  useInteractiveRebaseStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      open: mockOpenInteractiveRebase,
      isLoading: false,
    }),
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  useOperation: () => ({
    trackOperation: async (_opts: Record<string, unknown>, fn: () => Promise<unknown>) => {
      mockTrackOperation();
      return fn();
    },
  }),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('./RebasePreviewDiagram', () => ({
  RebasePreviewDiagram: () => <div data-testid="rebase-preview">Preview</div>,
}));

vi.mock('@/components/ui', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  FormField: ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      data-testid="branch-select"
    >
      <option value="">{''}</option>
      {children}
    </select>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
}));

describe('RebaseDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentBranch: 'feature-branch',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([
      { name: 'main', fullName: 'main', branchType: BranchType.Local, isHead: false },
      { name: 'develop', fullName: 'develop', branchType: BranchType.Local, isHead: false },
    ]);
    mockGetPreview.mockResolvedValue(null);
  });

  it('should not render when closed', () => {
    render(<RebaseDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when open', () => {
    render(<RebaseDialog {...defaultProps} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('merge.rebase.title')).toBeInTheDocument();
  });

  it('should display current branch', () => {
    render(<RebaseDialog {...defaultProps} />);

    expect(screen.getByText('feature-branch')).toBeInTheDocument();
    expect(screen.getByText('merge.rebase.currentBranch')).toBeInTheDocument();
  });

  it('should render branch select when no target commit', async () => {
    render(<RebaseDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('branch-select')).toBeInTheDocument();
    });
  });

  it('should render cancel and rebase buttons', () => {
    render(<RebaseDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText('merge.rebase.rebaseButton')).toBeInTheDocument();
  });

  it('should disable rebase button when no branch selected', () => {
    render(<RebaseDialog {...defaultProps} />);

    const rebaseButton = screen.getByText('merge.rebase.rebaseButton');
    expect(rebaseButton).toBeDisabled();
  });

  it('should call rebaseApi.rebase when rebase button clicked', async () => {
    mockRebase.mockResolvedValue({ success: true, conflicts: [], message: '' });

    render(<RebaseDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('branch-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('branch-select'), { target: { value: 'main' } });
    fireEvent.click(screen.getByText('merge.rebase.rebaseButton'));

    await waitFor(() => {
      expect(mockRebase).toHaveBeenCalledWith({
        onto: 'main',
        interactive: false,
        preserveMerges: false,
        autosquash: false,
      });
    });
  });

  it('should close dialog after successful rebase', async () => {
    mockRebase.mockResolvedValue({ success: true, conflicts: [], message: '' });
    const onClose = vi.fn();

    render(<RebaseDialog {...defaultProps} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('branch-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('branch-select'), { target: { value: 'main' } });
    fireEvent.click(screen.getByText('merge.rebase.rebaseButton'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should show error when rebase fails', async () => {
    mockRebase.mockRejectedValue(new Error('Rebase failed'));

    render(<RebaseDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('branch-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('branch-select'), { target: { value: 'main' } });
    fireEvent.click(screen.getByText('merge.rebase.rebaseButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });
  });

  it('should track operation', async () => {
    mockRebase.mockResolvedValue({ success: true, conflicts: [], message: '' });

    render(<RebaseDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('branch-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('branch-select'), { target: { value: 'main' } });
    fireEvent.click(screen.getByText('merge.rebase.rebaseButton'));

    await waitFor(() => {
      expect(mockTrackOperation).toHaveBeenCalled();
    });
  });

  it('should load branches when dialog opens', async () => {
    render(<RebaseDialog {...defaultProps} />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith({ includeLocal: true, includeRemote: true });
    });
  });

  it('should render interactive rebase button', () => {
    render(<RebaseDialog {...defaultProps} />);

    expect(screen.getByText('merge.rebase.interactive')).toBeInTheDocument();
  });

  it('should show warning about history rewrite', () => {
    render(<RebaseDialog {...defaultProps} />);

    expect(screen.getByText('merge.rebase.rebaseWarning')).toBeInTheDocument();
  });

  it('should display target commit when provided', () => {
    const targetCommit = {
      oid: 'abc123def456',
      shortOid: 'abc123d',
      message: 'Target commit message',
      summary: 'Target commit message',
      author: {
        name: 'Test',
        email: 'test@example.com',
        timestamp: new Date().toISOString(),
      },
      committer: {
        name: 'Test',
        email: 'test@example.com',
        timestamp: new Date().toISOString(),
      },
      parentOids: [],
      timestamp: new Date().toISOString(),
      isMerge: false,
      signature: null,
    };

    render(<RebaseDialog {...defaultProps} targetCommit={targetCommit} />);

    expect(screen.getByText('abc123d')).toBeInTheDocument();
    expect(screen.getByText('Target commit message')).toBeInTheDocument();
    expect(screen.getByText('merge.rebase.rebaseOntoCommit')).toBeInTheDocument();
  });
});
