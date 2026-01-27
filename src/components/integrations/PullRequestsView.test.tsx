import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PullRequestsView } from './PullRequestsView';
import { PrState } from '@/types';

// Mock stores
const mockLoadPullRequests = vi.fn();
const mockReloadPullRequests = vi.fn();
const mockLoadMorePullRequests = vi.fn();
const mockGetPullRequest = vi.fn();
const mockSetPrFilter = vi.fn();
const mockClearSelectedPr = vi.fn();

let mockStoreState = {
  pullRequests: [],
  selectedPr: null,
  prFilter: PrState.Open,
  prsHasMore: false,
  isLoadingPrs: false,
  isLoadingMorePrs: false,
  connectionStatus: { connected: true },
  detectedProvider: 'GitHub',
  loadPullRequests: mockLoadPullRequests,
  reloadPullRequests: mockReloadPullRequests,
  loadMorePullRequests: mockLoadMorePullRequests,
  getPullRequest: mockGetPullRequest,
  setPrFilter: mockSetPrFilter,
  clearSelectedPr: mockClearSelectedPr,
};

vi.mock('@/store/integrationStore', () => ({
  useIntegrationStore: Object.assign(() => mockStoreState, {
    getState: () => mockStoreState,
  }),
}));

// Mock react-resizable-panels
vi.mock('react-resizable-panels', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Panel: ({ children }: any) => <div data-testid="panel">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PanelGroup: ({ children }: any) => <div data-testid="panel-group">{children}</div>,
  PanelResizeHandle: () => <div data-testid="resize-handle" />,
}));

// Mock child components
vi.mock('./PullRequestList', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PullRequestList: ({ pullRequests, isLoading, onSelect }: any) => (
    <div data-testid="pr-list">
      {isLoading ? 'Loading...' : `${pullRequests.length} PRs`}
      {pullRequests.map((pr: { number: number; title: string }) => (
        <button key={pr.number} onClick={() => onSelect(pr)} data-testid={`pr-${pr.number}`}>
          {pr.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./PullRequestDetail', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PullRequestDetail: ({ prDetail, onClose }: any) => (
    <div data-testid="pr-detail">
      PR #{prDetail?.number}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('./CreatePullRequestDialog', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CreatePullRequestDialog: ({ isOpen, onClose, onCreated }: any) =>
    isOpen ? (
      <div data-testid="create-pr-dialog">
        <button onClick={onClose}>Cancel</button>
        <button onClick={onCreated}>Create</button>
      </div>
    ) : null,
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

describe('PullRequestsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      pullRequests: [],
      selectedPr: null,
      prFilter: PrState.Open,
      prsHasMore: false,
      isLoadingPrs: false,
      isLoadingMorePrs: false,
      connectionStatus: { connected: true },
      detectedProvider: 'GitHub',
      loadPullRequests: mockLoadPullRequests,
      reloadPullRequests: mockReloadPullRequests,
      loadMorePullRequests: mockLoadMorePullRequests,
      getPullRequest: mockGetPullRequest,
      setPrFilter: mockSetPrFilter,
      clearSelectedPr: mockClearSelectedPr,
    };
  });

  it('should show not connected message when not connected', () => {
    mockStoreState.connectionStatus = { connected: false };

    render(<PullRequestsView />);

    expect(screen.getByText('integrations.notConnected.message')).toBeInTheDocument();
    expect(screen.getByText('integrations.notConnected.pullRequestsHint')).toBeInTheDocument();
  });

  it('should render PR view when connected', () => {
    render(<PullRequestsView />);

    expect(screen.getByText('integrations.pullRequests.title')).toBeInTheDocument();
    expect(screen.getByTestId('pr-list')).toBeInTheDocument();
  });

  it('should show filter buttons', () => {
    render(<PullRequestsView />);

    expect(screen.getByText('integrations.pullRequests.filterOpen')).toBeInTheDocument();
    expect(screen.getByText('integrations.pullRequests.filterClosed')).toBeInTheDocument();
    expect(screen.getByText('integrations.pullRequests.filterAll')).toBeInTheDocument();
  });

  it('should change filter when filter button is clicked', () => {
    render(<PullRequestsView />);

    fireEvent.click(screen.getByText('integrations.pullRequests.filterClosed'));

    expect(mockSetPrFilter).toHaveBeenCalledWith(PrState.Closed);
  });

  it('should call reloadPullRequests when refresh is clicked', () => {
    render(<PullRequestsView />);

    fireEvent.click(screen.getByTitle('integrations.common.refresh'));

    expect(mockReloadPullRequests).toHaveBeenCalled();
  });

  it('should open create dialog when new PR button is clicked', () => {
    render(<PullRequestsView />);

    fireEvent.click(screen.getByTitle('integrations.common.newPr'));

    expect(screen.getByTestId('create-pr-dialog')).toBeInTheDocument();
  });

  it('should close create dialog and reload when PR is created', () => {
    render(<PullRequestsView />);

    // Open dialog
    fireEvent.click(screen.getByTitle('integrations.common.newPr'));
    expect(screen.getByTestId('create-pr-dialog')).toBeInTheDocument();

    // Create PR
    fireEvent.click(screen.getByText('Create'));

    expect(mockReloadPullRequests).toHaveBeenCalled();
    expect(screen.queryByTestId('create-pr-dialog')).not.toBeInTheDocument();
  });

  it('should show PR detail panel when PR is selected', () => {
    mockStoreState.selectedPr = { number: 1, title: 'Test PR' };

    render(<PullRequestsView />);

    expect(screen.getByTestId('panel-group')).toBeInTheDocument();
    expect(screen.getByTestId('pr-detail')).toBeInTheDocument();
  });

  it('should call getPullRequest when PR is selected from list', () => {
    mockStoreState.pullRequests = [{ number: 1, title: 'Test PR' }];

    render(<PullRequestsView />);

    fireEvent.click(screen.getByTestId('pr-1'));

    expect(mockGetPullRequest).toHaveBeenCalledWith(1);
  });

  it('should show loading state', () => {
    mockStoreState.isLoadingPrs = true;

    render(<PullRequestsView />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should disable refresh button when loading', () => {
    mockStoreState.isLoadingPrs = true;

    render(<PullRequestsView />);

    expect(screen.getByTitle('integrations.common.refresh')).toBeDisabled();
  });
});
