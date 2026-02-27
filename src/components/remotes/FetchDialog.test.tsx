import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchDialog } from './FetchDialog';

// Mock API
const mockFetch = vi.fn();
const mockFetchAll = vi.fn();
const mockList = vi.fn();
const mockCancelOperation = vi.fn();

vi.mock('../../services/api', () => ({
  remoteApi: {
    fetch: (...args: unknown[]) => mockFetch(...args),
    fetchAll: () => mockFetchAll(),
    list: () => mockList(),
  },
  shellApi: {
    cancelOperation: (id: string) => mockCancelOperation(id),
  },
}));

// Mock store
const mockLoadBranches = vi.fn();
const mockRefreshRepository = vi.fn();
vi.mock('../../store/repositoryStore', () => ({
  useRepositoryStore: Object.assign(
    () => ({
      loadBranches: mockLoadBranches,
      refreshRepository: mockRefreshRepository,
    }),
    {
      getState: () => ({
        branches: [],
      }),
    }
  ),
}));

// Mock hooks
let mockOperationProgress: { id: string; progress: object } | null = null;
vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  useOperationProgress: () => mockOperationProgress,
  useSshKeyCheck: () => ({
    checkSshKeyForRemote: (_remote: string, onProceed: () => void) => {
      onProceed();
      return Promise.resolve(true);
    },
  }),
}));

// Mock actions
vi.mock('@/lib/actions', () => ({
  notifyNewCommits: vi.fn(),
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
  Dialog: ({ children, open, onOpenChange }: any) =>
    open ? (
      <div data-testid="dialog">
        <button data-testid="dialog-overlay" onClick={() => onOpenChange(false)} />
        {children}
      </div>
    ) : null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogBody: ({ children }: any) => <div data-testid="dialog-body">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
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
  OperationProgressBar: () => <div data-testid="progress-bar" />,
}));

describe('FetchDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOperationProgress = null;
    mockList.mockResolvedValue([
      { name: 'origin', url: 'https://github.com/test/repo.git' },
      { name: 'upstream', url: 'https://github.com/upstream/repo.git' },
    ]);
  });

  it('should not render when closed', () => {
    render(<FetchDialog isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render when open', async () => {
    render(<FetchDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('remotes.fetch.title');
  });

  it('should load remotes when opened', async () => {
    render(<FetchDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
  });

  it('should have fetch all checked by default', () => {
    render(<FetchDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('fetch-all')).toBeChecked();
  });

  it('should show remote select when fetch all is unchecked', async () => {
    render(<FetchDialog isOpen={true} onClose={mockOnClose} />);

    // Uncheck fetch all
    fireEvent.click(screen.getByTestId('fetch-all'));

    await waitFor(() => {
      expect(screen.getByTestId('remote-select')).toBeInTheDocument();
    });
  });

  it('should fetch all when fetch all is checked', async () => {
    mockFetchAll.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<FetchDialog isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('remotes.fetch.fetchButton'));

    await waitFor(() => {
      expect(mockFetchAll).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should fetch specific remote when fetch all is unchecked', async () => {
    mockFetch.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<FetchDialog isOpen={true} onClose={mockOnClose} />);

    // Wait for remotes to load
    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });

    // Uncheck fetch all
    fireEvent.click(screen.getByTestId('fetch-all'));

    // Click fetch
    fireEvent.click(screen.getByText('remotes.fetch.fetchButton'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'origin',
        expect.objectContaining({
          prune: false,
          tags: false,
        })
      );
    });
  });

  it('should show error when fetch fails', async () => {
    mockFetchAll.mockRejectedValue(new Error('Fetch failed'));

    render(<FetchDialog isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('remotes.fetch.fetchButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveTextContent('Fetch failed');
    });
  });

  it('should enable prune option', async () => {
    mockFetch.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<FetchDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });

    // Uncheck fetch all
    fireEvent.click(screen.getByTestId('fetch-all'));

    // Check prune
    fireEvent.click(screen.getByTestId('prune'));

    // Click fetch
    fireEvent.click(screen.getByText('remotes.fetch.fetchButton'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'origin',
        expect.objectContaining({
          prune: true,
        })
      );
    });
  });

  it('should close directly when no operation is in progress', () => {
    render(<FetchDialog isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('common.cancel'));

    expect(mockOnClose).toHaveBeenCalled();
    expect(screen.queryByText('remotes.fetch.cancelConfirm')).not.toBeInTheDocument();
  });

  it('should show cancel confirmation when closing during ongoing operation', async () => {
    mockOperationProgress = { id: 'op-1', progress: { stage: 'Receiving' } };
    // Make fetchAll hang so isLoading stays true
    mockFetchAll.mockReturnValue(new Promise(() => {}));

    render(<FetchDialog isOpen={true} onClose={mockOnClose} />);

    // Start fetch
    fireEvent.click(screen.getByText('remotes.fetch.fetchButton'));

    // Try to close via cancel button
    await waitFor(() => {
      expect(screen.getByText('common.cancel')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('common.cancel'));

    // Should show confirmation, not close
    expect(mockOnClose).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('remotes.fetch.cancelConfirm')).toBeInTheDocument();
    });
  });

  it('should cancel operation when confirmed', async () => {
    mockOperationProgress = { id: 'op-fetch-1', progress: { stage: 'Receiving' } };
    mockFetchAll.mockReturnValue(new Promise(() => {}));
    mockCancelOperation.mockResolvedValue(true);

    render(<FetchDialog isOpen={true} onClose={mockOnClose} />);

    // Start fetch
    fireEvent.click(screen.getByText('remotes.fetch.fetchButton'));

    // Try to close
    await waitFor(() => {
      expect(screen.getByText('common.cancel')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('common.cancel'));

    // Confirm cancel
    await waitFor(() => {
      expect(screen.getByText('remotes.fetch.cancelOperation')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('remotes.fetch.cancelOperation'));

    await waitFor(() => {
      expect(mockCancelOperation).toHaveBeenCalledWith('op-fetch-1');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should return to dialog when continue is clicked', async () => {
    mockOperationProgress = { id: 'op-1', progress: { stage: 'Receiving' } };
    mockFetchAll.mockReturnValue(new Promise(() => {}));

    render(<FetchDialog isOpen={true} onClose={mockOnClose} />);

    // Start fetch
    fireEvent.click(screen.getByText('remotes.fetch.fetchButton'));

    // Try to close
    await waitFor(() => {
      expect(screen.getByText('common.cancel')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('common.cancel'));

    // Click continue
    await waitFor(() => {
      expect(screen.getByText('remotes.fetch.continueOperation')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('remotes.fetch.continueOperation'));

    // Should not close, should be back to normal view
    expect(mockOnClose).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('remotes.fetch.cancelConfirm')).not.toBeInTheDocument();
    });
  });

  it('should show cancel confirmation when clicking overlay during operation', async () => {
    mockOperationProgress = { id: 'op-1', progress: { stage: 'Receiving' } };
    mockFetchAll.mockReturnValue(new Promise(() => {}));

    render(<FetchDialog isOpen={true} onClose={mockOnClose} />);

    // Start fetch
    fireEvent.click(screen.getByText('remotes.fetch.fetchButton'));

    // Click overlay (triggers onOpenChange(false))
    await waitFor(() => {
      expect(screen.getByTestId('dialog-overlay')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('dialog-overlay'));

    // Should show confirmation, not close
    expect(mockOnClose).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('remotes.fetch.cancelConfirm')).toBeInTheDocument();
    });
  });
});
