import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommitCompareList } from './CommitCompareList';

// Mock dateUtils
vi.mock('@/lib/dateUtils', () => ({
  formatTimeAgo: () => '2 hours ago',
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
  Avatar: ({ name }: any) => <span data-testid="avatar">{name}</span>,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCommitAhead: any = {
  oid: 'ahead123456789',
  shortOid: 'ahead12',
  summary: 'Ahead commit',
  message: 'Ahead commit\n\nFull message',
  author: { name: 'John Doe', email: 'john@example.com' },
  committer: { name: 'John Doe', email: 'john@example.com' },
  timestamp: 1700000000,
  parentOids: ['parent1'],
  isMerge: false,
  signature: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCommitBehind: any = {
  oid: 'behind123456789',
  shortOid: 'behind1',
  summary: 'Behind commit',
  message: 'Behind commit\n\nFull message',
  author: { name: 'Jane Doe', email: 'jane@example.com' },
  committer: { name: 'Jane Doe', email: 'jane@example.com' },
  timestamp: 1699900000,
  parentOids: ['parent2'],
  isMerge: false,
  signature: null,
};

describe('CommitCompareList', () => {
  const mockOnSelectCommit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state', () => {
    render(
      <CommitCompareList
        aheadCommits={[]}
        behindCommits={[]}
        selectedCommit={null}
        onSelectCommit={mockOnSelectCommit}
        isLoading={true}
      />
    );

    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('should show identical branches message when no commits', () => {
    render(
      <CommitCompareList
        aheadCommits={[]}
        behindCommits={[]}
        selectedCommit={null}
        onSelectCommit={mockOnSelectCommit}
      />
    );

    expect(screen.getByText('branches.compare.branchesIdentical')).toBeInTheDocument();
  });

  it('should show ahead commits section', () => {
    render(
      <CommitCompareList
        aheadCommits={[mockCommitAhead]}
        behindCommits={[]}
        selectedCommit={null}
        onSelectCommit={mockOnSelectCommit}
      />
    );

    expect(screen.getByText('branches.compare.aheadSection')).toBeInTheDocument();
    expect(screen.getByText('Ahead commit')).toBeInTheDocument();
  });

  it('should show behind commits section', () => {
    render(
      <CommitCompareList
        aheadCommits={[]}
        behindCommits={[mockCommitBehind]}
        selectedCommit={null}
        onSelectCommit={mockOnSelectCommit}
      />
    );

    expect(screen.getByText('branches.compare.behindSection')).toBeInTheDocument();
    expect(screen.getByText('Behind commit')).toBeInTheDocument();
  });

  it('should show both sections when both have commits', () => {
    render(
      <CommitCompareList
        aheadCommits={[mockCommitAhead]}
        behindCommits={[mockCommitBehind]}
        selectedCommit={null}
        onSelectCommit={mockOnSelectCommit}
      />
    );

    expect(screen.getByText('branches.compare.aheadSection')).toBeInTheDocument();
    expect(screen.getByText('branches.compare.behindSection')).toBeInTheDocument();
    expect(screen.getByText('Ahead commit')).toBeInTheDocument();
    expect(screen.getByText('Behind commit')).toBeInTheDocument();
  });

  it('should show total commit count', () => {
    render(
      <CommitCompareList
        aheadCommits={[mockCommitAhead]}
        behindCommits={[mockCommitBehind]}
        selectedCommit={null}
        onSelectCommit={mockOnSelectCommit}
      />
    );

    // Total should be 2 (1 ahead + 1 behind)
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should call onSelectCommit when commit is clicked', () => {
    render(
      <CommitCompareList
        aheadCommits={[mockCommitAhead]}
        behindCommits={[]}
        selectedCommit={null}
        onSelectCommit={mockOnSelectCommit}
      />
    );

    fireEvent.click(screen.getByText('Ahead commit'));

    expect(mockOnSelectCommit).toHaveBeenCalledWith(mockCommitAhead);
  });

  it('should toggle ahead section when header is clicked', () => {
    render(
      <CommitCompareList
        aheadCommits={[mockCommitAhead]}
        behindCommits={[]}
        selectedCommit={null}
        onSelectCommit={mockOnSelectCommit}
      />
    );

    // Initially commit should be visible
    expect(screen.getByText('Ahead commit')).toBeInTheDocument();

    // Click header to collapse
    fireEvent.click(screen.getByText('branches.compare.aheadSection'));

    // Commit should now be hidden
    expect(screen.queryByText('Ahead commit')).not.toBeInTheDocument();

    // Click again to expand
    fireEvent.click(screen.getByText('branches.compare.aheadSection'));

    // Commit should be visible again
    expect(screen.getByText('Ahead commit')).toBeInTheDocument();
  });

  it('should toggle behind section when header is clicked', () => {
    render(
      <CommitCompareList
        aheadCommits={[]}
        behindCommits={[mockCommitBehind]}
        selectedCommit={null}
        onSelectCommit={mockOnSelectCommit}
      />
    );

    // Initially commit should be visible
    expect(screen.getByText('Behind commit')).toBeInTheDocument();

    // Click header to collapse
    fireEvent.click(screen.getByText('branches.compare.behindSection'));

    // Commit should now be hidden
    expect(screen.queryByText('Behind commit')).not.toBeInTheDocument();
  });

  it('should show commit details', () => {
    render(
      <CommitCompareList
        aheadCommits={[mockCommitAhead]}
        behindCommits={[]}
        selectedCommit={null}
        onSelectCommit={mockOnSelectCommit}
      />
    );

    expect(screen.getByText('ahead12')).toBeInTheDocument();
    // John Doe appears twice - in Avatar mock and in author name span
    expect(screen.getAllByText('John Doe').length).toBe(2);
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('should highlight selected commit', () => {
    const { container } = render(
      <CommitCompareList
        aheadCommits={[mockCommitAhead]}
        behindCommits={[]}
        selectedCommit={mockCommitAhead}
        onSelectCommit={mockOnSelectCommit}
      />
    );

    // The selected commit should have bg-(--bg-active) class
    const commitItem = container.querySelector('[class*="bg-(--bg-active)"]');
    expect(commitItem).toBeInTheDocument();
  });

  it('should show section counts as badges', () => {
    render(
      <CommitCompareList
        aheadCommits={[mockCommitAhead, { ...mockCommitAhead, oid: 'ahead2' }]}
        behindCommits={[mockCommitBehind]}
        selectedCommit={null}
        onSelectCommit={mockOnSelectCommit}
      />
    );

    // Should show "2" for ahead section and "1" for behind section
    const badges = screen.getAllByText(/^[0-9]+$/);
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });
});
