import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithQuery as render } from '@/test/renderWithQuery';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MergeBanner } from './MergeBanner';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockGetState = vi.fn();
const mockAbort = vi.fn();
const mockContinue = vi.fn();

vi.mock('@/services/api', () => ({
  operationApi: {
    getState: () => mockGetState(),
  },
  mergeApi: {
    abort: () => mockAbort(),
    continue: () => mockContinue(),
  },
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

interface MockFileStatus {
  path: string;
  status: string;
}

const mockStatus: {
  staged: MockFileStatus[];
  unstaged: MockFileStatus[];
  untracked: MockFileStatus[];
  conflicted: MockFileStatus[];
} = { staged: [], unstaged: [], untracked: [], conflicted: [] };

vi.mock('@/store/stagingStore', () => ({
  useStagingStore: (selector?: (state: unknown) => unknown) => {
    const state = { status: mockStatus };
    return selector ? selector(state) : state;
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

  it('should have continue button', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
    mockGetState.mockResolvedValue({ Merging: { branch: 'main' } });

    render(<MergeBanner />);

    await waitFor(() => {
      const continueButton = screen.getByTitle('merge.banner.continue');
      expect(continueButton).toBeInTheDocument();
    });
  });

  it('should call continue API when continue button clicked and no conflicts', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
    mockGetState.mockResolvedValue({ Merging: { branch: 'main' } });
    mockContinue.mockResolvedValue({ success: true, message: '', conflicts: [] });
    mockStatus.conflicted = [];

    render(<MergeBanner />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.banner.continue')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('merge.banner.continue'));

    await waitFor(() => {
      expect(mockContinue).toHaveBeenCalled();
    });
  });

  it('should show conflict hint when conflicts exist', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
    mockGetState.mockResolvedValue({ Merging: { branch: 'main' } });
    mockStatus.conflicted = [{ path: 'file1.ts', status: 'Conflicted' }];

    render(<MergeBanner />);

    await waitFor(() => {
      expect(screen.getByText('merge.banner.resolveHint')).toBeInTheDocument();
    });
  });

  it('should call onComplete when continue succeeds', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches Rust enum variant
    mockGetState.mockResolvedValue({ Merging: { branch: 'main' } });
    mockContinue.mockResolvedValue({ success: true, message: '', conflicts: [] });
    mockStatus.conflicted = [];
    const onComplete = vi.fn();

    render(<MergeBanner onComplete={onComplete} />);

    await waitFor(() => {
      expect(screen.getByTitle('merge.banner.continue')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('merge.banner.continue'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
