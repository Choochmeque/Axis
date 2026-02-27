import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Branch } from '@/types';
import { RenameBranchDialog } from './RenameBranchDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (opts) return `${key}: ${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

const mockRename = vi.fn();
const mockLoadBranches = vi.fn();
const mockRefreshRepository = vi.fn();

vi.mock('../../services/api', () => ({
  branchApi: {
    rename: (...args: unknown[]) => mockRename(...args),
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

vi.mock('@/lib/branchValidation', () => ({
  validateBranchName: (name: string) => {
    if (name.includes(' ')) return 'Branch name cannot contain spaces';
    return null;
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
  FormField: ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
  Input: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => <input value={value} onChange={onChange} data-testid="branch-name-input" />,
  CheckboxField: ({
    label,
    checked,
    onCheckedChange,
  }: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        data-testid="force-checkbox"
      />
      {label}
    </label>
  ),
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
}));

describe('RenameBranchDialog', () => {
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

  it('should return null when branch is null', () => {
    const { container } = render(
      <RenameBranchDialog isOpen={true} onClose={vi.fn()} branch={null} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render when closed', () => {
    render(<RenameBranchDialog isOpen={false} onClose={vi.fn()} branch={mockBranch} />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when open', () => {
    render(<RenameBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('branches.rename.title')).toBeInTheDocument();
  });

  it('should show current branch name', () => {
    render(<RenameBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    expect(screen.getByText('feature-branch')).toBeInTheDocument();
  });

  it('should pre-fill input with current branch name', () => {
    render(<RenameBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    const input = screen.getByTestId('branch-name-input');
    expect(input).toHaveValue('feature-branch');
  });

  it('should disable rename button when name is unchanged', () => {
    render(<RenameBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    const renameButton = screen.getByText('branches.rename.renameButton');
    expect(renameButton).toBeDisabled();
  });

  it('should enable rename button when name is changed', () => {
    render(<RenameBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    const input = screen.getByTestId('branch-name-input');
    fireEvent.change(input, { target: { value: 'new-name' } });

    const renameButton = screen.getByText('branches.rename.renameButton');
    expect(renameButton).not.toBeDisabled();
  });

  it('should call branchApi.rename when rename button clicked', async () => {
    mockRename.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<RenameBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    const input = screen.getByTestId('branch-name-input');
    fireEvent.change(input, { target: { value: 'new-branch' } });

    fireEvent.click(screen.getByText('branches.rename.renameButton'));

    await waitFor(() => {
      expect(mockRename).toHaveBeenCalledWith('feature-branch', 'new-branch', false);
    });
  });

  it('should pass force flag when checkbox is checked', async () => {
    mockRename.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<RenameBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    const input = screen.getByTestId('branch-name-input');
    fireEvent.change(input, { target: { value: 'new-branch' } });

    const checkbox = screen.getByTestId('force-checkbox');
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByText('branches.rename.renameButton'));

    await waitFor(() => {
      expect(mockRename).toHaveBeenCalledWith('feature-branch', 'new-branch', true);
    });
  });

  it('should show error when rename fails', async () => {
    mockRename.mockRejectedValue(new Error('Rename failed'));

    render(<RenameBranchDialog isOpen={true} onClose={vi.fn()} branch={mockBranch} />);

    const input = screen.getByTestId('branch-name-input');
    fireEvent.change(input, { target: { value: 'new-branch' } });

    fireEvent.click(screen.getByText('branches.rename.renameButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });
  });

  it('should show current branch status when isHead', () => {
    const headBranch: Branch = { ...mockBranch, isHead: true };

    render(<RenameBranchDialog isOpen={true} onClose={vi.fn()} branch={headBranch} />);

    expect(screen.getByText('branches.rename.currentBranchStatus')).toBeInTheDocument();
  });
});
