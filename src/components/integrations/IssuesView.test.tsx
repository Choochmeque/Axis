import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssuesView } from './IssuesView';
import { IssueState } from '@/types';

// Mock stores
const mockLoadIssues = vi.fn();
const mockReloadIssues = vi.fn();
const mockLoadMoreIssues = vi.fn();
const mockGetIssue = vi.fn();
const mockSetIssueFilter = vi.fn();
const mockClearSelectedIssue = vi.fn();

let mockStoreState = {
  issues: [],
  selectedIssue: null,
  issueFilter: IssueState.Open,
  issuesHasMore: false,
  isLoadingIssues: false,
  isLoadingMoreIssues: false,
  connectionStatus: { connected: true },
  detectedProvider: 'GitHub',
  loadIssues: mockLoadIssues,
  reloadIssues: mockReloadIssues,
  loadMoreIssues: mockLoadMoreIssues,
  getIssue: mockGetIssue,
  setIssueFilter: mockSetIssueFilter,
  clearSelectedIssue: mockClearSelectedIssue,
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
vi.mock('./IssueList', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  IssueList: ({ issues, isLoading, onSelect }: any) => (
    <div data-testid="issue-list">
      {isLoading ? 'Loading...' : `${issues.length} issues`}
      {issues.map((issue: { number: number; title: string }) => (
        <button
          key={issue.number}
          onClick={() => onSelect(issue)}
          data-testid={`issue-${issue.number}`}
        >
          {issue.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./IssueDetail', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  IssueDetail: ({ issueDetail, onClose }: any) => (
    <div data-testid="issue-detail">
      Issue #{issueDetail?.number}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('./CreateIssueDialog', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CreateIssueDialog: ({ isOpen, onClose, onCreated }: any) =>
    isOpen ? (
      <div data-testid="create-issue-dialog">
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

describe('IssuesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      issues: [],
      selectedIssue: null,
      issueFilter: IssueState.Open,
      issuesHasMore: false,
      isLoadingIssues: false,
      isLoadingMoreIssues: false,
      connectionStatus: { connected: true },
      detectedProvider: 'GitHub',
      loadIssues: mockLoadIssues,
      reloadIssues: mockReloadIssues,
      loadMoreIssues: mockLoadMoreIssues,
      getIssue: mockGetIssue,
      setIssueFilter: mockSetIssueFilter,
      clearSelectedIssue: mockClearSelectedIssue,
    };
  });

  it('should show not connected message when not connected', () => {
    mockStoreState.connectionStatus = { connected: false };

    render(<IssuesView />);

    expect(screen.getByText('integrations.notConnected.message')).toBeInTheDocument();
    expect(screen.getByText('integrations.notConnected.issuesHint')).toBeInTheDocument();
  });

  it('should render issues view when connected', () => {
    render(<IssuesView />);

    expect(screen.getByText('integrations.issues.title')).toBeInTheDocument();
    expect(screen.getByTestId('issue-list')).toBeInTheDocument();
  });

  it('should show filter buttons', () => {
    render(<IssuesView />);

    expect(screen.getByText('integrations.issues.filterOpen')).toBeInTheDocument();
    expect(screen.getByText('integrations.issues.filterClosed')).toBeInTheDocument();
    expect(screen.getByText('integrations.issues.filterAll')).toBeInTheDocument();
  });

  it('should change filter when filter button is clicked', () => {
    render(<IssuesView />);

    fireEvent.click(screen.getByText('integrations.issues.filterClosed'));

    expect(mockSetIssueFilter).toHaveBeenCalledWith(IssueState.Closed);
  });

  it('should call reloadIssues when refresh is clicked', () => {
    render(<IssuesView />);

    fireEvent.click(screen.getByTitle('integrations.common.refresh'));

    expect(mockReloadIssues).toHaveBeenCalled();
  });

  it('should open create dialog when new issue button is clicked', () => {
    render(<IssuesView />);

    fireEvent.click(screen.getByTitle('integrations.common.newIssue'));

    expect(screen.getByTestId('create-issue-dialog')).toBeInTheDocument();
  });

  it('should close create dialog and reload when issue is created', () => {
    render(<IssuesView />);

    // Open dialog
    fireEvent.click(screen.getByTitle('integrations.common.newIssue'));
    expect(screen.getByTestId('create-issue-dialog')).toBeInTheDocument();

    // Create issue
    fireEvent.click(screen.getByText('Create'));

    expect(mockReloadIssues).toHaveBeenCalled();
    expect(screen.queryByTestId('create-issue-dialog')).not.toBeInTheDocument();
  });

  it('should show issue detail panel when issue is selected', () => {
    mockStoreState.selectedIssue = { number: 1, title: 'Test Issue' };

    render(<IssuesView />);

    expect(screen.getByTestId('panel-group')).toBeInTheDocument();
    expect(screen.getByTestId('issue-detail')).toBeInTheDocument();
  });

  it('should call getIssue when issue is selected from list', () => {
    mockStoreState.issues = [{ number: 1, title: 'Test Issue' }];

    render(<IssuesView />);

    fireEvent.click(screen.getByTestId('issue-1'));

    expect(mockGetIssue).toHaveBeenCalledWith(1);
  });

  it('should show loading state', () => {
    mockStoreState.isLoadingIssues = true;

    render(<IssuesView />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should disable refresh button when loading', () => {
    mockStoreState.isLoadingIssues = true;

    render(<IssuesView />);

    expect(screen.getByTitle('integrations.common.refresh')).toBeDisabled();
  });
});
