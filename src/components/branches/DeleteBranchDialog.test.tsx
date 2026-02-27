import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Branch } from '@/types';
import { DeleteBranchDialog } from './DeleteBranchDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (opts) return `${key}: ${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

const mockDelete = vi.fn();
const mockLoadBranches = vi.fn();
const mockRefreshRepository = vi.fn();

vi.mock('../../services/api', () => ({
  branchApi: {
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('../../store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    loadBranches: mockLoadBranches,
    refreshRepository: mockRefreshRepository,
  }),
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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
  CheckboxField: ({
    label,
    checked,
    onCheckedChange,
    id,
  }: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    id: string;
  }) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        data-testid={id}
      />
      {label}
    </label>
  ),
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
}));

describe('DeleteBranchDialog', () => {
  const mockBranch: Branch = {
    name: 'feature-branch',
    fullName: 'refs/heads/feature-branch',
    branchType: 'Local',
    isHead: false,
    targetOid: 'abc123',
    upstream: null,
    ahead: null,
    behind: null,
    lastCommitSummary: 'Test commit',
    lastCommitTime: '2024-01-15T10:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when branch is undefined', () => {
    const { container } = render(<DeleteBranchDialog isOpen={true} onClose={vi.fn()} />);

    expect(container.firstChild).toBeNull();
  });

  it('should not render when closed', () => {
    render(<DeleteBranchDialog isOpen={false} onClose={vi.fn()} branch={mockBranch} />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when open', () => {
    render(<DeleteBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('branches.delete.title')).toBeInTheDocument();
  });

  it('should show branch name', () => {
    render(<DeleteBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    expect(screen.getByText('feature-branch')).toBeInTheDocument();
  });

  it('should show last commit summary', () => {
    render(<DeleteBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    expect(screen.getByText('Test commit')).toBeInTheDocument();
  });

  it('should show warning alert', () => {
    render(<DeleteBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    expect(screen.getByText('branches.delete.warning')).toBeInTheDocument();
  });

  it('should show force delete checkbox', () => {
    render(<DeleteBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    expect(screen.getByText('branches.delete.forceDelete')).toBeInTheDocument();
  });

  it('should show delete remote checkbox when branch has upstream', () => {
    const branchWithUpstream = { ...mockBranch, upstream: 'origin/feature-branch' };
    render(<DeleteBranchDialog isOpen={true} onClose={vi.fn()} branch={branchWithUpstream} />);

    expect(screen.getByText(/branches.delete.deleteRemote/)).toBeInTheDocument();
  });

  it('should not show delete remote checkbox when branch has no upstream', () => {
    render(<DeleteBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    expect(screen.queryByTestId('delete-remote')).not.toBeInTheDocument();
  });

  it('should call branchApi.delete when delete button clicked', async () => {
    mockDelete.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<DeleteBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    fireEvent.click(screen.getByText('branches.delete.deleteButton'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('feature-branch', {
        force: false,
        deleteRemote: false,
      });
    });
  });

  it('should pass force flag when checkbox is checked', async () => {
    mockDelete.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<DeleteBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    fireEvent.click(screen.getByTestId('force-delete'));
    fireEvent.click(screen.getByText('branches.delete.deleteButton'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('feature-branch', {
        force: true,
        deleteRemote: false,
      });
    });
  });

  it('should pass deleteRemote flag when checkbox is checked', async () => {
    mockDelete.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    const branchWithUpstream = { ...mockBranch, upstream: 'origin/feature-branch' };
    render(<DeleteBranchDialog isOpen={true} onClose={vi.fn()} branch={branchWithUpstream} />);

    fireEvent.click(screen.getByTestId('delete-remote'));
    fireEvent.click(screen.getByText('branches.delete.deleteButton'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('feature-branch', {
        force: false,
        deleteRemote: true,
      });
    });
  });

  it('should show error when delete fails', async () => {
    mockDelete.mockRejectedValue(new Error('Delete failed'));

    render(<DeleteBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    fireEvent.click(screen.getByText('branches.delete.deleteButton'));

    await waitFor(() => {
      expect(screen.getAllByTestId('alert').length).toBeGreaterThan(0);
    });
  });

  it('should close dialog after successful delete', async () => {
    mockDelete.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<DeleteBranchDialog isOpen={true} onClose={onClose} branch={mockBranch} />);

    fireEvent.click(screen.getByText('branches.delete.deleteButton'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
