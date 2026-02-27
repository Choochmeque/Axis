import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RebaseBanner } from './RebaseBanner';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockGetState = vi.fn();
const mockAbort = vi.fn();
const mockSkip = vi.fn();

vi.mock('@/services/api', () => ({
  operationApi: {
    getState: () => mockGetState(),
  },
  rebaseApi: {
    abort: () => mockAbort(),
    skip: () => mockSkip(),
  },
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

const mockLoadProgress = vi.fn();
const mockOpenRewordDialog = vi.fn();
const mockOpenEditPauseDialog = vi.fn();

vi.mock('@/store/rebaseProgressStore', () => ({
  useRebaseProgressStore: () => ({
    loadProgress: mockLoadProgress,
    openRewordDialog: mockOpenRewordDialog,
    openEditPauseDialog: mockOpenEditPauseDialog,
  }),
}));

/* eslint-disable @typescript-eslint/naming-convention -- Rust enum variants are PascalCase */

function makeRebasingState(
  overrides: {
    onto?: string | null;
    current?: number | null;
    total?: number | null;
    pausedAction?: string | null;
    headName?: string | null;
  } = {}
) {
  return {
    Rebasing: {
      onto: 'onto' in overrides ? overrides.onto : 'abc1234',
      current: 'current' in overrides ? overrides.current : 1,
      total: 'total' in overrides ? overrides.total : 3,
      pausedAction: 'pausedAction' in overrides ? overrides.pausedAction : null,
      headName: 'headName' in overrides ? overrides.headName : null,
    },
  };
}

describe('RebaseBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadProgress.mockResolvedValue(undefined);
  });

  it('should not render when no rebase in progress', async () => {
    mockGetState.mockResolvedValue(null);

    const { container } = render(<RebaseBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should not render when state is Merging', async () => {
    mockGetState.mockResolvedValue({ Merging: { branch: 'feature' } });

    const { container } = render(<RebaseBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should render when rebase is in progress', async () => {
    mockGetState.mockResolvedValue(
      makeRebasingState({ current: 3, total: 5, headName: 'feature' })
    );

    render(<RebaseBanner />);

    await waitFor(() => {
      expect(screen.getByText(/merge\.rebaseBanner\.inProgress/)).toBeInTheDocument();
    });
  });

  it('should display head name when available', async () => {
    mockGetState.mockResolvedValue(makeRebasingState({ headName: 'my-feature' }));

    render(<RebaseBanner />);

    await waitFor(() => {
      expect(screen.getByText('my-feature')).toBeInTheDocument();
    });
  });

  it('should display step progress', async () => {
    mockGetState.mockResolvedValue(makeRebasingState({ current: 2, total: 5 }));

    render(<RebaseBanner />);

    await waitFor(() => {
      expect(screen.getByText('merge.rebaseBanner.step')).toBeInTheDocument();
    });
  });

  it('should show paused for edit indicator', async () => {
    mockGetState.mockResolvedValue(
      makeRebasingState({ current: 2, total: 5, pausedAction: 'Edit' })
    );

    render(<RebaseBanner />);

    await waitFor(() => {
      expect(screen.getByText('merge.rebaseBanner.pausedForEdit')).toBeInTheDocument();
    });
  });

  it('should show paused for reword indicator', async () => {
    mockGetState.mockResolvedValue(
      makeRebasingState({ current: 2, total: 5, pausedAction: 'Reword' })
    );

    render(<RebaseBanner />);

    await waitFor(() => {
      expect(screen.getByText('merge.rebaseBanner.pausedForReword')).toBeInTheDocument();
    });
  });

  it('should call abort API when abort button clicked', async () => {
    mockGetState.mockResolvedValue(makeRebasingState());
    mockAbort.mockResolvedValue(undefined);

    render(<RebaseBanner />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.rebaseBanner.abort')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('merge.rebaseBanner.abort'));

    await waitFor(() => {
      expect(mockAbort).toHaveBeenCalled();
    });
  });

  it('should call onComplete when abort succeeds', async () => {
    mockGetState.mockResolvedValue(makeRebasingState());
    mockAbort.mockResolvedValue(undefined);
    const onComplete = vi.fn();

    render(<RebaseBanner onComplete={onComplete} />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.rebaseBanner.abort')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('merge.rebaseBanner.abort'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('should call skip API when skip button clicked', async () => {
    mockGetState.mockResolvedValue(makeRebasingState());
    mockSkip.mockResolvedValue({ success: true, message: 'skipped' });

    render(<RebaseBanner />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.rebaseBanner.skip')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('merge.rebaseBanner.skip'));

    await waitFor(() => {
      expect(mockSkip).toHaveBeenCalled();
    });
  });

  it('should load progress when rebase detected', async () => {
    mockGetState.mockResolvedValue(makeRebasingState());

    render(<RebaseBanner />);

    await waitFor(() => {
      expect(mockLoadProgress).toHaveBeenCalled();
    });
  });

  it('should open edit pause dialog when edit button clicked', async () => {
    mockGetState.mockResolvedValue(
      makeRebasingState({ current: 2, total: 5, pausedAction: 'Edit' })
    );

    render(<RebaseBanner />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.rebaseBanner.pausedForEdit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('merge.rebaseBanner.pausedForEdit'));

    expect(mockOpenEditPauseDialog).toHaveBeenCalled();
  });

  it('should open reword dialog when reword button clicked', async () => {
    mockGetState.mockResolvedValue(
      makeRebasingState({ current: 2, total: 5, pausedAction: 'Reword' })
    );

    render(<RebaseBanner />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.rebaseBanner.pausedForReword')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('merge.rebaseBanner.pausedForReword'));

    expect(mockOpenRewordDialog).toHaveBeenCalled();
  });

  it('should handle rebase with null fields gracefully', async () => {
    mockGetState.mockResolvedValue(makeRebasingState({ onto: null, current: null, total: null }));

    render(<RebaseBanner />);

    await waitFor(() => {
      expect(screen.getByText('merge.rebaseBanner.inProgress')).toBeInTheDocument();
    });
  });
});

/* eslint-enable @typescript-eslint/naming-convention */
