import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CherryPickDialog } from './CherryPickDialog';
import type { Commit } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockCherryPick = vi.fn();
const mockAbort = vi.fn();
const mockContinue = vi.fn();
const mockSkip = vi.fn();
const mockTrackOperation = vi.fn();

vi.mock('../../services/api', () => ({
  cherryPickApi: {
    cherryPick: (...args: unknown[]) => mockCherryPick(...args),
    abort: () => mockAbort(),
    continue: () => mockContinue(),
    skip: () => mockSkip(),
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

describe('CherryPickDialog', () => {
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
    render(<CherryPickDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when open', () => {
    render(<CherryPickDialog {...defaultProps} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('merge.cherryPick.title')).toBeInTheDocument();
  });

  it('should render commit list', () => {
    render(<CherryPickDialog {...defaultProps} />);

    expect(screen.getByText('abc123d')).toBeInTheDocument();
    expect(screen.getByText('Test commit message')).toBeInTheDocument();
  });

  it('should render single commit label for one commit', () => {
    render(<CherryPickDialog {...defaultProps} />);

    expect(screen.getByText('merge.cherryPick.commitToPick')).toBeInTheDocument();
  });

  it('should render plural commits label for multiple commits', () => {
    const multipleCommits = [
      ...mockCommits,
      { ...mockCommits[0], oid: 'def456', shortOid: 'def456', summary: 'Second commit' },
    ];
    render(<CherryPickDialog {...defaultProps} commits={multipleCommits} />);

    expect(screen.getByText('merge.cherryPick.commitsToPick')).toBeInTheDocument();
  });

  it('should render no commit checkbox', () => {
    render(<CherryPickDialog {...defaultProps} />);

    expect(screen.getByText('merge.cherryPick.noCommit')).toBeInTheDocument();
  });

  it('should render cancel and pick buttons', () => {
    render(<CherryPickDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText('merge.cherryPick.pickButton')).toBeInTheDocument();
  });

  it('should call cherryPickApi.cherryPick when pick button clicked', async () => {
    mockCherryPick.mockResolvedValue({ success: true, conflicts: [], message: '' });

    render(<CherryPickDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('merge.cherryPick.pickButton'));

    await waitFor(() => {
      expect(mockCherryPick).toHaveBeenCalledWith({
        commits: ['abc123def456'],
        noCommit: false,
        allowEmpty: false,
      });
    });
  });

  it('should pass noCommit option when checked', async () => {
    mockCherryPick.mockResolvedValue({ success: true, conflicts: [], message: '' });

    render(<CherryPickDialog {...defaultProps} />);

    fireEvent.click(screen.getByTestId('no-commit'));
    fireEvent.click(screen.getByText('merge.cherryPick.pickButton'));

    await waitFor(() => {
      expect(mockCherryPick).toHaveBeenCalledWith({
        commits: ['abc123def456'],
        noCommit: true,
        allowEmpty: false,
      });
    });
  });

  it('should close dialog after successful cherry-pick', async () => {
    mockCherryPick.mockResolvedValue({ success: true, conflicts: [], message: '' });
    const onClose = vi.fn();

    render(<CherryPickDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('merge.cherryPick.pickButton'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should call onCherryPickComplete after successful cherry-pick', async () => {
    const result = { success: true, conflicts: [], message: '' };
    mockCherryPick.mockResolvedValue(result);
    const onCherryPickComplete = vi.fn();

    render(<CherryPickDialog {...defaultProps} onCherryPickComplete={onCherryPickComplete} />);

    fireEvent.click(screen.getByText('merge.cherryPick.pickButton'));

    await waitFor(() => {
      expect(onCherryPickComplete).toHaveBeenCalledWith(result);
    });
  });

  it('should show error when cherry-pick fails', async () => {
    mockCherryPick.mockRejectedValue(new Error('Cherry-pick failed'));

    render(<CherryPickDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('merge.cherryPick.pickButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });
  });

  it('should track operation', async () => {
    mockCherryPick.mockResolvedValue({ success: true, conflicts: [], message: '' });

    render(<CherryPickDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('merge.cherryPick.pickButton'));

    await waitFor(() => {
      expect(mockTrackOperation).toHaveBeenCalled();
    });
  });

  it('should disable pick button when no commits', () => {
    render(<CherryPickDialog {...defaultProps} commits={[]} />);

    const pickButton = screen.getByText('merge.cherryPick.pickButton');
    expect(pickButton).toBeDisabled();
  });
});
