import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Worktree } from '@/types';
import { RemoveWorktreeDialog } from './RemoveWorktreeDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockRemove = vi.fn();
const mockLoadWorktrees = vi.fn();
const mockTrackOperation = vi.fn();

vi.mock('@/services/api', () => ({
  worktreeApi: {
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    loadWorktrees: mockLoadWorktrees,
  }),
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  useOperation: () => ({
    trackOperation: async (_opts: Record<string, unknown>, fn: () => Promise<void>) => {
      mockTrackOperation();
      await fn();
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

describe('RemoveWorktreeDialog', () => {
  const mockWorktree: Worktree = {
    path: '/path/to/worktree',
    branch: 'feature-branch',
    headOid: 'abc123',
    shortOid: 'abc123',
    isLocked: false,
    lockReason: null,
    isMain: false,
    isPrunable: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(<RemoveWorktreeDialog open={false} onOpenChange={vi.fn()} worktree={mockWorktree} />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when open', () => {
    render(<RemoveWorktreeDialog open={true} onOpenChange={vi.fn()} worktree={mockWorktree} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('worktrees.remove.title')).toBeInTheDocument();
  });

  it('should render confirm message', () => {
    render(<RemoveWorktreeDialog open={true} onOpenChange={vi.fn()} worktree={mockWorktree} />);

    expect(screen.getByText('worktrees.remove.confirmMessage')).toBeInTheDocument();
  });

  it('should render worktree path', () => {
    render(<RemoveWorktreeDialog open={true} onOpenChange={vi.fn()} worktree={mockWorktree} />);

    expect(screen.getByText('/path/to/worktree')).toBeInTheDocument();
  });

  it('should render branch name when present', () => {
    render(<RemoveWorktreeDialog open={true} onOpenChange={vi.fn()} worktree={mockWorktree} />);

    expect(screen.getByText('worktrees.remove.branchLabel')).toBeInTheDocument();
    expect(screen.getByText('feature-branch')).toBeInTheDocument();
  });

  it('should not render branch label when branch is null', () => {
    const worktreeWithoutBranch: Worktree = { ...mockWorktree, branch: null };
    render(
      <RemoveWorktreeDialog open={true} onOpenChange={vi.fn()} worktree={worktreeWithoutBranch} />
    );

    expect(screen.queryByText('worktrees.remove.branchLabel')).toBeNull();
  });

  it('should render force checkbox', () => {
    render(<RemoveWorktreeDialog open={true} onOpenChange={vi.fn()} worktree={mockWorktree} />);

    expect(screen.getByText('worktrees.remove.forceLabel')).toBeInTheDocument();
  });

  it('should render cancel and remove buttons', () => {
    render(<RemoveWorktreeDialog open={true} onOpenChange={vi.fn()} worktree={mockWorktree} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText('worktrees.remove.removeButton')).toBeInTheDocument();
  });

  it('should call worktreeApi.remove when remove button clicked', async () => {
    mockRemove.mockResolvedValue(undefined);
    mockLoadWorktrees.mockResolvedValue(undefined);

    render(<RemoveWorktreeDialog open={true} onOpenChange={vi.fn()} worktree={mockWorktree} />);

    fireEvent.click(screen.getByText('worktrees.remove.removeButton'));

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith({
        path: '/path/to/worktree',
        force: false,
      });
    });
  });

  it('should pass force option when checked', async () => {
    mockRemove.mockResolvedValue(undefined);
    mockLoadWorktrees.mockResolvedValue(undefined);

    render(<RemoveWorktreeDialog open={true} onOpenChange={vi.fn()} worktree={mockWorktree} />);

    fireEvent.click(screen.getByTestId('force-remove'));
    fireEvent.click(screen.getByText('worktrees.remove.removeButton'));

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith({
        path: '/path/to/worktree',
        force: true,
      });
    });
  });

  it('should load worktrees after removing', async () => {
    mockRemove.mockResolvedValue(undefined);
    mockLoadWorktrees.mockResolvedValue(undefined);

    render(<RemoveWorktreeDialog open={true} onOpenChange={vi.fn()} worktree={mockWorktree} />);

    fireEvent.click(screen.getByText('worktrees.remove.removeButton'));

    await waitFor(() => {
      expect(mockLoadWorktrees).toHaveBeenCalled();
    });
  });

  it('should close dialog after successful remove', async () => {
    mockRemove.mockResolvedValue(undefined);
    mockLoadWorktrees.mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <RemoveWorktreeDialog open={true} onOpenChange={onOpenChange} worktree={mockWorktree} />
    );

    fireEvent.click(screen.getByText('worktrees.remove.removeButton'));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should show error when remove fails', async () => {
    mockRemove.mockRejectedValue(new Error('Remove failed'));

    render(<RemoveWorktreeDialog open={true} onOpenChange={vi.fn()} worktree={mockWorktree} />);

    fireEvent.click(screen.getByText('worktrees.remove.removeButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });
  });

  it('should track operation', async () => {
    mockRemove.mockResolvedValue(undefined);
    mockLoadWorktrees.mockResolvedValue(undefined);

    render(<RemoveWorktreeDialog open={true} onOpenChange={vi.fn()} worktree={mockWorktree} />);

    fireEvent.click(screen.getByText('worktrees.remove.removeButton'));

    await waitFor(() => {
      expect(mockTrackOperation).toHaveBeenCalled();
    });
  });
});
