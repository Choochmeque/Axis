import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CIRun } from '@/types';
import { CIConclusion, CIRunStatus } from '@/types';
import { CIRunList } from './CIRunList';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/lib/dateUtils', () => ({
  formatRelativeTime: (date: string) => `relative-${date}`,
}));

const mockOpenUrl = vi.fn();

vi.mock('@/services/api', () => ({
  shellApi: {
    openUrl: (url: string) => mockOpenUrl(url),
  },
}));

vi.mock('@/components/ui', () => ({
  VirtualList: ({
    items,
    children,
    isLoading,
    emptyMessage,
  }: {
    items: unknown[];
    children: (item: unknown) => React.ReactNode;
    isLoading: boolean;
    emptyMessage: string;
  }) => {
    if (isLoading) return <div data-testid="loading">Loading...</div>;
    if (items.length === 0) return <div data-testid="empty">{emptyMessage}</div>;
    return (
      <div data-testid="ci-run-list">
        {items.map((item, i) => (
          <div key={i} data-testid="ci-run-item">
            {children(item)}
          </div>
        ))}
      </div>
    );
  },
}));

describe('CIRunList', () => {
  const mockCIRuns: CIRun[] = [
    {
      id: '1',
      provider: 'GitHub',
      name: 'Build and Test',
      status: CIRunStatus.Completed,
      conclusion: CIConclusion.Success,
      url: 'https://github.com/test/repo/actions/runs/1',
      commitSha: 'abc123def456789',
      branch: 'main',
      event: 'push',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:05:00Z',
    },
    {
      id: '2',
      provider: 'GitHub',
      name: 'Deploy',
      status: CIRunStatus.InProgress,
      conclusion: null,
      url: 'https://github.com/test/repo/actions/runs/2',
      commitSha: 'def456abc789012',
      branch: 'feature',
      event: 'pull_request',
      createdAt: '2024-01-15T10:10:00Z',
      updatedAt: '2024-01-15T10:10:00Z',
    },
    {
      id: '3',
      provider: 'GitHub',
      name: 'Lint',
      status: CIRunStatus.Completed,
      conclusion: CIConclusion.Failure,
      url: 'https://github.com/test/repo/actions/runs/3',
      commitSha: 'ghi789abc123456',
      branch: 'bugfix',
      event: 'push',
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-15T09:02:00Z',
    },
  ];

  const defaultProps = {
    ciRuns: mockCIRuns,
    isLoading: false,
  };

  it('should render loading state', () => {
    render(<CIRunList {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should render empty state', () => {
    render(<CIRunList {...defaultProps} ciRuns={[]} />);

    expect(screen.getByTestId('empty')).toBeInTheDocument();
    expect(screen.getByText('integrations.ci.noRuns')).toBeInTheDocument();
  });

  it('should render CI run items', () => {
    render(<CIRunList {...defaultProps} />);

    const items = screen.getAllByTestId('ci-run-item');
    expect(items).toHaveLength(3);
  });

  it('should display run names', () => {
    render(<CIRunList {...defaultProps} />);

    expect(screen.getByText('Build and Test')).toBeInTheDocument();
    expect(screen.getByText('Deploy')).toBeInTheDocument();
    expect(screen.getByText('Lint')).toBeInTheDocument();
  });

  it('should display branch names', () => {
    render(<CIRunList {...defaultProps} />);

    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('feature')).toBeInTheDocument();
    expect(screen.getByText('bugfix')).toBeInTheDocument();
  });

  it('should display short commit SHAs', () => {
    render(<CIRunList {...defaultProps} />);

    expect(screen.getByText('abc123d')).toBeInTheDocument();
    expect(screen.getByText('def456a')).toBeInTheDocument();
    expect(screen.getByText('ghi789a')).toBeInTheDocument();
  });

  it('should display event types', () => {
    render(<CIRunList {...defaultProps} />);

    // Multiple runs have 'push' event
    expect(screen.getAllByText('push').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('pull_request')).toBeInTheDocument();
  });

  it('should display relative timestamps', () => {
    render(<CIRunList {...defaultProps} />);

    expect(screen.getByText(/relative-2024-01-15T10:00:00Z/)).toBeInTheDocument();
  });

  it('should display in progress status', () => {
    render(<CIRunList {...defaultProps} />);

    expect(screen.getByText('integrations.ci.status.inProgress')).toBeInTheDocument();
  });

  it('should display success conclusion', () => {
    render(<CIRunList {...defaultProps} />);

    // Conclusion is capitalized
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('should display failure conclusion', () => {
    render(<CIRunList {...defaultProps} />);

    expect(screen.getByText('Failure')).toBeInTheDocument();
  });

  it('should open URL on external link click', () => {
    render(<CIRunList {...defaultProps} />);

    const buttons = screen.getAllByTitle('common.openInBrowser');
    fireEvent.click(buttons[0]);

    expect(mockOpenUrl).toHaveBeenCalledWith('https://github.com/test/repo/actions/runs/1');
  });
});
