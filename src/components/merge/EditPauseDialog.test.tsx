import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditPauseDialog } from './EditPauseDialog';

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

const mockRebaseContinue = vi.fn();
const mockRebaseAbort = vi.fn();

vi.mock('@/services/api', () => ({
  rebaseApi: {
    continue: () => mockRebaseContinue(),
    abort: () => mockRebaseAbort(),
  },
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: {
    getState: () => ({
      loadCommits: vi.fn().mockResolvedValue(undefined),
      loadStatus: vi.fn().mockResolvedValue(undefined),
      loadBranches: vi.fn().mockResolvedValue(undefined),
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

const mockCloseEditPauseDialog = vi.fn();
const mockLoadProgress = vi.fn();

vi.mock('@/store/rebaseProgressStore', () => ({
  useRebaseProgressStore: () => ({
    editPauseDialogOpen: true,
    closeEditPauseDialog: mockCloseEditPauseDialog,
    progress: {
      currentStep: 2,
      totalSteps: 5,
      stoppedSha: 'abc123def456',
      commitMessage: null,
    },
    loadProgress: mockLoadProgress,
  }),
}));

describe('EditPauseDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadProgress.mockResolvedValue(undefined);
  });

  it('should render when open', () => {
    render(<EditPauseDialog />);

    expect(screen.getByText('merge.editPause.title')).toBeInTheDocument();
  });

  it('should show progress info', () => {
    render(<EditPauseDialog />);

    expect(screen.getByText('merge.editPause.progress')).toBeInTheDocument();
  });

  it('should show stopped SHA', () => {
    render(<EditPauseDialog />);

    expect(screen.getByText('abc123d')).toBeInTheDocument();
  });

  it('should show paused warning', () => {
    render(<EditPauseDialog />);

    expect(screen.getByText('merge.editPause.paused')).toBeInTheDocument();
  });

  it('should show instructions', () => {
    render(<EditPauseDialog />);

    expect(screen.getByText('merge.editPause.instructions')).toBeInTheDocument();
    expect(screen.getByText('merge.editPause.step1')).toBeInTheDocument();
    expect(screen.getByText('merge.editPause.step2')).toBeInTheDocument();
    expect(screen.getByText('merge.editPause.step3')).toBeInTheDocument();
  });

  it('should have continue button', () => {
    render(<EditPauseDialog />);

    expect(screen.getByText('merge.editPause.continue')).toBeInTheDocument();
  });

  it('should have abort button', () => {
    render(<EditPauseDialog />);

    expect(screen.getByText('merge.editPause.abortRebase')).toBeInTheDocument();
  });

  it('should call rebase continue on continue click', async () => {
    mockRebaseContinue.mockResolvedValue({ success: true, conflicts: [], message: 'ok' });

    render(<EditPauseDialog />);

    const continueButton = screen.getByText('merge.editPause.continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockRebaseContinue).toHaveBeenCalled();
    });
  });

  it('should close dialog after successful continue', async () => {
    mockRebaseContinue.mockResolvedValue({ success: true, conflicts: [], message: 'ok' });

    render(<EditPauseDialog />);

    const continueButton = screen.getByText('merge.editPause.continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockCloseEditPauseDialog).toHaveBeenCalled();
    });
  });

  it('should call rebase abort on abort click', async () => {
    mockRebaseAbort.mockResolvedValue(undefined);

    render(<EditPauseDialog />);

    const abortButton = screen.getByText('merge.editPause.abortRebase');
    fireEvent.click(abortButton);

    await waitFor(() => {
      expect(mockRebaseAbort).toHaveBeenCalled();
    });
  });

  it('should close dialog after successful abort', async () => {
    mockRebaseAbort.mockResolvedValue(undefined);

    render(<EditPauseDialog />);

    const abortButton = screen.getByText('merge.editPause.abortRebase');
    fireEvent.click(abortButton);

    await waitFor(() => {
      expect(mockCloseEditPauseDialog).toHaveBeenCalled();
    });
  });

  it('should handle continue with conflicts', async () => {
    mockRebaseContinue.mockResolvedValue({
      success: false,
      conflicts: [{ path: 'file.rs', conflictType: 'Content', isResolved: false }],
      message: 'conflicts',
    });

    render(<EditPauseDialog />);

    const continueButton = screen.getByText('merge.editPause.continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockCloseEditPauseDialog).toHaveBeenCalled();
    });
  });

  it('should handle abort error', async () => {
    mockRebaseAbort.mockRejectedValue(new Error('Abort failed'));

    render(<EditPauseDialog />);

    const abortButton = screen.getByText('merge.editPause.abortRebase');
    fireEvent.click(abortButton);

    await waitFor(() => {
      expect(mockRebaseAbort).toHaveBeenCalled();
    });

    // Dialog should remain open on error
    expect(screen.getByText('merge.editPause.title')).toBeInTheDocument();
  });

  it('should load progress after successful continue', async () => {
    mockRebaseContinue.mockResolvedValue({ success: true, conflicts: [], message: 'ok' });

    render(<EditPauseDialog />);

    const continueButton = screen.getByText('merge.editPause.continue');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockLoadProgress).toHaveBeenCalled();
    });
  });
});
