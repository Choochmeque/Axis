import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IssueList } from './IssueList';
import type { Issue } from '@/bindings/api';

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
    items: Issue[];
    children: (item: Issue) => React.ReactNode;
    isLoading: boolean;
    loadingMessage?: string;
    emptyMessage?: string;
  }) => {
    if (isLoading) return <div data-testid="loading">{loadingMessage}</div>;
    if (items.length === 0) return <div data-testid="empty">{emptyMessage}</div>;
    return (
      <div data-testid="virtual-list">
        {items.map((item, idx) => (
          <div key={idx} data-testid={`issue-item-${idx}`}>
            {children(item)}
          </div>
        ))}
      </div>
    );
  },
}));

describe('IssueList', () => {
  const mockIssues: Issue[] = [
    {
      number: 1,
      title: 'Bug: Something is broken',
      state: 'Open',
      provider: 'GitHub',
      author: {
        login: 'user1',
        avatarUrl: 'https://example.com/avatar1.png',
        url: 'https://github.com/user1',
      },
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      commentsCount: 5,
      url: 'https://github.com/test/repo/issues/1',
      labels: [
        { name: 'bug', color: 'FF0000', description: 'Bug label' },
        { name: 'priority-high', color: '00FF00', description: 'High priority' },
      ],
    },
    {
      number: 2,
      title: 'Feature: Add new functionality',
      state: 'Closed',
      provider: 'GitHub',
      author: {
        login: 'user2',
        avatarUrl: 'https://example.com/avatar2.png',
        url: 'https://github.com/user2',
      },
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-10T09:00:00Z',
      commentsCount: 0,
      url: 'https://github.com/test/repo/issues/2',
      labels: [],
    },
  ];

  const defaultProps = {
    issues: mockIssues,
    selectedIssue: null,
    isLoading: false,
    onSelect: vi.fn(),
  };

  it('should show loading state', () => {
    render(<IssueList {...defaultProps} issues={[]} isLoading={true} />);

    expect(screen.getByTestId('loading')).toHaveTextContent('integrations.issues.loading');
  });

  it('should show empty state', () => {
    render(<IssueList {...defaultProps} issues={[]} />);

    expect(screen.getByTestId('empty')).toHaveTextContent('integrations.issues.noIssues');
  });

  it('should render issues', () => {
    render(<IssueList {...defaultProps} />);

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    expect(screen.getByTestId('issue-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('issue-item-1')).toBeInTheDocument();
  });

  it('should render issue titles', () => {
    render(<IssueList {...defaultProps} />);

    expect(screen.getByText('Bug: Something is broken')).toBeInTheDocument();
    expect(screen.getByText('Feature: Add new functionality')).toBeInTheDocument();
  });

  it('should render issue numbers', () => {
    render(<IssueList {...defaultProps} />);

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('should render author names', () => {
    render(<IssueList {...defaultProps} />);

    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
  });

  it('should render labels', () => {
    render(<IssueList {...defaultProps} />);

    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('priority-high')).toBeInTheDocument();
  });

  it('should render relative time', () => {
    render(<IssueList {...defaultProps} />);

    const recentlyElements = screen.getAllByText('recently');
    expect(recentlyElements.length).toBe(2);
  });

  it('should show +N indicator when more than 3 labels', () => {
    const issueWithManyLabels: Issue = {
      ...mockIssues[0],
      labels: [
        { name: 'label1', color: 'FF0000', description: 'Label 1' },
        { name: 'label2', color: '00FF00', description: 'Label 2' },
        { name: 'label3', color: '0000FF', description: 'Label 3' },
        { name: 'label4', color: 'FFFF00', description: 'Label 4' },
        { name: 'label5', color: '00FFFF', description: 'Label 5' },
      ],
    };

    render(<IssueList {...defaultProps} issues={[issueWithManyLabels]} />);

    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
