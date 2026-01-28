import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PullRequestDetail } from './PullRequestDetail';
import type { PullRequestDetail as PullRequestDetailType } from '@/types';

// Mock shellApi
const mockOpenUrl = vi.fn();
vi.mock('@/services/api', () => ({
  shellApi: {
    openUrl: (url: string) => mockOpenUrl(url),
  },
}));

// Mock dateUtils
vi.mock('@/lib/dateUtils', () => ({
  formatDateTime: (_date: string) => 'Jan 15, 2024',
}));

// Mock toast
vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock errorUtils
vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (error: Error) => error.message,
}));

// Mock react-markdown and related
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

vi.mock('rehype-raw', () => ({
  default: () => {},
}));

vi.mock('remark-gfm', () => ({
  default: () => {},
}));

vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => <pre data-testid="code-block">{children}</pre>,
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
}));

// Mock store
const mockMergePullRequest = vi.fn();
vi.mock('@/store/integrationStore', () => ({
  useIntegrationStore: () => ({
    mergePullRequest: mockMergePullRequest,
  }),
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return `${key}: ${Object.values(params).join(', ')}`;
      }
      return key;
    },
  }),
}));

// Mock UI components
vi.mock('@/components/ui', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, title, disabled, className }: any) => (
    <button onClick={onClick} title={title} disabled={disabled} className={className}>
      {children}
    </button>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DropdownMenuRadioGroup: ({ children }: any) => <div data-testid="radio-group">{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DropdownMenuRadioItem: ({ children, value }: any) => (
    <div data-testid={`radio-item-${value}`}>{children}</div>
  ),
}));

describe('PullRequestDetail', () => {
  const mockOnClose = vi.fn();

  const mockPrDetail: PullRequestDetailType = {
    number: 1,
    title: 'Test PR',
    state: 'Open',
    provider: 'GitHub',
    draft: false,
    author: {
      login: 'testuser',
      avatarUrl: 'https://example.com/avatar.png',
      url: 'https://github.com/testuser',
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-16T11:00:00Z',
    url: 'https://github.com/test/repo/pull/1',
    sourceBranch: 'feature-branch',
    targetBranch: 'main',
    labels: [{ name: 'enhancement', color: '0000FF', description: 'Enhancement' }],
    body: 'This is the PR description',
    commentsCount: 3,
    changedFiles: 5,
    additions: 100,
    deletions: 50,
    commitsCount: 2,
    mergeable: true,
    assignees: [],
    reviewers: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show select PR message when no PR is provided', () => {
    render(<PullRequestDetail prDetail={null} onClose={mockOnClose} />);

    expect(screen.getByText('integrations.pullRequests.selectPr')).toBeInTheDocument();
  });

  it('should render PR details', () => {
    render(<PullRequestDetail prDetail={mockPrDetail} onClose={mockOnClose} />);

    expect(screen.getByText('Test PR')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('should show open state badge for open PRs', () => {
    render(<PullRequestDetail prDetail={mockPrDetail} onClose={mockOnClose} />);

    expect(screen.getByText('integrations.pullRequests.state.open')).toBeInTheDocument();
  });

  it('should show merged state badge for merged PRs', () => {
    const mergedPr = { ...mockPrDetail, state: 'Merged' as const };

    render(<PullRequestDetail prDetail={mergedPr} onClose={mockOnClose} />);

    expect(screen.getByText('integrations.pullRequests.state.merged')).toBeInTheDocument();
  });

  it('should show closed state badge for closed PRs', () => {
    const closedPr = { ...mockPrDetail, state: 'Closed' as const };

    render(<PullRequestDetail prDetail={closedPr} onClose={mockOnClose} />);

    expect(screen.getByText('integrations.pullRequests.state.closed')).toBeInTheDocument();
  });

  it('should show draft badge when PR is a draft', () => {
    const draftPr = { ...mockPrDetail, draft: true };

    render(<PullRequestDetail prDetail={draftPr} onClose={mockOnClose} />);

    expect(screen.getByText('integrations.pullRequests.draft')).toBeInTheDocument();
  });

  it('should render branch info', () => {
    render(<PullRequestDetail prDetail={mockPrDetail} onClose={mockOnClose} />);

    expect(screen.getByText('feature-branch')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('should render labels', () => {
    render(<PullRequestDetail prDetail={mockPrDetail} onClose={mockOnClose} />);

    expect(screen.getByText('enhancement')).toBeInTheDocument();
  });

  it('should render PR body', () => {
    render(<PullRequestDetail prDetail={mockPrDetail} onClose={mockOnClose} />);

    expect(screen.getByTestId('markdown')).toHaveTextContent('This is the PR description');
  });

  it('should show additions and deletions', () => {
    render(<PullRequestDetail prDetail={mockPrDetail} onClose={mockOnClose} />);

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should open URL in browser when external link is clicked', () => {
    render(<PullRequestDetail prDetail={mockPrDetail} onClose={mockOnClose} />);

    fireEvent.click(screen.getByTitle('common.openInBrowser'));

    expect(mockOpenUrl).toHaveBeenCalledWith('https://github.com/test/repo/pull/1');
  });

  it('should call onClose when close button is clicked', () => {
    render(<PullRequestDetail prDetail={mockPrDetail} onClose={mockOnClose} />);

    fireEvent.click(screen.getByTitle('common.close'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show merge button for mergeable PRs', () => {
    render(<PullRequestDetail prDetail={mockPrDetail} onClose={mockOnClose} />);

    expect(screen.getByText('Merge')).toBeInTheDocument();
  });

  it('should show conflicts message when PR has conflicts', () => {
    const conflictPr = { ...mockPrDetail, mergeable: false };

    render(<PullRequestDetail prDetail={conflictPr} onClose={mockOnClose} />);

    expect(screen.getByText('integrations.pullRequests.merge.hasConflicts')).toBeInTheDocument();
  });

  it('should not show merge button for draft PRs', () => {
    const draftPr = { ...mockPrDetail, draft: true };

    render(<PullRequestDetail prDetail={draftPr} onClose={mockOnClose} />);

    // Should show no conflicts message but no merge button
    expect(screen.getByText('integrations.pullRequests.merge.noConflicts')).toBeInTheDocument();
    expect(screen.queryByText('Merge')).not.toBeInTheDocument();
  });

  it('should call mergePullRequest when merge button is clicked', async () => {
    mockMergePullRequest.mockResolvedValue({});

    render(<PullRequestDetail prDetail={mockPrDetail} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Merge'));

    await waitFor(() => {
      expect(mockMergePullRequest).toHaveBeenCalledWith(1, {
        mergeMethod: 'Merge',
        commitTitle: null,
        commitMessage: null,
      });
    });
  });

  it('should not show merge section for merged PRs', () => {
    const mergedPr = { ...mockPrDetail, state: 'Merged' as const };

    render(<PullRequestDetail prDetail={mergedPr} onClose={mockOnClose} />);

    expect(
      screen.queryByText('integrations.pullRequests.merge.noConflicts')
    ).not.toBeInTheDocument();
  });

  it('should not render labels when no labels', () => {
    const prWithoutLabels = { ...mockPrDetail, labels: [] };

    render(<PullRequestDetail prDetail={prWithoutLabels} onClose={mockOnClose} />);

    expect(screen.queryByText('enhancement')).not.toBeInTheDocument();
  });

  it('should not render body when not set', () => {
    const prWithoutBody = { ...mockPrDetail, body: null };

    render(<PullRequestDetail prDetail={prWithoutBody} onClose={mockOnClose} />);

    expect(screen.queryByTestId('markdown')).not.toBeInTheDocument();
  });
});
