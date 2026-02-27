import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PullDialog } from './PullDialog';

// Mock API
const mockPull = vi.fn();
const mockList = vi.fn();

vi.mock('../../services/api', () => ({
  remoteApi: {
    pull: (...args: unknown[]) => mockPull(...args),
    list: () => mockList(),
  },
}));

// Mock store
const mockLoadBranches = vi.fn();
const mockLoadCommits = vi.fn();
const mockRefreshRepository = vi.fn();
const mockBranches = [
  { name: 'main', isHead: true, upstream: 'origin/main', ahead: 0, behind: 3 },
  { name: 'feature', isHead: false, upstream: null },
];

vi.mock('../../store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    branches: mockBranches,
    loadBranches: mockLoadBranches,
    loadCommits: mockLoadCommits,
    refreshRepository: mockRefreshRepository,
  }),
}));

// Mock hooks
vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  useOperationProgress: () => null,
  useSshKeyCheck: () => ({
    checkSshKeyForRemote: (_remote: string, onProceed: () => void) => {
      onProceed();
      return Promise.resolve(true);
    },
  }),
}));

// Mock errorUtils
vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (error: Error) => error.message,
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
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogClose: ({ children }: any) => children,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FormField: ({ children, label }: any) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Select: ({ children, id, value, onValueChange, disabled }: any) => (
    <select
      id={id}
      data-testid={id}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CheckboxField: ({ id, label, checked, onCheckedChange, disabled }: any) => (
    <div>
      <input
        type="checkbox"
        id={id}
        data-testid={id}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  OperationProgressBar: ({ progress }: any) => <div data-testid="progress-bar">{progress}%</div>,
}));

describe('PullDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([{ name: 'origin', url: 'https://github.com/test/repo.git' }]);
  });

  it('should not render when closed', () => {
    render(<PullDialog isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render when open', async () => {
    render(<PullDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('remotes.pull.title');
  });

  it('should show current branch info', () => {
    render(<PullDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('should show commits behind count', () => {
    render(<PullDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should pull when button is clicked', async () => {
    mockPull.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockLoadCommits.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<PullDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('remotes.pull.pullButton'));

    await waitFor(() => {
      expect(mockPull).toHaveBeenCalledWith(
        'origin',
        'main',
        expect.objectContaining({
          rebase: false,
          ffOnly: false,
        })
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should enable rebase option', async () => {
    mockPull.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockLoadCommits.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<PullDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });

    // Check rebase
    fireEvent.click(screen.getByTestId('rebase'));

    fireEvent.click(screen.getByText('remotes.pull.pullButton'));

    await waitFor(() => {
      expect(mockPull).toHaveBeenCalledWith(
        'origin',
        'main',
        expect.objectContaining({
          rebase: true,
        })
      );
    });
  });

  it('should enable ff-only option', async () => {
    mockPull.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockLoadCommits.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<PullDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });

    // Check ff-only
    fireEvent.click(screen.getByTestId('ff-only'));

    fireEvent.click(screen.getByText('remotes.pull.pullButton'));

    await waitFor(() => {
      expect(mockPull).toHaveBeenCalledWith(
        'origin',
        'main',
        expect.objectContaining({
          ffOnly: true,
        })
      );
    });
  });

  it('should show error when pull fails', async () => {
    mockPull.mockRejectedValue(new Error('Pull failed'));

    render(<PullDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('remotes.pull.pullButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveTextContent('Pull failed');
    });
  });

  it('should show fast-forward error message', async () => {
    mockPull.mockRejectedValue(new Error('fast-forward not possible'));

    render(<PullDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('remotes.pull.pullButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveTextContent('remotes.pull.errors.fastForward');
    });
  });
});
