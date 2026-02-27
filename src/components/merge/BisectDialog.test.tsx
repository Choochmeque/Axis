import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BisectMarkType } from '@/types';
import { BisectDialog } from './BisectDialog';

// Mock hooks
const mockTrackOperation = vi.fn((_, fn) => fn());
vi.mock('@/hooks', () => ({
  useOperation: () => ({ trackOperation: mockTrackOperation }),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock API
const mockGetState = vi.fn();
const mockStart = vi.fn();
const mockMark = vi.fn();
const mockReset = vi.fn();
vi.mock('@/services/api', () => ({
  bisectApi: {
    getState: () => mockGetState(),
    start: (params: unknown) => mockStart(params),
    mark: (mark: BisectMarkType) => mockMark(mark),
    reset: () => mockReset(),
  },
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        let result = key;
        Object.entries(params).forEach(([k, v]) => {
          result += ` ${k}=${v}`;
        });
        return result;
      }
      return key;
    },
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
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
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
  Input: ({ id, value, onChange, placeholder, disabled }: any) => (
    <input
      id={id}
      data-testid={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
    </div>
  ),
}));

describe('BisectDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnBisectComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetState.mockResolvedValue({ isActive: false });
  });

  it('should not render when closed', () => {
    render(<BisectDialog isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render start form when open and bisect not active', async () => {
    render(<BisectDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    expect(screen.getByTestId('good-commit')).toBeInTheDocument();
    expect(screen.getByTestId('bad-commit')).toBeInTheDocument();
    expect(screen.getByText('merge.bisect.startButton')).toBeInTheDocument();
  });

  it('should use initial bad and good commit values', async () => {
    render(
      <BisectDialog isOpen={true} onClose={mockOnClose} badCommit="abc123" goodCommit="def456" />
    );

    await waitFor(() => {
      expect(screen.getByTestId('good-commit')).toHaveValue('def456');
      expect(screen.getByTestId('bad-commit')).toHaveValue('abc123');
    });
  });

  it('should disable start button when good commit is empty', async () => {
    render(<BisectDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    // Button should be disabled when good commit is empty
    expect(screen.getByText('merge.bisect.startButton')).toBeDisabled();

    // Enter good commit
    fireEvent.change(screen.getByTestId('good-commit'), { target: { value: 'good123' } });

    // Button should now be enabled
    expect(screen.getByText('merge.bisect.startButton')).not.toBeDisabled();
  });

  it('should start bisect with good commit', async () => {
    mockStart.mockResolvedValue({
      success: true,
      state: {
        isActive: true,
        currentCommit: 'abc1234567890',
        stepsRemaining: 5,
        totalCommits: 10,
      },
    });

    render(<BisectDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('good-commit'), { target: { value: 'good123' } });
    fireEvent.change(screen.getByTestId('bad-commit'), { target: { value: 'bad456' } });
    fireEvent.click(screen.getByText('merge.bisect.startButton'));

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith({
        goodCommit: 'good123',
        badCommit: 'bad456',
      });
    });
  });

  it('should show mark buttons when bisect is active', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'test123456789',
      stepsRemaining: 3,
      totalCommits: 8,
    });

    render(<BisectDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('merge.bisect.good')).toBeInTheDocument();
      expect(screen.getByText('merge.bisect.bad')).toBeInTheDocument();
      expect(screen.getByText('merge.bisect.skip')).toBeInTheDocument();
    });
  });

  it('should mark commit as good', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'test123456789',
    });

    mockMark.mockResolvedValue({
      success: true,
      state: {
        isActive: true,
        currentCommit: 'next123456789',
      },
    });

    render(<BisectDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('merge.bisect.good')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('merge.bisect.good'));

    await waitFor(() => {
      expect(mockMark).toHaveBeenCalledWith(BisectMarkType.Good);
    });
  });

  it('should mark commit as bad', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'test123456789',
    });

    mockMark.mockResolvedValue({
      success: true,
      state: {
        isActive: true,
        currentCommit: 'next123456789',
      },
    });

    render(<BisectDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('merge.bisect.bad')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('merge.bisect.bad'));

    await waitFor(() => {
      expect(mockMark).toHaveBeenCalledWith(BisectMarkType.Bad);
    });
  });

  it('should mark commit as skip', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'test123456789',
    });

    mockMark.mockResolvedValue({
      success: true,
      state: {
        isActive: true,
        currentCommit: 'next123456789',
      },
    });

    render(<BisectDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('merge.bisect.skip')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('merge.bisect.skip'));

    await waitFor(() => {
      expect(mockMark).toHaveBeenCalledWith(BisectMarkType.Skip);
    });
  });

  it('should show first bad commit when found', async () => {
    mockGetState.mockResolvedValue({
      isActive: false,
      firstBadCommit: 'badbadcommit123456789',
    });

    render(<BisectDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('merge.bisect.firstBadFound')).toBeInTheDocument();
      expect(screen.getByText('badbadcommit123456789')).toBeInTheDocument();
    });
  });

  it('should call onBisectComplete when bad commit is found', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'test123456789',
    });

    const result = {
      success: true,
      state: {
        isActive: false,
        firstBadCommit: 'foundbadbad123',
      },
    };

    mockMark.mockResolvedValue(result);

    render(
      <BisectDialog isOpen={true} onClose={mockOnClose} onBisectComplete={mockOnBisectComplete} />
    );

    await waitFor(() => {
      expect(screen.getByText('merge.bisect.bad')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('merge.bisect.bad'));

    await waitFor(() => {
      expect(mockOnBisectComplete).toHaveBeenCalledWith(result);
    });
  });

  it('should reset bisect session', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'test123456789',
    });

    mockReset.mockResolvedValue(undefined);

    render(<BisectDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('merge.bisect.endButton')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('merge.bisect.endButton'));

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle start error', async () => {
    mockStart.mockRejectedValue(new Error('Start failed'));

    render(<BisectDialog isOpen={true} onClose={mockOnClose} goodCommit="good123" />);

    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('merge.bisect.startButton'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveTextContent('Start failed');
    });
  });

  it('should handle mark error', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'test123456789',
    });

    mockMark.mockRejectedValue(new Error('Mark failed'));

    render(<BisectDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('merge.bisect.good')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('merge.bisect.good'));

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveTextContent('Mark failed');
    });
  });

  it('should show steps remaining when active', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'test123456789',
      stepsRemaining: 4,
      totalCommits: 12,
      goodCommits: ['g1', 'g2'],
      skippedCommits: ['s1'],
    });

    render(<BisectDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText(/merge.bisect.stepsRemaining/)).toBeInTheDocument();
      expect(screen.getByText(/merge.bisect.goodCount/)).toBeInTheDocument();
      expect(screen.getByText(/merge.bisect.skippedCount/)).toBeInTheDocument();
    });
  });
});
