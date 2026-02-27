import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MergeBanner } from './MergeBanner';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockGetState = vi.fn();
const mockAbort = vi.fn();

vi.mock('@/services/api', () => ({
  operationApi: {
    getState: () => mockGetState(),
  },
  mergeApi: {
    abort: () => mockAbort(),
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

describe('MergeBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when no merge in progress', async () => {
    mockGetState.mockResolvedValue(null);

    const { container } = render(<MergeBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should not render when state is not Merging', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
    mockGetState.mockResolvedValue({ Rebasing: { onto: 'main' } });

    const { container } = render(<MergeBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should render when merge is in progress', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
    mockGetState.mockResolvedValue({ Merging: { branch: 'feature-branch' } });

    render(<MergeBanner />);

    await waitFor(() => {
      expect(screen.getByText('merge.banner.inProgress')).toBeInTheDocument();
    });
  });

  it('should display branch name when available', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
    mockGetState.mockResolvedValue({ Merging: { branch: 'feature-branch' } });

    render(<MergeBanner />);

    await waitFor(() => {
      expect(screen.getByText('feature-branch')).toBeInTheDocument();
    });
  });

  it('should display hint text', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
    mockGetState.mockResolvedValue({ Merging: { branch: null } });

    render(<MergeBanner />);

    await waitFor(() => {
      expect(screen.getByText('merge.banner.hint')).toBeInTheDocument();
    });
  });

  it('should have abort button', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
    mockGetState.mockResolvedValue({ Merging: { branch: 'main' } });

    render(<MergeBanner />);

    await waitFor(() => {
      const abortButton = screen.getByTitle('merge.banner.abort');
      expect(abortButton).toBeInTheDocument();
    });
  });

  it('should call abort API when abort button clicked', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
    mockGetState.mockResolvedValue({ Merging: { branch: 'main' } });
    mockAbort.mockResolvedValue(undefined);

    render(<MergeBanner />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.banner.abort')).toBeInTheDocument();
    });

    const abortButton = screen.getByTitle('merge.banner.abort');
    fireEvent.click(abortButton);

    await waitFor(() => {
      expect(mockAbort).toHaveBeenCalled();
    });
  });

  it('should call onComplete when abort succeeds', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
    mockGetState.mockResolvedValue({ Merging: { branch: 'main' } });
    mockAbort.mockResolvedValue(undefined);
    const onComplete = vi.fn();

    render(<MergeBanner onComplete={onComplete} />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.banner.abort')).toBeInTheDocument();
    });

    const abortButton = screen.getByTitle('merge.banner.abort');
    fireEvent.click(abortButton);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('should handle merge with null branch', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
    mockGetState.mockResolvedValue({ Merging: { branch: null } });

    render(<MergeBanner />);

    await waitFor(() => {
      expect(screen.getByText('merge.banner.inProgress')).toBeInTheDocument();
    });

    // Should not crash when branch is null
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });
});
