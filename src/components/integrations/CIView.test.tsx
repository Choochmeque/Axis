import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CIRun, DetectedProvider, IntegrationStatus } from '@/types';
import { CIView } from './CIView';

// Mock stores
const mockLoadCiRuns = vi.fn();
const mockReloadCiRuns = vi.fn();
const mockLoadMoreCiRuns = vi.fn();

type MockIntegrationState = {
  ciRuns: CIRun[];
  ciRunsHasMore: boolean;
  isLoadingCiRuns: boolean;
  isLoadingMoreCiRuns: boolean;
  connectionStatus: IntegrationStatus | null;
  detectedProvider: DetectedProvider | null;
  loadCiRuns: typeof mockLoadCiRuns;
  reloadCiRuns: typeof mockReloadCiRuns;
  loadMoreCiRuns: typeof mockLoadMoreCiRuns;
};

let mockStoreState: MockIntegrationState = {
  ciRuns: [],
  ciRunsHasMore: false,
  isLoadingCiRuns: false,
  isLoadingMoreCiRuns: false,
  connectionStatus: {
    provider: 'GitHub',
    connected: true,
    username: null,
    avatarUrl: null,
  },
  detectedProvider: { provider: 'GitHub', owner: 'acme', repo: 'repo' },
  loadCiRuns: mockLoadCiRuns,
  reloadCiRuns: mockReloadCiRuns,
  loadMoreCiRuns: mockLoadMoreCiRuns,
};

vi.mock('@/store/integrationStore', () => ({
  useIntegrationStore: Object.assign(() => mockStoreState, {
    getState: () => mockStoreState,
  }),
}));

// Mock child components
vi.mock('./CIRunList', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CIRunList: ({ ciRuns, isLoading }: any) => (
    <div data-testid="ci-run-list">{isLoading ? 'Loading...' : `${ciRuns.length} CI runs`}</div>
  ),
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
  Button: ({ children, onClick, disabled, title }: any) => (
    <button onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  ),
}));

describe('CIView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      ciRuns: [],
      ciRunsHasMore: false,
      isLoadingCiRuns: false,
      isLoadingMoreCiRuns: false,
      connectionStatus: {
        provider: 'GitHub',
        connected: true,
        username: null,
        avatarUrl: null,
      },
      detectedProvider: { provider: 'GitHub', owner: 'acme', repo: 'repo' },
      loadCiRuns: mockLoadCiRuns,
      reloadCiRuns: mockReloadCiRuns,
      loadMoreCiRuns: mockLoadMoreCiRuns,
    };
  });

  it('should show not connected message when not connected', () => {
    mockStoreState.connectionStatus = {
      provider: 'GitHub',
      connected: false,
      username: null,
      avatarUrl: null,
    };

    render(<CIView />);

    expect(screen.getByText('integrations.notConnected.message')).toBeInTheDocument();
    expect(screen.getByText('integrations.notConnected.ciHint')).toBeInTheDocument();
  });

  it('should render CI view when connected', () => {
    render(<CIView />);

    expect(screen.getByText('integrations.ci.title')).toBeInTheDocument();
    expect(screen.getByTestId('ci-run-list')).toBeInTheDocument();
  });

  it('should call reloadCiRuns when refresh is clicked', () => {
    render(<CIView />);

    fireEvent.click(screen.getByTitle('integrations.common.refresh'));

    expect(mockReloadCiRuns).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    mockStoreState.isLoadingCiRuns = true;

    render(<CIView />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should disable refresh button when loading', () => {
    mockStoreState.isLoadingCiRuns = true;

    render(<CIView />);

    expect(screen.getByTitle('integrations.common.refresh')).toBeDisabled();
  });

  it('should display CI runs count', () => {
    mockStoreState.ciRuns = [
      {
        provider: 'GitHub',
        id: '1',
        name: 'CI',
        status: 'Queued',
        conclusion: null,
        commitSha: 'abc123',
        branch: 'main',
        event: 'push',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        url: 'https://example.com/1',
      },
      {
        provider: 'GitHub',
        id: '2',
        name: 'CI',
        status: 'Queued',
        conclusion: null,
        commitSha: 'def456',
        branch: 'main',
        event: 'push',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        url: 'https://example.com/2',
      },
      {
        provider: 'GitHub',
        id: '3',
        name: 'CI',
        status: 'Queued',
        conclusion: null,
        commitSha: 'ghi789',
        branch: 'main',
        event: 'push',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        url: 'https://example.com/3',
      },
    ];

    render(<CIView />);

    expect(screen.getByText('3 CI runs')).toBeInTheDocument();
  });
});
