import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BisectBanner } from './BisectBanner';
import { BisectMarkType } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) return `${key}: ${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

const mockGetState = vi.fn();
const mockMark = vi.fn();
const mockReset = vi.fn();

vi.mock('@/services/api', () => ({
  bisectApi: {
    getState: () => mockGetState(),
    mark: (mark: BisectMarkType) => mockMark(mark),
    reset: () => mockReset(),
  },
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

describe('BisectBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when bisect is not active', async () => {
    mockGetState.mockResolvedValue({ isActive: false });

    const { container } = render(<BisectBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should not render when state is null', async () => {
    mockGetState.mockResolvedValue(null);

    const { container } = render(<BisectBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should render when bisect is active', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'abc1234567890',
      stepsRemaining: 5,
    });

    render(<BisectBanner />);

    await waitFor(() => {
      expect(screen.getByText('merge.bisect.banner.testing')).toBeInTheDocument();
    });
  });

  it('should display shortened commit hash', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'abc1234567890',
      stepsRemaining: 3,
    });

    render(<BisectBanner />);

    await waitFor(() => {
      expect(screen.getByText('abc1234')).toBeInTheDocument();
    });
  });

  it('should display steps remaining', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'abc1234',
      stepsRemaining: 5,
    });

    render(<BisectBanner />);

    await waitFor(() => {
      expect(screen.getByText(/merge\.bisect\.banner\.stepsLeft/)).toBeInTheDocument();
    });
  });

  it('should have mark good button', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'abc1234',
    });

    render(<BisectBanner />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.bisect.markGood')).toBeInTheDocument();
    });
  });

  it('should have mark bad button', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'abc1234',
    });

    render(<BisectBanner />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.bisect.markBad')).toBeInTheDocument();
    });
  });

  it('should have skip button', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'abc1234',
    });

    render(<BisectBanner />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.bisect.skipCommit')).toBeInTheDocument();
    });
  });

  it('should have end bisect button', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'abc1234',
    });

    render(<BisectBanner />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.bisect.endBisect')).toBeInTheDocument();
    });
  });

  it('should call mark API with Good when good button clicked', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'abc1234',
    });
    mockMark.mockResolvedValue({ state: { isActive: true, currentCommit: 'def5678' } });

    render(<BisectBanner />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.bisect.markGood')).toBeInTheDocument();
    });

    const goodButton = screen.getByTitle('merge.bisect.markGood');
    fireEvent.click(goodButton);

    await waitFor(() => {
      expect(mockMark).toHaveBeenCalledWith(BisectMarkType.Good);
    });
  });

  it('should call mark API with Bad when bad button clicked', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'abc1234',
    });
    mockMark.mockResolvedValue({ state: { isActive: true, currentCommit: 'def5678' } });

    render(<BisectBanner />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.bisect.markBad')).toBeInTheDocument();
    });

    const badButton = screen.getByTitle('merge.bisect.markBad');
    fireEvent.click(badButton);

    await waitFor(() => {
      expect(mockMark).toHaveBeenCalledWith(BisectMarkType.Bad);
    });
  });

  it('should call reset API when end button clicked', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'abc1234',
    });
    mockReset.mockResolvedValue(undefined);

    render(<BisectBanner />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.bisect.endBisect')).toBeInTheDocument();
    });

    const endButton = screen.getByTitle('merge.bisect.endBisect');
    fireEvent.click(endButton);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
    });
  });

  it('should call onComplete when bisect finds first bad commit', async () => {
    mockGetState.mockResolvedValue({
      isActive: true,
      currentCommit: 'abc1234',
    });
    mockMark.mockResolvedValue({
      state: {
        isActive: false,
        firstBadCommit: 'bad1234567890',
      },
    });
    const onComplete = vi.fn();

    render(<BisectBanner onComplete={onComplete} />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.bisect.markBad')).toBeInTheDocument();
    });

    const badButton = screen.getByTitle('merge.bisect.markBad');
    fireEvent.click(badButton);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
