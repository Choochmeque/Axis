import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PushDialog } from './PushDialog';

// Mock API
const mockPushCurrentBranch = vi.fn();
const mockList = vi.fn();

vi.mock('../../services/api', () => ({
  remoteApi: {
    pushCurrentBranch: (...args: unknown[]) => mockPushCurrentBranch(...args),
    list: () => mockList(),
  },
}));

// Mock store
const mockLoadBranches = vi.fn();
const mockRefreshRepository = vi.fn();
const mockBranches = [
  { name: 'main', isHead: true, upstream: 'origin/main', ahead: 2, behind: 0 },
  { name: 'feature', isHead: false, upstream: null },
];

vi.mock('../../store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    branches: mockBranches,
    loadBranches: mockLoadBranches,
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

describe('PushDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([{ name: 'origin', url: 'https://github.com/test/repo.git' }]);
  });

  it('should not render when closed', () => {
    render(<PushDialog isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render when open', async () => {
    render(<PushDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('remotes.push.title');
  });

  it('should show current branch info', () => {
    render(<PushDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('should show commits ahead count', () => {
    render(<PushDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should push when button is clicked', async () => {
    mockPushCurrentBranch.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<PushDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('remotes.push.pushButton'));

    await waitFor(() => {
      expect(mockPushCurrentBranch).toHaveBeenCalledWith(
        'origin',
        expect.objectContaining({
          force: false,
          tags: false,
        })
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should enable force push option', async () => {
    mockPushCurrentBranch.mockResolvedValue(undefined);
    mockLoadBranches.mockResolvedValue(undefined);
    mockRefreshRepository.mockResolvedValue(undefined);

    render(<PushDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });

    // Check force push
    fireEvent.click(screen.getByTestId('force-push'));

    fireEvent.click(screen.getByText('remotes.push.pushButton'));

    await waitFor(() => {
      expect(mockPushCurrentBranch).toHaveBeenCalledWith(
        'origin',
        expect.objectContaining({
          force: true,
        })
      );
    });
  });

  it('should show error when push fails', async () => {
    mockPushCurrentBranch.mockRejectedValue(new Error('Push failed'));

    render(<PushDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('remotes.push.pushButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveTextContent('Push failed');
    });
  });

  it('should show push with tags option', async () => {
    render(<PushDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('tags')).toBeInTheDocument();
  });
});
