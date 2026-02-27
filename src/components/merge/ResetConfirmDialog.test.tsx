import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Commit } from '@/types';
import { ResetMode } from '@/types';
import { ResetConfirmDialog } from './ResetConfirmDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (opts) return `${key}: ${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

const mockReset = vi.fn();

vi.mock('@/services/api', () => ({
  operationApi: {
    reset: (opts: unknown) => mockReset(opts),
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('ResetConfirmDialog', () => {
  const mockCommit: Commit = {
    oid: 'abc123def456',
    shortOid: 'abc123d',
    message: 'This is a test commit message',
    summary: 'Test commit message',
    author: { name: 'Test', email: 'test@example.com', timestamp: new Date().toISOString() },
    committer: { name: 'Test', email: 'test@example.com', timestamp: new Date().toISOString() },
    parentOids: [],
    timestamp: new Date().toISOString(),
    isMerge: false,
    signature: null,
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onResetComplete: vi.fn(),
    commit: mockCommit,
    mode: ResetMode.Mixed,
    currentBranch: 'main',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<ResetConfirmDialog {...defaultProps} />);

    expect(screen.getByText('merge.reset.mixed.title')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ResetConfirmDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('merge.reset.mixed.title')).not.toBeInTheDocument();
  });

  it('should display branch name', () => {
    render(<ResetConfirmDialog {...defaultProps} />);

    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('merge.reset.branch')).toBeInTheDocument();
  });

  it('should display commit info', () => {
    render(<ResetConfirmDialog {...defaultProps} />);

    expect(screen.getByText('abc123d')).toBeInTheDocument();
    expect(screen.getByText('Test commit message')).toBeInTheDocument();
  });

  it('should show soft reset info for soft mode', () => {
    render(<ResetConfirmDialog {...defaultProps} mode={ResetMode.Soft} />);

    expect(screen.getByText('merge.reset.soft.title')).toBeInTheDocument();
    expect(screen.getByText('merge.reset.soft.description')).toBeInTheDocument();
    expect(screen.getByText('merge.reset.soft.warning')).toBeInTheDocument();
  });

  it('should show mixed reset info for mixed mode', () => {
    render(<ResetConfirmDialog {...defaultProps} mode={ResetMode.Mixed} />);

    expect(screen.getByText('merge.reset.mixed.title')).toBeInTheDocument();
    expect(screen.getByText('merge.reset.mixed.description')).toBeInTheDocument();
    expect(screen.getByText('merge.reset.mixed.warning')).toBeInTheDocument();
  });

  it('should show hard reset info for hard mode', () => {
    render(<ResetConfirmDialog {...defaultProps} mode={ResetMode.Hard} />);

    expect(screen.getByText('merge.reset.hard.title')).toBeInTheDocument();
    expect(screen.getByText('merge.reset.hard.description')).toBeInTheDocument();
    expect(screen.getByText('merge.reset.hard.warning')).toBeInTheDocument();
  });

  it('should have cancel and reset buttons', () => {
    render(<ResetConfirmDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText(/merge\.reset\.resetButton/)).toBeInTheDocument();
  });

  it('should call reset API when reset button clicked', async () => {
    mockReset.mockResolvedValue(undefined);

    render(<ResetConfirmDialog {...defaultProps} />);

    const resetButton = screen.getByText(/merge\.reset\.resetButton/);
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        target: 'abc123def456',
        mode: ResetMode.Mixed,
      });
    });
  });

  it('should call onResetComplete and onClose after successful reset', async () => {
    mockReset.mockResolvedValue(undefined);

    render(<ResetConfirmDialog {...defaultProps} />);

    const resetButton = screen.getByText(/merge\.reset\.resetButton/);
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(defaultProps.onResetComplete).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('should show error when reset fails', async () => {
    mockReset.mockRejectedValue(new Error('Reset failed'));

    render(<ResetConfirmDialog {...defaultProps} />);

    const resetButton = screen.getByText(/merge\.reset\.resetButton/);
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Reset failed')).toBeInTheDocument();
    });
  });
});
