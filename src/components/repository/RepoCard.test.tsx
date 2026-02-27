import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecentRepository } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/dateUtils', () => ({
  formatTimeAgo: (date: string) => `${date} ago`,
}));

vi.mock('@/lib/pathUtils', () => ({
  truncatePath: (path: string, _maxLen: number) => path,
}));

vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/ui');
  return {
    ...actual,
    Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
      <span data-testid={`badge-${variant ?? 'default'}`}>{children}</span>
    ),
  };
});

import { RepoCard } from './RepoCard';

function makeRepo(overrides: Partial<RecentRepository> = {}): RecentRepository {
  return {
    name: 'test-repo',
    path: '/home/user/test-repo',
    lastOpened: '2024-06-15',
    exists: true,
    currentBranch: 'main',
    isPinned: false,
    displayPath: '~/test-repo',
    ...overrides,
  };
}

describe('RepoCard', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render repo name', () => {
    render(<RepoCard repo={makeRepo()} onClick={mockOnClick} />);

    expect(screen.getByText('test-repo')).toBeInTheDocument();
  });

  it('should render display path', () => {
    render(
      <RepoCard repo={makeRepo({ displayPath: '~/Projects/my-repo' })} onClick={mockOnClick} />
    );

    expect(screen.getByText('~/Projects/my-repo')).toBeInTheDocument();
  });

  it('should render time ago', () => {
    render(<RepoCard repo={makeRepo({ lastOpened: '2024-06-15' })} onClick={mockOnClick} />);

    expect(screen.getByText('2024-06-15 ago')).toBeInTheDocument();
  });

  it('should render branch badge for existing repo', () => {
    render(<RepoCard repo={makeRepo({ currentBranch: 'develop' })} onClick={mockOnClick} />);

    const badge = screen.getByTestId('badge-accent');
    expect(badge).toHaveTextContent('develop');
  });

  it('should not render branch badge when no branch', () => {
    render(<RepoCard repo={makeRepo({ currentBranch: null })} onClick={mockOnClick} />);

    expect(screen.queryByTestId('badge-accent')).not.toBeInTheDocument();
  });

  it('should render missing badge when repo does not exist', () => {
    render(
      <RepoCard repo={makeRepo({ exists: false, currentBranch: null })} onClick={mockOnClick} />
    );

    const badge = screen.getByTestId('badge-error');
    expect(badge).toHaveTextContent('welcome.repositoryMissing');
  });

  it('should not render missing badge when repo exists', () => {
    render(<RepoCard repo={makeRepo({ exists: true })} onClick={mockOnClick} />);

    expect(screen.queryByTestId('badge-error')).not.toBeInTheDocument();
  });

  it('should be disabled when repo does not exist', () => {
    render(<RepoCard repo={makeRepo({ exists: false })} onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should be enabled when repo exists', () => {
    render(<RepoCard repo={makeRepo({ exists: true })} onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    expect(button).toBeEnabled();
  });

  it('should call onClick with repo path when clicked', () => {
    render(<RepoCard repo={makeRepo({ path: '/my/path' })} onClick={mockOnClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockOnClick).toHaveBeenCalledWith('/my/path');
  });

  it('should show GitBranch icon for existing repo', () => {
    const { container } = render(<RepoCard repo={makeRepo()} onClick={mockOnClick} />);

    const iconDiv = container.querySelector('.welcome-repo-card-icon');
    expect(iconDiv).not.toHaveClass('welcome-repo-card-icon--missing');
  });

  it('should show AlertTriangle icon with warning style for missing repo', () => {
    const { container } = render(
      <RepoCard repo={makeRepo({ exists: false })} onClick={mockOnClick} />
    );

    const iconDiv = container.querySelector('.welcome-repo-card-icon');
    expect(iconDiv).toHaveClass('welcome-repo-card-icon--missing');
  });

  it('should not render branch badge for missing repo even if branch data exists', () => {
    render(
      <RepoCard repo={makeRepo({ exists: false, currentBranch: 'main' })} onClick={mockOnClick} />
    );

    // Should show error badge (missing), not accent badge (branch)
    expect(screen.getByTestId('badge-error')).toBeInTheDocument();
    expect(screen.queryByTestId('badge-accent')).not.toBeInTheDocument();
  });

  it('should set title attribute on path for tooltip', () => {
    render(
      <RepoCard repo={makeRepo({ displayPath: '~/very/long/path/repo' })} onClick={mockOnClick} />
    );

    const pathElement = screen.getByText('~/very/long/path/repo');
    expect(pathElement).toHaveAttribute('title', '~/very/long/path/repo');
  });
});
