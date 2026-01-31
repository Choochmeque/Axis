import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RewordDialog } from './RewordDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: {
    getState: () => ({
      loadCommits: vi.fn().mockResolvedValue(undefined),
      loadStatus: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock('@/store/stagingStore', () => ({
  useStagingStore: {
    getState: () => ({
      loadStatus: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

const mockCloseRewordDialog = vi.fn();
const mockContinueWithMessage = vi.fn();
const mockLoadProgress = vi.fn();

vi.mock('@/store/rebaseProgressStore', () => ({
  useRebaseProgressStore: () => ({
    rewordDialogOpen: true,
    closeRewordDialog: mockCloseRewordDialog,
    progress: {
      currentStep: 3,
      totalSteps: 10,
      stoppedSha: 'abc123def456',
      commitMessage: 'original commit message',
    },
    isLoading: false,
    continueWithMessage: mockContinueWithMessage,
    loadProgress: mockLoadProgress,
  }),
}));

describe('RewordDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContinueWithMessage.mockResolvedValue(true);
    mockLoadProgress.mockResolvedValue(undefined);
  });

  it('should render when open', () => {
    render(<RewordDialog />);

    expect(screen.getByText('merge.reword.title')).toBeInTheDocument();
  });

  it('should show progress info', () => {
    render(<RewordDialog />);

    expect(screen.getByText('merge.reword.progress')).toBeInTheDocument();
  });

  it('should show stopped SHA', () => {
    render(<RewordDialog />);

    expect(screen.getByText('abc123d')).toBeInTheDocument();
  });

  it('should pre-fill with original commit message', () => {
    render(<RewordDialog />);

    const textarea = screen.getByPlaceholderText('merge.reword.placeholder');
    expect(textarea).toHaveValue('original commit message');
  });

  it('should have continue button', () => {
    render(<RewordDialog />);

    expect(screen.getByText('merge.reword.continue')).toBeInTheDocument();
  });

  it('should have cancel button', () => {
    render(<RewordDialog />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
  });

  it('should disable continue button when message is empty', () => {
    render(<RewordDialog />);

    const textarea = screen.getByPlaceholderText('merge.reword.placeholder');
    fireEvent.change(textarea, { target: { value: '' } });

    const continueButton = screen.getByText('merge.reword.continue');
    expect(continueButton).toBeDisabled();
  });

  it('should call continueWithMessage on continue click', async () => {
    render(<RewordDialog />);

    const continueButton = screen.getByText('merge.reword.continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockContinueWithMessage).toHaveBeenCalledWith('original commit message');
    });
  });

  it('should close dialog after successful continue', async () => {
    mockContinueWithMessage.mockResolvedValue(true);

    render(<RewordDialog />);

    const continueButton = screen.getByText('merge.reword.continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockCloseRewordDialog).toHaveBeenCalled();
    });
  });

  it('should not close dialog on failure', async () => {
    mockContinueWithMessage.mockResolvedValue(false);

    render(<RewordDialog />);

    const continueButton = screen.getByText('merge.reword.continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockContinueWithMessage).toHaveBeenCalled();
    });

    expect(mockCloseRewordDialog).not.toHaveBeenCalled();
  });

  it('should allow editing the message', () => {
    render(<RewordDialog />);

    const textarea = screen.getByPlaceholderText('merge.reword.placeholder');
    fireEvent.change(textarea, { target: { value: 'new commit message' } });

    expect(textarea).toHaveValue('new commit message');
  });

  it('should load progress after successful continue', async () => {
    mockContinueWithMessage.mockResolvedValue(true);

    render(<RewordDialog />);

    const continueButton = screen.getByText('merge.reword.continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockLoadProgress).toHaveBeenCalled();
    });
  });
});
