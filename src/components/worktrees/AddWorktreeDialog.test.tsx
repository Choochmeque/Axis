import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddWorktreeDialog } from './AddWorktreeDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockAdd = vi.fn();
const mockList = vi.fn();
const mockLoadWorktrees = vi.fn();
const mockTrackOperation = vi.fn();

vi.mock('@/services/api', () => ({
  worktreeApi: {
    add: (...args: unknown[]) => mockAdd(...args),
  },
  branchApi: {
    list: (...args: unknown[]) => mockList(...args),
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
  FormField: ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
  Input: ({
    value,
    onChange,
    placeholder,
    id,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    id?: string;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid={id || 'input'}
    />
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

describe('AddWorktreeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
  });

  it('should not render when closed', () => {
    render(<AddWorktreeDialog open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('should render when open', () => {
    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('worktrees.add.title')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('worktrees.add.description')).toBeInTheDocument();
  });

  it('should render path input', () => {
    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('worktrees.add.pathLabel')).toBeInTheDocument();
    expect(screen.getByTestId('worktree-path')).toBeInTheDocument();
  });

  it('should render branch input', () => {
    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('worktrees.add.branchLabel')).toBeInTheDocument();
    expect(screen.getByTestId('worktree-branch')).toBeInTheDocument();
  });

  it('should render detach checkbox', () => {
    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('worktrees.add.detachLabel')).toBeInTheDocument();
  });

  it('should render create branch checkbox', () => {
    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('worktrees.add.createBranchLabel')).toBeInTheDocument();
  });

  it('should render cancel and add buttons', () => {
    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText('worktrees.add.addButton')).toBeInTheDocument();
  });

  it('should disable add button when path is empty', () => {
    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    const addButton = screen.getByText('worktrees.add.addButton');
    expect(addButton).toBeDisabled();
  });

  it('should call worktreeApi.add when form submitted', async () => {
    mockAdd.mockResolvedValue(undefined);
    mockLoadWorktrees.mockResolvedValue(undefined);

    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByTestId('worktree-path'), {
      target: { value: '/path/to/worktree' },
    });
    fireEvent.change(screen.getByTestId('worktree-branch'), {
      target: { value: 'feature-branch' },
    });
    fireEvent.click(screen.getByText('worktrees.add.addButton'));

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledWith({
        path: '/path/to/worktree',
        branch: 'feature-branch',
        createBranch: false,
        base: null,
        force: false,
        detach: false,
      });
    });
  });

  it('should load worktrees after adding', async () => {
    mockAdd.mockResolvedValue(undefined);
    mockLoadWorktrees.mockResolvedValue(undefined);

    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByTestId('worktree-path'), {
      target: { value: '/path/to/worktree' },
    });
    fireEvent.change(screen.getByTestId('worktree-branch'), {
      target: { value: 'feature-branch' },
    });
    fireEvent.click(screen.getByText('worktrees.add.addButton'));

    await waitFor(() => {
      expect(mockLoadWorktrees).toHaveBeenCalled();
    });
  });

  it('should show error when add fails', async () => {
    mockAdd.mockRejectedValue(new Error('Add failed'));

    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByTestId('worktree-path'), {
      target: { value: '/path/to/worktree' },
    });
    fireEvent.change(screen.getByTestId('worktree-branch'), {
      target: { value: 'feature-branch' },
    });
    fireEvent.click(screen.getByText('worktrees.add.addButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeInTheDocument();
    });
  });

  it('should track operation', async () => {
    mockAdd.mockResolvedValue(undefined);
    mockLoadWorktrees.mockResolvedValue(undefined);

    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByTestId('worktree-path'), {
      target: { value: '/path/to/worktree' },
    });
    fireEvent.change(screen.getByTestId('worktree-branch'), {
      target: { value: 'feature-branch' },
    });
    fireEvent.click(screen.getByText('worktrees.add.addButton'));

    await waitFor(() => {
      expect(mockTrackOperation).toHaveBeenCalled();
    });
  });

  it('should hide branch inputs when detach is checked', () => {
    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByTestId('detach-head'));

    expect(screen.queryByTestId('worktree-branch')).toBeNull();
  });

  it('should load branches when dialog opens', async () => {
    mockList.mockResolvedValue([
      { name: 'main', isRemote: false },
      { name: 'develop', isRemote: false },
    ]);

    render(<AddWorktreeDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(true, false);
    });
  });
});
