import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PullRequestList } from './PullRequestList';
import type { PullRequest } from '@/bindings/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/dateUtils', () => ({
  formatRelativeTime: (_date: string) => 'recently',
}));

vi.mock('@/components/ui', () => ({
  VirtualList: ({
    items,
    children,
    isLoading,
    loadingMessage,
    emptyMessage,
  }: {
    items: PullRequest[];
    children: (item: PullRequest) => React.ReactNode;
    isLoading: boolean;
    loadingMessage?: string;
    emptyMessage?: string;
  }) => {
    if (isLoading) return <div data-testid="loading">{loadingMessage}</div>;
    if (items.length === 0) return <div data-testid="empty">{emptyMessage}</div>;
    return (
      <div data-testid="virtual-list">
        {items.map((item, idx) => (
          <div key={idx} data-testid={`pr-item-${idx}`}>
            {children(item)}
          </div>
        ))}
      </div>
    );
  },
}));

describe('PullRequestList', () => {
  const mockPullRequests: PullRequest[] = [
    {
      number: 1,
      title: 'Add new feature',
      state: 'open',
      draft: false,
      author: { login: 'developer1', avatarUrl: 'https://example.com/avatar1.png' },
      sourceBranch: 'feature-branch',
      targetBranch: 'main',
      createdAt: '2024-01-15T10:30:00Z',
    },
    {
      number: 2,
      title: 'Fix bug in login',
      state: 'merged',
      draft: false,
      author: { login: 'developer2', avatarUrl: 'https://example.com/avatar2.png' },
      sourceBranch: 'bugfix-login',
      targetBranch: 'main',
      createdAt: '2024-01-10T09:00:00Z',
    },
    {
      number: 3,
      title: 'WIP: Refactor code',
      state: 'open',
      draft: true,
      author: { login: 'developer3', avatarUrl: 'https://example.com/avatar3.png' },
      sourceBranch: 'refactor',
      targetBranch: 'develop',
      createdAt: '2024-01-12T14:00:00Z',
    },
  ];

  const defaultProps = {
    pullRequests: mockPullRequests,
    selectedPr: null,
    isLoading: false,
    onSelect: vi.fn(),
  };

  it('should show loading state', () => {
    render(<PullRequestList {...defaultProps} pullRequests={[]} isLoading={true} />);

    expect(screen.getByTestId('loading')).toHaveTextContent('integrations.pullRequests.loading');
  });

  it('should show empty state', () => {
    render(<PullRequestList {...defaultProps} pullRequests={[]} />);

    expect(screen.getByTestId('empty')).toHaveTextContent(
      'integrations.pullRequests.noPullRequests'
    );
  });

  it('should render pull requests', () => {
    render(<PullRequestList {...defaultProps} />);

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    expect(screen.getByTestId('pr-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('pr-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('pr-item-2')).toBeInTheDocument();
  });

  it('should render PR titles', () => {
    render(<PullRequestList {...defaultProps} />);

    expect(screen.getByText('Add new feature')).toBeInTheDocument();
    expect(screen.getByText('Fix bug in login')).toBeInTheDocument();
    expect(screen.getByText('WIP: Refactor code')).toBeInTheDocument();
  });

  it('should render PR numbers', () => {
    render(<PullRequestList {...defaultProps} />);

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  it('should render author names', () => {
    render(<PullRequestList {...defaultProps} />);

    expect(screen.getByText('developer1')).toBeInTheDocument();
    expect(screen.getByText('developer2')).toBeInTheDocument();
    expect(screen.getByText('developer3')).toBeInTheDocument();
  });

  it('should render branch info', () => {
    render(<PullRequestList {...defaultProps} />);

    expect(screen.getByText('feature-branch → main')).toBeInTheDocument();
    expect(screen.getByText('bugfix-login → main')).toBeInTheDocument();
    expect(screen.getByText('refactor → develop')).toBeInTheDocument();
  });

  it('should show draft badge for draft PRs', () => {
    render(<PullRequestList {...defaultProps} />);

    expect(screen.getByText('integrations.pullRequests.draft')).toBeInTheDocument();
  });

  it('should render relative time', () => {
    render(<PullRequestList {...defaultProps} />);

    const recentlyElements = screen.getAllByText('recently');
    expect(recentlyElements.length).toBe(3);
  });
});
