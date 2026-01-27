import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FetchDialog } from './FetchDialog';

// Mock API
const mockFetch = vi.fn();
const mockFetchAll = vi.fn();
const mockList = vi.fn();

vi.mock('../../services/api', () => ({
  remoteApi: {
    fetch: (...args: unknown[]) => mockFetch(...args),
    fetchAll: () => mockFetchAll(),
    list: () => mockList(),
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
vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  useOperationProgress: () => null,
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

describe('FetchDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
});
