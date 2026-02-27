import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Commit } from '@/types';
import { RevertCommitDialog } from './RevertCommitDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockRevert = vi.fn();
const mockAbort = vi.fn();
const mockContinue = vi.fn();
const mockTrackOperation = vi.fn();

vi.mock('../../services/api', () => ({
  revertApi: {
    revert: (...args: unknown[]) => mockRevert(...args),
    abort: () => mockAbort(),
    continue: () => mockContinue(),
  },
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
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  CheckboxField: ({
    label,
    checked,
    onCheckedChange,
    id,
  }: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    id?: string;
  }) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        data-testid={id || 'checkbox'}
      />
      {label}
    </label>
  ),
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
}));

describe('RevertCommitDialog', () => {
  const mockCommits: Commit[] = [
    {
      oid: 'abc123def456',
      shortOid: 'abc123d',
      message: 'Test commit message',
      summary: 'Test commit message',
      author: {
        name: 'Test Author',
        email: 'test@example.com',
        timestamp: new Date().toISOString(),
      },
      committer: {
        name: 'Test Author',
        email: 'test@example.com',
        timestamp: new Date().toISOString(),
      },
      parentOids: [],
      timestamp: new Date().toISOString(),
      isMerge: false,
      signature: null,
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    commits: mockCommits,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(<RevertCommitDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when open', () => {
    render(<RevertCommitDialog {...defaultProps} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('merge.revert.title')).toBeInTheDocument();
  });

  it('should render commit list', () => {
    render(<RevertCommitDialog {...defaultProps} />);

    expect(screen.getByText('abc123d')).toBeInTheDocument();
    expect(screen.getByText('Test commit message')).toBeInTheDocument();
  });

  it('should render single commit label for one commit', () => {
    render(<RevertCommitDialog {...defaultProps} />);

    expect(screen.getByText('merge.revert.commitToRevert')).toBeInTheDocument();
  });

  it('should render plural commits label for multiple commits', () => {
    const multipleCommits = [
      ...mockCommits,
      { ...mockCommits[0], oid: 'def456', shortOid: 'def456', summary: 'Second commit' },
    ];
    render(<RevertCommitDialog {...defaultProps} commits={multipleCommits} />);

    expect(screen.getByText('merge.revert.commitsToRevert')).toBeInTheDocument();
  });

  it('should render revert description', () => {
    render(<RevertCommitDialog {...defaultProps} />);

    expect(screen.getByText('merge.revert.revertDescription')).toBeInTheDocument();
  });

  it('should render no commit checkbox', () => {
    render(<RevertCommitDialog {...defaultProps} />);

    expect(screen.getByText('merge.revert.noCommit')).toBeInTheDocument();
  });

  it('should render cancel and revert buttons', () => {
    render(<RevertCommitDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText('merge.revert.revertButton')).toBeInTheDocument();
  });

  it('should call revertApi.revert when revert button clicked', async () => {
    mockRevert.mockResolvedValue({ success: true, conflicts: [], message: '' });

    render(<RevertCommitDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('merge.revert.revertButton'));

    await waitFor(() => {
      expect(mockRevert).toHaveBeenCalledWith({
        commits: ['abc123def456'],
        noCommit: false,
      });
    });
  });

  it('should pass noCommit option when checked', async () => {
    mockRevert.mockResolvedValue({ success: true, conflicts: [], message: '' });

    render(<RevertCommitDialog {...defaultProps} />);

    fireEvent.click(screen.getByTestId('no-commit-revert'));
    fireEvent.click(screen.getByText('merge.revert.revertButton'));

    await waitFor(() => {
      expect(mockRevert).toHaveBeenCalledWith({
        commits: ['abc123def456'],
        noCommit: true,
      });
    });
  });

  it('should close dialog after successful revert', async () => {
    mockRevert.mockResolvedValue({ success: true, conflicts: [], message: '' });
    const onClose = vi.fn();

    render(<RevertCommitDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('merge.revert.revertButton'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should call onRevertComplete after successful revert', async () => {
    const result = { success: true, conflicts: [], message: '' };
    mockRevert.mockResolvedValue(result);
    const onRevertComplete = vi.fn();

    render(<RevertCommitDialog {...defaultProps} onRevertComplete={onRevertComplete} />);

    fireEvent.click(screen.getByText('merge.revert.revertButton'));

    await waitFor(() => {
      expect(onRevertComplete).toHaveBeenCalledWith(result);
    });
  });

  it('should show error when revert fails', async () => {
    mockRevert.mockRejectedValue(new Error('Revert failed'));

    render(<RevertCommitDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('merge.revert.revertButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });
  });

  it('should track operation', async () => {
    mockRevert.mockResolvedValue({ success: true, conflicts: [], message: '' });

    render(<RevertCommitDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('merge.revert.revertButton'));

    await waitFor(() => {
      expect(mockTrackOperation).toHaveBeenCalled();
    });
  });

  it('should disable revert button when no commits', () => {
    render(<RevertCommitDialog {...defaultProps} commits={[]} />);

    const revertButton = screen.getByText('merge.revert.revertButton');
    expect(revertButton).toBeDisabled();
  });
});
